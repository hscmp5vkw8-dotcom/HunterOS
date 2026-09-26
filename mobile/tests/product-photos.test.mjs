import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { manufacturerURL,imageURL,extractProduct,fetchManufacturer } from '../supabase/functions/product-import/source.ts';
import { handleProductImport } from '../supabase/functions/product-import/index.ts';
import { gearProduct,mergeCatalog,readProduct,productKey,exactProduct } from '../src/shared-products.ts';
import { fresh,fromProduct,validateWorkspace,importBackup } from '../src/domain.ts';
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const page='https://kifaru.net/products/test-pack';
const html=(data)=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
const data={ '@type':'Product',name:'Test Pack',brand:{name:'Kifaru'},image:'https://kifaru.net/cdn/shop/files/test-pack.jpg'};
test('photo expansion preserves original configurations and source provenance',()=>{
 const original=JSON.parse(readFileSync(new URL('../data/catalog-source.json',import.meta.url),'utf8'));
 for(const product of original)assert.ok(catalog.some(p=>p.id===product.id));assert.ok(catalog.filter(p=>p.photo).length>=103);
 for(const p of catalog.filter(p=>p.photo)){assert.ok(manufacturerURL(p.photo.sourceURL));assert.ok(imageURL(p.photo.url,new URL(p.photo.sourceURL)));assert.ok(p.photo.checkedAt);}
});
test('only known manufacturer HTTPS URLs can be fetched',()=>{
 for(const url of ['http://kifaru.net/products/a','https://kifaru.net.evil.test/products/a','https://user:pass@kifaru.net/products/a','https://kifaru.net:8080/products/a','https://localhost/products/a','https://127.0.0.1/a','https://169.254.169.254/a','https://kifaru.net/'])assert.throws(()=>manufacturerURL(url),url);
 assert.equal(manufacturerURL(page+'?utm_source=x&variant=123#details').href,page+'?variant=123');
});
test('product structured data wins over a generic logo',()=>{
 const p=extractProduct('<meta property="og:image" content="https://kifaru.net/logo.png">'+html(data),page);
 assert.match(p.imageURL,/test-pack/);assert.equal(p.name,'Test Pack');
});
test('graph and image objects are supported; malformed scripts never execute',()=>{
 const p=extractProduct('<script type="application/ld+json">throw new Error()</script>'+html({'@graph':[{'@type':'Organization',image:'logo'}, {...data,image:{contentUrl:data.image}}]}),page);
 assert.equal(p.brand,'Kifaru');assert.match(p.imageURL,/test-pack/);
});
test('specific variant keeps its own picture',()=>{
 const group={'@type':'ProductGroup',name:'Pack',hasVariant:[{...data,name:'Red pack',image:'https://kifaru.net/red.jpg',url:page+'?variant=1'},{...data,name:'Green pack',image:'https://kifaru.net/green.jpg',url:page+'?variant=2'}]};
 assert.match(extractProduct(html(group),page+'?variant=2').imageURL,/green/);
});
test('logo-only, executable and unrelated image hosts are rejected',()=>{
 for(const url of ['https://kifaru.net/logo.jpg','https://tracker.evil.test/photo.jpg','javascript:alert(1)','data:image/png;base64,test','https://127.0.0.1/a.jpg'])assert.equal(imageURL(url,new URL(page)),'');
 assert.throws(()=>extractProduct(html({...data,image:'https://kifaru.net/logo.jpg'}),page));
});
test('redirects cannot turn the resolver into an arbitrary network proxy',async()=>{
 let calls=0;await assert.rejects(fetchManufacturer(page,async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})}),/another website/);assert.equal(calls,1);
});
test('oversized and non-HTML manufacturer responses fail safely',async()=>{
 await assert.rejects(fetchManufacturer(page,async()=>new Response('x'.repeat(4000001),{headers:{'content-type':'text/html'}})),/too large/);
 await assert.rejects(fetchManufacturer(page,async()=>new Response('{}',{headers:{'content-type':'application/json'}})),/product page/);
});
test('pictures survive save, backup, restore and independent trip copies',()=>{
 const p={...catalog.find(p=>p.photo),id:'community-test',reviewStatus:'community'};const g=fromProduct(p,true);g.grams=123;g.note='PRIVATE';
 const s={...fresh(),gear:[g]};const out=importBackup(JSON.parse(JSON.stringify(validateWorkspace(s))));assert.deepEqual(out.gear[0].product.photo,p.photo);assert.equal(out.gear[0].grams,123);assert.equal(out.gear[0].product.reviewStatus,'community');
 const copy=structuredClone(out.gear[0]);copy.product.photo.caption='Trip caption';assert.notEqual(copy.product.photo.caption,out.gear[0].product.photo.caption);
});
test('new catalog pictures enrich old gear without altering personal values',()=>{
 const p=catalog.find(p=>p.photo),g=fromProduct({...p,photo:null},true);g.grams=12;g.note='Private';const before=structuredClone(g);
 assert.equal(gearProduct(g,catalog).photo.url,p.photo.url);assert.deepEqual(g,before);
});
test('exact name matches attach a picture only when the configuration is unambiguous',()=>{
 const p=catalog.find(p=>p.id==='x-exo-mtn-gear-k4-5000');assert.equal(exactProduct(p.name,catalog)?.photo?.url,p.photo.url);
 assert.equal(exactProduct('Maven B.6',catalog),null);assert.equal(exactProduct('',catalog),null);assert.equal(exactProduct('random backpack',catalog),null);
});
test('shared merges deduplicate source links and retain bundled variants',()=>{
 const p=catalog[0],shared={...p,id:'community-same',sourceURL:p.sourceURL+'?utm_source=x'};
 assert.equal(mergeCatalog(catalog,[shared]).length,catalog.length);assert.equal(productKey('https://www.kifaru.net/collections/packs/products/44-mag/?utm_source=x'),productKey('https://kifaru.net/products/44-mag'));
 assert.throws(()=>readProduct({...p,photo:{...p.photo,url:'javascript:alert(1)'}}));
});
const env=k=>({SUPABASE_URL:'https://db.example',SUPABASE_ANON_KEY:'anon-test',SUPABASE_SERVICE_ROLE_KEY:'server-test'})[k];
test('server rejects unauthenticated imports before touching a manufacturer',async()=>{
 let requests=0;const r=await handleProductImport(new Request('https://fn.example',{method:'POST',body:'{}'}),env,async()=>{requests++;throw Error('must not call')});assert.equal(r.status,401);assert.equal(requests,0);
});
test('publishing accepts only manufacturer data and never leaks client private fields',async()=>{
 let stored;const request=async(url,init)=>{
  if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'user-test',email_confirmed_at:'2026-01-01'});
  if(String(url).includes('reserve_product_import'))return Response.json(true);
  if(String(url).includes('publish_manufacturer_product')){stored=JSON.parse(init.body);return Response.json({...stored.p_product,id:'community-test'});}
  return new Response(html(data),{headers:{'content-type':'text/html'}});
 };
 const r=await handleProductImport(new Request('https://fn.example',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({url:page,category:'Pack system',action:'publish',name:'PRIVATE NAME',note:'PRIVATE NOTE',grams:123,imageURL:'https://evil.test/a.jpg',userId:'forged'})}),env,request);
 assert.equal(r.status,200);assert.equal(stored.p_user,'user-test');assert.equal(stored.p_product.name,'Test Pack');assert.equal(stored.p_product.weightGrams,null);assert.ok(!JSON.stringify(stored).includes('PRIVATE'));assert.ok(!JSON.stringify(stored).includes('evil.test'));
});
test('rate limiting stops outbound manufacturer lookup',async()=>{
 let manufacturerCalls=0;const request=async url=>{if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'test',email_confirmed_at:'2026-01-01'});if(String(url).includes('reserve_product_import'))return Response.json(false);manufacturerCalls++;throw Error('not allowed')};
 const r=await handleProductImport(new Request('https://fn.example',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({url:page,category:'Other',action:'preview'})}),env,request);assert.equal(r.status,429);assert.equal(manufacturerCalls,0);
});

test('new outdoor categories import without publishing personal fields',async()=>{
 for(const category of ['Recovery & towing','Tools & tires','Vehicle storage','Riding protection']){
  const request=async url=>String(url).endsWith('/auth/v1/user')?Response.json({id:'test',email_confirmed_at:'2026-01-01'}):String(url).includes('reserve_product_import')?Response.json(true):new Response(html(data),{headers:{'content-type':'text/html'}});
  const r=await handleProductImport(new Request('https://fn.example',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({url:page,category,action:'preview'})}),env,request);
  assert.equal(r.status,200);assert.equal((await r.json()).product.category,category);
 }
});
test('additional image CDNs are restricted to their observed manufacturer',()=>{
 assert.ok(imageURL('https://res.cloudinary.com/leki/image/upload/poles.jpg',new URL('https://www.leki.com/products/poles')));
 assert.equal(imageURL('https://res.cloudinary.com/leki/image/upload/poles.jpg',new URL(page)),'');
 assert.throws(()=>manufacturerURL('https://us.leatt.com.evil.test/products/helmet'));
});
