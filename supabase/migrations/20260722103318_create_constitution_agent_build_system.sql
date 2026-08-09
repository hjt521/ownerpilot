create table constitution.ai_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_code text not null unique,
  name text not null unique,
  mission text not null,
  status text not null default 'draft' check (status in ('draft','active','suspended','retired')),
  authority_level text not null default 'advisory' check (authority_level in ('advisory','delegated','approval_required')),
  founder_approval_required boolean not null default true,
  escalation_policy jsonb not null default '{}'::jsonb,
  operating_policy jsonb not null default '{}'::jsonb,
  metrics_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table constitution.capabilities (
  id uuid primary key default gen_random_uuid(),
  capability_code text not null unique,
  name text not null,
  description text not null,
  risk_tier text not null default 'low' check (risk_tier in ('low','moderate','high','critical')),
  execution_mode text not null default 'autonomous' check (execution_mode in ('autonomous','supervised','approval_required','prohibited')),
  required_approval_stage text,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table constitution.ai_organization_capabilities (
  ai_organization_id uuid not null references constitution.ai_organizations(id) on delete cascade,
  capability_id uuid not null references constitution.capabilities(id) on delete cascade,
  enabled boolean not null default true,
  constraints jsonb not null default '{}'::jsonb,
  primary key (ai_organization_id, capability_id)
);

create table constitution.agent_work_items (
  id uuid primary key default gen_random_uuid(),
  work_item_code text not null unique,
  title text not null,
  description text not null,
  work_type text not null check (work_type in ('research','draft','schema_change','code_change','test','review','publish','sync','audit','remediation')),
  status text not null default 'queued' check (status in ('queued','claimed','running','blocked','awaiting_review','approved','rejected','completed','failed','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_ai_organization_id uuid references constitution.ai_organizations(id) on delete set null,
  requested_by text,
  founder_approval_required boolean not null default false,
  approval_subject_id uuid,
  source_context jsonb not null default '{}'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  result_summary text,
  result_artifacts jsonb not null default '[]'::jsonb,
  blocked_reason text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table constitution.agent_build_runs (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references constitution.agent_work_items(id) on delete cascade,
  ai_organization_id uuid not null references constitution.ai_organizations(id) on delete restrict,
  capability_id uuid references constitution.capabilities(id) on delete set null,
  run_number integer not null,
  status text not null default 'running' check (status in ('running','succeeded','failed','blocked','cancelled')),
  execution_environment text,
  model_provider text,
  model_name text,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  verification_results jsonb not null default '[]'::jsonb,
  error_detail text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (work_item_id, run_number)
);

create table constitution.agent_review_gates (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references constitution.agent_work_items(id) on delete cascade,
  gate_type text not null check (gate_type in ('constitutional','security','compliance','data_integrity','founder','release')),
  status text not null default 'pending' check (status in ('pending','passed','failed','waived')),
  reviewer_type text not null check (reviewer_type in ('ai_organization','human','automated_test')),
  reviewer_ref text,
  findings jsonb not null default '[]'::jsonb,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table constitution.agent_event_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  ai_organization_id uuid references constitution.ai_organizations(id) on delete set null,
  work_item_id uuid references constitution.agent_work_items(id) on delete set null,
  build_run_id uuid references constitution.agent_build_runs(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('debug','info','warning','error','critical')),
  message text not null,
  payload jsonb not null default '{}'::jsonb
);

create index agent_work_items_status_priority_idx on constitution.agent_work_items (status, priority, created_at);
create index agent_build_runs_work_item_idx on constitution.agent_build_runs (work_item_id, run_number desc);
create index agent_review_gates_work_item_idx on constitution.agent_review_gates (work_item_id, gate_type);
create index agent_event_log_work_item_idx on constitution.agent_event_log (work_item_id, occurred_at desc);

create trigger ai_organizations_set_updated_at
before update on constitution.ai_organizations
for each row execute function constitution.set_updated_at();

create trigger capabilities_set_updated_at
before update on constitution.capabilities
for each row execute function constitution.set_updated_at();

create trigger agent_work_items_set_updated_at
before update on constitution.agent_work_items
for each row execute function constitution.set_updated_at();

alter table constitution.ai_organizations enable row level security;
alter table constitution.capabilities enable row level security;
alter table constitution.ai_organization_capabilities enable row level security;
alter table constitution.agent_work_items enable row level security;
alter table constitution.agent_build_runs enable row level security;
alter table constitution.agent_review_gates enable row level security;
alter table constitution.agent_event_log enable row level security;

grant all privileges on constitution.ai_organizations to service_role;
grant all privileges on constitution.capabilities to service_role;
grant all privileges on constitution.ai_organization_capabilities to service_role;
grant all privileges on constitution.agent_work_items to service_role;
grant all privileges on constitution.agent_build_runs to service_role;
grant all privileges on constitution.agent_review_gates to service_role;
grant all privileges on constitution.agent_event_log to service_role;
grant usage, select on sequence constitution.agent_event_log_id_seq to service_role;

insert into constitution.ai_organizations (
  organization_code, name, mission, status, authority_level, founder_approval_required,
  escalation_policy, operating_policy, metrics_policy, metadata
) values (
  'AIO-001',
  'Constitution Steward',
  'Interpret, protect, and operationalize the OwnerPilot Constitution while coordinating AI-led building, review, and publication work.',
  'active',
  'delegated',
  true,
  jsonb_build_object(
    'escalate_when', jsonb_build_array('constitutional_conflict','critical_security_risk','irreversible_production_change','founder_reserved_matter'),
    'final_authority', 'Founder'
  ),
  jsonb_build_object(
    'may_autonomously', jsonb_build_array('research','draft','cross_reference','test','audit','prepare_migration','prepare_code_change'),
    'requires_review', jsonb_build_array('production_schema_change','public_release','security_policy_change','constitutional_adoption'),
    'must_preserve', jsonb_build_array('auditability','reversibility','least_privilege','source_traceability')
  ),
  jsonb_build_object(
    'core', jsonb_build_array('work_items_completed','review_findings','broken_references','release_blockers','mean_time_to_resolution')
  ),
  jsonb_build_object('founding_ai_organization', true)
);

insert into constitution.capabilities (capability_code, name, description, risk_tier, execution_mode, required_approval_stage)
values
  ('CAP-001','Constitutional Interpretation','Analyze proposed work against constitutional artifacts, decisions, and amendments.','moderate','supervised','steward_review'),
  ('CAP-002','Build Planning','Create implementation plans, task graphs, acceptance criteria, and dependency maps.','low','autonomous',null),
  ('CAP-003','Schema Design','Design and prepare database migrations and data models.','high','approval_required','founder_approval'),
  ('CAP-004','Code Generation','Generate application, integration, and automation code with tests.','moderate','supervised','steward_review'),
  ('CAP-005','Automated Testing','Execute test plans and record verification evidence.','low','autonomous',null),
  ('CAP-006','Release Review','Assess release readiness, constitutional alignment, and unresolved risks.','high','approval_required','founder_approval'),
  ('CAP-007','Knowledge Graph Maintenance','Create, validate, and repair constitutional cross-references.','low','autonomous',null),
  ('CAP-008','Publication Orchestration','Prepare and coordinate approved publication to GitHub, Notion, Google Docs, and website targets.','high','approval_required','publication_approval');

insert into constitution.ai_organization_capabilities (ai_organization_id, capability_id, enabled, constraints)
select o.id, c.id, true,
  case
    when c.execution_mode = 'approval_required' then jsonb_build_object('founder_approval_required', true)
    else '{}'::jsonb
  end
from constitution.ai_organizations o
cross join constitution.capabilities c
where o.organization_code = 'AIO-001';

insert into constitution.artifacts (
  canonical_id, artifact_type, title, slug, summary, status, current_version, metadata, adopted_at
) values (
  'AIO-001',
  'ai_organization',
  'Constitution Steward',
  'constitution-steward',
  'Founding AI organization responsible for constitutional interpretation, AI-led build coordination, review gates, and institutional governance support.',
  'adopted',
  '1.0.0',
  jsonb_build_object('registry_table','constitution.ai_organizations','authority','delegated','final_authority','Founder'),
  now()
) on conflict (canonical_id) do nothing;

insert into constitution.artifact_versions (
  artifact_id, version, lifecycle_state, content_markdown, change_summary, approved_by, approved_at
)
select id, '1.0.0', 'released',
  '# Constitution Steward\n\nMission: Interpret, protect, and operationalize the OwnerPilot Constitution while coordinating AI-led building, review, and publication work.\n\nFinal constitutional authority remains with the Founder. High-risk, irreversible, public, security-sensitive, and constitutional adoption actions require approval.',
  'Founding charter and operating authority.',
  'Founder',
  now()
from constitution.artifacts
where canonical_id = 'AIO-001'
on conflict (artifact_id, version) do nothing;

insert into constitution.agent_work_items (
  work_item_code, title, description, work_type, status, priority,
  assigned_ai_organization_id, requested_by, founder_approval_required,
  source_context, acceptance_criteria
)
select
  'WORK-0001',
  'Build Constitutional Operating System v1',
  'Coordinate the first AI-led implementation wave: registry population, constitutional API design, knowledge graph validation, Founder Workspace specification, and publication pipeline planning.',
  'schema_change',
  'completed',
  'high',
  id,
  'Founder',
  true,
  jsonb_build_object('origin','Founder directive: AI agents should be doing the build'),
  jsonb_build_array(
    'Create AI organization registry',
    'Create capability registry',
    'Create agent work queue and build run audit tables',
    'Create review gates',
    'Register Constitution Steward as AIO-001'
  )
from constitution.ai_organizations
where organization_code = 'AIO-001';

insert into constitution.agent_event_log (ai_organization_id, work_item_id, event_type, severity, message, payload)
select o.id, w.id, 'system_initialized', 'info',
  'Constitution Steward agent build system initialized and founding work item completed.',
  jsonb_build_object('migration','create_constitution_agent_build_system','founder_approval_model','human_on_high_risk')
from constitution.ai_organizations o
join constitution.agent_work_items w on w.work_item_code = 'WORK-0001'
where o.organization_code = 'AIO-001';