-- 007_cliff_runs.sql
-- Slice 4b of Supabase audit-durability per broker ruling 2026-06-21
--   (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.6).
-- cliff_runs is the EIGHTH audit table. Every audit_cliff invocation (scheduled
-- dry-run AND broker-run live cliff) writes one cliff_runs row per table it
-- processes. Same INSERT-only / immutable posture as the other audit tables;
-- broker/meta access only (no app role), service_role + the SECURITY DEFINER
-- cliff function write it. 7-year retention class; the cliff eventually processes
-- its own log (no special-casing). No gate flip.

create table if not exists public.cliff_runs (
  -- audit_record base (same as the other audit tables; lets the cliff process
  -- cliff_runs itself via decided_at / legal_hold / soft_deleted_at).
  id                 uuid        primary key default gen_random_uuid(),
  decided_at         timestamptz not null default now(),
  retention_class    text        not null default '7yr',
  legal_hold         boolean     not null default false,
  legal_hold_ref     text,
  soft_deleted_at    timestamptz,
  -- cliff-run fields (ruling §2.6 table)
  run_at             timestamptz not null default now(),
  dry_run            boolean     not null,
  table_name         text        not null,
  would_delete_count integer,                       -- populated when dry_run = true
  deleted_count      integer,                       -- populated when dry_run = false
  held_skip_count    integer,                       -- rows skipped because legal_hold = true
  grace_skip_count   integer,                       -- rows past cliff but still within grace
  error_count        integer     not null default 0,
  error_summary      text,                          -- sanitized class summary if error_count > 0
  triggered_by       text        not null,          -- 'pg_cron' | 'cli' | 'cli_dry'
  cli_reason         text                           -- --reason value when triggered_by like 'cli%'
);

create index if not exists cliff_runs_run_at_idx     on public.cliff_runs (run_at);
create index if not exists cliff_runs_decided_at_idx  on public.cliff_runs (decided_at);
create index if not exists cliff_runs_table_name_idx  on public.cliff_runs (table_name);
create index if not exists cliff_runs_legal_hold_idx  on public.cliff_runs (legal_hold) where legal_hold = true;

-- Legal-hold delete refusal, same trigger function as the other audit tables.
drop trigger if exists cliff_runs_no_delete_held on public.cliff_runs;
create trigger cliff_runs_no_delete_held
  before delete on public.cliff_runs
  for each row execute function public.refuse_delete_held();

-- Broker/meta posture: RLS on, no app access at all. service_role bypasses RLS
-- and is the broker read path; the SECURITY DEFINER cliff function writes rows as
-- its owner (also bypasses RLS). No anon/authenticated grant, no policy.
alter table public.cliff_runs enable row level security;
revoke all on public.cliff_runs from anon, authenticated;
