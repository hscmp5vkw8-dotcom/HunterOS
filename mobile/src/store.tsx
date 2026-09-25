import React, { createContext, use, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { fresh, validateWorkspace } from './domain';
import { decodeSaved } from './load-workspace';
import { readSaved, writeSaved } from './storage';
import { exportFile } from './backup';
import { Button, C, s } from './ui';
import type { Workspace } from './types';

interface Store { state:Workspace; saving:boolean; commit:(change:(s:Workspace)=>Workspace)=>Promise<void>; }
const Context=createContext<Store|null>(null);
export function Provider({children}:{children:React.ReactNode}) {
  const [state,setState]=useState(fresh), [ready,setReady]=useState(false);
  const [error,setError]=useState(''), [saving,setSaving]=useState(false);
  const [attempt,setAttempt]=useState(0), [recovery,setRecovery]=useState<string|null>(null);
  const [exporting,setExporting]=useState(false), [message,setMessage]=useState('');
  const ref=useRef(state), queue=useRef(Promise.resolve());
  useEffect(()=>{
    let mounted=true;
    setError('');setReady(false);setRecovery(null);setMessage('');
    readSaved().then(raw=>{
      if(!mounted)return;
      setRecovery(raw);
      const loaded=decodeSaved(raw);
      ref.current=loaded;setState(loaded);setReady(true);
    }).catch(e=>{if(mounted)setError(String(e?.message||e));});
    return ()=>{mounted=false;};
  },[attempt]);
  function commit(change:(s:Workspace)=>Workspace) {
    const work=queue.current.then(async()=>{
      setSaving(true);
      try {
        const next=validateWorkspace(change(JSON.parse(JSON.stringify(ref.current))));
        await writeSaved(JSON.stringify(next));ref.current=next;setState(next);
      } finally {setSaving(false);}
    });
    queue.current=work.catch(()=>{});return work;
  }
  async function saveRecovery() {
    if(recovery===null||exporting)return;
    setExporting(true);setMessage('');
    try {await exportFile(recovery,'recovery');setMessage('Recovery copy prepared. Keep it somewhere safe; it may need repair before importing.');}
    catch(e){setMessage('Could not prepare the recovery copy: '+String(e));}
    finally {setExporting(false);}
  }
  if(error)return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{padding:28,backgroundColor:C.bg,flexGrow:1,gap:16}}>
    <Text style={s.title}>Saved data needs attention</Text>
    <Text selectable style={s.body}>{error}</Text>
    <Text style={s.body}>Your stored data has not been overwritten. Save a recovery copy before uninstalling or clearing app data. The copy may contain private trip notes and locations; keep it somewhere you trust.</Text>
    {recovery!==null?<Button title={exporting?'Preparing copy…':'Save recovery copy'} disabled={exporting} onPress={()=>void saveRecovery()}/>:<Text style={s.body}>Storage could not be read, so a recovery copy is not available yet. Try again or restart the app.</Text>}
    <Button secondary title="Try reading again" disabled={exporting} onPress={()=>setAttempt(value=>value+1)}/>
    {message?<Text selectable accessibilityRole="alert" style={s.body}>{message}</Text>:null}
  </ScrollView>;
  if(!ready)return <View style={{flex:1,backgroundColor:C.bg,justifyContent:'center',gap:16}}><ActivityIndicator color={C.lime}/><Text style={{color:C.ink,textAlign:'center'}}>Opening your gear locker…</Text></View>;
  return <Context value={{state,saving,commit}}>{children}</Context>;
}
export function useStore(){const c=use(Context);if(!c)throw Error('HunterOS store not mounted');return c;}
