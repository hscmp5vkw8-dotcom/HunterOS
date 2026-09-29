import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { session, supabase } from './cloud';
import { createMessageRetry, mergeMessages } from './message-data';
import {
  emptyInbox, emptyThread, fetchMessageInbox, fetchMessageThread, messageAction, socialAction,
  type MessageThread,
} from './social';

const errorText = (error: unknown) => error instanceof Error ? error.message : 'Could not load messages. Please try again.';
const isForeground = () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive' &&
  (typeof document === 'undefined' || document.visibilityState !== 'hidden');

// Each private response belongs to a focused screen and one account. Every
// sign-out, account change or blur invalidates outstanding work immediately.
function usePrivateMessages<T>(empty: T, load: (userId: string) => Promise<T>, scope: string, combine?: (previous: T, next: T) => T) {
  const [data, setData] = useState(empty), [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const currentUser = useRef<string | null>(null), epoch = useRef(0), sequence = useRef(0);
  const focused = useRef(false), mounted = useRef(true), fetching = useRef(0);
  const valid = useCallback((ticket: number, owner: string | null) =>
    mounted.current && focused.current && epoch.current === ticket && currentUser.current === owner, []);
  const refresh = useCallback(async (silent = false) => {
    if (!focused.current || !isForeground()) return;
    const ticket = epoch.current, order = ++sequence.current;
    fetching.current++;
    if (!silent) setLoading(true);
    try {
      const signed = await session();
      if (!mounted.current || !focused.current || epoch.current !== ticket || order !== sequence.current) return;
      const owner = signed?.user.id ?? null;
      if (currentUser.current !== owner) { currentUser.current = owner; setUserId(owner); setData(empty); }
      if (!owner) { setData(empty); setError(''); return; }
      const next = await load(owner);
      if (valid(ticket, owner) && order === sequence.current) {
        setData(previous => combine ? combine(previous, next) : next);
        setError('');
      }
    } catch (e) {
      if (mounted.current && focused.current && epoch.current === ticket && order === sequence.current) {
        setData(empty); setError(errorText(e));
      }
    } finally {
      fetching.current--;
      if (mounted.current && focused.current && epoch.current === ticket && order === sequence.current) setLoading(false);
    }
  }, [empty, load, combine, valid, scope]);

  useEffect(() => {
    mounted.current = true;
    const sub = supabase?.auth.onAuthStateChange((_event, signed) => {
      const owner = signed?.user.id ?? null;
      if (owner === currentUser.current) return;
      ++epoch.current; ++sequence.current; currentUser.current = owner;
      setUserId(owner); setData(empty); setError(''); setLoading(!!owner);
      // Never await another auth request within Supabase's auth callback.
      setTimeout(() => {if (mounted.current && focused.current) void refresh();}, 0);
    }).data.subscription;
    return () => { mounted.current = false; ++epoch.current; sub?.unsubscribe(); };
  }, [empty, refresh]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void refresh();
    const poll = setInterval(() => { if (!fetching.current && isForeground()) void refresh(true); }, 5000);
    const active = () => {if (isForeground() && focused.current) void refresh(true);};
    const appState = AppState.addEventListener('change', active);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', active);
    return () => {
      focused.current = false; ++epoch.current; ++sequence.current;
      clearInterval(poll); appState.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', active);
      setData(empty); setError('');
    };
  }, [empty, refresh]));

  const update = useCallback((next: SetStateAction<T>, ticket: number, owner: string) => {
    if (valid(ticket, owner)) setData(next);
  }, [valid]);
  const fail = useCallback((e: unknown, ticket: number, owner: string) => {
    if (valid(ticket, owner)) setError(errorText(e));
  }, [valid]);
  const invalidate = useCallback(() => {++sequence.current; return ++epoch.current;}, []);
  return {data, userId, loading, error, refresh, epoch, currentUser, valid, update, fail, invalidate};
}

export function useInbox() {
  return usePrivateMessages(emptyInbox, fetchMessageInbox, 'inbox');
}

function combineThread(previous: MessageThread, next: MessageThread): MessageThread {
  if (!next.peer || previous.peer?.user_id !== next.peer.user_id) return next;
  const retainedEarlier = previous.messages.length > 0 && next.messages.length > 0 &&
    (previous.messages[0].created_at < next.messages[0].created_at ||
      (previous.messages[0].created_at === next.messages[0].created_at && previous.messages[0].id < next.messages[0].id));
  return {...next, messages: mergeMessages(previous.messages, next.messages), has_more: retainedEarlier ? previous.has_more : next.has_more};
}

export function useConversation(peerId: string) {
  const load = useCallback((owner: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(peerId)) {
      return Promise.reject(Error('This conversation is not available. Open Messages and choose a friend.'));
    }
    return fetchMessageThread(owner, peerId);
  }, [peerId]);
  const resource = usePrivateMessages(emptyThread, load, peerId, combineThread);
  const {data, userId, epoch, valid, update, fail, refresh} = resource;
  const [busy, setBusy] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  const sending = useRef(false), paging = useRef(false), retry = useRef(createMessageRetry());
  const lastRead = useRef(''), readPending = useRef('');

  useEffect(() => {retry.current.clear(); lastRead.current = ''; readPending.current = ''; setBusy(false); setLoadingMore(false);}, [userId, peerId]);

  useEffect(() => {
    if (!userId || !isForeground()) return;
    const received = [...data.messages].reverse().find(message => message.recipient === userId);
    const marker = received ? `${userId}:${peerId}:${received.id}` : '';
    if (!received || marker === lastRead.current || marker === readPending.current) return;
    const ticket = epoch.current;
    readPending.current = marker;
    void messageAction('read', {user_id: peerId, message_id: received.id}, userId).then(() => {
      if (valid(ticket, userId)) lastRead.current = marker;
    }).catch(() => {
      // The next foreground refresh retries the receipt. Sending is unaffected.
    }).finally(() => {if (readPending.current === marker) readPending.current = '';});
  }, [data.messages, userId, peerId, epoch, valid]);

  async function loadEarlier() {
    if (!userId || paging.current || !data.has_more || !data.messages[0]) return;
    const ticket = epoch.current, first = data.messages[0];
    paging.current = true; setLoadingMore(true);
    try {
      const earlier = await fetchMessageThread(userId, peerId, first);
      update(previous => {
        // A newer refresh may have revoked this conversation while the older
        // page was in flight. Pagination never restores permissions or a peer.
        if (!earlier.peer) return earlier;
        if (!previous.peer || previous.peer.user_id !== earlier.peer.user_id) return previous;
        return {...previous, messages: mergeMessages(earlier.messages, previous.messages), has_more: earlier.has_more};
      }, ticket, userId);
    } catch (e) {update(emptyThread, ticket, userId); fail(e, ticket, userId);}
    finally {paging.current = false; if (valid(ticket, userId)) setLoadingMore(false);}
  }

  async function send(body: string) {
    if (!userId || sending.current || !data.can_message) return false;
    const ticket = epoch.current;
    sending.current = true; setBusy(true);
    try {
      const payload = retry.current.prepare(userId, peerId, body);
      const result = await messageAction('send', {...payload}, userId);
      if (!valid(ticket, userId)) return false;
      if (!result.ok) throw Error('Delivery was not confirmed. Try sending again.');
      retry.current.complete(payload);
      if (result.message) update(previous => ({...previous, messages: mergeMessages(previous.messages, [result.message!])}), ticket, userId);
      await refresh(true);
      return valid(ticket, userId);
    } catch (e) {fail(e, ticket, userId); return false;}
    finally {sending.current = false; if (valid(ticket, userId)) setBusy(false);}
  }

  async function act(action: string, payload: Record<string, unknown>) {
    if (!userId || sending.current) return false;
    let ticket = epoch.current;
    sending.current = true; setBusy(true);
    try {
      await socialAction(action, payload, userId);
      if (!valid(ticket, userId)) return false;
      // A pre-block/pre-removal read may already be in flight. It must not
      // restore the old relationship or message history after this mutation.
      ticket = resource.invalidate();
      if (action === 'block') update(emptyThread, ticket, userId);
      else await refresh(true);
      return valid(ticket, userId);
    } catch (e) {fail(e, ticket, userId); return false;}
    finally {sending.current = false; if (valid(ticket, userId)) setBusy(false);}
  }
  return {...resource, busy, loadingMore, send, loadEarlier, act};
}
