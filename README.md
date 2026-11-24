# Växtsök

Statisk webbplats för att söka svenska kärlväxter. Publiceras som tidigare med
GitHub Pages; ingen server eller databas behövs.

## Aktuella artdata

- **Rödlista 2025**, SLU Artdatabanken, publicerad 24 mars 2026. Underlaget omfattar
  även LC, NE och NA. Källa: [Rödlistearbete 2025, version 1](https://doi.org/10.5878/ffrv-6x57),
  licens CC0 1.0. `data/redlist-2025.json` innehåller det urval som matchar
  webbplatsens Dyntaxa-ID. Kategoriernas tillägg (°*, PRE) och kriterier bevaras.
  Detta är en daterad kopia av datasetet, inte en direktkoppling till löpande
  taxonomiska uppdateringar i Artfakta.
- **NordicTraits V1** ersätter de tidigare funktionella egenskaperna i visningen.
  Förenklat läge visar ett urval, avancerat läge alla 44 egenskaper.
  `data/nordictraits-v1.json` innehåller värden, källans enheter, traitmetadata och
  ursprungliga imputeringsflaggor. Ett imputerat värde är en modellskattning;
  övriga värden är sammanställda artvärden från källdata och behöver inte vara
  uppmätta i Sverige. Källans siffror bevaras; visningen avrundar till fyra
  signifikanta siffror.

  Niittynen, P., Heikkinen, R. K., Hällfors, M. H., Määttänen, A.-M., Norros, V. &
  Kemppinen, J. (2026). *NordicTraits: imputed species-level functional trait
  dataset for vascular plants of Denmark, Finland, Iceland, Norway and Sweden*.
  bioRxiv preprint. [doi:10.64898/2026.03.03.709463](https://doi.org/10.64898/2026.03.03.709463).
  [Dataset och kod](https://github.com/poniitty/NordicTraits).
  Källrepositoriets MIT-licens finns i `data/NordicTraits-LICENSE.txt`.
- Miljöindikatorer och biodiversitetsrelevans som inte ingår i NordicTraits finns
  kvar från [Tyler et al. (2021)](https://doi.org/10.1016/j.ecolind.2020.106923)
  och märks separat på sidan. Även den äldre uppgiften om invandringstid kommer
  från det befintliga underlaget. Riskklassning 2024, invasivlista och fjärilsdata
  använder befintliga källfiler. `karaktarer.csv` och äldre funktionella kolumner i
  `vaxtdata.csv` finns kvar som källmaterial men används inte som trait-fallback.
  Blomfärg och blomningstid från den äldre karaktärsfilen visas inte längre,
  eftersom de inte ingår i NordicTraits V1.

Uttaget 2026-11-24 matchar **2 418 av 2 426 taxa** mot rödlistunderlaget och
**2 256 taxa** mot NordicTraits (2 230 via Dyntaxa-ID och 26 via exakta namn eller
synonymer i NordicTraits artmetadata). Inga ungefärliga namnmatchningar eller
automatiska värden från överordnade arter används. De 8 respektive 170 taxa som
inte kan matchas visas som saknade uppgifter, inte som LC, NE eller gamla traits.
Artval med vetenskapligt namn bevarar också underarter, hybrider och aggregat.

Full matchningsrapport, äldre värden för jämförelse och listor över omatchade
taxa finns i `data/update-report.json`. Jämförelsen tolkar den äldre texten
"Not Red-listed" som LC enbart för att kunna granska skillnaden; den är inte ett
belägg för att taxonet tidigare varit formellt bedömt som LC. Två artvärden för
livslängd är 0 i NordicTraits V1 trots att metadatan bara definierar nivåerna 1–4.
De bevaras och visas med text om att förklaring saknas i källans skala.

## Uppdatera data

Använd Python 3 och `openpyxl` (bara vid datauppdatering). Källornas versioner och
NordicTraits commit är låsta i skriptet. Hämtning görs vid byggsteget, inte i
besökarens webbläsare. Skriptet skriver bara de tre JSON-filerna under `data/`.

```sh
python -m pip install openpyxl
python scripts/update_data.py --retrieved-at 2026-11-24
```

För en reproducerbar körning med redan nedladdade originalfiler:

```sh
python scripts/update_data.py \
  --redlist-csv /path/to/Rodlistearbete_2025.csv \
  --nordictraits-zip /path/to/NordicTraits_V1.zip \
  --retrieved-at 2026-11-24
```

Källfilerna och deras SHA-256 finns angivna i respektive JSON-fils `source`.
Granska nya källversioner och matchningsrapporten innan ett nytt uttag publiceras.

## Kontrollera ändringar

Kör syntax- och datakontroller med Node.js 18 eller senare:

```sh
node --check script.js
node --check data-view.js
node --test tests/data.test.js
```

Kontrollerna omfattar nya och avförda rödlistekategorier, saknad status, NA/NE/RE,
källtillägg, enheter, imputeringsmarkeringar, alla 44 traitfält och bevarade
taxongränser. För lokal granskning kan projektmappen serveras med valfri statisk
webbserver; öppna sidan via HTTP så att CSV- och JSON-filerna kan laddas.
