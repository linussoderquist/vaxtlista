/* Transparent planning weights, version 1. These are editorial choices. */
(function(root) {
  "use strict";
  const riskWeights = {NK:0, LO:2, PH:5, HI:10, SE:15};
  function ordinal(value, max) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= max ? n - 1 : null;
  }
  function calculate(entries) {
    const unique = new Map();
    for (const entry of entries) if (!unique.has(entry.key)) unique.set(entry.key, entry);
    const items = [...unique.values()].map(entry => {
      const associated = ordinal(entry.associated, 8);
      const nectar = ordinal(entry.nectar, 7);
      const risk = riskWeights[entry.risk] ?? 0;
      // Apply the strongest concern once, so a legal listing isn't double counted.
      const penalty = Math.max(risk, entry.national ? 20 : 0, entry.eu ? 30 : 0);
      return {...entry, associated, nectar, penalty, total:(associated ?? 0) + (nectar ?? 0) - penalty};
    });
    const sum = field => items.reduce((total, item) => total + (item[field] ?? 0), 0);
    return {items, associated:sum("associated"), nectar:sum("nectar"), penalty:sum("penalty"), total:sum("total"),
      missing:items.filter(item => item.associated === null || item.nectar === null).length,
      listed:items.filter(item => item.eu || item.national).length,
      imputed:items.filter(item => item.nectar !== null && item.imputed).length};
  }
  root.PlantListScore = {calculate, riskWeights};
  if (typeof module !== "undefined") module.exports = root.PlantListScore;
})(globalThis);
