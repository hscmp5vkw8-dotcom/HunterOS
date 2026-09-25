import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { catalog } from './catalog';
import { fetchSharedProducts } from './community';
import { readCatalogCache,writeCatalogCache } from './catalog-cache';
import { mergeCatalog, readProduct } from './shared-products';
import type { Product } from './types';
let shared:Product[]=[],snapshot={products:catalog,loading:false,error:''},started=false,lastRefresh=0,inflight:Promise<void>|undefined;
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};};
const getSnapshot=()=>snapshot;
function update(loading=false,error=''){snapshot={products:mergeCatalog(catalog,shared),loading,error};listeners.forEach(fn=>fn());}
export function rememberSharedProduct(product:Product){shared=[...shared.filter(p=>p.id!==product.id),product];update();void writeCatalogCache(JSON.stringify(shared)).catch(()=>{});lastRefresh=0;}
export function refreshCatalog(force=false):Promise<void>{
 if(inflight)return inflight;if(!force&&lastRefresh&&Date.now()-lastRefresh<60000)return Promise.resolve();
 inflight=(async()=>{
  update(true);if(!started){started=true;try{const raw=await readCatalogCache();if(raw){const values=JSON.parse(raw);if(Array.isArray(values))shared=values.slice(0,10000).flatMap(p=>{try{return [readProduct(p)]}catch{return []}});update(true);}}catch{}}
  try{shared=await fetchSharedProducts();lastRefresh=Date.now();update();await writeCatalogCache(JSON.stringify(shared));}catch{update(false,'Shared catalog could not refresh. Saved products are still available.');}
 })().finally(()=>{inflight=undefined});return inflight;
}
export function useCatalog(){const state=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);useFocusEffect(useCallback(()=>{void refreshCatalog();},[]));return {...state,refresh:()=>refreshCatalog(true)};}
