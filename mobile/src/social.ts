import { socialRpc } from './social-request';
import { session, supabase } from './cloud';
import type { ProductRelease, ProductSignal } from './feed';

export interface Friend { id: string; user_id: string; name: string; status: 'pending' | 'accepted'; incoming: boolean }
export interface Group { id: string; name: string; owner_id: string; status: 'invited' | 'accepted'; members: {user_id: string; name: string; status: string}[] }
export interface SharedPost { id: string; user_id: string; name: string; product_id: string; message: string; group_id: string | null; group_name: string | null; created_at: string }
export interface SocialSnapshot {
  profile: { user_id: string; name: string; friend_code: string } | null;
  friends: Friend[]; groups: Group[]; posts: SharedPost[];
  blocked: {user_id: string; name: string}[];
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
