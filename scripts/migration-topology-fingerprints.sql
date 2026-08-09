-- Deterministic schema-topology fingerprints for the historical migration prototype.
-- Read-only. Object OIDs, row data, timestamps, and sequence values are intentionally excluded.

with fingerprint_items(category, value) as (
  select 'public.relations', concat_ws('|', c.relkind, c.relname, c.relrowsecurity::text, c.relforcerowsecurity::text)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p','v','m')

  union all
  select 'public.columns', concat_ws('|', c.relname, a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull::text, coalesce(pg_get_expr(ad.adbin,ad.adrelid),''))
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
  where n.nspname='public' and c.relkind in ('r','p','v','m') and a.attnum>0 and not a.attisdropped

  union all
  select 'public.constraints', concat_ws('|', c.relname, con.conname, con.contype::text, pg_get_constraintdef(con.oid,true))
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'

  union all
  select 'public.indexes', concat_ws('|', t.relname, i.relname, pg_get_indexdef(i.oid))
  from pg_index x join pg_class t on t.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public'

  union all
  select 'public.policies', concat_ws('|', schemaname, tablename, policyname, permissive, roles::text, cmd, coalesce(qual,''), coalesce(with_check,''))
  from pg_policies where schemaname='public'

  union all
  select 'public.functions', concat_ws('|', p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef::text, p.provolatile::text, coalesce(array_to_string(p.proconfig,','),''), pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'

  union all
  select 'public.triggers', concat_ws('|', c.relname, t.tgname, pg_get_triggerdef(t.oid,true))
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and not t.tgisinternal

  union all
  select 'public.table_grants', concat_ws('|', table_name, grantee, privilege_type, is_grantable)
  from information_schema.table_privileges where table_schema='public'

  union all
  select 'constitution.relations', concat_ws('|', c.relkind, c.relname, c.relrowsecurity::text, c.relforcerowsecurity::text)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='constitution' and c.relkind in ('r','p','v','m','S')

  union all
  select 'constitution.columns', concat_ws('|', c.relname, a.attnum::text, a.attname, pg_catalog.format_type(a.atttypid,a.atttypmod), a.attnotnull::text, coalesce(pg_get_expr(ad.adbin,ad.adrelid),''))
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
  where n.nspname='constitution' and c.relkind in ('r','p','v','m','S') and a.attnum>0 and not a.attisdropped

  union all
  select 'constitution.constraints', concat_ws('|', c.relname, con.conname, con.contype::text, pg_get_constraintdef(con.oid,true))
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='constitution'

  union all
  select 'constitution.indexes', concat_ws('|', t.relname, i.relname, pg_get_indexdef(i.oid))
  from pg_index x join pg_class t on t.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='constitution'

  union all
  select 'constitution.functions', concat_ws('|', p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef::text, p.provolatile::text, coalesce(array_to_string(p.proconfig,','),''), pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='constitution' and p.prokind='f'

  union all
  select 'constitution.triggers', concat_ws('|', c.relname, t.tgname, pg_get_triggerdef(t.oid,true))
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='constitution' and not t.tgisinternal

  union all
  select 'constitution.table_grants', concat_ws('|', table_name, grantee, privilege_type, is_grantable)
  from information_schema.table_privileges where table_schema='constitution'

  union all
  select 'constitution.routine_grants', concat_ws('|', routine_name, grantee, privilege_type, is_grantable)
  from information_schema.routine_privileges where routine_schema='constitution'

  union all
  select 'constitution.schema_grants', concat_ws('|', r.role_name,
    has_schema_privilege(r.role_name,'constitution','USAGE')::text,
    has_schema_privilege(r.role_name,'constitution','CREATE')::text)
  from (values ('anon'),('authenticated'),('service_role'),('postgres')) as r(role_name)
  where exists(select 1 from pg_roles p where p.rolname=r.role_name)

  union all
  select 'cron.jobs', concat_ws('|', jobname, schedule, command, database, username, active::text)
  from cron.job
)
select category, count(*) as item_count,
       md5(coalesce(string_agg(value,E'\n' order by value),'')) as md5
from fingerprint_items
group by category
order by category;
