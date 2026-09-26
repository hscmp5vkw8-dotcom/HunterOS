import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { TRIP_TYPES, VEHICLES } from '@/domain';
import { createCustomLoadout, createLoadoutFromTemplate, LOADOUT_TEMPLATES } from '@/loadouts';
import { useStore } from '@/store';
import { Body, Button, Card, Chips, ErrorText, Field, Label, Page, s } from '@/ui';
import type { Loadout, TripType, Vehicle } from '@/types';

export default function LoadoutsScreen() {
  const params=useLocalSearchParams<{activity?:string;vehicle?:string}>();
  const router=useRouter(),{state,commit,saving}=useStore();
  const initialActivity=TRIP_TYPES.includes(params.activity as TripType)?params.activity!:'All activities';
  const [activity,setActivity]=useState(initialActivity);
  const [vehicle,setVehicle]=useState(VEHICLES.includes(params.vehicle as Vehicle)?params.vehicle!:'All vehicles');
  const [creating,setCreating]=useState(false),[name,setName]=useState(''),[error,setError]=useState('');
  const [customActivity,setCustomActivity]=useState<TripType>(initialActivity==='All activities'?'Hiking':initialActivity as TripType);
  const [customVehicle,setCustomVehicle]=useState<Vehicle>(VEHICLES.includes(params.vehicle as Vehicle)?params.vehicle as Vehicle:'ATV');
  const matches=(item:{activity:TripType;vehicle?:Vehicle})=>(activity==='All activities'||item.activity===activity)&&(vehicle==='All vehicles'||item.vehicle===vehicle);
  const saved=state.loadouts.filter(matches),templates=LOADOUT_TEMPLATES.filter(matches);
  async function saveNew(loadout:Loadout) {
    setError('');
    try {
      await commit(current=>({...current,loadouts:[...current.loadouts,loadout]}));
      router.push({pathname:'/loadout/[id]',params:{id:loadout.id}});
    } catch(e) {setError(e instanceof Error?e.message:String(e));}
  }
  function saveCustom() {
    try {void saveNew(createCustomLoadout(name,customActivity,customVehicle));}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  function chooseActivity(value:string) {setActivity(value);setVehicle('All vehicles');}
  return <Page>
    <Stack.Screen options={{title:'Your loadouts'}}/>
    <Label>PACK ONCE. PLAN AGAIN.</Label>
    <Text style={s.title}>A kit for every adventure</Text>
    <Body>Save multiple named gear lists, tailor them to your activities, and start each trip with an independent copy.</Body>
    <Button title="New custom loadout" disabled={saving} onPress={()=>{if(!creating){setCustomActivity(activity==='All activities'?'Hiking':activity as TripType);setCustomVehicle(vehicle==='All vehicles'?'ATV':vehicle as Vehicle);}setCreating(true);setError('');}}/>
    <ErrorText message={error}/>
    {creating?<Card>
      <Text style={s.h2}>Start an empty loadout</Text>
      <Field label="Loadout name" value={name} onChangeText={setName} maxLength={200} placeholder="My weekend hiking kit"/>
      <Label>Activity</Label>
      <Chips values={TRIP_TYPES} value={customActivity} onChange={value=>setCustomActivity(value as TripType)}/>
      {customActivity==='Four-wheeling'?<><Label>Vehicle</Label><Chips values={VEHICLES} value={customVehicle} onChange={value=>setCustomVehicle(value as Vehicle)}/></>:null}
      <View style={s.row}><Button title="Create loadout" disabled={saving||!name.trim()} onPress={saveCustom}/><Button title="Cancel" secondary onPress={()=>setCreating(false)}/></View>
    </Card>:null}
    <Chips values={['All activities',...TRIP_TYPES]} value={activity} onChange={chooseActivity}/>
    {activity==='Four-wheeling'||vehicle!=='All vehicles'?<Chips values={['All vehicles',...VEHICLES]} value={vehicle} onChange={setVehicle}/>:null}
    <Text style={s.h2}>Saved loadouts · {saved.length}</Text>
    {saved.length?saved.map(loadout=><Card key={loadout.id}>
      <Label>{loadout.activity}{loadout.vehicle?` · ${loadout.vehicle==='4x4'?'4×4':loadout.vehicle}`:''}</Label>
      <Text selectable style={s.h2}>{loadout.name}</Text>
      <Body>{loadout.items.length} gear entries · {loadout.style}</Body>
      <Button title={`Open ${loadout.name}`} secondary onPress={()=>router.push({pathname:'/loadout/[id]',params:{id:loadout.id}})}/>
    </Card>):<Card><Body>{state.loadouts.length?'No saved loadouts match these filters. Choose another activity or save a starter below.':'Save a starter below or create your own empty loadout. Your kits stay on this device and are included in your backup.'}</Body></Card>}
    <Text style={s.h2}>Starter loadouts · {templates.length}</Text>
    <Body>Each starter is editable. Set quantities, measurements and equipment choices for your group and conditions.</Body>
    {templates.map(template=><Card key={template.id}>
      <Label>{template.activity}{template.vehicle?` · ${template.vehicle==='4x4'?'4×4':template.vehicle}`:''}</Label>
      <Text style={s.h2}>{template.name}</Text>
      <Body>{template.description}</Body>
      <Text style={s.small}>{template.items.length} gear entries · {template.style}</Text>
      <Button title={`Save ${template.name}`} disabled={saving} onPress={()=>void saveNew(createLoadoutFromTemplate(template.id))}/>
    </Card>)}
    {!templates.length?<Body>No starters match this vehicle and activity. Your custom loadout can use any gear.</Body>:null}
  </Page>;
}
