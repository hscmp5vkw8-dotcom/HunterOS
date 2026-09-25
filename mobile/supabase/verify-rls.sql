-- Disposable transaction: never leaves users or workspace rows behind.
begin;
insert into auth.users(id) values ('559af640-3bdf-47c3-afbd-ce231056ade1'),('28da8cdd-66ca-4aec-bb7b-b85c354dd126');
set local role authenticated;
select set_config('request.jwt.claim.sub','559af640-3bdf-47c3-afbd-ce231056ade1',true);
insert into public.user_workspaces(user_id,workspace) values ('559af640-3bdf-47c3-afbd-ce231056ade1','{"test":"A"}');
do $$ begin
 if (select count(*) from public.user_workspaces) <> 1 then raise exception 'FAIL owner read'; end if;
 begin
  insert into public.user_workspaces(user_id,workspace) values ('28da8cdd-66ca-4aec-bb7b-b85c354dd126','{"test":"forged"}');
  raise exception 'FAIL cross-account insert allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.user_workspaces set user_id='28da8cdd-66ca-4aec-bb7b-b85c354dd126';
  raise exception 'FAIL ownership reassignment allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','28da8cdd-66ca-4aec-bb7b-b85c354dd126',true);
do $$ declare affected integer; begin
 if (select count(*) from public.user_workspaces) <> 0 then raise exception 'FAIL cross-account read'; end if;
 update public.user_workspaces set workspace='{"test":"changed"}';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'FAIL cross-account update'; end if;
end $$;
insert into public.user_workspaces(user_id,workspace) values ('28da8cdd-66ca-4aec-bb7b-b85c354dd126','{"test":"B"}');
update public.user_workspaces set workspace='{"test":"B updated"}';
do $$ begin
 if (select workspace->>'test' from public.user_workspaces) <> 'B updated' then raise exception 'FAIL owner update'; end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.user_workspaces','select') or has_table_privilege('anon','public.user_workspaces','insert') or has_table_privilege('anon','public.user_workspaces','update') then raise exception 'FAIL anonymous access'; end if;
 if has_table_privilege('authenticated','public.trip_members','insert') or has_table_privilege('authenticated','public.scan_submissions','select') or has_table_privilege('authenticated','public.products','update') then raise exception 'FAIL reserved table access'; end if;
end $$;
rollback;
select 'PASS: own read/write; cross-account read/update/insert denied; reassignment denied; anonymous denied; reserved tables private; test users and data rolled back' as result;
