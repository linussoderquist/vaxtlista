const test = require("node:test");
const assert = require("node:assert/strict");
const {calculate} = require("../list-score.js");
test("scores ordinal classes once per identity and keeps missing data explicit", () => {
  const result=calculate([{key:"a",associated:8,nectar:7},{key:"a",associated:8,nectar:7},
    {key:"b",associated:"",nectar:null},{key:"c",associated:0,nectar:8}]);
  assert.equal(result.total,13);
  assert.equal(result.items.length,3);
  assert.equal(result.missing,2);
});
test("penalties increase with risk and use strongest listing without double counting",()=>{
  const results=["NK","LO","PH","HI","SE"].map(risk=>calculate([{key:"x",risk}]).total);
  assert.deepEqual(results,[0,-2,-5,-10,-15]);
  assert.equal(calculate([{key:"x",associated:8,nectar:7,risk:"SE",national:true}]).total,-7);
  assert.equal(calculate([{key:"x",associated:8,nectar:7,risk:"SE",national:true,eu:true}]).total,-17);
});
test("imputation and legal warnings survive an overall positive score",()=>{
  const result=calculate([{key:"x",eu:true},{key:"a",associated:8,nectar:7,imputed:true},
    {key:"b",associated:8,nectar:7},{key:"c",associated:8,nectar:7}]);
  assert.equal(result.total,9);
  assert.equal(result.listed,1);
  assert.equal(result.imputed,1);
});
