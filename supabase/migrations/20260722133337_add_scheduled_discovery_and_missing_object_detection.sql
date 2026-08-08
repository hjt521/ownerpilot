alter table constitution.twin_discovery_snapshots
  add column if not exists entities_missing integer not null default 0;

create or replace function constitution.run_supabase_discovery(p_source_code text default 'SRC-SUPABASE')
returns jsonb
language plpgsql
security definer
set search_path = constitution, public, pg_catalog
as $function$
declare
  v_source_id uuid;
  v_snapshot_id uuid;
  v_org_id uuid;
  v_run_started timestamptz := clock_timestamp();
  v_seen integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_missing integer := 0;
  v_relationships integer := 0;
  v_schema record;
  v_object record;
  v_missing_entity record;
  v_schema_entity_id uuid;
  v_entity_id uuid;
  v_existing_hash text;
  v_hash text;
  v_enterprise_id text;
begin
  if not pg_try_advisory_xact_lock(hashtext('constitution.run_supabase_discovery:' || p_source_code)) then
    return jsonb_build_object('status','skipped','reason','discovery_already_running','source_code',p_source_code);
  end if;

  select id into v_source_id
  from constitution.twin_source_systems
  where source_code = p_source_code;

  if v_source_id is null then
    raise exception 'Unknown source system: %', p_source_code;
  end if;

  select id into v_org_id
  from constitution.ai_organizations
  where organization_code = 'AIO-002';

  insert into constitution.twin_discovery_snapshots(
    source_system_id,status,started_at,source_cursor,evidence
  ) values (
    v_source_id,'running',v_run_started,'{}'::jsonb,
    jsonb_build_object('discovery_agent','AIO-002','source',p_source_code,'mode','scheduled_metadata_sync')
  ) returning id into v_snapshot_id;

  for v_schema in
    select n.nspname as schema_name
    from pg_namespace n
    where n.nspname not in ('pg_catalog','information_schema','pg_toast')
      and n.nspname not like 'pg_temp_%'
      and n.nspname not like 'pg_toast_temp_%'
    order by n.nspname
  loop
    v_seen := v_seen + 1;
    v_enterprise_id := 'ENT-DB-SCHEMA-' || upper(regexp_replace(v_schema.schema_name,'[^a-zA-Z0-9]+','-','g'));
    v_hash := md5(v_schema.schema_name);

    select id, content_hash
      into v_schema_entity_id, v_existing_hash
    from constitution.twin_entities
    where source_system_id = v_source_id
      and source_native_id = 'schema:' || v_schema.schema_name;

    if v_schema_entity_id is null then
      insert into constitution.twin_entities(
        enterprise_id,entity_type,name,status,source_system_id,source_native_id,
        canonical_uri,description,criticality,owner_ai_organization_id,
        attributes,tags,content_hash,last_seen_at
      ) values (
        v_enterprise_id,'database_schema',v_schema.schema_name,'active',v_source_id,
        'schema:' || v_schema.schema_name,'supabase://schema/' || v_schema.schema_name,
        'PostgreSQL schema discovered from Supabase metadata','normal',v_org_id,
        jsonb_build_object('schema',v_schema.schema_name),array['supabase','discovered'],v_hash,v_run_started
      ) returning id into v_schema_entity_id;

      v_created := v_created + 1;

      insert into constitution.twin_discovery_findings(
        snapshot_id,finding_type,severity,entity_id,title,evidence,status
      ) values (
        v_snapshot_id,'new_entity','info',v_schema_entity_id,
        'New database schema discovered',jsonb_build_object('schema',v_schema.schema_name),'open'
      );
    else
      update constitution.twin_entities
      set last_seen_at = v_run_started,
          status = 'active',
          retired_at = null,
          content_hash = v_hash,
          attributes = (attributes - 'missing_since' - 'missing_detection_count' - 'last_missing_snapshot_id'),
          updated_at = now()
      where id = v_schema_entity_id;

      update constitution.twin_discovery_findings
      set status = 'resolved', resolved_at = now()
      where entity_id = v_schema_entity_id
        and finding_type = 'missing_entity'
        and status in ('open','acknowledged');

      if v_existing_hash is distinct from v_hash then
        v_updated := v_updated + 1;
      end if;
    end if;

    for v_object in
      select c.relname as object_name,
             case c.relkind
               when 'r' then 'database_table'
               when 'p' then 'database_table'
               when 'v' then 'database_view'
               when 'm' then 'database_view'
               else 'database_object'
             end as entity_type,
             c.relkind::text as relkind,
             coalesce(obj_description(c.oid,'pg_class'),'') as description
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = v_schema.schema_name
        and c.relkind in ('r','p','v','m')
      order by c.relname
    loop
      v_seen := v_seen + 1;
      v_hash := md5(v_schema.schema_name || '.' || v_object.object_name || ':' || v_object.relkind || ':' || v_object.description);
      v_enterprise_id := 'ENT-DB-' ||
        case when v_object.entity_type = 'database_table' then 'TABLE-' else 'VIEW-' end ||
        upper(regexp_replace(v_schema.schema_name || '-' || v_object.object_name,'[^a-zA-Z0-9]+','-','g'));

      select id, content_hash
        into v_entity_id, v_existing_hash
      from constitution.twin_entities
      where source_system_id = v_source_id
        and source_native_id = v_object.entity_type || ':' || v_schema.schema_name || '.' || v_object.object_name;

      if v_entity_id is null then
        insert into constitution.twin_entities(
          enterprise_id,entity_type,name,status,source_system_id,source_native_id,
          canonical_uri,description,criticality,owner_ai_organization_id,
          attributes,tags,content_hash,last_seen_at
        ) values (
          v_enterprise_id,v_object.entity_type,v_schema.schema_name || '.' || v_object.object_name,
          'active',v_source_id,
          v_object.entity_type || ':' || v_schema.schema_name || '.' || v_object.object_name,
          'supabase://' || v_object.entity_type || '/' || v_schema.schema_name || '/' || v_object.object_name,
          nullif(v_object.description,''),'normal',v_org_id,
          jsonb_build_object('schema',v_schema.schema_name,'name',v_object.object_name,'relkind',v_object.relkind),
          array['supabase','discovered'],v_hash,v_run_started
        ) returning id into v_entity_id;

        v_created := v_created + 1;

        insert into constitution.twin_discovery_findings(
          snapshot_id,finding_type,severity,entity_id,title,evidence,status
        ) values (
          v_snapshot_id,'new_entity','info',v_entity_id,
          'New database object discovered',
          jsonb_build_object('schema',v_schema.schema_name,'object',v_object.object_name,'type',v_object.entity_type),
          'open'
        );
      else
        update constitution.twin_entities
        set last_seen_at = v_run_started,
            status = 'active',
            retired_at = null,
            content_hash = v_hash,
            attributes = (jsonb_build_object('schema',v_schema.schema_name,'name',v_object.object_name,'relkind',v_object.relkind)
                          || (attributes - 'missing_since' - 'missing_detection_count' - 'last_missing_snapshot_id')),
            updated_at = now()
        where id = v_entity_id;

        update constitution.twin_discovery_findings
        set status = 'resolved', resolved_at = now()
        where entity_id = v_entity_id
          and finding_type = 'missing_entity'
          and status in ('open','acknowledged');

        if v_existing_hash is distinct from v_hash then
          v_updated := v_updated + 1;
          insert into constitution.twin_discovery_findings(
            snapshot_id,finding_type,severity,entity_id,title,evidence,status
          ) values (
            v_snapshot_id,'changed_entity','low',v_entity_id,
            'Database object metadata changed',
            jsonb_build_object('schema',v_schema.schema_name,'object',v_object.object_name),
            'open'
          );
        end if;
      end if;

      insert into constitution.twin_relationships(
        source_entity_id,target_entity_id,relationship_type,directionality,
        strength,confidence,source_system_id,evidence,metadata
      ) values (
        v_schema_entity_id,v_entity_id,'contains','directed',1,1,v_source_id,
        jsonb_build_object('source','pg_catalog','snapshot_id',v_snapshot_id),'{}'::jsonb
      )
      on conflict (source_entity_id,target_entity_id,relationship_type)
      do update set valid_to = null, confidence = 1, evidence = excluded.evidence, updated_at = now();

      v_relationships := v_relationships + 1;
    end loop;
  end loop;

  for v_missing_entity in
    select e.id, e.name, e.entity_type, e.criticality,
           coalesce((e.attributes->>'missing_detection_count')::integer,0) as prior_missing_count
    from constitution.twin_entities e
    where e.source_system_id = v_source_id
      and e.tags @> array['discovered']::text[]
      and e.entity_type in ('database_schema','database_table','database_view','database_object')
      and e.last_seen_at < v_run_started
      and e.status <> 'retired'
  loop
    v_missing := v_missing + 1;

    update constitution.twin_entities
    set status = case when v_missing_entity.prior_missing_count >= 2 then 'retired' else 'degraded' end,
        retired_at = case when v_missing_entity.prior_missing_count >= 2 then now() else null end,
        attributes = attributes || jsonb_build_object(
          'missing_since',coalesce(attributes->'missing_since',to_jsonb(v_run_started)),
          'missing_detection_count',v_missing_entity.prior_missing_count + 1,
          'last_missing_snapshot_id',v_snapshot_id
        ),
        updated_at = now()
    where id = v_missing_entity.id;

    if not exists (
      select 1 from constitution.twin_discovery_findings f
      where f.entity_id = v_missing_entity.id
        and f.finding_type = 'missing_entity'
        and f.status in ('open','acknowledged')
    ) then
      insert into constitution.twin_discovery_findings(
        snapshot_id,finding_type,severity,entity_id,title,detail,evidence,status
      ) values (
        v_snapshot_id,'missing_entity',
        case when v_missing_entity.criticality in ('high','critical') then 'high' else 'moderate' end,
        v_missing_entity.id,'Previously discovered database object is missing',
        v_missing_entity.name || ' was not observed during the current discovery pass.',
        jsonb_build_object('entity_name',v_missing_entity.name,'entity_type',v_missing_entity.entity_type,'missing_count',v_missing_entity.prior_missing_count + 1),
        'open'
      );
    end if;
  end loop;

  update constitution.twin_relationships r
  set valid_to = coalesce(r.valid_to,v_run_started), updated_at = now()
  where r.source_system_id = v_source_id
    and r.valid_to is null
    and exists (
      select 1 from constitution.twin_entities e
      where e.id in (r.source_entity_id,r.target_entity_id)
        and e.status in ('degraded','retired')
    );

  update constitution.twin_source_systems
  set last_discovered_at = now(), status = 'connected', updated_at = now()
  where id = v_source_id;

  update constitution.twin_discovery_snapshots
  set status = 'succeeded',
      completed_at = now(),
      entities_seen = v_seen,
      entities_created = v_created,
      entities_updated = v_updated,
      entities_missing = v_missing,
      relationships_created = v_relationships,
      evidence = evidence || jsonb_build_object(
        'completed_by','AIO-002',
        'mode','scheduled_metadata_sync',
        'missing_object_policy','degrade_then_retire_after_three_consecutive_misses'
      )
  where id = v_snapshot_id;

  return jsonb_build_object(
    'status','succeeded',
    'snapshot_id',v_snapshot_id,
    'entities_seen',v_seen,
    'entities_created',v_created,
    'entities_updated',v_updated,
    'entities_missing',v_missing,
    'relationships_processed',v_relationships
  );
exception when others then
  if v_snapshot_id is not null then
    update constitution.twin_discovery_snapshots
    set status = 'failed', completed_at = now(), error_detail = sqlerrm
    where id = v_snapshot_id;
  end if;
  raise;
end;
$function$;

revoke all on function constitution.run_supabase_discovery(text) from public;
grant execute on function constitution.run_supabase_discovery(text) to service_role;

insert into constitution.twin_discovery_rules(
  rule_code,name,description,source_type,entity_type,enabled,risk_tier,rule_config
) values (
  'DISC-MISSING-001',
  'Missing database object detection',
  'Detects previously discovered Supabase schemas, tables, and views that are absent from a later discovery pass.',
  'database','database_object',true,'moderate',
  jsonb_build_object('first_miss_status','degraded','retire_after_consecutive_misses',3,'resolve_on_reappearance',true)
)
on conflict (rule_code) do update
set name = excluded.name,
    description = excluded.description,
    enabled = excluded.enabled,
    risk_tier = excluded.risk_tier,
    rule_config = excluded.rule_config,
    updated_at = now();

do $block$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'ownerpilot-digital-twin-supabase-discovery'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'ownerpilot-digital-twin-supabase-discovery',
    '17 * * * *',
    $cron$select constitution.run_supabase_discovery('SRC-SUPABASE');$cron$
  );
end;
$block$;

insert into constitution.agent_work_items(
  work_item_code,title,description,work_type,status,priority,
  assigned_ai_organization_id,requested_by,founder_approval_required,
  source_context,acceptance_criteria,result_summary,result_artifacts,
  started_at,completed_at
)
select
  'WORK-DISCOVERY-002',
  'Enable scheduled Digital Twin synchronization and missing-object detection',
  'Run Supabase discovery hourly, prevent overlapping executions, detect missing objects, degrade on first misses, retire after three consecutive misses, and resolve findings when objects reappear.',
  'sync','completed','high',o.id,'Founder',false,
  jsonb_build_object('source','SRC-SUPABASE','schedule','17 * * * *'),
  jsonb_build_array(
    'Hourly discovery job exists',
    'Concurrent runs are skipped safely',
    'Missing objects create evidence-backed findings',
    'Objects are degraded before retirement',
    'Reappearing objects are restored and findings resolved'
  ),
  'Scheduled synchronization and missing-object lifecycle detection implemented.',
  jsonb_build_array(jsonb_build_object('cron_job','ownerpilot-digital-twin-supabase-discovery','schedule','17 * * * *')),
  now(),now()
from constitution.ai_organizations o
where o.organization_code = 'AIO-002'
on conflict (work_item_code) do update
set status = 'completed',
    result_summary = excluded.result_summary,
    result_artifacts = excluded.result_artifacts,
    completed_at = now(),
    updated_at = now();