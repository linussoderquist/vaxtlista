let plantData = [];
let riskData = [];
let euInvasiveData = [];

// Ladda växtdata (CSV)
Papa.parse("vaxtdata.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    plantData = results.data;
  }
});

// Ladda riskklassning (CSV)
Papa.parse("Riskklassning2024_Uttag.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    riskData = results.data;
  }
});

// Ladda EU:s invasiva växter (CSV)
Papa.parse("eu_invasiva_vaxtarter.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    euInvasiveData = results.data;
  }
});

// Kolla om art finns på EU:s lista
function isEUInvasive(dyntaxaId) {
  return euInvasiveData.some(row => row["Dyntaxa ID"]?.toString() === dyntaxaId?.toString());
}

// Hämta GEIAA-riskklass från riskfilen
function getRiskklassningFromXLSX(dyntaxaId) {
  const row = riskData.find(r => r["TaxonId"]?.toString() === dyntaxaId?.toString());
  if (!row) return null;
  return row["Riskkategori, utfall enligt GEIAA metodik"] || null;
}

// Färglägg GEIAA-riskklass
function getColoredRiskTag(code) {
  const tagColors = {
    "HI": "background-color:#d1001c; color:white;",
    "PH": "background-color:#e87722; color:white;",
    "LO": "background-color:#fecd1a; color:black;",
    "MI": "background-color:#007c82; color:white;",
    "NR": "background-color:#999; color:white;",
    "DD": "background-color:#ccc; color:black;"
  };
  const style = tagColors[code] || "background-color:#eee; color:#000;";
  return `<span style="padding:3px 8px; border-radius:12px; font-weight:bold; ${style}">${code}</span>`;
}

// Skalor
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

function scaleMoisture(v) {
  v = parseInt(v);
  if (isNaN(v)) return null;
  if (v > 8) v = 8;
  return Math.ceil((v / 8) * 5);
}

// Andra hjälpmetoder
function getRiskCategory(establishment, index) {
  if (establishment !== "Non-resident") return null;
  index = parseInt(index);
  if (isNaN(index)) return { label: "okänd risk", class: "risk-okänd" };
  if (index >= 11) return { label: "hög risk", class: "risk-hög" };
  if (index >= 7) return { label: "måttlig risk", class: "risk-måttlig" };
  if (index >= 1) return { label: "låg risk", class: "risk-låg" };
  return { label: "minimal eller ingen risk", class: "risk-låg" };
}

function heatRequirementToZone(h) {
  h = parseInt(h);
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

// Sök och visa
function searchPlant() {
  const inputVal = document.getElementById("searchInput").value.toLowerCase().trim();
  const resultDiv = document.getElementById("result");

  const match = plantData.find(p =>
    p["Svenskt namn"]?.toLowerCase().trim() === inputVal
  );

  if (match) {
    const dyntaxa = match["Dyntaxa ID number"];
    const riskklassXLSX = getRiskklassningFromXLSX(dyntaxa);
    const risk = getRiskCategory(match["Establishment"], match["Index of invasive concern"]);
    const zon = heatRequirementToZone(match["Heat requirement"]);
    const isEUListed = isEUInvasive(dyntaxa);

    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      ${
        ["0", "1", "2", "3"].includes(match["Time of immigration"]?.trim())
          ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>`
          : ""
      }
      <p><strong>Härdighet:</strong> ${zon}</p>
      <p><strong>Invandringstid eller vistelsetid:</strong> ${getImmigrationLabel(match["Time of immigration"])}</p>

      ${isEUListed ? `<p><strong style="color:#b30000;">⚠️ EU-listad invasiv art:</strong> Upptagen på EU:s förteckning över invasiva främmande arter.</p>` : ""}

      <p><strong>Värmekrav:</strong> ${drawScaleWithEmoji(match["Heat requirement"], "🔥", "#fa9f43")}</p>
      <p><strong>Salttolerans:</strong> ${drawScaleWithEmoji(match["Salinity"], "🧂", "#eb6cb4")}</p>
      <p><strong>Biodiversitetsrelevans:</strong> ${drawBiodiversityScale(match["Biodiversity relevance"])}</p>

      <p><strong>Nektarproduktion:</strong> ${drawNectarScale(match["Nectar production"])}</p>
      <p><strong>Ljusbehov:</strong> ${drawLightScale(match["Light"])}</p>
      <p><strong>Fuktighetskrav:</strong> ${drawMoistureScale(match["Moisture"])}</p>

      <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
      ${match["Establishment"] !== "Resident" ? `<p><strong>Risklista:</strong> <a href="https://artfakta.se/risklistor/2024/taxa/${dyntaxa}" target="_blank">Visa riskklassificering</a></p>` : ""}
      ${riskklassXLSX ? `<p><strong>Riskklass (2024):</strong> ${getColoredRiskTag(riskklassXLSX)}</p>` : ""}
      ${risk ? `<p><strong>Riskklassificering (indikator):</strong> <span class="risk-tag ${risk.class}">${risk.label}</span></p>` : ""}
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}
