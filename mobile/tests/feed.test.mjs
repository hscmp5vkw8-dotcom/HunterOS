import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recommendedProducts, popularProducts, releasedProducts } from '../src/feed.ts';
import { fresh } from '../src/domain.ts';
const products=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
test('recommendations prioritize saved categories without mutating private workspace or catalog',()=>{
 const state=fresh();state.favorites=[products[20].id];const before=JSON.stringify({state,products});
 const result=recommendedProducts(products,state);
 assert.equal(result[0].category,products[20].category);assert.equal(JSON.stringify({state,products}),before);
});
test('popular feed uses provided counts, filters missing products and does not invent popularity',()=>{
 assert.deepEqual(popularProducts(products,[]),[]);
 const result=popularProducts(products,[{product_id:products[0].id,likes:1,uses:2},{product_id:'unknown',likes:900,uses:500},{product_id:products[1].id,likes:5,uses:4}]);
 assert.equal(result.length,2);assert.equal(result[0].product.id,products[1].id);assert.equal(result[0].likes,5);
});
test('new releases require actual valid dates and https sources, never catalog checkedAt',()=>{
 assert.deepEqual(releasedProducts(products,[]),[]);
 const row={product_id:products[0].id,released_on:'2026-09-20',source_url:'https://manufacturer.example/product'};
 assert.equal(releasedProducts(products,[row],'2026-09-26').length,1);
 for(const bad of [{released_on:'2026-10-01'},{released_on:'2026-02-30'},{released_on:'junk'},{source_url:'javascript:bad()'},{product_id:'unknown'}])assert.equal(releasedProducts(products,[{...row,...bad}],'2026-09-26').length,0);
});
