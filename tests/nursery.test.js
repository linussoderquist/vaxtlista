const test=require("node:test");
const assert=require("node:assert/strict");
global.PlantDataView=require("../data-view.js");
const nursery=require("../nursery.js");
test("nursery names retain cultivars and match documented variants only",()=>{
 const plants=nursery.build([{"Scientific name":"Salvia nemorosa L.","Dyntaxa ID number":"123"}]);
 const c=nursery.find(plants,"Salvia nemorosa Caradonna");
 assert.equal(c.nursery.parentId,"123");
 assert.deepEqual(c.nursery.flowering,[6,9]);
 assert.equal(nursery.find(plants,"ULMUS ’New Horizon’, RESISTA®").nursery.parentId,undefined);
 assert.equal(nursery.find(plants,"Malus baccata Fastigiata"),nursery.find(plants,"Malus baccata ‘Columnaris’"));
 assert.equal(nursery.find(plants,"Salvia nemorosa Unknown"),undefined);
 assert.equal(c["Biodiversity relevance"],undefined);
 assert.match(nursery.describe(c),/Plantskolans sortuppgift/);
});
