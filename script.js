let plantData = [];

fetch("vaxtdata.csv")
  .then(res => res.text())
  .then(text => {
    const rows = text.trim().split("\n");
    const headers = rows[0].split(",");
    const nameIndex = headers.indexOf("Svenskt namn");

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(",");
      let plant = {};
      headers.forEach((h, j) => {
        plant[h.trim()] = values[j] ? values[j].trim() : "";
      });
      plantData.push(plant);
    }

    // Fyll datalist med svenska namn
    const nameSuggestions = document.getElementById("nameSuggestions");
    const uniqueNames = [...new Set(plantData.map(p => p["Svenskt namn"]))].sort();
    uniqueNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      nameSuggestions.appendChild(option);
    });
  });

function searchPlant() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const resultDiv = document.getElementById("result");
  const match = plantData.find(p => p["Svenskt namn"].toLowerCase() === input);

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
