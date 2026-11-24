#!/usr/bin/env python3
"""Build the site's pinned Red List and NordicTraits snapshots.

Only the Python standard library and openpyxl are required. Source files can be
provided explicitly for an offline, reproducible rebuild; otherwise download the
versions pinned below. Review source updates before changing the pins.
"""

import argparse
import csv
import hashlib
import io
import json
import re
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
NORDIC_COMMIT = "e9d44eaa112b83386916ffacc1a3358b5bd46a44"
NORDIC_URL = (
    "https://raw.githubusercontent.com/poniitty/NordicTraits/"
    f"{NORDIC_COMMIT}/final_dataset/NordicTraits_V1.zip"
)
REDLIST_URL = (
    "https://api.researchdata.se/dataset/2026-64/1/file/data/"
    "Rodlistearbete_2025.csv"
)
VALID_CODES = {"EX", "EW", "RE", "CR", "EN", "VU", "NT", "LC", "DD", "NE", "NA"}


def source_bytes(path, url):
    if path:
        return Path(path).read_bytes()
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def spreadsheet_rows(archive, filename):
    workbook = load_workbook(io.BytesIO(archive.read(filename)), read_only=True, data_only=True)
    try:
        rows = workbook.active.iter_rows(values_only=True)
        columns = next(rows)
        return [dict(zip(columns, row)) for row in rows if any(v is not None for v in row)]
    finally:
        workbook.close()


def taxon_key(name):
    """Remove a species author, but never collapse hybrids, aggregates or ranks."""
    name = " ".join((name or "").split())
    if re.search(r"\b(?:ssp|subsp|var|sect|agg)\.|×|\sx\s|['\"]", name):
        return name.casefold()
    match = re.fullmatch(r"([A-Z][\w-]+ [a-z][\w-]+)(?: [A-Z(].*)?", name)
    return (match.group(1) if match else name).casefold()


def unique_match(index, key):
    candidates = index.get(key, set())
    return next(iter(candidates)) if len(candidates) == 1 else None


def as_id(value):
    return str(int(value)) if value is not None and str(value).strip() else ""


def numeric_value(value, data_type):
    # Preserve source precision and zeroes, including undocumented source levels.
    if data_type.lower() in {"numerical", "ordinal"}:
        try:
            number = float(value)
            return int(number) if number.is_integer() else number
        except (ValueError, TypeError):
            pass
    return value


def json_write(filename, data):
    path = ROOT / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")


def build(redlist_bytes, nordic_bytes, retrieved_at):
    with (ROOT / "vaxtdata.csv").open(encoding="utf-8-sig", newline="") as stream:
        plants = list(csv.DictReader(stream))
    ids = [p["Dyntaxa ID number"].strip() for p in plants]
    assert len(set(ids)) == len(plants), "Duplicate plant IDs need review"

    redlist_rows = list(csv.DictReader(io.StringIO(redlist_bytes.decode("utf-8-sig")), delimiter=";"))
    assert len(redlist_rows) > 80000, "Incomplete Red List download"
    redlist_by_id = {}
    for row in redlist_rows:
        key = row["TaxonId"].strip()
        assert key not in redlist_by_id, f"Duplicate Red List ID: {key}"
        redlist_by_id[key] = row

    redlist_taxa = {}
    redlist_missing = []
    for plant, key in zip(plants, ids):
        row = redlist_by_id.get(key)
        if not row:
            redlist_missing.append(plant)
            continue
        raw = row["Kategori"].strip()
        category = re.match(r"^([A-Z]{2})(?=$|[^A-Z])", raw)
        assert category and category[1] in VALID_CODES, f"Unknown Red List category: {raw!r}"
        criteria = row["Kriterium"].strip()
        redlist_taxa[key] = {
            "scientificName": row["Vetenskapligt namn"],
            "category": category[1],
            "categoryRaw": raw,
            "criteria": "" if criteria in {"n/a", "no data"} else criteria,
        }

    with zipfile.ZipFile(io.BytesIO(nordic_bytes)) as archive:
        wide = list(csv.DictReader(io.StringIO(archive.read("NordicTraits_wide_V1.csv").decode("utf-8-sig"))))
        long_rows = list(csv.DictReader(io.StringIO(archive.read("NordicTraits_long_V1.csv").decode("utf-8-sig"))))
        species_metadata = spreadsheet_rows(archive, "NordicTraits_metadata_species_V1.xlsx")
        trait_metadata = spreadsheet_rows(archive, "NordicTraits_metadata_traits_V1.xlsx")
    assert len(wide) == 3099 and len(trait_metadata) == 44, "Unexpected NordicTraits V1 structure"
    species = {r["species"]: r for r in wide}
    assert len(species) == len(wide), "Duplicate NordicTraits species"
    trait_keys = [r["Trait"] for r in trait_metadata]
    assert set(trait_keys) == set(wide[0]) - {"species"}

    by_id, by_name = defaultdict(set), defaultdict(set)
    for row in species_metadata:
        name = row["species"]
        if name not in species:
            continue
        key = as_id(row["SE_Id"])
        if key:
            by_id[key].add(name)
        for alias in (name, row["SE_species"]):
            if alias:
                by_name[taxon_key(alias)].add(name)

    mapping, trait_missing = {}, []
    for plant, key in zip(plants, ids):
        name = unique_match(by_id, key)
        method = "dyntaxa_id"
        if not name and not by_id.get(key):
            name = unique_match(by_name, taxon_key(plant["Scientific name"]))
            method = "exact_name_or_documented_synonym"
        if name and key:
            mapping[key] = {"species": name, "method": method}
        else:
            trait_missing.append(plant)

    used = {row["species"] for row in mapping.values()}
    imputed, seen = defaultdict(list), set()
    for row in long_rows:
        pair = (row["species"], row["trait_name"])
        assert pair not in seen, f"Duplicate NordicTraits value: {pair}"
        seen.add(pair)
        assert row["imputed"] in {"TRUE", "FALSE"}
        assert row["value"] == species[row["species"]][row["trait_name"]], f"Wide/long values differ: {pair}"
        if row["imputed"] == "TRUE":
            imputed[row["species"]].append(row["trait_name"])
    assert len(seen) == len(species) * len(trait_keys), "Missing imputation flags"
    types = {r["Trait"]: r["Data type"] for r in trait_metadata}

    json_write("data/redlist-2025.json", {
        "source": {
            "name": "SLU Artdatabanken – Rödlista 2025",
            "url": "https://doi.org/10.5878/ffrv-6x57",
            "downloadUrl": REDLIST_URL,
            "version": "1", "assessmentYear": 2025, "publishedAt": "2026-03-24",
            "retrievedAt": retrieved_at, "license": "CC0-1.0",
            "sha256": hashlib.sha256(redlist_bytes).hexdigest(),
        },
        "taxa": redlist_taxa,
    })
    json_write("data/nordictraits-v1.json", {
        "source": {
            "name": "NordicTraits", "version": "V1",
            "url": "https://github.com/poniitty/NordicTraits",
            "doi": "https://doi.org/10.64898/2026.03.03.709463",
            "downloadUrl": NORDIC_URL, "commit": NORDIC_COMMIT,
            "retrievedAt": retrieved_at, "license": "MIT",
            "sha256": hashlib.sha256(nordic_bytes).hexdigest(),
            "citation": "Niittynen, P. et al. (2026). NordicTraits: imputed species-level functional trait dataset for vascular plants of Denmark, Finland, Iceland, Norway and Sweden. bioRxiv preprint.",
        },
        "traits": [{
            "key": r["Trait"], "description": r["Explanation"] or "",
            "category": r["Category"], "type": r["Data type"],
            "unit": r["Unit"] or "", "levels": r["Level description"] or "",
            "range": r["Values"] or "",
        } for r in trait_metadata],
        "taxa": mapping,
        "species": {name: {
            "values": {key: numeric_value(species[name][key], types[key]) for key in trait_keys},
            "imputed": imputed[name],
        } for name in sorted(used)},
    })

    # Audit changes and unmatched taxa explicitly; never infer LC or parent traits.
    old_category = lambda p: "LC" if p["Red-listed"].strip().lower() == "not red-listed" else p["Red-listed"].strip()
    changed = [{
        "taxonId": key, "scientificName": plant["Scientific name"],
        "oldValue": old_category(plant), "newValue": redlist_taxa[key]["categoryRaw"],
    } for plant, key in zip(plants, ids) if key in redlist_taxa and old_category(plant) != redlist_taxa[key]["categoryRaw"]]
    summaries = {
        "retrievedAt": retrieved_at, "plantCount": len(plants),
        "redlistMatched": len(redlist_taxa), "nordicTraitsMatched": len(mapping),
        "nordicTraitsMatchMethods": dict(Counter(v["method"] for v in mapping.values())),
        "redlistCategories": dict(sorted(Counter(v["category"] for v in redlist_taxa.values()).items())),
        "redlistChangesFromLegacyFile": changed,
        "redlistUnmatched": [{"taxonId": p["Dyntaxa ID number"], "scientificName": p["Scientific name"]} for p in redlist_missing],
        "nordicTraitsUnmatched": [{"taxonId": p["Dyntaxa ID number"], "scientificName": p["Scientific name"]} for p in trait_missing],
        "notes": [
            "Legacy 'Not Red-listed' is shown as LC only in this comparison, not used as current status.",
            "No fuzzy matches, parent-species fallbacks or invented traits are used.",
            "Source longevity level 0 occurs in Apera interrupta and Draba norvegica but is not defined in V1 metadata; preserve it explicitly.",
        ],
    }
    (ROOT / "data/update-report.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in summaries.items() if not isinstance(v, list)}, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--redlist-csv", type=Path)
    parser.add_argument("--nordictraits-zip", type=Path)
    parser.add_argument("--retrieved-at", default=date.today().isoformat())
    args = parser.parse_args()
    date.fromisoformat(args.retrieved_at)
    build(source_bytes(args.redlist_csv, REDLIST_URL), source_bytes(args.nordictraits_zip, NORDIC_URL), args.retrieved_at)


if __name__ == "__main__":
    main()
