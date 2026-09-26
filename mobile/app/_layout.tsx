import { Link, Stack } from 'expo-router';
import { useEffect } from 'react';
import { watchAuthRefresh } from '@/cloud';
import { StatusBar } from 'expo-status-bar';
import { Provider } from '@/store';
import { C } from '@/ui';
export { ErrorBoundary } from 'expo-router';
export default function RootLayout(){useEffect(watchAuthRefresh,[]);return <Provider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:C.bg},headerTintColor:C.ink,headerShadowVisible:false,contentStyle:{backgroundColor:C.bg},headerBackButtonDisplayMode:'minimal',headerRight:()=> <Link href='/' accessibilityLabel='All trips' style={{color:C.lime,padding:12,fontWeight:'700'}}>Trips</Link>}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="account" options={{title:'Account & cloud backup'}}/><Stack.Screen name="gear/scan" options={{title:'Scan gear'}}/><Stack.Screen name="privacy" options={{title:'Privacy & data'}}/><Stack.Screen name="feedback" options={{title:'Family feedback'}}/><Stack.Screen name="loadouts/index" options={{title:"Loadouts"}}/><Stack.Screen name="loadout/[id]" options={{title:"Your loadout"}}/><Stack.Screen name="trip/new" options={{title:'Build a trip',presentation:'modal'}}/><Stack.Screen name="gear/edit" options={{title:'Gear details',presentation:'modal'}}/><Stack.Screen name="product/[id]" options={{title:'Product details'}}/><Stack.Screen name="trip/[id]" options={{title:'Your trip'}}/></Stack></Provider>;}
