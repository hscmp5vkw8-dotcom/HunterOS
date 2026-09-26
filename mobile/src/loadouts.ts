import { newGear, uid, validateLoadout } from './domain.ts';
import type { Carry, Category, Gear, Loadout, Trip, TripType, Vehicle } from './types.ts';

type TemplateItem = {name:string;category:Category;slot?:string;carry?:Carry;quantity?:number;note?:string};
export interface LoadoutTemplate {id:string;name:string;description:string;activity:TripType;style:Trip['style'];vehicle?:Vehicle;items:TemplateItem[];}

const hiking:TemplateItem[]=[
  {name:'Daypack',category:'Pack system',slot:'pack'},
  {name:'Trail footwear',category:'Clothing',slot:'boots',carry:'worn'},
  {name:'Rain shell and spare insulation',category:'Clothing',slot:'layers'},
  {name:'Water and treatment',category:'Water & food',slot:'water',carry:'consumable'},
  {name:'Trail meals and snacks',category:'Food & nutrition',slot:'food',carry:'consumable'},
  {name:'Headlamp and spare power',category:'Electronics & power',slot:'light'},
  {name:'Offline route and navigation backup',category:'Navigation & safety',slot:'navigation'},
  {name:'First aid, emergency shelter and sun protection',category:'Navigation & safety',slot:'safety'},
];
const camp:TemplateItem[]=[
  {name:'Tent and stakes',category:'Shelter & sleep',slot:'tent'},
  {name:'Sleeping bag or quilt',category:'Shelter & sleep',slot:'bag'},
  {name:'Sleeping pad',category:'Shelter & sleep',slot:'pad'},
  {name:'Stove, cookware and fuel',category:'Water & food',slot:'stove'},
  {name:'Food storage suited to local rules',category:'Water & food',slot:'food-storage'},
];
const hunt:TemplateItem[]=[
  {name:'License, tags and current rules review',category:'Hunt essentials',slot:'tags'},
  {name:'Optics and harness',category:'Hunt essentials',slot:'optics'},
  {name:'Field care kit and game bags',category:'Hunt essentials',slot:'field'},
  {name:'Hunting equipment and transport case',category:'Hunt essentials',slot:'hunt-equipment'},
];
const ride:TemplateItem[]=[
  {name:'Vehicle inspection, fuel range and route access plan',category:'Navigation & safety',slot:'inspection'},
  {name:'Offline navigation and route backup',category:'Navigation & safety',slot:'navigation'},
  {name:'First aid kit and emergency plan',category:'Navigation & safety',slot:'safety'},
  {name:'Recovery kit rated for this vehicle',category:'Recovery & towing',slot:'recovery',note:'Match every component and recovery point to the vehicle and manufacturer instructions.'},
  {name:'Tire repair kit and pressure gauge',category:'Tools & tires',slot:'tires'},
  {name:'Air compressor or inflator',category:'Tools & tires',slot:'inflator'},
  {name:'Vehicle-specific tool kit and spare parts',category:'Tools & tires',slot:'tools'},
  {name:'Secured storage and tie-downs',category:'Vehicle storage',slot:'storage'},
  {name:'Water supply',category:'Water & food',slot:'water',carry:'consumable'},
  {name:'Trail meals and snacks',category:'Food & nutrition',slot:'food',carry:'consumable'},
  {name:'Radio or other communications and spare power',category:'Electronics & power',slot:'communications'},
  {name:'Headlamp and backup lighting',category:'Electronics & power',slot:'light'},
];
const ridingProtection:TemplateItem={name:'Helmet, eye protection, gloves and riding boots',category:'Riding protection',slot:'protection',carry:'worn'};

export const LOADOUT_TEMPLATES:LoadoutTemplate[]=[
  {id:'hike-day',name:'Day hike essentials',description:'A compact kit for a day on foot.',activity:'Hiking',style:'Day Hike',items:[...hiking]},
  {id:'hike-alpine',name:'Long day and alpine hike',description:'Add layers, trekking poles and extra supplies for a longer day.',activity:'Hiking',style:'Day Hike',items:[...hiking,{name:'Trekking poles',category:'Pack system',slot:'poles'},{name:'Extra insulation, gloves and warm hat',category:'Clothing',slot:'warmth'},{name:'Extra food and water reserve',category:'Food & nutrition',slot:'reserve',carry:'consumable'}]},
  {id:'backpack-overnight',name:'Light overnight backpack',description:'A personal pack with a complete overnight camp.',activity:'Backpacking',style:'Backcountry',items:[...hiking.map(i=>i.slot==='pack'?{...i,name:'Overnight backpack'}:i),...camp]},
  {id:'backpack-multiday',name:'Multiday backpacking',description:'Build on an overnight kit with resupply, repairs and more power.',activity:'Backpacking',style:'Backcountry',items:[...hiking.map(i=>i.slot==='pack'?{...i,name:'Multiday backpack'}:i),...camp,{name:'Repair kit and spare fasteners',category:'Other',slot:'repair'},{name:'Power bank and charging cables',category:'Electronics & power',slot:'power'},{name:'Resupply and meal plan',category:'Food & nutrition',slot:'resupply',carry:'consumable'}]},
  {id:'hunt-day',name:'Day hunt',description:'A daypack, optics and field-care kit.',activity:'Hunting',style:'Day Hunt',items:[...hiking,...hunt]},
  {id:'hunt-backcountry',name:'Backcountry hunting camp',description:'Combine hunting equipment with a pack-out and overnight kit.',activity:'Hunting',style:'Backcountry',items:[...hiking.map(i=>i.slot==='pack'?{...i,name:'Load-hauling pack and frame'}:i),...camp,...hunt,{name:'Pack-out and meat cooling plan',category:'Hunt essentials',slot:'pack-out'}]},
  {id:'camp-weekend',name:'Weekend camp',description:'A comfortable campsite with cooking and seating.',activity:'Camping',style:'Base Camp',items:[...hiking,...camp,{name:'Camp chair',category:'Camp comfort',slot:'chair'},{name:'Lantern',category:'Electronics & power',slot:'lantern'},{name:'Cooler and ice',category:'Water & food',slot:'cooler'}]},
  {id:'camp-family',name:'Family base camp',description:'A reusable starting point for shared camp equipment.',activity:'Camping',style:'Base Camp',items:[...hiking,...camp,{name:'Camp chairs — set quantity for your group',category:'Camp comfort',slot:'chair'},{name:'Camp table',category:'Camp comfort',slot:'table'},{name:'Shade or rain canopy',category:'Camp comfort',slot:'shade'},{name:'Water container and wash station',category:'Water & food',slot:'water-station'},{name:'Cooler and food storage',category:'Water & food',slot:'cooler'},{name:'Trash bags and campsite cleanup kit',category:'Other',slot:'cleanup'}]},
  {id:'atv-trail',name:'ATV trail day',description:'Riding protection, compact recovery gear and trailside tools.',activity:'Four-wheeling',style:'Trail Ride',vehicle:'ATV',items:[...ride,ridingProtection,{name:'ATV-compatible cargo bag',category:'Vehicle storage',slot:'cargo'}]},
  {id:'atv-overnight',name:'ATV overnight camp',description:'A compact camp alongside your ATV trail kit. Check vehicle cargo limits.',activity:'Four-wheeling',style:'Overlanding',vehicle:'ATV',items:[...ride,ridingProtection,...camp,{name:'ATV-compatible cargo bag',category:'Vehicle storage',slot:'cargo'},{name:'Warm layers for camp',category:'Clothing',slot:'warmth'}]},
  {id:'utv-trail',name:'UTV trail day',description:'A side-by-side kit for riders, communications and recovery.',activity:'Four-wheeling',style:'Trail Ride',vehicle:'UTV',items:[...ride,ridingProtection,{name:'Spare drive belt and belt tool — if applicable',category:'Tools & tires',slot:'belt'},{name:'UTV-compatible storage bag',category:'Vehicle storage',slot:'cargo'}]},
  {id:'utv-overnight',name:'UTV overnight camp',description:'Add an overnight camp to your side-by-side setup. Check passenger and cargo limits.',activity:'Four-wheeling',style:'Overlanding',vehicle:'UTV',items:[...ride,ridingProtection,...camp,{name:'Spare drive belt and belt tool — if applicable',category:'Tools & tires',slot:'belt'},{name:'UTV-compatible storage bag',category:'Vehicle storage',slot:'cargo'},{name:'Camp chairs — set quantity for riders',category:'Camp comfort',slot:'chair'}]},
  {id:'4x4-trail',name:'4×4 trail day',description:'A truck or Jeep kit for tire care, recovery and a day on the trail.',activity:'Four-wheeling',style:'Trail Ride',vehicle:'4x4',items:[...ride,{name:'Spare tire, compatible jack and wheel tools',category:'Tools & tires',slot:'spare'},{name:'Traction boards and shovel',category:'Recovery & towing',slot:'traction'},{name:'Work gloves and eye protection',category:'Riding protection',slot:'protection'}]},
  {id:'4x4-overland',name:'4×4 overland camp',description:'Combine vehicle support with a self-contained overnight camp.',activity:'Four-wheeling',style:'Overlanding',vehicle:'4x4',items:[...ride,...camp,{name:'Spare tire, compatible jack and wheel tools',category:'Tools & tires',slot:'spare'},{name:'Traction boards and shovel',category:'Recovery & towing',slot:'traction'},{name:'Camp chairs and table',category:'Camp comfort',slot:'chair'},{name:'Cooler and food storage',category:'Water & food',slot:'cooler'},{name:'Work gloves and eye protection',category:'Riding protection',slot:'protection'}]},
];

export function defaultLoadoutStyle(activity:TripType):Trip['style'] {
  return activity==='Hiking'?'Day Hike':activity==='Four-wheeling'?'Trail Ride':activity==='Camping'?'Base Camp':activity==='Hunting'?'Day Hunt':'Backcountry';
}
/** Copies personal measurements and product snapshots; packing progress never follows a new plan. */
export function copyLoadoutItems(items:Gear[]):Gear[] {
  return items.map(item=>({...JSON.parse(JSON.stringify(item)) as Gear,id:uid(),packed:false}));
}
export function createLoadoutFromTemplate(templateId:string):Loadout {
  const template=LOADOUT_TEMPLATES.find(value=>value.id===templateId);
  if(!template)throw Error('This loadout template could not be found.');
  const {name,activity,style,vehicle,description}=template;
  return validateLoadout({id:uid(),name,activity,style,...(vehicle?{vehicle}:{}),notes:description,items:template.items.map(item=>({...newGear(item.name,item.category,item.slot||'',item.carry||'packed'),quantity:item.quantity??1,note:item.note||''}))});
}
export function createCustomLoadout(name:string,activity:TripType,vehicle?:Vehicle):Loadout {
  return validateLoadout({id:uid(),name:name.trim(),activity,style:defaultLoadoutStyle(activity),...(activity==='Four-wheeling'&&vehicle?{vehicle}:{}),notes:'',items:[]});
}
export function duplicateLoadout(loadout:Loadout,name=`${loadout.name.slice(0,193)} (copy)`):Loadout {
  return validateLoadout({...loadout,id:uid(),name:name.trim(),items:copyLoadoutItems(loadout.items)});
}
export function loadoutFromTrip(trip:Trip,name=trip.name):Loadout {
  return validateLoadout({id:uid(),name:name.trim(),activity:trip.type,style:trip.style,...(trip.vehicle?{vehicle:trip.vehicle}:{}),notes:trip.notes,items:copyLoadoutItems(trip.items)});
}
