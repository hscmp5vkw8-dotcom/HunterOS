-- Run after the vendor migration. All sample rows are rolled back.
begin;
do $test$
declare vendor_uuid uuid; summary record; relation_name text; role_name text; operation_name text;
begin
 insert into public.vendor_partners(vendor_name) values ('__HunterOS attribution verification ' || gen_random_uuid()) returning id into vendor_uuid;
 if (select count(*) from public.vendor_attribution_methods where vendor_id = vendor_uuid) <> 14 then
  raise exception 'FAIL: every new vendor must get all 14 method questions'; end if;
 select * into summary from public.vendor_attribution_tracker where vendor_id = vendor_uuid;
 if summary.secondary_attribution_supported <> 'unknown' or summary.cross_device_tracking <> 'unknown'
  or summary.hunteros_source_option_added is not null then raise exception 'FAIL: unknown defaults'; end if;

 update public.vendor_attribution_methods set support_status='supported', hunteros_source_option_added=true
  where vendor_id=vendor_uuid and attribution_method='checkout_survey';
 select * into summary from public.vendor_attribution_tracker where vendor_id=vendor_uuid;
 if summary.hunteros_source_option_added is distinct from true
  or summary.commission_treatment_by_method->>'checkout_survey' <> 'unknown' then
  raise exception 'FAIL: a survey option must not imply commission'; end if;
 begin
  update public.vendor_attribution_methods set commission_treatment='affiliate_commission'
   where vendor_id=vendor_uuid and attribution_method='checkout_survey';
  raise exception 'FAIL: commission classification accepted without evidence';
 exception when check_violation then null; end;
 update public.vendor_attribution_methods set commission_treatment='analytics_only',
  vendor_answer='TEST ONLY: survey is reporting only.', evidence_reference='Rolled-back validation fixture', confirmed_at=now()
  where vendor_id=vendor_uuid and attribution_method='checkout_survey';
 update public.vendor_attribution_methods set support_status='conditional', commission_treatment='affiliate_commission',
  promo_code='TEST_ONLY',credit_without_affiliate_cookie=true,attribution_window='At checkout',
  commission_conditions='TEST ONLY: eligible purchases using the code.', vendor_answer='TEST ONLY: code earns credit without cookie.',
  evidence_reference='Rolled-back validation fixture',confirmed_at=now()
  where vendor_id=vendor_uuid and attribution_method='promo_code';
 update public.vendor_attribution_methods set support_status='supported',attribution_window='30 days',
  affiliate_deep_link='https://example.invalid/test-only'
  where vendor_id=vendor_uuid and attribution_method='affiliate_deep_link';
 update public.vendor_attribution_methods set support_status='conditional',commission_treatment='manual_referral_review',
  manual_claim_process='TEST ONLY: submit a claim for review.',vendor_answer='TEST ONLY: manual review, not guaranteed credit.',
  evidence_reference='Rolled-back validation fixture',confirmed_at=now()
  where vendor_id=vendor_uuid and attribution_method='assisted_conversion';
 select * into summary from public.vendor_attribution_tracker where vendor_id=vendor_uuid;
 if summary.commission_treatment_by_method->>'checkout_survey' <> 'analytics_only'
  or summary.commission_treatment_by_method->>'promo_code' <> 'affiliate_commission'
  or summary.commission_treatment_by_method->>'assisted_conversion' <> 'manual_referral_review'
  or summary.attribution_window->>'affiliate_deep_link' <> '30 days'
  or summary.attribution_window->>'promo_code' <> 'At checkout'
  or summary.promo_code <> 'TEST_ONLY' or summary.cross_device_tracking <> 'unknown' then
  raise exception 'FAIL: method-specific commission and windows must remain independent'; end if;
 begin
  update public.vendor_attribution_methods set support_status='not_supported'
   where vendor_id=vendor_uuid and attribution_method='promo_code';
  raise exception 'FAIL: unsupported method accepted as commission-bearing';
 exception when check_violation then null; end;
 update public.vendor_attribution_methods set commission_treatment='unknown', support_status='not_supported',hunteros_source_option_added=null
  where vendor_id=vendor_uuid and attribution_method <> 'affiliate_deep_link';
 select * into summary from public.vendor_attribution_tracker where vendor_id=vendor_uuid;
 if summary.secondary_attribution_supported <> 'not_supported' then raise exception 'FAIL: confirmed negative summary'; end if;
 update public.vendor_attribution_methods set support_status='unknown' where vendor_id=vendor_uuid and attribution_method='other';
 select * into summary from public.vendor_attribution_tracker where vendor_id=vendor_uuid;
 if summary.secondary_attribution_supported <> 'unknown' then raise exception 'FAIL: unknown answer must not imply no support'; end if;

 foreach relation_name in array array['vendor_partners','vendor_attribution_methods','vendor_attribution_tracker'] loop
  foreach role_name in array array['anon','authenticated'] loop
   foreach operation_name in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if has_table_privilege(role_name,'public.' || relation_name,operation_name) then
     raise exception 'FAIL: % has % access to %',role_name,operation_name,relation_name;
    end if;
   end loop;
  end loop;
 end loop;
 if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('vendor_partners','vendor_attribution_methods') and not c.relrowsecurity) then
  raise exception 'FAIL: vendor RLS disabled'; end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='vendor_attribution_tracker' and 'security_invoker=true'=any(c.reloptions)) then
  raise exception 'FAIL: summary view does not use invoker security'; end if;
end;
$test$;
rollback;
select 'PASS: 14 unknown defaults; survey never implies commission; evidence required; independent analytics/manual/commission treatment and windows; negative and unknown-answer handling; app roles denied; RLS and invoker view; test data rolled back' as result;
