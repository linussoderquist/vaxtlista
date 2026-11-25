const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const art=require('../species-art.js');
const Papa=require('../vendor/papaparse.min.js');
const data=require('../data-view.js');
const root=path.join(__dirname,'..');
const plants=Papa.parse(fs.readFileSync(path.join(root,'vaxtdata.csv'),'utf8'),{header:true,skipEmptyLines:true}).data;
const bloom=require('../data/flowering-sv.json');

test('forty unique illustrated species have matching IDs, image files and valid available flowering intervals',()=>{
 assert.equal(art.portraits.length,40);
 assert.equal(new Set(art.portraits.map(a=>a.slug)).size,40);
 assert.equal(new Set(art.portraits.map(a=>a.id)).size,40);
 for(const a of art.portraits){
  const p=plants.find(p=>p['Dyntaxa ID number']===a.id);
  assert.ok(p,a.name); assert.equal(p['Svenskt namn'],a.name);
  assert.ok(p['Scientific name'].startsWith(a.scientificName));
  assert.equal(art.get(p),a);
  const bytes=fs.readFileSync(path.join(root,'assets/arter',a.slug+'.webp'));
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  const interval=bloom.taxa[a.id]; if (interval) { assert.equal(interval.length,2);
  assert.ok(interval[0]>=1 && interval[0]<=interval[1] && interval[1]<=12); }
  assert.match(art.render(p),/Artillustration/);
 }
 assert.deepEqual(bloom.taxa['221338'],[6,9]);
 assert.match(bloom.taxonSources['221338'].label,/Jordbruksverket/);
});
test('portraits are not inherited by cultivars, unknown plants or similarly named taxa',()=>{
 assert.equal(art.render(null),'');
 assert.equal(art.render({'Scientific name':'Salix caprea','Dyntaxa ID number':'unknown'}),'');
 assert.equal(art.render({'Dyntaxa ID number':'223284',nursery:{parentId:'223284'}}),'');
 assert.equal(art.render({'Dyntaxa ID number':'cultivar',nursery:{parentId:'223284'}}),'');
});
test('planner uses portraits before form images and renders the additional flowering source',async()=>{
 const nodes=new Map();
 const getElementById=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',dataset:{}});return nodes.get(id);};
 const ctx=vm.createContext({document:{getElementById},window:{addEventListener(){}},PlantDataView:data,SpeciesArt:art,plants,loadJson:async()=>bloom});
 const run=s=>vm.runInContext(s,ctx);
 run(fs.readFileSync(path.join(root,'planner.js'),'utf8'));
 run('startPlanner(plants,null,{taxa:{}},[],[])');
 await new Promise(setImmediate);
 run('rows=[{name:"rödklöver"}];render()');
 assert.match(getElementById('entries').innerHTML,/assets\/arter\/rodklover.webp/);
 assert.match(getElementById('entries').innerHTML,/Jordbruksverket \(2008\)/);
 assert.match(getElementById('calendar').innerHTML,/1 av 1 matchade taxa/);
 assert.match(run('formImage({"Dyntaxa ID number":"other"})'),/assets\/vaxtformer\/okand.webp/);
});
