import { useState } from 'react';
import { Platform, Text } from 'react-native';
import { Button, Card, Chips, ErrorText, Field, Label, Page, s } from '@/ui';
import { appVersion, emailFeedback, feedbackReport, shareFeedback, supportEmail } from '@/feedback';

export default function Feedback() {
  const [kind,setKind]=useState('Something broke');
  const [details,setDetails]=useState(''),[steps,setSteps]=useState(''),[expected,setExpected]=useState('');
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const report=feedbackReport(kind,details,steps,expected);
  async function share(email=false) {
    if (!details.trim() || busy) return;
    setBusy(true);setMessage('');
    try {
      if(email) {await emailFeedback(report);setMessage('Email draft opened. Tap Send in your email app to submit it. Your notes stay here.');return;}
      const shared=await shareFeedback(report);
      if(shared)setMessage(Platform.OS==='web' && typeof navigator.share!=='function' ? 'Feedback copied. Paste it into a message to the person who invited you.' : 'Share sheet closed. Your notes stay here if you want to send them again.');
    } catch(e) { if ((e as Error).name!=='AbortError')setMessage('Could not open sharing. You can copy the report below instead.'); }
    finally {setBusy(false);}
  }
  return <Page>
    <Label>FAMILY BETA / {appVersion}</Label>
    <Text style={s.title}>Help shape HunterOS.</Text>
    <Text style={s.body}>Tell us what felt confusing, what broke, or what would make your next trip easier.</Text>
    <Chips values={['Something broke','An idea','What I liked']} value={kind} onChange={setKind}/>
    <Field label="Your feedback" multiline value={details} onChangeText={setDetails} maxLength={3000} placeholder="What happened, or what would you change?"/>
    <Field label="Steps to reproduce (optional)" multiline value={steps} onChangeText={setSteps} maxLength={2000} placeholder="For example: Open a trip, add a tent..."/>
    <Field label="What you expected (optional)" multiline value={expected} onChangeText={setExpected} maxLength={1500}/>
    <Button title="Email HunterOS support" onPress={()=>void share(true)} disabled={!details.trim()||busy}/>
    <Button secondary title="Share or text feedback" onPress={()=>void share()} disabled={!details.trim()||busy}/>
    <ErrorText message={message}/>
    <Text style={s.small}>Email {supportEmail}, or choose a message app and text the person who invited you. Only your notes, app version and device platform are included. Your trips and gear are not attached. You can attach a screenshot in your email or message app.</Text>
    {details.trim()?<Card><Label>REPORT PREVIEW</Label><Text selectable style={s.body}>{report}</Text></Card>:null}
  </Page>;
}
