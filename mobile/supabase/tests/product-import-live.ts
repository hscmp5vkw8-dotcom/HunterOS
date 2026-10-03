// Optional read-only public-network smoke check. No Supabase project, auth,
// publication, credentials, account mutations or access-control bypass are used.
import {fetchManufacturer} from '../functions/product-import/source.ts';
const targets=[
 {name:'tester Mystery Ranch link',url:'https://www.mysteryranch.com/pop-up-30-pack',variant:'variant-0'},
 {name:'ordinary retailer snack',url:'https://www.fleetfeet.com/products/gu-energy-stroopwafel',variant:'variant-0'},
 {name:'food serving and pack-size reference',url:'https://shop.equalexchange.coop/collections/chocolate-bars/products/organic-dark-chocolate-almond-sea-salt-55-cacao',variant:'variant-0'},
];
let failed=false;
for(const target of targets){try{
 const initial=await fetchManufacturer(target.url),selected=initial.variants.length?await fetchManufacturer(target.url,undefined,undefined,target.variant):initial;
 if(!selected.name||!selected.sourceURL||initial.variants.length&&!selected.selectedVariant)throw Error('Expected source details and explicit selection.');
 console.log(JSON.stringify({test:target.name,source:target.url,initial,selected}));
 }catch(error){failed=true;console.log(JSON.stringify({test:target.name,error:String(error)}));}}
if(failed)Deno.exit(1);
