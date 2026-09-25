import { useRef, useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { C, Button, Card, Label, Page, s } from '@/ui';
import { addScannedGear, lookupIdentifier } from '@/scan';
export default function ScanGear() {
 const router=useRouter(),{state,commit}=useStore(),[permission,requestPermission]=useCameraPermissions();
 const [manual,setManual]=useState(''),[message,setMessage]=useState(''),[locked,setLocked]=useState(false),[working,setWorking]=useState(false);
 const active=useRef(false);
 async function resolve(code:string,kind='barcode') {
  if(active.current)return;
  const clean=code.trim();
  if(!clean||clean.length>200||/[\u0000-\u001f]/.test(clean)){setMessage('Enter a barcode or SKU of up to 200 characters.');return;}
  active.current=true;setLocked(true);setWorking(true);setMessage('Looking up '+clean+'...');
  try {const match=await lookupIdentifier(clean,state.scannedProducts);await commit(s=>addScannedGear(s,clean,kind,match));setMessage(match?'Saved '+match.name+' in your locker and scan history.':'Saved '+clean+'. Open the item in your locker to add its name, weight and other details.');}
  catch(error){setMessage(error instanceof Error?error.message:String(error));}
  finally{setWorking(false);}
 }
 return <Page><Label>SCAN / SAVE / REUSE</Label><Text style={s.title}>Add gear by barcode.</Text>
 <Text style={s.body}>HunterOS checks saved scans and its catalog first. Numeric food barcodes may be sent to Open Food Facts for lookup. Unknown codes are saved for you to identify; manufacturer SKUs are not automatically verified.</Text>
 {!permission?.granted?<Card><Text style={s.h2}>Camera access</Text><Text style={s.body}>Use the camera to scan, or enter a code below. No camera photos or video are uploaded.</Text>
 <Button title={permission&&!permission.canAskAgain?'Open camera settings':'Allow camera'} onPress={()=>void (permission&&!permission.canAskAgain?Linking.openSettings():requestPermission()).catch(()=>setMessage('Could not open camera permissions. You can enter the code below.'))}/></Card>:
 <View style={{height:320,borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:C.line}}><CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e','code128','code39','code93','itf14','datamatrix','qr','pdf417']}} onBarcodeScanned={locked?undefined:({data,type})=>void resolve(data,type)}/></View>}
 <Card><Label>MANUAL UPC / EAN / SKU</Label><TextInput accessibilityLabel="Barcode or manufacturer SKU" value={manual} onChangeText={setManual} maxLength={200} editable={!working} placeholder="Enter barcode or manufacturer SKU" placeholderTextColor={C.muted} autoCapitalize="characters" autoCorrect={false} style={{color:C.ink,borderWidth:1,borderColor:C.line,borderRadius:12,padding:13}}/>
 <Button title="Look up & save" disabled={!manual.trim()||locked} onPress={()=>void resolve(manual,'manual')}/>
 {locked?<Button secondary title={working?'Looking up...':'Scan another item'} disabled={working} onPress={()=>{active.current=false;setLocked(false);setManual('');setMessage('');}}/>:null}</Card>
 {message?<Card><Text selectable accessibilityRole="alert" style={s.body}>{message}</Text></Card>:null}<Button secondary title="Back to gear locker" disabled={working} onPress={()=>router.replace('/locker')}/></Page>;
}
