// ... tidigare kod ... (Del 1 och Del 2 inkluderad ovan)

function drawArrowScale(value, min, max, labels = null, unit = "") {
  value = parseFloat(value);
  if (isNaN(value)) return "<em>okänt</em>";
  const percent = ((value - min) / (max - min)) * 100;
  const cappedPercent = Math.max(0, Math.min(100, percent));
  const labelLine = labels ? `<div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.2rem;">
    <span>${labels[0]}</span><span>${labels[1]}</span>
  </div>` : "";

  return `
    <div style="margin: 0.4rem 0;">
      <div style="position: relative; height: 6px; background: #ccc; border-radius: 3px;">
        <div style="position: absolute; left: ${cappedPercent}%; transform: translateX(-50%);">
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid #007700;"></div>
        </div>
      </div>
      ${labelLine}
      ${unit ? `<div style="font-size:0.8rem; color:gray;">Värde: ${value} ${unit}</div>` : ""}
    </div>
  `;
}

function formatPlantInfo(match, isEUListad = false) {
  const dyntaxa = match["Dyntaxa ID number"];
  const traits = plantTraits.find(t => t["Dyntaxa ID number"]?.toString() === dyntaxa);
  const riskklass = getRiskklassningFromXLSX(dyntaxa);
  const zon = heatRequirementToZone(match["Heat requirement"]);
  const immigration = getImmigrationLabel(match["Time of immigration"]);
  const redlist = match["Red-listed"] && match["Red-listed"].toLowerCase() !== "not red-listed";

  const genus = match["Scientific name"].split(" ")[0];
  const species = match["Scientific name"].split(" ")[1] || "";
  const scientific = match["Scientific name"];
  const swedish = match["Svenskt namn"];
  const associatedInsects = getAssociatedInsects(genus, species);

  const insectHtml = associatedInsects.length > 0 ? `
    <h4>Associerade insektsarter:</h4>
    <ul>
      ${associatedInsects.map(insect => `
        <li><em>${insect["Insect Genus"]} ${insect["Insect Species"]}</em> (${insect["Insect Family"]}) - ${insect["Damage"] || "ingen specifik skada angiven"}</li>
      `).join('')}
    </ul>
  ` : "";

  const addButton = `<button onclick="addToPlantList('${swedish}', '${scientific}')">➕ Lägg till i min växtlista</button>`;

  if (!advancedMode) {
    return `
      <h3>${swedish} (${scientific})</h3>
      <p><strong>Familj:</strong> ${match["Family"]}</p>
      ${redlist ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>` : ""}
      <p><strong>Invandringstid:</strong> ${immigration}</p>
      ${riskklass ? `<p><strong>Riskklass:</strong> ${getColoredRiskTag(riskklass)}</p>` : ""}
      ${isEUListad ? `<p><strong style="color:#b30000;">⚠️ EU-listad invasiv art</strong></p>` : ""}
      ${addButton}
    `;
  }

  const scale = (label1, label2) => [label1, label2];
  
  // ... tidigare kod ... (Del 1–3 inkluderad ovan)

  return `
    <h3>${swedish} (${scientific})</h3>
    <p><strong>Familj:</strong> ${match["Family"]}</p>
    ${redlist ? `<p><strong>Rödlistning:</strong> ${getRedlistBadge(match["Red-listed"])}</p>` : ""}
    <p><strong>Härdighet (zon):</strong> ${zon}</p>
    <p><strong>Invandringstid:</strong> ${immigration}</p>
    ${isEUListad ? `<p><strong style="color:#b30000;">⚠️ EU-listad invasiv art</strong></p>` : ""}
    ${riskklass ? `<p><strong>Riskklass:</strong> ${getColoredRiskTag(riskklass)}</p>` : ""}

    ${traits ? `<p><strong>Växtsätt:</strong> ${getGrowthFormIcon(traits["Växtsätt"])} ${traits["Växtsätt"]}</p>` : ""}
    ${traits ? `<p><strong>Medelhöjd:</strong> ${drawHeight(traits["Medelhöjd (cm)"])}</p>` : ""}

    <h4>Indikatorer</h4>
    <p><strong>Biodiversitetsrelevans:</strong></p>
    ${drawArrowScale(match["Biodiversity relevance"], 1, 8, scale("låg", "hög"))}
    <p><strong>Nektarproduktion:</strong></p>
    ${drawArrowScale(match["Nectar production"], 1, 7, scale("ingen", "mycket hög"))}
    <p><strong>Härdighetskrav (heat):</strong></p>
    ${drawArrowScale(match["Heat requirement"], 1, 14, scale("arktisk", "varm"))}
    <p><strong>Köldkrav (cold):</strong></p>
    ${drawArrowScale(match["Cold requirement"], 1, 20, scale("tropisk", "arktisk"))}
    <p><strong>Ljusbehov:</strong></p>
    ${drawArrowScale(match["Light"], 1, 7, scale("skugga", "full sol"))}
    <p><strong>Fuktighetskrav:</strong></p>
    ${drawArrowScale(match["Moisture"], 1, 12, scale("torr", "vatten"))}
    <p><strong>Jordens surhetsgrad (pH):</strong></p>
    ${drawArrowScale(match["Soil reaction (pH)"], 1, 8, scale("surt", "alkaliskt"))}
    <p><strong>Kvävebehov:</strong></p>
    ${drawArrowScale(match["Nitrogen (N)"], 1, 9, scale("näringsfattigt", "näringsrikt"))}
    <p><strong>Fosforbehov:</strong></p>
    ${drawArrowScale(match["Phosphorus (P)"], 1, 5, scale("lågt P", "högt P"))}
    <p><strong>Salttålighet:</strong></p>
    ${drawArrowScale(match["Salinity"], 1, 5, scale("ej salt", "mycket salt"))}
    <p><strong>Gynnad av betning/slåtter:</strong></p>
    ${drawArrowScale(match["Grazing/mowing"], 1, 8, scale("ogynnsamt", "gynnat"))}
    <p><strong>Störningsbehov:</strong></p>
    ${drawArrowScale(match["Soil disturbance"], 1, 9, scale("konkurrenskraftig", "kräver störning"))}
    <p><strong>Livslängd:</strong></p>
    ${drawArrowScale(match["Longevity"], 1, 4, scale("ettårig", "långlivad"))}
    <p><strong>Pollinatörsberoende:</strong></p>
    ${drawArrowScale(match["Pollinator dependence"], 0, 2, scale("oberoende", "beroende"))}
    <p><strong>Frödormans:</strong></p>
    ${drawArrowScale(match["Seed dormancy"], 1, 4, scale("ingen dormans", "djup dormans"))}
    <p><strong>Fröbank:</strong></p>
    ${drawArrowScale(match["Seed bank"], 1, 4, scale("kortlivad", "permanent"))}
    <p><strong>Kvävefixering:</strong></p>
    ${drawArrowScale(match["Nitrogen fixation"], 0, 1, scale("ingen", "fixerar N"))}

    <p><strong>Artfakta:</strong> <a href="https://www.artfakta.se/taxa/${dyntaxa}" target="_blank">Visa artfakta</a></p>
    <hr/>
    ${insectHtml}
    ${addButton}
  `;
}
  