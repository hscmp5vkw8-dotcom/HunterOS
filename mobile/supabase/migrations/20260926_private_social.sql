-- Private-by-default social beta. Additive; does not alter workspace access.
begin;
create table if not exists public.social_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 50),
 friend_code uuid not null unique default gen_random_uuid()
);
create table if not exists public.social_friends (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references public.social_profiles(user_id) on delete cascade,
 recipient uuid not null references public.social_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(), check(sender <> recipient)
);
create unique index if not exists social_friend_pair on public.social_friends(least(sender,recipient), greatest(sender,recipient));
create table if not exists public.social_blocks (
 blocker uuid references public.social_profiles(user_id) on delete cascade,
 blocked uuid references public.social_profiles(user_id) on delete cascade,
 primary key(blocker,blocked), check(blocker <> blocked)
);
create table if not exists public.social_groups (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.social_profiles(user_id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60)
);
create table if not exists public.social_group_members (
 group_id uuid references public.social_groups(id) on delete cascade,
 user_id uuid references public.social_profiles(user_id) on delete cascade,
 status text not null check(status in ('invited','accepted')), primary key(group_id,user_id)
);
create table if not exists public.social_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.social_profiles(user_id) on delete cascade,
 group_id uuid references public.social_groups(id) on delete cascade,
 product_id text not null check(length(product_id) between 1 and 200),
 message text not null default '' check(length(message) <= 500),
 created_at timestamptz not null default now()
);
create table if not exists public.social_product_signals (
 user_id uuid references public.social_profiles(user_id) on delete cascade,
 product_id text check(length(product_id) between 1 and 200),
 liked boolean not null default false, used boolean not null default false,
 primary key(user_id,product_id)
);
create table if not exists public.social_limits (
 user_id uuid references auth.users(id) on delete cascade, day date,
 requests integer not null default 0, posts integer not null default 0, primary key(user_id,day)
);
-- Operator-curated real release dates and sources, not catalog import timestamps.
create table if not exists public.product_releases (
 product_id text primary key check(length(product_id) between 1 and 200),
 released_on date not null, source_url text not null check(source_url ~ '^https://'),
 published boolean not null default false
);
do $$ declare t text; begin
 foreach t in array array['social_profiles','social_friends','social_blocks','social_groups','social_group_members','social_posts','social_product_signals','social_limits','product_releases'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
 end loop;
end $$;

create or replace function public.hunteros_social_action(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid; item uuid; grp uuid; nm text; pid text; msg text; rel record; n integer;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then
  return jsonb_build_object('error','Sign in with a confirmed email first.');
 end if;
 if payload is null or jsonb_typeof(payload) <> 'object' or octet_length(payload::text)>6000 then
  return jsonb_build_object('error','Invalid request.');
 end if;
 -- Serializes beta mutations, including reciprocal requests, blocks and membership changes.
 perform pg_advisory_xact_lock(72926101);
 if action='profile' then
  nm := btrim(coalesce(payload->>'name',''));
  if length(nm) not between 1 and 50 then return jsonb_build_object('error','Enter a display name of 1–50 characters.'); end if;
  insert into public.social_profiles(user_id,name) values(me,nm) on conflict(user_id) do update set name=excluded.name;
  return jsonb_build_object('ok',true);
 end if;
 if not exists(select 1 from public.social_profiles where user_id=me) then return jsonb_build_object('error','Save your display name first.'); end if;
 if action='rotate_code' then
  update public.social_profiles set friend_code=gen_random_uuid() where user_id=me;
 elsif action='request' then
  insert into public.social_limits(user_id,day,requests) values(me,current_date,1)
   on conflict(user_id,day) do update set requests=public.social_limits.requests+1 returning requests into n;
  if n>20 then return jsonb_build_object('error','You have reached today’s friend-request limit. Try tomorrow.'); end if;
  select user_id into other from public.social_profiles where friend_code::text=lower(btrim(coalesce(payload->>'code','')));
  if other is null or other=me or exists(select 1 from public.social_blocks where (blocker=me and blocked=other) or (blocker=other and blocked=me)) then
   return jsonb_build_object('error','This friend code is not available. Ask your friend to check it.');
  end if;
  if exists(select 1 from public.social_friends where least(sender,recipient)=least(me,other) and greatest(sender,recipient)=greatest(me,other)) then
   return jsonb_build_object('error','You already have a request or connection with this person.');
  end if;
  insert into public.social_friends(sender,recipient) values(me,other);
 elsif action in ('accept','remove_friend') then
  item := (payload->>'id')::uuid;
  select * into rel from public.social_friends where id=item and me in (sender,recipient);
  if not found then return jsonb_build_object('error','Request or connection no longer exists.'); end if;
  if action='accept' then
   if rel.recipient<>me or rel.status<>'pending' then return jsonb_build_object('error','Only the recipient can accept a request.'); end if;
   update public.social_friends set status='accepted' where id=item;
  else delete from public.social_friends where id=item; end if;
 elsif action='block' then
  other := (payload->>'user_id')::uuid;
  if other=me or not exists(select 1 from public.social_profiles where user_id=other) then return jsonb_build_object('error','Invalid person.'); end if;
  if not exists(select 1 from public.social_friends where me in(sender,recipient) and other in(sender,recipient))
   and not exists(select 1 from public.social_group_members a join public.social_group_members b using(group_id) where a.user_id=me and b.user_id=other and a.status='accepted' and b.status='accepted') then
   return jsonb_build_object('error','Person not available.');
  end if;
  insert into public.social_blocks values(me,other) on conflict do nothing;
  delete from public.social_friends where me in(sender,recipient) and other in(sender,recipient);
 elsif action='unblock' then
  delete from public.social_blocks where blocker=me and blocked=(payload->>'user_id')::uuid;
 elsif action='create_group' then
  nm := btrim(coalesce(payload->>'name',''));
  if length(nm) not between 1 and 60 then return jsonb_build_object('error','Enter a group name of 1–60 characters.'); end if;
  if (select count(*) from public.social_groups where owner_id=me)>=20 then return jsonb_build_object('error','You can own up to 20 groups.'); end if;
  insert into public.social_groups(owner_id,name) values(me,nm) returning id into grp;
  insert into public.social_group_members values(grp,me,'accepted');
 elsif action in ('invite_group','accept_group','leave_group','remove_member','delete_group') then
  grp := (payload->>'group_id')::uuid;
  select * into rel from public.social_groups where id=grp;
  if not found then return jsonb_build_object('error','Group no longer exists.'); end if;
  if action='invite_group' then
   other := (payload->>'user_id')::uuid;
   if rel.owner_id<>me or not exists(select 1 from public.social_friends where me in(sender,recipient) and other in(sender,recipient) and status='accepted') then
    return jsonb_build_object('error','Only the group owner can invite their accepted friends.');
   end if;
   if exists(select 1 from public.social_blocks b join public.social_group_members m on m.group_id=grp and m.status='accepted' where (b.blocker=other and b.blocked=m.user_id) or (b.blocked=other and b.blocker=m.user_id)) then
    return jsonb_build_object('error','This person cannot be invited to this group.');
   end if;
   if (select count(*) from public.social_group_members where group_id=grp)>=50 then return jsonb_build_object('error','Groups support up to 50 members.'); end if;
   insert into public.social_group_members values(grp,other,'invited') on conflict do nothing;
  elsif action='accept_group' then
   if not exists(select 1 from public.social_group_members where group_id=grp and user_id=me and status='invited') then return jsonb_build_object('error','You need an invitation to join this group.'); end if;
   if exists(select 1 from public.social_blocks b join public.social_group_members m on m.group_id=grp and m.status='accepted' where (b.blocker=me and b.blocked=m.user_id) or (b.blocked=me and b.blocker=m.user_id)) then return jsonb_build_object('error','This group is not available.'); end if;
   update public.social_group_members set status='accepted' where group_id=grp and user_id=me;
  elsif action='leave_group' then
   if rel.owner_id=me then return jsonb_build_object('error','As owner, close the group instead.'); end if;
   delete from public.social_group_members where group_id=grp and user_id=me;
   delete from public.social_posts where group_id=grp and user_id=me;
  elsif action='remove_member' then
   other := (payload->>'user_id')::uuid;
   if rel.owner_id<>me or other=me then return jsonb_build_object('error','Only the owner can remove another member.'); end if;
   delete from public.social_group_members where group_id=grp and user_id=other;
   delete from public.social_posts where group_id=grp and user_id=other;
  else
   if rel.owner_id<>me then return jsonb_build_object('error','Only the owner can close this group.'); end if;
   delete from public.social_groups where id=grp;
  end if;
 elsif action='post' then
  pid:=btrim(coalesce(payload->>'product_id','')); msg:=btrim(coalesce(payload->>'message',''));
  if length(pid) not between 1 and 200 or length(msg)>500 then return jsonb_build_object('error','Choose a product and keep your note under 500 characters.'); end if;
  grp:=nullif(payload->>'group_id','')::uuid;
  if grp is not null and not exists(select 1 from public.social_group_members where group_id=grp and user_id=me and status='accepted') then return jsonb_build_object('error','Join this group before sharing with it.'); end if;
  insert into public.social_limits(user_id,day,posts) values(me,current_date,1)
   on conflict(user_id,day) do update set posts=public.social_limits.posts+1 returning posts into n;
  if n>30 then return jsonb_build_object('error','You have reached today’s sharing limit. Try tomorrow.'); end if;
  insert into public.social_posts(user_id,group_id,product_id,message) values(me,grp,pid,msg);
 elsif action='delete_post' then
  delete from public.social_posts where id=(payload->>'id')::uuid and user_id=me;
 elsif action='signal' then
  pid:=btrim(coalesce(payload->>'product_id',''));
  if length(pid) not between 1 and 200 then return jsonb_build_object('error','Choose a product.'); end if;
  if not exists(select 1 from public.social_product_signals where user_id=me and product_id=pid) and (select count(*) from public.social_product_signals where user_id=me)>=500 then return jsonb_build_object('error','You can keep up to 500 gear picks.'); end if;
  insert into public.social_product_signals values(me,pid,coalesce((payload->>'liked')::boolean,false),coalesce((payload->>'used')::boolean,false))
   on conflict(user_id,product_id) do update set liked=excluded.liked,used=excluded.used;
  delete from public.social_product_signals where user_id=me and product_id=pid and not liked and not used;
 else return jsonb_build_object('error','Unknown action.');
 end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.hunteros_social_snapshot() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select jsonb_build_object(
 'profile',(select jsonb_build_object('user_id',user_id,'name',name,'friend_code',friend_code) from public.social_profiles where user_id=me),
 'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'user_id',p.user_id,'name',p.name,'status',f.status,'incoming',f.recipient=me) order by f.created_at desc) from public.social_friends f join public.social_profiles p on p.user_id=case when f.sender=me then f.recipient else f.sender end where me in(f.sender,f.recipient)), '[]'::jsonb),
 'blocked',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.name)) from public.social_blocks b join public.social_profiles p on p.user_id=b.blocked where b.blocker=me),'[]'::jsonb),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'owner_id',g.owner_id,'status',mine.status,'members',
  case when mine.status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.name,'status',m.status)) from public.social_group_members m join public.social_profiles p on p.user_id=m.user_id where m.group_id=g.id and (m.status='accepted' or g.owner_id=me) and not exists(select 1 from public.social_blocks b where (b.blocker=me and b.blocked=p.user_id) or (b.blocked=me and b.blocker=p.user_id))),'[]'::jsonb) else '[]'::jsonb end)) from public.social_groups g join public.social_group_members mine on mine.group_id=g.id and mine.user_id=me),'[]'::jsonb),
 'signals',coalesce((select jsonb_agg(jsonb_build_object('product_id',product_id,'liked',liked,'used',used)) from public.social_product_signals where user_id=me),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(to_jsonb(x)) from (
  select post.id,post.user_id,p.name,post.product_id,post.message,post.group_id,g.name as group_name,post.created_at
  from public.social_posts post join public.social_profiles p on p.user_id=post.user_id left join public.social_groups g on g.id=post.group_id
  where not exists(select 1 from public.social_blocks b where (b.blocker=me and b.blocked=post.user_id) or (b.blocked=me and b.blocker=post.user_id))
  and ((post.group_id is null and (post.user_id=me or exists(select 1 from public.social_friends f where f.status='accepted' and me in(f.sender,f.recipient) and post.user_id in(f.sender,f.recipient))))
   or (post.group_id is not null and exists(select 1 from public.social_group_members m where m.group_id=post.group_id and m.user_id=me and m.status='accepted') and exists(select 1 from public.social_group_members m where m.group_id=post.group_id and m.user_id=post.user_id and m.status='accepted')))
  order by post.created_at desc,post.id limit 100
 ) x),'[]'::jsonb)) into result;
 return result;
end $$;

create or replace function public.hunteros_public_feed() returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
 'popular',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select product_id,count(*) filter(where liked) as likes,count(*) filter(where used) as uses
   from public.social_product_signals where liked or used group by product_id having count(*)>=3
   order by count(*) desc,product_id limit 100
 ) x),'[]'::jsonb),
 'releases',coalesce((select jsonb_agg(to_jsonb(x)) from (
   select product_id,released_on,source_url from public.product_releases where published and released_on<=current_date order by released_on desc limit 100
 ) x),'[]'::jsonb));
$$;
revoke all on function public.hunteros_social_action(text,jsonb),public.hunteros_social_snapshot(),public.hunteros_public_feed() from public,anon,authenticated;
grant execute on function public.hunteros_social_action(text,jsonb),public.hunteros_social_snapshot() to authenticated;
grant execute on function public.hunteros_public_feed() to anon,authenticated;
commit;
