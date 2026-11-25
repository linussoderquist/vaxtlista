/* Transparent planning weights, version 2. These are editorial choices. */
(function(root) {
  "use strict";
  const riskWeights = {NK:0, LO:2, PH:5, HI:10, SE:15};
  function ordinal(value, max) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= max
      ? (max - 1) * (2 ** (n - 1) - 1) / (2 ** (max - 1) - 1) : null;
  }
  function appearance(total) {
    if (total < 0) return {state:"negative", border:"#ba302c", background:"#fff0ee", color:"#7b211e"};
    if (total === 0) return {state:"neutral", border:"#a7afa9", background:"#f2f4f2", color:"#39433c"};
    const strength = total / (total + 26);
    return {state:"positive", border:`hsl(135, ${35 + 45 * strength}%, ${65 - 35 * strength}%)`,
      background:`hsl(135, ${25 + 40 * strength}%, ${97 - 19 * strength}%)`, color:"#163d24"};
  }
  function calculate(entries) {
    const unique = new Map();
    for (const entry of entries) if (!unique.has(entry.key)) unique.set(entry.key, entry);
    const items = [...unique.values()].map(entry => {
      const risk = Object.hasOwn(riskWeights, entry.risk) ? riskWeights[entry.risk] : 0;
      const excluded = Boolean(risk > 0 || entry.national || entry.eu || entry.futureEU);
      const associated = excluded ? 0 : ordinal(entry.associated, 8);
      const nectar = excluded ? 0 : ordinal(entry.nectar, 7);
      const penalty = Math.max(risk, entry.national ? 20 : 0, entry.eu ? 30 : 0);
      return {...entry, excluded, associated, nectar, penalty, total:(associated ?? 0) + (nectar ?? 0) - penalty};
    });
    const sum = field => items.reduce((total, item) => total + (item[field] ?? 0), 0);
    const associated = sum("associated"), nectar = sum("nectar"), penalty = sum("penalty");
    return {items, associated, nectar, penalty, total:associated + nectar - penalty,
      missing:items.filter(item => !item.excluded && (item.associated === null || item.nectar === null)).length,
      excluded:items.filter(item => item.excluded).length,
      listed:items.filter(item => item.eu || item.national || item.futureEU).length,
      imputed:items.filter(item => !item.excluded && item.nectar !== null && item.imputed).length};
  }
  root.PlantListScore = {calculate, riskWeights, ordinal, appearance};
  if (typeof module !== "undefined") module.exports = root.PlantListScore;
})(globalThis);
