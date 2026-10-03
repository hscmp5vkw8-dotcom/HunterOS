import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useInbox } from '@/use-messages';
import { Body, Button, Card, C, Chips, ErrorText, Field, Label, Page, s } from '@/ui';
import { filterInbox } from '@/message-data';

function timestamp(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {month:'short',day:'numeric'}) + ' · ' + date.toLocaleTimeString(undefined, {hour:'numeric',minute:'2-digit'});
}

export default function Messages() {
  const router = useRouter(), inbox = useInbox();
  const {data, userId, loading, error, refresh} = inbox;
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('All');
  useEffect(()=>{setQuery('');setFilter('All');},[userId]);
  const visible=filterInbox(data.conversations,query,filter==='Unread');
  const unread = data.conversations.reduce((total, conversation) => total + conversation.unread_count, 0);
  return <Page>
    <Stack.Screen options={{title:'Messages'}}/>
    <Label>KEEP YOUR CREW CLOSE</Label><Text style={s.title}>Messages.</Text>
    <Body>One-to-one conversations with your accepted friends.</Body>
    <ErrorText message={error}/>
    {loading && !data.conversations.length ? <Body>Loading messages…</Body> : !userId ? <Card>
      <Text style={s.h2}>A place to make plans.</Text><Body>Sign in to message your HunterOS friends.</Body>
      <Button title="Sign in or create account" onPress={() => router.push('/account')}/>
    </Card> : <>
      <View style={[s.row,{justifyContent:'space-between'}]}>
        <Text style={s.h2}>Your conversations</Text>
        {unread > 0 ? <Text accessibilityLabel={`${unread} unread messages`} style={{color:C.lime,fontWeight:'800'}}>{unread} unread</Text> : null}
      </View>
      <Field label="Search friends in messages" value={query} onChangeText={setQuery} placeholder="Name or user ID" maxLength={100}/>
      <Chips values={['All','Unread']} value={filter} onChange={setFilter}/>
      {data.conversations.length&&!visible.length?<Body>No conversations match this filter.</Body>:null}
      {!data.conversations.length && !error ? <Card>
        <Text style={s.h2}>Say hello to your crew.</Text>
        <Body>Add a friend by user ID or email. After they accept, open their conversation to send your first message.</Body>
        <Button title="Find your friends" onPress={() => router.push('/friends')}/>
      </Card> : visible.map(conversation => <Pressable
        key={conversation.user_id} accessibilityRole="button" accessibilityLabel={`Open conversation with ${conversation.name}`}
        onPress={() => router.push({pathname:'/messages/[userId]',params:{userId:conversation.user_id}})}
        style={({pressed}) => [s.card,{gap:8,opacity:pressed ? .75 : 1}]}
      >
        <View style={[s.row,{justifyContent:'space-between',alignItems:'flex-start'}]}>
          <View style={{flex:1,gap:3}}><Text style={s.h2}>{conversation.name}</Text><Text style={s.small}>ID {conversation.user_code}</Text></View>
          {conversation.unread_count > 0 ? <View style={{backgroundColor:C.lime,borderRadius:14,paddingVertical:4,paddingHorizontal:10}}><Text style={{color:C.bg,fontWeight:'800'}}>{conversation.unread_count} unread</Text></View> : null}
        </View>
        <Text numberOfLines={2} style={[s.body,conversation.unread_count > 0 && {color:C.ink}]}>{conversation.last_message || 'No messages yet. Start the conversation.'}</Text>
        {conversation.last_at ? <Text style={s.small}>{timestamp(conversation.last_at)}</Text> : null}
        {!conversation.can_message ? <Text style={s.small}>History only · add each other as friends to message again</Text> : null}
      </Pressable>)}
      <Button secondary title="Friends & groups" onPress={() => router.push('/friends')}/>
    </>}
    <Button secondary title={loading ? 'Refreshing messages…' : error ? 'Try messages again' : 'Refresh messages'} disabled={loading} onPress={() => void refresh()}/>
  </Page>;
}
