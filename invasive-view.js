/* National legal listing is independent of EU listing and ecological risk class. */
(function (root) {
  "use strict";
  const view = typeof module !== "undefined" && module.exports ? require("./data-view.js") : root.PlantDataView;
  const escape = view.escapeHtml;

  function nationalRecord(dataset, dyntaxa) {
    return dataset?.taxa[String(dyntaxa ?? "").trim()] || null;
  }

  function renderNationalStatus(dataset, dyntaxa) {
    if (!dataset) return '<p class="source-note" role="status">Nationell invasivstatus kunde inte laddas.</p>';
    const record = nationalRecord(dataset, dyntaxa);
    if (!record) return "";
    const regional = record.exception === "regional";
    const title = regional ? "Nationellt listad invasiv art – regionala regler" : "Nationellt listad invasiv art";
    const scope = regional
      ? '<p class="invasive-exception"><strong>Spärroxbär:</strong> Införselförbudet gäller inte denna art. Förbuden i 3 kap. 1 § 2–8 gäller för spärroxbär endast i Gotlands och Kalmar län (3 kap. 6 §).</p>'
      : '<p>Reglerna innebär bland annat förbud mot avsiktlig odling, plantering, försäljning och spridning. Det finns undantag.</p>';
    const exceptions = {
      vegetation_roof: '<p class="invasive-exception"><strong>Undantag för tak:</strong> Förbuden gäller inte exemplar som används eller ska användas på sedum- eller vegetationstak uppförda före listningen eller inom tre år efter den (3 kap. 7 §).</p>',
      sterile_hybrids: '<p class="invasive-exception"><strong>Undantag:</strong> Frösterila hybrider med vresros omfattas inte av förbuden (3 kap. 7 §).</p>'
    };
    const privateOwners = record.habitat === "water"
      ? 'För privata fastighetsägare och nyttjanderättshavare finns undantag för befintliga förekomster. Skyldigheten att hindra spridning från fastigheten gäller här vattenväxter i slutna vattensamlingar.'
      : 'Privata fastighetsägare och nyttjanderättshavare får låta befintliga förekomster växa och föröka sig, men ska hindra spridning från fastigheten. Detta undantag för befintliga förekomster tillåter inte odling eller plantering.';
    return `<aside class="invasive-notice invasive-national" aria-label="Svensk reglering av invasiv art">
      <p class="invasive-title"><span aria-hidden="true">⚠</span> <strong>${title}</strong></p>
      <p class="invasive-reference">Förordning (${escape(dataset.source.regulation)}), gäller sedan 15 maj 2026.</p>
      ${regional ? scope : ""}
      ${exceptions[record.exception] || ""}
      <details class="invasive-details"><summary>Regler och undantag</summary>
        ${regional ? "" : scope}
        <p>${privateOwners} Undantaget för befintliga förekomster i 3 kap. 5 § avser andra än statliga myndigheter, kommuner och regioner.</p>
        <p><a href="${escape(dataset.source.url)}" target="_blank" rel="noopener">Läs förordningen</a> · <a href="${escape(dataset.source.guidanceUrl)}" target="_blank" rel="noopener">Naturvårdsverkets vägledning</a></p>
        <p class="source-note">Förteckning och undantag kontrollerade ${escape(dataset.source.checkedOn)}.</p>
      </details>
    </aside>`;
  }

  function renderEUStatus(record, today = new Date().toLocaleDateString("sv-SE", {timeZone:"Europe/Stockholm"})) {
    if (!record) return "";
    const date = record["Gäller från"];
    const future = date && date > today;
    const formatted = date ? new Date(date + "T12:00:00Z").toLocaleDateString("sv-SE", {day:"numeric", month:"long", year:"numeric", timeZone:"UTC"}) : "";
    return `<aside class="invasive-notice invasive-eu" aria-label="EU-regler för invasiv art">
      <p class="invasive-title"><strong>EU-listad invasiv art${future ? " – kommande förbud" : ""}</strong></p>
      <p>${future ? "EU-förbuden börjar gälla" : "Välj en annan art för nyplantering. EU-förbuden gäller"}${formatted ? " från " + escape(formatted) : ""}.</p>
      <details class="invasive-details"><summary>EU-regler och undantag</summary>
      <p>Artikel 7 i förordning (EU) nr 1143/2014 förbjuder bland annat att avsiktligt odla, hålla, sälja, byta eller släppa ut arten i miljön. Även frön och växtdelar som kan ge upphov till nya exemplar omfattas.</p>
      <p>Transport är också begränsad. Artikel 7 medger transport till anläggningar i samband med utrotning. För forskning eller bevarande utanför den naturliga miljön finns särskilda tillstånd enligt artikel 8.</p>
      <p><a href="https://eur-lex.europa.eu/legal-content/SV/TXT/?uri=CELEX:32014R1143">EU-förordningen</a> · <a href="https://eur-lex.europa.eu/legal-content/SV/TXT/?uri=CELEX:02016R1141-20250807">Unionsförteckningen</a> · <a href="https://www.naturvardsverket.se/amnesomraden/invasiva-frammande-arter/forbjudna-invasiva-frammande-arter/">Naturvårdsverkets vägledning</a></p>
      <p class="source-note">Kontrollerat 25 november 2026.</p></details></aside>`;
  }
  const api = {nationalRecord, renderNationalStatus, renderEUStatus};
  root.InvasivePlantView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
