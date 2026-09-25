import { fetchManufacturer, manufacturerURL, type ManufacturerPreview } from './source.ts';
const categories=['Pack system','Shelter & sleep','Clothing','Water & food','Food & nutrition','Camp comfort','Electronics & power','Hunt essentials','Navigation & safety','Other'];
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const cache=new Map<string,{at:number;value:ManufacturerPreview}>();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
function product(preview:ManufacturerPreview,category:string){return {
 id:'import-preview',name:preview.name,brand:preview.brand,model:preview.name.slice(0,100),variant:'',category,
 kind:'Community product',weightGrams:null,weightLabel:'Enter your measured weight',weightCheckedAt:'',priceUSD:null,priceCheckedAt:'',
 sourceURL:preview.sourceURL,purchaseURL:preview.sourceURL,checkedAt:preview.checkedAt,
 note:'Manufacturer picture imported by a HunterOS member. Specifications have not been independently verified.',tags:['community'],
 carry:category==='Food & nutrition'?'consumable':'packed',reviewStatus:'community',
 photo:{url:preview.imageURL,sourceURL:preview.sourceURL,caption:preview.caption,checkedAt:preview.checkedAt,rights:'reference-preview'}
};}
function sourceKey(url:string){const u=manufacturerURL(url);u.hostname=u.hostname.replace(/^www\./,'');u.pathname=u.pathname.replace(/\/collections\/[^/]+\/products\//,'/products/').replace(/\/$/,'');u.searchParams.sort();return u.href;}
export async function handleProductImport(req:Request,env:(key:string)=>string|undefined,request:typeof fetch=fetch){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const base=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!anon||!secret)return reply({error:'Product imports are temporarily unavailable.'},503);
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer [\w.-]+$/.test(authorization))return reply({error:'Sign in to import a manufacturer picture.'},401);
 try{
  const auth=await request(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:authorization},signal:AbortSignal.timeout(8000)});
  if(!auth.ok)return reply({error:'Sign in again to import this product.'},401);
  const user=await auth.json();if(!user.id||user.is_anonymous||!user.email_confirmed_at)return reply({error:'A verified account is required.'},401);
  const text=await req.text();if(text.length>4096)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(text)}catch{return reply({error:'Invalid request.'},400)}
  const url=manufacturerURL(body.url).href;
  if(!['preview','publish'].includes(body.action)||!categories.includes(body.category))return reply({error:'Choose a product category.'},400);
  async function rpc(name:string,data:unknown){const r=await request(base+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Shared catalog is temporarily unavailable. Your local gear is safe.');return r.json();}
  if(!await rpc('reserve_product_import',{p_user:user.id}))return reply({error:'Daily import limit reached. Try again tomorrow.'},429);
  const key=sourceKey(url),saved=cache.get(key);let preview=saved&&Date.now()-saved.at<3600000?saved.value:await fetchManufacturer(url,request);
  if(!saved||Date.now()-saved.at>=3600000){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),value:preview});}
  const p=product(preview,body.category);
  if(body.action==='preview')return reply({product:p});
  // Whitelist the outgoing schema; never accept notes, measured weights, names, images or account details from the client.
  const published=await rpc('publish_manufacturer_product',{p_user:user.id,p_key:key,p_product:p});
  return reply({product:published});
 }catch(e){return reply({error:e instanceof Error&&e.name!=='AbortError'?e.message:'The manufacturer took too long. Try again.'},400);}
}
if(typeof Deno!=='undefined')Deno.serve((req:Request)=>handleProductImport(req,key=>Deno.env.get(key)));
