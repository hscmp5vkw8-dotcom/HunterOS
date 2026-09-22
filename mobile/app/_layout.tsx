import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from '@/store';
import { C } from '@/ui';
export { ErrorBoundary } from 'expo-router';
export default function RootLayout(){return <Provider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:C.bg},headerTintColor:C.ink,headerShadowVisible:false,contentStyle:{backgroundColor:C.bg},headerBackButtonDisplayMode:'minimal'}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="trip/new" options={{title:'Build a trip',presentation:'modal'}}/><Stack.Screen name="gear/edit" options={{title:'Gear details',presentation:'modal'}}/><Stack.Screen name="product/[id]" options={{title:'Product details'}}/><Stack.Screen name="trip/[id]" options={{title:'Your trip'}}/></Stack></Provider>;}
