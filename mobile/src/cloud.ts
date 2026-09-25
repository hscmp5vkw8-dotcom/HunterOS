import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Workspace } from './types';

const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const cloudConfigured=!!url&&!!key;
export const supabase:SupabaseClient|null=cloudConfigured?createClient(url!,key!,{auth:{storage:{getItem:(k)=>SecureStore.getItemAsync(k),setItem:(k,v)=>SecureStore.setItemAsync(k,v),removeItem:(k)=>SecureStore.deleteItemAsync(k)},autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}}):null;

export async function signUp(email:string,password:string){if(!supabase)throw Error('Cloud is not configured yet. Add the Supabase project URL and publishable/anon key.');return supabase.auth.signUp({email,password});}
export async function signIn(email:string,password:string){if(!supabase)throw Error('Cloud is not configured yet.');return supabase.auth.signInWithPassword({email,password});}
export async function signOut(){if(supabase)await supabase.auth.signOut();}
export async function session(){return (await supabase?.auth.getSession())?.data.session??null;}

export async function pushWorkspace(state:Workspace){if(!supabase)throw Error('Cloud is not configured yet.');const s=await session();if(!s)throw Error('Sign in first.');const payload={user_id:s.user.id,workspace:state,updated_at:new Date().toISOString()};const {error}=await supabase.from('user_workspaces').upsert(payload,{onConflict:'user_id'});if(error)throw error;return payload.updated_at;}
export async function pullWorkspace():Promise<{workspace:Workspace;updated_at:string}|null>{if(!supabase)throw Error('Cloud is not configured yet.');const s=await session();if(!s)throw Error('Sign in first.');const {data,error}=await supabase.from('user_workspaces').select('workspace,updated_at').eq('user_id',s.user.id).maybeSingle();if(error)throw error;return data as any;}

export async function publishScans(state:Workspace){if(!supabase)throw Error('Cloud is not configured yet.');const s=await session();if(!s)throw Error('Sign in first.');const rows=state.scannedProducts.map(x=>({user_id:s.user.id,code:x.code,code_type:x.codeType,product:x.product,first_scanned_at:x.firstScannedAt,last_scanned_at:x.lastScannedAt,scan_count:x.scanCount}));if(!rows.length)return;const {error}=await supabase.from('scan_submissions').upsert(rows,{onConflict:'user_id,code'});if(error)throw error;}
