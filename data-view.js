/* Source-aware rendering shared by the browser and the data regression checks. */
(function (root) {
  "use strict";

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const categories = {
    EX: "Utdöd", EW: "Utdöd i vilt tillstånd", RE: "Nationellt utdöd",
    CR: "Akut hotad", EN: "Starkt hotad", VU: "Sårbar", NT: "Nära hotad",
    LC: "Livskraftig", DD: "Kunskapsbrist", NE: "Ej bedömd", NA: "Ej tillämplig"
  };

  const labels = {
    dispersal_distance_class: "Spridningsavstånd", dispersal_vector: "Spridningssätt",
    seed_buoyancy: "Frönas flytförmåga", seed_terminal_velocity: "Frönas fallhastighet",
    palatability: "Smaklighet för växtätare", growth_form: "Livsform",
    growth_form_aquatic: "Vattenanknytning", woodiness: "Förvedning", LDMC: "Bladens torrsubstanshalt (LDMC)",
    SLA: "Specifik bladyta (SLA)", leaf_C: "Kolhalt i blad", leaf_CN_ratio: "C:N-kvot i blad",
    leaf_N: "Kvävehalt i blad", leaf_NP_ratio: "N:P-kvot i blad", leaf_P: "Fosforhalt i blad",
    leaf_chlorophyll: "Klorofyllhalt i blad", longevity: "Livslängd", fruit_type: "Frukttyp",
    nectar_production: "Nektarproduktion", pollinator_type: "Pollination",
    seed_bank_persistency: "Fröbankens livslängd", seed_dormancy: "Frövila",
    seed_longevity_index: "Frölivslängdsindex", seed_mass: "Frömassa",
    RDMC: "Rötternas torrsubstanshalt (RDMC)", SRA: "Specifik rotyta (SRA)",
    SRL: "Specifik rotlängd (SRL)", mycorrhiza_colonization_intensity: "Mykorrhizakolonisering",
    mycorrhiza_type: "Mykorrhizatyp", root_N: "Kvävehalt i rötter", root_P: "Fosforhalt i rötter",
    root_mass_fraction: "Andel rotmassa", height: "Växthöjd", leaf_area: "Bladyta",
    leaf_length: "Bladlängd", leaf_mass: "Bladmassa", leaf_thickness: "Bladtjocklek",
    rooting_depth: "Rotdjup", Grime_strategy: "Grimes CSR-strategi", carnivory: "Köttätande",
    leaf_phenology: "Bladfenologi", nitrogen_fixation: "Kvävefixering", parasitism: "Parasitism",
    photosynthetic_pathway: "Fotosyntesväg"
  };

  const groups = {
    growth_form: "Livsform", size: "Storlek", longevity: "Livslängd",
    reproduction: "Fortplantning och frön", dispersal: "Spridning",
    leaf_economic: "Bladegenskaper", root: "Rötter och mykorrhiza",
    strategy: "Livsstrategier", ecosystem: "Samspel med växtätare"
  };

  const levels = {
    growth_form: {
      Chamaephyte: "Chamaefyt – knoppar nära markytan", Cryptophyte: "Kryptofyt – knoppar under mark eller vatten",
      Hemicryptophyte: "Hemikryptofyt – knoppar i markytan", Liana: "Lian",
      Phanerophyte: "Fanerofyt – knoppar ovan mark, vanligen träd eller buske", Therophyte: "Terofyt – ettårig växt",
      "Vascular parasite": "Parasitisk kärlväxt", "Vascular semi-parasite": "Halvparasitisk kärlväxt"
    },
    growth_form_aquatic: {aquatic: "Vattenlevande", semiaquatic: "Delvis vattenlevande", terrestrial: "Landlevande"},
    woodiness: {"non-woody": "Örtartad", "semi-woody": "Delvis vedartad", woody: "Vedartad"},
    longevity: {1: "Strikt ettårig", 2: "Tvåårig eller dör efter blomning", 3: "Kortlivad perenn", 4: "Långlivad perenn"},
    fruit_type: {achene: "Nötfrukt (achen)", berry: "Bär", capsule: "Kapsel", drupe: "Stenfrukt", follicle: "Baljkapsel", nut: "Nöt", other: "Annan", pod: "Balja", siliqua: "Skida"},
    dispersal_vector: {
      Adh: "Vidhäftning på djur", AirD: "Vind – små och lätta frön eller frukter", AirP: "Vind – hårprydda frukter",
      AirW: "Vind – vingade frukter", Bird: "Fåglar eller andra fruktätare", Expl: "Explosiv spridning",
      Myr: "Myror", Passive: "Passiv spridning", Veg: "Främst vegetativ spridning", Water: "Vatten"
    },
    dispersal_distance_class: {1: "Klass 1: 0,1–1 m", 2: "Klass 2: 1–5 m", 3: "Klass 3: 2–15 m", 4: "Klass 4: 40–150 m", 5: "Klass 5: 10–500 m", 6: "Klass 6: 400–1 500 m", 7: "Klass 7: 500–5 000 m"},
    nectar_production: {
      1: "Ingen nektar eller insamlingsbart pollen", 2: "Obetydlig nektar (<0,2 g socker/m²/år), eller lite pollen",
      3: "Lite nektar (0,2–5 g socker/m²/år), eller rikligt pollen", 4: "Måttlig nektar (5–20 g socker/m²/år)",
      5: "Ganska mycket nektar (20–50 g socker/m²/år)", 6: "Mycket nektar (50–200 g socker/m²/år)", 7: "Väldigt mycket nektar (>200 g socker/m²/år)"
    },
    pollinator_type: {
      "0a": "Oberoende av pollinatörer – främst vegetativ förökning", "0b": "Oberoende av djurpollinatörer – vind/vatten eller sporväxt",
      "0c": "Oberoende av pollinatörer – främst självpollinering", "0d": "Oberoende av pollinatörer – apomixis",
      "1": "Delvis beroende av andra insekter än bin, humlor och fjärilar", "2": "Helt beroende av andra insekter än bin, humlor och fjärilar",
      "1a": "Delvis beroende av bin och humlor", "2a": "Helt beroende av bin och humlor",
      "1ab": "Delvis beroende av bin, humlor och fjärilar", "2ab": "Helt beroende av bin, humlor och fjärilar",
      "1b": "Delvis beroende av fjärilar", "2b": "Helt beroende av fjärilar"
    },
    seed_bank_persistency: {1: "Övergående (upp till 1–2 år)", 2: "Kortlivad (1–5 år)", 3: "Långlivad (5–25 år)", 4: "Semipermanent (>25 år)"},
    seed_dormancy: {
      1: "Ingen frövila – gror inom 10 dagar", 2: "Ingen eller svag frövila – gror efter 10–30 dagar",
      3: "Frövila eller långsam groning; oberoende av säsong eller <35 dagars kallstratifiering",
      4: "Djupare frövila – kräver >35 dagars kallstratifiering"
    },
    mycorrhiza_type: {
      None: "Ingen mykorrhiza", AM: "Arbuskulär mykorrhiza", EM: "Ektomykorrhiza", "AM/EM": "Arbuskulär och ektomykorrhiza",
      ArbM: "Arbutoid mykorrhiza", EriM: "Erikoid mykorrhiza", "EriM/ArbM": "Erikoid och arbutoid mykorrhiza",
      MonM: "Monotropoid mykorrhiza", OrkM: "Orkidémykorrhiza", PyrM: "Pyrola-mykorrhiza"
    },
    leaf_phenology: {deciduous: "Säsongsvis bladfällning", evergreen: "Vintergrön", variable: "Variabel bladfällning"},
    parasitism: {none: "Ej parasitisk", hemiparasite: "Halvparasit", holoparasite: "Helparasit"},
    Grime_strategy: {C: "C – konkurrensstrateg", R: "R – ruderalstrateg", S: "S – stresstolerant", CR: "CR – konkurrens/ruderal", CS: "CS – konkurrens/stresstolerans", CSR: "CSR – blandstrategi", SR: "SR – stresstolerans/ruderal"},
    carnivory: {yes: "Ja", no: "Nej"}, nitrogen_fixation: {yes: "Ja", no: "Nej"}
  };

  const units = {"mm2 mg−1": "mm²/mg", mm2: "mm²", "cm2/g": "cm²/g", ratio: "kvot", index: "index"};
  const numbers = new Intl.NumberFormat("sv-SE", {maximumSignificantDigits: 4});

  function scientificNameKey(name) {
    name = String(name || "").trim().replace(/\s+/g, " ");
    if (/\b(ssp|subsp|var|sect|agg)\.|×|\sx\s|['"]/.test(name)) return name.toLowerCase();
    const match = name.match(/^([A-Z][\p{L}-]+ [a-z][\p{L}-]+)(?: [A-Z(].*)?$/u);
    return (match ? match[1] : name).toLowerCase();
  }

  function getRedlistBadge(status) {
    const match = String(status || "").trim().match(/^(EX|EW|RE|CR|EN|VU|NT|LC|DD|NE|NA)(?=$|[^A-Z])/);
    if (!match) return "<em>Uppgift saknas</em>";
    const code = match[1];
    return `<span class="redlist-badge rl-${code}" title="${categories[code]}">${code}</span>`;
  }

  function renderRedlist(dataset, dyntaxa) {
    if (!dataset) return '<p><strong>Rödlista 2025:</strong> Uppgifterna kunde inte laddas.</p>';
    const record = dataset.taxa[String(dyntaxa || "").trim()];
    if (!record) return '<p><strong>Rödlista 2025:</strong> Uppgift saknas för detta taxon i underlaget.</p>';
    const suffix = record.categoryRaw.slice(record.category.length).trim();
    let annotation = "";
    if (suffix) {
      let explanation = "Tilläggsbeteckning i källan";
      if (suffix.includes("°*")) explanation = "Kategorin har justerats av annat skäl än immigration; se Artfakta";
      else if (suffix.includes("°")) explanation = "Kategorin har nedgraderats på grund av immigration";
      else if (suffix.includes("PRE")) explanation = "Möjligen nationellt utdöd";
      annotation = ` <span class="redlist-annotation" title="${explanation}">${escapeHtml(suffix)}</span>`;
    }
    const criteria = record.criteria ? ` <span class="source-note">(${escapeHtml(record.criteria)})</span>` : "";
    return `<p><strong>Rödlista 2025:</strong> ${getRedlistBadge(record.category)}${categories[record.category]}${annotation}${criteria}</p>`;
  }

  function getSpecies(dataset, dyntaxa) {
    const match = dataset?.taxa[String(dyntaxa || "").trim()];
    return match ? {name: match.species, ...dataset.species[match.species]} : null;
  }

  function formatValue(definition, value) {
    if (value === null || value === undefined || value === "") return "<em>Uppgift saknas</em>";
    if (levels[definition.key]) {
      return escapeHtml(levels[definition.key][value] ?? `${value} (saknar förklaring i källans skala)`);
    }
    const formatted = typeof value === "number" ? numbers.format(value) : value;
    const unit = units[definition.unit] || definition.unit;
    return escapeHtml(`${formatted}${unit ? ` ${unit}` : ""}`);
  }

  function renderTraits(dataset, dyntaxa, advanced) {
    if (!dataset) return '<p><strong>NordicTraits:</strong> Uppgifterna kunde inte laddas.</p>';
    const record = getSpecies(dataset, dyntaxa);
    if (!record) return '<p><strong>NordicTraits:</strong> Uppgift saknas för detta taxon.</p>';
    const definitions = new Map(dataset.traits.map(d => [d.key, d]));
    const imputed = new Set(record.imputed);
    const valueHtml = key => `${formatValue(definitions.get(key), record.values[key])}${imputed.has(key) ? ' <span class="imputed" title="Ett saknat värde som har skattats med NordicTraits modell">Imputerat</span>' : ""}`;
    const source = `<p class="source-note">Funktionella egenskaper: <a href="https://github.com/poniitty/NordicTraits" target="_blank" rel="noopener">NordicTraits V1</a>, taxon <em>${escapeHtml(record.name)}</em>. Imputerat betyder att värdet är skattat med en modell. Övriga värden är sammanställda artvärden från källdata.</p>`;
    if (!advanced) {
      const summaryKeys = ["growth_form", "height", "longevity", "nectar_production", "pollinator_type", "dispersal_vector", "mycorrhiza_type"];
      return `<h4>Funktionella egenskaper</h4>${source}${summaryKeys.map(key => `<p><strong>${labels[key]}:</strong> ${valueHtml(key)}</p>`).join("")}`;
    }
    const body = Object.entries(groups).map(([group, title]) => {
      const traits = dataset.traits.filter(d => d.category === group);
      if (!traits.length) return "";
      return `<details class="trait-group" open><summary>${title}</summary><table class="trait-table"><caption class="visually-hidden">${title} från NordicTraits</caption><tbody>${traits.map(d => `<tr><th scope="row" title="${escapeHtml(d.description)}">${escapeHtml(labels[d.key] || d.key)}</th><td>${valueHtml(d.key)}</td></tr>`).join("")}</tbody></table></details>`;
    }).join("");
    return `<h4>Alla 44 funktionella egenskaper</h4>${source}${body}`;
  }

  const api = {escapeHtml, scientificNameKey, getRedlistBadge, renderRedlist, getSpecies, formatValue, renderTraits, labels, groups};
  root.PlantDataView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
