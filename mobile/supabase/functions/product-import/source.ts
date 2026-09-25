// Shared by the Edge Function and offline catalog import/tests. Never execute page scripts.
export const manufacturers:Record<string,string>={
 'kifaru.net':'Kifaru','mavenbuilt.com':'Maven','sitkagear.com':'SITKA','durstongear.com':'Durston',
 'sawyer.com':'Sawyer','petzl.com':'Petzl','westernmountaineering.com':'Western Mountaineering',
 'cascadedesigns.com':'Cascade Designs','garmin.com':'Garmin','exomtngear.com':'Exo Mtn Gear',
 'mountainhouse.com':'Mountain House','nemoequipment.com':'NEMO','bigagnes.com':'Big Agnes',
 'helinox.com':'Helinox','peakrefuel.com':'PEAK REFUEL','grayl.com':'GRAYL',
 'cnocoutdoors.com':'CNOC Outdoors','kenetrek.com':'Kenetrek','goalzero.com':'Goal Zero',
 'snowpeak.com':'Snow Peak','argalioutdoors.com':'Argali','bioliteenergy.com':'BioLite',
 'aeropress.com':'AeroPress','gsioutdoors.com':'GSI Outdoors','darntough.com':'Darn Tough',
 'expedusa.com':'EXPED','rumpl.com':'Rumpl','backpackerspantry.com':"Backpacker's Pantry",
 'goodto-go.com':'Good To-Go','heatherschoice.com':"Heather's Choice",
};
const host=(u:URL)=>u.hostname.replace(/^www\./,'');
export function manufacturerURL(raw:unknown):URL{
 if(typeof raw!=='string'||raw.length>2048)throw Error('Paste a manufacturer product link.');
 const u=new URL(raw.trim());
 if(u.protocol!=='https:'||u.port||u.username||u.password||!manufacturers[host(u)])throw Error('This manufacturer is not supported yet. You can still save your gear without a photo.');
 if(u.pathname==='/'||/\/(?:search|account|cart|checkout|collections)\/?$/.test(u.pathname))throw Error('Use the individual product page, not the manufacturer homepage.');
 u.hash='';for(const key of [...u.searchParams.keys()])if(!['variant','color','size','style'].includes(key))u.searchParams.delete(key);
 return u;
}
const decode=(s:string)=>s.replace(/&(?:amp|quot|apos|lt|gt|nbsp|ndash|mdash|reg|#\d+|#x[\da-f]+);/gi,x=>{
 const named:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&ndash;':'–','&mdash;':'—','&reg;':'®'};
 if(named[x])return named[x];const n=x.startsWith('&#x')?parseInt(x.slice(3),16):parseInt(x.slice(2));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
});
const clean=(v:unknown,max=200)=>typeof v==='string'?decode(v).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max):'';
function attrs(tag:string){const out:Record<string,string>={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g))out[m[1].toLowerCase()]=decode(m[3]);return out;}
export function imageURL(raw:unknown,source:URL):string{
 if(typeof raw!=='string'||raw.length>2048)return '';
 try{const u=new URL(raw,source);if(u.protocol==='http:')u.protocol='https:';
 const own=host(u)===host(source);
 const cdn=['cdn.shopify.com','cdn11.bigcommerce.com','res.garmin.com','cdn.prod.website-files.com','www.petzl.com'].includes(u.hostname);
 if(u.protocol!=='https:'||u.port||u.username||u.password||(!own&&!cdn)||/logo|placeholder|favicon|icon[-_.]/i.test(u.pathname)||/\.(?:svg|html|js)$/i.test(u.pathname))return '';
 if(u.pathname.includes('/cdn/shop/'))u.searchParams.set('width','1000');return u.href;
 }catch{return '';}
}
function images(value:any):unknown[]{return Array.isArray(value)?value.flatMap(images):typeof value==='string'?[value]:value&&typeof value==='object'?[value.contentUrl||value.url]:[];}
function productNodes(value:any,depth=0):any[]{
 if(depth>5||!value)return [];if(Array.isArray(value))return value.slice(0,100).flatMap(v=>productNodes(v,depth+1));
 if(typeof value!=='object')return [];
 const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
 if(types.some((t:string)=>t==='Product'||t==='ProductGroup'))return [value];
 return productNodes(value['@graph'],depth+1);
}
export interface ManufacturerPreview {name:string;brand:string;sourceURL:string;imageURL:string;caption:string;checkedAt:string;}
export function extractProduct(html:string,rawURL:string):ManufacturerPreview{
 const source=manufacturerURL(rawURL),meta:Record<string,string>={};
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);meta[a.property||a.name]=a.content||'';}
 const nodes:any[]=[];
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(attrs(m[1]).type?.toLowerCase()!=='application/ld+json')continue;
  try{nodes.push(...productNodes(JSON.parse(m[2])))}catch{/* malformed metadata must not execute */}
 }
 // Prefer the page's product data over generic social/logo images; select a variant when its URL matches.
 const variant=source.searchParams.get('variant');const color=source.pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-',' ');
 const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 let node=nodes[0];let exactVariant:any;
 for(const n of nodes){if(!Array.isArray(n.hasVariant))continue;
  exactVariant=n.hasVariant.find((v:any)=>variant&&[v.url,v['@id'],v.offers?.url].some(x=>typeof x==='string'&&new URL(x,source).searchParams.get('variant')===variant));
  if(!exactVariant&&host(source)==='sitkagear.com'&&color)exactVariant=n.hasVariant.find((v:any)=>normalize(String(v.name||'')).includes(normalize(color)));
  if(exactVariant){node={...n,...exactVariant,name:variant?exactVariant.name:n.name,brand:exactVariant.brand||n.brand};break;}
 }
 const productPath=/\/(products?|p)\/[^/]+/i.test(source.pathname)||(/\/Headlamps\//i.test(source.pathname));
 if(!node&&meta['og:type']!=='product'&&!productPath)throw Error('No product details found. Use a manufacturer product page.');
 const name=clean(node?.name||meta['og:title']);
 if(!name||/404|not found|access denied|just a moment/i.test(name))throw Error('The manufacturer page could not be read.');
 const candidates=[...images(node?.image),...nodes.flatMap(n=>images(n.image)),meta['og:image:secure_url'],meta['og:image']];
 const picture=candidates.map(x=>imageURL(x,source)).find(Boolean)||'';
 if(!picture)throw Error('No usable product photo found on this page. Your gear can still be saved without one.');
 return {name,brand:clean(node?.brand?.name||node?.brand,80)||manufacturers[host(source)],sourceURL:source.href,imageURL:picture,caption:'Manufacturer product reference. Confirm color, size, model year and included accessories.',checkedAt:new Date().toISOString().slice(0,10)};
}
export async function fetchManufacturer(rawURL:string,request:typeof fetch=fetch):Promise<ManufacturerPreview>{
 let target=manufacturerURL(rawURL);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  for(let redirects=0;redirects<=3;redirects++){
   const r=await request(target,{signal:controller.signal,redirect:'manual',headers:{Accept:'text/html','User-Agent':'HunterOS/0.4 product-photo-reference'}});
   if([301,302,303,307,308].includes(r.status)){const next=new URL(r.headers.get('location')||'',target);await r.body?.cancel();if(host(next)!==host(target))throw Error('Manufacturer redirected to another website. Paste the final product link.');target=manufacturerURL(next.href);continue;}
   if(!r.ok)throw Error('The manufacturer could not provide this page. Try again later.');
   if(!r.headers.get('content-type')?.includes('text/html'))throw Error('Use a product page link, not a file download.');
   const reader=r.body?.getReader();if(!reader)throw Error('Empty manufacturer response.');let size=0;const decoder=new TextDecoder();let html='';
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw Error('Manufacturer page is too large to import.');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel();}
   return extractProduct(html,target.href);
  }
  throw Error('Too many manufacturer redirects.');
 }finally{clearTimeout(timer);}
}
