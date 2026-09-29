-- Stable public IDs and private direct messages. Existing UUIDs and friend codes remain valid.
begin;

alter table public.social_profiles add column if not exists user_code text;
create unique index if not exists social_profiles_user_code_key on public.social_profiles(user_code);
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.social_profiles'::regclass and conname='social_profiles_user_code_format') then
  alter table public.social_profiles add constraint social_profiles_user_code_format check(user_code ~ '^[0-9]{8}$');
 end if;
end $$;

-- All allocation uses the existing beta mutation lock. Check collisions before returning
-- a candidate; the unique index is a second safeguard and codes never change on updates.
create or replace function public.hunteros_next_user_code() returns text
language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
 perform pg_advisory_xact_lock(72926101);
 loop
  candidate := (10000000 + floor(random()*90000000)::integer)::text;
  if not exists(select 1 from public.social_profiles where user_code=candidate) then return candidate; end if;
 end loop;
end $$;
revoke all on function public.hunteros_next_user_code() from public,anon,authenticated;
alter table public.social_profiles alter column user_code set default public.hunteros_next_user_code();
update public.social_profiles set user_code=public.hunteros_next_user_code() where user_code is null;
alter table public.social_profiles alter column user_code set not null;

create or replace function public.hunteros_assign_social_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.social_profiles(user_id,name) values(new.id,'HunterOS member') on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function public.hunteros_assign_social_profile() from public,anon,authenticated;
drop trigger if exists hunteros_assign_social_profile on auth.users;
create trigger hunteros_assign_social_profile after insert on auth.users
for each row execute function public.hunteros_assign_social_profile();
insert into public.social_profiles(user_id,name)
select id,'HunterOS member' from auth.users on conflict(user_id) do nothing;

create table if not exists public.social_messages (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.social_profiles(user_id) on delete cascade,
 recipient uuid not null references public.social_profiles(user_id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 2000 and body ~ '[^[:space:]]'),
 client_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 check(sender<>recipient), unique(sender,client_id)
);
create index if not exists social_messages_pair_time on public.social_messages
 (least(sender,recipient),greatest(sender,recipient),created_at desc,id desc);
create index if not exists social_messages_recipient_time on public.social_messages(recipient,created_at desc,id desc);
create index if not exists social_messages_sender_time on public.social_messages(sender,created_at desc,id desc);
create table if not exists public.social_message_reads (
 reader uuid not null references public.social_profiles(user_id) on delete cascade,
 peer uuid not null references public.social_profiles(user_id) on delete cascade,
 last_read_at timestamptz not null,
 last_read_id uuid not null,
 primary key(reader,peer), check(reader<>peer)
);
create table if not exists public.social_message_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, sent integer not null default 0, primary key(user_id,day)
);
do $$ declare t text; begin
 foreach t in array array['social_messages','social_message_reads','social_message_limits'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;

-- Preserve older mobile clients and group/feed behavior, but make the legacy
-- implementations callable only by the owning database role through these wrappers.
do $$ begin
 if to_regprocedure('public.hunteros_social_action_legacy(text,jsonb)') is null then
  alter function public.hunteros_social_action(text,jsonb) rename to hunteros_social_action_legacy;
 end if;
 if to_regprocedure('public.hunteros_social_snapshot_legacy()') is null then
  alter function public.hunteros_social_snapshot() rename to hunteros_social_snapshot_legacy;
 end if;
end $$;
revoke all on function public.hunteros_social_action_legacy(text,jsonb),public.hunteros_social_snapshot_legacy() from public,anon,authenticated;

create or replace function public.hunteros_social_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=auth.uid(); other uuid; relation_id uuid; lookup text; n integer;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then
  return jsonb_build_object('error','Sign in with a confirmed email first.');
 end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>6000 then
  return jsonb_build_object('error','Invalid request.');
 end if;
 perform pg_advisory_xact_lock(72926101);
 if action='request' then
  insert into public.social_limits(user_id,day,requests) values(me,current_date,1)
   on conflict(user_id,day) do update set requests=public.social_limits.requests+1 returning requests into n;
  if n>20 then return jsonb_build_object('error','You have reached today’s friend-request limit. Try tomorrow.'); end if;
  lookup:=lower(btrim(coalesce(payload->>'identifier',payload->>'code','')));
  if lookup ~ '^[0-9]{8}$' then
   select p.user_id into other from public.social_profiles p join auth.users u on u.id=p.user_id
    where p.user_code=lookup and u.email_confirmed_at is not null;
  elsif position('@' in lookup)>0 and length(lookup)<=320 then
   select p.user_id into other from public.social_profiles p join auth.users u on u.id=p.user_id
    where lower(u.email)=lookup and u.email_confirmed_at is not null order by u.id limit 1;
  elsif payload ? 'code' and not (payload ? 'identifier') then
   select p.user_id into other from public.social_profiles p join auth.users u on u.id=p.user_id
    where p.friend_code::text=lookup and u.email_confirmed_at is not null;
  end if;
  if other is null or other=me or exists(select 1 from public.social_blocks where
   (blocker=me and blocked=other) or (blocker=other and blocked=me)) then
   return jsonb_build_object('error','This person is not available. Check the user ID or email with your friend.');
  end if;
  if exists(select 1 from public.social_friends where least(sender,recipient)=least(me,other) and greatest(sender,recipient)=greatest(me,other)) then
   return jsonb_build_object('error','You already have a request or connection with this person.');
  end if;
  insert into public.social_friends(sender,recipient) values(me,other);
  return jsonb_build_object('ok',true);
 elsif action='remove_friend' and payload ? 'user_id' then
  other:=(payload->>'user_id')::uuid;
  if other is null or other=me then return jsonb_build_object('error','Person not available.'); end if;
  select id into relation_id from public.social_friends where me in(sender,recipient) and other in(sender,recipient);
  if relation_id is null then return jsonb_build_object('ok',true); end if;
  return public.hunteros_social_action_legacy(action,jsonb_build_object('id',relation_id));
 elsif action='block' then
  other:=(payload->>'user_id')::uuid;
  if other is null or other=me or not exists(select 1 from public.social_profiles where user_id=other) then
   return jsonb_build_object('error','Person not available.');
  end if;
  if not exists(select 1 from public.social_friends where me in(sender,recipient) and other in(sender,recipient))
   and not exists(select 1 from public.social_group_members a join public.social_group_members b using(group_id)
    where a.user_id=me and b.user_id=other and a.status='accepted' and b.status='accepted')
   and not exists(select 1 from public.social_messages where me in(sender,recipient) and other in(sender,recipient))
   and not exists(select 1 from public.social_blocks where blocker=me and blocked=other) then
   return jsonb_build_object('error','Person not available.');
  end if;
  insert into public.social_blocks(blocker,blocked) values(me,other) on conflict do nothing;
  delete from public.social_friends where me in(sender,recipient) and other in(sender,recipient);
  return jsonb_build_object('ok',true);
 end if;
 return public.hunteros_social_action_legacy(action,payload);
exception when invalid_text_representation then
 return jsonb_build_object('error','Invalid request.');
end $$;

create or replace function public.hunteros_social_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null then raise exception 'Sign in first' using errcode='42501'; end if;
 result:=public.hunteros_social_snapshot_legacy();
 result:=jsonb_set(result,'{profile}',coalesce(result->'profile','{}'::jsonb)||
  jsonb_build_object('user_code',(select user_code from public.social_profiles where user_id=me)));
 result:=jsonb_set(result,'{friends}',coalesce((select jsonb_agg(item||jsonb_build_object('user_code',p.user_code))
  from jsonb_array_elements(result->'friends') item join public.social_profiles p on p.user_id=(item->>'user_id')::uuid),'[]'::jsonb));
 result:=jsonb_set(result,'{blocked}',coalesce((select jsonb_agg(item||jsonb_build_object('user_code',p.user_code))
  from jsonb_array_elements(result->'blocked') item join public.social_profiles p on p.user_id=(item->>'user_id')::uuid),'[]'::jsonb));
 return result;
end $$;

create or replace function public.hunteros_message_inbox() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then
  return jsonb_build_object('error','Sign in with a confirmed email first.');
 end if;
 with peers as (
  select case when sender=me then recipient else sender end as user_id from public.social_messages where me in(sender,recipient)
  union select case when sender=me then recipient else sender end from public.social_friends where me in(sender,recipient) and status='accepted'
 )
 select jsonb_build_object('conversations',coalesce(jsonb_agg(to_jsonb(conversation) order by last_at desc nulls last,name,user_id),'[]'::jsonb)) into result
 from (
  select p.user_id,p.user_code,p.name,last_message.body as last_message,last_message.created_at as last_at,
   (select count(*) from public.social_messages m left join public.social_message_reads r on r.reader=me and r.peer=p.user_id
    where m.sender=p.user_id and m.recipient=me and (r.reader is null or (m.created_at,m.id)>(r.last_read_at,r.last_read_id))) as unread_count,
   exists(select 1 from public.social_friends f join auth.users u on u.id=p.user_id
    where me in(f.sender,f.recipient) and p.user_id in(f.sender,f.recipient) and f.status='accepted' and u.email_confirmed_at is not null) as can_message
  from peers join public.social_profiles p using(user_id)
  left join lateral (select body,created_at from public.social_messages m
   where least(m.sender,m.recipient)=least(me,p.user_id) and greatest(m.sender,m.recipient)=greatest(me,p.user_id)
   order by created_at desc,id desc limit 1) last_message on true
  where p.user_id<>me
   and (last_message.created_at is not null or exists(select 1 from public.social_friends f where f.status='accepted' and me in(f.sender,f.recipient) and p.user_id in(f.sender,f.recipient)))
   and not exists(select 1 from public.social_blocks b where (b.blocker=me and b.blocked=p.user_id) or (b.blocker=p.user_id and b.blocked=me))
 ) conversation;
 return result;
end $$;

create or replace function public.hunteros_message_thread(peer_id uuid,before_at timestamptz default null,before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=auth.uid(); can_send boolean; result jsonb;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then
  return jsonb_build_object('error','Sign in with a confirmed email first.');
 end if;
 if (before_at is null)<>(before_id is null) then return jsonb_build_object('error','Invalid message cursor.'); end if;
 can_send:=exists(select 1 from public.social_friends f join auth.users u on u.id=peer_id
  where me in(f.sender,f.recipient) and peer_id in(f.sender,f.recipient) and f.status='accepted' and u.email_confirmed_at is not null);
 if peer_id is null or peer_id=me
  or exists(select 1 from public.social_blocks b where (b.blocker=me and b.blocked=peer_id) or (b.blocker=peer_id and b.blocked=me))
  or (not can_send and not exists(select 1 from public.social_messages m where me in(m.sender,m.recipient) and peer_id in(m.sender,m.recipient))) then
  return jsonb_build_object('error','Conversation not available.');
 end if;
 with recent as (
  select id,sender,recipient,body,created_at,client_id from public.social_messages m
  where least(m.sender,m.recipient)=least(me,peer_id) and greatest(m.sender,m.recipient)=greatest(me,peer_id)
   and (before_at is null or (m.created_at,m.id)<(before_at,before_id))
  order by m.created_at desc,m.id desc limit 51
 ), page as (select * from recent order by created_at desc,id desc limit 50)
 select jsonb_build_object(
  'peer',(select jsonb_build_object('user_id',user_id,'user_code',user_code,'name',name) from public.social_profiles where user_id=peer_id),
  'can_message',can_send,
  'messages',coalesce((select jsonb_agg(to_jsonb(page) order by created_at,id) from page),'[]'::jsonb),
  'has_more',(select count(*)>50 from recent)) into result;
 return result;
end $$;

create or replace function public.hunteros_message_action(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid:=auth.uid(); other uuid; client uuid; body_text text; item public.social_messages%rowtype; n integer;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then
  return jsonb_build_object('error','Sign in with a confirmed email first.');
 end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>16000 then return jsonb_build_object('error','Invalid message request.'); end if;
 other:=(payload->>'user_id')::uuid;
 if other is null or other=me then return jsonb_build_object('error','Conversation not available.'); end if;
 perform pg_advisory_xact_lock(72926101);
 if exists(select 1 from public.social_blocks b where (b.blocker=me and b.blocked=other) or (b.blocker=other and b.blocked=me)) then
  return jsonb_build_object('error','Conversation not available.');
 end if;
 if action='send' then
  body_text:=btrim(coalesce(payload->>'body','')); client:=(payload->>'client_id')::uuid;
  if jsonb_typeof(payload->'body') is distinct from 'string' or length(body_text) not between 1 and 2000 or body_text !~ '[^[:space:]]' or client is null then
   return jsonb_build_object('error','Enter a message of 1–2,000 characters.');
  end if;
  if not exists(select 1 from public.social_friends f join auth.users u on u.id=other where me in(f.sender,f.recipient) and other in(f.sender,f.recipient) and f.status='accepted' and u.email_confirmed_at is not null) then
   return jsonb_build_object('error','You must be accepted friends to send messages.');
  end if;
  select * into item from public.social_messages where sender=me and client_id=client;
  if found then
   if item.recipient<>other or item.body<>body_text then return jsonb_build_object('error','This message request was already used.'); end if;
   return jsonb_build_object('ok',true,'message',to_jsonb(item));
  end if;
  insert into public.social_message_limits(user_id,day,sent) values(me,current_date,1)
   on conflict(user_id,day) do update set sent=public.social_message_limits.sent+1 returning sent into n;
  if n>300 then return jsonb_build_object('error','You have reached today’s message limit. Try tomorrow.'); end if;
  insert into public.social_messages(sender,recipient,body,client_id) values(me,other,body_text,client) returning * into item;
  return jsonb_build_object('ok',true,'message',to_jsonb(item));
 elsif action='read' then
  select * into item from public.social_messages where id=(payload->>'message_id')::uuid and me in(sender,recipient) and other in(sender,recipient);
  if not found then return jsonb_build_object('error','Message not available.'); end if;
  insert into public.social_message_reads(reader,peer,last_read_at,last_read_id) values(me,other,item.created_at,item.id)
   on conflict(reader,peer) do update set last_read_at=excluded.last_read_at,last_read_id=excluded.last_read_id
   where (public.social_message_reads.last_read_at,public.social_message_reads.last_read_id)<(excluded.last_read_at,excluded.last_read_id);
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('error','Unknown message action.');
exception when invalid_text_representation then
 return jsonb_build_object('error','Invalid message request.');
end $$;

revoke all on function public.hunteros_social_action(text,jsonb),public.hunteros_social_snapshot(),public.hunteros_message_inbox(),public.hunteros_message_thread(uuid,timestamptz,uuid),public.hunteros_message_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.hunteros_social_action(text,jsonb),public.hunteros_social_snapshot(),public.hunteros_message_inbox(),public.hunteros_message_thread(uuid,timestamptz,uuid),public.hunteros_message_action(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
