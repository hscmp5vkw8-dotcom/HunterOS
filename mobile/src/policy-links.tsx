import { useState } from 'react';
import { Linking, Text } from 'react-native';
import { Body, Button, Card, ErrorText, s } from './ui';

export const supportOrigin = 'https://hunteros-support.j5fyt5h7qj.chatgpt.site';

export function PolicyLink({title,path}:{title:string;path:string}) {
  const [error,setError]=useState('');
  async function open() {
    setError('');
    try { await Linking.openURL(`${supportOrigin}${path}`); }
    catch { setError(`Could not open the page. Visit ${supportOrigin}${path} in your browser, or email support@gethunteros.com.`); }
  }
  return <><Button secondary title={title} onPress={()=>void open()}/><ErrorText message={error}/></>;
}

export function AccountDataLinks() {
  return <Card><Text style={s.h2}>Your account and data</Text>
    <Body>Request account deletion through our support page, even if you cannot sign in. Support verifies ownership before deleting the account and its associated cloud data. Uninstalling or signing out does not delete your cloud account.</Body>
    <PolicyLink title="Delete account" path="/delete-account/"/>
    <PolicyLink title="Read the privacy policy" path="/privacy/"/>
    <PolicyLink title="Community guidelines" path="/community/"/>
  </Card>;
}
