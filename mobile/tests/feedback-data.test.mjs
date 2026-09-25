import test from 'node:test';
import assert from 'node:assert/strict';
import {addFeedback,feedbackDelivery,readFeedbackJournal,validateFeedback} from '../src/feedback-data.ts';
const report={id:'HOS-feedback-test-000000001',kind:'Something broke',details:'Synthetic test',steps:'Open feedback',expected:'Receipt',contact_email:'',app_version:'0.4.0',platform:'web',os_version:'test'};
test('only intended feedback fields leave the device; optional reply email is validated',()=>{
 const result=validateFeedback({...report,workspace:{private:'trip'},access_token:'not transmitted'});
 assert.deepEqual(result,report);assert.throws(()=>validateFeedback({...report,contact_email:'bad'}),/reply email/);
 assert.throws(()=>validateFeedback({...report,details:' '.repeat(30)}));assert.throws(()=>validateFeedback({...report,details:'a'.repeat(3001)}));
});
test('failed send persists report and retry reuses ID, with one acknowledged receipt',async()=>{
 let raw=null,calls=0,fail=true;
 const deliver=feedbackDelivery({read:async()=>raw,write:async value=>{raw=value;},send:async payload=>{calls++;assert.equal(readFeedbackJournal(raw)[0].payload.id,payload.id);if(fail)throw Error('Offline');return {id:payload.id,created_at:'2026-09-25T18:00:00Z'};}});
 await assert.rejects(deliver(report),/Offline/);assert.equal(readFeedbackJournal(raw)[0].receipt,undefined);
 fail=false;await deliver(report);await deliver(report);assert.equal(calls,2);assert.equal(readFeedbackJournal(raw).length,1);assert.equal(readFeedbackJournal(raw)[0].receipt.id,report.id);
});
test('unconfirmed responses and local save failures never display a received report',async()=>{
 let raw=null,calls=0;
 const deliver=feedbackDelivery({read:async()=>raw,write:async value=>{raw=value;},send:async()=>({id:'wrong',created_at:new Date().toISOString()})});
 await assert.rejects(deliver(report),/not confirmed/);assert.equal(readFeedbackJournal(raw)[0].receipt,undefined);
 const badDisk=feedbackDelivery({read:async()=>null,write:async()=>{throw Error('Storage full');},send:async()=>{calls++;}});
 await assert.rejects(badDisk(report),/Storage full/);assert.equal(calls,0);
});
test('corrupted history is preserved and pending reports are never trimmed',()=>{
 assert.throws(()=>readFeedbackJournal('{bad'),/Nothing was overwritten/);
 let rows=[];for(let i=0;i<50;i++)rows=addFeedback(rows,{...report,id:`HOS-feedback-test-${String(i).padStart(9,'0')}`});
 assert.throws(()=>addFeedback(rows,{...report,id:'HOS-feedback-test-999999999'}),/50 unsent/);assert.equal(rows.length,50);
 assert.throws(()=>addFeedback(rows,{...rows[0].payload,details:'Changed content'}),/already in use/);
});
