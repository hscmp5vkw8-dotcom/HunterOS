import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { accountAuth, cloudConfigured, pullWorkspace, pushWorkspace, session, signIn, signOut, signUp, supabase } from '@/cloud';
import { accountEmail, newPassword } from '@/account-auth';
import { restoreUnchanged } from '@/cloud-data';
import { confirmAction } from '@/dialogs';
import { Button, Card, ErrorText, Field, Label, Page, s } from '@/ui';
export default function Account() {
 const {state, commit, saving} = useStore(), router = useRouter();
 const [email,setEmail] = useState(''), [password,setPassword] = useState('');
 const [user,setUser] = useState<User|null>(null), [ready,setReady] = useState(false);
 const [message,setMessage] = useState(''), [busy,setBusy] = useState(false);
 const [mode,setMode] = useState<'signin'|'create'|'confirm'|'recover'|'reset'>('signin');
 const [code,setCode] = useState(''), [repeat,setRepeat] = useState(''), [codeSent,setCodeSent] = useState(false);
 const [resendAt,setResendAt] = useState(0), [now,setNow] = useState(Date.now());
 const active = useRef(false);
 useEffect(()=>{if(!resendAt)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[resendAt]);
 useEffect(() => {
  let mounted = true, receivedAuthEvent=false;
  const subscription = supabase?.auth.onAuthStateChange((_event,next) => {receivedAuthEvent=true;if (mounted) {setUser(next?.user??null); setReady(true);}}).data.subscription;
  void session().then(next => {if (mounted&&!receivedAuthEvent) {setUser(next?.user??null);setReady(true);}}).catch(error => {if (mounted) {setMessage(error.message);setReady(true);}});
  return () => {mounted=false;subscription?.unsubscribe();void accountAuth?.cancelRecovery();};
 },[]);
 async function run(action:()=>Promise<string|undefined>) {
  if (active.current || saving) return;
  active.current=true;setBusy(true);setMessage('');
  try {setMessage(await action() || '');} catch(error) {setMessage(error instanceof Error ? error.message : String(error));}
  finally {active.current=false;setBusy(false);}
 }
 async function authenticate(create:boolean) {
  const address=accountEmail(email);
  if (!password) throw Error('Enter your password.');
  if(create)newPassword(password,repeat);
  const {data,error} = await (create ? signUp(address,password) : signIn(address,password));
  if (error) {if(error.code==='email_not_confirmed'){setMode('confirm');setPassword('');}throw error;}
  setPassword('');setRepeat('');setEmail(address);
  if(create&&!data.session){setMode('confirm');setCode('');setResendAt(Date.now()+60000);return 'Check your email (including spam) for a HunterOS confirmation code. Already have an account? Return to sign in or reset your password.';}
  setMode('signin');return 'Signed in. Your device workspace has not changed.';
 }
 function changeMode(next:typeof mode) {setMode(next);setPassword('');setRepeat('');setCode('');setCodeSent(false);setMessage('');}
 async function sendCode(recovery:boolean) {
  if(Date.now()<resendAt)throw Error('Please wait before requesting another code.');
  const address=accountEmail(email);setEmail(address);
  if(recovery)await accountAuth!.requestRecovery(address);else await accountAuth!.resendConfirmation(address);
  setResendAt(Date.now()+60000);setNow(Date.now());setCodeSent(true);setCode('');
  return recovery?'If this email has a HunterOS account, a reset code is on its way. Check your inbox and spam folder.':'If confirmation is needed, a new code is on its way. Use only the latest email.';
 }
 const disabled=busy||saving||!ready;
 const wait=Math.max(0,Math.ceil((resendAt-now)/1000));
 return <Page><Label>CLOUD + OFFLINE</Label><Text style={s.title}>HunterOS account.</Text>
 <Text style={s.body}>An account is optional. This device keeps its own working copy. Cloud backup saves a separate copy when you choose to upload; it does not automatically merge changes between phones.</Text>
 {!cloudConfigured ? <Card><Text style={s.h2}>Cloud backup is not available yet</Text><Text style={s.body}>Your trips and gear still work on this device. Use Settings to export a backup you can keep or transfer.</Text></Card> : !ready ? <Text style={s.body}>Checking your account...</Text> : user ? <Card>
 <Text style={s.h2}>{user.email}</Text><Text style={s.body}>Signing in or out does not clear local plans. If you switch accounts or share this device, review the workspace before uploading it.</Text>
 <Button title={busy?'Working...':'Upload this device to cloud'} disabled={disabled} onPress={()=>void run(async()=>{
  const before=JSON.stringify(state);
  if (!await confirmAction('Replace your cloud backup?', `Upload ${state.trips.length} trips, ${state.loadouts.length} loadouts, ${state.gear.length} locker items and ${state.scannedProducts.length} scans to ${user.email}? This includes notes and locations. It replaces that account's previous cloud copy, including changes uploaded by another phone. Export a backup first if you want to keep another copy.`)) return;
  await pushWorkspace(JSON.parse(before),user.id);
  return 'Cloud backup saved. Later edits stay on this device until you upload again.';
 })}/>
 <Button secondary title="Restore cloud copy to this device" disabled={disabled} onPress={()=>void run(async()=>{
  const before=JSON.stringify(state), remote=await pullWorkspace(user.id);
  if (!remote) throw Error('This account has no cloud backup yet.');
  if (!await confirmAction('Replace this device workspace?', `Restore the backup from ${new Date(remote.updated_at).toLocaleString()} for ${user.email}? Its ${remote.workspace.trips.length} trips, ${remote.workspace.loadouts.length} loadouts and ${remote.workspace.gear.length} locker items replace this device's trips, loadouts, gear, favorites and scans. Export a backup from Settings first to keep the current workspace.`)) return;
  if ((await session())?.user.id!==user.id) throw Error('Your account changed. Review the restore again.');
  await commit(current=>restoreUnchanged(current,before,remote.workspace));
  return 'Cloud copy restored to this device.';
 })}/>
 <Button secondary title="Sign out on this device" disabled={disabled} onPress={()=>void run(async()=>{await signOut();return 'Signed out. Your local plans remain on this device.';})}/>
 </Card> : <Card><Text style={s.h2}>{mode==='confirm'?'Confirm your email':mode==='recover'?'Reset your password':mode==='reset'?'Choose a new password':mode==='create'?'Create your account':'Sign in'}</Text>
 <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy&&mode!=='confirm'&&mode!=='reset'&&!codeSent}/>
 {(mode==='signin'||mode==='create'||mode==='reset')&&<>
 <Field label={mode==='reset'?'New password':'Password'} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode==='signin'?'current-password':'new-password'} editable={!busy}/>
 {mode!=='signin'&&<><Text style={s.small}>Use at least 12 characters. A few unrelated words work well.</Text><Field label="Repeat password" value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy}/></>}
 </>}
 {mode==='signin'&&<><Button title="Sign in" disabled={disabled} onPress={()=>void run(()=>authenticate(false))}/><Button secondary title="Create account" disabled={disabled} onPress={()=>changeMode('create')}/><Button secondary title="Forgot password?" disabled={disabled} onPress={()=>changeMode('recover')}/></>}
 {mode==='create'&&<Button title="Send confirmation code" disabled={disabled} onPress={()=>void run(()=>authenticate(true))}/>}
 {(mode==='confirm'||(mode==='recover'&&codeSent))&&<>
 <Text style={s.body}>Enter the code from your latest HunterOS email. If it has expired, request another below.</Text>
 <Field label="Email code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" autoCorrect={false} maxLength={16} editable={!busy}/>
 <Button title={mode==='recover'?'Verify reset code':'Confirm email'} disabled={disabled} onPress={()=>void run(async()=>{
  if(mode==='recover'){await accountAuth!.verifyRecovery(email,code);setMode('reset');setCode('');return 'Code verified. Choose a new password.';}
  await accountAuth!.confirmEmail(email,code);setMode('signin');setCode('');return 'Email confirmed. Your device workspace has not changed.';
 })}/></>}
 {(mode==='confirm'||mode==='recover')&&<Button secondary title={wait?`Send another code in ${wait}s`:mode==='recover'&&!codeSent?'Send reset code':'Send another code'} disabled={disabled||wait>0} onPress={()=>void run(()=>sendCode(mode==='recover'))}/>}
 {mode==='reset'&&<Button title="Save new password" disabled={disabled} onPress={()=>void run(async()=>{await accountAuth!.finishRecovery(password,repeat);changeMode('signin');return 'Password updated. Sign in with your new password. Your local plans have not changed.';})}/>}
 {mode!=='signin'&&<Button secondary title="Return to sign in" disabled={disabled} onPress={()=>void run(async()=>{await accountAuth!.cancelRecovery();changeMode('signin');return '';})}/>}
 <Text style={s.small}>Use your own account. Each account has its own cloud backup.</Text></Card>}
 <ErrorText message={message}/><Button secondary title="Back" disabled={busy} onPress={()=>{if(router.canGoBack())router.back();else router.replace('/');}}/></Page>;
}
