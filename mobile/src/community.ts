import { fetch } from 'expo/fetch';
import { supabase, session } from './cloud';
import { readProduct } from './shared-products';
import type { Category, Product } from './types';
export async function manufacturerProduct(url:string,category:Category,action:'preview'|'publish'):Promise<Product>{
 const signed=await session();if(!signed)throw Error('Sign in from Settings → Account to import and share a manufacturer product.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(process.env.EXPO_PUBLIC_SUPABASE_URL+'/functions/v1/product-import',{
   method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+signed.access_token,apikey:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY||''},body:JSON.stringify({url,category,action})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Could not import this product. Try again.');
  if((await session())?.user.id!==signed.user.id)throw Error('Your account changed. Import this product again.');
  return readProduct(data.product);
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw Error('Product lookup timed out. Try again when you have a connection.');throw e;}
 finally{clearTimeout(timer);}
}
export async function fetchSharedProducts():Promise<Product[]>{
 if(!supabase)return [];
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const rows:Product[]=[];
  for(let offset=0;offset<10000;offset+=500){const {data,error}=await supabase.from('community_products').select('id,product,created_at').order('created_at').order('id').range(offset,offset+499).abortSignal(controller.signal);if(error)throw error;
   for(const row of data||[]){try{rows.push(readProduct(row.product));}catch{/* a bad reference must not prevent access to other gear */}}
   if(!data||data.length<500)break;
  }return rows;
 }finally{clearTimeout(timer);}
}
