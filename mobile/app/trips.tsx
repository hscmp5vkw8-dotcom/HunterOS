import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '@/store';
import { useCatalog } from '@/use-catalog';
import { Button, Card, C, Chips, ErrorText, Label, Page, ProductCard, s } from '@/ui';
import { generateChecklist, totals, uid } from '@/domain';
import type { Trip } from '@/types';

export default function Home(){
 const {state,commit,saving}=useStore(),{products}=useCatalog(),router=useRouter(),[error,setError]=useState(''),[activity,setActivity]=useState('All trips');
 const trips=state.trips.filter(t=>activity==='All trips'||t.type===activity||((activity==='Hunting'||activity==='Camping')&&t.type==='Hunting + Camping'));
 async function sample(){try{const t:Trip={id:uid(),name:'Colorado elk · sample',type:'Hunting + Camping',region:'Colorado',area:'Set your trailhead',date:'',days:5,people:1,style:'Backcountry',species:'Elk',low:25,high:60,notes:'Sample assumptions only; not current conditions.',items:generateChecklist('Hunting + Camping','Backcountry',5)};await commit(s=>({...s,trips:[t,...s.trips]}));router.push({pathname:'/trip/[id]',params:{id:t.id}});}catch(e){setError(String(e));}}
 return <Page>
  <View style={{paddingVertical:14,gap:12}}><Label>PLAN LESS. GET OUT THERE.</Label><Text style={[s.title,{fontSize:38}]}>{'One place for\nevery adventure.'}</Text><Text style={s.body}>Hike. Backpack. Hunt. Camp. Hit the trail.</Text></View>
  <Button title="Build a trip" onPress={()=>router.push('/trip/new')}/>
  <Card><View style={[s.row,{justifyContent:'space-between'}]}><Label>YOUR REUSABLE SETUPS</Label><Text style={s.small}>{state.loadouts.length} saved</Text></View><Text style={s.h2}>Pack your way.</Text><Text style={s.body}>Keep a different loadout for every activity. Reuse a favorite setup or make a fresh copy for the next trip.</Text><Button secondary title="Explore loadouts" onPress={()=>router.push('/loadouts')}/></Card>
  <Pressable accessibilityRole="button" accessibilityLabel="Explore four-wheeling" style={[s.card,{backgroundColor:'#202b24',borderColor:'#54674b',flexDirection:'row',alignItems:'center'}]} onPress={()=>router.push('/offroad')}><View style={{flex:1,gap:7}}><Label>ATV · UTV · 4×4</Label><Text style={s.h2}>Beyond the pavement.</Text><Text style={s.body}>Trail trips, recovery gear and vehicle loadouts.</Text></View><Text style={{fontSize:27,color:C.lime}}>→</Text></Pressable>
  <ErrorText message={error}/><View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.h2}>Your trips</Text><Text style={s.small}>{state.gear.length} items in locker</Text></View>
  <Chips values={['All trips','Hiking','Backpacking','Hunting','Camping','Four-wheeling']} value={activity} onChange={setActivity}/>
  {!trips.length?<Card><Text style={s.h2}>{state.trips.length?'No trips for this activity yet.':'Where will you go first?'}</Text><Text style={s.body}>Build a trip to save your destination, equipment and packing progress.</Text>{!state.trips.length?<Button secondary title="Try a sample hunt" onPress={()=>void sample()} disabled={saving}/>:null}</Card>:trips.map(t=>{const x=totals(t.items);return <Link key={t.id} href={{pathname:'/trip/[id]',params:{id:t.id}}} asChild><Pressable style={s.card}><Label>{t.type}{t.vehicle?` / ${t.vehicle==='4x4'?'4×4':t.vehicle}`:''}</Label><Text style={s.h2}>{t.name}</Text><Text style={s.body}>{t.region} · {t.days} {t.days===1?'day':'days'} · {t.style}</Text><View style={{height:5,backgroundColor:C.line,borderRadius:8}}><View style={{height:5,width:`${x.progress}%`,backgroundColor:C.lime,borderRadius:8}}/></View><Text style={s.small}>{x.packed}/{t.items.length} lines packed · {(x.carried/453.59237).toFixed(1)} lb listed{x.unknownWeight?' · partial':''}</Text></Pressable></Link>})}
  <View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.h2}>Find your next piece</Text><Link href="/catalog" style={{color:C.lime,padding:10}}>All gear →</Link></View>
  {products.filter(p=>p.photo).slice(-2).map(p=><ProductCard key={p.id} product={p}/>)}
  <Text style={s.small}>Family beta · Plans save on this device. Cloud backup is optional.</Text>
 </Page>;
}
