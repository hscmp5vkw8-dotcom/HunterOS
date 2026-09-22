import * as FS from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
export async function exportFile(json:string){if(!FS.cacheDirectory||!await Sharing.isAvailableAsync())throw Error('File sharing is unavailable.');const file=FS.cacheDirectory+`HunterOS-backup-${new Date().toISOString().slice(0,10)}.json`;await FS.writeAsStringAsync(file,json);await Sharing.shareAsync(file,{mimeType:'application/json',UTI:'public.json'});}
export async function importFile():Promise<string|null>{const result=await DocumentPicker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true});if(result.canceled)return null;const file=result.assets[0];if((file.size??0)>5*1024*1024)throw Error('Maximum backup size is 5 MB.');const content=await FS.readAsStringAsync(file.uri);if(content.length>5*1024*1024)throw Error('Maximum backup size is 5 MB.');return content;}
