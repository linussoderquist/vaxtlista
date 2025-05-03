let plantData = [];

fetch("vaxtdata.csv")
  .then(res => res.text())
  .then(text => {
    const rows = text.trim().split("\n");
    const headers = rows[0].split(",");
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(",");
      let plant = {};
      headers.forEach((h, j) => {
        plant[h.trim()] = values[j] ? values[j].trim() : "";
      });
      plantData.push(plant);
    }
  });

const input = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");

input.addEventListener("input", () => {
  const val = input.value.toLowerCase();
  suggestions.innerHTML = "";
  if (val.length < 2) return;

  const matches = plantData
    .filter(p => p["Svenskt namn"].toLowerCase().includes(val))
    .map(p => p["Svenskt namn"]);

  const uniqueMatches = [...new Set(matches)].slice(0, 10); // max 10 förslag

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

function searchPlant() {
  const inputVal = input.value.toLowerCase();
  const resultDiv = document.getElementById("result");
  const match = plantData.find(p => p["Svenskt namn"].toLowerCase() === inputVal);

  if (match) {
    resultDiv.innerHTML = `
      <h2>${match["Svenskt namn"]} (${match["Scientific name"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Dyntaxa ID:</strong> ${match["Dyntaxa ID number"]}</p>
      <p><strong>Upprättad status:</strong> ${match["Establishment"]}</p>
      <p><strong>Rödlistning:</strong> ${match["Red-listed"]}</p>
      <p><strong>Biologisk mångfald:</strong> ${match["Biodiversity relevance"]}</p>
      <p><strong>Nektarproduktion:</strong> ${match["Nectar production"]}</p>
      <p><strong>Ljusbehov:</strong> ${match["Light"]}</p>
      <p><strong>Fuktighetskrav:</strong> ${match["Moisture"]}</p>
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}
