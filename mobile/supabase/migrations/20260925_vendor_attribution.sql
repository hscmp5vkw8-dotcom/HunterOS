-- HunterOS private vendor operations. Apply once, atomically, after schema.sql.
-- No app-user grants, customer tracking, messages, or existing-data changes.
begin;

create table public.vendor_partners (
 id uuid primary key default gen_random_uuid(),
 vendor_name text not null check (length(btrim(vendor_name)) > 0),
 website_url text,
 contact_name text,
 contact_email text,
 affiliate_platform text,
 outreach_status text not null default 'not_contacted'
  check (outreach_status in ('not_contacted','draft_ready','contacted','awaiting_reply','clarification_needed','confirmed','declined')),
 attribution_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index vendor_partners_name_unique on public.vendor_partners (lower(btrim(vendor_name)));

create table public.vendor_attribution_methods (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendor_partners(id) on delete restrict,
 attribution_method text not null check (attribution_method in (
  'affiliate_deep_link','checkout_survey','post_purchase_survey','customer_survey',
  'referral_code','promo_code','coupon_attribution','server_side_first_party',
  'cross_device','assisted_conversion','lifetime_customer_referral',
  'custom_partner_tracking','customer_account_referral_id','other')),
 support_status text not null default 'unknown'
  check (support_status in ('unknown','supported','conditional','not_supported')),
 commission_treatment text not null default 'unknown'
  check (commission_treatment in ('unknown','analytics_only','manual_referral_review','affiliate_commission')),
 hunteros_source_option_added boolean,
 referral_code text,
 promo_code text,
 referral_id text,
 affiliate_deep_link text,
 credit_without_affiliate_cookie boolean,
 attribution_window text,
 commission_conditions text,
 manual_claim_process text,
 vendor_answer text,
 evidence_reference text,
 confirmed_at timestamptz,
 attribution_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (vendor_id, attribution_method),
 constraint attribution_answer_required check (
  commission_treatment = 'unknown' or (
   nullif(btrim(vendor_answer),'') is not null and
   nullif(btrim(evidence_reference),'') is not null and confirmed_at is not null)),
 constraint commission_support_consistent check (
  commission_treatment <> 'affiliate_commission' or support_status in ('supported','conditional')),
 constraint source_option_survey_only check (
  hunteros_source_option_added is null or attribution_method in ('checkout_survey','post_purchase_survey','customer_survey')),
 constraint referral_code_method_only check (referral_code is null or attribution_method = 'referral_code'),
 constraint promo_code_method_only check (promo_code is null or attribution_method = 'promo_code'),
 constraint affiliate_link_method_only check (affiliate_deep_link is null or attribution_method = 'affiliate_deep_link')
);

create function public.hunteros_seed_vendor_attribution() returns trigger
language plpgsql set search_path = '' as $$
begin
 insert into public.vendor_attribution_methods (vendor_id, attribution_method)
 select new.id, method from unnest(array[
  'affiliate_deep_link','checkout_survey','post_purchase_survey','customer_survey',
  'referral_code','promo_code','coupon_attribution','server_side_first_party',
  'cross_device','assisted_conversion','lifetime_customer_referral',
  'custom_partner_tracking','customer_account_referral_id','other']) as methods(method);
 return new;
end;
$$;
create trigger seed_vendor_attribution after insert on public.vendor_partners
 for each row execute function public.hunteros_seed_vendor_attribution();

create function public.hunteros_stamp_vendor_update() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger stamp_vendor_update before update on public.vendor_partners
 for each row execute function public.hunteros_stamp_vendor_update();
create trigger stamp_attribution_update before update on public.vendor_attribution_methods
 for each row execute function public.hunteros_stamp_vendor_update();

-- The requested vendor-level fields are calculated from method records so their
-- values cannot silently disagree with the detailed answers. This view is read-only.
create view public.vendor_attribution_tracker with (security_invoker = true) as
select v.id as vendor_id, v.vendor_name, v.website_url, v.contact_name, v.contact_email,
 v.affiliate_platform, v.outreach_status,
 case
  when bool_or(m.support_status = 'supported') filter (where m.attribution_method <> 'affiliate_deep_link') then 'supported'
  when bool_or(m.support_status = 'conditional') filter (where m.attribution_method <> 'affiliate_deep_link') then 'conditional'
  when count(*) filter (where m.attribution_method <> 'affiliate_deep_link' and m.support_status = 'not_supported') = 13 then 'not_supported'
  else 'unknown' end as secondary_attribution_supported,
 coalesce(array_agg(m.attribution_method order by m.attribution_method)
  filter (where m.support_status in ('supported','conditional')), array[]::text[]) as attribution_method,
 case
  when bool_or(m.support_status = 'supported') filter (where m.attribution_method in ('checkout_survey','post_purchase_survey','customer_survey')) then 'supported'
  when bool_or(m.support_status = 'conditional') filter (where m.attribution_method in ('checkout_survey','post_purchase_survey','customer_survey')) then 'conditional'
  when count(*) filter (where m.attribution_method in ('checkout_survey','post_purchase_survey','customer_survey') and m.support_status = 'not_supported') = 3 then 'not_supported'
  else 'unknown' end as how_did_you_hear_about_us_supported,
 case
  when bool_or(m.hunteros_source_option_added) then true
  when count(*) filter (where m.attribution_method in ('checkout_survey','post_purchase_survey','customer_survey') and m.hunteros_source_option_added = false) = 3 then false
  else null end as hunteros_source_option_added,
 max(m.referral_code) as referral_code, max(m.promo_code) as promo_code,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'coupon_attribution'),'unknown') as coupon_attribution_supported,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'cross_device'),'unknown') as cross_device_tracking,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'server_side_first_party'),'unknown') as server_side_tracking,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'assisted_conversion'),'unknown') as assisted_conversion_tracking,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'lifetime_customer_referral'),'unknown') as lifetime_customer_referral_supported,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'custom_partner_tracking'),'unknown') as custom_partner_tracking_supported,
 coalesce(max(m.support_status) filter (where m.attribution_method = 'customer_account_referral_id'),'unknown') as customer_account_referral_id_supported,
 max(m.affiliate_deep_link) as primary_affiliate_deep_link,
 coalesce(jsonb_object_agg(m.attribution_method, m.attribution_window)
  filter (where m.attribution_method is not null),'{}'::jsonb) as attribution_window,
 coalesce(jsonb_object_agg(m.attribution_method, m.commission_treatment)
  filter (where m.attribution_method is not null),'{}'::jsonb) as commission_treatment_by_method,
 coalesce(jsonb_object_agg(m.attribution_method, jsonb_build_object(
  'support_status',m.support_status,'commission_treatment',m.commission_treatment,
  'credit_without_affiliate_cookie',m.credit_without_affiliate_cookie,
  'hunteros_source_option_added',m.hunteros_source_option_added,
  'referral_id',m.referral_id,'commission_conditions',m.commission_conditions,
  'manual_claim_process',m.manual_claim_process,'vendor_answer',m.vendor_answer,
  'evidence_reference',m.evidence_reference,'confirmed_at',m.confirmed_at,
  'attribution_notes',m.attribution_notes))
  filter (where m.attribution_method is not null),'{}'::jsonb) as method_details,
 v.attribution_notes, v.created_at, greatest(v.updated_at, max(m.updated_at)) as updated_at
from public.vendor_partners v
left join public.vendor_attribution_methods m on m.vendor_id = v.id
group by v.id;

alter table public.vendor_partners enable row level security;
alter table public.vendor_attribution_methods enable row level security;
revoke all on public.vendor_partners, public.vendor_attribution_methods, public.vendor_attribution_tracker
 from public, anon, authenticated;
revoke all on function public.hunteros_seed_vendor_attribution(), public.hunteros_stamp_vendor_update()
 from public, anon, authenticated;
comment on table public.vendor_partners is 'Private HunterOS vendor outreach records; manage through the owner database dashboard.';
comment on table public.vendor_attribution_methods is 'One vendor answer per method. Support and survey selection do not imply commission. Known commission classifications require an evidenced answer.';
comment on view public.vendor_attribution_tracker is 'Read-only vendor summary derived from method records. Windows and commission treatment remain separate per method.';
commit;
