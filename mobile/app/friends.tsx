import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Share, Text, View } from 'react-native';
import { useSocial } from '@/use-social';
import type { Friend } from '@/social';
import { confirmAction } from '@/dialogs';
import { Body, Button, Card, C, Chips, ErrorText, Field, Label, Page, s } from '@/ui';

export default function Friends() {
  const router = useRouter(), social = useSocial();
  const {data, userId, loading, busy, error, act} = social;
  const [name, setName] = useState(''), [identifier, setIdentifier] = useState(''), [groupName, setGroupName] = useState('');
  const [view, setView] = useState('Friends'), [notice, setNotice] = useState(''), [shareError, setShareError] = useState('');
  useEffect(() => {setName(data.profile?.name ?? '');}, [userId, data.profile?.name]);
  useEffect(() => {setIdentifier('');setNotice('');setShareError('');setGroupName('');setView('Friends');}, [userId]);
  async function change(action: string, payload: Record<string, unknown>, message = '') {
    setNotice('');
    if (await act(action, payload)) {setNotice(message);return true;}
    return false;
  }
  async function confirm(title: string, detail: string, action: string, payload: Record<string, unknown>) {
    if (await confirmAction(title, detail)) await change(action, payload);
  }
  async function shareId() {
    if (!data.profile) return;
    setShareError('');
    try {await Share.share({message:`Add me on HunterOS. My user ID is ${data.profile.user_code}. Open Friends & groups and send me a friend request.`});}
    catch {setShareError('Could not open sharing. You can select and copy your user ID above.');}
  }
  const accepted = data.friends.filter(f => f.status === 'accepted');
  const incoming = data.friends.filter(f => f.status === 'pending' && f.incoming);
  const outgoing = data.friends.filter(f => f.status === 'pending' && !f.incoming);
  const blockDetail = 'This removes your friendship, stops messages and new friend requests, and hides your posts from each other, including in shared groups. Your previous conversation will no longer appear.';
  function friendCard(friend: Friend) {
    return <Card key={friend.id}>
      <Text style={s.h2}>{friend.name}</Text>
      <Text selectable style={s.small}>ID {friend.user_code}</Text>
      {friend.status === 'accepted' ? <Button title={`Message ${friend.name}`} onPress={() => router.push({pathname:'/messages/[userId]',params:{userId:friend.user_id}})}/> : <Body>{friend.incoming ? 'Wants to be your friend.' : 'Waiting for them to accept.'}</Body>}
      {friend.status === 'pending' && friend.incoming ? <Button title={`Accept ${friend.name}`} disabled={busy} onPress={() => void change('accept', {id:friend.id}, 'You are now friends. You can message each other.')}/> : null}
      <View style={s.row}>
        <Button secondary title={friend.status === 'accepted' ? 'Remove friend' : friend.incoming ? 'Decline' : 'Cancel request'} disabled={busy} onPress={() => friend.status === 'accepted'
          ? void confirm('Remove this friend?', 'You will no longer be able to message each other or see new friends-only posts. Your conversation history remains available. Shared group membership is separate.', 'remove_friend', {id:friend.id})
          : void change('remove_friend', {id:friend.id}, friend.incoming ? 'Request declined.' : 'Request canceled.')}/>
        <Button secondary title={`Block ${friend.name}`} disabled={busy} onPress={() => void confirm('Block this person?', blockDetail, 'block', {user_id:friend.user_id})}/>
      </View>
    </Card>;
  }
  return <Page>
    <Stack.Screen options={{title:'Friends & groups'}}/>
    <Label>YOUR PEOPLE. YOUR CHOICE.</Label>
    <Text style={s.title}>Find your crew.</Text>
    <Body>Connect with an 8-digit user ID or email. Once a request is accepted, you can message each other. Your trips, locations, locker and backups stay private.</Body>
    <ErrorText message={error}/>{notice ? <Text selectable accessibilityLiveRegion="polite" style={s.body}>{notice}</Text> : null}
    {loading && !data.profile ? <Text style={s.body}>Loading your connections…</Text> : !userId ? <Card>
      <Text style={s.h2}>Bring your friends along.</Text><Body>Sign in or create your HunterOS account to connect, message and make private groups.</Body>
      <Button title="Sign in or create account" onPress={() => router.push('/account')}/>
    </Card> : <>
      <Card>
        {data.profile ? <>
          <Label>YOUR USER ID</Label>
          <Text selectable accessibilityLabel={`Your user ID: ${data.profile.user_code.split('').join(' ')}`} style={[s.stat,{fontSize:34,letterSpacing:4,color:C.lime}]}>{data.profile.user_code}</Text>
          <Body>This is your permanent HunterOS ID. Share it with someone you want to connect with.</Body>
          <Button secondary title="Share my user ID" onPress={() => void shareId()}/><ErrorText message={shareError}/>
        </> : <Text style={s.h2}>Your profile</Text>}
        <Field label="Display name" value={name} onChangeText={setName} maxLength={50}/>
        <Button title="Save display name" disabled={busy || !name.trim()} onPress={() => void change('profile', {name}, 'Display name saved.')}/>
      </Card>
      <Button secondary title="Open messages" onPress={() => router.push('/messages')}/>
      {data.profile ? <>
        <Chips values={['Friends','Groups','Blocked']} value={view} onChange={setView}/>
        {view === 'Friends' ? <>
          <Card>
            <Text style={s.h2}>Add a friend</Text>
            <Field label="User ID or email" placeholder="8-digit ID or email address" autoCapitalize="none" autoCorrect={false} value={identifier} onChangeText={setIdentifier} maxLength={254}/>
            <Body>Your friend must accept before you can message. Email addresses stay private.</Body>
            <Button title="Send friend request" disabled={busy || !identifier.trim()} onPress={() => void (async () => {
              if (await change('request', {identifier:identifier.trim()}, 'Request submitted. Your friend can accept it in Friends & groups.')) setIdentifier('');
            })()}/>
          </Card>
          <View style={{gap:12}}><Label>REQUESTS FOR YOU · {incoming.length}</Label>{incoming.length ? incoming.map(friendCard) : <Body>No requests waiting for you.</Body>}</View>
          <View style={{gap:12}}><Label>YOUR FRIENDS · {accepted.length}</Label>{accepted.length ? accepted.map(friendCard) : <Card><Text style={s.h2}>Start with someone you know.</Text><Body>Share your ID or send a request above. Accepted friends will appear here.</Body></Card>}</View>
          <View style={{gap:12}}><Label>SENT REQUESTS · {outgoing.length}</Label>{outgoing.length ? outgoing.map(friendCard) : <Body>No pending requests sent.</Body>}</View>
        </> : view === 'Groups' ? <>
          <Card><Text style={s.h2}>Make a private group</Text><Field label="Group name" value={groupName} onChangeText={setGroupName} maxLength={60}/><Button title="Create group" disabled={busy || !groupName.trim()} onPress={() => void change('create_group', {name:groupName}, 'Group created. Invite your friends below.')}/></Card>
          {!data.groups.length ? <Body>Your groups and invitations will appear here.</Body> : data.groups.map(group => <Card key={group.id}>
            <Text style={s.h2}>{group.name}</Text><Label>{group.status === 'invited' ? 'INVITATION' : group.owner_id === userId ? 'YOUR GROUP' : 'PRIVATE GROUP'}</Label>
            {group.status === 'invited' ? <>
              <Body>Joining shares your display name with group members and lets you view and share gear posts in this group.</Body>
              <Button title={`Join ${group.name}`} disabled={busy} onPress={() => void change('accept_group', {group_id:group.id})}/>
              <Button secondary title="Decline invitation" disabled={busy} onPress={() => void change('leave_group', {group_id:group.id})}/>
            </> : <>
              {group.members.map(member => <View key={member.user_id} style={{gap:8}}>
                <Text selectable style={s.body}>{member.name}{member.user_id === group.owner_id ? ' · owner' : ''}{member.status === 'invited' ? ' · invited' : ''}</Text>
                {member.user_id !== userId ? <Button secondary title={`Block ${member.name}`} disabled={busy} onPress={() => void confirm('Block this person?', blockDetail, 'block', {user_id:member.user_id})}/> : null}
                {group.owner_id === userId && member.user_id !== userId ? <Button secondary title={`Remove ${member.name}`} disabled={busy} onPress={() => void confirm('Remove group member?', 'They will lose access to this group. Their posts in this group will be removed.', 'remove_member', {group_id:group.id,user_id:member.user_id})}/> : null}
              </View>)}
              {group.owner_id === userId ? <>
                <Label>INVITE A FRIEND</Label>
                {accepted.filter(f => !group.members.some(m => m.user_id === f.user_id)).map(friend => <Button key={friend.id} secondary title={`Invite ${friend.name}`} disabled={busy} onPress={() => void change('invite_group', {group_id:group.id,user_id:friend.user_id}, 'Group invitation sent.')}/>)}
                {!accepted.length ? <Body>Add and accept a friend before inviting them.</Body> : null}
                <Button secondary title="Close group" disabled={busy} onPress={() => void confirm('Close this group?', 'This permanently removes the group and its shared posts for every member. Personal gear and trips are unaffected.', 'delete_group', {group_id:group.id})}/>
              </> : <Button secondary title="Leave group" disabled={busy} onPress={() => void confirm('Leave this group?', 'You will lose access and your posts in the group will be removed. A new invitation is required to return.', 'leave_group', {group_id:group.id})}/>}
            </>}
          </Card>)}
        </> : <>
          <Body>Blocked people cannot send you requests or messages. Unblocking does not restore a friendship.</Body>
          {!data.blocked.length ? <Card><Text style={s.h2}>No blocked people.</Text><Body>You can block someone from a request, friendship or conversation.</Body></Card> : data.blocked.map(person => <Card key={person.user_id}>
            <Text style={s.h2}>{person.name}</Text><Text selectable style={s.small}>ID {person.user_code}</Text>
            <Button secondary title={`Unblock ${person.name}`} disabled={busy} onPress={() => void change('unblock', {user_id:person.user_id}, 'Unblocked. A new friend request is still needed.')}/>
          </Card>)}
        </>}
      </> : null}
    </>}
    <Button secondary title={loading ? 'Refreshing connections…' : error ? 'Try connections again' : 'Refresh connections'} disabled={busy || loading} onPress={() => void social.refresh()}/>
    <Button secondary title="Report a problem" onPress={() => router.push('/feedback')}/>
  </Page>;
}
