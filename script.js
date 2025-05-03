let plantData = [];

fetch("vaxtdata.csv")
  .then(res => res.text())
  .then(text => {
    const rows = text.split("\n");
    const headers = rows[0].split(",");
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(",");
      let plant = {};
      headers.forEach((h, j) => {
        plant[h.trim()] = values[j];
      });
      plantData.push(plant);
    }
  });

function searchPlant() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const resultDiv = document.getElementById("result");
  const match = plantData.find(p => p["Scientific name"]?.toLowerCase() === input);

  if (match) {
    resultDiv.innerHTML = `
      <h2>${match["Scientific name"]} (${match["Svenskt namn"]})</h2>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      <p><strong>Dyntaxa ID:</strong> ${match["Dyntaxa ID number"]}</p>
      <p><strong>Upprättad status:</strong> ${match["Establishment"]}</p>
      <p><strong>Rödlistning:</strong> ${match["Red-listed"]}</p>
      <p><strong>Biologisk mångfald:</strong> ${match["Biodiversity relevance"]}</p>
    `;
  } else {
    resultDiv.innerHTML = "Växten hittades inte.";
  }
}
