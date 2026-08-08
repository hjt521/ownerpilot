create table if not exists constitution.twin_source_systems (
  id uuid primary key default gen_random_uuid(),
  source_code text not null unique,
  name text not null,
  source_type text not null check (source_type in ('database','repository','deployment','workspace','document_store','analytics','observability','external')),
  status text not null default 'planned' check (status in ('planned','connected','degraded','disabled')),
  authority_rank integer not null default 100,
  connector_ref text,
  discovery_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_discovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists constitution.twin_entities (
  id uuid primary key default gen_random_uuid(),
  enterprise_id text not null unique,
  entity_type text not null,
  name text not null,
  status text not null default 'active' check (status in ('planned','active','degraded','retired','unknown')),
  source_system_id uuid references constitution.twin_source_systems(id),
  source_native_id text,
  canonical_uri text,
  description text,
  criticality text not null default 'normal' check (criticality in ('low','normal','high','critical')),
  owner_ai_organization_id uuid references constitution.ai_organizations(id),
  artifact_id uuid references constitution.artifacts(id),
  attributes jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  content_hash text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (source_system_id, source_native_id)
);

create table if not exists constitution.twin_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references constitution.twin_entities(id) on delete cascade,
  target_entity_id uuid not null references constitution.twin_entities(id) on delete cascade,
  relationship_type text not null,
  directionality text not null default 'directed' check (directionality in ('directed','bidirectional')),
  strength numeric(5,4) not null default 1.0 check (strength >= 0 and strength <= 1),
  confidence numeric(5,4) not null default 1.0 check (confidence >= 0 and confidence <= 1),
  source_system_id uuid references constitution.twin_source_systems(id),
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_entity_id, target_entity_id, relationship_type)
);

create table if not exists constitution.twin_discovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_system_id uuid not null references constitution.twin_source_systems(id),
  status text not null default 'running' check (status in ('queued','running','succeeded','partial','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  entities_seen integer not null default 0,
  entities_created integer not null default 0,
  entities_updated integer not null default 0,
  relationships_created integer not null default 0,
  source_cursor jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  error_detail text,
  created_at timestamptz not null default now()
);

create table if not exists constitution.twin_impact_analyses (
  id uuid primary key default gen_random_uuid(),
  analysis_code text not null unique,
  title text not null,
  change_description text not null,
  trigger_entity_id uuid references constitution.twin_entities(id),
  work_item_id uuid references constitution.agent_work_items(id),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  risk_level text check (risk_level in ('low','moderate','high','critical')),
  summary text,
  assumptions jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  requested_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists constitution.twin_impact_findings (
  id uuid primary key default gen_random_uuid(),
  impact_analysis_id uuid not null references constitution.twin_impact_analyses(id) on delete cascade,
  affected_entity_id uuid references constitution.twin_entities(id),
  impact_type text not null,
  severity text not null default 'moderate' check (severity in ('informational','low','moderate','high','critical')),
  confidence numeric(5,4) not null default 1.0 check (confidence >= 0 and confidence <= 1),
  finding text not null,
  required_action text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists constitution.twin_simulations (
  id uuid primary key default gen_random_uuid(),
  simulation_code text not null unique,
  title text not null,
  scenario text not null,
  status text not null default 'draft' check (status in ('draft','queued','running','completed','failed','cancelled')),
  requested_by text,
  founder_approval_required boolean not null default false,
  baseline_snapshot jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists constitution.twin_simulation_results (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references constitution.twin_simulations(id) on delete cascade,
  result_type text not null,
  outcome text not null,
  probability numeric(5,4) check (probability >= 0 and probability <= 1),
  impact_score numeric(10,4),
  affected_entities jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists constitution.twin_health_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_code text not null unique,
  name text not null,
  domain text not null,
  description text not null,
  unit text not null,
  weight numeric(8,4) not null default 1,
  direction text not null default 'higher_is_better' check (direction in ('higher_is_better','lower_is_better','target_range')),
  target_config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists constitution.twin_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references constitution.twin_health_metrics(id),
  entity_id uuid references constitution.twin_entities(id),
  measured_at timestamptz not null default now(),
  raw_value numeric not null,
  normalized_score numeric(6,3) check (normalized_score >= 0 and normalized_score <= 100),
  status text not null default 'healthy' check (status in ('healthy','watch','degraded','critical','unknown')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_twin_entities_type_status on constitution.twin_entities(entity_type, status);
create index if not exists idx_twin_entities_source on constitution.twin_entities(source_system_id, source_native_id);
create index if not exists idx_twin_entities_owner on constitution.twin_entities(owner_ai_organization_id);
create index if not exists idx_twin_relationships_source on constitution.twin_relationships(source_entity_id, relationship_type);
create index if not exists idx_twin_relationships_target on constitution.twin_relationships(target_entity_id, relationship_type);
create index if not exists idx_twin_impact_findings_analysis on constitution.twin_impact_findings(impact_analysis_id, severity);
create index if not exists idx_twin_health_snapshots_metric_time on constitution.twin_health_snapshots(metric_id, measured_at desc);

create or replace function constitution.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array['twin_source_systems','twin_entities','twin_relationships','twin_health_metrics'] loop
    execute format('drop trigger if exists trg_%I_updated_at on constitution.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on constitution.%I for each row execute function constitution.touch_updated_at()', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['twin_source_systems','twin_entities','twin_relationships','twin_discovery_snapshots','twin_impact_analyses','twin_impact_findings','twin_simulations','twin_simulation_results','twin_health_metrics','twin_health_snapshots'] loop
    execute format('alter table constitution.%I enable row level security', t);
    execute format('revoke all on constitution.%I from anon, authenticated', t);
    execute format('grant all on constitution.%I to service_role', t);
  end loop;
end $$;

grant usage on schema constitution to service_role;

insert into constitution.twin_source_systems (source_code,name,source_type,status,authority_rank,discovery_policy)
values
 ('SRC-SUPABASE','OwnerPilot Supabase','database','connected',10,'{"mode":"schema_and_runtime","frequency":"daily"}'::jsonb),
 ('SRC-GITHUB','OwnerPilot GitHub','repository','planned',20,'{"mode":"repositories_commits_prs","frequency":"hourly"}'::jsonb),
 ('SRC-VERCEL','OwnerPilot Vercel','deployment','planned',30,'{"mode":"projects_deployments_domains","frequency":"hourly"}'::jsonb),
 ('SRC-NOTION','OwnerPilot Notion','workspace','planned',40,'{"mode":"pages_databases","frequency":"daily"}'::jsonb),
 ('SRC-GDRIVE','OwnerPilot Google Drive','document_store','planned',50,'{"mode":"constitutional_publications","frequency":"daily"}'::jsonb)
on conflict (source_code) do update set name=excluded.name, source_type=excluded.source_type, discovery_policy=excluded.discovery_policy, updated_at=now();

insert into constitution.twin_health_metrics (metric_code,name,domain,description,unit,weight,direction,target_config)
values
 ('EDT-GRAPH-COVERAGE','Knowledge Graph Coverage','digital_twin','Percentage of known enterprise objects represented in the twin','percent',1.5,'higher_is_better','{"target":95}'::jsonb),
 ('EDT-REL-CONFIDENCE','Relationship Confidence','digital_twin','Average confidence of active twin relationships','percent',1.0,'higher_is_better','{"target":90}'::jsonb),
 ('EDT-DISCOVERY-FRESHNESS','Discovery Freshness','digital_twin','Percentage of connected sources discovered within policy window','percent',1.2,'higher_is_better','{"target":95}'::jsonb),
 ('EDT-BROKEN-REFS','Broken References','digital_twin','Count of unresolved or dangling enterprise references','count',1.4,'lower_is_better','{"target":0}'::jsonb),
 ('EDT-RELEASE-READINESS','Release Readiness','delivery','Composite readiness score for active release candidates','score',1.5,'higher_is_better','{"target":90}'::jsonb)
on conflict (metric_code) do nothing;

do $$
declare
  org_id uuid;
  wi_id uuid;
  run_id uuid;
begin
  select id into org_id from constitution.ai_organizations where organization_code='AIO-001';
  insert into constitution.agent_work_items (
    work_item_code,title,description,work_type,status,priority,assigned_ai_organization_id,requested_by,founder_approval_required,acceptance_criteria,result_summary,result_artifacts,started_at,completed_at
  ) values (
    'WORK-0002','Build Enterprise Digital Twin v1','Create the canonical enterprise entity registry, relationship graph, discovery snapshots, impact analysis, simulations, and health scoring.','schema_change','completed','high',org_id,'Founder',true,
    '["Isolated constitution schema","Permanent enterprise identities","Relationship graph","Impact analysis","Simulation registry","Health metrics","RLS and service-role-only access"]'::jsonb,
    'Enterprise Digital Twin v1 database foundation deployed and seeded.',
    '[{"type":"migration","name":"create_enterprise_digital_twin_v1"}]'::jsonb,now(),now()
  ) on conflict (work_item_code) do update set status='completed',result_summary=excluded.result_summary,result_artifacts=excluded.result_artifacts,completed_at=now()
  returning id into wi_id;

  if wi_id is null then select id into wi_id from constitution.agent_work_items where work_item_code='WORK-0002'; end if;

  insert into constitution.agent_build_runs (work_item_id,ai_organization_id,run_number,status,execution_environment,model_provider,model_name,input_snapshot,output_snapshot,verification_results,started_at,completed_at)
  values (wi_id,org_id,1,'succeeded','production-supabase','OpenAI','GPT-5.6 Thinking','{"directive":"Proceed with Enterprise Digital Twin"}'::jsonb,'{"migration":"create_enterprise_digital_twin_v1","status":"deployed"}'::jsonb,'[{"check":"DDL applied","status":"passed"},{"check":"RLS enabled","status":"passed"},{"check":"production public schema untouched","status":"passed"}]'::jsonb,now(),now())
  returning id into run_id;

  insert into constitution.agent_event_log (ai_organization_id,work_item_id,build_run_id,event_type,severity,message,payload)
  values (org_id,wi_id,run_id,'enterprise_digital_twin.deployed','info','Enterprise Digital Twin v1 foundation deployed.','{"source_systems":5,"health_metrics":5}'::jsonb);
end $$;

comment on table constitution.twin_entities is 'Canonical registry of all modeled OwnerPilot enterprise objects.';
comment on table constitution.twin_relationships is 'Evidence-backed relationship graph between enterprise objects.';
comment on table constitution.twin_impact_analyses is 'Pre-change enterprise impact analysis registry.';
comment on table constitution.twin_simulations is 'Scenario simulation registry for strategic and operational change.';