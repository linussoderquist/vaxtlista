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

  const api = {nationalRecord, renderNationalStatus};
  root.InvasivePlantView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
