import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '@/store';
import { useCatalog } from '@/use-catalog';
import { totals } from '@/domain';
import { Button, C, Card, Chips, Label, Page, ProductCard, s } from '@/ui';
import type { Vehicle } from '@/types';

const profiles:Record<Vehicle,{name:string;lead:string;mark:string;focus:string[]}> = {
 ATV:{name:'ATV',lead:'Travel light. Keep your trail essentials secured and within reach.',mark:'01',focus:['Riding protection','Tools & tires','Recovery & towing']},
 UTV:{name:'UTV / side-by-side',lead:'Build a kit for the whole crew, from a day ride to a weekend at camp.',mark:'02',focus:['Riding protection','Recovery & towing','Vehicle storage']},
 '4x4':{name:'4×4 trucks & Jeeps',lead:'Organize recovery, trail repairs and everything you need back at camp.',mark:'03',focus:['Recovery & towing','Tools & tires','Vehicle storage']}
};
export default function Offroad(){
 const router=useRouter(),{state}=useStore(),{products}=useCatalog(),[vehicle,setVehicle]=useState<Vehicle>('4x4');
 const profile=profiles[vehicle],trips=state.trips.filter(t=>t.type==='Four-wheeling'&&(!t.vehicle||t.vehicle===vehicle));
 const gear=products.filter(p=>p.tags.includes('off-road')&&p.tags.includes(vehicle.toLowerCase()));
 const loadouts=state.loadouts.filter(l=>l.activity==='Four-wheeling'&&(!l.vehicle||l.vehicle===vehicle));
 return <Page>
  <View style={[s.card,{backgroundColor:'#202b24',padding:24,gap:16,borderColor:'#54674b'}]}>
   <View style={[s.row,{justifyContent:'space-between'}]}><Label>HUNTEROS / FOUR-WHEELING</Label><Text style={{color:C.lime,fontSize:24}}>↟</Text></View>
   <Text style={[s.title,{fontSize:38}]}>{'Beyond the\npavement.'}</Text>
   <Text style={s.body}>Your rig. Your gear. Your next trail day.</Text>
   <Chips values={['ATV','UTV','4x4']} value={vehicle} onChange={v=>setVehicle(v as Vehicle)}/>
   <View style={{borderTopWidth:1,borderTopColor:C.line,paddingTop:16,gap:8}}><Text style={s.h2}>{profile.name}</Text><Text style={s.body}>{profile.lead}</Text></View>
   <Button title="Plan a trail trip" onPress={()=>router.push({pathname:'/trip/new',params:{type:'Four-wheeling',vehicle}})}/>
  </View>
  <View style={[s.row,{alignItems:'stretch'}]}><View style={[s.card,{flex:1,minWidth:125}]}><Text style={s.stat}>{loadouts.length}</Text><Text style={s.small}>saved loadouts</Text></View><View style={[s.card,{flex:1,minWidth:125}]}><Text style={s.stat}>{trips.length}</Text><Text style={s.small}>trail trips</Text></View></View>
  <Card><Label>SET UP ONCE. PACK AGAIN.</Label><Text style={s.h2}>Loadouts for your ride.</Text><Text style={s.body}>Start with a trail-day or overnight kit, then tailor the equipment and quantities to your vehicle.</Text><Button title="Explore four-wheeling loadouts" onPress={()=>router.push({pathname:'/loadouts',params:{activity:'Four-wheeling',vehicle}})}/>{loadouts.slice(0,3).map(l=><Link key={l.id} href={{pathname:'/loadout/[id]',params:{id:l.id}}} style={{color:C.lime,paddingVertical:10}}>{l.name} · {l.items.length} items →</Link>)}</Card>
  <Text style={s.h2}>Equip your vehicle</Text><Text style={s.body}>Browse by use, then confirm the exact size, ratings and fit on the manufacturer’s website.</Text>
  {profile.focus.map((category,i)=><Pressable key={category} accessibilityRole="button" accessibilityLabel={`Browse ${category}`} onPress={()=>router.push({pathname:'/catalog',params:{tripId:'',loadoutId:'',activity:'off-road',vehicle:vehicle.toLowerCase(),category}})} style={[s.card,{flexDirection:'row',alignItems:'center',gap:16}]}><Text style={{fontSize:25,color:C.lime,fontWeight:'700'}}>0{i+1}</Text><View style={{flex:1}}><Text style={s.h2}>{category}</Text><Text style={s.small}>Explore products and direct links</Text></View><Text style={{color:C.lime,fontSize:22}}>→</Text></Pressable>)}
  <Button secondary title="Browse all four-wheeling gear" onPress={()=>router.push({pathname:'/catalog',params:{tripId:'',loadoutId:'',activity:'off-road',vehicle:vehicle.toLowerCase()}})}/>
  {gear.slice(0,2).map(p=><ProductCard key={p.id} product={p}/>)}
  <View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.h2}>Your trail plans</Text><Text style={s.small}>{profile.name}</Text></View>
  {trips.length?trips.map(t=>{const count=totals(t.items);return <Link key={t.id} href={{pathname:'/trip/[id]',params:{id:t.id}}} asChild><Pressable style={s.card}><Label>{t.style}</Label><Text style={s.h2}>{t.name}</Text><Text style={s.body}>{t.region} · {t.days} {t.days===1?'day':'days'}</Text><Text style={s.small}>{count.packed}/{t.items.length} lines packed</Text></Pressable></Link>}):<Card><Text style={s.body}>Your {profile.name} trips will appear here. Add a destination, equipment and a check-in plan to get started.</Text></Card>}
 </Page>;
}
