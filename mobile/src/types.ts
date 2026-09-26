export type TripType = 'Hunting' | 'Camping' | 'Hunting + Camping' | 'Backpacking' | 'Hiking' | 'Four-wheeling';
export type Vehicle = 'ATV' | 'UTV' | '4x4';
export type Carry = 'packed' | 'worn' | 'consumable';
export type Category = 'Pack system' | 'Shelter & sleep' | 'Clothing' | 'Water & food' | 'Food & nutrition' | 'Camp comfort' | 'Electronics & power' | 'Hunt essentials' | 'Navigation & safety' | 'Recovery & towing' | 'Tools & tires' | 'Vehicle storage' | 'Riding protection' | 'Other';
export interface Photo { url:string; sourceURL:string; caption:string; checkedAt:string; rights:'reference-preview'; }
export interface Product {id:string;name:string;brand:string;model:string;variant:string;category:Category;kind:string;weightGrams:number|null;weightLabel:string;weightCheckedAt:string;priceUSD:number|null;priceCheckedAt:string;sourceURL:string;purchaseURL:string;checkedAt:string;note:string;tags:string[];carry:Carry;photo:Photo|null;reviewStatus:'legacy-reference'|'source-checked'|'community';}
export interface Gear {id:string;name:string;category:Category;quantity:number;grams:number|null;price:number|null;calories:number|null;carry:Carry;owned:boolean;packed:boolean;note:string;slot:string;product:Product|null;}
export interface Trip {id:string;name:string;type:TripType;region:string;area:string;date:string;days:number;people:number;style:'Backcountry'|'Base Camp'|'Day Hunt'|'Horseback'|'Day Hike'|'Trail Ride'|'Overlanding';vehicle?:Vehicle;species:string;low:number;high:number;notes:string;items:Gear[];}
export interface Loadout {id:string;name:string;activity:TripType;style:Trip['style'];vehicle?:Vehicle;notes:string;items:Gear[];}
export interface ScanRecord {id:string;code:string;codeType:string;firstScannedAt:string;lastScannedAt:string;scanCount:number;product:Product|null;}
export interface Workspace {schema:'hunteros.mobile';version:2;trips:Trip[];gear:Gear[];favorites:string[];scannedProducts:ScanRecord[];loadouts:Loadout[];}
export interface Filters {query?:string;brand?:string;category?:string;photosOnly?:boolean;knownWeight?:boolean;favorites?:string[]|null;sort?:'featured'|'name'|'weight'|'price';}
