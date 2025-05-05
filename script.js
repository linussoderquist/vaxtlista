// Fullständigt script.js med uppdaterad riskklassförklaring och ljusbehovsskala med månfaser

let plantData = [];
let riskData = [];
let euInvasiveData = [];
let plantTraits = [];
let allDataLoaded = false;

const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");
const resultDiv = document.getElementById("result");

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

function checkAllDataLoaded() {
  if (plantData.length && riskData.length && euInvasiveData.length && plantTraits.length) {
    allDataLoaded = true;
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

function isEUInvasive(dyntaxaId) {
  return euInvasiveData.some(row => row["Dyntaxa ID"]?.toString() === dyntaxaId?.toString());
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

function drawHeight(cm) {
  const value = parseInt(cm);
  if (isNaN(value)) return "<em>okänt</em>";
  return `${value} cm`;
}

function drawLightScale(value) {
  const phases = ["🌑", "🌘", "🌗", "🌖", "🌕", "🔆", "☀️"];
  const v = parseInt(value);
  if (isNaN(v) || v < 1 || v > 7) return "<em>okänt</em>";
  return `<span style="font-size: 1.5rem;">${phases[v - 1]}</span>`;
}

function getRiskCategory(establishment, index) {
  if (establishment !== "Non-resident") return null;
  index = parseInt(index);
  if (isNaN(index)) return { label: "okänd risk", class: "risk-okänd" };
  if (index >= 11) return { label: "hög risk", class: "risk-hög" };
  if (index >= 7) return { label: "måttlig risk", class: "risk-måttlig" };
  if (index >= 1) return { label: "låg risk", class: "risk-låg" };
  return { label: "minimal risk", class: "risk-låg" };
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

function getRedlistBadge(status) {
  if (!status || status.toUpperCase().includes("NOT RED-LISTED")) {
    return `<span class="redlist-badge rl-LC">LC</span>`;
  }
  const s = status.trim().toUpperCase();
  const code = s.match(/(EX|EW|RE|CR|EN|VU|NT|LC|DD|NE)/)?.[1] || "NE";
  return `<span class="redlist-badge rl-${code}">${code}</span>`;
}

function drawMoistureScale(value) {
  const v = parseInt(value);
  if (isNaN(v)) return "<em>okänt</em>";
  const scaled = v > 8 ? 5 : Math.ceil((v / 8) * 5);
  return drawScaleWithEmoji(scaled, "💧");
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

function formatPlantInfo(match, isEUListad = false) {
  const dyntaxa = match["Dyntaxa ID number"];
  const traits = plantTraits.find(t => t["Dyntaxa ID number"]?.toString() === dyntaxa);
  const riskklass = getRiskklassningFromXLSX(dyntaxa);
  const risk = getRiskCategory(match["Establishment"], match["Index of invasive concern"]);
  const zon = heatRequirementToZone(match["Heat requirement"]);
  const immigration = getImmigrationLabel(match["Time of immigration"]);
  const redlist = ["0", "1", "2", "3"].includes(match["Time of immigration"]?.toString());

  return `
    <h3>${match["Svenskt namn"]} (${match["Scientific name"]})</h3>
    <p><strong>Familj:</strong> ${match["Family"]}</p>
    ${redlist ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>` : ""}
    <p><strong>Härdighet:</strong> ${zon}</p>
    <p><strong>Invandringstid:</strong> ${immigration}</p>
    ${isEUListad ? `<p><strong style=\"color:#b30000;\">⚠️ EU-listad invasiv art</strong></p>` : ""}
    ${traits ? `<p><strong>Växtsätt:</strong> ${getGrowthFormIcon(traits["Växtsätt"])} ${traits["Växtsätt"]}</p>` : ""}
    ${traits ? `<p><strong>Medelhöjd:</strong> ${drawHeight(traits["Medelhöjd (cm)"])}</p>` : ""}
    <p><strong>Biodiversitetsrelevans:</strong> ${drawBiodiversityScale(match["Biodiversity relevance"])}</p>
    <p><strong>Nektarproduktion:</strong> ${drawNectarScale(match["Nectar production"])}</p>
    <p><strong>Ljusbehov:</strong> ${drawLightScale(match["Light"])}</p>
    <p><strong>Fuktighetskrav:</strong> ${drawMoistureScale(match["Moisture"])}</p>
    <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
    ${riskklass ? `<p><strong>Riskklass (2024):</strong> ${getColoredRiskTag(riskklass)}</p>` : ""}
    <hr/>
  `;
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
}
