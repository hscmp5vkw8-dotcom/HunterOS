import { useState } from 'react';
import { Stack } from 'expo-router';
import { Linking, Text } from 'react-native';
import { useStore } from '@/store';
import { Button, Card, Body, ErrorText, Field, Label, Page, s } from '@/ui';
import { privateProductURL } from '@/product-import-data';
import { confirmAction } from '@/dialogs';

export default function Outreach(){
 const {state,commit,saving}=useStore(),[query,setQuery]=useState(''),[error,setError]=useState('');
 const candidates=(state.outreachCandidates||[]).filter(c=>c.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 async function remove(id:string){if(!await confirmAction('Remove outreach candidate?','Product links and gear in your locker will be kept.'))return;try{await commit(s=>({...s,outreachCandidates:(s.outreachCandidates||[]).filter(c=>c.id!==id)}));}catch(e){setError(String(e));}}
 async function open(url:string){try{await Linking.openURL(privateProductURL(url));}catch{setError('Could not open the source product page.');}}
 return <Page><Stack.Screen options={{title:'Brand outreach candidates'}}/><Label>PRIVATE WORKSPACE</Label><Text style={s.title}>Brand outreach candidates</Text><Body>Saved link imports collect source-stated brands and manufacturers here for possible affiliate outreach. A retailer is kept as a seller, and is not assumed to make the product. Unknown makers need review.</Body><Body>Verify legal identity and an actual partner program before contacting anyone. These are candidates; no affiliate relationship, commission, referral discount or contact permission has been established. This list saves with your private backup and is never posted to friends or the shared catalog.</Body>
 <Field label="Search outreach candidates" value={query} onChangeText={setQuery} maxLength={80}/><ErrorText message={error}/>
 {!candidates.length?<Body>{query?'No candidates match this search.':'Import a product link, review its details, and save it to your gear to collect the source identity here.'}</Body>:candidates.map(c=><Card key={c.id}><Text style={s.h2}>{c.name}</Text><Body>{c.role==='unresolved'?'Maker unknown - needs review':`${c.role} stated on the source page; legal identity and program need review`}</Body>{c.sources.map(source=><Card key={source.url}><Text selectable style={s.body}>{source.product}</Text><Text selectable style={s.small}>{source.url}{source.checkedAt?'\nSource checked '+source.checkedAt:''}</Text><Button secondary title={'Open source: '+source.product} onPress={()=>void open(source.url)}/></Card>)}<Button secondary title={'Remove candidate: '+c.name} disabled={saving} onPress={()=>void remove(c.id)}/></Card>)}
 </Page>;
}
