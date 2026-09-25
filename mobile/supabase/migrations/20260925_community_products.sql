-- Public PRODUCT references only. No gear, workspace, email or trip data.
begin;
create table if not exists public.community_products (
 id uuid primary key default gen_random_uuid(),
 source_key text not null unique check(length(source_key) between 10 and 2200),
 product jsonb not null check(jsonb_typeof(product)='object' and octet_length(product::text)<20000),
 status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now()
);
alter table public.community_products enable row level security;
revoke all on public.community_products from public, anon, authenticated;
grant select(id,product,created_at) on public.community_products to anon,authenticated;
drop policy if exists "published product references" on public.community_products;
create policy "published product references" on public.community_products for select to anon,authenticated using(status='published');
create table if not exists public.product_contributors (
 product_id uuid primary key references public.community_products(id),
 user_id uuid references auth.users(id) on delete set null
);
create table if not exists public.product_import_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default current_date, requests integer not null default 0,
 primary key(user_id,day)
);
alter table public.product_contributors enable row level security;
alter table public.product_import_limits enable row level security;
revoke all on public.product_contributors,public.product_import_limits from public,anon,authenticated;

create or replace function public.reserve_product_import(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.product_import_limits(user_id,day,requests) values(p_user,current_date,1)
 on conflict(user_id,day) do update set requests=public.product_import_limits.requests+1 returning requests into n;
 return n<=60;
end; $$;
revoke all on function public.reserve_product_import(uuid) from public,anon,authenticated;
grant execute on function public.reserve_product_import(uuid) to service_role;

create or replace function public.publish_manufacturer_product(p_user uuid,p_key text,p_product jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row public.community_products; new_id uuid:=gen_random_uuid();
begin
 -- Only the authenticated Edge Function can call this. Clients never supply the stored product JSON.
 insert into public.community_products(id,source_key,product)
 values(new_id,p_key,p_product||jsonb_build_object('id','community-'||new_id::text))
 on conflict(source_key) do nothing;
 select * into row from public.community_products where source_key=p_key;
 if row.status<>'published' then raise exception 'This product is unavailable for sharing.'; end if;
 if row.id=new_id then insert into public.product_contributors(product_id,user_id) values(row.id,p_user); end if;
 return row.product;
end; $$;
revoke all on function public.publish_manufacturer_product(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.publish_manufacturer_product(uuid,text,jsonb) to service_role;
commit;
