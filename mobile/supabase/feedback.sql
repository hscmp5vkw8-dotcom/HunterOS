-- HunterOS ejuzguancnrrrcdulixb only. Additive private feedback intake.
-- No table read/write grants to app roles. Only a bounded append-only RPC.
begin;
create table if not exists public.feedback_reports (
 id text primary key,
 received_at timestamptz not null default now(),
 reporter_user_id uuid references auth.users(id) on delete set null,
 report jsonb not null,
 status text not null default 'new' check(status in ('new','reviewing','planned','fixed','closed')),
 priority text not null default 'untriaged' check(priority in ('untriaged','low','normal','high')),
 operator_notes text not null default '',
 is_test boolean not null default false
);
alter table public.feedback_reports enable row level security;
revoke all on public.feedback_reports from public,anon,authenticated;
create index if not exists feedback_reports_received_at on public.feedback_reports(received_at);
create or replace function public.submit_feedback(p_report jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare key text; existing public.feedback_reports%rowtype; received timestamptz; caller uuid:=auth.uid();
begin
 if p_report is null or jsonb_typeof(p_report)<>'object' or octet_length(p_report::text)>30000 then raise exception 'Invalid feedback report' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p_report))<>9 then raise exception 'Invalid feedback fields' using errcode='22023'; end if;
 foreach key in array array['id','kind','details','steps','expected','contact_email','app_version','platform','os_version'] loop
  if not(p_report ? key) or jsonb_typeof(p_report->key)<>'string' then raise exception 'Invalid feedback field' using errcode='22023'; end if;
 end loop;
 if p_report - array['id','kind','details','steps','expected','contact_email','app_version','platform','os_version'] <> '{}'::jsonb then raise exception 'Unexpected feedback field' using errcode='22023'; end if;
 if p_report->>'id' !~ '^HOS-[a-z0-9-]{16,76}$' or p_report->>'kind' not in ('Something broke','An idea','What I liked')
 or length(btrim(p_report->>'details')) not between 1 and 3000 or length(p_report->>'steps')>2000 or length(p_report->>'expected')>1500
 or length(p_report->>'contact_email')>254 or ((p_report->>'contact_email')<>'' and p_report->>'contact_email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 or length(p_report->>'app_version') not between 1 and 32 or p_report->>'platform' not in ('ios','android','web') or length(p_report->>'os_version')>80
 then raise exception 'Invalid feedback values' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(428514501);
 select * into existing from public.feedback_reports where id=p_report->>'id';
 if found then
  if existing.report<>p_report then raise exception 'Feedback reference already used' using errcode='22023'; end if;
  return jsonb_build_object('id',existing.id,'created_at',existing.received_at);
 end if;
 if (select count(*) from public.feedback_reports where received_at>=date_trunc('day',now()))>=100
 or (caller is not null and (select count(*) from public.feedback_reports where reporter_user_id=caller and received_at>now()-interval '1 hour')>=20)
 then raise exception 'Feedback limit reached. Retry later.' using errcode='P0001'; end if;
 insert into public.feedback_reports(id,reporter_user_id,report) values(p_report->>'id',caller,p_report) returning received_at into received;
 return jsonb_build_object('id',p_report->>'id','created_at',received);
end;
$$;
revoke all on function public.submit_feedback(jsonb) from public,anon,authenticated;
grant execute on function public.submit_feedback(jsonb) to anon,authenticated;
comment on table public.feedback_reports is 'Private HunterOS feedback records; operator-only read/triage. Never include in public source or exports.';
commit;
