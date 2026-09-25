import { useEffect, useRef, useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Card, Chips, ErrorText, Field, Label, Page, s } from '@/ui';
import { appVersion, emailFeedback, feedbackReport, shareFeedback, submitFeedback, supportEmail } from '@/feedback';
import { feedbackId, feedbackKinds, readFeedbackJournal, validateFeedback, type FeedbackEntry, type FeedbackPayload } from '@/feedback-data';
import { readFeedbackSaved } from '@/feedback-storage';

export default function Feedback() {
  const [kind,setKind]=useState('Something broke');
  const [details,setDetails]=useState(''),[steps,setSteps]=useState(''),[expected,setExpected]=useState('');
  const [contact,setContact]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [entries,setEntries]=useState<FeedbackEntry[]>([]),[storageError,setStorageError]=useState(false);
  const active=useRef(false),draft=useRef<{signature:string;payload:FeedbackPayload}|null>(null);
  async function refresh(){try{setEntries(readFeedbackJournal(await readFeedbackSaved()));setStorageError(false);}catch(e){setStorageError(true);setMessage((e as Error).message);}}
  useEffect(()=>{void refresh();},[]);
  function payload(){
    const fields={kind,details,steps,expected,contact_email:contact,app_version:appVersion,platform:Platform.OS,os_version:String(Platform.Version??'')};
    const signature=JSON.stringify(fields);
    if(draft.current?.signature!==signature)draft.current={signature,payload:validateFeedback({id:feedbackId(),...fields})};
    return draft.current.payload;
  }
  async function send(saved?:FeedbackPayload){
    if(active.current||storageError)return;active.current=true;setBusy(true);setMessage('');
    try{const receipt=await submitFeedback(saved??payload());setMessage(`Feedback received. Reference: ${receipt.id}. You can send a copy or screenshots using the options below.`);if(!saved){setDetails('');setSteps('');setExpected('');draft.current=null;}}
    catch(e){setMessage((e as Error).message);}finally{await refresh();active.current=false;setBusy(false);}
  }
  async function copy(entry:FeedbackEntry,email:boolean){
    if(active.current)return;active.current=true;setBusy(true);setMessage('');
    const p=entry.payload,report=`Reference: ${p.id}\n${feedbackReport(p.kind,p.details,p.steps,p.expected,{version:p.app_version,device:`${p.platform} ${p.os_version}`.trim()})}\nReply email: ${p.contact_email||'Not provided'}`;
    try{if(email){await emailFeedback(report);setMessage('Email draft opened. Add screenshots and tap Send. Your original report is already recorded.');}else{await shareFeedback(report);setMessage('Your original report is already recorded. Send the copy in your chosen message app.');}}
    catch(e){if((e as Error).name!=='AbortError')setMessage('Could not open sharing. Your original report is already recorded.');}finally{active.current=false;setBusy(false);}
  }
  return <Page>
    <Label>FAMILY BETA / {appVersion}</Label>
    <Text style={s.title}>Help shape HunterOS.</Text>
    <Text style={s.body}>Send a report directly to HunterOS so we can track fixes and review feedback together. No account is required.</Text>
    <Chips values={[...feedbackKinds]} value={kind} onChange={setKind}/>
    <Field label="Your feedback" multiline value={details} onChangeText={setDetails} editable={!busy} maxLength={3000} placeholder="What happened, or what would you change?"/>
    <Field label="Steps to reproduce (optional)" multiline value={steps} onChangeText={setSteps} editable={!busy} maxLength={2000} placeholder="For example: Open a trip, add a tent..."/>
    <Field label="What you expected (optional)" multiline value={expected} onChangeText={setExpected} editable={!busy} maxLength={1500}/>
    <Field label="Reply email (optional)" value={contact} onChangeText={setContact} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254}/>
    <Text style={s.small}>Send feedback saves these notes, your optional reply email, app version, device platform and your account if signed in, in HunterOS's private feedback log. The HunterOS owner and tools they authorize can review and summarize reports. Trips, gear, passwords and screenshots are not attached. Please leave sensitive information out.</Text>
    <Button title={busy?'Working...':'Send feedback'} onPress={()=>void send()} disabled={!details.trim()||busy||storageError}/>
    <ErrorText message={message}/>
    <Text style={s.small}>Unsent reports stay on this device for retry. There is no background sending. Keep the app installed until they show Received. For help or removal of a report, contact {supportEmail} with its reference.</Text>
    {entries.length?<Text style={s.h2}>Reports from this device</Text>:null}
    {entries.map(entry=><Card key={entry.payload.id}>
      <Label>{entry.receipt?'RECEIVED':'NOT SENT — RETRY NEEDED'}</Label><Text selectable style={s.small}>{entry.payload.id}</Text>
      <Text style={s.body}>{entry.payload.details}</Text><Text style={s.small}>{new Date(entry.receipt?.created_at??entry.queuedAt).toLocaleString()}</Text>
      {entry.receipt?<><Button secondary title="Email a copy / add screenshots" onPress={()=>void copy(entry,true)} disabled={busy}/><Button secondary title="Share or text a copy" onPress={()=>void copy(entry,false)} disabled={busy}/></>:<Button title="Retry sending" onPress={()=>void send(entry.payload)} disabled={busy||storageError}/>}
    </Card>)}
  </Page>;
}
