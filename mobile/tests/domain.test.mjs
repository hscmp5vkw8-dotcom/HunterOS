import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterProducts, fresh, fromProduct, generateChecklist, https, importBackup, newGear, totals, validateGear, validateWorkspace, validTripDate } from '../src/domain.ts';
import { decodeSaved } from '../src/load-workspace.ts';
const products=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const trip=()=>({id:'trip-1',name:'Test trip',type:'Camping',region:'Colorado',area:'',date:'',days:3,people:1,style:'Backcountry',species:'',low:25,high:60,notes:'',items:generateChecklist('Camping','Backcountry',3)});
const state=()=>({...fresh(),trips:[trip()]});
test('migrates 131 configurations without duplicate IDs',()=>{assert.equal(products.length,131);assert.equal(new Set(products.map(p=>p.id)).size,products.length);});
test('legacy specs are not silently stamped verified',()=>{assert.ok(products.some(p=>p.reviewStatus==='legacy-reference'&&!p.weightCheckedAt));});
test('photo references are actual HTTPS links with attribution',()=>{const photos=products.filter(p=>p.photo);assert.ok(photos.length>=6);for(const p of photos){assert.ok(https(p.photo.url));assert.ok(p.photo.sourceURL);assert.equal(p.photo.rights,'reference-preview');}});
test('corrects Durston typical setup without mutating original HTML',()=>{const p=products.find(p=>p.id==='durston-xmid2-2026');assert.equal(p.weightGrams,975);assert.match(p.weightLabel,/support poles excluded/);});
test('all generated products round-trip through strict gear validation',()=>{for(const p of products)assert.doesNotThrow(()=>validateGear(fromProduct(p)));});
test('camping omits hunting-only equipment',()=>{const list=generateChecklist('Camping','Backcountry',3);assert.ok(!list.some(i=>i.category==='Hunt essentials'));assert.ok(list.some(i=>i.slot==='chair'));});
test('hunting plus camping includes tags and camp',()=>{const list=generateChecklist('Hunting + Camping','Backcountry',5);assert.ok(list.some(i=>i.slot==='tags'));assert.ok(list.some(i=>i.slot==='tent'));});
test('day trips retain emergency shelter without overnight sleep setup',()=>{const list=generateChecklist('Hunting','Day Hunt',1);assert.ok(list.some(i=>i.slot==='shelter'));assert.ok(!list.some(i=>i.slot==='bag'));});
test('duration applies to food quantity',()=>assert.equal(generateChecklist('Camping','Backcountry',7).find(i=>i.slot==='food').quantity,7));
test('worn mass excluded; unchecked planned mass included',()=>{const a={...newGear('Pack'),grams:1000,quantity:2},b={...newGear('Boots'),grams:1200,carry:'worn'};const x=totals([a,b]);assert.equal(x.carried,2000);assert.equal(x.worn,1200);assert.equal(x.progress,0);});
test('packed checkbox never changes planned weight',()=>{const item={...newGear('Tent'),grams:975};assert.equal(totals([item]).carried,totals([{...item,packed:true}]).carried);});
test('unknowns are tracked separately from zeros',()=>{const x=totals([newGear('Unknown'),{...newGear('Document'),grams:0,price:0}]);assert.equal(x.carried,0);assert.equal(x.unknownWeight,1);assert.equal(x.unknownPrice,1);});
test('owned gear excluded from unowned budget',()=>{const a={...newGear('Owned'),price:400,owned:true},b={...newGear('Missing'),price:50,quantity:2};assert.equal(totals([a,b]).missingCost,100);});
test('food calories use package counts and preserve missing data',()=>{const a={...newGear('Meal','Food & nutrition'),quantity:3,calories:600},b=newGear('Snack','Food & nutrition');const x=totals([a,b]);assert.equal(x.calories,1800);assert.equal(x.unknownCalories,1);});
test('filters combine brand and query',()=>{const result=filterProducts(products,{brand:'SITKA',query:'rain'});assert.ok(result.length);assert.ok(result.every(p=>p.brand==='SITKA'));});
test('weight sorting puts unknowns after known weights',()=>{const a=filterProducts(products,{sort:'weight'}),firstUnknown=a.findIndex(p=>p.weightGrams===null);assert.ok(firstUnknown>0);assert.ok(a.slice(firstUnknown).every(p=>p.weightGrams===null));});
test('favorites filter does not pollute ordinary searches',()=>{const a=filterProducts(products,{favorites:[]});assert.equal(a.length,0);assert.equal(filterProducts(products,{}).length,131);});
test('photo-only filter returns only configured photos',()=>{assert.ok(filterProducts(products,{photosOnly:true}).every(p=>p.photo));});
test('valid state round trips and drops unknown root keys',()=>{const s=state();s.extra='untrusted';const out=validateWorkspace(JSON.parse(JSON.stringify(s)));assert.equal(out.trips.length,1);assert.equal(out.extra,undefined);});
test('invalid quantities / NaN / negative weight rejected',()=>{for(const patch of [{quantity:0},{quantity:1.5},{grams:-2},{grams:NaN}])assert.throws(()=>validateGear({...newGear('Gear'),...patch}));});
test('rejects executable source URLs',()=>{assert.throws(()=>https('javascript:alert(1)'));assert.throws(()=>https('https://a:b@example.com/'));});
test('rejects unsupported schemas without mutating caller state',()=>{const s=state();assert.throws(()=>validateWorkspace({...s,version:99}));assert.equal(s.version,1);});
test('rejects duplicate trip and item identifiers',()=>{const s=state();s.trips.push(s.trips[0]);assert.throws(()=>validateWorkspace(s));const s2=state();s2.trips[0].items.push(s2.trips[0].items[0]);assert.throws(()=>validateWorkspace(s2));});
test('rejects reversed temperature bounds',()=>{const s=state();s.trips[0].low=80;s.trips[0].high=10;assert.throws(()=>validateWorkspace(s));});
test('legacy import preserves manual weights and ownership',()=>{const g={...newGear('My actual pack'),grams:2150,owned:true};const s=importBackup({schema:'hunteros.preview',version:4,gear:[g],hunts:[{id:'old-1',name:'Old camp',state:'CO',date:'',days:2,style:'Backcountry',species:'Elk',low:20,high:60,tripType:'Camping',items:[g]}]});assert.equal(s.gear[0].grams,2150);assert.equal(s.trips[0].items[0].owned,true);assert.equal(s.trips[0].type,'Camping');});

test('calendar dates reject impossible days and permit Gregorian leap years',()=>{
  for(const value of ['', '2026-09-23','2024-02-29','2000-02-29','2026-04-30'])assert.equal(validTripDate(value),true,value);
  for(const value of ['2026-02-29','2026-02-31','2026-04-31','1900-02-29','2026-13-01','2026-00-10','2026-01-00','0000-01-01','2026-1-01','not a date'])assert.equal(validTripDate(value),false,value);
});
test('backup import rejects impossible dates without changing source data',()=>{
  const input=state();input.trips[0].date='2026-02-31';
  const before=JSON.stringify(input);assert.throws(()=>importBackup(input),/real calendar date/);
  assert.equal(JSON.stringify(input),before);
});
test('only a missing saved record starts a new workspace',()=>{
  assert.deepEqual(decodeSaved(null),fresh());
  for(const raw of ['', '{broken', 'null', '{}', '{"schema":"hunteros.mobile","version":99}'])assert.throws(()=>decodeSaved(raw));
});
test('saved data preserves complete gear and packing state when loaded',()=>{
  const input=state();input.trips[0].items[0].packed=true;
  input.gear.push({...newGear('My pack'),grams:1000,owned:true});
  input.favorites=[products[0].id];
  assert.deepEqual(decodeSaved(JSON.stringify(input)),input);
});
