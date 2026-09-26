import { useState } from 'react';
import { ProductSocial } from '@/product-social';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { useCatalog } from '@/use-catalog';
import { fromProduct, https, money, weight } from '@/domain';
import { useStore } from '@/store';
import { Body, Button, C, Card, Label, Page, ProductPhoto, s } from '@/ui';

export default function ProductDetail(){
 const {products:catalog,loading}=useCatalog(),{id,tripId,loadoutId}=useLocalSearchParams<{id:string;tripId?:string;loadoutId?:string}>(),{state,commit,saving}=useStore(),router=useRouter();
 const [message,setMessage]=useState(''),[chooser,setChooser]=useState<'trip'|'loadout'|null>(null);
 const p=catalog.find(x=>x.id===id)||state.gear.find(g=>g.product?.id===id)?.product||state.trips.flatMap(t=>t.items).find(g=>g.product?.id===id)?.product||state.loadouts.flatMap(l=>l.items).find(g=>g.product?.id===id)?.product;
 if(!p)return <Page><Text style={s.h2}>{loading?'Loading product…':'Product not found'}</Text><Button title="Back to catalog" onPress={()=>router.replace('/catalog')}/></Page>;
 const favorite=state.favorites.includes(id),owned=state.gear.some(g=>g.product?.id===id),trip=state.trips.find(t=>t.id===tripId),loadout=state.loadouts.find(l=>l.id===loadoutId),variants=catalog.filter(x=>x.brand===p.brand&&x.model===p.model&&x.id!==p.id);
 const website=p.purchaseURL||p.sourceURL;const hasProductPage=website?new URL(website).pathname.replace(/\//g,'').length>0:false;
 async function add(kind:'locker'|'trip'|'loadout',target?:string){try{
  await commit(s=>{const list=kind==='loadout'?s.loadouts.find(l=>l.id===target)?.items:kind==='trip'?s.trips.find(t=>t.id===target)?.items:s.gear;if(!list)throw Error('This trip or loadout no longer exists.');if(list.some(g=>g.product?.id===p!.id))throw Error('This configuration is already here. Edit its quantity instead.');list.push(fromProduct(p!,kind==='locker'));return s;});
  setMessage(kind==='locker'?'Saved to your gear locker as owned.':kind==='loadout'?'Added to your reusable loadout.':'Added to your trip.');setChooser(null);
 }catch(e){setMessage(e instanceof Error?e.message:String(e));}}
 async function toggleFavorite(){try{await commit(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]}));}catch(e){setMessage(String(e));}}
 async function open(url:string){try{const safe=https(url);if(!safe)throw Error('Missing link');await Linking.openURL(safe);}catch{setMessage('Could not open the product website. Check your connection and try again.');}}
 return <Page><Stack.Screen options={{title:p.model}}/><ProductPhoto product={p} height={300}/><Label>{p.brand} / {p.kind}</Label><Text style={s.title}>{p.model}</Text><Text selectable style={s.body}>{p.variant||'Select your exact size and configuration with the seller.'}</Text>
  <Button title={hasProductPage?"View product on website ↗":"Visit brand website ↗"} onPress={()=>void open(website)} disabled={!p.purchaseURL&&!p.sourceURL}/><Text style={s.small}>{hasProductPage?"Opens the product website for current options, price and availability.":"A current page for this legacy configuration is unavailable. Opens the brand website."}</Text>
  <View style={s.row}><Button secondary title={favorite?'Saved to favorites ♥':'Save favorite ♡'} onPress={()=>void toggleFavorite()} disabled={saving}/></View>
  <Card><Label>ADD TO YOUR SETUP</Label>{message?<Text selectable accessibilityRole="alert" style={s.body}>{message}</Text>:null}
   {loadout?<><Button title={`Add to ${loadout.name}`} onPress={()=>void add('loadout',loadout.id)} disabled={saving}/><Link href={{pathname:'/loadout/[id]',params:{id:loadout.id}}} style={{color:C.lime,padding:10}}>Return to loadout →</Link></>:null}
   {trip?<><Button title={`Add to ${trip.name}`} onPress={()=>void add('trip',trip.id)} disabled={saving}/><Link href={{pathname:'/trip/[id]',params:{id:trip.id}}} style={{color:C.lime,padding:10}}>Return to trip →</Link></>:null}
   {!loadout?<Button secondary title="Add to a loadout" onPress={()=>setChooser(chooser==='loadout'?null:'loadout')} disabled={saving}/>:null}
   {!trip?<Button secondary title="Add to a trip" onPress={()=>setChooser(chooser==='trip'?null:'trip')} disabled={saving}/>:null}
   {chooser==='loadout'?<><Label>CHOOSE A LOADOUT</Label>{state.loadouts.map(l=><Button key={l.id} secondary title={l.name} onPress={()=>void add('loadout',l.id)} disabled={saving}/>)}{!state.loadouts.length?<Button title="Create a loadout first" onPress={()=>router.push('/loadouts')}/>:null}</>:null}
   {chooser==='trip'?<><Label>CHOOSE A TRIP</Label>{state.trips.map(t=><Button key={t.id} secondary title={t.name} onPress={()=>void add('trip',t.id)} disabled={saving}/>)}{!state.trips.length?<Button title="Build a trip first" onPress={()=>router.push('/trip/new')}/>:null}</>:null}
   <Button secondary title={owned?'Already in your locker':'I own this — add to locker'} onPress={()=>void add('locker')} disabled={owned||saving}/>
  </Card>
  <Card><Text style={s.small}>Reference weight</Text><Text selectable style={s.h2}>{weight(p.weightGrams)}</Text><Text selectable style={s.body}>{p.weightLabel}</Text><Text style={s.small}>{p.weightCheckedAt?`Weight checked against source ${p.weightCheckedAt}.`:'Enter your measured weight after adding it to your equipment.'}</Text><Text selectable style={s.h2}>{money(p.priceUSD)}</Text><Text style={s.small}>{p.priceUSD===null?'Check the product website for current pricing.':`Reference price (${p.priceCheckedAt||p.checkedAt||'date unknown'}). Confirm the exact option, taxes and shipping with the seller.`}</Text></Card>
  <ProductSocial key={p.id} productId={p.id}/><Body>{p.note}</Body>{p.photo?<Card><Label>PICTURE SOURCE</Label><Body>{p.photo.caption}</Body><Button secondary title="Manufacturer picture source" onPress={()=>void open(p.photo!.sourceURL)}/><Text style={s.small}>Reference linked {p.photo.checkedAt}. Photos load from the source and may show another option or accessories. No affiliation is implied.</Text></Card>:null}
  {variants.length?<View style={{gap:12}}><Text style={s.h2}>Other configurations</Text>{variants.map(v=><Link key={v.id} href={{pathname:'/product/[id]',params:{id:v.id,...(tripId?{tripId}:{}),...(loadoutId?{loadoutId}:{})}}} style={{padding:14,borderWidth:1,borderColor:C.line,borderRadius:12,color:C.lime}}>{v.variant||v.name} →</Link>)}</View>:null}
 </Page>;
}
