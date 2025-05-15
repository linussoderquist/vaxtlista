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
  complete: function (results) {
    plantData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("Riskklassning2024_Uttag.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    riskData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("eu_invasiva_vaxtarter.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    euInvasiveData = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("karaktarer.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    plantTraits = results.data;
    checkAllDataLoaded();
  }
});

Papa.parse("resource_relevant.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
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

function heatRequirementToZone(h) {
  const zones = [
    "hög-alpin/arktisk zon", "mellanalpin zon", "låg-alpin zon",
    "trädgräns", "subalpin zon (zon 9)", "odlingszon 8", "odlingszon 7",
    "odlingszon 6", "odlingszon 5", "odlingszon 4", "odlingszon 3",
    "odlingszon 2", "odlingszon 1", "kan ej överleva i Sverige"
  ];
  const v = parseInt(h);
  return zones[v - 1] || "okänd";
}

function drawArrowScale(value, min, max, labels = null, unit = "") {
  value = parseFloat(value);
  if (isNaN(value)) return "<em>okänt</em>";

  const percent = ((value - min) / (max - min)) * 100;
  const cappedPercent = Math.max(0, Math.min(100, percent));

  const labelLine = labels ? `
    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.2rem;">
      <span>${labels[0]}</span><span>${labels[1]}</span>
    </div>` : "";

  return `
    <div style="margin: 0.8rem 0;">
      <div style="position: relative; height: 24px; background: #ddd; border-radius: 12px; overflow: hidden;">
        <div style="width: ${cappedPercent}%; background: #66c2ff; height: 100%; display: flex; align-items: center; justify-content: center; color: #000; font-size: 0.9rem; font-weight: bold;">
          ${value}${unit ? ` ${unit}` : ""}
        </div>
      </div>
      ${labelLine}
    </div>
  `;
}

function addToPlantList(swedishName, scientificName) {
  // Undvik dubbletter
  if (plantList.some(p => p.scientific === scientificName)) return;

  // Hämta växten från plantData
  const plant = plantData.find(p => p["Scientific name"] === scientificName);
  if (!plant) return;

  // Hämta Dyntaxa ID och riskklass
  const dyntaxa = plant["Dyntaxa ID number"];
  const riskklass = getRiskklassningFromXLSX(dyntaxa);

  // Lägg till i listan
  plantList.push({
    swedish: swedishName,
    scientific: scientificName,
    riskklass: riskklass
  });

  updatePlantListUI();
}

function removeFromPlantList(scientificName) {
  plantList = plantList.filter(p => p.scientific !== scientificName);
  updatePlantListUI();
}

function updatePlantListUI() {
  const list = document.getElementById("plantList");
  list.innerHTML = "";

  if (plantList.length === 0) {
    list.innerHTML = "<li><em>Inga växter tillagda än.</em></li>";
    return;
  }

  plantList.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div style="width: 60px;">
          ${p.riskklass ? getColoredRiskTag(p.riskklass) : ""}
        </div>
        <div style="flex: 1;">
          <strong>${p.swedish}</strong>
        </div>
        <button onclick="removeFromPlantList('${p.scientific}')">–</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function toggleMode() {
  advancedMode = document.getElementById("modeToggle").checked;

  const inputVal = input.value.toLowerCase().trim();
  const match = plantData.find(p => p["Svenskt namn"]?.toLowerCase().trim() === inputVal);
  if (match) {
    const isEUListad = isEUInvasive(match["Dyntaxa ID number"]);
    resultDiv.innerHTML = formatPlantInfo(match, isEUListad);
    drawMapFromGBIF(match["Scientific name"]);
  }
}

function searchPlant() {
  if (!allDataLoaded) {
    resultDiv.innerHTML = "🔄 Datan laddas fortfarande...";
    return;
  }

  const inputVal = input.value.toLowerCase().trim();
  const match = plantData.find(p => p["Svenskt namn"]?.toLowerCase().trim() === inputVal);

  if (!match) {
    resultDiv.innerHTML = "🚫 Växten hittades inte.";
    return;
  }

  const isEUListad = isEUInvasive(match["Dyntaxa ID number"]);
  resultDiv.innerHTML = formatPlantInfo(match, isEUListad);
  drawMapFromGBIF(match["Scientific name"]);
}

function getGrowthFormIcon(type) {
  const icons = {
    "Träd": "🌳",
    "Buske": "🌿",
    "Ört": "🌱",
    "Gräs": "🌾",
    "Suckulent": "🌵",
    "Vattenväxt": "💧"
  };
  return icons[type] || "🌿";
}

function getColoredRiskTag(code) {
  const tagColors = {
    "SE": "background-color:#c2491d; color:white;",
    "HI": "background-color:#d9782d; color:white;",
    "PH": "background-color:#e2b539; color:black;",
    "LO": "background-color:#f3e28c; color:black;",
    "NK": "background-color:#fdf7d4; color:black;"
  };
  const style = tagColors[code] || "background-color:#eee; color:#000;";
  return `<span style="padding:3px 8px; border-radius:12px; font-weight:bold; ${style}">${code}</span>`;
}

function drawHeight(cm) {
  const value = parseInt(cm);
  if (isNaN(value)) return "<em>okänt</em>";
  return `${value} cm`;
}
function getRedlistBadge(status) {
  if (!status || status.toUpperCase().includes("NOT RED-LISTED")) {
    return `<span class="redlist-badge rl-LC">LC</span>`;
  }
  const s = status.trim().toUpperCase();
  const code = s.match(/(EX|EW|RE|CR|EN|VU|NT|LC|DD|NE)/)?.[1] || "NE";
  return `<span class="redlist-badge rl-${code}">${code}</span>`;
}

function getImmigrationLabel(value) {
  const scale = {
    "0": "inhemsk art", "1": "införd före 1700", "2": "1700–1750",
    "3": "1750–1800", "4": "1800–1850", "5": "1850–1900",
    "6": "1900–1950", "7": "1950–2000", "8": "efter 2000"
  };
  return scale[value?.trim()] || "<em>okänd invandringstid</em>";
}

function heatRequirementToZone(h) {
  const zones = [
    "hög-alpin/arktisk zon", "mellanalpin zon", "låg-alpin zon",
    "trädgräns", "subalpin zon (zon 9)", "odlingszon 8", "odlingszon 7",
    "odlingszon 6", "odlingszon 5", "odlingszon 4", "odlingszon 3",
    "odlingszon 2", "odlingszon 1", "kan ej överleva i Sverige"
  ];
  const v = parseInt(h);
  return zones[v - 1] || "okänd";
}

// ---- Skala-funktioner (används vid behov i andra delar) ----

function drawMoistureScale(val) {
  return drawScaleWithEmoji(val, "💧");
}

function drawSaltTolerance(value) {
  return drawScaleWithEmoji(value, "🧂");
}

function drawLightScale(value) {
  const phases = ["🌑", "🌘", "🌗", "🌖", "🌕", "🔆", "☀️"];
  const v = parseInt(value);
  if (isNaN(v) || v < 1 || v > 7) return "<em>okänt</em>";
  return `<span style="font-size: 1.5rem;">${phases[v - 1]}</span>`;
}

function drawNectarScale(value) {
  const raw = parseInt(value);
  if (isNaN(raw) || raw < 1) return "<em>okänt</em>";
  const filled = raw === 1 ? 0 : raw - 1;
  const pollinators = ["🐝", "🦋"];
  let output = "<div class='scale'>";
  for (let i = 0; i < 6; i++) {
    output += `<span>${i < filled ? pollinators[i % 2] : "⚪"}</span>`;
  }
  output += "</div>";
  return output;
}

function drawBiodiversityScale(value) {
  const pool = ["🐸", "🌼", "🍄", "🦔", "🪲", "🐌", "🦉", "🐛"];
  value = parseInt(value);
  if (isNaN(value)) return "<em>okänt</em>";
  let output = "<div class='scale'>";
  for (let i = 0; i < 5; i++) {
    output += `<span>${i < value ? pool[Math.floor(Math.random() * pool.length)] : "⚪"}</span>`;
  }
  output += "</div>";
  return output;
}

function drawScaleWithEmoji(value, emoji, color = null, max = 5) {
  value = parseInt(value);
  if (isNaN(value)) return "<em>okänt</em>";
  let output = "<div class='scale'>";
  for (let i = 0; i < max; i++) {
    const style = color ? `style=\"color:${color}\"` : "";
    output += `<span ${style}>${i < value ? emoji : "⚪"}</span>`;
  }
  output += "</div>";
  return output;
}

function getSeedBankLabel(value) {
  const map = {
    "1": "Väldigt kortlivad (upp till 1-2 år)",
    "2": "Korlivad (1–5 år)",
    "3": "Långlivad (5–25 år)",
    "4": "Semi-permanent (>25 år)"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}

function getPhosphorusLabel(value) {
  const map = {
    "1": "Undviker jordar med högt fosforinnehåll",
    "2": "Missgynnas av högt fosforinnehåll",
    "3": "Trivs vid genomsnittligt fosforinnehåll",
    "4": "Gynnas av högt fosforinnehåll",
    "5": "Begränsad till jordar med högt fosforinnehåll"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getNitrogenLabel(value) {
  const map = {
    "1": "Mycket kvävefattigt",
    "2": "Måttligt till mycket kvävefattigt",
    "3": "Måttligt kvävefattigt",
    "4": "Från måttligt kvävefattigt till måttligt kväverikt",
    "5": "Måttligt kväverikt",
    "6": "Måttligt till mycket kväverikt",
    "7": "Mycket kväverikt",
    "8": "Begränsad till naturligt kväverika jordar",
    "9": "Främst på konstgjort kväveberikade jordar"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}

function getSeedDormancyLabel(value) {
  const map = {
    "1": "Ingen frövila – gror inom 10 dagar",
    "2": "Ingen frövila eller med lätt fysiologisk/fysisk vila–gror efter 10–30 dagar",
    "3": "Med morfologisk, fysisk eller intermediär fysiologisk vila; mycket långsam groning oberoende av temperatur/säsong (<35 dagar stratifiering)",
    "4": "Med intermediär eller djup fysiologisk/morfologisk vila; kräver >35 dagars kallstratifiering"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}

function getNectarProductionLabel(value) {
  const map = {
    "1": "Ingen nektarproduktion (0 g socker/m²/år) och inget samlingsbart pollen",
    "2": "Obetydlig nektarproduktion (<0.2 g), eller ingen men med låga mängder samlingsbart pollen",
    "3": "Liten nektarproduktion (0.2–5 g), eller lägre men med rikligt pollen",
    "4": "Måttlig nektarproduktion (5–20 g)",
    "5": "Ganska mycket nektar (20–50 g)",
    "6": "Mycket nektar (50–200 g)",
    "7": "Väldigt mycket nektar (>200 g)"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getBiodiversityRelevanceLabel(value) {
  const map = {
    "1": "<6 associerade arter",
    "2": "6–12 associerade arter",
    "3": "13–24 associerade arter",
    "4": "25–50 associerade arter",
    "5": "51–100 associerade arter",
    "6": "101–200 associerade arter",
    "7": "201–400 associerade arter",
    "8": ">400 associerade arter"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}

function getLongevityLabel(value) {
  const map = {
    "1": "strikt ettårig",
    "2": "tvåårig eller dör efter blommning",
    "3": "kortlivad perenn (dör ofta efter blomming)",
    "4": "långlivad perenn"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getPollinatorDependenceLabel(value) {
  const map = {
    "0a": "oberoende av pollinatörer – sprids främst vegetativt (klonal tillväxt eller fragmentering)",
    "0b": "oberoende av pollinatörer – pollinering sker främst via vind eller vatten (även ormbunkar och lummerväxter)",
    "0c": "oberoende av pollinatörer – självpollinerande",
    "0d": "oberoende av pollinatörer – bildar frön via apomixis (utan befruktning)",
    "0": "oberoende av pollinatörer",
    "1": "delvis beroende av insekter – kan också självpollinera eller pollineras abiotiskt",
    "2": "helt beroende av insekter för pollinering (självinkompatibel)",
    "1/2": "pollineras främst av andra insekter (t.ex. flugor eller skalbaggar)",
    "1/2a": "exklusivt pollinerad av bin eller humlor (Hymenoptera)",
    "1/2ab": "exklusivt pollinerad av bin/humlor och fjärilar (Hymenoptera och Lepidoptera)",
    "1/2b": "exklusivt pollinerad av fjärilar (Lepidoptera)"
  };

  return map[value?.toString()] || "<em>okänt</em>";
}
function getSoilDisturbanceLabel(value) {
  const map = {
    "1": "Koloniserar etablerad vegetation och orsakar varaktiga strukturella förändringar utan behov av markstörning",
    "2": "Koloniserar etablerad vegetation, konkurrerar framgångsrikt kortsiktigt men trängs ut på sikt utan markstörning",
    "3": "Kan reproducera i etablerad vegetation men har låg konkurrensförmåga och trängs ut över tid",
    "4": "Viss reproduktion i etablerad vegetation men inte tillräcklig för stabil population",
    "5": "Behöver markstörning för reproduktion, men etablerade individer kan överleva länge utan",
    "6": "Reproducerar endast i störd/jordblottad mark, kan finnas kvar i årtionden men försvinner gradvis",
    "7": "Reproducerar endast i störd/jordblottad mark, kan finnas kvar några år men försvinner gradvis",
    "8": "Inte konkurrenskraftig i sluten vegetation, kräver markstörning minst vartannat år",
    "9": "Inte konkurrenskraftig i sluten vegetation, kräver årlig markstörning"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getGrazingLabel(value) {
  const map = {
    "1": "Tål inte bete eller slåtter alls",
    "2": "Tål enstaka men inte återkommande bete eller slåtter",
    "3": "Tål regelbunden störning men föredrar obetade/slagna miljöer",
    "4": "Trivs både i betade/slagna och obetade/slagna miljöer",
    "5": "Gynnas av viss störning men överlever även utan",
    "6": "Starkt gynnad av regelbundet bete/slåtter men klarar några år utan",
    "7": "Starkt beroende av störning och försvinner om den uteblir",
    "8": "Kräver återkommande eller kontinuerlig störning"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getSalinityLabel(value) {
  const map = {
    "1": "Inte salt­tålig, undviker även svagt salta miljöer",
    "2": "Måttligt salt­tålig, men föredrar osaltade miljöer",
    "3": "Gynnas av måttlig salthalt, men inte beroende av det",
    "4": "Konkurrerar främst vid måttlig–hög salthalt",
    "5": "Konkurrerar endast vid hög salthalt"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getMoistureLabel(value) {
  const map = {
    "1": "Mycket torrt",
    "2": "Torrt",
    "3": "Torrt–friskt",
    "4": "Friskt (mesiskt)",
    "5": "Friskt–fuktigt",
    "6": "Fuktigt",
    "7": "Fuktigt–blött",
    "8": "Blött",
    "9": "Blött – tillfälligt översvämmat",
    "10": "Tillfälligt översvämmat",
    "11": "Permanent vatten <0.5 m",
    "12": "Permanent djupt vatten"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getLightLabel(value) {
  const map = {
    "1": "Djup skugga",
    "2": "Måttlig till djup skugga",
    "3": "Halvskugga till måttlig skugga",
    "4": "Halvskugga",
    "5": "Sol – halvskugga",
    "6": "Sol, men tål viss skuggning",
    "7": "Alltid full sol"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getColdRequirementLabel(value) {
  const map = {
    "1": "Årlig minimitemp sällan under 10 °C (subtropiskt/tropiskt klimat)",
    "2": "Årlig minimitemp sällan under 5 °C",
    "3": "Årlig minimitemp sällan under 0 °C",
    "4": "Temperaturer under 0 °C förekommer men inte under –5 °C",
    "5": "Temperaturer under 0 °C regelbundna men sällan under –10 °C",
    "6": "Vintertemperaturer normalt under 0 °C i <3 månader, inte under –15 °C",
    "7": "Odlingszon 1",
    "8": "Odlingszon 2",
    "9": "Odlingszon 3",
    "10": "Odlingszon 4",
    "11": "Odlingszon 5",
    "12": "Odlingszon 6",
    "13": "Odlingszon 7",
    "14": "Odlingszon 8",
    "15": "Odlingszon 9",
    "16": "Överlever i zoner ovanför zon 9",
    "17": "Når trädgränsen (övre subalpina zonen)",
    "18": "Når låg-alpin zon",
    "19": "Når mellan-alpin zon",
    "20": "Begränsad till hög-alpin/arktisk zon"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}
function getHeatRequirementLabel(value) {
  const map = {
    "1": "Når hög-alpin/arktisk zon",
    "2": "Når mellan-alpin zon",
    "3": "Når låg-alpin zon",
    "4": "Når trädgränsen (övre subalpina zonen)",
    "5": "Når subalpina zonen (odlingszon 9), men endast i gynnsamt mikroklimat",
    "6": "Når odlingszon 8",
    "7": "Når odlingszon 7",
    "8": "Når odlingszon 6",
    "9": "Når odlingszon 5",
    "10": "Når odlingszon 4",
    "11": "Når odlingszon 3",
    "12": "Når odlingszon 2",
    "13": "Når odlingszon 1",
    "14": "Kan i nuläget inte reproducera eller vara bofast i Sverige p.g.a. klimatbegränsningar"
  };
  return map[value?.toString()] || "<em>okänt</em>";
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
  const scale = (label1, label2) => [label1, label2];

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

    <p><strong>Biodiversitetsrelevans:</strong> ${getBiodiversityRelevanceLabel(match["Biodiversity relevance"])}</p>

    <p><strong>Nektarproduktion:</strong> ${getNectarProductionLabel(match["Nectar production"])}</p>

    <p><strong>Värmekrav (härdighet):</strong> ${getHeatRequirementLabel(match["Heat requirement"])}</p>
    
    <p><strong>Köldkrav:</strong> ${getColdRequirementLabel(match["Cold requirement"])}</p>
    
    <p><strong>Ljusbehov:</strong> ${getLightLabel(match["Light"])}</p>

    <p><strong>Fuktighetskrav:</strong> ${getMoistureLabel(match["Moisture"])}</p>

    <p><strong>pH:</strong> ${match["Soil reaction (pH)"] || "<em>okänt</em>"}</p>

    <p><strong>Kvävepreferens:</strong> ${getNitrogenLabel(match["Nitrogen (N)"])}</p>

    <p><strong>Fosforpreferens:</strong> ${getPhosphorusLabel(match["Phosphorus (P)"])}</p>

    <p><strong>Salttålighet:</strong> ${getSalinityLabel(match["Salinity"])}</p>

    <p><strong>Bete/slåtter:</strong> ${getGrazingLabel(match["Grazing/mowing"])}</p>

    <p><strong>Markstörningsbehov:</strong> ${getSoilDisturbanceLabel(match["Soil disturbance"])}</p>

    <p><strong>Livslängd:</strong> ${getLongevityLabel(match["Longevity"])}</p>

    <p><strong>Beroende av pollinatörer:</strong> ${getPollinatorDependenceLabel(match["Pollinator dependence"])}</p>

    <p><strong>Frövila:</strong> ${getSeedDormancyLabel(match["Seed dormancy"])}</p>

    <p><strong>Fröbankens livslängd:</strong> ${getSeedBankLabel(match["Seed bank"])}</p>

    <p><strong>Kvävefixering:</strong> ${match["Nitrogen fixation"] === "1" ? "Ja" : "Nej"}</p>

    <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
    <hr/>
    ${insectHtml}
    ${addButton}
  `;
}
