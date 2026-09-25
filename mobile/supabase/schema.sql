-- HunterOS v0.4: bootstrap for NEW project ejuzguancnrrrcdulixb only.
-- Atomic and repeatable. No accounts, grants to other people, or real test data.
-- App users may read/replace only their own workspace. Other tables remain private.
begin;
create table if not exists public.user_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 workspace jsonb not null check (jsonb_typeof(workspace) = 'object'),
 updated_at timestamptz not null default now()
);
alter table public.user_workspaces enable row level security;
revoke all on public.user_workspaces from anon, authenticated;
grant select, insert, update on public.user_workspaces to authenticated;
drop policy if exists "workspace owner read" on public.user_workspaces;
drop policy if exists "workspace owner insert" on public.user_workspaces;
drop policy if exists "workspace owner update" on public.user_workspaces;
create policy "workspace owner read" on public.user_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy "workspace owner insert" on public.user_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy "workspace owner update" on public.user_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.stamp_workspace_update() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.stamp_workspace_update() from public, anon, authenticated;
drop trigger if exists stamp_workspace_update on public.user_workspaces;
create trigger stamp_workspace_update before insert or update on public.user_workspaces for each row execute function public.stamp_workspace_update();

-- Reserved v0.4 tables; there is no client access until those features are shipped.
create table if not exists public.scan_submissions (
 user_id uuid not null references auth.users(id) on delete cascade,
 code text not null check (length(code) between 1 and 200),
 code_type text not null default '', product jsonb,
 first_scanned_at timestamptz not null, last_scanned_at timestamptz not null,
 scan_count integer not null default 1 check (scan_count > 0), primary key(user_id,code)
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), code text unique, manufacturer_sku text,
 brand text not null, model text not null, variant text not null default '', category text not null,
 data jsonb not null default '{}'::jsonb, verification_status text not null default 'community',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.trip_members (
 trip_id text not null, owner_id uuid not null references auth.users(id) on delete cascade,
 member_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member', primary key(trip_id,member_id)
);
alter table public.scan_submissions enable row level security;
alter table public.products enable row level security;
alter table public.trip_members enable row level security;
revoke all on public.scan_submissions, public.products, public.trip_members from anon, authenticated;
commit;
