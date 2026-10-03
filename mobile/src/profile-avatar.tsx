import { Text, View } from 'react-native';
import { C } from './ui';

export function ProfileAvatar({name='HunterOS member',size=76}:{name?:string;size?:number}){
  const initials=name.trim().split(/\s+/).slice(0,2).map(word=>[...word][0]??'').join('').toUpperCase()||'HM';
  return <View accessibilityLabel={`${name} initials avatar`} style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#33432a',borderWidth:1,borderColor:C.lime,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
    <Text style={{color:C.lime,fontSize:size*.36,fontWeight:'800'}}>{initials}</Text>
  </View>;
}
