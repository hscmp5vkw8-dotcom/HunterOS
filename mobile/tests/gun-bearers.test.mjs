import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractProduct} from '../supabase/functions/product-import/source.ts';
import {handleProductImport} from '../supabase/functions/product-import/index.ts';
import {fresh,fromProduct,importBackup,validateWorkspace} from '../src/domain.ts';
const url='https://kifaru.net/products/gun-bearers';
const data=JSON.parse(readFileSync(new URL('./fixtures/kifaru-gun-bearers.json',import.meta.url),'utf8'));
const page=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';

test('captured Gun Bearers variant selection returns each stated SKU price currency image and product weight',()=>{
 const initial=extractProduct(page(data),url);assert.equal(initial.variants.length,3);assert.equal(initial.selectedVariant,'');assert.equal(initial.sku,'');assert.equal(initial.price,null);
 const expected=[['GB102',49,119.068],['GB101',49,119.068],['UGB103',79,null]];
 for(let i=0;i<3;i++){
  const p=extractProduct(page(data),url,`variant-${i}`),[sku,price,grams]=expected[i];
  assert.equal(p.sku,sku);assert.equal(p.price,price);assert.equal(p.currency,'USD');assert.equal(p.imageURL.includes(i===2?'Universal-Gunbearer':'Upper-Strap'),true);
  assert.equal(p.weightGrams,grams);assert.equal(p.weightValue,i===2?null:4.2);assert.equal(p.weightUnit,i===2?'':'oz');assert.equal(p.facts.weightBasis,i===2?'unknown':'product');
  assert.equal(p.model,'');assert.equal(p.facts.manufacturer,'');assert.equal(p.facts.parentCompany,'');assert.equal(p.sourceURL,data.hasVariant[i].offers.url);
 }
});
test('an exact variant URL and ordinary tracking input use the matching configuration',()=>{
 const p=extractProduct(page(data),data.hasVariant[1].offers.url+'&utm_source=synthetic');assert.equal(p.sku,'GB101');assert.equal(p.selectedVariant,'variant-1');assert.equal(p.weightGrams,119.068);assert.equal(p.sourceURL,data.hasVariant[1].offers.url);
});
test('Kifaru description mass never leaks into Universal other products or other hosts',()=>{
 for(const [source,key,value] of [[url,'variant-2',data],['https://kifaru.net/products/another-product','variant-0',data],['https://unrelated.example.com/products/gun-bearers','variant-0',data]])assert.equal(extractProduct(page(value),source,key).weightGrams,null);
});
test('shipping-only ambiguous or missing-scope description weights remain unknown',()=>{
 for(const description of ['The Kifaru GunBearers - Shipping weight: 4.2oz - Fits belts. Universal GunBearers','The Kifaru GunBearers - Weight: 4-5oz - Fits belts. Universal GunBearers','The Kifaru GunBearers - Weight: 4.2oz - Weight: 5oz - Fits belts. Universal GunBearers','Weight: 4.2oz','Universal GunBearers - Weight: 4.2oz - The Kifaru GunBearers'])assert.equal(extractProduct(page({...data,description}),url,'variant-0').weightGrams,null);
});
test('explicit variant product weight takes precedence over a description fallback',()=>{
 const value=structuredClone(data);value.hasVariant[0].weight={value:130,unitCode:'GRM'};assert.equal(extractProduct(page(value),url,'variant-0').weightGrams,130);
});
test('shipping and unlabeled commerce weights never replace carried product mass',()=>{
 const value=structuredClone(data);for(const v of value.hasVariant){v.shippingWeight={value:198,unitCode:'GRM'};v.offers.shippingDetails={shippingWeight:{value:198,unitCode:'GRM'}};}
 assert.equal(extractProduct(page(value),url,'variant-0').weightGrams,119.068);assert.equal(extractProduct(page(value),url,'variant-2').weightGrams,null);
});
test('Gun Bearers preview keeps verified source facts through private save and backup reopen without publication',async()=>{
 const calls=[];const env=key=>({SUPABASE_URL:'https://db.example',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-server'})[key];
 const request=input=>{const target=String(input);calls.push(target);if(target.endsWith('/auth/v1/user'))return Promise.resolve(Response.json({id:'synthetic',email_confirmed_at:'2026-01-01'}));if(target.endsWith('/reserve_product_import'))return Promise.resolve(Response.json(true));if(target.includes('/rest/'))return Promise.reject(Error('Public writes are prohibited in this fixture'));return Promise.resolve(new Response(page(data),{headers:{'content-type':'text/html'}}));};
 const req=new Request('https://fn.example',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({url,category:'Other',variantKey:'variant-0',action:'preview'})});
 const response=await handleProductImport(req,env,request,()=>Promise.resolve(['93.184.216.34']));assert.equal(response.status,200);const p=(await response.json()).product;
 assert.equal(p.weightGrams,119.068);assert.equal(p.imported.sku,'GB102');assert.equal(p.priceUSD,49);assert.equal(p.photo.rights,'reference-preview');assert.equal(p.imported.facts.weightBasis,'product');
 const gear=fromProduct(p,true);const restored=importBackup(validateWorkspace({...fresh(),gear:[gear]}));
 assert.equal(restored.gear[0].product.imported.sku,'GB102');assert.equal(restored.gear[0].product.imported.currency,'USD');assert.equal(restored.gear[0].product.photo.url,p.photo.url);assert.equal(restored.gear[0].grams,119.068);assert.equal(restored.gear[0].product.imported.facts.manufacturer,'');assert.equal(calls.some(x=>x.includes('publish')),false);
});
