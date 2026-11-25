const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const Papa=require("../vendor/papaparse.min.js");
const data=require("../data-view.js");
const dir=path.join(__dirname,"..");
test("import, calendar and site matching preserve taxon boundaries",async()=>{
  const elements=new Map();
  function getElementById(id){
    if(!elements.has(id))elements.set(id,{innerHTML:"",dataset:{}});
    return elements.get(id);
  }
  const plants=Papa.parse(fs.readFileSync(path.join(dir,"vaxtdata.csv"),"utf8"),{header:true,skipEmptyLines:true}).data;
  const bloom=require("../data/flowering-sv.json");
  const ctx=vm.createContext({document:{getElementById},window:{addEventListener(){}},PlantDataView:data,PlantListScore:require("../list-score.js"),Papa,plants,loadJson:async()=>bloom});
  const run=code=>vm.runInContext(code,ctx);
  run(fs.readFileSync(path.join(dir,"planner.js"),"utf8"));
  run('startPlanner(plants,null,{taxa:{}},[],[])');
  await new Promise(setImmediate);
  assert.equal(run('parseText("Art;Antal\\nsälg;4")[1][0]'),"sälg");
  assert.ok(run('match("sälg")'));
  assert.ok(!run('match("Salix caprea Pendula")'));
  run('rows=[{name:"sälg"},{name:"Salix caprea"},{name:"okänd sort"}];render()');
  assert.match(getElementById("calendar").innerHTML,/1 av 1 matchade taxa/);
  assert.match(getElementById("calendar").innerHTML,/1 omatchade/);
  assert.match(getElementById("listSummary").innerHTML,/2 unika växtval/);
  assert.match(getElementById("listSummary").innerHTML,/delunderlag/);
  run('site={Light:"Sol"}');
  assert.match(run('status({Light:"8"})'),/saknas/);
  assert.equal(run('status({Light:"5"})'),"Matchar ståndorten");
});
