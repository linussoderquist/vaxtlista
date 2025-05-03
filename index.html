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
  let dots = "";
  for (let i = 1; i <= max; i++) {
    dots += `<div class="dot ${i <= value ? "filled" : ""}"></div>`;
  }
  return `<div class="scale">${dots}</div>`;
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

function searchPlant() {
  const inputVal = input.value.toLowerCase().trim();
  const selectedZone = document.getElementById("zoneFilter").value;
  const resultDiv = document.getElementById("result");

  const match = plantData.find(p => {
    const nameMatch = p["Svenskt namn"]?.toLowerCase().trim() === inputVal;
    const coldRequirement = parseInt(p["Cold requirement"]);
    const zoneOk = !selectedZone || (coldRequirement && coldRequirement <= parseInt(selectedZone));
    return nameMatch && zoneOk;
  });

  if (match) {
    const risk = getRiskCategory(match["Establishment"], match["Index of invasive concern"]);

    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Upprättad status:</strong> ${match["Establishment"]}</p>
      <p><strong>Rödlistning:</strong> ${match["Red-listed"]}</p>
      <p><strong>Köldkrav (zon):</strong> ${match["Cold requirement"]}</p>

      <p><strong>Värmekrav:</strong> ${drawScale(match["Heat requirement"])}</p>
      <p><strong>Salttolerans:</strong> ${drawScale(match["Salinity"])}</p>
      <p><strong>Biodiversitetsrelevans:</strong> ${drawScale(match["Biodiversity relevance"])}</p>

      <p><strong>Nektarproduktion:</strong> ${drawScale(match["Nectar production"])}</p>
      <p><strong>Ljusbehov:</strong> ${drawScale(match["Light"])}</p>
      <p><strong>Fuktighetskrav:</strong> ${drawScale(match["Moisture"])}</p>

      <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${match["Dyntaxa ID number"]}" target="_blank">Visa artfakta</a></p>
      ${risk ? `<p><strong>Riskklassificering:</strong> <span class="risk-tag ${risk.class}">${risk.label}</span></p>` : ""}
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte eller klarar inte vald zon.";
  }
}
