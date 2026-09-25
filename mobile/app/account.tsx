import { useEffect, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { cloudConfigured, pullWorkspace, publishScans, pushWorkspace, session, signIn, signOut, signUp } from '@/cloud';
import { validateWorkspace } from '@/domain';
import { Button, Card, C, ErrorText, Label, Page, s } from '@/ui';
export default function Account(){
 const {state,commit,saving}=useStore(),router=useRouter(),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[user,setUser]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{void session().then(s=>setUser(s?.user.email||''));},[]);
 const field=(value:string,onChangeText:(v:string)=>void,placeholder:string,secure=false)=><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} style={{color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:12,padding:13}}/>;
 async function run(fn:()=>Promise<any>){try{setMessage('Working…');await fn();const s=await session();setUser(s?.user.email||'');setMessage('Done.');}catch(e){setMessage(String((e as any)?.message||e));}}
 return <Page><Label>CLOUD + OFFLINE</Label><Text style={s.title}>HunterOS account.</Text><Text style={s.body}>Your phone remains the offline working copy. Cloud sync is explicit in this alpha so a stale cloud copy cannot silently overwrite field edits.</Text>
 {!cloudConfigured?<Card><Text style={s.h2}>Cloud project not connected yet</Text><Text selectable style={s.body}>Copy mobile/.env.example to .env and add your Supabase project URL and publishable/anon key. Then run mobile/supabase/schema.sql once in Supabase.</Text></Card>:null}
 {user?<><Card><Text style={s.h2}>{user}</Text><Text style={s.body}>Signed in. Local SQLite continues to work without service.</Text><Button title="Back up this device to cloud" disabled={saving} onPress={()=>void run(async()=>{await pushWorkspace(state);await publishScans(state);})}/><Button secondary title="Download cloud copy to this device" disabled={saving} onPress={()=>void run(async()=>{const remote=await pullWorkspace();if(!remote)throw Error('No cloud backup exists yet.');await commit(()=>validateWorkspace(remote.workspace));})}/><Button secondary title="Sign out" onPress={()=>void run(signOut)}/></Card></>:
 <Card><Text style={s.h2}>Sign in or create account</Text>{field(email,setEmail,'Email')}{field(password,setPassword,'Password',true)}<Button title="Sign in" onPress={()=>void run(async()=>{const {error}=await signIn(email,password);if(error)throw error;})}/><Button secondary title="Create account" onPress={()=>void run(async()=>{const {error}=await signUp(email,password);if(error)throw error;})}/></Card>}
 <ErrorText message={message}/><Button secondary title="Back" onPress={()=>router.back()}/></Page>;
}