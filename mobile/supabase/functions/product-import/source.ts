// Shared by the Edge Function and offline catalog import/tests. Never execute page scripts.
import { pinnedPageRequest } from './network.ts';
import type { ProductFacts } from '../../../src/types.ts';
const host=(u:URL)=>u.hostname.replace(/^www\./,'');
export function manufacturerURL(raw:unknown):URL {
 if(typeof raw!=='string'||raw.length>2048||[...raw.trim()].some(c=>c.charCodeAt(0)<=32||c==='\\'))throw Error('Paste a complete public product link.');
 let u:URL;try{u=new URL(raw.trim());}catch{throw Error('Use a complete HTTPS product link.');}
 if(!['https:','http:'].includes(u.protocol)||u.port||u.username||u.password||!u.hostname.includes('.')||/^\d+(?:\.\d+){3}$/.test(u.hostname)||u.hostname.includes(':')||/(?:\.local|\.localhost|\.internal|\.test|\.invalid|\.example)$/.test(u.hostname))throw Error('Use a public HTTP or HTTPS product link without credentials or a custom port.');
 if(u.pathname==='/'||/\/(?:search|account|login|signin|cart|checkout|collections)\/?$/i.test(u.pathname))throw Error('Use the individual product page, not the site homepage.');
 u.hash='';for(const key of [...u.searchParams.keys()]){if(/^(?:token|password|api[_-]?key|authorization|signature)$/i.test(key))throw Error('Use a public product link without access tokens.');if(/^utm_|^(?:fbclid|gclid|affiliate|aff_id|ref)$/i.test(key))u.searchParams.delete(key);}
 return u;
}
const decode=(s:string)=>s.replace(/&(?:amp|quot|apos|lt|gt|nbsp|ndash|mdash|reg|#\d+|#x[\da-f]+);/gi,x=>{
 const named:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&ndash;':'-','&mdash;':'-','&reg;':'®'};
 if(named[x.toLowerCase()])return named[x.toLowerCase()];const n=x.toLowerCase().startsWith('&#x')?parseInt(x.slice(3),16):parseInt(x.slice(2));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
});
const clean=(v:unknown,max=200)=>typeof v==='string'?decode(v).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max):'';
function attrs(tag:string){const out:Record<string,string>={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);return out;}
export function imageURL(raw:unknown,source:URL):string {
 if(typeof raw!=='string'||raw.length>2048)return '';
 try{const u=new URL(raw,source);if(u.protocol==='http:')u.protocol='https:';
 if(u.protocol!=='https:'||u.port||u.username||u.password||!u.hostname.includes('.')||/^\d+(?:\.\d+){3}$/.test(u.hostname)||u.hostname.includes(':')||/(?:\.local|\.localhost|\.internal|\.test|\.invalid|\.example)$/.test(u.hostname)||/logo|placeholder|favicon|icon[-_.]/i.test(u.pathname)||/\.(?:svg|html|js)$/i.test(u.pathname))return '';
 if(u.pathname.includes('/cdn/shop/'))u.searchParams.set('width','1000');return u.href;
 }catch{return '';}
}
function images(value:any):unknown[]{return Array.isArray(value)?value.slice(0,100).flatMap(images):typeof value==='string'?[value]:value&&typeof value==='object'?[value.contentUrl||value.url]:[];}
function productNodes(value:any,depth=0):any[]{
 if(depth>5||!value)return [];if(Array.isArray(value))return value.slice(0,100).flatMap(v=>productNodes(v,depth+1));
 if(typeof value!=='object')return [];
 const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
 if(types.some((t:unknown)=>t==='Product'||t==='ProductGroup'))return [value];
 return productNodes(value['@graph'],depth+1);
}
// Read itemprop scopes as data only. Never execute scripts, event handlers or page instructions.
function microProducts(html:string):any[] {
 const roots:any[]=[],stack:{tag:string;node:any;prop:string;text:string}[]=[];
 const document=html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,'');
 const assign=(node:any,key:string,value:any)=>{if(!node||!key||!value)return;if(key==='offers'||key==='hasVariant'){if(!Array.isArray(node[key]))node[key]=[];if(node[key].length<100)node[key].push(value);}else if(node[key]===undefined)node[key]=value;};
 for(const m of document.matchAll(/<\/?[\w-]+\b[^>]*>|[^<]+/g)){
  const token=m[0];if(token[0]!=='<'){for(const frame of stack)if(frame.prop)frame.text=(frame.text+token).slice(0,1000);continue;}
  const tag=/^<\/?([\w-]+)/.exec(token)?.[1].toLowerCase();if(!tag)continue;
  if(token.startsWith('</')){const index=stack.map(f=>f.tag).lastIndexOf(tag);if(index>=0){for(const f of stack.splice(index).reverse())assign(f.node,f.prop,clean(f.text));}continue;}
  const a=attrs(token),parent=stack.at(-1)?.node;let node=parent,prop=a.itemprop||'';
  if(a.itemtype){node={'@type':a.itemtype.split('/').at(-1)};if(['Product','ProductGroup'].includes(node['@type'])&&roots.length<200)roots.push(node);assign(parent,prop,node);prop='';}
  if(a.content||a.href||a.src){assign(node,prop,a.content||a.href||a.src);prop='';}
  if(!/\/>$/.test(token)&&!['meta','img','link','input','br','hr','source','area','wbr','embed'].includes(tag))stack.push({tag,node,prop,text:''});
  if(stack.length>300)throw Error('Product markup is too deeply nested.');
 }
 return roots;
}
const numeric=(v:unknown):number|null=>{
 if(typeof v!=='number'&&typeof v!=='string')return null;
 if(typeof v==='string'&&!/^\d+(?:\.\d+)?$/.test(v.trim()))return null;
 const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=10000000?n:null;
};
const units:Record<string,{unit:string;factor:number}>={g:{unit:'g',factor:1},grm:{unit:'g',factor:1},gram:{unit:'g',factor:1},grams:{unit:'g',factor:1},kg:{unit:'kg',factor:1000},kgm:{unit:'kg',factor:1000},kilogram:{unit:'kg',factor:1000},kilograms:{unit:'kg',factor:1000},lb:{unit:'lb',factor:453.59237},lbs:{unit:'lb',factor:453.59237},lbr:{unit:'lb',factor:453.59237},pound:{unit:'lb',factor:453.59237},pounds:{unit:'lb',factor:453.59237},oz:{unit:'oz',factor:28.349523125},onz:{unit:'oz',factor:28.349523125},ounce:{unit:'oz',factor:28.349523125},ounces:{unit:'oz',factor:28.349523125}};
function weight(value:any):{value:number|null;unit:string;grams:number|null} {
 const match=typeof value==='string'?/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(clean(value)):null;
 const n=numeric(match?.[1]??value?.value),u=units[clean(match?.[2]??value?.unitCode??value?.unitText).toLowerCase()];
 if(n===null||!u||n*u.factor>1000000)return {value:null,unit:'',grams:null};
 return {value:n,unit:u.unit,grams:Math.round(n*u.factor*1000)/1000};
}
function samePage(value:unknown,source:URL):boolean {try{const u=new URL(String(value),source);return host(u)===host(source)&&u.pathname.replace(/\/collections\/[^/]+\/products\//,'/products/').replace(/\/$/,'')===source.pathname.replace(/\/collections\/[^/]+\/products\//,'/products/').replace(/\/$/,'');}catch{return false;}}
function sameVariant(value:unknown,source:URL):boolean {
 try{const u=new URL(String(value),source);const keys=['variant','color','size','style','sku','option','pack','packsize'].filter(k=>source.searchParams.has(k));return !!keys.length&&samePage(u.href,source)&&keys.every(k=>u.searchParams.get(k)===source.searchParams.get(k));}catch{return false;}
}
function skuOptions(html:string,root:any):any[] {
 const choices:any[]=[];
 const data=html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,'');
 for(const match of data.matchAll(/<label\b[^>]*>([\s\S]{0,3000}?)<\/label>/gi)){
  const input=/<input\b[^>]*>/i.exec(match[1]);if(!input)continue;const a=attrs(input[0]);
  if(a.name!=='sku'||a.type!=='radio'||!a.value)continue;
  const label=clean(/<span\b[^>]*class="[^"]*option-label[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(match[1])?.[1]||match[1]);if(!label)continue;
  const picture=/<img\b[^>]*>/i.exec(match[1]);choices.push({name:clean(root?.name)+' - '+label,sku:clean(a.value,100),image:picture?attrs(picture[0]).src:'',_markup:true,weight:null,additionalProperty:[]});if(choices.length===100)break;
 }
 return choices.length>1?choices:[];
}
// Only explicitly labeled nutrition/ingredient blocks are read. No reviews, marketing
// prose, recipe totals, image OCR, shipping weights or unlabeled numbers are inferred.
function labeledFoodFacts(html:string) {
 const data=html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,'');
 function block(label:string){const match=new RegExp('<(?:h[1-6]|summary|span|strong|dt|th)\\b[^>]*>\\s*'+label+'\\s*<\\/(?:h[1-6]|summary|span|strong|dt|th)>','i').exec(data);if(!match)return '';const part=data.slice(match.index+match[0].length,match.index+match[0].length+12000);return part.split(/<\/(?:toggle-tab|section)>|<(?:h[1-6]|summary)\b|<(?:span|strong|dt|th)\b[^>]*>\s*(?:Ingredients|Nutrition Facts|Allergens?|Certifications)\s*</i)[0];}
 const ingredientBlock=block('Ingredients'),nutritionBlock=block('Nutrition Facts'),allergenBlock=block('Allergens?');
 const lines=(part:string)=>part.replace(/<br\b[^>]*>|<\/(?:p|li|tr|div)>/gi,'\n').split('\n').map(line=>clean(line,1000)).filter(Boolean);
 const nutritionLines=lines(nutritionBlock),ingredients=clean(/<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(ingredientBlock)?.[1],1000);
 const allergens=lines(allergenBlock).join(' ').slice(0,1000)||lines(ingredientBlock).filter(line=>/^(?:contains|may contain|allergens?\s*:)/i.test(line)).join(' ').slice(0,1000);
 const specs:{name:string;pattern:RegExp}[]=[{name:'calories',pattern:/^(?:Calories(?: per serving)?)[\s:]+(.+)$/i},{name:'proteinContent',pattern:/^Protein[\s:]+(.+)$/i},{name:'carbohydrateContent',pattern:/^Total Carb(?:ohydrate)?s?\.?[\s:]+(.+)$/i},{name:'fatContent',pattern:/^Total Fat[\s:]+(.+)$/i},{name:'fiberContent',pattern:/^(?:-\s*)?(?:Dietary )?Fiber[\s:]+(.+)$/i},{name:'sugarContent',pattern:/^(?:-\s*)?Total Sugars[\s:]+(.+)$/i},{name:'sodiumContent',pattern:/^Sodium[\s:]+(.+)$/i}];
 const nutrition=specs.flatMap(({name,pattern})=>{const value=nutritionLines.map(line=>pattern.exec(line)?.[1]).find(v=>v&&/^\d/.test(v));return value?[{name,value:value.slice(0,200)}]:[];});
 // Some accessible custom elements expose their visible calorie label as attributes.
 for(const match of nutritionBlock.matchAll(/<nutritional-info\b[^>]*>/gi)){const a=attrs(match[0]);if(a['data-title-label-left']==='Calories per serving'&&/^\d+(?:\.\d+)?$/.test(a['data-title-label-right']||'')&&!nutrition.some(n=>n.name==='calories'))nutrition.push({name:'calories',value:a['data-title-label-right']+' per serving'});}
 return {ingredients,allergens,nutrition,servingSize:nutritionLines.map(line=>/^Serving size[\s:]+(.+)$/i.exec(line)?.[1]).find(Boolean)||'',servingBasis:nutritionLines.find(line=>/^(?:About )?\d+(?:\.\d+)? servings? per (?:container|package|pack)\b/i.test(line))||''};
}
export interface ManufacturerPreview {
 name:string;brand:string;model:string;sku:string;category:string;price:number|null;currency:string;
 weightValue:number|null;weightUnit:string;weightGrams:number|null;sourceURL:string;imageURL:string;caption:string;checkedAt:string;
 variants:{key:string;label:string}[];selectedVariant:string;missing:string[];attribution:string;
 facts:ProductFacts;
}
export function extractProduct(html:string,rawURL:string,variantKey=''):ManufacturerPreview {
 const source=manufacturerURL(rawURL),meta:Record<string,string>={};
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);if(a.property||a.name)meta[a.property||a.name]=a.content||'';}
 const nodes:any[]=[];
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(attrs(m[1]).type?.toLowerCase()!=='application/ld+json')continue;
  try{nodes.push(...productNodes(JSON.parse(m[2])));}catch{/* malformed data is skipped */}
 }
 nodes.push(...microProducts(html));
 const root=nodes.find(n=>samePage(n.url,source))||nodes[0];
 const productPath=/\/(products?|p)\/[^/]+/i.test(source.pathname)||/\/Headlamps\//i.test(source.pathname);
 if(!root&&meta['og:type']!=='product'&&!productPath)throw Error('No product details found. Use an individual product page.');
 const candidates:any[]=Array.isArray(root?.hasVariant)?root.hasVariant.slice(0,100):Array.isArray(root?.offers)&&root.offers.length>1?root.offers.slice(0,100).map((o:any)=>({...o,offers:o})):skuOptions(html,root);
 const choices=candidates.map((v,i)=>({key:'variant-'+i,label:clean(v.name||v.sku||v.color||v.size)||'Configuration '+(i+1)}));
 let selected=candidates.findIndex(v=>[v.url,v['@id'],v.offers?.url].some(u=>sameVariant(u,source)));
 if(selected<0&&host(source)==='sitkagear.com'){const color=source.pathname.split('/').at(-1)?.replaceAll('-',' ');if(color)selected=candidates.findIndex(v=>clean(v.name).toLowerCase().includes(color.toLowerCase()));}
 if(variantKey){selected=choices.findIndex(v=>v.key===variantKey);if(selected<0)throw Error('This variant is no longer available. Import the page again.');}
 const unresolved=candidates.length>0&&selected<0;
 const variant=selected>=0?candidates[selected]:null;
 const node=variant?{...root,...variant,brand:variant.brand||root.brand}:root;
 const name=clean(node?.name||root?.name||meta['og:title']);
 if(!name||/404|not found|access denied|just a moment/i.test(name))throw Error('The product page could not be read.');
 let offers:any=node?.offers;if(Array.isArray(offers))offers=offers.length===1?offers[0]:null;
 const commonPrice=offers?.['@type']==='AggregateOffer'&&numeric(offers.lowPrice)!==null&&numeric(offers.lowPrice)===numeric(offers.highPrice)?offers.lowPrice:null;
 const price=unresolved?null:variant?._markup?numeric(commonPrice):numeric(offers?.price??offers?.priceSpecification?.price??commonPrice??meta['product:price:amount']??meta['og:price:amount']);
 const currency=unresolved?'':clean(offers?.priceCurrency??offers?.priceSpecification?.priceCurrency??meta['product:price:currency']??meta['og:price:currency'],40).toUpperCase();
 const properties=Array.isArray(node?.additionalProperty)?node.additionalProperty.slice(0,1000):[];
 const prop=(name:RegExp)=>properties.find((p:any)=>name.test(clean(p?.name)));
 let weightBasis:ProductFacts['weightBasis']='unknown';
 const net=prop(/^net (?:weight|content)$/i),pack=prop(/^(?:pack|package) weight$/i);
 let rawWeight=net||pack||(unresolved?(candidates[0]?._markup?undefined:root?.weight):node?.weight);if(rawWeight)weightBasis=net?'net':pack?'pack':'product';
 if(!rawWeight){const p=prop(/^weight$/i);if(p){rawWeight=p;weightBasis='product';}}
 // Mystery Ranch weight is a labeled product spec, separate from its load capacity.
 if(!rawWeight&&host(source)==='mysteryranch.com'){
  const block=/<h5\b[^>]*>\s*Weight\s*<\/h5>([\s\S]{0,1000}?)(?=<h5|<\/section|$)/i.exec(html)?.[1]||'';
  rawWeight=clean(/<div\b[^>]*data-unit-system="metric"[^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1]||/<div\b[^>]*data-unit-system="us"[^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1]);
  if(rawWeight)weightBasis='product';
 }
 const w=weight(rawWeight);
 const nutrition=node?.nutrition&&typeof node.nutrition==='object'?node.nutrition:{};
 const manufacturer=clean(node?.manufacturer?.name||node?.manufacturer,80),seller=clean(offers?.seller?.name||offers?.seller||meta['og:site_name'],80);
 const count=numeric(node?.numberOfServings??nutrition.numberOfServings??prop(/^servings(?: per (?:container|pack|package))?$/i)?.value);
 const facts:ProductFacts={manufacturer,seller,parentCompany:clean(node?.manufacturer?.parentOrganization?.name,80),weightBasis:w.grams===null?'unknown':weightBasis,servingCount:count!==null&&count>0&&count<=10000?count:null,servingSize:clean(nutrition.servingSize||prop(/^serving size$/i)?.value,200),nutrition:['calories','proteinContent','carbohydrateContent','fatContent','fiberContent','sugarContent','sodiumContent'].flatMap(name=>{const value=clean(nutrition[name],200);return value?[{name,value}]:[];}),ingredients:clean(node?.ingredients||prop(/^ingredients$/i)?.value,1000),allergens:clean(node?.allergens||prop(/^allergens?$|^contains$/i)?.value,1000),identityEvidence:clean(node?.brand?.name||node?.brand,80)||manufacturer?'page-stated':'unknown'};
 const food=labeledFoodFacts(html);facts.ingredients||=food.ingredients;facts.allergens||=food.allergens;facts.servingSize||=food.servingSize;facts.servingBasis=food.servingBasis||clean(prop(/^serving basis$/i)?.value,200);facts.packSize=clean(node?.size||prop(/^pack(?:age)? size$/i)?.value,200)||clean(/\b\d+[ -]pack\b/i.exec(variant?.name||'')?.[0],200);for(const n of food.nutrition)if(!facts.nutrition.some(v=>v.name===n.name))facts.nutrition.push(n);
 const pictures=unresolved?images(root?.['@type']==='ProductGroup'?root?.image:null):[...images(node?.image),meta['og:image:secure_url'],meta['og:image']];
 const picture=pictures.map(x=>imageURL(x,source)).find(Boolean)||'';
 let reference=source;const variantURL=variant?.url||variant?.offers?.url||variant?.['@id'];if(variantURL&&samePage(variantURL,source))reference=manufacturerURL(new URL(variantURL,source).href);
 const brand=clean(node?.brand?.name||node?.brand,80);
 const model=clean(node?.model?.name||node?.model,100),sku=unresolved?'':clean(node?.sku||offers?.sku,100),category=clean(root?.category?.name||root?.category,200);
 const currencyCode=/^[A-Z]{3}$/.test(currency)?currency:'';
 const missing=[!name&&'name',!brand&&'brand',!model&&'model',!sku&&'SKU',!category&&'category',price===null&&'price',!currencyCode&&'currency',!picture&&'image',w.value===null&&'weight'].filter(Boolean) as string[];
 return {name,brand,model,sku,category,price,currency:currencyCode,weightValue:w.value,weightUnit:w.unit,weightGrams:w.grams,sourceURL:reference.href,imageURL:picture,caption:'Product-page reference. Confirm size, color, pack size and accessories.',checkedAt:new Date().toISOString().slice(0,10),variants:choices,selectedVariant:selected>=0?choices[selected].key:'',missing,facts,attribution:'Imported from '+host(source)+'. Source-stated product reference; legal maker identity, specifications and prices need review.'};
}
export function publicAddress(address:string):boolean {
 if(address.includes(':')){try{const a=new URL('http://['+address+']/').hostname.slice(1,-1).toLowerCase();const second=parseInt(a.split(':')[1]||'0',16);return /^2[0-9a-f]{3}:/.test(a)&&!a.startsWith('2002:')&&!(a.startsWith('2001:')&&(second<0x200||second===0xdb8));}catch{return false;}}
 const octets=address.split('.').map(Number);if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b,c]=octets;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export type ResolveHost=(hostname:string)=>Promise<string[]>;
async function resolvePublic(hostname:string):Promise<string[]> {
 if(typeof Deno==='undefined')throw Error('A server DNS resolver is required.');
 const results=await Promise.allSettled([Deno.resolveDns(hostname,'A'),Deno.resolveDns(hostname,'AAAA')]);
 return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
export async function fetchManufacturer(rawURL:string,request:typeof fetch|undefined=undefined,resolve:ResolveHost=resolvePublic,variantKey=''):Promise<ManufacturerPreview> {
 let target=manufacturerURL(rawURL);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 const bounded=<T>(promise:Promise<T>):Promise<T>=>new Promise((yes,no)=>{
  const abort=()=>no(Error('The product website took too long. Try again.'));
  controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted){abort();return;}
  promise.then(yes,no).finally(()=>controller.signal.removeEventListener('abort',abort));
 });
 try{
  for(let redirects=0;redirects<=3;redirects++){
   const addresses=await bounded(resolve(target.hostname));if(!addresses.length||addresses.some(a=>!publicAddress(a)))throw Error('The product host did not resolve to a public website.');
   const r=await bounded(request?request(target,{signal:controller.signal,redirect:'manual',headers:{Accept:'text/html','User-Agent':'HunterOS/0.7 product-details-reference'}}):pinnedPageRequest(target,addresses,controller.signal));
   if([301,302,303,307,308].includes(r.status)){
    const location=r.headers.get('location');await r.body?.cancel();if(!location)throw Error('Invalid product redirect.');
    const next=new URL(location,target);
    target=manufacturerURL(next.href);continue;
   }
   if(!r.ok){await r.body?.cancel();throw Error(r.status===403||r.status===429?'This website blocked the lookup. Open the product page and enter its details manually.':'The product website could not provide this page. Try again later.');}
   if(!r.headers.get('content-type')?.toLowerCase().includes('text/html')){await r.body?.cancel();throw Error('Use a product page link, not a file download.');}
   const reader=r.body?.getReader();if(!reader)throw Error('Empty product response.');
   let size=0,html='';const decoder=new TextDecoder();
   try{while(true){const {done,value}=await bounded(reader.read());if(done)break;size+=value.length;if(size>4000000)throw Error('Product page is too large to import.');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{void reader.cancel().catch(()=>{});}
   const preview=extractProduct(html,target.href,variantKey);
   if(preview.imageURL){try{const imageHost=new URL(preview.imageURL).hostname,ips=await bounded(resolve(imageHost));if(!ips.length||ips.some(ip=>!publicAddress(ip)))throw Error('Private image host');}catch{preview.imageURL='';if(!preview.missing.includes('image'))preview.missing.push('image');}}
   return preview;
  }
  throw Error('Too many product redirects.');
 }finally{clearTimeout(timer);}
}
