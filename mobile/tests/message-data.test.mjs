import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessageBody, mergeMessages, createMessageRetry } from '../src/message-data.ts';

const message = (id, created_at, body = id) => ({ id, created_at, body, sender: 'alice', recipient: 'bob', client_id: id });

test('message bodies trim surrounding whitespace and reject empty or oversized content', () => {
  assert.equal(normalizeMessageBody('  Meet at camp\n'), 'Meet at camp');
  assert.throws(() => normalizeMessageBody(' \n\t'), /Write a message/);
  assert.throws(() => normalizeMessageBody('a'.repeat(2001)), /2,000/);
  assert.equal(normalizeMessageBody('a'.repeat(2000)).length, 2000);
});

test('the message character limit counts emoji code points like the database', () => {
  const limit = '🦌'.repeat(2000);
  assert.equal(normalizeMessageBody(limit), limit);
  assert.throws(() => normalizeMessageBody(limit + '🦌'), /2,000/);
});

test('overlapping pages deduplicate messages and keep stable time and ID order', () => {
  const later = message('c', '2026-09-28T12:01:00Z');
  const first = message('a', '2026-09-28T12:00:00Z');
  const sameTime = message('b', first.created_at);
  const previous = [later, sameTime];
  const incoming = [message('b', first.created_at, 'Latest server copy'), first];
  const merged = mergeMessages(previous, incoming);
  assert.deepEqual(merged.map(item => item.id), ['a', 'b', 'c']);
  assert.equal(merged[1].body, 'Latest server copy');
  assert.deepEqual(previous, [later, sameTime]);
});

test('an unconfirmed send reuses its key for the same sender, recipient and trimmed body', () => {
  const retry = createMessageRetry();
  const first = retry.prepare('alice', 'bob', ' See you at camp ');
  const again = retry.prepare('alice', 'bob', '\nSee you at camp');
  assert.equal(again.client_id, first.client_id);
  assert.deepEqual(again, { user_id: 'bob', body: 'See you at camp', client_id: first.client_id });
  assert.match(first.client_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('a changed recipient, sender or body gets a new send key', () => {
  const retry = createMessageRetry();
  const keys = [
    retry.prepare('alice', 'bob', 'Hello').client_id,
    retry.prepare('alice', 'charlie', 'Hello').client_id,
    retry.prepare('dana', 'charlie', 'Hello').client_id,
    retry.prepare('dana', 'charlie', 'A different message').client_id,
  ];
  assert.equal(new Set(keys).size, keys.length);
});

test('a confirmed message can be sent again intentionally under a new key', () => {
  const retry = createMessageRetry();
  const first = retry.prepare('alice', 'bob', 'Hello');
  retry.complete(first);
  assert.notEqual(retry.prepare('alice', 'bob', 'Hello').client_id, first.client_id);
});

test('an older completion cannot clear a newer pending message', () => {
  const retry = createMessageRetry();
  const older = retry.prepare('alice', 'bob', 'First');
  const newer = retry.prepare('alice', 'bob', 'Second');
  retry.complete(older);
  assert.equal(retry.prepare('alice', 'bob', 'Second').client_id, newer.client_id);
});

test('clearing private account or conversation state clears its pending send key', () => {
  const retry = createMessageRetry();
  const first = retry.prepare('alice', 'bob', 'Hello');
  retry.clear();
  assert.notEqual(retry.prepare('alice', 'bob', 'Hello').client_id, first.client_id);
});
