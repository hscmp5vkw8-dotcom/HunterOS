import { Alert } from 'react-native';
export const confirmAction=(title:string,message:string):Promise<boolean>=>new Promise(resolve=>Alert.alert(title,message,[{text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Continue',style:'destructive',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
