import test from 'node:test';
import assert from 'node:assert/strict';
import { extractProduct } from '../supabase/functions/product-import/source.ts';

const url='https://eberlestock.com/products/foundation';
const page=data=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
const product={'@type':'ProductGroup',name:'Foundation',brand:{name:'Eberlestock'},category:'Outdoor Recreation',hasVariant:[
 {'@type':'Product',name:'Foundation - Dry Earth',sku:'D1ME',image:'/dry-earth.png',url:url+'?variant=47901264675052',offers:{price:449,priceCurrency:'USD'}},
 {'@type':'Product',name:'Foundation - Military Green',sku:'D1MJ',image:'/military-green.png',url:url+'?variant=47901264806124',offers:{price:449,priceCurrency:'USD'}}
]};
const spec=(text,label='Weight')=>'<div class="specs-text"><strong>'+label+':</strong><span class="specs-detail">'+text+'</span></div>';

test('explicit Eberlestock compound specification imports while variant details require selection',()=>{
 const html=page(product)+spec('6 lbs 6 oz');
 const p=extractProduct(html,url);assert.equal(p.weightValue,102);assert.equal(p.weightUnit,'oz');assert.equal(p.weightGrams,2891.651);assert.equal(p.facts.weightBasis,'product');assert.equal(p.price,null);assert.equal(p.sku,'');assert.equal(p.imageURL,'');assert.equal(p.model,'');assert.equal(p.facts.manufacturer,'');
 for(const [index,sku,id,image] of [[0,'D1ME','47901264675052','dry-earth.png'],[1,'D1MJ','47901264806124','military-green.png']]){
  const selected=extractProduct(html,url,'variant-'+index);assert.equal(selected.sku,sku);assert.equal(selected.price,449);assert.equal(selected.currency,'USD');assert.equal(selected.sourceURL,url+'?variant='+id);assert.equal(selected.imageURL,'https://eberlestock.com/'+image);assert.equal(selected.weightGrams,2891.651);
 }
});
test('repeated equivalent specs agree, conflicts and invalid compound values stay unknown',()=>{
 assert.equal(extractProduct(page(product)+spec('6 lbs 6 oz')+spec('102 oz'),url).weightValue,102);
 for(const html of [spec('6 lbs 6 oz')+spec('5 lbs 6 oz'),spec('-6 lbs 6 oz'),spec('6 lbs 16 oz'),spec('6 lbs 6 oz shipping'),spec('90000 lbs 6 oz'),spec('6 lbs 6 oz')+spec('unknown')])assert.equal(extractProduct(page(product)+html,url).weightGrams,null);
});
test('structured mass takes precedence and unrelated page content does not fill product weight',()=>{
 assert.equal(extractProduct(page({...product,weight:{value:2,unitCode:'KGM'}})+spec('6 lbs 6 oz'),url).weightGrams,2000);
 for(const html of ['<p>Shipping weight: 6 lbs 6 oz</p>',spec('6 lbs 6 oz','Shipping weight'),'<p>Review: weighs 6 lbs 6 oz</p>','<script>'+spec('6 lbs 6 oz')+'</script>','<style>'+spec('6 lbs 6 oz')+'</style>','<!--'+spec('6 lbs 6 oz')+'-->','<strong>Weight:</strong><span>6 lbs 6 oz</span>'])assert.equal(extractProduct(page(product)+html,url).weightGrams,null);
 assert.equal(extractProduct(page(product)+spec('6 lbs 6 oz'),'https://other.example.com/products/foundation').weightGrams,null);
});
test('compound structured mass uses exact unit arithmetic with no arbitrary prose inference',()=>{
 for(const value of ['6 lb 6 oz','6 pounds 6 ounces'])assert.equal(extractProduct(page({...product,weight:value}),url).weightValue,102);
 for(const value of ['6-7 lbs 6 oz','about 6 lbs 6 oz','6 lbs 6 oz capacity'])assert.equal(extractProduct(page({...product,weight:value}),url).weightGrams,null);
});
