import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { session, supabase } from './cloud';
import { emptySocial, fetchSocial, socialAction } from './social';

export function useSocial() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState(emptySocial), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), active = useRef(false), mounted = useRef(true), focused = useRef(false), currentUser = useRef<string|null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError('');
    try {
      const signed = await session();
      if (current !== generation.current || !mounted.current) return;
      currentUser.current=signed?.user.id ?? null; setUserId(currentUser.current);
      if (!signed) { setData(emptySocial); return; }
      const next = await fetchSocial(signed.user.id);
      if (current === generation.current && mounted.current) setData(next);
    } catch (e) { if (current === generation.current && mounted.current) {setData(emptySocial); setError(e instanceof Error ? e.message : String(e));} }
    finally { if (current === generation.current && mounted.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const sub = supabase?.auth.onAuthStateChange((_event, signed) => {
      ++generation.current; currentUser.current=signed?.user.id ?? null; setData(emptySocial); setUserId(currentUser.current); setError('');
      // Do not await auth or another Supabase call inside the auth callback.
      setTimeout(() => {if (mounted.current&&focused.current) void refresh();}, 0);
    }).data.subscription;
    return () => {mounted.current = false; ++generation.current; sub?.unsubscribe();};
  }, [refresh]);
  useFocusEffect(useCallback(() => {focused.current=true;void refresh(); return () => {focused.current=false;++generation.current; setData(emptySocial);};}, [refresh]));
  async function act(action: string, payload: Record<string, unknown>) {
    if (!userId || active.current) return false;
    active.current = true; setBusy(true); setError('');
    try { await socialAction(action, payload, userId); if(!mounted.current||!focused.current||currentUser.current!==userId)return false; await refresh(); return currentUser.current===userId; }
    catch (e) {if (mounted.current&&focused.current&&currentUser.current===userId) setError(e instanceof Error ? e.message : String(e)); return false;}
    finally {active.current = false; if (mounted.current) setBusy(false);}
  }
  return {data, userId, loading, busy, error, refresh, act};
}
