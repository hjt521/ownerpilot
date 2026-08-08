create schema if not exists constitution;

revoke all on schema constitution from public, anon, authenticated;
grant usage on schema constitution to service_role;

create table constitution.artifacts (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  artifact_type text not null check (artifact_type in ('book','article','section','doctrine','enterprise_architecture','ontology_term','policy','capability','ai_organization','knowledge_object','amendment','founders_letter')),
  title text not null,
  slug text not null unique,
  summary text,
  status text not null default 'draft' check (status in ('draft','in_review','approved','adopted','superseded','retired')),
  current_version text not null default '0.1.0',
  source_path text,
  github_url text,
  notion_url text,
  google_doc_url text,
  public_url text,
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  adopted_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table constitution.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references constitution.artifacts(id) on delete cascade,
  version text not null,
  lifecycle_state text not null default 'draft' check (lifecycle_state in ('draft','review','approved','released','withdrawn')),
  content_markdown text,
  content_hash text,
  change_summary text,
  github_commit_sha text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (artifact_id, version)
);

create table constitution.cross_references (
  id uuid primary key default gen_random_uuid(),
  source_artifact_id uuid not null references constitution.artifacts(id) on delete cascade,
  target_artifact_id uuid not null references constitution.artifacts(id) on delete cascade,
  relationship text not null check (relationship in ('references','supports','depends_on','implements','governs','amends','supersedes','derived_from','related_to')),
  citation_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_artifact_id, target_artifact_id, relationship)
);

create table constitution.amendments (
  id uuid primary key default gen_random_uuid(),
  amendment_number integer not null unique,
  title text not null,
  status text not null default 'proposed' check (status in ('proposed','in_review','ratified','rejected','withdrawn','implemented')),
  rationale text,
  proposal_markdown text,
  proposed_by text,
  proposed_at timestamptz not null default now(),
  ratified_by text,
  ratified_at timestamptz,
  effective_at timestamptz,
  release_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create table constitution.amendment_impacts (
  amendment_id uuid not null references constitution.amendments(id) on delete cascade,
  artifact_id uuid not null references constitution.artifacts(id) on delete cascade,
  impact_type text not null check (impact_type in ('adds','modifies','supersedes','retires','clarifies')),
  impact_summary text,
  primary key (amendment_id, artifact_id, impact_type)
);

create table constitution.releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  status text not null default 'planned' check (status in ('planned','building','candidate','published','withdrawn')),
  release_notes text,
  git_tag text,
  github_release_url text,
  publication_url text,
  content_hash text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table constitution.amendments
  add constraint amendments_release_id_fkey foreign key (release_id) references constitution.releases(id) on delete set null;

create table constitution.release_artifacts (
  release_id uuid not null references constitution.releases(id) on delete cascade,
  artifact_version_id uuid not null references constitution.artifact_versions(id) on delete restrict,
  publication_order integer,
  primary key (release_id, artifact_version_id)
);

create table constitution.governance_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_id text not null unique,
  title text not null,
  decision_type text not null check (decision_type in ('adoption','interpretation','exception','architecture','publication','security','stewardship')),
  status text not null default 'recorded' check (status in ('proposed','recorded','approved','reversed','superseded')),
  decision_text text not null,
  rationale text,
  decided_by text,
  decided_at timestamptz not null default now(),
  supersedes_decision_id uuid references constitution.governance_decisions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table constitution.approvals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('artifact_version','amendment','release','decision')),
  subject_id uuid not null,
  approval_stage text not null check (approval_stage in ('author_review','steward_review','founder_approval','publication_approval')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  actor text,
  notes text,
  acted_at timestamptz,
  created_at timestamptz not null default now()
);

create table constitution.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('github_to_supabase','supabase_to_notion','supabase_to_google_docs','supabase_to_website','full_publish')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  source_ref text,
  target_ref text,
  release_id uuid references constitution.releases(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  error_detail text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index artifacts_type_status_idx on constitution.artifacts (artifact_type, status);
create index artifact_versions_artifact_created_idx on constitution.artifact_versions (artifact_id, created_at desc);
create index cross_references_source_idx on constitution.cross_references (source_artifact_id);
create index cross_references_target_idx on constitution.cross_references (target_artifact_id);
create index approvals_subject_idx on constitution.approvals (subject_type, subject_id);
create index sync_jobs_status_created_idx on constitution.sync_jobs (status, created_at);

create or replace function constitution.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = constitution, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger artifacts_set_updated_at
before update on constitution.artifacts
for each row execute function constitution.set_updated_at();

alter table constitution.artifacts enable row level security;
alter table constitution.artifact_versions enable row level security;
alter table constitution.cross_references enable row level security;
alter table constitution.amendments enable row level security;
alter table constitution.amendment_impacts enable row level security;
alter table constitution.releases enable row level security;
alter table constitution.release_artifacts enable row level security;
alter table constitution.governance_decisions enable row level security;
alter table constitution.approvals enable row level security;
alter table constitution.sync_jobs enable row level security;

grant all privileges on all tables in schema constitution to service_role;
grant usage, select on all sequences in schema constitution to service_role;
alter default privileges in schema constitution grant all on tables to service_role;
alter default privileges in schema constitution grant usage, select on sequences to service_role;

comment on schema constitution is 'OwnerPilot Constitutional Platform canonical registry and governance data. Isolated from customer-facing public schema.';