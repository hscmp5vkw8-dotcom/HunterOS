import { socialRpc } from './social-request';
import { session, supabase } from './cloud';
import type { ProductRelease, ProductSignal } from './feed';
export interface Friend { id: string; user_id: string; user_code: string; name: string; status: 'pending' | 'accepted'; incoming: boolean }
export interface Group { id: string; name: string; owner_id: string; status: 'invited' | 'accepted'; members: {user_id: string; name: string; status: string}[] }
export interface SharedPost { id: string; user_id: string; name: string; product_id: string; message: string; group_id: string | null; group_name: string | null; created_at: string }
export interface SocialSnapshot {
  profile: { user_id: string; name: string; friend_code: string; user_code: string } | null;
  friends: Friend[]; groups: Group[]; posts: SharedPost[];
  blocked: {user_id: string; user_code: string; name: string}[];
  signals: {product_id: string; liked: boolean; used: boolean}[];
}
export const emptySocial: SocialSnapshot = {profile:null, friends:[], groups:[], posts:[], blocked:[], signals:[]};

function rpc<T>(name: string, args: Record<string, unknown>, expectedUser?: string) {
  return socialRpc<T>(supabase, session, name, args, expectedUser);
}
export function fetchSocial(userId: string) { return rpc<SocialSnapshot>('hunteros_social_snapshot', {}, userId); }
export function socialAction(action: string, payload: Record<string, unknown>, userId: string) {
  return rpc<{ok: boolean}>('hunteros_social_action', {action, payload}, userId);
}
export async function fetchPublicFeed() {
  if (!supabase) return {popular:[] as ProductSignal[], releases:[] as ProductRelease[]};
  return rpc<{popular: ProductSignal[]; releases: ProductRelease[]}>('hunteros_public_feed', {});
}

export interface MessagePeer { user_id: string; user_code: string; name: string }
export interface DirectMessage { id: string; sender: string; recipient: string; body: string; created_at: string; client_id: string }
export interface ConversationSummary extends MessagePeer { last_message: string | null; last_at: string | null; unread_count: number; can_message: boolean }
export interface MessageInbox { conversations: ConversationSummary[] }
export interface MessageThread { peer: MessagePeer | null; can_message: boolean; messages: DirectMessage[]; has_more: boolean }
export const emptyInbox: MessageInbox = {conversations: []};
export const emptyThread: MessageThread = {peer: null, can_message: false, messages: [], has_more: false};
export function fetchMessageInbox(userId: string) {
  return rpc<MessageInbox>('hunteros_message_inbox', {}, userId);
}
export function fetchMessageThread(userId: string, peerId: string, before?: Pick<DirectMessage, 'id' | 'created_at'>) {
  return rpc<MessageThread>('hunteros_message_thread', {peer_id: peerId, before_at: before?.created_at ?? null, before_id: before?.id ?? null}, userId);
}
export function messageAction(action: 'send' | 'read', payload: Record<string, unknown>, userId: string) {
  return rpc<{ok: boolean; message?: DirectMessage}>('hunteros_message_action', {action, payload}, userId);
}
