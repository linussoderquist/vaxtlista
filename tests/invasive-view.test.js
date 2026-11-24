const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const view=require("../invasive-view.js");
const data=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/national-invasive-2026.json"),"utf8"));

test("the national snapshot contains exactly the eleven vascular plants in the statutory annex",()=>{
  assert.equal(data.source.regulation,"2026:311");
  assert.equal(data.source.effectiveFrom,"2026-05-15");
  assert.deepEqual(Object.values(data.taxa).map(r=>r.scientificName).sort(),[
    "Cotoneaster divaricatus","Cotula coronopifolia","Elodea canadensis","Lupinus nootkatensis","Lupinus polyphyllus","Nymphoides peltata","Phedimus hybridus","Phedimus spurius","Rosa rugosa","Solidago canadensis","Solidago gigantea"
  ].sort());
  assert.equal(Object.values(data.taxa).filter(r=>r.habitat==="water").length,2);
  for(const id of Object.keys(data.taxa)) {
    assert.match(view.renderNationalStatus(data,id),/Nationellt listad invasiv art/);
    assert.doesNotMatch(view.renderNationalStatus(data,id),/EU-listad invasiv art/);
  }
});

test("regional, roof and sterile-hybrid exceptions appear before expandable general guidance",()=>{
  const regional=view.renderNationalStatus(data,"222991");
  assert.match(regional,/regionala regler/);
  assert.match(regional,/Gotlands och Kalmar län/);
  assert.match(regional,/Införselförbudet gäller inte/);
  assert.ok(regional.indexOf("Gotlands och Kalmar län")<regional.indexOf("<details"));
  for(const id of ["223354","223356"]) {
    const html=view.renderNationalStatus(data,id);
    assert.match(html,/sedum- eller vegetationstak/);
    assert.match(html,/inom tre år/);
    assert.ok(html.indexOf("Undantag för tak")<html.indexOf("<details"));
  }
  assert.match(view.renderNationalStatus(data,"223120"),/Frösterila hybrider/);
});

test("private-owner guidance distinguishes aquatic spread obligations and does not demand universal removal",()=>{
  assert.match(view.renderNationalStatus(data,"221248"),/befintliga förekomster växa och föröka sig/);
  for(const id of ["219564","222110"]) assert.match(view.renderNationalStatus(data,id),/slutna vattensamlingar/);
  for(const id of Object.keys(data.taxa)) assert.doesNotMatch(view.renderNationalStatus(data,id),/måste.*(?:utrotas|tas bort)/);
});

test("nonlisted species and hybrids are not classified from their genus or ecological risk",()=>{
  for(const id of ["221243","223355","220083","219680","",null]) {
    assert.equal(view.nationalRecord(data,id),null);
    assert.equal(view.renderNationalStatus(data,id),"");
  }
  assert.match(view.renderNationalStatus(null,"221248"),/kunde inte laddas/);
});
