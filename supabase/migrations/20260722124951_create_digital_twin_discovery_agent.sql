create table if not exists constitution.twin_discovery_findings (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references constitution.twin_discovery_snapshots(id) on delete cascade,
  finding_type text not null check (finding_type in ('new_entity','changed_entity','missing_entity','new_relationship','drift','policy_gap','error')),
  severity text not null default 'info' check (severity in ('info','low','moderate','high','critical')),
  entity_id uuid references constitution.twin_entities(id) on delete set null,
  title text not null,
  detail text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists twin_discovery_findings_snapshot_idx on constitution.twin_discovery_findings(snapshot_id);
create index if not exists twin_discovery_findings_status_severity_idx on constitution.twin_discovery_findings(status,severity);

alter table constitution.twin_discovery_findings enable row level security;

create table if not exists constitution.twin_discovery_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  name text not null,
  description text not null,
  source_type text not null,
  entity_type text not null,
  enabled boolean not null default true,
  risk_tier text not null default 'low' check (risk_tier in ('low','moderate','high','critical')),
  rule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table constitution.twin_discovery_rules enable row level security;

insert into constitution.ai_organizations (
  organization_code,name,mission,status,authority_level,founder_approval_required,
  escalation_policy,operating_policy,metrics_policy,metadata
) values (
  'AIO-002','Digital Twin Discovery Organization',
  'Continuously discover, normalize, validate, and synchronize enterprise reality into the Enterprise Digital Twin.',
  'active','delegated',false,
  '{"escalate_on":["constitutional_drift","critical_security_gap","production_system_missing"],"default_recipient":"AIO-001"}'::jsonb,
  '{"write_scope":"constitution twin tables only","production_changes":"prohibited","evidence_required":true,"retirement_policy":"mark missing before retire"}'::jsonb,
  '{"metrics":["coverage","freshness","relationship_confidence","drift_count","sync_latency"]}'::jsonb,
  '{"designation":"Digital Twin Discovery Agent","division":"Enterprise Intelligence"}'::jsonb
) on conflict (organization_code) do update set
  name=excluded.name, mission=excluded.mission, status=excluded.status,
  authority_level=excluded.authority_level, escalation_policy=excluded.escalation_policy,
  operating_policy=excluded.operating_policy, metrics_policy=excluded.metrics_policy,
  metadata=excluded.metadata, updated_at=now();

insert into constitution.capabilities (
  capability_code,name,description,risk_tier,execution_mode,required_approval_stage,input_schema,output_schema,metadata
) values
('CAP-DISCOVER-SUPABASE','Discover Supabase Metadata','Discover schemas, tables, views, functions, and relationships from Supabase metadata.','moderate','autonomous',null,
 '{"type":"object","properties":{"source_code":{"type":"string"}}}'::jsonb,
 '{"type":"object","properties":{"snapshot_id":{"type":"string"},"entities_seen":{"type":"integer"},"entities_created":{"type":"integer"},"entities_updated":{"type":"integer"}}}'::jsonb,
 '{"owner":"AIO-002","evidence_required":true}'::jsonb),
('CAP-DETECT-DRIFT','Detect Enterprise Drift','Compare discovered source state with the Enterprise Digital Twin and record drift findings.','moderate','supervised','constitutional_review',
 '{"type":"object"}'::jsonb,'{"type":"object"}'::jsonb,
 '{"owner":"AIO-002"}'::jsonb)
on conflict (capability_code) do update set name=excluded.name,description=excluded.description,risk_tier=excluded.risk_tier,execution_mode=excluded.execution_mode,required_approval_stage=excluded.required_approval_stage,metadata=excluded.metadata,updated_at=now();

insert into constitution.ai_organization_capabilities (ai_organization_id,capability_id)
select o.id,c.id from constitution.ai_organizations o cross join constitution.capabilities c
where o.organization_code='AIO-002' and c.capability_code in ('CAP-DISCOVER-SUPABASE','CAP-DETECT-DRIFT')
on conflict do nothing;

insert into constitution.twin_discovery_rules (rule_code,name,description,source_type,entity_type,risk_tier,rule_config)
values
('DISC-SB-SCHEMA','Supabase Schema Discovery','Register non-system PostgreSQL schemas.','database','database_schema','low','{"exclude":["pg_catalog","information_schema","pg_toast"]}'::jsonb),
('DISC-SB-TABLE','Supabase Table Discovery','Register base tables and partitioned tables.','database','database_table','moderate','{}'::jsonb),
('DISC-SB-VIEW','Supabase View Discovery','Register views and materialized views.','database','database_view','low','{}'::jsonb),
('DISC-SB-FUNCTION','Supabase Function Discovery','Register PostgreSQL functions.','database','database_function','moderate','{}'::jsonb)
on conflict (rule_code) do update set name=excluded.name,description=excluded.description,enabled=true,risk_tier=excluded.risk_tier,rule_config=excluded.rule_config,updated_at=now();

create or replace function constitution.run_supabase_discovery(p_source_code text default 'SUPABASE')
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
  if v_source_id is null then
    raise exception 'Unknown source system: %', p_source_code;
  end if;
  select id into v_org_id from constitution.ai_organizations where organization_code='AIO-002';

  insert into constitution.twin_discovery_snapshots(source_system_id,status,started_at,source_cursor,evidence)
  values(v_source_id,'running',now(),'{}'::jsonb,jsonb_build_object('discovery_agent','AIO-002','source',p_source_code))
  returning id into v_snapshot_id;

  for v_schema in
    select n.nspname as schema_name
    from pg_namespace n
    where n.nspname not in ('pg_catalog','information_schema','pg_toast')
      and n.nspname not like 'pg_temp_%' and n.nspname not like 'pg_toast_temp_%'
    order by n.nspname
  loop
    v_seen := v_seen + 1;
    v_enterprise_id := 'ENT-DB-SCHEMA-' || upper(regexp_replace(v_schema.schema_name,'[^a-zA-Z0-9]+','-','g'));
    v_hash := md5(v_schema.schema_name);
    select id,content_hash into v_schema_entity_id,v_existing_hash
      from constitution.twin_entities where source_system_id=v_source_id and source_native_id='schema:'||v_schema.schema_name;
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
             c.relkind,
             coalesce(obj_description(c.oid,'pg_class'),'') as description
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=v_schema.schema_name and c.relkind in ('r','p','v','m')
      order by c.relname
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
  if v_snapshot_id is not null then
    update constitution.twin_discovery_snapshots set status='failed',completed_at=now(),error_detail=sqlerrm where id=v_snapshot_id;
  end if;
  raise;
end;
$$;

revoke all on function constitution.run_supabase_discovery(text) from public;

insert into constitution.agent_work_items(work_item_code,title,description,work_type,status,priority,assigned_ai_organization_id,requested_by,founder_approval_required,source_context,acceptance_criteria,result_artifacts)
select 'WORK-DISCOVERY-001','Initialize Supabase Digital Twin Discovery','Run the first governed metadata discovery pass and establish the baseline Enterprise Digital Twin snapshot.','sync','queued','high',o.id,'Founder',false,
 '{"source":"Supabase","project":"Ownerpilot.ai","purpose":"MVCE baseline discovery"}'::jsonb,
 '{"criteria":["snapshot succeeds","schemas discovered","tables and views registered","contains relationships created","evidence recorded"]}'::jsonb,
 '[]'::jsonb
from constitution.ai_organizations o where o.organization_code='AIO-002'
on conflict (work_item_code) do nothing;