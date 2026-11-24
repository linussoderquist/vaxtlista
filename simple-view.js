/* The simplified overview uses the original ordinal classes, never invented scores. */
(function (root) {
  "use strict";
  const dataView = typeof module !== "undefined" && module.exports ? require("./data-view.js") : root.PlantDataView;
  const escape = dataView.escapeHtml;
  const paths = {
    biodiversity: '<path d="M12 21v-9M12 15C5 15 3 10 4 5c6 0 9 3 8 10ZM12 12c0-5 3-8 8-8 1 5-2 9-8 9"/>',
    nectar: '<circle cx="12" cy="12" r="3"/><path d="M12 9C6 5 10 1 12 5c2-4 6 0 0 4ZM15 12c4-6 8-2 4 0 4 2 0 6-4 0ZM12 15c6 4 2 8 0 4-2 4-6 0 0-4ZM9 12c-4 6-8 2-4 0-4-2 0-6 4 0Z"/>',
    longevity: '<path d="M12 3 5 12h4l-5 6h7v4h2v-4h7l-5-6h4L12 3Z"/>',
    pollination: '<ellipse cx="12" cy="14" rx="5" ry="6"/><path d="M8 11h8M7 15h10M10 8C3 0 1 10 8 11M14 8c7-8 9 2 2 3M10 5 8 3m6 2 2-2"/>',
    heat: '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v9"/><circle cx="12" cy="18" r="1"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moisture: '<path d="M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>'
  };

  function ordinal(raw, min, max) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return null;
    const number = Number(raw);
    return Number.isInteger(number) && number >= min && number <= max ? number : null;
  }

  function pollinationLevel(raw) {
    const code = String(raw ?? "").trim();
    return /^(?:0[abcd]|[12](?:a|ab|b)?)$/.test(code) ? Number(code[0]) : null;
  }

  function renderMeter({key, title, value, min = 1, max, headline, detailHtml, low, high, source, imputed = false, missing = "Uppgift saknas"}) {
    const known = value !== null;
    const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]}</svg>`;
    const position = known ? (value - min) / (max - min) * 100 : null;
    const ticks = Array.from({length: max - min + 1}, (_, i) => `<span class="metric-tick" style="left:${i / (max - min) * 100}%"></span>`).join("");
    const meter = known
      ? `<div class="metric-meter" role="meter" aria-label="${escape(title)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${escape(headline)}">
          <div class="metric-track" aria-hidden="true">${ticks}<span class="metric-pointer" style="left:${position}%"></span></div>
          <div class="metric-endpoints" aria-hidden="true"><span>${escape(low)}</span><span>${escape(high)}</span></div>
        </div>`
      : '<div class="metric-meter metric-meter-missing" aria-hidden="true"><div class="metric-track"></div></div>';
    return `<article class="metric-card metric-${key}${known ? "" : " metric-unknown"}" data-metric="${key}">
      <div class="metric-heading"><span class="metric-icon">${icon}</span><h5>${escape(title)}</h5>${imputed && known ? '<span class="imputed" title="Saknat värde skattat med NordicTraits modell">Imputerat</span>' : ""}</div>
      <p class="metric-value">${escape(known ? headline : missing)}</p>
      ${meter}
      <p class="metric-description">${known ? detailHtml : "Det finns inget känt värde att placera på skalan."}</p>
      <div class="metric-footer"><span>${escape(source)}</span><span>${known ? `Klass ${value} av ${max}${min === 0 ? " (0–2)" : ""}` : "Ingen klassning"}</span></div>
    </article>`;
  }

  function renderSummary(plant, dataset, descriptions = {}) {
    const record = dataView.getSpecies(dataset, plant["Dyntaxa ID number"]);
    const values = record?.values || {};
    const imputed = new Set(record?.imputed || []);
    const missing = dataset ? "Uppgift saknas" : "Kunde inte laddas";
    const definition = key => dataset?.traits.find(d => d.key === key);
    const traitDetail = key => definition(key) ? dataView.formatValue(definition(key), values[key]) : "";
    const biodiversity = ordinal(plant["Biodiversity relevance"], 1, 8);
    const nectar = ordinal(values.nectar_production, 1, 7);
    const longevity = ordinal(values.longevity, 1, 4);
    const pollination = pollinationLevel(values.pollinator_type);
    const heat = ordinal(plant["Heat requirement"], 1, 14);
    const light = ordinal(plant.Light, 1, 7);
    const moisture = ordinal(plant.Moisture, 1, 12);
    const biodiversityValues = ["", "Färre än 6 arter", "6–12 arter", "13–24 arter", "25–50 arter", "51–100 arter", "101–200 arter", "201–400 arter", "Fler än 400 arter"];
    const heatValues = ["", "Högalpint / arktiskt", "Mellanalpint", "Lågalpint", "Trädgränsen", "Subalpint", "Odlingszon 8", "Odlingszon 7", "Odlingszon 6", "Odlingszon 5", "Odlingszon 4", "Odlingszon 3", "Odlingszon 2", "Odlingszon 1", "Högre värmekrav"];
    const cards = [
      {key: "biodiversity", title: "Biodiversitetsrelevans", value: biodiversity, max: 8, headline: biodiversityValues[biodiversity], detailHtml: "Antal associerade arter enligt källans klassning.", low: "Färre än 6 arter", high: "Fler än 400 arter", source: "Tyler et al."},
      {key: "nectar", title: "Nektarproduktion", value: nectar, max: 7, headline: ["", "Ingen", "Obetydlig", "Liten", "Måttlig", "Ganska stor", "Stor", "Mycket stor"][nectar], detailHtml: traitDetail("nectar_production"), low: "Ingen", high: "Mycket stor", source: "NordicTraits", imputed: imputed.has("nectar_production"), missing},
      {key: "longevity", title: "Livslängd", value: longevity, max: 4, headline: ["", "Ettårig", "Dör efter blomning", "Kortlivad perenn", "Långlivad perenn"][longevity], detailHtml: values.longevity === 0 ? "Källans klass 0 saknar förklaring." : traitDetail("longevity"), low: "Ettårig", high: "Långlivad perenn", source: "NordicTraits", imputed: imputed.has("longevity"), missing: values.longevity === 0 ? "Odefinierad klass (0)" : missing},
      {key: "pollination", title: "Pollination", value: pollination, min: 0, max: 2, headline: ["Oberoende", "Delvis beroende", "Helt beroende"][pollination], detailHtml: traitDetail("pollinator_type"), low: "Oberoende", high: "Helt beroende", source: "NordicTraits", imputed: imputed.has("pollinator_type"), missing},
      {key: "heat", title: "Värmekrav", value: heat, max: 14, headline: heatValues[heat], detailHtml: descriptions.heat || escape(heatValues[heat]), low: "Lågt värmekrav", high: "Högt värmekrav", source: "Tyler et al."},
      {key: "light", title: "Ljusbehov", value: light, max: 7, headline: ["", "Djup skugga", "Skugga", "Halvskugga–skugga", "Halvskugga", "Sol–halvskugga", "Sol", "Full sol"][light], detailHtml: descriptions.light || "Ljusförhållanden som arten föredrar.", low: "Djup skugga", high: "Full sol", source: "Tyler et al."},
      {key: "moisture", title: "Fuktighetskrav", value: moisture, max: 12, headline: ["", "Mycket torrt", "Torrt", "Torrt–friskt", "Friskt", "Friskt–fuktigt", "Fuktigt", "Fuktigt–blött", "Blött", "Blött / översvämmat", "Tillfälligt översvämmat", "Grunt vatten", "Djupt vatten"][moisture], detailHtml: descriptions.moisture || "Markfuktighet eller vattenmiljö som arten föredrar.", low: "Mycket torrt", high: "Djupt vatten", source: "Tyler et al."}
    ];
    return `<section class="simple-dashboard" aria-label="Förenklad översikt över växtens egenskaper">
      <div class="simple-section-heading"><h4>Egenskaper i korthet</h4><span>7 egenskaper</span></div>
      <div class="simple-metrics">${cards.map(renderMeter).join("")}</div>
      <p class="simple-source-note">Skalorna visar indikator- och egenskapsklasser, inte betyg. Pollination visar beroendet av djurpollinatörer.
      Källor: <a href="https://github.com/poniitty/NordicTraits" target="_blank" rel="noopener">NordicTraits V1</a> och <a href="https://doi.org/10.1016/j.ecolind.2020.106923" target="_blank" rel="noopener">Tyler et al. (2021)</a>. Imputerat = skattat med en modell.</p>
    </section>`;
  }

  const api = {ordinal, pollinationLevel, renderMeter, renderSummary};
  root.SimplePlantView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
