const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const PlantListScore=require('../list-score.js');
test('planner summary integrates data, exclusions, dates, totals and circle styling',()=>{
  const elements=new Map();
  const getElementById=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',dataset:{}});return elements.get(id);};
  const ctx=vm.createContext({document:{getElementById},window:{addEventListener(){}},PlantListScore,
    PlantDataView:{escapeHtml:s=>String(s??''),getSpecies:()=>({values:{nectar_production:7},imputed:['nectar_production']})}});
  const run=s=>vm.runInContext(s,ctx);
  run(fs.readFileSync(path.join(__dirname,'../planner.js'),'utf8'));
  run(`national={taxa:{}}; eu=new Map(); risks=new Map();
    byName.set('a',{'Dyntaxa ID number':'a','Svenskt namn':'A','Biodiversity relevance':8});
    rows=[{name:'a'},{name:'a'}]; renderListSummary();`);
  let html=getElementById('listSummary').innerHTML;
  assert.match(html,/1 unikt växtval/);assert.match(html,/score-positive/);assert.match(html,/\+13<span>/);assert.match(html,/--score-border:hsl/);
  run(`national.taxa.a={}; renderListSummary();`);
  html=getElementById('listSummary').innerHTML;
  assert.match(html,/score-negative/);assert.match(html,/−20<span>/);assert.equal((html.match(/Räknas inte/g)||[]).length,2);
  assert.match(html,/0 nektarvärden är modellskattade/);
  run(`national.taxa={}; eu.set('a',{'Gäller från':'2999-01-01'});renderListSummary();`);
  html=getElementById('listSummary').innerHTML;
  assert.match(html,/score-neutral/);assert.match(html,/kommande EU-förbud/);
  run(`eu.set('a',{'Gäller från':'2000-01-01'});renderListSummary();`);
  assert.match(getElementById('listSummary').innerHTML,/−30<span>/);
  run('rows=[];renderListSummary()');assert.equal(getElementById('listSummary').innerHTML,'');
});
