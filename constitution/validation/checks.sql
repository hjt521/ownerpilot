-- constitution/validation/checks.sql
-- Executable constitutional validation checks (Phase 2). Each query is READ-ONLY, idempotent, and returns
-- offenders/status as JSON so a runner (CI or scheduled watch) can alert on any non-empty / mismatched result.
-- No check writes to the database. Schema: constitution.
-- Convention: a check "passes" when it returns an empty offender set (or matches the committed baseline).

-- ============================================================================
-- CHECK 0 — genesis_checksum : the overall constitutional checksum (drift anchor).
--   Compare .overall_sha256 against constitution/baseline/constitution_checksum.sha256 (OVERALL line).
--   Mismatch => the live schema diverged from the committed baseline (Check 1 / Check 12).
-- ============================================================================
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
h as (select
  encode(extensions.digest(convert_to(tables_s,'UTF8'),'sha256'),'hex') t, encode(extensions.digest(convert_to(fns_s,'UTF8'),'sha256'),'hex') f,
  encode(extensions.digest(convert_to(trg_s,'UTF8'),'sha256'),'hex') g, encode(extensions.digest(convert_to(idx_s,'UTF8'),'sha256'),'hex') i from sig)
select json_build_object('check','genesis_checksum','tables_sha256',t,'functions_sha256',f,'triggers_sha256',g,'indexes_sha256',i,
  'overall_sha256', encode(extensions.digest(convert_to(t||f||g||i,'UTF8'),'sha256'),'hex')) from h;

-- ============================================================================
-- CHECK 2 — trigger_coverage : updated_at columns MUST have a maintaining trigger. (offenders => fail)
-- ============================================================================
select json_build_object('check','trigger_coverage','offenders', coalesce(json_agg(t.relname order by t.relname),'[]'))
from (
  select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
  where n.nspname='constitution' and c.relkind='r' and a.attname='updated_at' and not a.attisdropped
  except
  select distinct c.relname from pg_trigger tr join pg_class c on c.oid=tr.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='constitution' and not tr.tgisinternal
) t;

-- ============================================================================
-- CHECK 3 — rls_coverage : every table RLS-enabled; flag any table RLS-off OR any permissive true policy. (offenders => fail)
-- ============================================================================
select json_build_object('check','rls_coverage',
  'rls_disabled', (select coalesce(json_agg(c.relname order by c.relname),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='constitution' and c.relkind='r' and not c.relrowsecurity),
  'permissive_true_policies', (select coalesce(json_agg(tablename||':'||policyname),'[]') from pg_policies where schemaname='constitution' and (coalesce(qual,'')='true' or coalesce(with_check,'')='true')));

-- ============================================================================
-- CHECK 4 — security_definer_review : SD functions must be on the ADR-005 allow-list AND have a pinned search_path. (offenders => fail)
--   Allow-list lives in the ADR; the runner diffs this list against adr/adr_log.md ADR-005.
-- ============================================================================
select json_build_object('check','security_definer_review',
  'definer_functions', (select coalesce(json_agg(p.proname order by p.proname),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='constitution' and p.prosecdef),
  'missing_search_path_pin', (select coalesce(json_agg(p.proname order by p.proname),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='constitution' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) x where x like 'search_path=%'))));

-- ============================================================================
-- CHECK 5 — search_path_review : ALL constitution functions (definer or not) should pin search_path. (offenders => fail)
-- ============================================================================
select json_build_object('check','search_path_review','offenders', coalesce(json_agg(p.proname order by p.proname),'[]'))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='constitution' and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) x where x like 'search_path=%'));

-- ============================================================================
-- CHECK 6 — fk_index_coverage : every FK column should have a supporting index. (offenders => warn)
-- ============================================================================
select json_build_object('check','fk_index_coverage','offenders', coalesce(json_agg(distinct con.conrelid::regclass::text || '(' || a.attname || ')'),'[]'))
from pg_constraint con join pg_namespace n on n.oid=con.connamespace
join unnest(con.conkey) with ordinality k(attnum,ord) on true
join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum
where n.nspname='constitution' and con.contype='f'
  and not exists (select 1 from pg_index i where i.indrelid=con.conrelid and (i.indkey::int2[])[0]=k.attnum);

-- ============================================================================
-- CHECK 7 — broken_foreign_keys : FKs whose validity is not confirmed. (offenders => fail)
-- ============================================================================
select json_build_object('check','broken_foreign_keys','offenders', coalesce(json_agg(conname),'[]'))
from pg_constraint con join pg_namespace n on n.oid=con.connamespace
where n.nspname='constitution' and con.contype='f' and not con.convalidated;

-- ============================================================================
-- CHECK 8 — missing_comments : tables without COMMENT ON TABLE. (offenders => warn; enforce on NEW tables)
-- ============================================================================
select json_build_object('check','missing_comments','tables_without_comment', coalesce(json_agg(c.relname order by c.relname),'[]'))
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='constitution' and c.relkind='r' and obj_description(c.oid,'pg_class') is null;

-- CHECKS 9-14 (dependency graph integrity, migration ordering, architecture consistency, baseline checksum
-- mismatch, documentation mismatch, ADR mismatch) are runner-side comparisons between the repo (baseline
-- manifest, migration filenames, module_architecture.md table list, adr_log.md SD allow-list) and the live
-- introspection above. They are implemented in constitution/validation/run_checks.(sql|ts) — see ci_cd_design.md.
