import type { Session, SupabaseClient } from '@supabase/supabase-js';

export async function socialRpc<T>(supabase: SupabaseClient | null, readSession: () => Promise<Session | null>, name: string, args: Record<string, unknown>, expectedUser?: string): Promise<T> {
  if (!supabase) throw Error('Connect to your HunterOS account to use friends and groups.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const signed = expectedUser ? await readSession() : null;
    if (expectedUser && signed?.user.id !== expectedUser) throw Error('Your account changed. Please try again.');
    const request = supabase.rpc(name, args).abortSignal(controller.signal);
    // Pin the initiating identity: a session switch during SDK token lookup must
    // never dispatch an old screen's action with the next account's credentials.
    if (signed) request.setHeader('Authorization', `Bearer ${signed.access_token}`);
    const {data, error} = await request;
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') throw Error('Friends and feeds are not available on the server yet. Your saved trips and gear still work.');
      throw Error('Could not update friends and feeds. Check your connection and try again.');
    }
    if (expectedUser && (await readSession())?.user.id !== expectedUser) throw Error('Your account changed. Please try again.');
    if (data?.error) throw Error(String(data.error));
    return data as T;
  } finally { clearTimeout(timer); }
}
