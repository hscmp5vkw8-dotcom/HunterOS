// Run with node social-access.mjs [absolute path to @electric-sql/pglite/dist/index.js].
// Uses an isolated, in-memory PostgreSQL engine. No cloud credentials or real accounts.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(process.argv[2]?pathToFileURL(process.argv[2]).href:'@electric-sql/pglite');
const db=new PGlite();let checks=0;
const ids=[1,2,3,4,5].map(n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'));
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
for(const id of ids)await db.query('insert into auth.users values($1,now())',[id]);
const migration=await readFile(new URL('../migrations/20260926_private_social.sql',import.meta.url),'utf8');
await db.exec(migration);await db.exec(migration); // Safe rerun.
async function as(id,sql,params=[]) {
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec('set role '+(id?'authenticated':'anon'));
 try{return (await db.query(sql,params)).rows;}finally{await db.exec('reset role');}
}
const action=async(id,action,payload={})=>(await as(id,'select public.hunteros_social_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)]))[0].result;
const snapshot=async(id)=>(await as(id,'select public.hunteros_social_snapshot() as result'))[0].result;
const ok=(r)=>{assert.equal(r.ok,true,JSON.stringify(r));checks++;};
const denied=(r)=>{assert.ok(r.error,JSON.stringify(r));checks++;};
for(let i=0;i<ids.length;i++)ok(await action(ids[i],'profile',{name:'Person '+i}));
for(const table of ['social_profiles','social_friends','social_groups','social_posts','social_group_members','social_product_signals','social_blocks','social_limits','product_releases']){
 await assert.rejects(as(ids[0],`select * from public.${table}`),/permission denied/);checks++;
 await assert.rejects(as(null,`select * from public.${table}`),/permission denied/);checks++;
}
await assert.rejects(as(null,'select public.hunteros_social_snapshot()'),/permission denied/);checks++;
await assert.rejects(as(null,"select public.hunteros_social_action('profile','{}')"),/permission denied/);checks++;
const [a,b,c,d]=ids;
const code=(await snapshot(b)).profile.friend_code;
ok(await action(a,'request',{code}));
let rel=(await snapshot(a)).friends[0];
denied(await action(a,'accept',{id:rel.id}));denied(await action(c,'accept',{id:rel.id}));
ok(await action(a,'post',{product_id:'gear-1',message:'Friends only'}));
assert.equal((await snapshot(b)).posts.length,0);checks++;
ok(await action(b,'accept',{id:rel.id}));assert.equal((await snapshot(b)).posts.length,1);checks++;
assert.equal((await snapshot(c)).posts.length,0);assert.equal((await snapshot(c)).friends.length,0);checks+=2;
assert.equal((await snapshot(b)).friends[0].friend_code,undefined);checks++;
ok(await action(a,'create_group',{name:'Trail crew'}));
const group=(await snapshot(a)).groups[0].id;
denied(await action(c,'accept_group',{group_id:group}));
denied(await action(c,'invite_group',{group_id:group,user_id:d}));
denied(await action(c,'post',{group_id:group,product_id:'private-gear'}));
ok(await action(a,'invite_group',{group_id:group,user_id:b}));
ok(await action(a,'post',{group_id:group,product_id:'gear-2',message:'Group only'}));
assert.equal((await snapshot(b)).posts.length,1);assert.equal((await snapshot(b)).groups[0].members.length,0);checks+=2;
ok(await action(b,'accept_group',{group_id:group}));assert.equal((await snapshot(b)).posts.length,2);checks++;
denied(await action(b,'delete_group',{group_id:group}));
ok(await action(a,'remove_friend',{id:rel.id}));assert.equal((await snapshot(b)).posts.length,1);checks++;
ok(await action(b,'leave_group',{group_id:group}));assert.equal((await snapshot(b)).posts.length,0);checks++;
ok(await action(a,'request',{code}));rel=(await snapshot(b)).friends[0];ok(await action(b,'accept',{id:rel.id}));
ok(await action(a,'invite_group',{group_id:group,user_id:b}));ok(await action(b,'accept_group',{group_id:group}));
ok(await action(b,'block',{user_id:a}));assert.equal((await snapshot(b)).posts.length,0);assert.equal((await snapshot(a)).friends.length,0);checks+=2;
denied(await action(a,'request',{code}));
for(const id of [a,b])ok(await action(id,'signal',{product_id:'gear-1',liked:true}));
let pub=(await as(null,'select public.hunteros_public_feed() as result'))[0].result;assert.equal(pub.popular.length,0);checks++;
ok(await action(c,'signal',{product_id:'gear-1',used:true}));
pub=(await as(null,'select public.hunteros_public_feed() as result'))[0].result;
assert.deepEqual(pub.popular,[{product_id:'gear-1',likes:2,uses:1}]);assert.equal(JSON.stringify(pub).includes(a),false);checks+=2;
ok(await action(c,'signal',{product_id:'gear-1',liked:false,used:false}));
pub=(await as(null,'select public.hunteros_public_feed() as result'))[0].result;assert.equal(pub.popular.length,0);checks++;
// Failed code attempts still consume the rate limit, without revealing profiles.
for(let n=0;n<20;n++)denied(await action(d,'request',{code:'missing'}));
assert.match((await action(d,'request',{code})).error,/limit/);checks++;
const own=(await snapshot(a)).posts[0];ok(await action(c,'delete_post',{id:own.id}));assert.ok((await snapshot(a)).posts.some(p=>p.id===own.id));checks++;
console.log(`${checks} database access, friendship, group, block, feed and rate-limit checks passed.`);
await db.close();
