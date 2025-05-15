// Fullständigt script.js med GBIF-integrerad karta, ekologiska indikatorer och fix för Leaflet-bounds

let plantData = [];
let riskData = [];
let euInvasiveData = [];
let plantTraits = [];
let gbifLayer; 
let allDataLoaded = false;
let insectData = [];
let plantList = [];
let advancedMode = false;

const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");
const resultDiv = document.getElementById("result");

// Leaflet-karta
let map = L.map("map").setView([62.0, 15.0], 5); // centrera Sverige
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
}).addTo(map);

// Ladda CSV-filer
Papa.parse("vaxtdata.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    plantData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("Riskklassning2024_Uttag.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    riskData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("eu_invasiva_vaxtarter.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    euInvasiveData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("karaktarer.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    plantTraits = results.data;
    checkAllDataLoaded();
  }
});
Papa.parse("resource_relevant.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    insectData = results.data;
    checkAllDataLoaded();
  }
});
function checkAllDataLoaded() {
  if (
    plantData.length &&
    riskData.length &&
    euInvasiveData.length &&
    plantTraits.length &&
    insectData.length
  ) {
    allDataLoaded = true;
    plantNames = [...new Set(plantData.map(p => p["Svenskt namn"]))];
    setupAutocomplete();
  }
}

function setupAutocomplete() {
  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;

    const matches = plantData
      .filter(p => p["Svenskt namn"]?.toLowerCase().includes(val))
      .map(p => p["Svenskt namn"]);

    const uniqueMatches = [...new Set(matches)].slice(0, 10);

    uniqueMatches.forEach(name => {
      const div = document.createElement("div");
      div.textContent = name;
      div.onclick = () => {
        input.value = name;
        suggestions.innerHTML = "";
        searchPlant();
      };
      suggestions.appendChild(div);
    });
  });
}

function getRiskklassningFromXLSX(dyntaxaId) {
  const row = riskData.find(r => r["TaxonId"]?.toString() === dyntaxaId?.toString());
  return row ? row["Riskkategori, utfall enligt GEIAA metodik"] || null : null;
}

function getAssociatedInsects(genus, species) {
  return insectData.filter(row => {
    const genusMatch = row["Hostplant Genus"]?.toLowerCase().trim() === genus.toLowerCase().trim();
    const speciesMatch = row["Hostplant Species"]?.toLowerCase().trim() === species.toLowerCase().trim();
    return genusMatch && speciesMatch;
  });
}

function isEUInvasive(dyntaxaId) {
  return euInvasiveData.some(row => row["Dyntaxa ID"]?.toString() === dyntaxaId?.toString());
}
  
// GBIF karta

async function drawMapFromGBIF(scientificName) {
  if (!scientificName) return;

  if (gbifLayer && map.hasLayer(gbifLayer)) {
    map.removeLayer(gbifLayer);
    gbifLayer = null;
  }

  const coords = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(scientificName)}&geometry=POLYGON((5 54, 5 71, 32 71, 32 54, 5 54))&hasCoordinate=true&year=2015&limit=300&offset=${offset}`;
    const res = await fetch(url);
    const data = await res.json();

    coords.push(...data.results
      .filter(r => r.decimalLatitude && r.decimalLongitude)
      .map(r => [r.decimalLatitude, r.decimalLongitude]));

    offset += 300;
    hasMore = !data.endOfRecords;
  }

  if (!coords.length) return;

  gbifLayer = L.featureGroup(coords.map(c => L.circleMarker(c, {
    radius: 5,
    color: "#005500",
    fillColor: "#66cc66",
    fillOpacity: 0.7
  })));

  gbifLayer.addTo(map);

  const swedenBounds = L.latLngBounds([[55, 10], [69.5, 24]]);
  map.fitBounds(swedenBounds.pad(0.1));
}

function drawArrowScale(value, min, max, labels = null, unit = "") {
  value = parseFloat(value);
  if (isNaN(value)) return "<em>okänt</em>";
  const percent = ((value - min) / (max - min)) * 100;
  const cappedPercent = Math.max(0, Math.min(100, percent));
  const labelLine = labels ? `<div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.2rem;">
    <span>${labels[0]}</span><span>${labels[1]}</span>
  </div>` : "";

  return `
    <div style="margin: 0.4rem 0;">
      <div style="position: relative; height: 6px; background: #ccc; border-radius: 3px;">
        <div style="position: absolute; left: ${cappedPercent}%; transform: translateX(-50%);">
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid #007700;"></div>
        </div>
      </div>
      ${labelLine}
      ${unit ? `<div style="font-size:0.8rem; color:gray;">Värde: ${value} ${unit}</div>` : ""}
    </div>
  `;
}
function formatPlantInfo(match, isEUListad = false) {
  const dyntaxa = match["Dyntaxa ID number"];
  const traits = plantTraits.find(t => t["Dyntaxa ID number"]?.toString() === dyntaxa);
  const riskklass = getRiskklassningFromXLSX(dyntaxa);
  const zon = heatRequirementToZone(match["Heat requirement"]);
  const immigration = getImmigrationLabel(match["Time of immigration"]);
  const redlist = ["0", "1", "2", "3"].includes(match["Time of immigration"]?.toString());

  const genus = match["Scientific name"].split(" ")[0];
  const species = match["Scientific name"].split(" ")[1] || "";
  const scientific = match["Scientific name"];
  const swedish = match["Svenskt namn"];
  const associatedInsects = getAssociatedInsects(genus, species);

  const insectHtml = associatedInsects.length > 0 ? `
    <h4>Associerade insektsarter:</h4>
    <ul>
      ${associatedInsects.map(insect => `
        <li><em>${insect["Insect Genus"]} ${insect["Insect Species"]}</em> (${insect["Insect Family"]}) - ${insect["Damage"] || "ingen specifik skada angiven"}</li>
      `).join('')}
    </ul>
  ` : "";

  const addButton = `<button onclick="addToPlantList('${swedish}', '${scientific}')">➕ Lägg till i min växtlista</button>`;

  if (!advancedMode) {
    return `
      <h3>${swedish} (${scientific})</h3>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      ${redlist ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>` : ""}
      <p><strong>Invandringstid:</strong> ${immigration}</p>
      ${riskklass ? `<p><strong>Riskklass:</strong> ${getColoredRiskTag(riskklass)}</p>` : ""}
      ${isEUListad ? `<p><strong style="color:#b30000;">⚠️ EU-listad invasiv art</strong></p>` : ""}
      ${addButton}
    `;
  }

  const scale = (label1, label2) => [label1, label2];

  return `
    <h3>${swedish} (${scientific})</h3>
    <p><strong>Familj:</strong> ${match["Family"]}</p>
    ${redlist ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>` : ""}
    <p><strong>Härdighet (zon):</strong> ${zon}</p>
    <p><strong>Invandringstid:</strong> ${immigration}</p>
    ${isEUListad ? `<p><strong style="color:#b30000;">⚠️ EU-listad invasiv art</strong></p>` : ""}
    ${riskklass ? `<p><strong>Riskklass:</strong> ${getColoredRiskTag(riskklass)}</p>` : ""}
    ${traits ? `<p><strong>Växtsätt:</strong> ${getGrowthFormIcon(traits["Växtsätt"])} ${traits["Växtsätt"]}</p>` : ""}
    ${traits ? `<p><strong>Medelhöjd:</strong> ${drawHeight(traits["Medelhöjd (cm)"])}</p>` : ""}
    
    <h4>Indikatorer</h4>
    <p><strong>Biodiversitetsrelevans:</strong></p>
    ${drawArrowScale(match["Biodiversity relevance"], 1, 8, scale("Låg", "Hög"))}

    <p><strong>Nektarproduktion:</strong></p>
    ${drawArrowScale(match["Nectar production"], 1, 7, scale("Ingen", "Väldigt hög"))}

    <p><strong>Värmekrav (härdighet):</strong></p>
    ${drawArrowScale(match["Heat requirement"], 1, 14, scale("Arktisk", "Varm zon"))}

    <p><strong>Köldtålighet:</strong></p>
    ${drawArrowScale(match["Cold requirement"], 1, 20, scale("Tropisk", "Arktisk"))}

    <p><strong>Ljusbehov:</strong></p>
    ${drawArrowScale(match["Light"], 1, 7, scale("Djup skugga", "Full sol"))}

    <p><strong>Fuktighetskrav:</strong></p>
    ${drawArrowScale(match["Moisture"], 1, 12, scale("Torrt", "Permanent vatten"))}

    <p><strong>pH-behov (jordreaktion):</strong></p>
    ${drawArrowScale(match["Soil reaction (pH)"], 1, 8, scale("Mycket surt", "Alkaliskt"))}

    <p><strong>Kvävebehov (N):</strong></p>
    ${drawArrowScale(match["Nitrogen (N)"], 1, 9, scale("Näringsfattigt", "Näringsrikt"))}

    <p><strong>Fosforbehov (P):</strong></p>
    ${drawArrowScale(match["Phosphorus (P)"], 1, 5, scale("Lågt", "Högt"))}
  `;
}
    <p><strong>Salttålighet:</strong></p>
    ${drawArrowScale(match["Salinity"], 1, 5, scale("Ej salt", "Mycket salt"))}

    <p><strong>Gynnas av bete/slåtter:</strong></p>
    ${drawArrowScale(match["Grazing/mowing"], 1, 8, scale("Känslig", "Kräver"))}

    <p><strong>Behov av markstörning:</strong></p>
    ${drawArrowScale(match["Soil disturbance"], 1, 9, scale("Konkurrensstark", "Kräver störning"))}

    <p><strong>Livslängd:</strong></p>
    ${drawArrowScale(match["Longevity"], 1, 4, scale("Ettårig", "Långlivad"))}

    <p><strong>Beroende av pollinatörer:</strong></p>
    ${drawArrowScale(match["Pollinator dependence"], 0, 2, scale("Oberoende", "Beroende"))}

    <p><strong>Frövila:</strong></p>
    ${drawArrowScale(match["Seed dormancy"], 1, 4, scale("Ingen", "Djup vila"))}

    <p><strong>Fröbankens livslängd:</strong></p>
    ${drawArrowScale(match["Seed bank"], 1, 4, scale("Kortlivad", "Permanent"))}

    <p><strong>Kvävefixering:</strong></p>
    ${drawArrowScale(match["Nitrogen fixation"], 0, 1, scale("Nej", "Ja"))}

    <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
    <hr/>
    ${insectHtml}
    ${addButton}
  `;
}
