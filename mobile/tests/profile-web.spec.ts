import {test,expect,type BrowserContext,type Page} from '@playwright/test';
const USER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const service='https://hunteros-test.invalid',storageKey='sb-hunteros-test-auth-token';
function signedIn(id=USER){
  const expires=Math.floor(Date.now()/1000)+86400;
  const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:expires,role:'authenticated'})).toString('base64url'),'synthetic-signature'].join('.');
  return {access_token:token,refresh_token:'synthetic-only',token_type:'bearer',expires_in:86400,expires_at:expires,user:{id,email:id===USER?'jacob@example.invalid':'bob@example.invalid',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}}};
}
async function mock(context:BrowserContext,options:{signed?:boolean;supported?:boolean;signInError?:boolean}={}){
  const fixture={name:'Trail Jacob',avatar:'initials',hasPhoto:false,actions:[] as {action:string;payload:{name:string}}[],auth:[] as string[],unexpected:[] as string[],peerPhoto:false,peerRevoked:false,failProfile:false,failSnapshot:false};
  if(options.signed)await context.addInitScript(({key,value})=>{if(!localStorage.getItem('hunteros-test-initialized')){localStorage.setItem(key,JSON.stringify(value));localStorage.setItem('hunteros-test-initialized','1');}},{key:storageKey,value:signedIn()});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin==='http://127.0.0.1:4175')return route.continue();
    if(url.origin!==service)return route.abort('blockedbyclient');
    const reply=(value:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'X-Supabase-Api-Version':'2024-01-01'},body:JSON.stringify(value)});
    const body=route.request().postDataJSON?.bind(route.request());
    const authorization=route.request().headers().authorization||'';
    const caller=authorization.startsWith('Bearer ')&&authorization.split('.').length===3?JSON.parse(Buffer.from(authorization.split('.')[1],'base64url').toString()).sub:USER;
    if(url.pathname.startsWith('/auth/')){
      fixture.auth.push(url.pathname);
      if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204});
      if(url.pathname==='/auth/v1/signup')return reply({...signedIn().user,email_confirmed_at:null});
      if(url.pathname==='/auth/v1/token')return options.signInError?reply({code:'email_not_confirmed',error_code:'email_not_confirmed',msg:'Email not confirmed'},400):reply(signedIn(body!().email==='bob@example.invalid'?OTHER:USER));
      if(url.pathname==='/auth/v1/verify')return reply(signedIn());
      if(url.pathname==='/auth/v1/user')return reply(signedIn(caller).user);
    }
    if(fixture.failSnapshot&&url.pathname.endsWith('/hunteros_social_snapshot'))return reply({message:'Profile service unavailable'},503);
    if(url.pathname.endsWith('/hunteros_social_snapshot'))return reply({profile:{user_id:caller,user_code:caller===USER?'12345678':'87654321',friend_code:'legacy-code',name:caller===USER?fixture.name:'Other member',...(options.supported===false?{}:{avatar:caller===USER?fixture.avatar:'initials',has_photo:caller===USER&&fixture.hasPhoto})},friends:caller!==USER?[]:[{id:'existing-friendship',user_id:OTHER,user_code:'87654321',name:'Existing friend',status:'accepted',incoming:false,...(fixture.peerPhoto&&!fixture.peerRevoked?{avatar:'photo',has_photo:true}:{})}],groups:caller!==USER?[]:[{id:'existing-group',name:'Weekend crew',owner_id:USER,status:'accepted',members:fixture.peerPhoto?[{user_id:OTHER,name:'Existing friend',status:'accepted',...(fixture.peerRevoked?{}:{avatar:'photo',has_photo:true})}]:[]}],blocked:[],posts:[],signals:[]});
    if(url.pathname.endsWith('/hunteros_social_action')){const payload=body!();fixture.actions.push(payload);if(payload.action==='profile'){if(fixture.failProfile)return reply({message:'Screen name service unavailable'},503);fixture.name=payload.payload.name;return reply({ok:true});}}
    if(url.pathname.endsWith('/hunteros_message_inbox'))return reply({conversations:[]});
    if(url.pathname==='/rest/v1/community_products')return reply([]);
    fixture.unexpected.push(`${route.request().method()} ${url.pathname}`);return reply({error:'Unexpected mock request'},400);
  });
  return fixture;
}
async function noOverflow(page:any){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
async function switchAccount(context:BrowserContext,page:Page){
  const other=await context.newPage();await other.goto('/account');await other.getByRole('button',{name:'Sign out on this device',exact:true}).click();
  await other.getByLabel('Email',{exact:true}).fill('bob@example.invalid');await other.getByLabel('Password',{exact:true}).fill('synthetic-only');
  await other.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Other member');
}

for(const dirty of [false,true])test(`returning from Friends reconciles ${dirty?'an intentional draft without discarding it':'an untouched name before saving'}`,async({page,context})=>{
  const fixture=await mock(context,{signed:true});await page.goto('/profile');
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Trail Jacob');
  if(dirty)await page.getByLabel('Screen name (optional)',{exact:true}).fill('Intentional draft');
  await page.getByRole('button',{name:/^Friends/}).click();await page.getByLabel('Display name',{exact:true}).fill('Changed in Friends');
  await page.getByRole('button',{name:'Save display name',exact:true}).click();await expect(page.getByText('Display name saved.',{exact:true})).toBeVisible();
  await page.goBack();await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Changed in Friends',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue(dirty?'Intentional draft':'Changed in Friends');
  await page.getByRole('button',{name:'Save screen name',exact:true}).click();await expect(page.getByText('Screen name saved. Your user ID stays the same.',{exact:true})).toBeVisible();
  expect(fixture.name).toBe(dirty?'Intentional draft':'Changed in Friends');
  fixture.name='Later refresh';await page.getByRole('button',{name:'Refresh profile',exact:true}).click();
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Later refresh');
});

test('signed-out header opens sign-in and signup stays at email confirmation until verified',async({page,context})=>{
  const fixture=await mock(context);
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Signed out. Sign in or create account',exact:true})).toBeVisible();
  await noOverflow(page);await page.screenshot({path:'test-results/core-profile-home-signed-out.png'});
  await page.getByRole('button',{name:'Signed out. Sign in or create account',exact:true}).click();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('jacob@example.invalid');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password-123');
  await page.getByLabel('Repeat password',{exact:true}).fill('synthetic-password-123');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Send confirmation code',exact:true}).click();
  await expect(page.getByText('Confirm your email',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Signed out. Sign in or create account',exact:true})).toBeVisible();
  await expect(page.getByText(/Check your email \(including spam\)/)).toBeVisible();
  await page.screenshot({path:'test-results/core-profile-email-confirmation.png',fullPage:true});
  await page.getByLabel('Email code',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Confirm email',exact:true}).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('12345678',{exact:true})).toBeVisible();
  expect(fixture.auth).toContain('/auth/v1/verify');expect(fixture.unexpected).toEqual([]);
});
test('signed-in header opens existing profile, optional name retains ID, and groups opens the Groups tab',async({page,context})=>{
  const fixture=await mock(context,{signed:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button',{name:'Signed in. Open your profile',exact:true}).click();
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Trail Jacob');
  await noOverflow(page);await page.screenshot({path:'test-results/core-profile-signed-in.png',fullPage:true});
  await page.getByLabel('Screen name (optional)',{exact:true}).fill('');
  await page.getByRole('button',{name:'Save screen name',exact:true}).click();
  await expect(page.getByText('Screen name saved. Your user ID stays the same.',{exact:true})).toBeVisible();
  expect(fixture.name).toBe('HunterOS member');await expect(page.getByText('12345678',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Groups · 1',exact:true}).click();
  await expect(page.getByText('Make a private group',{exact:true})).toBeVisible();
  await expect(page.getByText('Weekend crew',{exact:true})).toBeVisible();
  await expect(page.getByLabel('User ID or email',{exact:true})).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);expect(errors).toEqual([]);
});
test('provider sign-in errors lead to confirmation without claiming a signed-in account',async({page,context})=>{
  await mock(context,{signInError:true});await page.goto('/account');
  await page.getByLabel('Email',{exact:true}).fill('jacob@example.invalid');await page.getByLabel('Password',{exact:true}).fill('synthetic-only');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByText('Confirm your email',{exact:true})).toBeVisible();await expect(page.getByText('Email not confirmed',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Signed out. Sign in or create account',exact:true})).toBeVisible();
});
test('profile edits and sign-out preserve the existing offline trip workspace',async({page,context})=>{
  await mock(context,{signed:true});await page.goto('/');
  await page.getByRole('button',{name:'Build a trip',exact:true}).click();await page.getByLabel('Trip name',{exact:true}).fill('Preserved offline plan');
  await page.getByTestId('create-trip').click();await expect(page.getByText('Preserved offline plan',{exact:true}).last()).toBeVisible();
  const before=await page.evaluate(()=>localStorage.getItem('hunteros.mobile.v1'));
  await page.getByRole('button',{name:'Signed in. Open your profile',exact:true}).click();
  await page.getByLabel('Screen name (optional)',{exact:true}).fill('New screen name');await page.getByRole('button',{name:'Save screen name',exact:true}).click();
  await expect(page.getByText('Screen name saved. Your user ID stays the same.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Account & cloud backup',exact:true}).click();await page.getByRole('button',{name:'Sign out on this device',exact:true}).click();
  await expect(page.getByRole('button',{name:'Signed out. Sign in or create account',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('hunteros.mobile.v1'))).toBe(before);
});
test('long screen names fit narrow phones and tablet layouts',async({page,context})=>{
  const fixture=await mock(context,{signed:true});fixture.name='W'.repeat(50);
  await page.setViewportSize({width:320,height:720});await page.goto('/profile');await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue(fixture.name);await noOverflow(page);
  await page.screenshot({path:'test-results/core-profile-small-phone.png',fullPage:true});
  await page.setViewportSize({width:768,height:1024});await noOverflow(page);await page.screenshot({path:'test-results/core-profile-tablet.png',fullPage:true});
});

test('the existing backend needs no avatar field and initials follow the saved screen name',async({page,context})=>{
  const fixture=await mock(context,{signed:true,supported:false});await page.goto('/profile');
  await expect(page.getByLabel('Trail Jacob initials avatar',{exact:true})).toBeVisible();
  await expect(page.getByText(/Uploaded profile photos will be added in a later update/)).toBeVisible();
  await expect(page.getByRole('button',{name:/photo|Use .* avatar/})).toHaveCount(0);
  await page.getByLabel('Screen name (optional)',{exact:true}).fill('Cedar Ridge');await page.getByRole('button',{name:'Save screen name',exact:true}).click();
  await expect(page.getByLabel('Cedar Ridge initials avatar',{exact:true})).toBeVisible();await page.reload();
  await expect(page.getByLabel('Cedar Ridge initials avatar',{exact:true})).toBeVisible();await expect(page.getByText('12345678',{exact:true})).toBeVisible();
  expect(fixture.actions).toEqual([{action:'profile',payload:{name:'Cedar Ridge'}}]);expect(fixture.unexpected).toEqual([]);
});
test('profile and peer rendering ignore photo metadata and never request Storage or a new avatar RPC',async({page,context})=>{
  const fixture=await mock(context,{signed:true});fixture.avatar='photo';fixture.hasPhoto=true;fixture.peerPhoto=true;await page.goto('/profile');
  await expect(page.getByLabel('Trail Jacob initials avatar',{exact:true})).toBeVisible();await page.getByRole('button',{name:/^Friends/}).click();
  await expect(page.getByLabel('Existing friend initials avatar',{exact:true})).toBeVisible();await page.getByText('Groups',{exact:true}).click();
  await expect(page.getByLabel('Existing friend initials avatar',{exact:true})).toBeVisible();expect(fixture.unexpected).toEqual([]);expect(fixture.actions).toEqual([]);
});
test('changing accounts clears a private unsaved draft and renders the next account ID and initials',async({page,context})=>{
  const fixture=await mock(context,{signed:true});await page.goto('/profile');await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Trail Jacob');
  await page.getByLabel('Screen name (optional)',{exact:true}).fill('Private unsaved name');await switchAccount(context,page);
  await expect(page.getByText('87654321',{exact:true})).toBeVisible();await expect(page.getByText('12345678',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Other member initials avatar',{exact:true})).toBeVisible();expect(fixture.actions).toEqual([]);expect(fixture.unexpected).toEqual([]);
});
test('direct profile entry while signed out keeps editing unavailable and offers existing auth',async({page,context})=>{
  const fixture=await mock(context);await page.goto('/profile');await expect(page.getByText("You're signed out.",{exact:true})).toBeVisible();
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Sign in or create account',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect(fixture.actions).toEqual([]);expect(fixture.unexpected).toEqual([]);
});

test('failed screen-name saves keep the draft and existing identity without a success notice',async({page,context})=>{
  const fixture=await mock(context,{signed:true});fixture.failProfile=true;await page.goto('/profile');
  await page.getByLabel('Screen name (optional)',{exact:true}).fill('Draft to retry');await page.getByRole('button',{name:'Save screen name',exact:true}).click();
  await expect(page.getByText(/Your screen name could not be saved/)).toBeVisible();await expect(page.getByText('Screen name saved. Your user ID stays the same.',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Draft to retry');await expect(page.getByText('12345678',{exact:true})).toBeVisible();expect(fixture.name).toBe('Trail Jacob');
  fixture.failProfile=false;await page.getByRole('button',{name:'Save screen name',exact:true}).click();await expect(page.getByLabel('Draft to retry initials avatar',{exact:true})).toBeVisible();expect(fixture.unexpected).toEqual([]);
});

test('profile service failure leaves account status signed in and offers a safe refresh',async({page,context})=>{
  const fixture=await mock(context,{signed:true});fixture.failSnapshot=true;await page.goto('/profile');
  await expect(page.getByText("Your profile couldn't be loaded. Try refreshing below.",{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save screen name',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Signed in. Open your profile',exact:true})).toBeVisible();
  fixture.failSnapshot=false;await page.getByRole('button',{name:'Refresh profile',exact:true}).click();await expect(page.getByLabel('Screen name (optional)',{exact:true})).toHaveValue('Trail Jacob');expect(fixture.actions).toEqual([]);expect(fixture.unexpected).toEqual([]);
});
