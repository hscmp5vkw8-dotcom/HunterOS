import type { DirectMessage } from './social';

export const MESSAGE_LIMIT = 2000;

export function normalizeMessageBody(body: string) {
  const value = body.trim();
  if (!value) throw Error('Write a message before sending.');
  if (Array.from(value).length > MESSAGE_LIMIT) throw Error('Keep your message to 2,000 characters.');
  return value;
}

export function mergeMessages(previous: DirectMessage[], incoming: DirectMessage[]) {
  const unique = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function messageClientId() {
  // A retry identifier, never an authentication credential. Native runtimes may
  // not expose Web Crypto; the server scopes this key to the signed-in sender.
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 3) | 8).toString(16);
  });
}

export interface MessagePayload { user_id: string; body: string; client_id: string }
export function createMessageRetry() {
  let pending: {sender: string; payload: MessagePayload} | null = null;
  return {
    prepare(sender: string, peer: string, body: string): MessagePayload {
      const clean = normalizeMessageBody(body);
      if (pending?.sender !== sender || pending.payload.user_id !== peer || pending.payload.body !== clean) {
        pending = {sender, payload: {user_id: peer, body: clean, client_id: messageClientId()}};
      }
      return pending.payload;
    },
    complete(payload: MessagePayload) { if (pending?.payload.client_id === payload.client_id) pending = null; },
    clear() { pending = null; },
  };
}
