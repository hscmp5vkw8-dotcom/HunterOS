import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { socialRpc } from '../src/social-request.ts';

function client(fetcher) {
  return createClient('https://test.invalid', 'sb_publishable_test', {
    // Reproduces the SDK seeing a different account after the screen checked it.
    accessToken: async () => 'next-account-token',
    global: {fetch: fetcher},
  });
}
const signed = id => ({user:{id}, access_token:`${id}-token`});

test('social mutation pins the initiating account even when SDK token lookup changes', async()=>{
  let authorization;
  const api=client(async(_url, init)=>{
    authorization=new Headers(init.headers).get('Authorization');
    return new Response(JSON.stringify({ok:true}),{status:200});
  });
  assert.deepEqual(await socialRpc(api,async()=>signed('first'),'hunteros_social_action',{action:'profile',payload:{name:'A'}},'first'),{ok:true});
  assert.equal(authorization,'Bearer first-token');
});

test('a changed account before dispatch cannot send a social action',async()=>{
  let calls=0;
  const api=client(async()=>{calls++;return new Response('{}');});
  await assert.rejects(socialRpc(api,async()=>signed('next'),'hunteros_social_action',{},'first'),/account changed/);
  assert.equal(calls,0);
});

test('private results are rejected when the account changes during the request',async()=>{
  let current=signed('first'), authorization;
  const api=client(async(_url,init)=>{
    authorization=new Headers(init.headers).get('Authorization');
    current=signed('next');
    return new Response(JSON.stringify({posts:[{message:'Private'}]}),{status:200});
  });
  await assert.rejects(socialRpc(api,async()=>current,'hunteros_social_snapshot',{},'first'),/account changed/);
  assert.equal(authorization,'Bearer first-token');
});
