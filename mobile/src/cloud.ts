import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { readCloudBackup } from './cloud-data';
import { validateWorkspace } from './domain';
import type { Workspace } from './types';
import { createAccountAuth } from './account-auth';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const cloudConfigured = !!url && !!key;
const storage = {
 async getItem(k: string) { return Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.localStorage.getItem(k)) : SecureStore.getItemAsync(k); },
 async setItem(k: string, v: string) { if (Platform.OS === 'web') window.localStorage.setItem(k, v); else await SecureStore.setItemAsync(k, v); },
 async removeItem(k: string) { if (Platform.OS === 'web') window.localStorage.removeItem(k); else await SecureStore.deleteItemAsync(k); },
};
export const supabase = cloudConfigured ? createClient(url!, key!, {auth: {storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false}}) : null;
export const accountAuth = supabase ? createAccountAuth(supabase.auth, () => createClient(url!, key!, {auth: {storageKey:'hunteros-password-recovery', autoRefreshToken:false, persistSession:false, detectSessionInUrl:false}}).auth) : null;
export function watchAuthRefresh() {
 if (!supabase || Platform.OS === 'web') return () => {};
 const sync = (state: string) => { if (state === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh(); };
 sync(AppState.currentState);
 const listener = AppState.addEventListener('change', sync);
 return () => { listener.remove(); supabase.auth.stopAutoRefresh(); };
}
function client() { if (!supabase) throw Error('Cloud backup is not available in this build. Your local plans still work.'); return supabase; }
export async function session() { if (!supabase) return null; const {data, error} = await supabase.auth.getSession(); if (error) throw error; return data.session; }
async function signedIn() { const s = await session(); if (!s) throw Error('Sign in first.'); return s; }
export async function signUp(email: string, password: string) { return client().auth.signUp({email: email.trim(), password}); }
export async function signIn(email: string, password: string) { return client().auth.signInWithPassword({email: email.trim(), password}); }
export async function signOut() { const {error} = await client().auth.signOut({scope: 'local'}); if (error) throw error; }
export async function pushWorkspace(state: Workspace, expectedUserId: string) {
 const s = await signedIn();
 if (s.user.id !== expectedUserId) throw Error('Your account changed. Review the upload again.');
 const {data, error} = await client().from('user_workspaces').upsert({user_id: s.user.id, workspace: validateWorkspace(state), updated_at: new Date().toISOString()}, {onConflict: 'user_id'}).select('updated_at').single();
 if (error) throw error; return data.updated_at as string;
}
export async function pullWorkspace(expectedUserId: string) {
 const s = await signedIn();
 if (s.user.id !== expectedUserId) throw Error('Your account changed. Review the restore again.');
 const {data, error} = await client().from('user_workspaces').select('workspace,updated_at').eq('user_id', s.user.id).maybeSingle();
 if (error) throw error; return readCloudBackup(data);
}
