import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, fromProduct, generateChecklist, importBackup, newGear, suggestions, validateLoadout, validateWorkspace } from '../src/domain.ts';
import { copyLoadoutItems, createCustomLoadout, createLoadoutFromTemplate, duplicateLoadout, LOADOUT_TEMPLATES, loadoutFromTrip } from '../src/loadouts.ts';
import { readCloudBackup } from '../src/cloud-data.ts';
const products=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const trip=()=>({id:'trip1',name:'Trail weekend',type:'Four-wheeling',vehicle:'4x4',style:'Overlanding',region:'CO',area:'',date:'',days:2,people:2,species:'',low:30,high:70,notes:'My actual setup',items:[{...newGear('My tent','Shelter & sleep'),grams:2550,price:199,quantity:2,owned:true,packed:true}]});

test('older v1 device and cloud backups migrate missing loadouts without losing personal data',()=>{
  const original={...fresh(),version:1};delete original.loadouts;
  original.gear=[{...fromProduct(products.find(product=>product.photo)),name:'My customized gear',grams:912,price:48,owned:true}];
  original.favorites=[original.gear[0].product.id];
  const serialized=JSON.stringify(original);
  const restored=importBackup(original);
  assert.equal(restored.version,2);
  assert.deepEqual(restored.loadouts,[]);
  assert.deepEqual(restored.gear,original.gear);
  assert.deepEqual(restored.favorites,original.favorites);
  assert.equal(JSON.stringify(original),serialized);
  const cloud=readCloudBackup({workspace:original,updated_at:'2026-09-25T12:00:00Z'});
  assert.deepEqual(cloud.workspace,restored);
});

test('v2 loadouts and vehicle metadata survive local and cloud round trips',()=>{
  const input={...fresh(),trips:[trip()],loadouts:[loadoutFromTrip(trip())]};
  assert.equal(input.version,2);
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(input))),input);
  assert.deepEqual(readCloudBackup({workspace:input,updated_at:'2026-09-25T12:00:00Z'}).workspace,input);
});

test('all accepted backups write v2 so older v1-only clients cannot silently drop loadouts',()=>{
  // HunterOS 0.4.2's validator rejects version !== 1 before reconstructing a workspace.
  // Every new write must therefore stay v2, even if the imported workspace has no loadouts.
  for(const version of [1,2]){
    const input={...fresh(),version};
    assert.equal(importBackup(input).version,2);
    assert.equal(readCloudBackup({workspace:input,updated_at:'2026-09-25T12:00:00Z'}).workspace.version,2);
    assert.equal(input.version,version);
  }
  for(const version of [0,3,'1','2',null])assert.throws(()=>validateWorkspace({...fresh(),version}));
});

test('starters offer multiple kits for each outdoor activity and all three vehicle types',()=>{
  for(const activity of ['Hiking','Backpacking','Hunting','Camping'])assert.ok(LOADOUT_TEMPLATES.filter(template=>template.activity===activity).length>=2,activity);
  for(const vehicle of ['ATV','UTV','4x4'])assert.ok(LOADOUT_TEMPLATES.filter(template=>template.activity==='Four-wheeling'&&template.vehicle===vehicle).length>=2,vehicle);
  assert.equal(new Set(LOADOUT_TEMPLATES.map(template=>template.id)).size,LOADOUT_TEMPLATES.length);
  for(const template of LOADOUT_TEMPLATES){const loadout=createLoadoutFromTemplate(template.id);assert.doesNotThrow(()=>validateLoadout(loadout));assert.ok(loadout.items.length);assert.ok(loadout.items.every(item=>!item.owned&&!item.packed&&item.grams===null&&item.price===null));}
});

test('saving the same template repeatedly creates independent loadouts and gear IDs',()=>{
  const a=createLoadoutFromTemplate('atv-trail'),b=createLoadoutFromTemplate('atv-trail');
  assert.notEqual(a.id,b.id);
  assert.ok(a.items.every(item=>!b.items.some(other=>other.id===item.id)));
  a.items[0].name='Changed for my ATV';
  assert.notEqual(a.items[0].name,b.items[0].name);
  assert.equal(createLoadoutFromTemplate('atv-trail').items[0].name,b.items[0].name);
});

test('copying a loadout preserves measured values and deep-copies photo and product snapshots',()=>{
  const original={...fromProduct(products.find(product=>product.photo)),name:'Personally fitted pack',grams:2333,price:275,note:'Private measurement',quantity:2,packed:true,owned:true};
  const before=JSON.stringify(original),copied=copyLoadoutItems([original])[0];
  assert.notEqual(copied.id,original.id);assert.equal(copied.packed,false);
  for(const key of ['grams','price','name','quantity','owned','note'])assert.equal(copied[key],original[key]);
  assert.deepEqual(copied.product,original.product);
  copied.product.photo.caption='Different';copied.product.tags.push('changed');
  assert.equal(JSON.stringify(original),before);
});

test('trip snapshots and duplicate loadouts reset packing without changing their source',()=>{
  const source=trip(),before=JSON.stringify(source),saved=loadoutFromTrip(source,'My overland kit');
  assert.equal(saved.name,'My overland kit');assert.equal(saved.vehicle,'4x4');assert.equal(saved.items[0].packed,false);
  assert.notEqual(saved.items[0].id,source.items[0].id);
  const clone=duplicateLoadout(saved);
  assert.notEqual(clone.id,saved.id);assert.notEqual(clone.items[0].id,saved.items[0].id);
  clone.items[0].grams=999;saved.items[0].note='Saved kit note';
  assert.equal(JSON.stringify(source),before);assert.equal(saved.items[0].grams,2550);
});

test('custom loadouts begin empty and use activity-appropriate defaults',()=>{
  assert.deepEqual(createCustomLoadout(' My hiking kit ','Hiking').items,[]);
  assert.equal(createCustomLoadout(' My hiking kit ','Hiking').name,'My hiking kit');
  assert.equal(createCustomLoadout('ATV gear','Four-wheeling','ATV').style,'Trail Ride');
  assert.equal(createCustomLoadout('ATV gear','Four-wheeling','ATV').vehicle,'ATV');
  assert.equal(createCustomLoadout('Foot gear','Hiking','ATV').vehicle,undefined);
  assert.throws(()=>createCustomLoadout(' ','Hiking'));
  assert.throws(()=>createLoadoutFromTemplate('missing'));
});

test('loadout validation rejects malformed metadata, collections and duplicate IDs',()=>{
  const valid=createLoadoutFromTemplate('4x4-overland');
  for(const patch of [{name:' '},{id:' '},{name:'x'.repeat(201)},{activity:'Boating'},{style:'Cruising'},{vehicle:'Truck'},{notes:'x'.repeat(5001)},{items:null},{items:Array(3001).fill(valid.items[0])}])assert.throws(()=>validateLoadout({...valid,...patch}));
  assert.throws(()=>validateLoadout({...valid,items:[valid.items[0],valid.items[0]]}));
  assert.throws(()=>validateWorkspace({...fresh(),loadouts:[valid,valid]}));
  for(const loadouts of [null,{},'bad',Array(201).fill(valid)])assert.throws(()=>validateWorkspace({...fresh(),loadouts}));
  assert.throws(()=>validateLoadout({...valid,items:[{...valid.items[0],grams:-1}]}));
  assert.throws(()=>validateLoadout({...valid,items:[{...valid.items[0],id:' '}]}));
});

test('unknown loadout fields are stripped and invalid trip vehicles are rejected',()=>{
  const loadout=createLoadoutFromTemplate('hike-day');
  assert.equal(validateLoadout({...loadout,untrusted:'discard'}).untrusted,undefined);
  assert.throws(()=>validateWorkspace({...fresh(),trips:[{...trip(),vehicle:'Spaceship'}]}));
  const oldTrip={...trip(),type:'Camping',style:'Base Camp'};delete oldTrip.vehicle;
  assert.equal(validateWorkspace({...fresh(),trips:[oldTrip]}).trips[0].vehicle,undefined);
});

test('hiking and trail rides keep emergency gear while overnight vehicle trips add camp',()=>{
  const hike=generateChecklist('Hiking','Day Hike',1),ride=generateChecklist('Four-wheeling','Trail Ride',1),overnight=generateChecklist('Four-wheeling','Overlanding',3);
  assert.ok(hike.some(item=>item.slot==='shelter'));assert.ok(!hike.some(item=>item.slot==='bag'));
  assert.ok(ride.some(item=>item.category==='Recovery & towing'));assert.ok(!ride.some(item=>item.slot==='bag'));
  assert.ok(overnight.some(item=>item.slot==='bag'));assert.equal(overnight.find(item=>item.slot==='food').quantity,3);
});

test('offroad suggestions respect vehicle browsing tags and skip products already in the trip',()=>{
  const product=(id,category,tags)=>({...products[0],id,name:id,category,tags});
  const atv=product('atv-bag','Vehicle storage',['atv']),truck=product('truck-bag','Vehicle storage',['4x4']);
  const general=product('first-aid','Navigation & safety',[]),tool=product('tool','Tools & tires',['atv','utv']);
  const current={...trip(),vehicle:'ATV',style:'Trail Ride',items:[fromProduct(tool)]};
  const result=suggestions([truck,atv,general,tool,product('camp','Shelter & sleep',[])],current);
  assert.deepEqual(result.map(value=>value.id),['atv-bag','first-aid']);
  assert.ok(suggestions([atv,general,tool,product('camp','Shelter & sleep',[])],{...current,style:'Overlanding'}).some(value=>value.id==='camp'));
});

test('day hike suggestions omit overnight sleep and cooking products',()=>{
  const kinds=['Daypack','Backpacking tent','Sleeping pad','Cook system'];
  const catalog=kinds.map((kind,index)=>({...products[0],id:String(index),kind}));
  const result=suggestions(catalog,{...trip(),type:'Hiking',style:'Day Hike',items:[]});
  assert.deepEqual(result.map(value=>value.kind),['Daypack']);
});
