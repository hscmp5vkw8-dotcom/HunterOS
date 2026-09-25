import type { Carry, Category, Filters, Gear, Product, Trip, TripType, Workspace } from './types.ts';
export const CATEGORIES: Category[] = ['Pack system','Shelter & sleep','Clothing','Water & food','Food & nutrition','Camp comfort','Electronics & power','Hunt essentials','Navigation & safety','Other'];
export const TRIP_TYPES: TripType[] = ['Hunting','Camping','Hunting + Camping','Backpacking'];
export const STYLES = ['Backcountry','Base Camp','Day Hunt','Horseback'] as const;
export const uid = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
export const fresh = (): Workspace => ({schema:'hunteros.mobile',version:1,trips:[],gear:[],favorites:[],scannedProducts:[]});
export const weight = (g: number | null) => g === null ? 'Weight not entered' : `${(g / 453.59237).toFixed(2)} lb · ${Math.round(g)} g`;
export const money = (v: number | null) => v === null ? 'Price not checked' : v.toLocaleString('en-US',{style:'currency',currency:'USD'});
export const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[.×]/g,c=>c==='×'?'x':'').replace(/[^a-z0-9]+/g,' ').trim();
export function filterProducts(products: Product[], f: Filters): Product[] {
  const words=normalize(f.query||'').split(' ').filter(Boolean);
  return products.filter(p=>(!f.brand||p.brand===f.brand)&&(!f.category||p.category===f.category)&&(!f.photosOnly||!!p.photo)&&(!f.knownWeight||p.weightGrams!==null)&&(!f.favorites||f.favorites.includes(p.id))&&words.every(w=>normalize([p.name,p.kind,p.category,...p.tags].join(' ')).includes(w))).sort((a,b)=>{
    if(f.sort==='price')return (a.priceUSD??Infinity)-(b.priceUSD??Infinity)||a.name.localeCompare(b.name);
    if(f.sort==='weight')return (a.weightGrams??Infinity)-(b.weightGrams??Infinity)||a.name.localeCompare(b.name);
    if(f.sort==='name')return a.name.localeCompare(b.name);
    return Number(!!b.photo)-Number(!!a.photo)||a.name.localeCompare(b.name);
  });
}
export function newGear(name='',category: Category='Other',slot='',carry: Carry='packed'): Gear {
  return {id:uid(),name,category,slot,grams:null,price:null,calories:null,quantity:1,carry,owned:false,packed:false,note:'',product:null};
}
export function fromProduct(p: Product, owned=false): Gear {
  return {...newGear(p.name,p.category,'',p.carry),product:{...p},grams:p.weightGrams,price:p.priceUSD,owned};
}
export function generateChecklist(type: TripType, style: Trip['style'], days: number): Gear[] {
  const list=[newGear('Backpack / carry system','Pack system','pack'),newGear('Footwear','Clothing','boots','worn'),newGear('Clothing and spare layers','Clothing','layers'),newGear('Rain protection','Clothing','rain'),newGear('Water treatment','Water & food','filter'),newGear('Water carried — enter quantity and weight','Water & food','water','consumable'),newGear('Daily food supply — weight per day','Food & nutrition','food','consumable'),newGear('Headlamp + backup lighting','Electronics & power','light'),newGear('Navigation and route backup','Navigation & safety','navigation'),newGear('First aid and emergency plan','Navigation & safety','safety')];
  list.find(i=>i.slot==='food')!.quantity=days;
  if(style!=='Day Hunt')list.push(newGear('Shelter / camp arrangement','Shelter & sleep','tent'),newGear('Sleeping bag or quilt','Shelter & sleep','bag'),newGear('Sleeping pad','Shelter & sleep','pad'),newGear('Cook system + fuel','Water & food','stove'));
  else list.push(newGear('Emergency shelter','Navigation & safety','shelter'));
  if(type==='Hunting'||type==='Hunting + Camping')list.push(newGear('Optics','Hunt essentials','optics'),newGear('License, tags and current rules review','Hunt essentials','tags'),newGear('Field care and pack-out plan','Hunt essentials','field'));
  if(type==='Camping')list.push(newGear('Camp comfort / seating','Camp comfort','chair'));
  return list;
}
export function totals(items: Gear[]) {
  let carried=0,worn=0,food=0,unknownWeight=0,missingCost=0,unknownPrice=0,calories=0,unknownCalories=0,packed=0;
  for(const i of items){
    if(i.grams===null){if(i.carry!=='worn')unknownWeight++;}else if(i.carry==='worn')worn+=i.grams*i.quantity;else{carried+=i.grams*i.quantity;if(i.carry==='consumable')food+=i.grams*i.quantity;}
    if(!i.owned){if(i.price===null)unknownPrice++;else missingCost+=i.price*i.quantity;}
    if(i.category==='Food & nutrition'){if(i.calories===null)unknownCalories++;else calories+=i.calories*i.quantity;}
    if(i.packed)packed++;
  }
  return {carried,worn,food,unknownWeight,missingCost,unknownPrice,calories,unknownCalories,packed,progress:items.length?Math.round(packed/items.length*100):0};
}
export const isHunting = (t: Trip) => t.type==='Hunting'||t.type==='Hunting + Camping';
export function suggestions(products: Product[],t: Trip): Product[] {
  const kinds=['Pack + frame','Rain jacket','Water filter','Headlamp',...(isHunting(t)?['Binoculars']:[]),...(t.style!=='Day Hunt'?['Backpacking tent','Sleeping pad','Cook system']:[])];
  return kinds.flatMap(kind=>{const p=products.filter(p=>p.kind===kind&&!t.items.some(i=>i.product?.id===p.id)).sort((a,b)=>Number(!!b.photo)-Number(!!a.photo))[0];return p?[p]:[];});
}
const txt=(v: unknown,max=200): string=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid text in backup.');return v;};
const finite=(v: unknown,min=0,max=1000000,nullable=false): number|null=>{if(nullable&&v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid number in backup.');return v;};
export function https(v: unknown): string { if(!v)return '';const u=new URL(txt(v,2048));if(u.protocol!=='https:'||u.username||u.password)throw Error('Only HTTPS source links are allowed.');return u.href; }
export function validateGear(v: any,locker=false): Gear {
  if(!v||typeof v!=='object'||!CATEGORIES.includes(v.category))throw Error('Invalid gear entry.');
  const i: Gear={id:txt(v.id,100),name:txt(v.name),category:v.category,quantity:finite(v.quantity,1,999)! as number,grams:finite(v.grams,0,1000000,true),price:finite(v.price,0,10000000,true),calories:finite(v.calories??null,0,100000,true),carry:v.carry,owned:locker?true:v.owned,packed:locker?false:v.packed,note:txt(v.note??'',2000),slot:txt(v.slot??'',80),product:null};
  if(!i.id||!i.name.trim()||!Number.isInteger(i.quantity)||!['packed','worn','consumable'].includes(i.carry)||typeof i.owned!=='boolean'||typeof i.packed!=='boolean')throw Error('Invalid gear details.');
  if(v.product){const p=v.product;i.product={id:txt(p.id,100),name:txt(p.name),brand:txt(p.brand,80),model:txt(p.model,100),variant:txt(p.variant??'',200),category:i.category,kind:txt(p.kind??'',80),weightGrams:finite(p.weightGrams,0,1000000,true),weightLabel:txt(p.weightLabel??'',200),weightCheckedAt:txt(p.weightCheckedAt??'',40),priceUSD:finite(p.priceUSD,0,10000000,true),priceCheckedAt:txt(p.priceCheckedAt??'',40),sourceURL:https(p.sourceURL),purchaseURL:https(p.purchaseURL),checkedAt:txt(p.checkedAt??'',40),note:txt(p.note??'',2000),tags:Array.isArray(p.tags)?p.tags.slice(0,50).map((x:unknown)=>txt(x,100)):[],carry:i.carry,photo:p.photo?{url:https(p.photo.url),sourceURL:https(p.photo.sourceURL),caption:txt(p.photo.caption??'',400),checkedAt:txt(p.photo.checkedAt??'',40),rights:'reference-preview'}:null,reviewStatus:p.reviewStatus==='source-checked'?'source-checked':'legacy-reference'};}
  return i;
}
export function validateWorkspace(v: any): Workspace {
  if(v?.schema!=='hunteros.mobile'||v.version!==1||!Array.isArray(v.trips)||v.trips.length>200||!Array.isArray(v.gear)||v.gear.length>3000||!Array.isArray(v.favorites)||v.favorites.length>5000)throw Error('Not a supported HunterOS mobile backup.');
  const s=fresh();s.scannedProducts=Array.isArray(v.scannedProducts)?v.scannedProducts.slice(0,10000).map((x:any)=>({id:txt(x.id,100),code:txt(x.code,200),codeType:txt(x.codeType??'',40),firstScannedAt:txt(x.firstScannedAt??'',40),lastScannedAt:txt(x.lastScannedAt??'',40),scanCount:finite(x.scanCount??1,1,100000)! as number,product:x.product?validateGear({id:'scan-product',name:x.product.name||x.code,category:x.product.category||'Other',quantity:1,grams:x.product.weightGrams??null,price:x.product.priceUSD??null,calories:null,carry:x.product.carry||'packed',owned:true,packed:false,note:'',slot:'',product:x.product},true).product:null})):[];s.favorites=[...new Set<string>(v.favorites.map((x:unknown)=>txt(x,100)))];
  s.gear=v.gear.map((g:any)=>validateGear(g,true));
  s.trips=v.trips.map((t:any)=>{if(!TRIP_TYPES.includes(t.type)||!STYLES.includes(t.style)||!Array.isArray(t.items)||t.items.length>3000)throw Error('Invalid trip in backup.');const trip: Trip={id:txt(t.id,100),name:txt(t.name),type:t.type,region:txt(t.region),area:txt(t.area??'',300),date:txt(t.date??'',10),days:finite(t.days,1,90)! as number,people:finite(t.people??1,1,30)! as number,style:t.style,species:txt(t.species??'',80),low:finite(t.low,-80,150)! as number,high:finite(t.high,-80,150)! as number,notes:txt(t.notes??'',5000),items:t.items.map((g:any)=>validateGear(g))};if(!trip.id||!trip.name.trim()||!Number.isInteger(trip.days)||!Number.isInteger(trip.people)||trip.low>trip.high)throw Error('Invalid trip values.');if(trip.date&&!/^\d{4}-\d{2}-\d{2}$/.test(trip.date))throw Error('Use YYYY-MM-DD dates.');unique(trip.items);return trip;});unique(s.gear);unique(s.trips);return s;
}
function unique(a:{id:string}[]){if(new Set(a.map(x=>x.id)).size!==a.length)throw Error('Duplicate identifiers in backup.');}
export function importBackup(v:any): Workspace {
  if(v?.schema==='hunteros.mobile')return validateWorkspace(v);
  if(v?.schema!=='hunteros.preview'||![2,3,4].includes(v.version)||!Array.isArray(v.hunts)||!Array.isArray(v.gear))throw Error('Unsupported backup file.');
  const convert=(i:any)=>({...i,calories:null,slot:i.recSlot||'',product:null});
  return validateWorkspace({schema:'hunteros.mobile',version:1,favorites:[],gear:v.gear.map(convert),trips:v.hunts.map((h:any)=>({id:h.id,name:h.name,type:h.tripType||'Hunting',region:h.state||'',area:h.locationNote||'',date:h.date||'',days:h.days,people:1,style:h.style,species:h.species||'',low:h.low,high:h.high,notes:'Imported from browser prototype. Weather/offline badges were not carried over.',items:h.items.map(convert)}))});
}
