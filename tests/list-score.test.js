const test = require("node:test");
const assert = require("node:assert/strict");
const {calculate} = require("../list-score.js");
test("scores ordinal classes once per identity and keeps missing data explicit", () => {
  const result=calculate([{key:"a",associated:8,nectar:7,redlistCategory:"LC"},{key:"a",associated:8,nectar:7,redlistCategory:"LC"},
    {key:"b",associated:"",nectar:null},{key:"c",associated:0,nectar:8}]);
  assert.equal(result.total,114);
  assert.equal(result.items.length,3);
  assert.equal(result.missing,2);
});
test("penalties increase with risk and use strongest listing without double counting",()=>{
  const results=["NK","LO","PH","HI","SE"].map(risk=>calculate([{key:"x",risk}]).total);
  assert.deepEqual(results,[0,-2,-5,-10,-15]);
  assert.equal(calculate([{key:"x",associated:8,nectar:7,risk:"SE",national:true}]).total,-20);
  assert.equal(calculate([{key:"x",associated:8,nectar:7,risk:"SE",national:true,eu:true}]).total,-30);
});
test("imputation and legal warnings survive an overall positive score",()=>{
  const result=calculate([{key:"x",eu:true},{key:"a",associated:8,nectar:7,imputed:true},
    {key:"b",associated:8,nectar:7},{key:"c",associated:8,nectar:7}]);
  assert.equal(result.total,309);
  assert.equal(result.listed,1);
  assert.equal(result.imputed,1);
});
test("every valid class scores its square and invalid classes stay missing",()=>{
  const {ordinal}=require("../list-score.js");
  for(const max of [7,8]) {
    const points=Array.from({length:max},(_,i)=>ordinal(i+1,max));
    assert.deepEqual(points,[1,4,9,16,25,36,49,64].slice(0,max));
    for(const value of [null,undefined,"", " ",false,NaN,Infinity,0,max+1,1.5]) assert.equal(ordinal(value,max),null);
    assert.equal(ordinal(String(max),max),max*max);
  }
});
test("every invasive category excludes all benefits and missing/imputed counts",()=>{
  for(const flags of [{risk:"LO"},{risk:"PH"},{risk:"HI"},{risk:"SE"},{national:true},{eu:true},{futureEU:true}]) {
    for(const benefits of [{associated:8,nectar:7,imputed:true},{associated:null,nectar:null}]) {
      const score=calculate([{key:"x",redlistCategory:"CR",...flags,...benefits}]);
      assert.equal(score.associated,0);assert.equal(score.nectar,0);
      assert.equal(score.redlist,0);
      assert.equal(score.total,-score.penalty || 0);assert.equal(score.missing,0);assert.equal(score.imputed,0);
      assert.equal(score.excluded,1);
    }
  }
  assert.equal(calculate([{key:"x",risk:"NK",associated:8,nectar:7,redlistCategory:"CR"}]).total,121);
});
test("square points aggregate and exact cancellation stays neutral",()=>{
  const score=calculate([{key:"a",associated:4,nectar:3},{key:"b",associated:5,nectar:4}]);
  assert.equal(score.total,66);
  const zero=calculate([{key:"a",associated:1,nectar:1},{key:"e",risk:"LO"}]);
  assert.equal(zero.total,0);
});
test("redlist categories score separately and unknown is distinct from a known zero",()=>{
  const weights={NA:0,DD:0,NE:0,EX:0,LC:1,NT:2,VU:4,EN:6,CR:8,EW:8,RE:8};
  for(const [redlistCategory,points] of Object.entries(weights)) {
    const score=calculate([{key:'a',associated:1,nectar:1,redlistCategory}]);
    assert.equal(score.redlist,points);
    assert.equal(score.total,2+points);
    assert.equal(score.missing,0);
  }
  for(const redlistCategory of [null,undefined,'','XX','constructor']) {
    const score=calculate([{key:'a',associated:1,nectar:1,redlistCategory}]);
    assert.equal(score.redlist,0);assert.equal(score.items[0].redlist,null);assert.equal(score.missing,1);
  }
});
test("circle is red below zero, neutral at zero and progressively greener",()=>{
  const {appearance}=require("../list-score.js");
  assert.equal(appearance(-1).state,"negative");assert.equal(appearance(0).state,"neutral");
  const colors=[1,13,26,100,1000].map(n=>appearance(n));
  assert.ok(colors.every(c=>c.state==="positive"));
  const saturations=colors.map(c=>Number(c.border.match(/, ([\d.]+)%/)[1]));
  saturations.slice(1).forEach((s,i)=>assert.ok(s>saturations[i]));
});
