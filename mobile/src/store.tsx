import React, { createContext, use, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { fresh, validateWorkspace } from './domain';
import { readSaved, writeSaved } from './storage';
import type { Workspace } from './types';
interface Store { state:Workspace; saving:boolean; commit:(change:(s:Workspace)=>Workspace)=>Promise<void>; }
const Context=createContext<Store|null>(null);
export function Provider({children}:{children:React.ReactNode}){
  const [state,setState]=useState(fresh),[ready,setReady]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const ref=useRef(state),queue=useRef(Promise.resolve());
  useEffect(()=>{let mounted=true;readSaved().then(raw=>{const loaded=raw?validateWorkspace(JSON.parse(raw)):fresh();if(mounted){ref.current=loaded;setState(loaded);setReady(true);}}).catch(e=>{if(mounted)setError(String(e?.message||e));});return()=>{mounted=false;};},[]);
  function commit(change:(s:Workspace)=>Workspace){
    const work=queue.current.then(async()=>{setSaving(true);try{const next=validateWorkspace(change(JSON.parse(JSON.stringify(ref.current))));await writeSaved(JSON.stringify(next));ref.current=next;setState(next);}finally{setSaving(false);}});
    queue.current=work.catch(()=>{});return work;
  }
  if(error)return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{padding:28,backgroundColor:'#0c100d',flexGrow:1,gap:14}}><Text style={{color:'#f0c485',fontSize:22}}>Saved data needs attention</Text><Text selectable style={{color:'white'}}>{error}</Text><Text style={{color:'#a0ae9f'}}>The stored copy has not been overwritten. Do not uninstall the app or clear browser data. Restart and export a backup after recovery.</Text></ScrollView>;
  if(!ready)return <View style={{flex:1,backgroundColor:'#0c100d',justifyContent:'center',gap:16}}><ActivityIndicator color="#d4ef79"/><Text style={{color:'white',textAlign:'center'}}>Opening your gear locker…</Text></View>;
  return <Context value={{state,saving,commit}}>{children}</Context>;
}
export function useStore(){const c=use(Context);if(!c)throw Error('HunterOS store not mounted');return c;}
