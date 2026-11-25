// Fullständigt script.js med GBIF-integrerad karta, ekologiska indikatorer och fix för Leaflet-bounds

let plantData = [];
let riskData = [];
let euInvasiveData = [];
let euListAvailable = false;
let nationalInvasiveData = null;
let nordicTraits = null;
let habitData = [];
let redlistData = null;
let gbifLayer;
let allDataLoaded = false;
let insectData = [];

let advancedMode = false;
let currentSelectedPlant = null; // håller senaste match

function formatCentimetres(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return "Uppgift saknas";
  return `${number.toLocaleString("sv-SE", {maximumFractionDigits: 0})} cm`;
}

function renderPlantQuickFacts(plant) {
  const id = String(plant?.["Dyntaxa ID number"] ?? "").trim();
  const habit = habitData.find(row => String(row["Dyntaxa ID number"] ?? "").trim() === id);
  const trait = PlantDataView.getSpecies(nordicTraits, id);
  const growth = habit?.["Växtsätt"] || "Uppgift saknas";
  const height = habit?.["Medelhöjd (cm)"] || trait?.values.height;
  return `<div class="plant-quick-facts" aria-label="Växtsätt och medelhöjd"><div><strong>Växtsätt</strong><span>${PlantDataView.escapeHtml(growth)}</span></div><div><strong>Medelhöjd</strong><span>${PlantDataView.escapeHtml(formatCentimetres(height))}</span></div></div>`;
}

const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");
const resultDiv = document.getElementById("result");

// Leaflet-karta
let map = typeof L === "undefined" ? null : L.map("map").setView([62.0, 15.0], 5); // centrera Sverige
if (map) L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
}).addTo(map);

// Källorna laddas av initializeData() när alla funktioner har definierats.

function displayPlantNetResults(data) {
  const resultDiv = document.getElementById("plantnetResult");
  resultDiv.innerHTML = "<h4>Artförslag:</h4>";

  if (!data || !data.results || data.results.length === 0) {
    resultDiv.innerHTML += "<p>Inga förslag hittades.</p>";
    return;
  }

  data.results.slice(0, 5).forEach(result => {
    const species = result.species?.scientificNameWithoutAuthor || "Okänd art";
    const commonNames = result.species.vernacularNames 
    ?.map(n => `${n.vernacularName} (${n.language})`)
    .join(", ") || "Inga namn tillgängliga";
    const score = (result.score * 100).toFixed(1);
    const imageUrl = result.images?.[0]?.url?.s || "";

    const encodedName = encodeURIComponent(species);

    resultDiv.innerHTML += `
      <div style="margin-bottom: 1em; border-bottom: 1px solid #ccc; padding-bottom: 0.5em;">
        <strong>${species}</strong><br>
        ${commonNames}<br>
        Träffsäkerhet: ${score}%<br>
        ${imageUrl ? `<img src="${imageUrl}" alt="${species}" style="max-height: 100px;">` : ""}
        <br>
        <button onclick="searchPlantByScientific('${encodedName}')">Välj denna art</button>
      </div>
    `;
  });
}


async function identifyPlant() {
  const fileInput = document.getElementById("imageInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Ladda upp en bild först.");
    return;
  }

  const formData = new FormData();
  formData.append("images", file);     // En eller flera bilder
  formData.append("organs", "auto");   // Eller 'leaf', 'flower', etc.

  const apiKey = "2b107lvznqdUtphj8PuCbQFkOe"; // Byt till din egen
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=sv&include-related-images=true`;

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Serverfel: ${response.status}`);
    }

    const data = await response.json();
    displayPlantNetResults(data);
  } catch (error) {
    console.error("Fel vid API-anrop:", error);
    alert("Det gick inte att identifiera växten. Kontrollera internetanslutning och att domännamnet är godkänt i ditt PlantNet-konto.");
  }
}


const inputScientific = document.getElementById("searchScientific");

function setupAutocompleteScientific() {
  inputScientific.addEventListener("input", () => {
    const val = inputScientific.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;

    const matches = plantData
      .filter(p => p["Scientific name"]?.toLowerCase().includes(val))
      .map(p => p["Scientific name"]);

    const uniqueMatches = [...new Set(matches)].slice(0, 10);

    uniqueMatches.forEach(name => {
      const div = document.createElement("div");
      div.textContent = name;
      div.onclick = () => {
        inputScientific.value = name;
        suggestions.innerHTML = "";
        searchPlantByScientific(name);
      };
      suggestions.appendChild(div);
    });
  });
}

function searchPlantByScientific(name) {
  const query = decodeURIComponent(name).trim();
  name = query.toLowerCase();
  if (!allDataLoaded) {
    resultDiv.innerHTML = "🔄 Datan laddas fortfarande...";
    return;
  }

  // Bevara underarter, hybrider och aggregat när ett taxon väljs.
  let match = plantData.find(p => p["Scientific name"]?.toLowerCase().trim() === name);
  if (!match) match = globalThis.NurseryPlants?.find(plantData, query);
  if (!match) {
    const key = PlantDataView.scientificNameKey(query);
    const matches = plantData.filter(p => PlantDataView.scientificNameKey(p["Scientific name"]) === key);
    if (matches.length === 1) match = matches[0];
  }

  if (!match) {
    resultDiv.innerHTML = "🚫 Växten hittades inte.";
    return;
  }

  currentSelectedPlant = match;

  const isEUListad = isEUInvasive(match["Dyntaxa ID number"]);
  resultDiv.innerHTML = formatPlantInfo(match, isEUListad);
  if (!match.nursery) drawMapFromGBIF(match["Scientific name"]);
}


function setupAutocomplete() {
  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;

    const matches = plantData
      .filter(p => p["Svenskt namn"]?.toLowerCase().includes(val) || InvasivePlantView.nationalRecord(nationalInvasiveData, p["Dyntaxa ID number"])?.swedishName.toLowerCase().includes(val))
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
  if (!scientificName || !map) return;

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

function toggleMode() {
  advancedMode = document.getElementById("modeToggle").checked;

  if (currentSelectedPlant) {
    const isEUListad = isEUInvasive(currentSelectedPlant["Dyntaxa ID number"]);
    resultDiv.innerHTML = formatPlantInfo(currentSelectedPlant, isEUListad);
    drawMapFromGBIF(currentSelectedPlant["Scientific name"]);
  }
}

function searchPlant() {
  if (!allDataLoaded) {
    resultDiv.innerHTML = "🔄 Datan laddas fortfarande...";
    return;
  }

  const inputVal = input.value.toLowerCase().trim();
  const match = plantData.find(p => p["Svenskt namn"]?.toLowerCase().trim() === inputVal || InvasivePlantView.nationalRecord(nationalInvasiveData, p["Dyntaxa ID number"])?.swedishName.toLowerCase().trim() === inputVal);

  if (!match) {
    resultDiv.innerHTML = "🚫 Växten hittades inte.";
    return;
  }

  currentSelectedPlant = match;  // <- Lägg till detta

  const isEUListad = isEUInvasive(match["Dyntaxa ID number"]);
  resultDiv.innerHTML = formatPlantInfo(match, isEUListad);
  if (!match.nursery) drawMapFromGBIF(match["Scientific name"]);
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
  return PlantDataView.getRedlistBadge(status);
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
    "1": "delvis beroende av främst andra insekter än fjärilar/bin och humlor (t.ex. flugor eller skalbaggar) – kan också självpollinera eller pollineras abiotiskt",
    "2": "helt beroende av främst andra insekter än fjärilar/bin och humlor (t.ex. flugor eller skalbaggar) – (självinkompatibel)",
    "1a": "delvis beroende av exklusivt bin eller humlor (Hymenoptera) – kan också självpollinera eller pollineras abiotiskt",
    "1ab": "delvis beroende av exklusivt bin/humlor och fjärilar (Hymenoptera och Lepidoptera) – kan också självpollinera eller pollineras abiotiskt",
    "1b": "delvis beroende av exklusivt fjärilar (Lepidoptera) – kan också självpollinera eller pollineras abiotiskt",
    "2a": "helt beroende av exklusivt bin eller humlor (Hymenoptera) för pollinering (självinkompatibel)",
    "2ab": "delvis beroende av exklusivt bin/humlor och fjärilar (Hymenoptera och Lepidoptera) för pollinering (självinkompatibel)",
    "2b": "helt beroende av exklusivt fjärilar (Lepidoptera) för pollinering (självinkompatibel)",
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
    "2": "Tål sporadiskt men inte återkommande bete eller slåtter",
    "3": "Tål regelbunden bete/slåtter men föredrar oskötta miljöer",
    "4": "Trivs både i betade/slagna och oskötta miljöer",
    "5": "Gynnas av visst bete/slåtter men överlever även utan",
    "6": "Starkt gynnad av regelbundet bete/slåtter men klarar några år utan",
    "7": "Starkt beroende av störning och försvinner om den uteblir",
    "8": "Kräver återkommande eller kontinuerligt bete/slåtter"
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

function blomfargTillCSS(farg) {
  const färgmap = {
    "Vit": "#ffffff",
    "Gul": "#ffff00",
    "Grön": "#008000",
    "Rosa": "#e04a8b",
    "Röd": "#ff0000",
    "Lila": "#c36eeb",
    "Blå": "#6e8beb",
    "Brun": "#8b4513",
    "Orange": "#ffa500",
    "Svart": "#000000"
  };
  return färgmap[farg] || "#000000";
}
function getSeedDispersalLabel(code) {
  const map = {
    "Adh": "Vidhäftning – krokar eller klibbig yta, sprids via djurpäls/fjädrar",
    "AirD": "Luftburen (lätt) – mycket små och lätta frukter",
    "AirP": "Luftburen (plumös) – hårprydda frukter",
    "AirW": "Luftburen (vingad) – frukter med vingar",
    "Bird": "Fågelburen – fruktkött attraktivt för fåglar",
    "Expl": "Explosiv – aktivt uppsprickande frukter",
    "Myr": "Myrmekofil – frön med elaiosom, sprids av myror",
    "Passive": "Passiv – inga särskilda anpassningar",
    "Veg": "Vegetativ – utlöpare, jordstammar etc.",
    "Water": "Vattenburen – flytförmåga via svampigt fruktskal"
  };
  return map[code] || "<em>okänt</em>";
}

function getMycorrhizaLabel(value) {
  const map = {
    "None": "Ingen mykorrhiza",
    "AM": "Arbuskulär mykorrhiza",
    "EM": "Ektomykorrhiza",
    "AM/EM": "Arbuskulär och ektomykorrhiza",
    "ArbM": "Arbutoid mykorrhiza",
    "ErM": "Erikoid mykorrhiza",
    "MonM": "Monotropoid mykorrhiza",
    "OrkM": "Orkidémykorrhiza",
    "PyrM": "Pyrola-mykorrhiza"
  };
  return map[value?.trim()] || "<em>okänd</em>";
}

function getParasitismLabel(value) {
  const map = {
    "0": "Ej parasitisk",
    "1": "Halvparasit – har egen fotosyntes men tar vatten/näring från värd",
    "2": "Helparasit – helt beroende av värd även för kolhydrater"
  };
  return map[value?.toString()] || "<em>okänt</em>";
}

function formatPlantInfo(match, isEUListad = false) {
  if (match.nursery) return NurseryPlants.describe(match) + '<button onclick="addSearchSelection()">Lägg till i Växtval</button>';
  const dyntaxa = match["Dyntaxa ID number"];
  const escape = PlantDataView.escapeHtml;
  const riskklass = getRiskklassningFromXLSX(dyntaxa);
  const riskRow = riskData.find(r => r["TaxonId"]?.toString() === dyntaxa?.toString());
  const immigration = getImmigrationLabel(match["Time of immigration"]);
  const native = String(match["Time of immigration"] ?? "").trim() === "0";
  const scientific = match["Scientific name"];
  const swedish = match["Svenskt namn"];
  const [genus, species = ""] = scientific.split(" ");
  const associatedInsects = getAssociatedInsects(genus, species);
  const redlistHtml = PlantDataView.renderRedlist(redlistData, dyntaxa);
  const traitHtml = PlantDataView.renderTraits(nordicTraits, dyntaxa, advancedMode);
  const sourceNote = `<p class="source-note">Kompletterande uppgifter från <a href="https://doi.org/10.1016/j.ecolind.2020.106923" target="_blank" rel="noopener">Tyler et al. (2021)</a>.</p>`;
  const header = `
    ${globalThis.SpeciesArt?.render(match) || ""}
    <h3>${escape(swedish)} <span class="scientific-name">(${escape(scientific)})</span></h3>
    <p><strong>Familj:</strong> ${escape(match["Family"])}</p>
    ${renderPlantQuickFacts(match)}
    <div class="redlist-print">${redlistHtml}</div>
    ${native ? '<p class="native-status">Inhemsk art</p>' : `<p><strong>Invandringstid:</strong> ${immigration}</p>`}
    ${!native && riskklass ? `<div><strong>Riskklass:</strong>${InvasivePlantView.renderRiskStatus(riskklass)}</div>` : ""}
    ${isEUListad ? InvasivePlantView.renderEUStatus(euInvasiveData.find(row => row["Dyntaxa ID"] === String(dyntaxa)) || {}) : euListAvailable ? "" : "<p>EU-förteckningen kunde inte laddas.</p>"}
    ${InvasivePlantView.renderNationalStatus(nationalInvasiveData, dyntaxa)}
  `;
  const addButton = '<button onclick="addSearchSelection()">Lägg till i Växtval</button>';
  const artfakta = dyntaxa ? `<p><strong>Artfakta:</strong> <a href="https://artfakta.se/taxa/${encodeURIComponent(dyntaxa)}" target="_blank" rel="noopener">Visa Artfakta</a></p>` : "";

  if (!advancedMode) {
    return `<div class="simple-profile">${header}</div>${SimplePlantView.renderSummary(match, nordicTraits, {
      heat: getHeatRequirementLabel(match["Heat requirement"]),
      light: getLightLabel(match["Light"]),
      moisture: getMoistureLabel(match["Moisture"])
    })}<div class="simple-actions">${artfakta}${addButton}</div>`;
  }

  const insectHtml = associatedInsects.length ? `
    <h4>Associerade fjärilar (Lepidoptera), enligt <a href="https://doi.org/10.5519/havt50xw" target="_blank" rel="noopener">Robinson et al. (2023)</a>:</h4>
    <ul>${associatedInsects.map(insect => `<li><em>${escape(insect["Insect Genus"])} ${escape(insect["Insect Species"])}</em> (${escape(insect["Insect Family"])}) – ${escape(insect["Damage"] || "ingen specifik skada angiven")}</li>`).join("")}</ul>` : "";

  return `${header}
    ${riskRow?.["Ursprunglig utbredning"] ? `<p><strong>Ursprunglig utbredning:</strong> ${escape(riskRow["Ursprunglig utbredning"])}</p>` : ""}
    ${riskRow?.["Invasionspotential"] ? `<p><strong>Invasionspotential:</strong> ${escape(riskRow["Invasionspotential"])}</p>` : ""}
    ${riskRow?.["Ekologisk effekt"] ? `<p><strong>Ekologisk effekt:</strong> ${escape(riskRow["Ekologisk effekt"])}</p>` : ""}
    ${traitHtml}
    <h4>Miljöindikatorer</h4>${sourceNote}
    <p><strong>Biodiversitetsrelevans:</strong> ${getBiodiversityRelevanceLabel(match["Biodiversity relevance"])}</p>
    <p><strong>Värmekrav:</strong> ${getHeatRequirementLabel(match["Heat requirement"])}</p>
    <p><strong>Köldkrav:</strong> ${getColdRequirementLabel(match["Cold requirement"])}</p>
    <p><strong>Ljusbehov:</strong> ${getLightLabel(match["Light"])}</p>
    <p><strong>Fuktighetskrav:</strong> ${getMoistureLabel(match["Moisture"])}</p>
    <p><strong>Markreaktion (pH-index):</strong> ${escape(match["Soil reaction (pH)"]) || "<em>okänt</em>"}</p>
    <p><strong>Kvävepreferens:</strong> ${getNitrogenLabel(match["Nitrogen (N)"])}</p>
    <p><strong>Fosforpreferens:</strong> ${getPhosphorusLabel(match["Phosphorus (P)"])}</p>
    <p><strong>Salttålighet:</strong> ${getSalinityLabel(match["Salinity"])}</p>
    <p><strong>Bete/slåtter:</strong> ${getGrazingLabel(match["Grazing/mowing"])}</p>
    <p><strong>Markstörningsbehov:</strong> ${getSoilDisturbanceLabel(match["Soil disturbance"])}</p>
    ${artfakta}<hr>${insectHtml}${addButton}`;
}

function loadCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true, header: true, skipEmptyLines: true,
      complete: results => results.data.length ? resolve(results.data) : reject(new Error(`Tom datafil: ${url}`)),
      error: reject
    });
  });
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const dataset = await response.json();
  if (!dataset.source || !dataset.taxa || !Object.keys(dataset.taxa).length) throw new Error(`Ogiltig datafil: ${url}`);
  if (url.includes("nordictraits") && (!dataset.species || dataset.traits?.length !== 44)) throw new Error("Ogiltig NordicTraits-fil");
  if (url.includes("national-invasive") && (!dataset.source.regulation || !dataset.source.effectiveFrom || Object.values(dataset.taxa).some(row => !row.scientificName || !row.swedishName || !["land", "water"].includes(row.habitat)))) throw new Error("Ogiltig nationell invasivförteckning");
  return dataset;
}

async function initializeData() {
  input.disabled = true;
  inputScientific.disabled = true;
  resultDiv.textContent = "🔄 Artuppgifterna laddas…";
  const results = await Promise.allSettled([
    loadCsv("vaxtdata.csv"), loadCsv("Riskklassning2024_Uttag.csv"),
    loadCsv("eu_invasiva_vaxtarter.csv"), loadCsv("resource_relevant.csv"),
    loadJson("data/redlist-2025.json"), loadJson("data/nordictraits-v1.json"),
    loadJson("data/national-invasive-2026.json"), loadCsv("karaktarer.csv")
  ]);
  const values = results.map(result => result.status === "fulfilled" ? result.value : null);
  [plantData, riskData, euInvasiveData, insectData] = values.slice(0, 4).map(value => value || []);
  euListAvailable = Boolean(values[2]);
  [redlistData, nordicTraits, nationalInvasiveData] = values.slice(4);
  habitData = values[7] || [];
  results.filter(result => result.status === "rejected").forEach(result => console.error("Kunde inte ladda artuppgifter:", result.reason));
  if (!plantData.length) {
    resultDiv.textContent = "Artlistan kunde inte laddas. Försök ladda om sidan.";
    return;
  }
  if (globalThis.NurseryPlants) plantData.push(...NurseryPlants.build(plantData));
  allDataLoaded = true;
  globalThis.startPlanner?.(plantData, nordicTraits, nationalInvasiveData, values[2], values[1], redlistData, values[7]);
  input.disabled = false;
  inputScientific.disabled = false;
  setupAutocomplete();
  setupAutocompleteScientific();
  resultDiv.textContent = results.some(result => result.status === "rejected")
    ? "Vissa uppgifter kunde inte laddas. Du kan söka efter arter; ladda om sidan för att försöka igen."
    : "Välj en art för att visa dess uppgifter.";
}

initializeData();
