export type TripType = 'Hunting' | 'Camping' | 'Hunting + Camping' | 'Backpacking';
export type Carry = 'packed' | 'worn' | 'consumable';
export type Category = 'Pack system' | 'Shelter & sleep' | 'Clothing' | 'Water & food' | 'Food & nutrition' | 'Camp comfort' | 'Electronics & power' | 'Hunt essentials' | 'Navigation & safety' | 'Other';
export interface Photo { url:string; sourceURL:string; caption:string; checkedAt:string; rights:'reference-preview'; }
export interface Product {id:string;name:string;brand:string;model:string;variant:string;category:Category;kind:string;weightGrams:number|null;weightLabel:string;weightCheckedAt:string;priceUSD:number|null;priceCheckedAt:string;sourceURL:string;purchaseURL:string;checkedAt:string;note:string;tags:string[];carry:Carry;photo:Photo|null;reviewStatus:'legacy-reference'|'source-checked';}
export interface Gear {id:string;name:string;category:Category;quantity:number;grams:number|null;price:number|null;calories:number|null;carry:Carry;owned:boolean;packed:boolean;note:string;slot:string;product:Product|null;}
export interface Trip {id:string;name:string;type:TripType;region:string;area:string;date:string;days:number;people:number;style:'Backcountry'|'Base Camp'|'Day Hunt'|'Horseback';species:string;low:number;high:number;notes:string;items:Gear[];}
export interface ScanRecord {id:string;code:string;codeType:string;firstScannedAt:string;lastScannedAt:string;scanCount:number;product:Product|null;}
export interface Workspace {schema:'hunteros.mobile';version:1;trips:Trip[];gear:Gear[];favorites:string[];scannedProducts:ScanRecord[];}
export interface Filters {query?:string;brand?:string;category?:string;photosOnly?:boolean;knownWeight?:boolean;favorites?:string[]|null;sort?:'featured'|'name'|'weight'|'price';}