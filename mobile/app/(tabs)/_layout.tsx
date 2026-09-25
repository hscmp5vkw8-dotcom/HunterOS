import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { C } from '@/ui';
const glyph=(mark:string)=>(props:{color:ColorValue})=><Text style={{color:props.color,fontSize:22}}>{mark}</Text>;
export default function TabLayout(){return <Tabs screenOptions={{headerStyle:{backgroundColor:C.bg},headerTintColor:C.ink,headerShadowVisible:false,tabBarStyle:{backgroundColor:'#131d14',borderTopColor:C.line},tabBarActiveTintColor:C.lime,tabBarInactiveTintColor:C.muted,tabBarLabelStyle:{fontSize:11}}}><Tabs.Screen name="index" options={{title:'HunterOS',tabBarLabel:'Trips',tabBarIcon:glyph('△')}}/><Tabs.Screen name="catalog" options={{title:'Gear catalog',tabBarLabel:'Gear',tabBarIcon:glyph('▦')}}/><Tabs.Screen name="locker" options={{title:'Gear locker',tabBarLabel:'Locker',tabBarIcon:glyph('▤')}}/><Tabs.Screen name="settings" options={{title:'Your workspace',tabBarLabel:'Settings',tabBarIcon:glyph('⋯')}}/></Tabs>;}
