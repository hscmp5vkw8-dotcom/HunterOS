import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { watchAuthRefresh } from '@/cloud';
import { StatusBar } from 'expo-status-bar';
import { Provider } from '@/store';
import { C } from '@/ui';
import { AccountProvider } from '@/use-account';
import { ProfileButton } from '@/profile-button';
export { ErrorBoundary } from 'expo-router';
export default function RootLayout(){useEffect(watchAuthRefresh,[]);return <AccountProvider><Provider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:C.bg},headerTintColor:C.ink,headerShadowVisible:false,contentStyle:{backgroundColor:C.bg},headerBackButtonDisplayMode:'minimal',headerRight:()=> <ProfileButton/>}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="friends" options={{title:'Friends & groups'}}/><Stack.Screen name="messages/index" options={{title:'Messages'}}/><Stack.Screen name="messages/[userId]" options={{title:'Conversation'}}/><Stack.Screen name="trips" options={{title:'Your trips'}}/><Stack.Screen name="profile" options={{title:'Your profile'}}/><Stack.Screen name="account" options={{title:'Account & cloud backup'}}/><Stack.Screen name="gear/scan" options={{title:'Scan gear'}}/><Stack.Screen name="privacy" options={{title:'Privacy & data'}}/><Stack.Screen name="feedback" options={{title:'Family feedback'}}/><Stack.Screen name="loadouts/index" options={{title:"Loadouts"}}/><Stack.Screen name="loadout/[id]" options={{title:"Your loadout"}}/><Stack.Screen name="trip/new" options={{title:'Build a trip',presentation:'modal'}}/><Stack.Screen name="gear/edit" options={{title:'Gear details',presentation:'modal'}}/><Stack.Screen name="product/[id]" options={{title:'Product details'}}/><Stack.Screen name="trip/[id]" options={{title:'Your trip'}}/></Stack></Provider></AccountProvider>;}
