// Isolated PostgreSQL tests only: node messages-access.mjs [path to pglite/dist/index.js].
// Uses synthetic identities and never connects to the live HunterOS service.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const [a,b,c,d,e,f,g] = [1,2,3,4,5,6,7].map(id);
const client = n => '10000000-0000-4000-8000-' + String(n).padStart(12, '0');
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const ok = r => { assert.equal(r.ok, true, JSON.stringify(r)); checks++; return r; };
const denied = r => { assert.ok(r.error, JSON.stringify(r)); checks++; return r; };
await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
for (const [i,user] of [a,b,c,d,e].entries()) {
 await db.query('insert into auth.users values($1,$2,$3)', [user, `person${i+1}@example.test`, user === d ? null : '2026-09-01T00:00:00Z']);
}
async function as(user, sql, params = []) {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
 await db.exec('set role ' + (user ? 'authenticated' : 'anon'));
 try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
const rpc = async (user, name, args = [], placeholders = args.map((_, i) => '$' + (i+1)).join(',')) =>
 (await as(user, `select public.${name}(${placeholders}) as result`, args))[0].result;
const action = (user, action, payload = {}) => rpc(user, 'hunteros_social_action', [action, JSON.stringify(payload)], '$1,$2::jsonb');
const message = (user, action, payload = {}) => rpc(user, 'hunteros_message_action', [action, JSON.stringify(payload)], '$1,$2::jsonb');
const snapshot = user => rpc(user, 'hunteros_social_snapshot');
const inbox = user => rpc(user, 'hunteros_message_inbox');
const thread = (user, peer, before = null) => rpc(user, 'hunteros_message_thread', [peer, before?.created_at ?? null, before?.id ?? null], '$1::uuid,$2::timestamptz,$3::uuid');
const send = (user, peer, n, body = `Message ${n}`, extras = {}) => message(user, 'send', {user_id:peer, body, client_id:client(n), ...extras});
const privateMigration = await readFile(new URL('../migrations/20260926_private_social.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../migrations/20260928_user_ids_messages.sql', import.meta.url), 'utf8');
await db.exec(privateMigration);
ok(await action(a, 'profile', {name:'Existing Alice'}));
ok(await action(b, 'profile', {name:'Existing Bob'}));
const oldCode = (await snapshot(b)).profile.friend_code;
await db.exec(migration);
const firstCodes = (await db.query('select user_id,user_code from public.social_profiles order by user_id')).rows;
check(firstCodes.length, 5);
for (const entry of firstCodes) { assert.match(entry.user_code, /^\d{8}$/); checks++; }
check(new Set(firstCodes.map(entry => entry.user_code)).size, 5);
check((await snapshot(a)).profile.name, 'Existing Alice');
check((await snapshot(e)).profile.name, 'HunterOS member');
check((await snapshot(b)).profile.friend_code, oldCode);
await db.exec(migration);
check((await db.query('select user_id,user_code from public.social_profiles order by user_id')).rows, firstCodes);

// Force two successive allocations to start with the same candidate. The second
// allocation must skip the already-taken code, including in the auth insert trigger.
await db.exec('select setseed(0.4242)');
await db.query('insert into auth.users values($1,$2,now())', [f, 'person6@example.test']);
await db.exec('select setseed(0.4242)');
await db.query('insert into auth.users values($1,$2,now())', [g, 'person7@example.test']);
assert.notEqual((await snapshot(f)).profile.user_code, (await snapshot(g)).profile.user_code); checks++;
check((await db.query('select count(distinct user_code)::integer as total from public.social_profiles')).rows[0].total, 7);
const aCode = (await snapshot(a)).profile.user_code;
const bCode = (await snapshot(b)).profile.user_code;
ok(await action(a, 'rotate_code'));
ok(await action(a, 'profile', {name:'Alice'}));
check((await snapshot(a)).profile.user_code, aCode);
check((await snapshot(b)).profile.name, 'Existing Bob');

for (const table of ['social_profiles','social_friends','social_messages','social_message_reads','social_message_limits']) {
 for (const user of [a,null]) {
  await assert.rejects(as(user, `select * from public.${table}`), /permission denied/); checks++;
  await assert.rejects(as(user, `delete from public.${table}`), /permission denied/); checks++;
 }
}
for (const name of ['hunteros_social_snapshot_legacy()', "hunteros_social_action_legacy('profile','{}')", 'hunteros_next_user_code()', 'hunteros_assign_social_profile()']) {
 for (const user of [a,null]) { await assert.rejects(as(user, `select public.${name}`), /permission denied/); checks++; }
}
for (const name of ['hunteros_message_inbox()', `hunteros_message_thread('${b}')`, "hunteros_message_action('send','{}')"]) {
 await assert.rejects(as(null, `select public.${name}`), /permission denied/); checks++;
}
denied(await inbox(d)); denied(await thread(d,a)); denied(await send(d,a,1));
denied(await action(d,'request',{identifier:aCode}));
denied(await action(a,'request',{identifier:(await snapshot(d)).profile.user_code}));
denied(await action(a,'request',{identifier:'person4@example.test'}));
denied(await action(a,'request',{identifier:aCode}));
denied(await action(a,'request',{identifier:'0000'}));
denied(await action(a,'request',{identifier:'unknown@example.test'}));
denied(await action(a,'request',{identifier:' person1@EXAMPLE.test '}));
denied(await action(a,'block',{user_id:'not-a-uuid'}));
denied(await message(a,'send',{user_id:'not-a-uuid',body:'hi',client_id:client(1)}));

// An email request is exact, case-insensitive, and never includes emails in results.
ok(await action(a,'request',{identifier:' Person2@EXAMPLE.TEST ',sender:c}));
let relation = (await snapshot(b)).friends.find(person => person.user_id === a);
check(relation.incoming, true);
check(relation.user_code, aCode);
check(relation.name, 'Alice');
check(JSON.stringify(await snapshot(b)).includes('@example.test'), false);
check((await inbox(a)).conversations, []);
denied(await thread(a,b));
denied(await send(a,b,1));
denied(await action(a,'accept',{id:relation.id}));
denied(await action(c,'accept',{id:relation.id}));
denied(await action(b,'request',{identifier:aCode}));
ok(await action(b,'remove_friend',{id:relation.id})); // Recipient declines.
check((await snapshot(a)).friends.length, 0);
ok(await action(a,'request',{identifier:bCode}));
relation = (await snapshot(b)).friends.find(person => person.user_id === a);
ok(await action(b,'accept',{id:relation.id}));
check((await inbox(a)).conversations[0], {user_id:b,user_code:bCode,name:'Existing Bob',last_message:null,last_at:null,unread_count:0,can_message:true});
check((await thread(a,b)).messages, []);
denied(await thread(c,b));

const first = ok(await send(a,b,1,' Hello Bob ',{sender:c,recipient:c})).message;
check(first.sender,a); check(first.recipient,b); check(first.body,'Hello Bob');
check((await inbox(b)).conversations[0].unread_count,1);
const duplicate = ok(await send(a,b,1,'Hello Bob')).message;
check(duplicate,first);
check((await thread(a,b)).messages.length,1);
denied(await send(a,b,1,'Changed content'));
denied(await send(a,b,2,'')); denied(await send(a,b,2,'   ')); denied(await send(a,b,2,'x'.repeat(2001)));
denied(await send(a,b,2,'\n\t\r')); denied(await send(a,b,2,{text:'Not a text body'}));
denied(await message(a,'send',{user_id:b,body:'No id'}));
denied(await send(c,b,2));
denied(await message(c,'read',{user_id:a,message_id:first.id}));
denied(await message(b,'read',{user_id:c,message_id:first.id}));
check((await inbox(c)).conversations, []);
ok(await message(b,'read',{user_id:a,message_id:first.id,reader:c}));
check((await inbox(b)).conversations[0].unread_count,0);
// Client IDs are scoped to the authenticated sender, not global or caller-supplied identities.
const reply = ok(await send(b,a,1,'Hello Alice')).message;
check(reply.sender,b); check((await inbox(a)).conversations[0].unread_count,1);
denied(await thread(c,a));

// Paginate with timestamp+ID cursors and advance read markers monotonically.
for (let n=2;n<=55;n++) ok(await send(a,b,n));
const recent = await thread(b,a);
check(recent.messages.length,50); check(recent.has_more,true);
const older = await thread(b,a,recent.messages[0]);
check(older.messages.length,6); check(older.has_more,false);
check(new Set([...older.messages,...recent.messages].map(m => m.id)).size,56);
check(older.messages[0].id,first.id);
check(recent.messages.at(-1).body,'Message 55');
denied(await rpc(b,'hunteros_message_thread',[a,first.created_at,null],'$1::uuid,$2::timestamptz,$3::uuid'));
ok(await message(b,'read',{user_id:a,message_id:recent.messages.at(-1).id}));
check((await inbox(b)).conversations[0].unread_count,0);
ok(await message(b,'read',{user_id:a,message_id:first.id}));
check((await inbox(b)).conversations[0].unread_count,0);

// A second accepted peer cannot reuse a sender's client ID for a different recipient.
ok(await action(a,'request',{identifier:(await snapshot(c)).profile.user_code}));
const ac = (await snapshot(c)).friends.find(person => person.user_id===a);
ok(await action(c,'accept',{id:ac.id}));
denied(await send(a,c,1,'Hello Bob'));
const privateC = ok(await send(a,c,100,'For Charlie')).message;
check((await thread(b,a)).messages.some(m=>m.id===privateC.id),false);
denied(await message(b,'read',{user_id:a,message_id:privateC.id}));
check((await inbox(c)).conversations[0].unread_count,1);

// Removing a connection leaves participant history readable, but no new messages.
ok(await action(c,'remove_friend',{user_id:b})); // Cannot remove somebody else's A/B friendship.
check((await thread(a,b)).can_message,true);
ok(await action(a,'remove_friend',{user_id:b}));
check((await thread(a,b)).can_message,false);
check((await thread(b,a)).messages.length,50);
check((await inbox(b)).conversations[0].can_message,false);
denied(await send(a,b,200)); denied(await send(b,a,200));
ok(await message(a,'read',{user_id:b,message_id:reply.id}));
// Existing UUID friend codes still work after stable IDs are introduced.
ok(await action(a,'request',{code:oldCode}));
relation = (await snapshot(b)).friends.find(person=>person.user_id===a);
ok(await action(b,'accept',{id:relation.id}));
ok(await send(a,b,200));
ok(await action(a,'remove_friend',{id:relation.id}));
// A participant can block from retained history after removal.
ok(await action(b,'block',{user_id:a}));
check((await snapshot(b)).blocked[0].user_code,aCode);
check((await inbox(b)).conversations,[]);
check((await inbox(a)).conversations.some(x=>x.user_id===b),false);
denied(await thread(a,b)); denied(await thread(b,a));
denied(await send(a,b,201)); denied(await send(b,a,201));
denied(await message(a,'read',{user_id:b,message_id:reply.id}));
denied(await action(a,'request',{identifier:bCode}));
denied(await action(a,'request',{identifier:'person2@example.test'}));
ok(await action(b,'block',{user_id:a})); // Idempotent block.
ok(await action(b,'unblock',{user_id:a}));
check((await thread(a,b)).can_message,false);
denied(await send(a,b,201));
check((await snapshot(a)).friends.some(x=>x.user_id===b),false);
ok(await action(a,'request',{identifier:bCode}));
relation = (await snapshot(b)).friends.find(person=>person.user_id===a);
ok(await action(b,'accept',{id:relation.id}));

// Duplicate retries do not consume the daily quota. A new send at the cap is denied.
await db.query('update public.social_message_limits set sent=300 where user_id=$1',[a]);
ok(await send(a,b,1,'Hello Bob'));
check((await db.query('select sent from public.social_message_limits where user_id=$1',[a])).rows[0].sent,300);
denied(await send(a,b,299));
check((await thread(a,b)).messages.some(m=>m.client_id===client(299)),false);
// Account confirmation is checked again on later sends.
await db.query('update auth.users set email_confirmed_at=null where id=$1',[b]);
check((await thread(a,b)).can_message,false);
denied(await send(a,b,300)); denied(await inbox(b));
await db.query('update auth.users set email_confirmed_at=now() where id=$1',[b]);
for(let n=0;n<20;n++)denied(await action(e,'request',{identifier:'unknown@example.test'}));
assert.match((await action(e,'request',{identifier:bCode})).error,/limit/); checks++;

// Full account deletion cascades message and read-marker records without touching other users.
await db.query('delete from auth.users where id=$1',[b]);
check((await db.query('select count(*)::integer as n from public.social_messages where $1 in(sender,recipient)',[b])).rows[0].n,0);
check((await db.query('select count(*)::integer as n from public.social_message_reads where $1 in(reader,peer)',[b])).rows[0].n,0);
check((await thread(a,c)).messages[0].id,privateC.id);
console.log(`${checks} stable-ID, invitation, privacy, direct-message, pagination, idempotency, block, quota and deletion checks passed.`);
await db.close();
