import type { Product, ScanRecord, Workspace } from './types';
import { catalog } from './catalog';
import { fromProduct, normalize, uid } from './domain';

const digits=(s:string)=>s.replace(/[^0-9]/g,'');
function catalogMatch(code:string){const n=normalize(code);return catalog.find(p=>p.tags.some(t=>normalize(t)===n)||normalize(p.model)===n||normalize(p.variant)===n)||null;}
export async function lookupIdentifier(code:string, saved:ScanRecord[]):Promise<Product|null>{
 const prior=saved.find(x=>normalize(x.code)===normalize(code)&&x.product);if(prior?.product)return prior.product;
 const local=catalogMatch(code);if(local)return local;
 const d=digits(code);
 if(d.length>=8&&d.length<=14){
   try{const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(d)+'.json?fields=code,product_name,brands,image_front_url,quantity');if(r.ok){const j=await r.json();if(j?.status===1&&j.product?.product_name){const p=j.product;return {id:'scan-food-'+d,name:[p.brands,p.product_name].filter(Boolean).join(' '),brand:String(p.brands||'').split(',')[0].trim()||'Unknown',model:String(p.product_name),variant:String(p.quantity||''),category:'Food & nutrition',kind:'Packaged food',weightGrams:null,weightLabel:'Enter package weight',weightCheckedAt:'',priceUSD:null,priceCheckedAt:'',sourceURL:'https://world.openfoodfacts.org/product/'+d,purchaseURL:'',checkedAt:new Date().toISOString().slice(0,10),note:'Identified from barcode via Open Food Facts. Confirm label details before trip calculations.',tags:['barcode',d],carry:'consumable',photo:p.image_front_url?{url:String(p.image_front_url),sourceURL:'https://world.openfoodfacts.org/product/'+d,caption:'Open Food Facts product image',checkedAt:new Date().toISOString().slice(0,10),rights:'reference-preview'}:null,reviewStatus:'legacy-reference'};}}}catch{}
 }
 return null;
}
export function addScannedGear(s:Workspace,code:string,codeType:string,product:Product|null){
 const now=new Date().toISOString();const existing=s.scannedProducts.find(x=>normalize(x.code)===normalize(code));
 if(existing){existing.scanCount++;existing.lastScannedAt=now;if(product)existing.product=product;}else s.scannedProducts.unshift({id:uid(),code,codeType,firstScannedAt:now,lastScannedAt:now,scanCount:1,product});
 if(product&&!s.gear.some(g=>g.product?.id===product.id)){const g=fromProduct(product,true);g.note='Added by HunterOS scanner · '+code;s.gear.unshift(g);}
 else if(!product&&!s.gear.some(g=>g.note.includes('Scanner code: '+code))){const g=fromProduct({id:'scan-unknown-'+uid(),name:'Unidentified gear · '+code,brand:'',model:code,variant:'',category:'Other',kind:'Scanned gear',weightGrams:null,weightLabel:'Weight not entered',weightCheckedAt:'',priceUSD:null,priceCheckedAt:'',sourceURL:'',purchaseURL:'',checkedAt:'',note:'',tags:['scan',code],carry:'packed',photo:null,reviewStatus:'legacy-reference'},true);g.product=null;g.note='Scanner code: '+code+' · edit this item when identified.';s.gear.unshift(g);}
 return s;
}