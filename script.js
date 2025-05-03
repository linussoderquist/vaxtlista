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

function searchPlant() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const resultDiv = document.getElementById("result");
  const match = plantData.find(p => p["Scientific name"].toLowerCase() === input);

  if (match) {
    resultDiv.innerHTML = `
      <h2>${match["Scientific name"]} (${match["Svenskt namn"]})</h2>
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
