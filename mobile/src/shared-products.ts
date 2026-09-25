import type { Gear, Product } from './types.ts';
import { fromProduct, validateGear, normalize } from './domain.ts';

export function readProduct(value:unknown):Product {
 const p=value as Product;
 if(!p||typeof p!=='object'||!p.id||!p.name)throw Error('Invalid product response.');
 return validateGear(fromProduct(p)).product!;
}
export function productKey(url:string):string {
 try{const u=new URL(url);u.hostname=u.hostname.replace(/^www\./,'');u.hash='';u.pathname=u.pathname.replace(/\/collections\/[^/]+\/products\//,'/products/').replace(/\/$/,'');for(const k of [...u.searchParams.keys()])if(!['variant','color','size','style'].includes(k))u.searchParams.delete(k);u.searchParams.sort();return u.href;}catch{return '';}
}
export function mergeCatalog(bundled:Product[],shared:Product[]):Product[]{
 const ids=new Set(bundled.map(p=>p.id)),sources=new Set(bundled.map(p=>productKey(p.photo?.sourceURL||p.sourceURL)).filter(Boolean));
 return [...bundled,...shared.filter(p=>{const key=productKey(p.sourceURL);if(ids.has(p.id)||key&&sources.has(key))return false;ids.add(p.id);if(key)sources.add(key);return true;})];
}
// Photo upgrades never overwrite a person's measured weight, name, price or notes.
export function gearProduct(gear:Gear,products:Product[]):Product|null {
 if(!gear.product)return null;const latest=products.find(p=>p.id===gear.product!.id);
 return gear.product.photo?gear.product:{...gear.product,photo:latest?.photo||null};
}
export function exactProduct(name:string,products:Product[]):Product|null {
 const n=normalize(name);if(!n)return null;
 const matches=products.filter(p=>normalize(p.name)===n||normalize(p.brand+' '+p.model)===n);
 return matches.length===1?matches[0]:null;
}
