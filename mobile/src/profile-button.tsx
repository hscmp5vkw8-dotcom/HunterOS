import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAccount } from './use-account';
import { C } from './ui';

export function ProfileButton(){
  const {user,ready,error}=useAccount(),router=useRouter();
  const status=!ready?'Checking…':error?'Check account':user?'Signed in':'Signed out';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${status}. ${user?'Open your profile':'Sign in or create account'}`} disabled={!ready} onPress={()=>router.navigate(user?'/profile':'/account')} style={({pressed})=>({minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,opacity:pressed?.7:1})}>
    <View style={{width:28,height:28,borderRadius:14,borderWidth:1,borderColor:C.lime,alignItems:'center',justifyContent:'center',gap:2}}><View style={{width:7,height:7,borderRadius:4,backgroundColor:C.lime}}/><View style={{width:14,height:7,borderTopLeftRadius:8,borderTopRightRadius:8,backgroundColor:C.lime}}/></View><View><Text style={{color:C.lime,fontSize:12,fontWeight:'800'}}>{user?'Profile':'Account'}</Text><Text style={{color:C.muted,fontSize:10}}>{status}</Text></View>
  </Pressable>;
}
