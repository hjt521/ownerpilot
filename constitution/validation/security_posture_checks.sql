-- constitution/validation/security_posture_checks.sql
-- Deterministic security-posture checks (Phase II P1). READ-ONLY. Extends the validation runner (run_checks) —
-- not a parallel framework. Each returns offenders as JSON; empty = pass. No writes, no production changes.
-- Encodes the CA-001 P1 evidence so drift from the audited posture is caught in CI / the weekly watch.

-- SEC-1 — constitution deny-by-default: anon/authenticated must have NO schema USAGE. (non-empty => fail)
select json_build_object('check','sec1_constitution_schema_usage','offenders',
  coalesce(json_agg(r) filter (where has_schema_privilege(r,'constitution','USAGE')),'[]'))
from (values ('anon'),('authenticated')) v(r);

-- SEC-2 — no anon/authenticated table grants on constitution. (offenders => fail)
select json_build_object('check','sec2_constitution_anon_grants','offenders',
  coalesce(json_agg(grantee||' '||privilege_type||' '||table_name),'[]'))
from information_schema.role_table_grants where table_schema='constitution' and grantee in ('anon','authenticated');

-- SEC-3 — no anon/authenticated EXECUTE on constitution functions. (offenders => fail)
select json_build_object('check','sec3_constitution_fn_execute','offenders',
  coalesce(json_agg(grantee||' '||routine_name),'[]'))
from information_schema.role_routine_grants where routine_schema='constitution' and grantee in ('anon','authenticated') and privilege_type='EXECUTE';

-- SEC-4 — every SECURITY DEFINER function in constitution pins search_path. (offenders => fail)
select json_build_object('check','sec4_secdef_search_path','offenders',
  coalesce(json_agg(p.proname),'[]'))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='constitution' and p.prosecdef
  and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) x where x like 'search_path=%'));

-- SEC-5 — bypass-RLS actors must be exactly the standard Supabase set (no unexpected new bypass role). (offenders => fail)
select json_build_object('check','sec5_unexpected_bypass_rls','offenders',
  coalesce(json_agg(rolname),'[]'))
from pg_roles where rolbypassrls
  and rolname not in ('postgres','service_role','supabase_admin','supabase_etl_admin','supabase_read_only_user','supabase_replication_admin','supabase_storage_admin');

-- SEC-6 — append-only audit walls: NO SELECT/UPDATE/DELETE policy for anon/authenticated on the 5 walls. (offenders => fail)
select json_build_object('check','sec6_audit_wall_read_mutate_policies','offenders',
  coalesce(json_agg(tablename||':'||policyname||':'||cmd),'[]'))
from pg_policies
where schemaname='public' and tablename in ('classifier_audit_log','geocode_audit_log','geocode_dispositions','manual_review_queue','rate_limit_events')
  and cmd in ('SELECT','UPDATE','DELETE') and ('anon' = any(roles) or 'authenticated' = any(roles));

-- SEC-7 — append-only audit walls: NO SELECT/UPDATE/DELETE grant to anon/authenticated on the 5 walls. (offenders => fail)
select json_build_object('check','sec7_audit_wall_read_mutate_grants','offenders',
  coalesce(json_agg(grantee||' '||privilege_type||' '||table_name),'[]'))
from information_schema.role_table_grants
where table_schema='public' and table_name in ('classifier_audit_log','geocode_audit_log','geocode_dispositions','manual_review_queue','rate_limit_events')
  and grantee in ('anon','authenticated') and privilege_type in ('SELECT','UPDATE','DELETE','TRUNCATE');

-- SEC-8 — append-only audit walls: the INSERT-only policy must be PRESENT on all 5 (structure intact). (missing => fail)
select json_build_object('check','sec8_audit_wall_insert_policy_present','missing',
  coalesce(json_agg(t),'[]'))
from (values ('classifier_audit_log'),('geocode_audit_log'),('geocode_dispositions'),('manual_review_queue'),('rate_limit_events')) v(t)
where not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=v.t and p.cmd='INSERT' and 'anon'=any(p.roles));

-- SEC-9 — pg_net scope guard: alert if any USER-schema (public/constitution) function newly depends on net.*.
--   Baseline: only pg_net internals + extensions.grant_pg_net_access reference net.* today. (new callers => review)
select json_build_object('check','sec9_pg_net_new_callers','new_callers',
  coalesce(json_agg(n.nspname||'.'||p.proname),'[]'))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (p.prosrc ~ '\mnet\.' or p.prosrc ilike '%net.http%')
  and n.nspname in ('public','constitution');

-- Production-vs-repository posture drift is covered by the genesis checksum in run_checks.sql (check 0/12).
-- These SEC-* checks are additive and READ-ONLY; wire them into run_checks + the weekly watch (ci_cd_design.md).
