-- Append after feedback.sql's DDL but BEFORE its commit, then rollback.
-- All fixtures are synthetic and disappear with the transaction.
select set_config('hunteros.test_report','{"id":"HOS-sql-feedback-test-00000001","kind":"Something broke","details":"Synthetic feedback acceptance test","steps":"","expected":"","contact_email":"","app_version":"0.4.0","platform":"web","os_version":"test"}',true);
set local role anon;
do $$ begin
 begin perform * from public.feedback_reports; raise exception 'FAIL public feedback read'; exception when insufficient_privilege then null; end;
 begin update public.feedback_reports set status='fixed'; raise exception 'FAIL public feedback update'; exception when insufficient_privilege then null; end;
 begin delete from public.feedback_reports; raise exception 'FAIL public feedback delete'; exception when insufficient_privilege then null; end;
 perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb);
 perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb);
 begin perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb||'{"status":"fixed"}'); raise exception 'FAIL extra field accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb||'{"details":"changed"}'); raise exception 'FAIL reused ID overwrote report'; exception when invalid_parameter_value then null; end;
 begin perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb||'{"details":""}'); raise exception 'FAIL empty feedback accepted'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.feedback_reports where id='HOS-sql-feedback-test-00000001')<>1 then raise exception 'FAIL duplicate report'; end if;
 if (select reporter_user_id from public.feedback_reports where id='HOS-sql-feedback-test-00000001') is not null then raise exception 'FAIL anonymous identity'; end if;
 if has_table_privilege('authenticated','public.feedback_reports','select') or has_table_privilege('authenticated','public.feedback_reports','insert') then raise exception 'FAIL authenticated table access'; end if;
 if exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a where p.oid='public.submit_feedback(jsonb)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'FAIL unintended PUBLIC execute'; end if;
end $$;
-- Global ceiling, with synthetic rows only and no replacement of existing data.
insert into public.feedback_reports(id,report,is_test)
select 'HOS-rate-limit-fixture-'||i::text,'{}'::jsonb,true from generate_series(1,100) i;
set local role anon;
do $$ begin
 begin
  perform public.submit_feedback(current_setting('hunteros.test_report')::jsonb||'{"id":"HOS-sql-feedback-test-00000002"}');
  raise exception 'FAIL daily ceiling did not reject' using errcode='23514';
 exception when raise_exception then
  if sqlerrm<>'Feedback limit reached. Retry later.' then raise; end if;
 end;
end $$;
reset role;
rollback;
select 'PASS: anonymous submit; duplicate retry; no table read/update/delete; invalid payload rejected; authenticated table access denied; daily ceiling; all schema/test data rolled back' as result;
