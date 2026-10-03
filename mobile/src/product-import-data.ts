import type { ImportedDetails, Product, ProductFacts } from './types.ts';

export const emptyProductFacts=():ProductFacts=>({manufacturer:'',seller:'',parentCompany:'',weightBasis:'unknown',servingCount:null,servingSize:'',nutrition:[],ingredients:'',allergens:'',identityEvidence:'unknown'});
export function readProductFacts(value:unknown):ProductFacts {
 const f=value as ProductFacts;
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid product source facts.');return v;};
 if(!f||!['product','net','pack','unknown'].includes(f.weightBasis)||!['page-stated','unknown'].includes(f.identityEvidence)||!Array.isArray(f.nutrition)||f.nutrition.length>20||f.servingCount!==null&&(typeof f.servingCount!=='number'||!Number.isFinite(f.servingCount)||f.servingCount<=0||f.servingCount>10000))throw Error('Invalid product source facts.');
 return {manufacturer:text(f.manufacturer,80),seller:text(f.seller,80),parentCompany:text(f.parentCompany,80),weightBasis:f.weightBasis,identityEvidence:f.identityEvidence,servingCount:f.servingCount,servingSize:text(f.servingSize,200),packSize:text(f.packSize??'',200),servingBasis:text(f.servingBasis??'',200),nutrition:f.nutrition.map(n=>({name:text(n.name,80),value:text(n.value,200)})),ingredients:text(f.ingredients,1000),allergens:text(f.allergens,1000)};
}

export function readImported(value:unknown):ImportedDetails {
 const d=value as ImportedDetails;
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid imported product details.');return v;};
 const number=(v:unknown,max:number)=>{if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Invalid imported product number.');return v;};
 if(!d||typeof d!=='object'||!Array.isArray(d.missing)||!Array.isArray(d.variants)||d.missing.length>20||d.variants.length>100)throw Error('Invalid imported product details.');
 const currency=text(d.currency,3);if(currency&&!/^[A-Z]{3}$/.test(currency))throw Error('Invalid product currency.');
 const unit=text(d.weightUnit,8);if(unit&&!['g','kg','lb','oz'].includes(unit))throw Error('Invalid product weight unit.');
 const facts=d.facts?readProductFacts(d.facts):undefined;
 return {...(facts?{facts}:{}),sku:text(d.sku,100),price:number(d.price,10000000),currency,weightValue:number(d.weightValue,1000000),weightUnit:unit,sourceCategory:text(d.sourceCategory,200),attribution:text(d.attribution,400),missing:d.missing.map(v=>text(v,40)),variants:d.variants.map(v=>({key:text(v.key,100),label:text(v.label,200)})),selectedVariant:text(d.selectedVariant,100)};
}

export function hasUnselectedVariant(p:Product):boolean {return !!p.imported?.variants.length&&!p.imported.selectedVariant;}
export function importedPrice(p:Product):string {
 const d=p.imported;return d?.price!==null&&d?.price!==undefined?String(d.price)+' '+(d.currency||'(currency unknown)'):'Not provided';
}
export function importIdentity(p:Product):string {
 if(!p.sourceURL)return p.id;
 const u=new URL(p.sourceURL);u.hostname=u.hostname.replace(/^www\./,'');u.hash='';u.pathname=u.pathname.replace(/\/$/,'');
 for(const k of [...u.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid|affiliate|aff_id|ref)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();
 const hasSelector=['variant','color','size','style','sku','option','pack','packsize'].some(k=>u.searchParams.has(k));
 return u.href+(!hasSelector&&p.imported?.selectedVariant?'::'+(p.imported.sku||p.imported.selectedVariant):'');
}
// A private source reference never fetches arbitrary URLs or publishes them.
export function privateProductURL(raw:string):string {
 if(!raw.trim())return '';
 if(raw.length>2048||[...raw.trim()].some(c=>c.charCodeAt(0)<=32||c==='\\'))throw Error('Use a complete public product link.');
 let u:URL;try{u=new URL(raw.trim());}catch{throw Error('Use a complete HTTP or HTTPS product link.');}
 if(!['https:','http:'].includes(u.protocol)||u.port||u.username||u.password||!u.hostname.includes('.')||/^\d+(?:\.\d+){3}$/.test(u.hostname)||u.hostname.includes(':')||/(?:\.local|\.localhost|\.internal|\.test|\.invalid|\.example)$/.test(u.hostname))throw Error('Use a public HTTP or HTTPS product link without a password or custom port.');
 for(const k of [...u.searchParams.keys()]){if(/^(?:token|password|api[_-]?key|authorization|signature)$/i.test(k))throw Error('Use a public product link without access tokens.');if(/^utm_|^(?:fbclid|gclid|affiliate|aff_id|ref)$/i.test(k))u.searchParams.delete(k);}
 u.hash='';return u.href;
}
