-- constitution/validation/run_checks.sql
-- Consolidated Constitutional Health Report. READ-ONLY. Returns ONE json row: the genesis checksum + every
-- introspection check with a pass/fail/warn status. The runner (run_checks.ts) executes this, then adds the
-- repo-side comparisons (baseline checksum match, doc/ADR sync, migration ordering) and exits 0/1.
-- Runnable as-is via psql / Supabase SQL. Schema: constitution.

with tbl as (
  select c.relname,
    (select string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(ad.adbin,ad.adrelid),''), ',' order by a.attnum)
       from pg_attribute a left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
       where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) cols,
    (select string_agg(pg_get_constraintdef(con.oid), ',' order by pg_get_constraintdef(con.oid)) from pg_constraint con where con.conrelid=c.oid) cons
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and c.relkind='r'
),
sig as (select
  (select string_agg(relname||'|'||coalesce(cols,'')||'|'||coalesce(cons,''), e'\n' order by relname) from tbl) tables_s,
  (select string_agg(pg_get_functiondef(p.oid), e'\n' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='constitution') fns_s,
  (select string_agg(pg_get_triggerdef(t.oid), e'\n' order by c.relname, t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and not t.tgisinternal) trg_s,
  (select string_agg(pg_get_indexdef(i.indexrelid), e'\n' order by pg_get_indexdef(i.indexrelid)) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution') idx_s),
gh as (select
  encode(extensions.digest(convert_to(tables_s,'UTF8'),'sha256'),'hex') t, encode(extensions.digest(convert_to(fns_s,'UTF8'),'sha256'),'hex') f,
  encode(extensions.digest(convert_to(trg_s,'UTF8'),'sha256'),'hex') g, encode(extensions.digest(convert_to(idx_s,'UTF8'),'sha256'),'hex') i from sig),
c2 as (select coalesce(json_agg(x order by x),'[]'::json) v from (
  select c.relname x from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
  where n.nspname='constitution' and c.relkind='r' and a.attname='updated_at' and not a.attisdropped
  except select distinct c.relname from pg_trigger tr join pg_class c on c.oid=tr.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and not tr.tgisinternal) z),
c3 as (select coalesce(json_agg(c.relname),'[]'::json) v from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and c.relkind='r' and not c.relrowsecurity),
c3p as (select coalesce(json_agg(tablename||':'||policyname),'[]'::json) v from pg_policies where schemaname='constitution' and (coalesce(qual,'')='true' or coalesce(with_check,'')='true')),
c4 as (select coalesce(json_agg(p.proname order by p.proname),'[]'::json) v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='constitution' and p.prosecdef),
c5 as (select coalesce(json_agg(p.proname order by p.proname),'[]'::json) v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='constitution' and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) y where y like 'search_path=%'))),
c7 as (select coalesce(json_agg(conname),'[]'::json) v from pg_constraint con join pg_namespace n on n.oid=con.connamespace where n.nspname='constitution' and con.contype='f' and not con.convalidated),
c8 as (select coalesce(json_agg(c.relname order by c.relname),'[]'::json) v from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and c.relkind='r' and obj_description(c.oid,'pg_class') is null)
select json_build_object(
  'report','constitution_health','generated_at', now(),
  'genesis', json_build_object('tables_sha256',gh.t,'functions_sha256',gh.f,'triggers_sha256',gh.g,'indexes_sha256',gh.i,
     'overall_sha256', encode(extensions.digest(convert_to(gh.t||gh.f||gh.g||gh.i,'UTF8'),'sha256'),'hex')),
  'checks', json_build_array(
    json_build_object('id',2,'check','trigger_coverage','status', case when json_array_length(c2.v)=0 then 'pass' else 'fail' end,'offenders',c2.v),
    json_build_object('id',3,'check','rls_coverage','status', case when json_array_length(c3.v)=0 and json_array_length(c3p.v)=0 then 'pass' else 'fail' end,'rls_disabled',c3.v,'permissive_true_policies',c3p.v),
    json_build_object('id',4,'check','security_definer_review','status','review','definer_functions',c4.v),
    json_build_object('id',5,'check','search_path_review','status', case when json_array_length(c5.v)=0 then 'pass' else 'fail' end,'unpinned',c5.v),
    json_build_object('id',7,'check','broken_foreign_keys','status', case when json_array_length(c7.v)=0 then 'pass' else 'fail' end,'offenders',c7.v),
    json_build_object('id',8,'check','missing_comments','status', case when json_array_length(c8.v)=0 then 'pass' else 'warn' end,'tables_without_comment',c8.v)
  )
) as constitution_health
from gh, c2, c3, c3p, c4, c5, c7, c8;