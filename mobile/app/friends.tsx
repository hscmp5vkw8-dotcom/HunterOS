import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSocial } from '@/use-social';
import { confirmAction } from '@/dialogs';
import { Body, Button, Card, Chips, ErrorText, Field, Label, Page, s } from '@/ui';

export default function Friends() {
  const router = useRouter(), social = useSocial();
  const {data, userId, loading, busy, error, act} = social;
  const [name, setName] = useState(''), [code, setCode] = useState(''), [groupName, setGroupName] = useState('');
  const [view, setView] = useState('Friends'), [notice, setNotice] = useState('');
  useEffect(() => {setName(data.profile?.name ?? ''); setCode(''); setNotice('');}, [userId, data.profile?.name]);
  useEffect(()=>{setGroupName('');setView('Friends');},[userId]);
  async function change(action: string, payload: Record<string, unknown>, message = '') {if (await act(action, payload)) setNotice(message);}
  async function confirm(title: string, detail: string, action: string, payload: Record<string, unknown>) {if (await confirmAction(title, detail)) await change(action, payload);}
  const accepted = data.friends.filter(f => f.status === 'accepted');
  return <Page><Stack.Screen options={{title:'Friends & groups'}}/><Label>YOUR PEOPLE. YOUR CHOICE.</Label>
    <Body>Add the people you know with a friend code. Both people must accept the connection. Your trips, locations, locker and cloud backups stay private.</Body>
    <ErrorText message={error}/>{notice?<Text selectable accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>:null}
    {loading?<Text style={s.body}>Loading your connections…</Text>:!userId?<Card><Text style={s.h2}>Bring your friends along.</Text><Body>Sign in or create your HunterOS account to connect with friends and make private groups.</Body><Button title="Sign in or create account" onPress={()=>router.push('/account')}/></Card>:<>
      <Card><Text style={s.h2}>{data.profile?'Your profile':'Choose your display name'}</Text><Field label="Display name" value={name} onChangeText={setName} maxLength={50}/><Button title="Save display name" disabled={busy||!name.trim()} onPress={()=>void change('profile',{name},'Display name saved.')}/>
      {data.profile?<><Label>YOUR FRIEND CODE</Label><Text selectable style={s.body}>{data.profile.friend_code}</Text><Body>Give this code to an actual friend. It lets them send a request; it does not give them access to your data.</Body><Button secondary title="Replace friend code" disabled={busy} onPress={()=>void confirm('Replace your code?','Your old code will stop accepting new requests. Existing friends stay connected.','rotate_code',{})}/></>:null}</Card>
      {data.profile?<><Chips values={['Friends','Groups','Blocked']} value={view} onChange={setView}/>
      {view==='Friends'?<>
        <Card><Text style={s.h2}>Add a friend</Text><Field label="Friend code" autoCapitalize="none" autoCorrect={false} value={code} onChangeText={setCode} maxLength={36}/><Button title="Send friend request" disabled={busy||!code.trim()} onPress={()=>void change('request',{code},'Request sent. Your friend can accept it in Friends & groups.')}/></Card>
        {!data.friends.length?<Card><Text style={s.h2}>Start with someone you know.</Text><Body>Share your code, or ask a friend for theirs. There is no public list of users to browse.</Body></Card>:data.friends.map(friend=><Card key={friend.id}><Text style={s.h2}>{friend.name}</Text><Text style={s.small}>{friend.status==='accepted'?'Friend':friend.incoming?'Wants to connect with you':'Request sent'}</Text>
          {friend.status==='pending'&&friend.incoming?<Button title={`Accept ${friend.name}`} disabled={busy} onPress={()=>void change('accept',{id:friend.id},'You are now friends.')}/>:null}
          <View style={s.row}><Button secondary title={friend.status==='accepted'?'Remove friend':friend.incoming?'Decline':'Cancel request'} disabled={busy} onPress={()=>void confirm('Remove this connection?','Friends-only posts will no longer be shared through this connection. Shared group membership is separate.','remove_friend',{id:friend.id})}/><Button secondary title={`Block ${friend.name}`} disabled={busy} onPress={()=>void confirm('Block this person?','This removes the connection, prevents new requests, and hides your posts from each other, including in groups.','block',{user_id:friend.user_id})}/></View>
        </Card>)}
      </>:view==='Groups'?<>
        <Card><Text style={s.h2}>Make a private group</Text><Field label="Group name" value={groupName} onChangeText={setGroupName} maxLength={60}/><Button title="Create group" disabled={busy||!groupName.trim()} onPress={()=>void change('create_group',{name:groupName},'Group created. Invite your friends below.')}/></Card>
        {!data.groups.length?<Body>Your groups and invitations will appear here.</Body>:data.groups.map(group=><Card key={group.id}><Text style={s.h2}>{group.name}</Text><Label>{group.status==='invited'?'INVITATION':group.owner_id===userId?'YOUR GROUP':'PRIVATE GROUP'}</Label>
          {group.status==='invited'?<><Body>Joining shares your display name with group members and lets you view and share gear posts in this group.</Body><Button title={`Join ${group.name}`} disabled={busy} onPress={()=>void change('accept_group',{group_id:group.id})}/><Button secondary title="Decline invitation" disabled={busy} onPress={()=>void change('leave_group',{group_id:group.id})}/></>:<>
          {group.members.map(member=><View key={member.user_id} style={{gap:8}}><Text selectable style={s.body}>{member.name}{member.user_id===group.owner_id?' · owner':''}{member.status==='invited'?' · invited':''}</Text>{member.user_id!==userId?<Button secondary title={`Block ${member.name}`} disabled={busy} onPress={()=>void confirm("Block this person?","Your posts will be hidden from each other, including in shared groups. Your friendship will also be removed.","block",{user_id:member.user_id})}/>:null}{group.owner_id===userId&&member.user_id!==userId?<Button secondary title={`Remove ${member.name}`} disabled={busy} onPress={()=>void confirm('Remove group member?','They will lose access to this group. Their posts in this group will be removed.','remove_member',{group_id:group.id,user_id:member.user_id})}/>:null}</View>)}
          {group.owner_id===userId?<><Label>INVITE A FRIEND</Label>{accepted.filter(f=>!group.members.some(m=>m.user_id===f.user_id)).map(friend=><Button key={friend.id} secondary title={`Invite ${friend.name}`} disabled={busy} onPress={()=>void change('invite_group',{group_id:group.id,user_id:friend.user_id},'Group invitation sent.')}/>)}{!accepted.length?<Body>Add and accept a friend before inviting them.</Body>:null}<Button secondary title="Close group" disabled={busy} onPress={()=>void confirm('Close this group?','This permanently removes the group and its shared posts for every member. Personal gear and trips are unaffected.','delete_group',{group_id:group.id})}/></>:<Button secondary title="Leave group" disabled={busy} onPress={()=>void confirm('Leave this group?','You will lose access and your posts in the group will be removed. A new invitation is required to return.','leave_group',{group_id:group.id})}/>}</>}
        </Card>)}
      </>:<>{!data.blocked.length?<Body>You have not blocked anyone.</Body>:data.blocked.map(person=><Card key={person.user_id}><Text style={s.h2}>{person.name}</Text><Button secondary title={`Unblock ${person.name}`} disabled={busy} onPress={()=>void change('unblock',{user_id:person.user_id},'Unblocked. A new friend request is still needed.')}/></Card>)}</>}
      </>:null}
      <Button secondary title="Refresh connections" disabled={busy||loading} onPress={()=>void social.refresh()}/>
    </>}
    <Button secondary title="Report a problem" onPress={()=>router.push('/feedback')}/>
  </Page>;
}
