import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('../Indexv1.0.html',root),'utf8');
const marker='const STARTER_CATALOG=';const start=html.indexOf(marker);
if(start<0)throw Error('Legacy catalog marker not found. Website files were not modified.');
// Balanced JSON extraction, never eval the old HTML or execute its scripts.
let i=start+marker.length, depth=0, quoted=false,escaped=false,end=-1;
for(let j=i;j<html.length;j++){const c=html[j];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else{if(c==='"')quoted=true;else if(c==='['||c==='{')depth++;else if(c===']'||c==='}'){depth--;if(depth===0){end=j+1;break;}}}}
if(end<0)throw Error('Legacy catalog JSON is incomplete.');
const legacy=JSON.parse(html.slice(i,end));
const overrides=JSON.parse(readFileSync(new URL('data/photo-overrides.json',root),'utf8'));
const categories=['Pack system','Shelter & sleep','Clothing','Water & food','Food & nutrition','Camp comfort','Electronics & power','Hunt essentials','Navigation & safety','Other'];
const https=v=>{if(!v)return '';try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const text=(v,n=2000)=>typeof v==='string'?v.slice(0,n):'';
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const ids=new Set();
const products=legacy.map(p=>{
  if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Missing or duplicate legacy product ID.');ids.add(p.id);
  const o=overrides[p.id]||{};
  return {id:p.id,name:text(p.name,200),brand:text(p.brand,80),model:text(p.model,100),variant:text(o.variant??p.variant,200),category:categories.includes(p.category)?p.category:'Other',kind:text(p.kind,80),weightGrams:number(o.weightGrams??p.weightGrams),weightLabel:text(o.weightLabel??p.weightLabel,200),weightCheckedAt:o.weightCheckedAt||'',priceUSD:number(p.priceUSD),priceCheckedAt:'',sourceURL:https(p.sourceURL),purchaseURL:https(p.purchaseURL||p.sourceURL),checkedAt:text(p.checkedAt,40),note:text(o.note??p.note),tags:Array.isArray(p.tags)?p.tags.slice(0,50).map(t=>text(t,100)):[],carry:['packed','worn','consumable'].includes(p.carry)?p.carry:'packed',photo:o.photo?{...o.photo,rights:'reference-preview'}:null,reviewStatus:o.weightCheckedAt?'source-checked':'legacy-reference'};
});
mkdirSync(new URL('data/',root),{recursive:true});
writeFileSync(new URL('data/catalog.json',root),JSON.stringify(products,null,2)+'\n');
console.log(`Imported ${products.length} legacy configurations; ${products.filter(p=>p.photo).length} photo references. Legacy specs are not relabeled verified.`);
console.log('Source SHA256:',createHash('sha256').update(html).digest('hex'));
