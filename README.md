# Växtsök

Statisk webbplats för att söka svenska kärlväxter. Publiceras som tidigare med
GitHub Pages; ingen server eller databas behövs.

## Förenklad översikt

Art, vetenskapligt namn, familj, rödlistekategori och invandringstid visas först,
med riskklass och EU-varning när de gäller. Därefter visas sju kort med mätare:
biodiversitetsrelevans, nektarproduktion, livslängd, pollination, värmekrav,
ljusbehov och fuktighetskrav. Korten anpassas till en kolumn på smala skärmar.

Mätarna använder källornas ordinala klasser. De visar inte procent, ett gemensamt
betyg eller exakta åldrar/temperaturer. Pollination använder klass 0–2 för
oberoende, delvis beroende och helt beroende av djurpollinatörer; källans
underkategorier finns kvar i den förklarande texten. Saknade värden får ingen
markör. Imputerade NordicTraits-värden markeras i respektive kort. Alla 44
egenskaper finns kvar i avancerat läge.

## Svensk nationell förteckning över invasiva arter

`data/national-invasive-2026.json` omfattar samtliga elva kärlväxter i bilagan
till [förordning (2026:311)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/forordning-2026311-om-invasiva-frammande-arter_sfs-2026-311/),
som gäller sedan 15 maj 2026. Alla elva matchar befintliga arter via Dyntaxa-ID.
Nationell listning visas i båda lägena, separat från EU-listning och riskklass.
Uppgifterna kontrollerades 2026-11-24 mot förordningen och
[Naturvårdsverkets vägledning](https://www.naturvardsverket.se/amnesomraden/invasiva-frammande-arter/nationell-forteckning-over-invasiva-frammande-arter/).

Artinformationen visar de särskilda undantagen för spärroxbär (Gotlands och
Kalmar län, inget införselförbud), användning av de två fetbladen på vissa
vegetationstak samt frösterila vresroshybrider. Under ”Regler och undantag” finns
även information om befintliga förekomster hos privata fastighetsägare och
nyttjanderättshavare, med villkoret om slutna vattensamlingar för vattenväxter.
Vägledningen innehåller ingen generell uppmaning att alltid ta bort alla bestånd.

JSON-filen är ett granskat urval för denna växtapp; den hämtas inte automatiskt
från en myndighet vid sidvisning. Ändringar i lagstiftningen behöver granskas och
föras in i filen. Om filen inte kan laddas visas detta uttryckligen.
Det officiella namnet strandkotula fungerar som sökalias till projektets kotula.

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
node --check simple-view.js
node --check invasive-view.js
node --test tests/*.test.js
```

Kontrollerna omfattar nya och avförda rödlistekategorier, saknad status, NA/NE/RE,
källtillägg, enheter, imputeringsmarkeringar, alla 44 traitfält och bevarade
taxongränser. För lokal granskning kan projektmappen serveras med valfri statisk
webbserver; öppna sidan via HTTP så att CSV- och JSON-filerna kan laddas.

## Växtval

Öppna fliken Växtval för att lägga till arter, granska ett kalkylblad eller söka
inhemska taxa för en viss ståndort. Listan och ståndorten sparas lokalt i
webbläsaren. CSV-exporten innehåller namn, ursprunglig mängdtext och delyta.
Ståndorten avser hela den aktiva listan. Analysera en planteringsyta i taget.

Utformningen följer växtförteckningar i svensk projektering (Sollentunas tekniska
handbok, kap. 5.2.3) och [Vectorworks arbetsbladsexport](https://app-help.vectorworks.net/2026/eng/VW2026_Guide/Worksheets/Exporting%20worksheets.htm).
XLSX stöds via read-excel-file 9.3.20 och CSV/TSV via Papa Parse 5.5.3.
Båda levereras med licens under vendor/. Importören låter projektören välja
blad, kolumner och första datarad. Sortnamn behålls och omatchade rader finns
kvar för granskning. Mängder används inte som ekologiska vikter.

Blomningsintervallen kommer från [Auffrets dataset](https://doi.org/10.5878/rn49-wx18)
(CC0), delmängden MOS2018 i phenology_data_2021.csv. Start och Stop är
inkluderande kalendermånader. Endast entydiga artnamn som även överensstämmer
med vetenskapligt namn i 2025 års rödlistedata används. 226 katalogtaxa har
intervall. Kalendern räknar varje matchat taxon en gång. Ty­lers ståndortsindex
grupperas i överlappande klasser enligt gränsbeskrivningarna i originalartikeln.
Täckningen av odlingssorter är begränsad. Projektets EU-fil är ett urval för
katalogen. Se [Naturvårdsverkets förteckning](https://www.naturvardsverket.se/amnesomraden/invasiva-frammande-arter/forbjudna-invasiva-frammande-arter/).

## Plantskolornas namn

Det första granskade registret i nursery.js innehåller nio poster från Cramers,
Stångby och Björkhaga. Källänkar och verifieringsdatum finns i sortkorten.
Samma normalisering används vid import och sökning efter vetenskapligt namn.
Apostrofer, versaler och varumärkessymboler normaliseras och dokumenterade
sortsynonymer hanteras. Originaltexten bevaras vid CSV-export.

Varje sort har egen identitet. En artkoppling länkar till Artfakta när arten finns
i grundkatalogen. Sorterna får inga automatiskt ärvda nektar-, rödlist- eller
biodiversitetsvärden. Caradonnas juni–september-intervall visas i kalendern med
plantskolan som källa. Övriga sortintervall är okända. Registret är ett begränsat,
manuellt granskat urval, inte plantskolornas fullständiga sortiment.
Ogranskade namn förblir omatchade. Registerutökning kräver källa för varje post.

Blomningsartikel:
Auffret, A. (2021). Historical floras reflect broad shifts in flowering phenology
in response to a warming climate. Ecosphere, 12(7), e03683.
https://doi.org/10.1002/ecs2.3683
