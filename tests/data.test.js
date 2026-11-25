const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const view = require("../data-view.js");
const simpleView = require("../simple-view.js");
const invasiveView = require("../invasive-view.js");
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, "../data", name), "utf8"));
const redlist = read("redlist-2025.json");
const nordic = read("nordictraits-v1.json");
const report = read("update-report.json");
const national = read("national-invasive-2026.json");

test("all matched taxa have exactly 44 traits, complete imputation flags and source units", () => {
  assert.equal(report.plantCount, 2426);
  assert.equal(Object.keys(redlist.taxa).length + report.redlistUnmatched.length, report.plantCount);
  assert.equal(Object.keys(nordic.taxa).length + report.nordicTraitsUnmatched.length, report.plantCount);
  const keys = nordic.traits.map(d => d.key).sort();
  assert.equal(keys.length, 44);
  for (const d of nordic.traits) {
    assert.ok(view.labels[d.key], `Missing Swedish label: ${d.key}`);
    assert.ok(view.groups[d.category], `Trait is not rendered: ${d.key}`);
  }
  for (const [id, mapping] of Object.entries(nordic.taxa)) {
    assert.ok(id);
    const record = nordic.species[mapping.species];
    assert.ok(record);
    assert.deepEqual(Object.keys(record.values).sort(), keys);
    assert.equal(new Set(record.imputed).size, record.imputed.length);
    for (const key of record.imputed) assert.ok(keys.includes(key));
    for (const value of Object.values(record.values)) assert.notEqual(value, null);
    assert.equal((view.renderTraits(nordic, id, true).match(/<th scope="row"/g) || []).length, 44);
  }
  assert.equal(nordic.traits.find(d => d.key === "height").unit, "cm");
  assert.equal(nordic.traits.find(d => d.key === "SLA").unit, "mm2 mg−1");
});

test("current Red List values replace legacy threatened and non-threatened values", () => {
  assert.equal(redlist.source.assessmentYear, 2025);
  assert.equal(redlist.source.publishedAt, "2026-03-24");
  assert.equal(redlist.taxa["223246"].category, "EN"); // skogsalm: formerly CR
  assert.equal(redlist.taxa["222914"].category, "LC"); // backsmörblomma: formerly NT
  assert.equal(redlist.taxa["504"].category, "LC");
  assert.equal(redlist.taxa["222135"].category, "NA");
  assert.match(view.renderRedlist(redlist, "222135"), /NA<\/span> Ej tillämplig/);
  for (const record of Object.values(redlist.taxa)) {
    assert.match(record.categoryRaw, new RegExp(`^${record.category}(?:$|[^A-Z])`));
    assert.match(view.getRedlistBadge(record.categoryRaw), new RegExp(`rl-${record.category}`));
  }
});

test("missing status and loading failures never become LC or NE", () => {
  for (const status of ["", null, undefined, "Not Red-listed", "invalid", "unknown NT", "LCINVALID"]) {
    assert.match(view.getRedlistBadge(status), /Uppgift saknas/);
    assert.doesNotMatch(view.getRedlistBadge(status), /rl-LC|rl-NE/);
  }
  assert.match(view.renderRedlist(redlist, "220186"), /Uppgift saknas/);
  assert.match(view.renderRedlist(null, "504"), /kunde inte laddas/);
  assert.match(view.renderTraits(null, "504", false), /kunde inte laddas/);
});

test("source category annotations and criteria survive rendering", () => {
  const id = Object.keys(redlist.taxa).find(id => redlist.taxa[id].categoryRaw.includes("°*"));
  assert.ok(id);
  assert.match(view.renderRedlist(redlist, id), /°\*/);
  const pre = Object.keys(redlist.taxa).find(id => redlist.taxa[id].categoryRaw.includes("PRE"));
  assert.match(view.renderRedlist(redlist, pre), /PRE/);
  assert.match(view.renderRedlist(redlist, "223246"), /A2be\+3be\+4abe/);
});

test("real NordicTraits values, imputed flags and categorical vocabularies are used", () => {
  const fir = view.getSpecies(nordic, "222135");
  assert.equal(fir.name, "Abies alba");
  assert.equal(fir.values.height, 1189.4); // old karaktarer.csv value was 1000 cm
  const numeric = (1189.4).toLocaleString("sv-SE", {maximumSignificantDigits: 4});
  assert.ok(view.renderTraits(nordic, "222135", false).includes(numeric + " cm"));
  const orchid = view.getSpecies(nordic, "219811");
  assert.equal(orchid.values.mycorrhiza_type, "OrkM");
  for (const id of ["222135", "219811", "504"]) {
    const record = view.getSpecies(nordic, id);
    const html = view.renderTraits(nordic, id, true);
    assert.equal((html.match(/class="imputed"/g) || []).length, record.imputed.length);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
  for (const record of Object.values(nordic.species)) {
    for (const def of nordic.traits) {
      const formatted = view.formatValue(def, record.values[def.key]);
      if (def.key === "longevity" && record.values[def.key] === 0) continue;
      assert.doesNotMatch(formatted, /saknar förklaring/, `${def.key}: ${record.values[def.key]}`);
    }
  }
  const longevity = nordic.traits.find(d => d.key === "longevity");
  assert.match(view.formatValue(longevity, 0), /0 \(saknar förklaring/);
});

test("scientific names retain hybrids, subspecies and aggregates; only documented synonyms match", () => {
  assert.equal(view.scientificNameKey("Gymnadenia conopsea (L.) R. Br."), "gymnadenia conopsea");
  assert.notEqual(view.scientificNameKey("Ononis spinosa ssp. spinosa"), view.scientificNameKey("Ononis spinosa"));
  assert.notEqual(view.scientificNameKey("Quercus rubra agg."), view.scientificNameKey("Quercus rubra"));
  assert.notEqual(view.scientificNameKey("Aconitum × stoerkianum Rchb."), view.scientificNameKey("Aconitum stoerkianum"));
  assert.equal(nordic.taxa["223462"].species, "Alkekengi officinarum"); // source SE_species synonym
  assert.equal(view.getSpecies(nordic, "222767"), null); // hybrid has no NordicTraits entry
  assert.equal(view.getSpecies(nordic, "223896"), null); // subspecies must not inherit A. maritima
  assert.match(view.renderTraits(nordic, "223896", true), /Uppgift saknas/);
});

test("source strings are escaped before insertion into HTML", () => {
  assert.equal(view.escapeHtml('<a title="x">&\'</a>'), '&lt;a title=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  const synthetic = structuredClone(nordic);
  const mapping = synthetic.taxa["504"];
  mapping.species = '<script>alert("x")</script>';
  synthetic.species[mapping.species] = nordic.species[nordic.taxa["504"].species];
  const html = view.renderTraits(synthetic, "504", false);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

async function bootSite(failedUrl) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {innerHTML: "", textContent: "", value: "", checked: false, addEventListener() {}, appendChild() {}});
    return elements.get(id);
  };
  const plants = [
    {"Scientific name": "Armeria maritima ssp. elongata", "Svenskt namn": "backtrift", "Dyntaxa ID number": "223896", "Family": "Plumbaginaceae"},
    {"Scientific name": "Armeria maritima ssp. maritima", "Svenskt namn": "strandtrift", "Dyntaxa ID number": "223898", "Family": "Plumbaginaceae"},
    {"Scientific name": "Abies alba Mill.", "Svenskt namn": "silvergran", "Dyntaxa ID number": "222135", "Family": "Pinaceae", "Red-listed": "CR"},
    {"Scientific name": "Lupinus polyphyllus Lindl.", "Svenskt namn": "blomsterlupin", "Dyntaxa ID number": "221248", "Family": "Fabaceae", "Time of immigration": "5"}
  ];
  const csvFixtures = {
    "vaxtdata.csv": plants,
    "karaktarer.csv": [{"Dyntaxa ID number":"222135","Växtsätt":"Träd"}],
    "Riskklassning2024_Uttag.csv": [{TaxonId: "0"}],
    "eu_invasiva_vaxtarter.csv": [{"Dyntaxa ID": "0"}],
    "resource_relevant.csv": [{"Hostplant Genus": "other"}]
  };
  const map = {setView() {return this;}};
  const context = vm.createContext({
    PlantDataView: view,
    SimplePlantView: simpleView,
    InvasivePlantView: invasiveView,
    document: {getElementById: element},
    L: {map: () => map, tileLayer: () => ({addTo() {}})},
    Papa: {parse(url, options) {Promise.resolve().then(() => url === failedUrl ? options.error(new Error("Simulated download failure")) : options.complete({data: csvFixtures[url]}));}},
    fetch: async url => ({ok: url !== failedUrl, status: url === failedUrl ? 503 : 200, json: async () => url.includes("gbif.org") ? {results: [], endOfRecords: true} : ({"data/redlist-2025.json": redlist, "data/nordictraits-v1.json": nordic, "data/national-invasive-2026.json": national})[url]}),
    console: {error() {}},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../script.js"), "utf8"), context);
  await new Promise(setImmediate);
  return {context, element};
}

test("site initialization keeps search usable after either new source fails", async () => {
  for (const failed of ["data/redlist-2025.json", "data/nordictraits-v1.json"]) {
    const {context, element} = await bootSite(failed);
    assert.equal(vm.runInContext("allDataLoaded", context), true);
    assert.equal(element("searchInput").disabled, false);
    assert.equal(element("searchScientific").disabled, false);
    assert.match(element("result").textContent, /Vissa uppgifter kunde inte laddas/);
    context.searchPlantByScientific("Abies alba");
    const html = element("result").innerHTML;
    assert.match(html, /silvergran/);
    assert.doesNotMatch(html, /rl-CR/); // never use legacy CR fixture
    if (failed.includes("redlist")) assert.match(html, /Rödlista 2025:<\/strong> Uppgifterna kunde inte laddas/);
    else assert.match(html, /Kunde inte laddas/);
  }
});

test("scientific autocomplete selections keep the selected subspecies in both modes", async () => {
  const {context, element} = await bootSite();
  context.searchPlantByScientific("Armeria maritima ssp. maritima");
  assert.match(element("result").innerHTML, /strandtrift <span class="scientific-name">\(Armeria maritima ssp\. maritima\)/);
  assert.doesNotMatch(element("result").innerHTML, /backtrift/);
  assert.match(element("result").innerHTML, /Uppgift saknas/);
  element("modeToggle").checked = true;
  context.toggleMode();
  assert.match(element("result").innerHTML, /strandtrift/);
  assert.match(element("result").innerHTML, /Uppgift saknas/);
  context.searchPlantByScientific("Armeria maritima");
  assert.match(element("result").innerHTML, /Växten hittades inte/);
});

test("a failed main plant list reports an error without enabling search", async () => {
  const {context, element} = await bootSite("vaxtdata.csv");
  assert.equal(vm.runInContext("allDataLoaded", context), false);
  assert.equal(element("searchInput").disabled, true);
  assert.match(element("result").textContent, /Artlistan kunde inte laddas/);
});

test("simplified overview retains identity, red list, immigration, risk and EU listing before all meters", async () => {
  const {context}=await bootSite();
  vm.runInContext('riskData = [{TaxonId:"222135", "Riskkategori, utfall enligt GEIAA metodik":"HI"}]',context);
  const html=context.formatPlantInfo(vm.runInContext("plantData[2]",context),true);
  assert.match(html,/simple-profile/);
  assert.match(html,/silvergran/);
  assert.match(html,/Abies alba Mill\./);
  let previous=-1;
  for (const needle of ["Familj:","Rödlista 2025:","Invandringstid:","Riskklass:","EU-listad invasiv art","simple-dashboard"]) {
    const at=html.indexOf(needle);
    assert.ok(at>previous,needle+" must occur before the next section");
    previous=at;
  }
  assert.match(html,/>HI<\/span>/);
});

test("national listing is shown before meters in both modes without being called EU listing", async () => {
  const {context,element}=await bootSite();
  context.searchPlantByScientific("Lupinus polyphyllus");
  let html=element("result").innerHTML;
  assert.match(html,/Nationellt listad invasiv art/);
  assert.doesNotMatch(html,/EU-listad invasiv art/);
  assert.ok(html.indexOf("Nationellt listad")<html.indexOf("simple-dashboard"));
  element("modeToggle").checked=true;
  context.toggleMode();
  html=element("result").innerHTML;
  assert.match(html,/Nationellt listad invasiv art/);
  assert.equal((html.match(/<th scope="row"/g)||[]).length,44);
});

test("failed national listing is reported explicitly while species search and EU status still work", async () => {
  const {context,element}=await bootSite("data/national-invasive-2026.json");
  assert.equal(vm.runInContext("allDataLoaded",context),true);
  context.searchPlantByScientific("Lupinus polyphyllus");
  assert.match(element("result").innerHTML,/Nationell invasivstatus kunde inte laddas/);
  assert.doesNotMatch(element("result").innerHTML,/Nationellt listad invasiv art/);
  assert.match(context.formatPlantInfo(vm.runInContext("plantData[3]",context),true),/EU-listad invasiv art/);
});

test("the official national name strandkotula is a search alias for the existing kotula record",async()=>{
  const {context,element}=await bootSite();
  vm.runInContext('plantData.push({"Scientific name":"Cotula coronopifolia L.","Svenskt namn":"kotula","Dyntaxa ID number":"223009","Family":"Asteraceae"})',context);
  element("searchInput").value="strandkotula";
  context.searchPlant();
  assert.match(element("result").innerHTML,/Cotula coronopifolia/);
  assert.match(element("result").innerHTML,/Nationellt listad invasiv art/);
});

test('native species use an origin label without an ecological risk notice', async () => {
  const {context} = await bootSite();
  const native = {"Scientific name":"Salix caprea", "Svenskt namn":"sälg", "Dyntaxa ID number":"native", "Time of immigration":"0"};
  vm.runInContext('riskData = [{TaxonId:"native", "Riskkategori, utfall enligt GEIAA metodik":"NK"}]',context);
  const html = context.formatPlantInfo(native);
  assert.match(html, /class="native-status">Inhemsk art/);
  assert.doesNotMatch(html, /class="risk-notice/);
  assert.match(context.formatPlantInfo({...native, "Time of immigration":""}), /class="risk-notice/);
});
