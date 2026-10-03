import { fetchManufacturer, manufacturerURL, type ManufacturerPreview, type ResolveHost } from './source.ts';
const categories=['Pack system','Shelter & sleep','Clothing','Water & food','Food & nutrition','Camp comfort','Electronics & power','Hunt essentials','Navigation & safety','Recovery & towing','Tools & tires','Vehicle storage','Riding protection','Other'];
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const cache=new Map<string,{at:number;value:ManufacturerPreview}>();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
function product(preview:ManufacturerPreview,category:string){const map:Record<string,string>={'backpacks':'Pack system','backpack':'Pack system','packs':'Pack system','tents':'Shelter & sleep','food':'Food & nutrition','chocolate':'Food & nutrition','snacks':'Food & nutrition','energy bars':'Food & nutrition','first aid':'Navigation & safety'};const mapped=categories.includes(preview.category)?preview.category:map[preview.category.toLowerCase()]||category;return {
 id:'import-preview',name:preview.name,brand:preview.brand,model:preview.model,variant:preview.variants.find(v=>v.key===preview.selectedVariant)?.label||'',category:mapped,
 kind:'Community product',weightGrams:preview.weightGrams,weightLabel:preview.weightValue===null?'Weight not provided':String(preview.weightValue)+' '+preview.weightUnit+' (source reference)',weightCheckedAt:preview.weightGrams===null?'':preview.checkedAt,priceUSD:preview.currency==='USD'?preview.price:null,priceCheckedAt:preview.price===null?'':preview.checkedAt,
 sourceURL:preview.sourceURL,purchaseURL:preview.sourceURL,checkedAt:preview.checkedAt,
 note:'Source product details imported by a HunterOS member. Confirm your configuration, measured weight and price paid. Specifications have not been independently verified.',tags:['community'],
 carry:mapped==='Food & nutrition'?'consumable':'packed',reviewStatus:'community',
 imported:{facts:preview.facts,sku:preview.sku,price:preview.price,currency:preview.currency,weightValue:preview.weightValue,weightUnit:preview.weightUnit,sourceCategory:preview.category,attribution:preview.attribution,missing:preview.missing,variants:preview.variants,selectedVariant:preview.selectedVariant},
 photo:preview.imageURL?{url:preview.imageURL,sourceURL:preview.sourceURL,caption:preview.caption,checkedAt:preview.checkedAt,rights:'reference-preview'}:null
};}
function sourceKey(url:string){const u=manufacturerURL(url);u.hostname=u.hostname.replace(/^www\./,'');u.pathname=u.pathname.replace(/\/collections\/[^/]+\/products\//,'/products/').replace(/\/$/,'');u.searchParams.sort();return u.href;}
export async function handleProductImport(req:Request,env:(key:string)=>string|undefined,request:typeof fetch=fetch,resolve?:ResolveHost){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const base=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!secret)return reply({error:'Product imports are temporarily unavailable.'},503);
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer [\w.-]+$/.test(authorization))return reply({error:'Sign in to import product details.'},401);
 try{
  const auth=await request(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:authorization},signal:AbortSignal.timeout(8000)});
  if(!auth.ok)return reply({error:'Sign in again to import this product.'},401);
  const user=await auth.json();if(!user.id||user.is_anonymous||!user.email_confirmed_at)return reply({error:'A verified account is required.'},401);
  const text=await req.text();if(text.length>4096)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(text)}catch{return reply({error:'Invalid request.'},400)}
  if(!body||typeof body!=='object')return reply({error:'Invalid request.'},400);
  const url=manufacturerURL(body.url).href;
  const variantKey=body.variantKey??'';if(typeof variantKey!=='string'||variantKey.length>100)return reply({error:'Invalid variant selection.'},400);
  if(!['preview','publish'].includes(body.action)||!categories.includes(body.category))return reply({error:'Choose a product category.'},400);
  const rpc=async(name:string,data:unknown)=>{const r=await request(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret!,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Shared catalog is temporarily unavailable. Your local gear is safe.');return r.json();};
  if(!await rpc('reserve_product_import',{p_user:user.id}))return reply({error:'Daily import limit reached. Try again tomorrow.'},429);
  const lookupKey=sourceKey(url)+'::'+variantKey,saved=cache.get(lookupKey);const preview=saved&&Date.now()-saved.at<3600000?saved.value:await fetchManufacturer(url,request===fetch?undefined:request,resolve,variantKey);
  if(!saved||Date.now()-saved.at>=3600000){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(lookupKey,{at:Date.now(),value:preview});}
  const p=product(preview,body.category);
  if(body.action==='preview')return reply({product:p});
  if(preview.variants.length&&!preview.selectedVariant)return reply({error:'Choose your exact variant before sharing.'},400);
  // Selection choices are preview UI data; keep the persisted reference below the existing 20 KB limit.
  p.imported.variants=[];
  const ref=manufacturerURL(preview.sourceURL),hasSelector=['variant','color','size','style','sku','option','pack','packsize'].some(k=>ref.searchParams.has(k));
  const key=sourceKey(preview.sourceURL)+(!hasSelector&&preview.selectedVariant?'::'+(preview.sku||preview.selectedVariant):'');
  // Whitelist the outgoing schema; never accept notes, measured weights, names, images or account details from the client.
  const published=await rpc('publish_manufacturer_product',{p_user:user.id,p_key:key,p_product:p});
  return reply({product:published});
 }catch(e){return reply({error:e instanceof Error&&e.name!=='AbortError'?e.message:'The product website took too long. Try again.'},400);}
}
if(typeof Deno!=='undefined')Deno.serve((req:Request)=>handleProductImport(req,key=>Deno.env.get(key)));
