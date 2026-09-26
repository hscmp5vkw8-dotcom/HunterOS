import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocial } from './use-social';
import { confirmAction } from './dialogs';
import { PolicyLink } from './policy-links';
import { Body, Button, Card, C, ErrorText, Field, Label, s } from './ui';

export function ProductSocial({productId}:{productId:string}) {
  const router=useRouter(), {data,userId,busy,error,act}=useSocial();
  const [message,setMessage]=useState(''),[audience,setAudience]=useState('friends'),[notice,setNotice]=useState('');
  useEffect(()=>{setMessage('');setAudience('friends');setNotice('');},[userId,productId]);
  const signal=data.signals.find(s=>s.product_id===productId),groups=data.groups.filter(g=>g.status==='accepted');
  async function vote(kind:'liked'|'used') {
    const next={liked:signal?.liked??false,used:signal?.used??false};next[kind]=!next[kind];
    if(next[kind]&&!await confirmAction('Include this in Popular?', 'HunterOS will store your gear pick with your account and include it in public totals once at least three people have picked this product. Your name will not be shown. You can remove your pick here.'))return;
    if(await act('signal',{product_id:productId,...next}))setNotice('Your gear pick was updated.');
  }
  async function share() {
    const group=groups.find(g=>g.id===audience);
    if(audience!=='friends'&&!group){setNotice('Choose a group you still belong to.');return;}
    if(!await confirmAction('Share this gear pick?',`Share this product and your note with ${group?group.name:'your accepted friends'}? Your locker, trip details and locations are not included. By sharing you agree to the Community guidelines: no harassment, hate, sexual content, graphic violence, illegal activity, spam or disclosure of someone else's private information. Share only content you have the right to share.`))return;
    if(await act('post',{product_id:productId,message,group_id:group?.id??null})){setMessage('');setNotice('Gear pick shared. You can remove it from the Friends feed.');}
  }
  return <Card><Label>GEAR WORTH SHARING</Label><Text style={s.h2}>What do you think?</Text>
    {!userId||!data.profile?<><Body>Connect with your actual friends, share a gear pick, or help others discover equipment you like.</Body><Button secondary title={userId?'Set up your friend profile':'Sign in to share gear'} onPress={()=>router.push(userId?'/friends':'/account')}/></>:<>
      <Body>These choices contribute to Popular. They do not publish your locker or post to your friends.</Body>
      <Button secondary title={signal?.liked?'Remove my like':'I like this'} disabled={busy} onPress={()=>void vote('liked')}/>
      <Button secondary title={signal?.used?'Remove my use vote':'I use this'} disabled={busy} onPress={()=>void vote('used')}/>
      <Field label="Note for your friends (optional)" multiline maxLength={500} value={message} onChangeText={setMessage}/>
      <Label>WHO CAN SEE THIS PICK</Label><View style={s.row}>{[{id:'friends',name:'My friends'},...groups].map(g=><Pressable key={g.id} accessibilityRole="button" accessibilityState={{selected:audience===g.id}} onPress={()=>setAudience(g.id)} style={[s.chip,audience===g.id&&{borderColor:C.lime}]}><Text style={s.body}>{g.name}</Text></Pressable>)}</View>
      <Button title="Share gear pick" disabled={busy} onPress={()=>void share()}/>
      <PolicyLink title="Read Community guidelines" path="/community/"/>
    </>}
    {notice?<Text selectable accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>:null}<ErrorText message={error}/>
  </Card>;
}
