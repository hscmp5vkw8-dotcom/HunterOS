import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { C, Button, Card, Label, Page, s } from '@/ui';
import { addScannedGear, lookupIdentifier } from '@/scan';
export default function ScanGear(){
 const router=useRouter(),{state,commit}=useStore(),[permission,requestPermission]=useCameraPermissions(),[manual,setManual]=useState(''),[message,setMessage]=useState(''),[locked,setLocked]=useState(false);const last=useRef('');
 async function resolve(code:string,kind='barcode'){const clean=code.trim();if(!clean||clean===last.current)return;last.current=clean;setLocked(true);setMessage('Looking up '+clean+'…');try{const match=await lookupIdentifier(clean,state.scannedProducts);await commit(s=>addScannedGear(s,clean,kind,match));setMessage(match?'Added '+match.name+' to your locker and scan database.':'Saved '+clean+' to your scan database. Add product details from the locker when known.');}catch(e){setMessage(String((e as any)?.message||e));}finally{setTimeout(()=>{last.current='';setLocked(false);},900);}}
 return <Page><Label>SCAN → SAVE → REUSE</Label><Text style={s.title}>Add gear by barcode.</Text><Text style={s.body}>Every successful scan is saved locally in HunterOS. Known UPC/EAN codes are looked up against your scan history first, then Open Food Facts for packaged food. Outdoor manufacturer SKU lookup is stored for later catalog/backend matching.</Text>
 {!permission?.granted?<Card><Text style={s.h2}>Camera permission</Text><Text style={s.body}>HunterOS needs camera access only while this scanner is open.</Text><Button title="Allow camera" onPress={()=>void requestPermission()}/></Card>:
 <View style={{height:320,borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:C.line}}><CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e','code128','code39','code93','itf14','datamatrix','qr','pdf417']}} onBarcodeScanned={locked?undefined:({data,type})=>void resolve(data,type)}/></View>}
 <Card><Label>MANUAL UPC / EAN / SKU</Label><TextInput value={manual} onChangeText={setManual} placeholder="Scan code or enter manufacturer SKU" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} style={{color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:12,padding:13}}/><Button title="Look up & save" disabled={!manual.trim()||locked} onPress={()=>void resolve(manual,'manual')}/></Card>
 {message?<Card><Text selectable style={s.body}>{message}</Text></Card>:null}<Button secondary title="Back to gear locker" onPress={()=>router.back()}/></Page>;
}