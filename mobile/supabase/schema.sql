-- HunterOS Supabase bootstrap. Run in a NEW Supabase project's SQL editor.
create extension if not exists pgcrypto;
create table if not exists public.user_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 workspace jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.user_workspaces enable row level security;
create policy "workspace owner read" on public.user_workspaces for select using (auth.uid()=user_id);
create policy "workspace owner insert" on public.user_workspaces for insert with check (auth.uid()=user_id);
create policy "workspace owner update" on public.user_workspaces for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.scan_submissions (
 user_id uuid not null references auth.users(id) on delete cascade,
 code text not null,
 code_type text not null default '',
 product jsonb,
 first_scanned_at timestamptz not null,
 last_scanned_at timestamptz not null,
 scan_count integer not null default 1,
 primary key(user_id,code)
);
alter table public.scan_submissions enable row level security;
create policy "scan owner read" on public.scan_submissions for select using (auth.uid()=user_id);
create policy "scan owner insert" on public.scan_submissions for insert with check (auth.uid()=user_id);
create policy "scan owner update" on public.scan_submissions for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Shared catalog is readable by signed-in users. Client users cannot write directly.
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 code text unique,
 manufacturer_sku text,
 brand text not null,
 model text not null,
 variant text not null default '',
 category text not null,
 data jsonb not null default '{}'::jsonb,
 verification_status text not null default 'community',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "authenticated catalog read" on public.products for select to authenticated using (true);

-- Trip memberships for the coming shared-trip UI.
create table if not exists public.trip_members (
 trip_id text not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 member_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member',
 primary key(trip_id,member_id)
);
alter table public.trip_members enable row level security;
create policy "members see memberships" on public.trip_members for select using (auth.uid()=owner_id or auth.uid()=member_id);
create policy "owners manage memberships" on public.trip_members for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
