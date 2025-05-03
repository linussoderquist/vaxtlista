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

function searchPlant() {
  const inputVal = input.value.toLowerCase().trim();
  const resultDiv = document.getElementById("result");

  const match = plantData.find(p => p["Svenskt namn"]?.toLowerCase().trim() === inputVal);

  if (match) {
    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Upprättad status:</strong> ${match["Establishment"]}</p>
      <p><strong>Rödlistning:</strong> ${match["Red-listed"]}</p>
      <p><strong>Biologisk mångfald:</strong> ${match["Biodiversity relevance"]}</p>
      <p><strong>Nektarproduktion:</strong> ${drawScale(match["Nectar production"])}</p>
      <p><strong>Ljusbehov:</strong> ${drawScale(match["Light"])}</p>
      <p><strong>Fuktighetskrav:</strong> ${drawScale(match["Moisture"])}</p>
      <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/artfaktablad/${match["Dyntaxa ID number"]}" target="_blank">Visa artfakta</a></p>
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}
