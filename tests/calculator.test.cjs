const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const engine=html.match(/<script id="calculator-model">([\s\S]*?)<\/script>/)[1];
const model=vm.runInNewContext(engine+';CalculatorModel');
const assumptions={priceBasis:'gross',years:3,daysWeek:4,cloudHours:4,tokensHour:80000,
 includedTokens:25000000,overflowCost:5,cloudSpend:80,retainedCloud:0,privacy:20,
 params:14,quant:0.68,overhead:6,resaleMode:'curve',resalePercent:40,hours:4,elec:0.2};
const mini={id:'mini',name:'Mini',price:3699,aiMem:64,watts:58};
const studio={id:'studio',name:'Studio',price:6289,aiMem:128,watts:88};
const calculate=(overrides={},scenarios=[mini,studio])=>model.calculate({...assumptions,...overrides},scenarios);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('default cost crosses cloud at sale in month 36, not month 37',()=>{
 const r=calculate();
 close(r.cloud,2880);
 assert.equal(r.rows[0].net.toFixed(2),'2248.45');
 assert.equal(r.rows[0].breakEven.month,36);
 assert.equal(r.rows[0].breakEven.atSale,true);
});
test('cash break-even and chart do not change with subjective privacy value',()=>{
 const a=calculate({privacy:0}), b=calculate({privacy:150});
 assert.deepEqual(a.series,b.series);
 assert.deepEqual(a.rows[0].breakEven,b.rows[0].breakEven);
 assert.notEqual(a.rows[0].adjusted,b.rows[0].adjusted);
});
test('resale is a vertical final event and chart endpoint equals table total',()=>{
 for(const r of calculate().rows){
  const [before,after]=r.points.slice(-2);
  assert.equal(before.x,36); assert.equal(after.x,36);
  close(before.y-after.y,r.resaleCredit); close(after.y,r.net);
 }
});
test('unsupported local candidates cannot win; cloud remains eligible',()=>{
 const heavy=calculate({params:70,quant:0.55,overhead:24,cloudSpend:500});
 assert.equal(heavy.rows[0].viable,false);
 assert.equal(heavy.bestLocal.s.id,'studio');
 assert.equal(heavy.winner.name,'Studio');
 assert.equal(calculate({cloudSpend:0}).winner.name,'Cloud');
 const none=calculate({params:120,quant:2,overhead:32});
 assert.equal(none.bestLocal,null); assert.equal(none.winner.name,'Cloud');
});
test('retained cloud adds cash costs and reduces applied privacy value',()=>{
 const a=calculate(), b=calculate({retainedCloud:50});
 close(b.rows[0].net-a.rows[0].net,1440);
 close(b.privacy,360);
 assert.equal(calculate({retainedCloud:100}).winner.name,'Cloud');
 assert.equal(calculate({retainedCloud:100}).rows[0].breakEven,null);
});
test('custom resale overrides curve and changes break-even coherently',()=>{
 const noResale=calculate({resaleMode:'manual',resalePercent:0});
 assert.equal(noResale.rows[0].breakEven,null);
 assert.ok(noResale.rows[0].net>noResale.cloud);
 assert.equal(calculate({resaleMode:'manual',resalePercent:90}).rows[0].breakEven.month,36);
 close(model.resaleFraction(1.5),0.675);
 close(model.resaleFraction(6),0.14);
});
test('VAT removes hardware/subscription VAT and adds it to gross API overflow',()=>{
 const net=calculate({priceBasis:'net',includedTokens:1000000});
 const gross=calculate({includedTokens:1000000});
 close(net.rows[0].purchase,3699/1.255);
 close(net.overflowEffective*1.255,gross.overflowEffective);
 close(net.cloudMonthly*1.255,gross.cloudMonthly);
});
test('analytic break-even handles operating crossings, no crossing, and sale only',()=>{
 close(model.breakEven(1000,10,110,24,0).month,10);
 assert.equal(model.breakEven(1000,110,110,24,0),null);
 assert.equal(model.breakEven(1000,10,30,24,600).atSale,true);
 assert.equal(model.breakEven(1000,10,30,24,0),null);
});
test('cash crossover agrees with chart across all ownership periods and retained bills',()=>{
 for(let years=1;years<=6;years+=0.5) for(const retainedCloud of [0,25,100]) for(const cloudSpend of [0,80,500]){
  const result=calculate({years,retainedCloud,cloudSpend});
  for(const row of result.rows){
   close(row.points.at(-1).y,row.net);
   const first=row.points.find(p=>p.y<=result.cloudMonthly*p.x);
   assert.equal(Boolean(first),Boolean(row.breakEven));
   if(row.breakEven) assert.ok(row.breakEven.month<=result.months);
  }
 }
});
