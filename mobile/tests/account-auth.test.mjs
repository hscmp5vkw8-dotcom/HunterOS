import test from 'node:test';
import assert from 'node:assert/strict';
import { accountEmail, newPassword, emailCode, createAccountAuth } from '../src/account-auth.ts';

function setup() {
 const calls=[];
 const main={
  resend:async value=>{calls.push(['resend',value]);return {error:null};},
  verifyOtp:async value=>{calls.push(['confirm',value]);return {data:{session:{user:{id:'owner'}}},error:null};},
  resetPasswordForEmail:async value=>{calls.push(['request',value]);return {error:null};},
 };
 const recovery={
  verifyOtp:async value=>{calls.push(['recovery',value]);return {data:{user:{id:'owner'},session:{user:{id:'owner'}}},error:null};},
  getSession:async()=>({data:{session:{user:{id:'owner'}}},error:null}),
  updateUser:async value=>{calls.push(['update',value]);return {error:null};},
  signOut:async value=>{calls.push(['signout',value]);return {error:null};},
 };
 return {calls,main,recovery,flow:createAccountAuth(main,()=>recovery)};
}
test('email, confirmation and new-password validation fails before any request',()=>{
 assert.equal(accountEmail(' person@example.com '),'person@example.com');
 assert.equal(emailCode('123 456'),'123456');
 assert.equal(emailCode('12345678'),'12345678');
 assert.throws(()=>accountEmail('bad'),/valid email/);
 for(const code of ['', '12345', '123456x', '12345678901'])assert.throws(()=>emailCode(code));
 assert.throws(()=>newPassword('short','short'),/12 characters/);
 assert.throws(()=>newPassword('long passphrase','different passphrase'),/do not match/);
});
test('signup confirmation and reset verification use the correct separate clients',async()=>{
 const {flow,calls}=setup();
 await flow.confirmEmail(' person@example.com ','123456');
 await flow.requestRecovery(' person@example.com ');
 await flow.verifyRecovery('person@example.com','876543');
 await flow.finishRecovery('long passphrase','long passphrase');
 assert.deepEqual(calls.map(([name])=>name),['confirm','request','recovery','update','signout']);
 assert.equal(calls[0][1].type,'email');assert.equal(calls[2][1].type,'recovery');
 assert.deepEqual(calls[4][1],{scope:'local'});
 await assert.rejects(flow.finishRecovery('long passphrase','long passphrase'),/Verify your reset code/);
});
test('invalid or failed verification cannot authorize changing a password',async()=>{
 const {flow,calls,recovery}=setup();
 await assert.rejects(flow.verifyRecovery('person@example.com','abc'));
 assert.equal(calls.length,0);
 recovery.verifyOtp=async()=>({data:{session:null,user:null},error:Error('Code expired')});
 await assert.rejects(flow.verifyRecovery('person@example.com','123456'),/Code expired/);
 await assert.rejects(flow.finishRecovery('long passphrase','long passphrase'),/Verify your reset code/);
 assert.equal(calls.filter(([name])=>name==='update').length,0);
});
test('expired, changed or canceled recovery session cannot change any account password',async()=>{
 const {flow,calls,recovery}=setup();
 await flow.verifyRecovery('person@example.com','123456');
 recovery.getSession=async()=>({data:{session:{user:{id:'different-owner'}}},error:null});
 await assert.rejects(flow.finishRecovery('long passphrase','long passphrase'),/expired/);
 await flow.cancelRecovery();
 await assert.rejects(flow.finishRecovery('long passphrase','long passphrase'),/Verify your reset code/);
 assert.equal(calls.filter(([name])=>name==='update').length,0);
});
test('provider failures remain visible and failed password changes can be retried',async()=>{
 const {flow,main,recovery,calls}=setup();
 main.resend=async()=>({error:Error('Email rate limit exceeded')});
 await assert.rejects(flow.resendConfirmation('person@example.com'),/rate limit/);
 await flow.verifyRecovery('person@example.com','123456');
 recovery.updateUser=async()=>({error:Error('Network unavailable')});
 await assert.rejects(flow.finishRecovery('long passphrase','long passphrase'),/Network unavailable/);
 assert.equal(calls.filter(([name])=>name==='signout').length,0);
 recovery.updateUser=async()=>({error:null});
 await flow.finishRecovery('long passphrase','long passphrase');
 assert.equal(calls.filter(([name])=>name==='signout').length,1);
});
