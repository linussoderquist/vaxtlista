let plantData = [];
let riskData = [];

// Ladda CSV-data (vaxtdata.csv)
Papa.parse("vaxtdata.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    plantData = results.data;
  }
});

// Ladda riskklassning från Excel
fetch("Riskklassning2024_Uttag.xlsx")
  .then(res => res.arrayBuffer())
  .then(data => {
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    riskData = XLSX.utils.sheet_to_json(sheet);
  });

const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");

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

document.addEventListener("click", (e) => {
  if (!suggestions.contains(e.target) && e.target !== input) {
    suggestions.innerHTML = "";
  }
});

// Funktion för att hämta riskklassning från Excel-filen
function getRiskklassningFromXLSX(dyntaxaId) {
  const row = riskData.find(r => r["TaxonId"]?.toString() === dyntaxaId?.toString());
  if (!row) return null;
  return row["Riskkategori, utfall enligt GEIAA metodik"] || null;
}

function drawScaleWithEmoji(value, emoji, color = null, max = 5) {
  value = parseInt(value);
  if (isNaN(value)) return "<em>okänt</em>";
  let output = "<div class='scale'>";
  for (let i = 0; i < max; i++) {
    const style = color ? `style="color:${color}"` : "";
    output += `<span ${style}>${i < value ? emoji : "⚪"}</span>`;
  }
  output += "</div>";
  return output;
}

function drawMoistureScale(value) {
  const scaled = scaleMoisture(value);
  return scaled ? drawScaleWithEmoji(scaled, "💧") : "<em>okänt</em>";
}

function drawLightScale(value) {
  return drawScaleWithEmoji(value, "☀️");
}

function drawBiodiversityScale(value) {
  value = parseInt(value);
  if (isNaN(value)) return "<em>okänt</em>";
  const pool = ["🐸", "🌼", "🍄", "🦔", "🪲", "🐌", "🦉", "🐛"];
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

function scaleMoisture(originalValue) {
  let v = parseInt(originalValue);
  if (isNaN(v)) return null;
  if (v > 8) v = 8;
  return Math.ceil((v / 8) * 5);
}

function getRiskCategory(establishment, index) {
  if (establishment !== "Non-resident") return null;
  index = parseInt(index);
  if (isNaN(index)) return { label: "okänd risk", class: "risk-okänd" };
  if (index >= 11) return { label: "hög risk", class: "risk-hög" };
  if (index >= 7) return { label: "måttlig risk", class: "risk-måttlig" };
  if (index >= 1) return { label: "låg risk", class: "risk-låg" };
  return { label: "minimal eller ingen risk", class: "risk-låg" };
}

function heatRequirementToZone(heat) {
  const h = parseInt(heat);
  if (isNaN(h)) return "okänd";
  const zones = [
    "hög-alpin/arktisk zon", "mellanalpin zon", "låg-alpin zon",
    "trädgräns (övre subalpin zon)", "subalpin zon (zon 9, gynnsamma lägen)",
    "odlingszon 8", "odlingszon 7", "odlingszon 6", "odlingszon 5",
    "odlingszon 4", "odlingszon 3", "odlingszon 2", "odlingszon 1",
    "klarar ej reproduktion i Sverige"
  ];
  return zones[h - 1] || "okänd";
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
    "0": "inhemsk art",
    "1": "införd före 1700 (arkeofyt)",
    "2": "införd 1700–1750",
    "3": "införd 1750–1800",
    "4": "införd 1800–1850",
    "5": "införd 1850–1900",
    "6": "införd 1900–1950",
    "7": "införd 1950–2000",
    "8": "införd efter 2000"
  };
  const key = value?.trim();
  return scale[key] || "<em>okänd invandringstid</em>";
}

function searchPlant() {
  const inputVal = input.value.toLowerCase().trim();
  const resultDiv = document.getElementById("result");

  const match = plantData.find(p =>
    p["Svenskt namn"]?.toLowerCase().trim() === inputVal
  );

  if (match) {
    const risk = getRiskCategory(match["Establishment"], match["Index of invasive concern"]);
    const zon = heatRequirementToZone(match["Heat requirement"]);
    const dyntaxa = match["Dyntaxa ID number"];
    const riskklassXLSX = getRiskklassningFromXLSX(dyntaxa);

    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>
      <p><strong>Härdighet:</strong> ${zon}</p>
      <p><strong>Invandringstid eller vistelsetid:</strong> ${getImmigrationLabel(match["Time of immigration"])}</p>

      <p><strong>Värmekrav:</strong> ${drawScaleWithEmoji(match["Heat requirement"], "🔥", "#fa9f43")}</p>
      <p><strong>Salttolerans:</strong> ${drawScaleWithEmoji(match["Salinity"], "🧂", "#eb6cb4")}</p>
      <p><strong>Biodiversitetsrelevans:</strong> ${drawBiodiversityScale(match["Biodiversity relevance"])}</p>

      <p><strong>Nektarproduktion:</strong> ${drawNectarScale(match["Nectar production"])}</p>
      <p><strong>Ljusbehov:</strong> ${drawLightScale(match["Light"])}</p>
      <p><strong>Fuktighetskrav:</strong> ${drawMoistureScale(match["Moisture"])}</p>

      <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
      ${match["Establishment"] !== "Resident" ? `<p><strong>Risklista:</strong> <a href="https://artfakta.se/risklistor/2024/taxa/${dyntaxa}" target="_blank">Visa riskklassificering</a></p>` : ""}
      ${riskklassXLSX ? `<p><strong>Riskklass (2024):</strong> ${riskklassXLSX}</p>` : ""}
      ${risk ? `<p><strong>Riskklassificering (indikator):</strong> <span class="risk-tag ${risk.class}">${risk.label}</span></p>` : ""}

      <hr>
      <h3>Förklaringar till skalor</h3>
      <ul>
        <li><strong>🔥 Värmekrav:</strong> Högre värde = kräver varmare klimat</li>
        <li><strong>🧂 Salttolerans:</strong> Högre värde = tål salta miljöer</li>
        <li><strong>💧 Fuktighetskrav:</strong> Högre värde = föredrar fuktigare miljö</li>
        <li><strong>☀️ Ljusbehov:</strong> Högre värde = kräver mer ljus</li>
        <li><strong>🐝🦋 Nektarproduktion:</strong> Högre värde = producerar mer nektar (1 = ingen)</li>
        <li><strong>🐸🌼🍄🦔🪲...</strong> Biodiversitetsrelevans: Högre värde = viktigare för biologisk mångfald</li>
      </ul>
      <p><strong>Källa:</strong> Tyler, T., Herbertsson, L., Olofsson, J., & Olsson, P. A. (2021). <em>Ecological indicator and traits values for Swedish vascular plants.</em> <strong>Ecological Indicators, 120</strong>, 106923. <a href="https://doi.org/10.1016/j.ecolind.2020.106923" target="_blank">https://doi.org/10.1016/j.ecolind.2020.106923</a></p>
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}