import { test, expect, type BrowserContext, type Route } from '@playwright/test';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CHARLIE = '33333333-3333-4333-8333-333333333333';
const DANA = '66666666-6666-4666-8666-666666666666';
const FIRST_MESSAGE = '44444444-4444-4444-8444-444444444444';
const SENT_MESSAGE = '55555555-5555-4555-8555-555555555555';
const names: Record<string, string> = { [ALICE]: 'Alice Example', [BOB]: 'Bob Example', [CHARLIE]: 'Charlie Example', [DANA]: 'Dana Example' };

function publicServiceUrl() {
  return process.env.HUNTEROS_TEST_SUPABASE_URL || 'https://hunteros-test.invalid';
}
const service = new URL(publicServiceUrl());
const storageKey = `sb-${service.hostname.split('.')[0]}-auth-token`;
function signedIn(id: string) {
  const user = { id, email: `${names[id].split(' ')[0].toLowerCase()}@example.invalid`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: expires, role: 'authenticated' })).toString('base64url'), 'synthetic-signature'].join('.');
  return { access_token: token, refresh_token: `synthetic-${id}`, token_type: 'bearer', expires_in: 86400, expires_at: expires, user };
}
function requestUser(route: Route) {
  const token = route.request().headers().authorization?.replace(/^Bearer /, '') || '';
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub as string; } catch { return ''; }
}
const peer = { user_id: BOB, user_code: '22222222', name: names[BOB] };
const initialMessage = { id: FIRST_MESSAGE, sender: BOB, recipient: ALICE, body: 'Private camp plan for Alice', created_at: '2026-09-28T12:00:00.000Z', client_id: FIRST_MESSAGE };
type SendPayload = { user_id: string; body: string; client_id: string };
type FriendFixture = typeof peer & { id: string; status: 'accepted' | 'pending'; incoming: boolean };
type Fixture = {
  friends: FriendFixture[];
  blockedPeople: typeof peer[];
  socialActions: { action: string; payload: Record<string, string> }[];
  messages: typeof initialMessage[];
  canMessage: boolean;
  blocked: boolean;
  unread: number;
  hasMore: boolean;
  failNextSendAfterSave: boolean;
  sent: SendPayload[];
  read: Record<string, unknown>[];
  unexpectedRequests: string[];
  holdNextThread: Promise<void> | null;
  threadStarted: (() => void) | null;
};

async function mockAccounts(context: BrowserContext): Promise<Fixture> {
  const fixture: Fixture = { friends: [{ ...peer, id: 'friendship-bob', status: 'accepted', incoming: false }], blockedPeople: [], socialActions: [], messages: [{ ...initialMessage }], canMessage: true, blocked: false, unread: 1, hasMore: false, failNextSendAfterSave: false, sent: [], read: [], unexpectedRequests: [], holdNextThread: null, threadStarted: null };
  await context.addInitScript(({ key, signed }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(signed)); }, { key: storageKey, signed: signedIn(ALICE) });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4174') return route.continue();
    // All non-local traffic is stopped. Only the expected service is mocked.
    if (url.origin !== service.origin) return route.abort('blockedbyclient');
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    const userId = requestUser(route);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (url.pathname === '/auth/v1/token') return reply(signedIn(CHARLIE));
    if (url.pathname === '/auth/v1/user') return reply(signedIn(userId || ALICE).user);
    const name = url.pathname.split('/').at(-1);
    const body = route.request().postDataJSON() || {};
    if (name === 'hunteros_social_snapshot') return reply({ profile: { user_id: userId, name: names[userId], user_code: userId === ALICE ? '11111111' : '33333333', friend_code: '11111111' }, friends: userId !== ALICE ? [] : fixture.friends, groups: [], blocked: fixture.blockedPeople, posts: [], signals: [] });
    if (name === 'hunteros_message_inbox') return reply({ conversations: userId === ALICE && !fixture.blocked ? [{ ...peer, last_message: fixture.messages.at(-1)?.body, last_at: fixture.messages.at(-1)?.created_at, unread_count: fixture.unread, can_message: fixture.canMessage }] : [] });
    if (name === 'hunteros_message_thread') {
      // Capture the old account's response before delaying it. The app must
      // reject this private result if a second tab switches accounts.
      const data = userId === ALICE && !fixture.blocked ? { peer, can_message: fixture.canMessage, messages: [...fixture.messages], has_more: fixture.hasMore } : { peer: null, can_message: false, messages: [], has_more: false };
      if (fixture.holdNextThread) {
        const wait = fixture.holdNextThread;
        fixture.holdNextThread = null;
        fixture.threadStarted?.();
        await wait;
      }
      return reply(data);
    }
    if (name === 'hunteros_social_action') {
      fixture.socialActions.push(body);
      if (body.action === 'request') return reply({ ok: true });
      if (body.action === 'accept') { fixture.friends = fixture.friends.map(friend => friend.id === body.payload.id ? { ...friend, status: 'accepted' } : friend); return reply({ ok: true }); }
      if (body.action === 'block') {
        const person = fixture.friends.find(friend => friend.user_id === body.payload.user_id);
        if (person) fixture.blockedPeople.push(person);
        fixture.friends = fixture.friends.filter(friend => friend.user_id !== body.payload.user_id);
        if (body.payload.user_id === BOB) fixture.blocked = true;
        return reply({ ok: true });
      }
      if (body.action === 'unblock') { fixture.blockedPeople = fixture.blockedPeople.filter(person => person.user_id !== body.payload.user_id); return reply({ ok: true }); }
      if (body.action === 'remove_friend') {
        fixture.canMessage = false;
        fixture.friends = fixture.friends.filter(friend => friend.id !== body.payload.id && friend.user_id !== body.payload.user_id);
        return reply({ ok: true });
      }
    }
    if (name === 'hunteros_message_action') {
      if (body.action === 'read') { fixture.read.push(body.payload); fixture.unread = 0; return reply({ ok: true }); }
      if (body.action === 'send') {
        fixture.sent.push({ ...body.payload });
        if (userId !== ALICE || !fixture.canMessage || fixture.blocked) return reply({ error: 'Only accepted friends can send messages.' });
        let message = fixture.messages.find(item => item.client_id === body.payload.client_id);
        if (!message) {
          message = { id: SENT_MESSAGE, sender: userId, recipient: body.payload.user_id, body: body.payload.body, created_at: '2026-09-28T12:01:00.000Z', client_id: body.payload.client_id };
          fixture.messages.push(message);
        }
        if (fixture.failNextSendAfterSave) { fixture.failNextSendAfterSave = false; return route.abort('failed'); }
        return reply({ ok: true, message });
      }
    }
    if (name === 'hunteros_public_feed') return reply({ popular: [], releases: [] });
    fixture.unexpectedRequests.push(`${route.request().method()} ${url.pathname}`);
    return reply({ error: 'Unexpected test request' }, 400);
  });
  return fixture;
}

async function changeAccount(context: BrowserContext) {
  const other = await context.newPage();
  await other.goto('/account');
  await other.getByRole('button', { name: 'Sign out on this device', exact: true }).click();
  await other.getByLabel('Email', { exact: true }).fill('charlie@example.invalid');
  await other.getByLabel('Password', { exact: true }).fill('synthetic-password-only');
  await other.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(other.getByText('charlie@example.invalid', { exact: true })).toBeVisible();
  return other;
}

test('an accepted friend can send and retry a lost response without duplicating the message', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.failNextSendAfterSave = true;
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('See you at camp');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => fixture.sent.length).toBe(1);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('See you at camp');
  await page.getByRole('button', { name: 'Retry send', exact: true }).click();
  await expect.poll(() => fixture.sent.length).toBe(2);
  expect(fixture.sent[1].client_id).toBe(fixture.sent[0].client_id);
  expect(fixture.messages.filter(message => message.body === 'See you at camp')).toHaveLength(1);
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  await expect(page.getByText('See you at camp', { exact: true })).toHaveCount(1);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('a pending or removed connection cannot compose messages', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.canMessage = false;
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toHaveCount(0);
  expect(fixture.sent).toEqual([]);
});

test('a blocked conversation hides its history and composer', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.blocked = true;
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
  expect(fixture.sent).toEqual([]);
});

test('switching accounts clears the old private conversation and rejects a late result', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('Unsent private draft');
  let release!: () => void;
  fixture.holdNextThread = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { fixture.threadStarted = resolve; });
  await page.getByRole('button', { name: 'Refresh conversation', exact: true }).click();
  await started;
  const other = await changeAccount(context);
  await page.bringToFront();
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  await expect.poll(() => page.locator('textarea,input').evaluateAll(elements => elements.some(element => (element as HTMLInputElement).value === 'Unsent private draft'))).toBe(false);
  expect(fixture.sent).toEqual([]);
  await other.close();
});

test('the inbox shows unread messages and opening the conversation marks the visible message read', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  await page.goto('/messages');
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  await expect(page.getByText(/1 unread/i).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/messages-inbox-mobile.png', fullPage: true });
  await page.getByRole('button', { name: `Open conversation with ${names[BOB]}`, exact: true }).click();
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/messages-conversation-mobile.png', fullPage: true });
  await expect.poll(() => fixture.read.length).toBeGreaterThan(0);
  expect(fixture.read.at(-1)).toEqual({ user_id: BOB, message_id: FIRST_MESSAGE });
  await page.getByRole('button', { name: 'Back to messages', exact: true }).click();
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  await expect(page.getByText(/1 unread/i)).toHaveCount(0);
});

test('friends shows the assigned eight-digit ID and accepts an ID or email', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  await page.goto('/friends');
  await expect(page.getByText('11111111', { exact: true })).toBeVisible();
  await expect(page.getByLabel('User ID or email', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/friends-user-id-mobile.png', fullPage: true });
  await page.getByLabel('User ID or email', { exact: true }).fill('87654321');
  await page.getByRole('button', { name: 'Send friend request', exact: true }).click();
  await expect(page.getByLabel('User ID or email', { exact: true })).toHaveValue('');
  expect(fixture.socialActions.at(-1)).toEqual({ action: 'request', payload: { identifier: '87654321' } });
  await page.getByLabel('User ID or email', { exact: true }).fill('  friend@example.invalid  ');
  await page.getByRole('button', { name: 'Send friend request', exact: true }).click();
  await expect(page.getByLabel('User ID or email', { exact: true })).toHaveValue('');
  expect(fixture.socialActions.at(-1)).toEqual({ action: 'request', payload: { identifier: 'friend@example.invalid' } });
});

test('friend controls accept, decline, remove, block and unblock connections', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.friends.push(
    { id: 'friendship-charlie', user_id: CHARLIE, user_code: '33333333', name: names[CHARLIE], status: 'pending', incoming: true },
    { id: 'friendship-dana', user_id: DANA, user_code: '66666666', name: names[DANA], status: 'pending', incoming: true },
  );
  await page.goto('/friends');
  await page.getByRole('button', { name: `Accept ${names[CHARLIE]}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Message ${names[CHARLIE]}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByText(names[DANA], { exact: true })).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Message ${names[BOB]}`, exact: true }).locator('..').getByRole('button', { name: 'Remove friend', exact: true }).click();
  await expect(page.getByRole('button', { name: `Message ${names[BOB]}`, exact: true })).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Block ${names[CHARLIE]}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Message ${names[CHARLIE]}`, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Blocked', exact: true }).click();
  await page.getByRole('button', { name: `Unblock ${names[CHARLIE]}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Unblock ${names[CHARLIE]}`, exact: true })).toHaveCount(0);
  expect(fixture.friends).toEqual([]);
  expect(fixture.socialActions.map(action => action.action)).toEqual(['accept', 'remove_friend', 'remove_friend', 'block', 'unblock']);
});

test('blocking a friend discards a conversation response that was already in flight', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  let release!: () => void;
  fixture.holdNextThread = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { fixture.threadStarted = resolve; });
  await page.getByRole('button', { name: 'Refresh conversation', exact: true }).click();
  await started;
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Block ${names[BOB]}`, exact: true }).click();
  await expect(page).toHaveURL(/\/messages$/);
  const response = page.waitForResponse(request => request.url().endsWith('/hunteros_message_thread'));
  release();
  await response;
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Open conversation with ${names[BOB]}`, exact: true })).toHaveCount(0);
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
});

test('an older page cannot restore private history after a newer refresh reports a block', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.hasMore = true;
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  let release!: () => void;
  fixture.holdNextThread = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { fixture.threadStarted = resolve; });
  await page.getByRole('button', { name: 'Load earlier messages', exact: true }).click();
  await started;
  fixture.blocked = true;
  await page.getByRole('button', { name: 'Refresh conversation', exact: true }).click();
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible();
  const response = page.waitForResponse(request => request.url().endsWith('/hunteros_message_thread'));
  release();
  await response;
  // Let React process the resolved pagination result before checking privacy.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
});

test('pagination immediately hides a conversation when its response reveals a block', async ({ page, context }) => {
  const fixture = await mockAccounts(context);
  fixture.hasMore = true;
  await page.goto(`/messages/${BOB}`);
  await expect(page.getByText(initialMessage.body, { exact: true })).toBeVisible();
  fixture.blocked = true;
  await page.getByRole('button', { name: 'Load earlier messages', exact: true }).click();
  // Check the pagination response itself; do not let the five-second poll mask
  // retaining a conversation whose access has just been revoked.
  await expect(page.getByText('Messaging unavailable', { exact: true })).toBeVisible({ timeout: 1000 });
  await expect(page.getByText(initialMessage.body, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
});
