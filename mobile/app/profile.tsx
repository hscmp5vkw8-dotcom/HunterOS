import { useEffect, useRef, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAccount } from '@/use-account';
import { useSocial } from '@/use-social';
import { session } from '@/cloud';
import { emptyNameDraft, nameDraft, reconcileNameDraft, screenName } from '@/profile-data';
import { ProfileAvatar } from '@/profile-avatar';
import { Body, Button, Card, C, ErrorText, Field, Label, Page, s } from '@/ui';

export default function Profile(){
  const router=useRouter(),account=useAccount(),social=useSocial();
  const userId=account.user?.id??null,owner=useRef(userId);owner.current=userId;
  const [draft,setDraft]=useState(emptyNameDraft);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const active=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const profile=social.userId===userId&&social.data.profile?.user_id===userId?social.data.profile:null;
  useEffect(()=>{setDraft(emptyNameDraft);setError('');setNotice('');},[userId]);
  useEffect(()=>{if(profile&&userId)setDraft(current=>reconcileNameDraft(current,userId,profile.name));},[profile,userId,draft]);
  async function run(action:(id:string)=>Promise<string|void>,refresh=true){
    if(!userId||active.current)return;
    const id=userId;active.current=true;setBusy(true);setError('');setNotice('');
    try{
      if((await session())?.user.id!==id)throw Error('Your account changed. Please try again.');
      const message=await action(id);
      if(mounted.current&&owner.current===id){setNotice(message||'');if(refresh)await social.refresh();}
    }catch(e){
      if(mounted.current&&owner.current===id)setError(e instanceof Error?e.message:String(e));
    }finally{active.current=false;if(mounted.current)setBusy(false);}
  }
  const disabled=busy||social.busy||!profile;
  const visibleName=draft.owner===userId?draft.value:'';
  const friends=profile?social.data.friends.filter(friend=>friend.status==='accepted'):[],groups=profile?social.data.groups.filter(group=>group.status==='accepted'):[];
  const requests=profile?social.data.friends.filter(friend=>friend.incoming&&friend.status==='pending').length:0,invites=profile?social.data.groups.filter(group=>group.status==='invited').length:0;
  return <Page><Stack.Screen options={{title:'Your profile'}}/><Label>YOUR HUNTEROS</Label><Text style={s.title}>Your profile.</Text>
    {!account.ready?<Body>Checking your account.</Body>:!userId?<Card><Text style={s.h2}>You're signed out.</Text><Body>Sign in to edit your profile and see your friends and groups.</Body><Button title="Sign in or create account" onPress={()=>router.replace('/account')}/></Card>:<>
      <Card><View style={[s.row,{flexWrap:'nowrap'}]}><ProfileAvatar name={profile?.name}/><View style={{flex:1,gap:5}}><Label>SIGNED IN</Label><Text style={s.h2}>{profile?.name||'HunterOS member'}</Text><Text selectable style={s.small}>{account.user?.email}</Text></View></View>
        {profile?<><Label>YOUR PERMANENT USER ID</Label><Text selectable accessibilityLabel={`Your user ID: ${profile.user_code.split('').join(' ')}`} style={[s.stat,{letterSpacing:4,color:C.lime}]}>{profile.user_code}</Text><Body>Share this 8-digit ID with friends. Editing your profile keeps the same account and ID.</Body><Button secondary title="Share my user ID" disabled={busy} onPress={()=>void run(async()=>{await Share.share({message:`Add me on HunterOS. My user ID is ${profile.user_code}. Open Friends & groups and enter this ID to send me a request.`});},false)}/></>:social.loading?<Body>Loading your profile.</Body>:<Body>Your profile couldn't be loaded. Try refreshing below.</Body>}
      </Card>
      <Card><Text style={s.h2}>Make it yours.</Text><Field label="Screen name (optional)" value={visibleName} onChangeText={value=>setDraft(current=>({...current,value}))} maxLength={50} autoCorrect={false} editable={!disabled}/><Body>Your friends and group members see this name. Leave it blank to use "HunterOS member." Your email stays private.</Body><Button title="Save screen name" disabled={disabled} onPress={()=>void run(async id=>{const saved=screenName(draft.value);if(!await social.act('profile',{name:saved}))throw Error('Your screen name could not be saved. Please try again.');if(owner.current===id)setDraft(nameDraft(id,saved));return 'Screen name saved. Your user ID stays the same.';})}/>
        <Body>Your avatar uses your screen name's initials. Uploaded profile photos will be added in a later update.</Body>
      </Card>
      <Card><Text style={s.h2}>Your people.</Text><Button title={`Friends · ${friends.length}`} disabled={busy} onPress={()=>router.push({pathname:'/friends',params:{view:'Friends'}})}/><Body>{requests?`${requests} friend request${requests===1?'':'s'} waiting for you.`:friends.length?friends.slice(0,3).map(friend=>friend.name).join(' · '):'Your accepted friends will appear here.'}</Body><Button secondary title={`Groups · ${groups.length}`} disabled={busy} onPress={()=>router.push({pathname:'/friends',params:{view:'Groups'}})}/><Body>{invites?`${invites} group invitation${invites===1?'':'s'} waiting for you.`:groups.length?groups.slice(0,3).map(group=>group.name).join(' · '):'Your private groups and invitations live here.'}</Body><Button secondary title="Messages" disabled={busy} onPress={()=>router.push('/messages')}/></Card>
      <Button secondary title="Account & cloud backup" disabled={busy} onPress={()=>router.push('/account')}/>
      <Button secondary title={social.loading?'Refreshing profile.':'Refresh profile'} disabled={busy||social.loading} onPress={()=>void social.refresh()}/>
    </>}
    <ErrorText message={account.error||error}/><ErrorText message={social.error}/>{notice?<Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>:null}
  </Page>;
}
