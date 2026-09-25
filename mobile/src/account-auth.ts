import type { SupabaseClient } from '@supabase/supabase-js';

type Auth = SupabaseClient['auth'];
export function accountEmail(value: string) {
 const email=value.trim();
 if (!/^\S+@\S+\.\S+$/.test(email)) throw Error('Enter a valid email address.');
 return email;
}
export function newPassword(value: string, confirmation: string) {
 if (value.length<12) throw Error('Use at least 12 characters for your password.');
 if (value!==confirmation) throw Error('The passwords do not match.');
 return value;
}
export function emailCode(value: string) {
 const token=value.replace(/\s/g,'');
 if (!/^\d{6,10}$/.test(token)) throw Error('Enter the numeric code from your latest HunterOS email.');
 return token;
}

// Recovery has its own in-memory client. Verifying a reset code must not switch
// the workspace account or persist a recovery session as an ordinary sign-in.
export function createAccountAuth(auth: Auth, makeRecovery: ()=>Auth) {
 let recovery: Auth|null=null;
 let verifiedUserId: string|null=null;
 async function cancelRecovery() {
  const previous=recovery; recovery=null; verifiedUserId=null;
  if (previous) await previous.signOut({scope:'local'}).catch(()=>{});
 }
 return {
  async resendConfirmation(email: string) {
   const {error}=await auth.resend({type:'signup',email:accountEmail(email)});
   if (error) throw error;
  },
  async confirmEmail(email: string, code: string) {
   const {data,error}=await auth.verifyOtp({email:accountEmail(email),token:emailCode(code),type:'email'});
   if (error) throw error;
   if (!data.session) throw Error('Email confirmed. Return to sign in with your password.');
  },
  async requestRecovery(email: string) {
   const address=accountEmail(email);
   const {error}=await auth.resetPasswordForEmail(address);
   if (error) throw error;
  },
  async verifyRecovery(email: string, code: string) {
   const address=accountEmail(email), token=emailCode(code);
   await cancelRecovery();
   const candidate=makeRecovery(); recovery=candidate;
   const {data,error}=await candidate.verifyOtp({email:address,token,type:'recovery'});
   if (error) throw error;
   if (!data.session || !data.user) throw Error('That code could not be verified. Request a new code.');
   verifiedUserId=data.user.id;
  },
  async finishRecovery(password: string, confirmation: string) {
   const value=newPassword(password,confirmation), candidate=recovery;
   if (!candidate || !verifiedUserId) throw Error('Verify your reset code first.');
   const {data:session,error:sessionError}=await candidate.getSession();
   if (sessionError) throw sessionError;
   if (session.session?.user.id!==verifiedUserId) throw Error('Your reset session expired. Request a new code.');
   const {error}=await candidate.updateUser({password:value});
   if (error) throw error;
   await cancelRecovery();
  },
  cancelRecovery,
 };
}
