import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Button, Card, Chips, ErrorText, Field, Label, Page, s } from '@/ui';
import { generateChecklist, TRIP_TYPES, uid, validTripDate } from '@/domain';
import { copyLoadoutItems } from '@/loadouts';
import { useStore } from '@/store';
import type { Trip, TripType, Vehicle } from '@/types';

export default function NewTrip(){
 const router=useRouter(),params=useLocalSearchParams<{loadoutId?:string;type?:string;vehicle?:string}>(),{state,commit,saving}=useStore();
 const initialLoadout=state.loadouts.find(l=>l.id===params.loadoutId);
 const initialType:TripType=initialLoadout?.activity||(TRIP_TYPES.includes(params.type as TripType)?params.type as TripType:'Hunting + Camping');
 const [loadoutId,setLoadoutId]=useState(initialLoadout?.id||'');
 const [type,setType]=useState<TripType>(initialType),[style,setStyle]=useState<Trip['style']>(initialLoadout?.style||(initialType==='Four-wheeling'?'Trail Ride':initialType==='Hiking'?'Day Hike':'Backcountry'));
 const [vehicle,setVehicle]=useState<Vehicle>(initialLoadout?.vehicle||(['ATV','UTV','4x4'].includes(params.vehicle||'')?params.vehicle as Vehicle:'4x4'));
 const [name,setName]=useState(''),[region,setRegion]=useState('Colorado'),[area,setArea]=useState(''),[date,setDate]=useState(''),[days,setDays]=useState(initialLoadout?(['Day Hike','Day Hunt','Trail Ride'].includes(initialLoadout.style)?'1':'2'):initialType==='Hiking'||initialType==='Four-wheeling'?'1':'5'),[people,setPeople]=useState('1'),[species,setSpecies]=useState('Elk'),[low,setLow]=useState('25'),[high,setHigh]=useState('60'),[notes,setNotes]=useState(initialLoadout?.notes||''),[error,setError]=useState('');
 const loadout=state.loadouts.find(l=>l.id===loadoutId);
 function changeType(value:TripType){setType(value);setLoadoutId('');setStyle(value==='Four-wheeling'?'Trail Ride':value==='Hiking'?'Day Hike':'Backcountry');}
 function selectLoadout(id:string){setLoadoutId(id);const l=state.loadouts.find(x=>x.id===id);if(l){setType(l.activity);setStyle(l.style);if(l.vehicle)setVehicle(l.vehicle);setNotes(l.notes);}}
 async function save(){setError('');try{
  if(!name.trim()||!region.trim())throw Error('Enter a trip name and region.');
  if(!validTripDate(date))throw Error('Enter a real calendar date in YYYY-MM-DD format, or leave it blank.');
  if(!days.trim()||!people.trim()||!low.trim()||!high.trim())throw Error('Enter days, people and your temperature assumptions.');
  if(loadoutId&&!loadout)throw Error('This loadout no longer exists. Choose another starting point.');
  const t:Trip={id:uid(),name:name.trim(),region:region.trim(),type,style,...(type==='Four-wheeling'?{vehicle}:{}),area,date,days:Number(days),people:Number(people),species:type==='Hunting'||type==='Hunting + Camping'?species:'',low:Number(low),high:Number(high),notes,items:loadout?copyLoadoutItems(loadout.items):generateChecklist(type,style,Number(days))};
  await commit(s=>({...s,trips:[t,...s.trips]}));router.replace({pathname:'/trip/[id]',params:{id:t.id}});
 }catch(e){setError(e instanceof Error?e.message:String(e));}}
 return <Page><Label>01 / THE ADVENTURE</Label><Text style={s.title}>{'Start with where\nyou’re going.'}</Text><Text style={s.body}>Every trip gets its own checklist. Start fresh or reuse a saved loadout.</Text>
  <Chips values={TRIP_TYPES} value={type} onChange={v=>changeType(v as TripType)}/>
  <Card><Label>STARTING LOADOUT</Label><Button secondary title={loadout?'Use a fresh checklist instead':'Fresh activity checklist selected'} onPress={()=>setLoadoutId('')}/>{state.loadouts.filter(l=>l.activity===type).map(l=><Button key={l.id} secondary title={`${l.id===loadoutId?'✓ ':''}${l.name}`} onPress={()=>selectLoadout(l.id)}/>)}{loadout?<Text style={s.small}>{loadout.items.length} items will be copied. Review food, water and fuel quantities for this trip’s duration and group size.</Text>:<Button secondary title="Browse starter loadouts" onPress={()=>router.push({pathname:'/loadouts',params:{activity:type,...(type==='Four-wheeling'?{vehicle}:{})}})}/>}</Card>
  {type==='Four-wheeling'?<><Label>YOUR VEHICLE</Label><Chips values={['ATV','UTV','4x4']} value={vehicle} onChange={v=>{setVehicle(v as Vehicle);if(loadout?.vehicle&&loadout.vehicle!==v)setLoadoutId('');}}/><Text style={s.small}>4x4 includes trucks and Jeeps. Match equipment to your vehicle’s rated recovery points, tires and mounting system.</Text></>:null}
  <Field label="Trip name" placeholder={type==='Four-wheeling'?'Weekend trail run':type==='Hiking'?'Alpine lake day hike':'Fall elk camp'} value={name} onChangeText={setName} maxLength={200}/><Field label="State / region" value={region} onChangeText={setRegion} maxLength={200}/><Field label="Camp, trailhead or area" value={area} onChangeText={setArea} placeholder="Optional. Not a map pin." maxLength={300}/><Field label="Start date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="Optional" autoCapitalize="none" maxLength={10}/><Field label="Number of days" value={days} onChangeText={setDays} keyboardType="number-pad" maxLength={2}/><Field label="People on trip" value={people} onChangeText={setPeople} keyboardType="number-pad" maxLength={2}/>
  <Label>02 / YOUR SETUP</Label><Chips values={type==='Four-wheeling'?['Trail Ride','Overlanding','Base Camp']:type==='Hiking'?['Day Hike','Backcountry']:type==='Hunting'||type==='Hunting + Camping'?['Backcountry','Base Camp','Day Hunt','Horseback']:['Backcountry','Base Camp']} value={style} onChange={v=>setStyle(v as Trip['style'])}/>{(type==='Hunting'||type==='Hunting + Camping')?<Field label="Species" value={species} onChangeText={setSpecies} maxLength={80}/>:null}
  <Field label="Expected low °F (your assumption)" value={low} onChangeText={setLow} keyboardType="numbers-and-punctuation" maxLength={4}/><Field label="Expected high °F (your assumption)" value={high} onChangeText={setHigh} keyboardType="numbers-and-punctuation" maxLength={4}/><Text style={s.small}>25–60°F are example values. Adjust for your trip.</Text><Field label="Trip notes / check-in plan" value={notes} onChangeText={setNotes} multiline maxLength={5000}/><ErrorText message={error}/><Button testID="create-trip" title={saving?'Saving…':'Create trip'} disabled={saving} onPress={()=>void save()}/>
 </Page>;
}
