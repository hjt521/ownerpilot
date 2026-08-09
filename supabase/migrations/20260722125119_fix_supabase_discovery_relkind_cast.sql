create or replace function constitution.run_supabase_discovery(p_source_code text default 'SRC-SUPABASE')
returns jsonb
language plpgsql
security definer
set search_path = constitution, public, pg_catalog
as $$
declare
  v_source_id uuid;
  v_snapshot_id uuid;
  v_org_id uuid;
  v_seen integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_relationships integer := 0;
  v_schema record;
  v_object record;
  v_schema_entity_id uuid;
  v_entity_id uuid;
  v_existing_hash text;
  v_hash text;
  v_enterprise_id text;
begin
  select id into v_source_id from constitution.twin_source_systems where source_code=p_source_code;
  if v_source_id is null then raise exception 'Unknown source system: %', p_source_code; end if;
  select id into v_org_id from constitution.ai_organizations where organization_code='AIO-002';
  insert into constitution.twin_discovery_snapshots(source_system_id,status,started_at,source_cursor,evidence)
  values(v_source_id,'running',now(),'{}'::jsonb,jsonb_build_object('discovery_agent','AIO-002','source',p_source_code)) returning id into v_snapshot_id;

  for v_schema in
    select n.nspname as schema_name from pg_namespace n
    where n.nspname not in ('pg_catalog','information_schema','pg_toast')
      and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
    order by n.nspname
  loop
    v_seen := v_seen + 1;
    v_enterprise_id := 'ENT-DB-SCHEMA-' || upper(regexp_replace(v_schema.schema_name,'[^a-zA-Z0-9]+','-','g'));
    v_hash := md5(v_schema.schema_name);
    select id,content_hash into v_schema_entity_id,v_existing_hash from constitution.twin_entities
      where source_system_id=v_source_id and source_native_id='schema:'||v_schema.schema_name;
    if v_schema_entity_id is null then
      insert into constitution.twin_entities(enterprise_id,entity_type,name,status,source_system_id,source_native_id,canonical_uri,description,criticality,owner_ai_organization_id,attributes,tags,content_hash)
      values(v_enterprise_id,'database_schema',v_schema.schema_name,'active',v_source_id,'schema:'||v_schema.schema_name,'supabase://schema/'||v_schema.schema_name,'PostgreSQL schema discovered from Supabase metadata','normal',v_org_id,jsonb_build_object('schema',v_schema.schema_name),array['supabase','discovered'],v_hash)
      returning id into v_schema_entity_id;
      v_created := v_created + 1;
      insert into constitution.twin_discovery_findings(snapshot_id,finding_type,severity,entity_id,title,evidence)
      values(v_snapshot_id,'new_entity','info',v_schema_entity_id,'New database schema discovered',jsonb_build_object('schema',v_schema.schema_name));
    else
      update constitution.twin_entities set last_seen_at=now(),status='active',updated_at=now() where id=v_schema_entity_id;
      if v_existing_hash is distinct from v_hash then v_updated := v_updated + 1; end if;
    end if;

    for v_object in
      select c.relname as object_name,
             case c.relkind when 'r' then 'database_table' when 'p' then 'database_table' when 'v' then 'database_view' when 'm' then 'database_view' else 'database_object' end as entity_type,
             c.relkind::text as relkind,
             coalesce(obj_description(c.oid,'pg_class'),'') as description
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=v_schema.schema_name and c.relkind in ('r','p','v','m') order by c.relname
    loop
      v_seen := v_seen + 1;
      v_hash := md5(v_schema.schema_name||'.'||v_object.object_name||':'||v_object.relkind||':'||v_object.description);
      v_enterprise_id := 'ENT-DB-' || case when v_object.entity_type='database_table' then 'TABLE-' else 'VIEW-' end || upper(regexp_replace(v_schema.schema_name||'-'||v_object.object_name,'[^a-zA-Z0-9]+','-','g'));
      select id,content_hash into v_entity_id,v_existing_hash from constitution.twin_entities
       where source_system_id=v_source_id and source_native_id=v_object.entity_type||':'||v_schema.schema_name||'.'||v_object.object_name;
      if v_entity_id is null then
        insert into constitution.twin_entities(enterprise_id,entity_type,name,status,source_system_id,source_native_id,canonical_uri,description,criticality,owner_ai_organization_id,attributes,tags,content_hash)
        values(v_enterprise_id,v_object.entity_type,v_schema.schema_name||'.'||v_object.object_name,'active',v_source_id,v_object.entity_type||':'||v_schema.schema_name||'.'||v_object.object_name,
        'supabase://'||v_object.entity_type||'/'||v_schema.schema_name||'/'||v_object.object_name,nullif(v_object.description,''),'normal',v_org_id,
        jsonb_build_object('schema',v_schema.schema_name,'name',v_object.object_name,'relkind',v_object.relkind),array['supabase','discovered'],v_hash)
        returning id into v_entity_id;
        v_created := v_created + 1;
        insert into constitution.twin_discovery_findings(snapshot_id,finding_type,severity,entity_id,title,evidence)
        values(v_snapshot_id,'new_entity','info',v_entity_id,'New database object discovered',jsonb_build_object('schema',v_schema.schema_name,'object',v_object.object_name,'type',v_object.entity_type));
      else
        update constitution.twin_entities set last_seen_at=now(),status='active',content_hash=v_hash,attributes=jsonb_build_object('schema',v_schema.schema_name,'name',v_object.object_name,'relkind',v_object.relkind),updated_at=now() where id=v_entity_id;
        if v_existing_hash is distinct from v_hash then
          v_updated := v_updated + 1;
          insert into constitution.twin_discovery_findings(snapshot_id,finding_type,severity,entity_id,title,evidence)
          values(v_snapshot_id,'changed_entity','low',v_entity_id,'Database object metadata changed',jsonb_build_object('schema',v_schema.schema_name,'object',v_object.object_name));
        end if;
      end if;
      insert into constitution.twin_relationships(source_entity_id,target_entity_id,relationship_type,directionality,strength,confidence,source_system_id,evidence,metadata)
      values(v_schema_entity_id,v_entity_id,'contains','directed',1,1,v_source_id,jsonb_build_object('source','pg_catalog'),'{}'::jsonb)
      on conflict (source_entity_id,target_entity_id,relationship_type) do update set valid_to=null,confidence=1,updated_at=now();
      v_relationships := v_relationships + 1;
    end loop;
  end loop;

  update constitution.twin_source_systems set last_discovered_at=now(),status='connected',updated_at=now() where id=v_source_id;
  update constitution.twin_discovery_snapshots set status='succeeded',completed_at=now(),entities_seen=v_seen,entities_created=v_created,entities_updated=v_updated,relationships_created=v_relationships,
    evidence=evidence||jsonb_build_object('completed_by','AIO-002','mode','database_metadata') where id=v_snapshot_id;
  return jsonb_build_object('snapshot_id',v_snapshot_id,'entities_seen',v_seen,'entities_created',v_created,'entities_updated',v_updated,'relationships_processed',v_relationships);
exception when others then
  if v_snapshot_id is not null then update constitution.twin_discovery_snapshots set status='failed',completed_at=now(),error_detail=sqlerrm where id=v_snapshot_id; end if;
  raise;
end;
$$;
revoke all on function constitution.run_supabase_discovery(text) from public;