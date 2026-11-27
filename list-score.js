/* Transparent planning weights, version 3. These are editorial choices. */
(function(root) {
  "use strict";
  const riskWeights = {NK:0, LO:2, PH:5, HI:10, SE:15};
  const redlistWeights = {NA:0, DD:0, NE:0, EX:0, LC:1, NT:2, VU:4, EN:6, CR:8, EW:8, RE:8};
  function redlistPoints(category) {
    const code = String(category ?? '').trim().toUpperCase();
    return Object.hasOwn(redlistWeights, code) ? redlistWeights[code] : null;
  }
  function ordinal(value, max) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (String(value).trim() === "") return null;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= max
      ? n ** 2 : null;
  }
  function appearance(total) {
    if (total < 0) return {state:"negative", border:"#a13e32", background:"#ecd2b9", color:"#7b2b25"};
    if (total === 0) return {state:"neutral", border:"#85745a", background:"#ece0c4", color:"#514331"};
    const strength = total / (total + 26);
    return {state:"positive", border:`hsl(138, ${24 + 24 * strength}%, ${32 - 16 * strength}%)`,
      background:`hsl(138, ${25 + 14 * strength}%, ${34 - 15 * strength}%)`, color:"#fff4d8"};
  }
  function calculate(entries) {
    const unique = new Map();
    for (const entry of entries) if (!unique.has(entry.key)) unique.set(entry.key, entry);
    const items = [...unique.values()].map(entry => {
      const risk = Object.hasOwn(riskWeights, entry.risk) ? riskWeights[entry.risk] : 0;
      const excluded = Boolean(risk > 0 || entry.national || entry.eu || entry.futureEU);
      const associated = excluded ? 0 : ordinal(entry.associated, 8);
      const nectar = excluded ? 0 : ordinal(entry.nectar, 7);
      const redlist = excluded ? 0 : redlistPoints(entry.redlistCategory);
      const penalty = Math.max(risk, entry.national ? 20 : 0, entry.eu ? 30 : 0);
      return {...entry, excluded, associated, nectar, redlist, penalty, total:(associated ?? 0) + (nectar ?? 0) + (redlist ?? 0) - penalty};
    });
    const sum = field => items.reduce((total, item) => total + (item[field] ?? 0), 0);
    const associated = sum("associated"), nectar = sum("nectar"), redlist = sum("redlist"), penalty = sum("penalty");
    return {items, associated, nectar, redlist, penalty, total:associated + nectar + redlist - penalty,
      missing:items.filter(item => !item.excluded && (item.associated === null || item.nectar === null || item.redlist === null)).length,
      excluded:items.filter(item => item.excluded).length,
      listed:items.filter(item => item.eu || item.national || item.futureEU).length,
      imputed:items.filter(item => !item.excluded && item.nectar !== null && item.imputed).length};
  }
  root.PlantListScore = {calculate, riskWeights, redlistWeights, redlistPoints, ordinal, appearance};
  if (typeof module !== "undefined") module.exports = root.PlantListScore;
})(globalThis);
