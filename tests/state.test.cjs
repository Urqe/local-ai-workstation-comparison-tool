// Lightweight DOM boundary harness. Cost invariants live in calculator.test.cjs;
// these tests exercise the actual UI handlers and storage, without a browser dependency.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(saved){
 const elements=new Map();
 const ctx=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 class Element{
  constructor(tag='DIV'){this.tagName=tag.toUpperCase();this.listeners={};this.children=[];this.options=[];this.hidden=false;this.open=false;this._value='';this.innerHTML='';}
  set value(value){
   value=String(value);
   if(this.type==='range'){
    let n=Number(value);if(!Number.isFinite(n)) n=(+this.min + +this.max)/2;
    n=Math.min(+this.max,Math.max(+this.min,n));
    value=String(Math.min(+this.max,+this.min+Math.round((n- +this.min)/+this.step)*+this.step));
   }else if(this.tagName==='SELECT'&&!this.options.some(o=>o.value===value)) value='';
   this._value=value;
  }
  get value(){return this._value;}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  fire(name){for(const fn of this.listeners[name]||[]) fn({target:this});}
  appendChild(c){this.children.push(c);}
  querySelectorAll(){return [];}
  setAttribute(k,v){this[k]=v;}
  getBoundingClientRect(){return {width:500,height:260};}
  getContext(){return ctx;}
 }
 for(const match of html.split('<script')[0].matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const [markup,tag,id]=match,el=new Element(tag);
  for(const key of ['type','min','max','step']) el[key]=markup.match(new RegExp(key+'="([^"]*)"'))?.[1];
  if(tag==='select'){
   const body=html.slice(match.index+markup.length).split('</select>')[0];
   el.options=[...body.matchAll(/<option\b([^>]*)>([^<]*)/g)].map(o=>({value:o[1].match(/value="([^"]*)"/)?.[1]||o[2],defaultSelected:/\bselected\b/.test(o[1])}));
   el.value=el.options.find(o=>o.defaultSelected)?.value||el.options[0].value;
  }else{
   el.defaultValue=markup.match(/\bvalue="([^"]*)"/)?.[1]||'';
   el.value=el.defaultValue;
  }
  elements.set(id,el);
 }
 let stored=saved;
 const scope=vm.createContext({Intl,console,document:{getElementById:id=>elements.get(id),createElement:tag=>new Element(tag)},window:{devicePixelRatio:1,addEventListener(){}},Path2D:class{},localStorage:{getItem:()=>stored??null,setItem:(k,v)=>stored=v},setTimeout,clearTimeout});
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) vm.runInContext(match[1],scope);
 return {get:id=>elements.get(id),run:code=>vm.runInContext(code,scope),saved:()=>stored};
}
test('fresh inputs are not marked modified',()=>{
 const app=boot();assert.equal(app.get('advancedChip').hidden,true);
 assert.equal(app.get('cloudChip').hidden,true);
});
test('reset updates inputs, labels, results, and persisted values atomically',()=>{
 const app=boot();app.get('elec').value='0.6';app.get('elec').fire('input');
 assert.equal(app.get('elecOut').textContent,'€0.60/kWh');
 app.get('resetBtn').fire('click');
 assert.equal(+app.get('elec').value,0.2);
 assert.equal(app.get('elecOut').textContent,'€0.20/kWh');
 assert.match(app.get('tableBody').children.at(-3).innerHTML,/2,248/);
 assert.equal(app.get('advancedChip').hidden,true);
 const restored=boot(app.saved());
 assert.equal(restored.get('usagePreset').value,'casual');
 assert.equal(+restored.get('elec').value,0.2);
});
test('every preset survives native range normalization and refresh',()=>{
 for(const key of ['starter','casual','professional','solo','sprint','allDay','autonomous']){
  const app=boot();app.get('usagePreset').value=key;app.get('usagePreset').fire('change');
  const restored=boot(app.saved());
  assert.equal(restored.get('usagePreset').value,key);
  if(key==='starter') assert.equal(+restored.get('tokensHour').value,45000);
 }
});
test('restoration ignores invalid selectors and ranges without breaking calculations',()=>{
 const app=boot(JSON.stringify({version:2,inputs:{usagePreset:'missing',quant:'invalid',years:999,priceBasis:'bogus',elec:'NaN'}}));
 assert.equal(app.get('usagePreset').value,'casual');
 assert.equal(+app.get('years').value,3);
 assert.equal(app.get('priceBasis').value,'gross');
 assert.ok(Number.isFinite(app.run('calculate().cloud')));
});
test('manual assumptions persist and reset restores all controls',()=>{
 const app=boot();app.get('resaleMode').value='manual';app.get('resaleMode').fire('input');
 assert.equal(app.get('resaleManualField').hidden,false);
 app.get('retainedCloud').value='50';app.get('retainedCloud').fire('input');
 const restored=boot(app.saved());assert.equal(+restored.get('retainedCloud').value,50);
 assert.equal(restored.get('resaleMode').value,'manual');
 restored.get('resetBtn').fire('click');
 assert.equal(restored.get('resaleMode').value,'curve');
 assert.equal(+restored.get('retainedCloud').value,0);
 assert.equal(restored.get('resaleManualField').hidden,true);
});
