import { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversation } from '@/use-messages';
import { confirmAction } from '@/dialogs';
import { Body, Button, Card, C, ErrorText, Field, Label, s } from '@/ui';

function timestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {month:'short',day:'numeric'}) + ' · ' + date.toLocaleTimeString(undefined, {hour:'numeric',minute:'2-digit'});
}

export default function Conversation() {
  const router = useRouter(), params = useLocalSearchParams<{userId:string | string[]}>(), inset = useSafeAreaInsets();
  const peerId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const conversation = useConversation(peerId || '');
  const {data, userId, loading, loadingMore, busy, error, refresh, loadEarlier, send, act} = conversation;
  const [draft, setDraft] = useState(''), [failedSend, setFailedSend] = useState(false), [notice, setNotice] = useState('');
  const scroller = useRef<ScrollView>(null), atBottom = useRef(true), scrollNext = useRef(true);
  const owner = `${userId ?? ''}:${peerId ?? ''}`, currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {setDraft('');setFailedSend(false);setNotice('');atBottom.current=true;scrollNext.current=true;}, [owner]);
  const latestId = data.messages[data.messages.length - 1]?.id;
  useEffect(() => {if (atBottom.current) scrollNext.current=true;}, [latestId]);
  async function sendDraft() {
    const body = draft.trim(), sendingOwner = owner;
    if (!body || busy || !data.can_message) return;
    setFailedSend(false);setNotice('');
    const sent = await send(body);
    if (currentOwner.current !== sendingOwner) return;
    if (sent) {setDraft('');setFailedSend(false);atBottom.current=true;scrollNext.current=true;scroller.current?.scrollToEnd({animated:true});}
    else setFailedSend(true);
  }
  async function removeFriend() {
    if (!await confirmAction('Remove this friend?', 'You will no longer be able to message each other or see new friends-only posts. Your conversation history remains available. Shared group membership is separate.')) return;
    if (await act('remove_friend', {user_id:peerId})) {setDraft('');setFailedSend(false);setNotice('Friend removed. Your conversation is now history only.');}
  }
  async function block() {
    if (!await confirmAction('Block this person?', 'This removes your friendship, stops messages and new requests, and hides your posts from each other. This conversation will no longer appear.')) return;
    if (await act('block', {user_id:peerId})) router.replace('/messages');
  }
  const composer = userId && data.peer && data.can_message;
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:C.bg}} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? inset.top + 44 : 0}>
    <Stack.Screen options={{title:data.peer?.name || 'Conversation',headerRight:() => null}}/>
    <ScrollView ref={scroller} style={{flex:1}} contentContainerStyle={[s.page,{paddingBottom:18}]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      maintainVisibleContentPosition={{minIndexForVisible:0}} scrollEventThrottle={100}
      onScroll={({nativeEvent}) => {atBottom.current=nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 100;}}
      onContentSizeChange={() => {if (scrollNext.current) {scrollNext.current=false;scroller.current?.scrollToEnd({animated:false});}}}
    >
      {data.peer ? <Card>
        <Label>YOUR CONVERSATION</Label><Text style={s.h2}>{data.peer.name}</Text><Text selectable style={s.small}>ID {data.peer.user_code}</Text>
        <View style={s.row}>
          {data.can_message ? <Button secondary title="Remove friend" disabled={busy} onPress={() => void removeFriend()}/> : null}
          <Button secondary title={`Block ${data.peer.name}`} disabled={busy} onPress={() => void block()}/>
        </View>
      </Card> : null}
      <Button secondary title={loading ? 'Refreshing conversation…' : 'Refresh conversation'} disabled={loading || busy} onPress={() => void refresh()}/>
      <Button secondary title="Back to messages" onPress={() => router.replace('/messages')}/>
      {notice ? <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text> : null}
      {!composer ? <ErrorText message={error}/> : null}
      {loading && !data.peer ? <Body>Loading conversation…</Body> : !userId ? <Card>
        <Text style={s.h2}>Sign in to your messages.</Text><Body>Your conversations belong to your HunterOS account.</Body>
        <Button title="Sign in or create account" onPress={() => router.push('/account')}/>
      </Card> : !data.peer ? <Card>
        <Text style={s.h2}>Messaging unavailable</Text><Body>This conversation is not available. Open Friends & groups to review your connections.</Body>
        <Button secondary title="Friends & groups" onPress={() => router.push('/friends')}/>
      </Card> : <>
        {!data.can_message ? <Card><Text style={s.h2}>Messaging unavailable</Text><Body>You must be accepted friends to send new messages. You can still read your previous conversation.</Body><Button secondary title="Friends & groups" onPress={() => router.push('/friends')}/></Card> : null}
        {data.has_more ? <Button secondary title={loadingMore ? 'Loading earlier messages…' : 'Load earlier messages'} disabled={loadingMore || loading} onPress={() => {scrollNext.current=false;atBottom.current=false;void loadEarlier();}}/> : null}
        {!data.messages.length ? <Card><Text style={s.h2}>Start with a hello.</Text><Body>Your conversation with {data.peer.name} will appear here.</Body></Card> : data.messages.map(message => {
          const mine = message.sender === userId;
          return <View key={message.id} style={{alignSelf:mine ? 'flex-end' : 'flex-start',maxWidth:'90%',gap:5}}>
            <View style={{paddingHorizontal:15,paddingVertical:12,borderRadius:16,borderBottomRightRadius:mine ? 4 : 16,borderBottomLeftRadius:mine ? 16 : 4,backgroundColor:mine ? '#33432a' : C.panel,borderWidth:1,borderColor:mine ? '#63773a' : C.line}}>
              <Text selectable style={{color:C.ink,fontSize:16,lineHeight:23}}>{message.body}</Text>
            </View>
            <Text style={[s.small,{textAlign:mine ? 'right' : 'left'}]}>{mine ? 'You' : data.peer?.name} · {timestamp(message.created_at)}</Text>
          </View>;
        })}
      </>}
    </ScrollView>
    {composer ? <View style={{borderTopWidth:1,borderTopColor:C.line,paddingHorizontal:18,paddingTop:12,paddingBottom:Math.max(inset.bottom,12),backgroundColor:C.bg}}>
      <View style={{width:'100%',maxWidth:924,alignSelf:'center',gap:8}}>
        <ErrorText message={error}/>
        {failedSend ? <Text style={s.small}>Your message is still here. Retry when you are ready.</Text> : null}
        <Field label="Message" placeholder={`Message ${data.peer?.name}`} value={draft} onChangeText={value => {setDraft(value);setFailedSend(false);}} editable={!busy} multiline maxLength={2000} style={{minHeight:72,maxHeight:140}}/>
        <View style={[s.row,{justifyContent:'space-between'}]}>
          <Text style={s.small}>{draft.length} / 2,000</Text>
          <Button title={busy ? 'Sending…' : failedSend ? 'Retry send' : 'Send message'} disabled={busy || !draft.trim()} onPress={() => void sendDraft()}/>
        </View>
      </View>
    </View> : null}
  </KeyboardAvoidingView>;
}
