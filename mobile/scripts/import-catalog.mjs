import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
// Kept inside the mobile package so clean EAS builds do not need the old website.
const source = readFileSync(new URL('data/catalog-source.json',root),'utf8');
const legacy=JSON.parse(source);
const overrides=JSON.parse(readFileSync(new URL('data/photo-overrides.json',root),'utf8'));
const additions=JSON.parse(readFileSync(new URL('data/catalog-additions.json',root),'utf8'));
const activityTags=JSON.parse(readFileSync(new URL('data/catalog-activities.json',root),'utf8'));
const linkOverrides=JSON.parse(readFileSync(new URL('data/catalog-link-overrides.json',root),'utf8'));
const categories=['Pack system','Shelter & sleep','Clothing','Water & food','Food & nutrition','Camp comfort','Electronics & power','Hunt essentials','Navigation & safety','Recovery & towing','Tools & tires','Vehicle storage','Riding protection','Other'];
const https=v=>{if(!v)return '';try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const text=(v,n=2000)=>typeof v==='string'?v.slice(0,n):'';
const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const ids=new Set();
const products=legacy.map(p=>{
  if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Missing or duplicate legacy product ID.');ids.add(p.id);
  const o=overrides[p.id]||{};
  const link=linkOverrides[p.id]||{};
  const photo=o.photo||link.photo;
  return {id:p.id,name:text(p.name,200),brand:text(p.brand,80),model:text(p.model,100),variant:text(o.variant??p.variant,200),category:categories.includes(p.category)?p.category:'Other',kind:text(p.kind,80),weightGrams:number(o.weightGrams??p.weightGrams),weightLabel:text(o.weightLabel??p.weightLabel,200),weightCheckedAt:o.weightCheckedAt||'',priceUSD:number(p.priceUSD),priceCheckedAt:'',sourceURL:https(p.sourceURL),purchaseURL:https(link.purchaseURL||p.purchaseURL||p.sourceURL),checkedAt:text(p.checkedAt,40),note:text(o.note??p.note),tags:[...new Set([...(Array.isArray(p.tags)?p.tags:[]),...(activityTags[p.id]||[])])].slice(0,50).map(t=>text(t,100)),carry:['packed','worn','consumable'].includes(p.carry)?p.carry:'packed',photo:photo?{...photo,rights:'reference-preview'}:null,reviewStatus:o.weightCheckedAt?'source-checked':'legacy-reference'};
});
for(const [id,link] of Object.entries(linkOverrides)){
  if(!ids.has(id)||!https(link.purchaseURL)||new URL(link.purchaseURL).pathname==='/')throw Error(`Invalid product link override ${id}.`);
  if(link.photo&&(!https(link.photo.url)||!https(link.photo.sourceURL)))throw Error(`Invalid image link override ${id}.`);
}
for(const id of Object.keys(activityTags)){
  if(!ids.has(id))throw Error(`Activity overlay references missing legacy product ${id}.`);
  if(!Array.isArray(activityTags[id])||activityTags[id].some(tag=>typeof tag!=='string'||!tag))throw Error(`Invalid activity tags for ${id}.`);
}
for(const p of additions){
  if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Missing or duplicate added product ID.');
  if(!p.name||!p.brand||!categories.includes(p.category))throw Error(`Invalid added product ${p.id}.`);
  if(!https(p.sourceURL)||!https(p.purchaseURL)||!p.photo||!https(p.photo.url)||!https(p.photo.sourceURL))throw Error(`Missing HTTPS product/image reference for ${p.id}.`);
  if(!Array.isArray(p.tags)||!p.tags.length)throw Error(`Missing discovery tags for ${p.id}.`);
  ids.add(p.id);
  products.push({id:p.id,name:text(p.name,200),brand:text(p.brand,80),model:text(p.model,100),variant:text(p.variant,200),category:p.category,kind:text(p.kind,80),weightGrams:number(p.weightGrams),weightLabel:text(p.weightLabel,200),weightCheckedAt:text(p.weightCheckedAt,40),priceUSD:number(p.priceUSD),priceCheckedAt:text(p.priceCheckedAt,40),sourceURL:https(p.sourceURL),purchaseURL:https(p.purchaseURL),checkedAt:text(p.checkedAt,40),note:text(p.note),tags:[...new Set(p.tags)].slice(0,50).map(t=>text(t,100)),carry:['packed','worn','consumable'].includes(p.carry)?p.carry:'packed',photo:{url:https(p.photo.url),sourceURL:https(p.photo.sourceURL),caption:text(p.photo.caption,500),checkedAt:text(p.photo.checkedAt,40),rights:'reference-preview'},reviewStatus:p.weightCheckedAt?'source-checked':'legacy-reference'});
}
mkdirSync(new URL('data/',root),{recursive:true});
writeFileSync(new URL('data/catalog.json',root),JSON.stringify(products,null,2)+'\n');
console.log(`Imported ${legacy.length} preserved configurations + ${additions.length} additions = ${products.length} products; ${products.filter(p=>p.photo).length} photo references. Unknown specs remain unknown.`);
console.log('Catalog source SHA256:',createHash('sha256').update(source).digest('hex'));
