let plantData = [];

Papa.parse("vaxtdata.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    plantData = results.data;
  }
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

function drawScale(value, max = 5) {
  value = parseInt(value);
  if (isNaN(value)) return "<em>okänt</em>";

  const pollinators = ["🐝", "🦋"];
  let output = "<div class='scale'>";
  for (let i = 0; i < max; i++) {
    output += `<span>${i < value ? pollinators[i % 2] : "⚪"}</span>`;
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
  if (h === 1) return "hög-alpin/arktisk zon";
  if (h === 2) return "mellanalpin zon";
  if (h === 3) return "låg-alpin zon";
  if (h === 4) return "trädgräns (övre subalpin zon)";
  if (h === 5) return "subalpin zon (zon 9, gynnsamma lägen)";
  if (h === 6) return "odlingszon 8";
  if (h === 7) return "odlingszon 7";
  if (h === 8) return "odlingszon 6";
  if (h === 9) return "odlingszon 5";
  if (h === 10) return "odlingszon 4";
  if (h === 11) return "odlingszon 3";
  if (h === 12) return "odlingszon 2";
  if (h === 13) return "odlingszon 1";
  if (h === 14) return "klarar ej reproduktion i Sverige";
  return "okänd";
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
    const scaledMoisture = scaleMoisture(match["Moisture"]);

    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Upprättad status:</strong> ${match["Establishment"]}</p>
      <p><strong>Rödlistning:</strong> ${match["Red-listed"]}</p>
      <p><strong>Härdighet:</strong> ${zon}</p>

      <p><strong>Värmekrav:</strong> ${drawScale(match["Heat requirement"])}</p>
      <p><strong>Salttolerans:</strong> ${drawScale(match["Salinity"])}</p>
      <p><strong>Biodiversitetsrelevans:</strong> ${drawScale(match["Biodiversity relevance"])}</p>

      <p><strong>Nektarproduktion:</strong> ${drawNectarScale(match["Nectar production"])}</p>
      <p><strong>Ljusbehov:</strong> ${drawScale(match["Light"])}</p>
      <p><strong>Fuktighetskrav:</strong> ${scaledMoisture ? drawScale(scaledMoisture) : "<em>okänt</em>"}</p>

      <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
      ${match["Establishment"] !== "Resident" ? `<p><strong>Risklista:</strong> <a href="https://artfakta.se/risklistor/2024/taxa/${dyntaxa}" target="_blank">Visa riskklassificering</a></p>` : ""}
      ${risk ? `<p><strong>Riskklassificering:</strong> <span class="risk-tag ${risk.class}">${risk.label}</span></p>` : ""}
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}
