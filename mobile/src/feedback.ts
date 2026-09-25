import { Linking, Platform, Share } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './cloud';
import { feedbackDelivery, type FeedbackPayload, type FeedbackReceipt } from './feedback-data';
import { readFeedbackSaved, writeFeedbackSaved } from './feedback-storage';

export const appVersion = Constants.expoConfig?.version ?? '0.4.1';
export const supportEmail = 'support@gethunteros.com';
export const submitFeedback=feedbackDelivery({read:readFeedbackSaved,write:writeFeedbackSaved,send:async(payload:FeedbackPayload)=>{
 if(!supabase)throw Error('Feedback sending is not available in this build. Your report is saved on this device.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const {data,error}=await supabase.rpc('submit_feedback',{p_report:payload}).abortSignal(controller.signal);
  if(error)throw Error(error.code==='P0001'?'Feedback limit reached. Your report is saved here; retry later.':'Feedback was not confirmed. Your report is saved on this device; retry when online.');
  return data as FeedbackReceipt;
 }finally{clearTimeout(timeout);}
}});
export async function emailFeedback(message: string) {
  await Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(`HunterOS ${appVersion} feedback`)}&body=${encodeURIComponent(message)}`);
}
export async function shareFeedback(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      await navigator.share({title:'HunterOS feedback',text:message});
      return true;
    }
    await navigator.clipboard.writeText(message);
    return true;
  }
  const result = await Share.share({title:'HunterOS feedback',message});
  return result.action === Share.sharedAction;
}

export function feedbackReport(kind:string, details:string, steps:string, expected:string, context={version:appVersion,device:`${Platform.OS} ${Platform.Version??''}`.trim()}) {
  return [
    `HunterOS ${context.version} — family beta feedback`,
    `Device: ${context.device}`,
    `Type: ${kind}`,
    '', details.trim(),
    ...(steps.trim() ? ['', 'Steps to reproduce:', steps.trim()] : []),
    ...(expected.trim() ? ['', 'What I expected:', expected.trim()] : []),
  ].join('\n');
}
