import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { CATEGORIES, STYLES, totals, TRIP_TYPES, VEHICLES, weight } from '@/domain';
import { defaultLoadoutStyle, duplicateLoadout } from '@/loadouts';
import { gearProduct } from '@/shared-products';
import { useCatalog } from '@/use-catalog';
import { useStore } from '@/store';
import { Body, Button, Card, Chips, ErrorText, Field, Label, Page, ProductPhoto, s } from '@/ui';
import type { Trip, TripType, Vehicle } from '@/types';

export default function LoadoutScreen() {
  const {id}=useLocalSearchParams<{id:string}>(),router=useRouter();
  const {state,commit,saving}=useStore(),{products}=useCatalog();
  const loadout=state.loadouts.find(item=>item.id===id);
  const [name,setName]=useState(loadout?.name||''),[notes,setNotes]=useState(loadout?.notes||'');
  const [activity,setActivity]=useState<TripType>(loadout?.activity||'Hiking');
  const [style,setStyle]=useState<Trip['style']>(loadout?.style||'Day Hike');
  const [vehicle,setVehicle]=useState<Vehicle>(loadout?.vehicle||'ATV');
  const [editing,setEditing]=useState(false),[deleting,setDeleting]=useState(false),[query,setQuery]=useState('');
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  if(!loadout)return <Page><Stack.Screen options={{title:'Loadout'}}/><Text style={s.h2}>Loadout not found</Text><Button title="Back to loadouts" onPress={()=>router.replace('/loadouts')}/></Page>;
  const summary=totals(loadout.items),items=loadout.items.filter(item=>`${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function saveDetails() {
    setError('');setNotice('');
    try {
      await commit(current=>({...current,loadouts:current.loadouts.map(item=>item.id===id?{...item,name:name.trim(),notes,activity,style,vehicle:activity==='Four-wheeling'?vehicle:undefined}:item)}));
      setEditing(false);setNotice('Loadout details saved.');
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  async function duplicate() {
    setError('');setNotice('');
    try {
      const copy=duplicateLoadout(loadout!);
      await commit(current=>({...current,loadouts:[...current.loadouts,copy]}));
      router.push({pathname:'/loadout/[id]',params:{id:copy.id}});
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  async function remove() {
    setError('');
    try {await commit(current=>({...current,loadouts:current.loadouts.filter(item=>item.id!==id)}));router.replace('/loadouts');}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  function editDetails() {setName(loadout!.name);setNotes(loadout!.notes);setActivity(loadout!.activity);setStyle(loadout!.style);setVehicle(loadout!.vehicle||'ATV');setEditing(true);setNotice('');}
  return <Page>
    <Stack.Screen options={{title:loadout.name}}/>
    <Label>{loadout.activity}{loadout.vehicle?` · ${loadout.vehicle==='4x4'?'4×4':loadout.vehicle}`:''}</Label>
    <Text selectable style={s.title}>{loadout.name}</Text>
    <Body>{loadout.items.length} gear entries · {loadout.style}</Body>
    <View style={s.row}>
      <Button title="Build trip from this loadout" disabled={saving||editing} onPress={()=>router.push({pathname:'/trip/new',params:{loadoutId:id,tripId:'',activity:loadout.activity==='Four-wheeling'?'off-road':loadout.activity==='Hunting + Camping'?'hunting':loadout.activity.toLowerCase(),vehicle:loadout.vehicle?.toLowerCase()||'',category:''}})}/>
      <Button title="Duplicate loadout" secondary disabled={saving||editing} onPress={()=>void duplicate()}/>
      <Button title="Edit loadout details" secondary disabled={saving} onPress={editDetails}/>
    </View>
    <ErrorText message={error}/>
    {notice?<Text selectable accessibilityRole="alert" style={s.body}>{notice}</Text>:null}
    {editing?<Card>
      <Field label="Loadout name" value={name} onChangeText={setName} maxLength={200}/>
      <Label>Activity</Label><Chips values={TRIP_TYPES} value={activity} onChange={value=>{setActivity(value as TripType);setStyle(defaultLoadoutStyle(value as TripType));}}/>
      <Label>Trip style</Label><Chips values={[...STYLES]} value={style} onChange={value=>setStyle(value as Trip['style'])}/>
      {activity==='Four-wheeling'?<><Label>Vehicle</Label><Chips values={VEHICLES} value={vehicle} onChange={value=>setVehicle(value as Vehicle)}/></>:null}
      <Field label="Loadout notes" value={notes} onChangeText={setNotes} maxLength={5000} multiline/>
      <View style={s.row}><Button title="Save loadout details" disabled={saving||!name.trim()} onPress={()=>void saveDetails()}/><Button title="Cancel edits" secondary disabled={saving} onPress={()=>setEditing(false)}/></View>
    </Card>:loadout.notes?<Body>{loadout.notes}</Body>:null}
    <Card>
      <Label>YOUR REUSABLE GEAR LIST</Label>
      <Text selectable style={s.h2}>{weight(summary.carried)}</Text>
      <Body>Listed carry weight · {summary.unknownWeight} weights missing. Worn gear is excluded.</Body>
      <Body>Starting a trip copies this list and resets packing progress. Editing that trip keeps this saved loadout intact.</Body>
    </Card>
    <View style={s.row}>
      <Button title="Find gear for loadout" disabled={editing} onPress={()=>router.push({pathname:'/catalog',params:{loadoutId:id,tripId:'',activity:loadout.activity==='Four-wheeling'?'off-road':loadout.activity==='Hunting + Camping'?'hunting':loadout.activity.toLowerCase(),vehicle:loadout.vehicle?.toLowerCase()||'',category:''}})}/>
      <Button title="Add custom gear" secondary disabled={editing} onPress={()=>router.push({pathname:'/gear/edit',params:{loadoutId:id,tripId:'',activity:loadout.activity==='Four-wheeling'?'off-road':loadout.activity==='Hunting + Camping'?'hunting':loadout.activity.toLowerCase(),vehicle:loadout.vehicle?.toLowerCase()||'',category:''}})}/>
      <Button title="Use my locker" secondary disabled={editing} onPress={()=>router.push({pathname:'/locker',params:{loadoutId:id,tripId:'',activity:loadout.activity==='Four-wheeling'?'off-road':loadout.activity==='Hunting + Camping'?'hunting':loadout.activity.toLowerCase(),vehicle:loadout.vehicle?.toLowerCase()||'',category:''}})}/>
    </View>
    {loadout.items.length?<Field label="Search this loadout" value={query} onChangeText={setQuery} placeholder="Tent, tires, rain jacket…"/>:null}
    {!loadout.items.length?<Card><Body>This loadout is ready for your gear. Add products from the catalog, copy your locker gear, or enter custom items.</Body></Card>:null}
    {!!loadout.items.length&&!items.length?<Body>No gear matches that search.</Body>:null}
    {CATEGORIES.map(category=>{const group=items.filter(item=>item.category===category);return group.length?<View key={category} style={{gap:10}}>
      <Label>{category}</Label>
      {group.map(item=>{const product=gearProduct(item,products);return <Card key={item.id}>
        <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
          {product?.photo?<View style={{width:68}}><ProductPhoto product={product} height={68}/></View>:null}
          <View style={{flex:1,gap:5}}><Text selectable style={s.h2}>{item.name}</Text><Text selectable style={s.small}>{item.quantity} × {weight(item.grams)} · {item.carry}{item.owned?' · owned':''}</Text></View>
        </View>
        <Button title={`Edit ${item.name}`} secondary disabled={editing} onPress={()=>router.push({pathname:'/gear/edit',params:{id:item.id,loadoutId:id}})}/>
      </Card>;})}
    </View>:null;})}
    {deleting?<Card><Text style={s.h2}>Delete this loadout?</Text><Body>Trips already made from this loadout stay saved.</Body><View style={s.row}><Button title="Delete this loadout" disabled={saving} onPress={()=>void remove()}/><Button title="Keep loadout" secondary disabled={saving} onPress={()=>setDeleting(false)}/></View></Card>:<Button title="Delete loadout" secondary disabled={saving||editing} onPress={()=>setDeleting(true)}/>}
  </Page>;
}
