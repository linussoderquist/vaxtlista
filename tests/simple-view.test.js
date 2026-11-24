const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const simple = require("../simple-view.js");
const nordic = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/nordictraits-v1.json"), "utf8"));
const plant = {"Dyntaxa ID number": "220083", "Biodiversity relevance": "4", "Heat requirement": "3", Light: "5", Moisture: "5"};

test("brudborste has seven meters using actual source classes", () => {
  const html = simple.renderSummary(plant, nordic);
  assert.equal((html.match(/role="meter"/g) || []).length, 7);
  assert.equal((html.match(/<article /g) || []).length, 7);
  for (const [title, value, max] of [["Biodiversitetsrelevans",4,8],["Nektarproduktion",7,7],["Livslängd",4,4],["Pollination",1,2],["Värmekrav",3,14],["Ljusbehov",5,7],["Fuktighetskrav",5,12]]) {
    assert.match(html, new RegExp(`aria-label="${title}" aria-valuemin="[01]" aria-valuemax="${max}" aria-valuenow="${value}"`));
  }
  assert.match(html, /25–50 arter/);
  assert.match(html, /Delvis beroende/);
  assert.match(html, /Lågalpint/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test("all pollinator codes preserve the actual degree of dependence, including zero", () => {
  for (const code of ["0a","0b","0c","0d"]) assert.equal(simple.pollinationLevel(code),0);
  for (const code of ["1","1a","1ab","1b"]) assert.equal(simple.pollinationLevel(code),1);
  for (const code of ["2","2a","2ab","2b"]) assert.equal(simple.pollinationLevel(code),2);
  for (const code of ["",null,"3","2other","0","1.5"]) assert.equal(simple.pollinationLevel(code),null);
  const clone=structuredClone(nordic);
  clone.species[clone.taxa["220083"].species].values.pollinator_type="0b";
  const html=simple.renderSummary(plant,clone);
  assert.match(html,/aria-label="Pollination" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0"/);
  assert.match(html,/Oberoende/);
});

test("missing or invalid values never appear as a low known class", () => {
  for (const value of [null,undefined,"", "  ", "no data", "3x", -1, 0, 9, 2.5]) assert.equal(simple.ordinal(value,1,8),null);
  assert.equal(simple.ordinal("4",1,8),4);
  const html=simple.renderSummary({...plant,"Dyntaxa ID number":"missing"},nordic);
  assert.equal((html.match(/role="meter"/g)||[]).length,4);
  assert.equal((html.match(/metric-unknown/g)||[]).length,3);
  const unavailable=simple.renderSummary(plant,null);
  assert.equal((unavailable.match(/Kunde inte laddas/g)||[]).length,3);
  const clone=structuredClone(nordic);
  clone.species[clone.taxa["220083"].species].values.longevity=0;
  const invalid=simple.renderSummary(plant,clone);
  assert.match(invalid,/Odefinierad klass \(0\)/);
  assert.equal((invalid.match(/role="meter"/g)||[]).length,6);
});

test("imputed traits are labelled individually and meter captions are escaped", () => {
  const clone=structuredClone(nordic);
  clone.species[clone.taxa["220083"].species].imputed.push("nectar_production");
  const html=simple.renderSummary(plant,clone);
  assert.equal((html.match(/class="imputed"/g)||[]).length,1);
  const caption=simple.renderMeter({key:"heat",title:'<script>bad</script>',value:1,min:1,max:2,headline:'<img src=x>',detailHtml:'safe',low:'low',high:'high',source:'test'});
  assert.doesNotMatch(caption,/<script>|<img /);
  assert.match(caption,/&lt;script&gt;/);
});
