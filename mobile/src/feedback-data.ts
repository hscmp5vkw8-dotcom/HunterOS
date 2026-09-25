export const feedbackKinds = ['Something broke','An idea','What I liked'] as const;
export type FeedbackPayload = {id:string;kind:string;details:string;steps:string;expected:string;contact_email:string;app_version:string;platform:string;os_version:string};
export type FeedbackReceipt = {id:string;created_at:string};
export type FeedbackEntry = {payload:FeedbackPayload;queuedAt:string;receipt?:FeedbackReceipt};
export function validateFeedback(value:FeedbackPayload):FeedbackPayload {
 const limits:Record<keyof FeedbackPayload,number>={id:80,kind:40,details:3000,steps:2000,expected:1500,contact_email:254,app_version:32,platform:16,os_version:80};
 const result={} as FeedbackPayload;
 for(const key of Object.keys(limits) as (keyof FeedbackPayload)[]){if(typeof value?.[key]!=='string')throw Error('Invalid feedback report.');result[key]=value[key].trim();if(result[key].length>limits[key])throw Error('Your feedback is too long. Please shorten it.');}
 if(!/^HOS-[a-z0-9-]{16,76}$/.test(result.id))throw Error('Invalid feedback reference.');
 if(!feedbackKinds.includes(result.kind as typeof feedbackKinds[number])||!result.details||!result.app_version||!['ios','android','web'].includes(result.platform))throw Error('Add your feedback before sending.');
 if(result.contact_email&&!/^\S+@\S+\.\S+$/.test(result.contact_email))throw Error('Enter a valid reply email or leave it blank.');
 return result;
}
export function feedbackId(){return `HOS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}-${Math.random().toString(36).slice(2,12)}`;}
export function readFeedbackJournal(raw:string|null):FeedbackEntry[]{
 if(!raw)return [];
 try {const value:unknown=JSON.parse(raw);if(!Array.isArray(value)||value.length>50)throw Error();return value.map(entry=>{
  if(!entry||typeof entry.queuedAt!=='string'||!Number.isFinite(Date.parse(entry.queuedAt)))throw Error();
  const payload=validateFeedback(entry.payload);const receipt=entry.receipt;
  if(receipt&&(receipt.id!==payload.id||!Number.isFinite(Date.parse(receipt.created_at))))throw Error();
  return {payload,queuedAt:entry.queuedAt,...(receipt?{receipt:{id:receipt.id,created_at:receipt.created_at}}:{})};
 });}catch{throw Error('Saved feedback could not be read. Nothing was overwritten. Contact support@gethunteros.com.');}
}
export function addFeedback(entries:FeedbackEntry[],payload:FeedbackPayload):FeedbackEntry[]{
 const clean=validateFeedback(payload),found=entries.find(e=>e.payload.id===clean.id);
 if(found){if(JSON.stringify(found.payload)!==JSON.stringify(clean))throw Error('Feedback reference is already in use.');return entries;}
 const next=[{payload:clean,queuedAt:new Date().toISOString()},...entries];
 while(next.length>50){const i=next.map(e=>!!e.receipt).lastIndexOf(true);if(i<0)throw Error('There are 50 unsent reports. Retry those before adding another.');next.splice(i,1);}
 return next;
}
type FeedbackDependencies={read:()=>Promise<string|null>;write:(raw:string)=>Promise<void>;send:(payload:FeedbackPayload)=>Promise<FeedbackReceipt>};
export function feedbackDelivery(deps:FeedbackDependencies){return async(payload:FeedbackPayload)=>{
 let entries=addFeedback(readFeedbackJournal(await deps.read()),payload);
 const existing=entries.find(e=>e.payload.id===payload.id)!;
 if(existing.receipt)return existing.receipt;
 await deps.write(JSON.stringify(entries));
 const receipt=await deps.send(existing.payload);
 if(receipt?.id!==payload.id||!Number.isFinite(Date.parse(receipt.created_at)))throw Error('Delivery was not confirmed. Your report is saved here for retry.');
 entries=readFeedbackJournal(await deps.read()).map(e=>e.payload.id===payload.id?{...e,receipt}:e);
 await deps.write(JSON.stringify(entries));return receipt;
};}
