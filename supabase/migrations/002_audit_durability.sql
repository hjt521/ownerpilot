-- OwnerPilot AI — Audit durability schema
-- Migration: 002_audit_durability
--
-- Implements the Supabase audit-durability workstream (the geocodeAuditDurabilityWired
-- gate condition) governed by:
--   * la_geocode_audit_supabase_schema_design_broker_ruling_response_2026-06-20.md
--   * classifier_persistence_lock_conflict_broker_ruling_response_2026-06-20.md
--
-- classifier_audit_log built per broker ruling 2026-06-20 (classifier_persistence_lock_conflict_broker_ruling_response_2026-06-20.md).
-- 2026-06-06 persistence lock NOT amended; classifier input_text NOT captured; input_decision_hash (HMAC-SHA-256)
-- substitutes for dedup/integrity. Field list = §1.2 of the 2026-06-20 ruling. CI guard per §2.4 live.
--
-- Design notes:
--   * SHARED BASE: every audit table carries the audit_record base columns
--     (id, decided_at, retention_class, legal_hold, legal_hold_ref, soft_deleted_at).
--     Postgres table inheritance is intentionally NOT used; columns are repeated
--     for clarity and so RLS / indexes attach per-table.
--   * ENUM-ISH FIELDS ARE text, NOT Postgres enums. An audit insert must never fail
--     because the app emitted a value the DB enum had not learned yet. Integrity is
--     traded for write-durability deliberately, because losing an audit row is worse
--     than storing an unexpected string. (Differs from 001_initial_schema, by design.)
--   * INSERT-ONLY APP ROLE: Supabase grants anon/authenticated read+write on new
--     public tables by default, so we REVOKE ALL then GRANT INSERT. RLS is also
--     enabled with an insert-only policy and NO select policy — so even if a future
--     grant slips through, the app reads back zero rows. This is the load-bearing
--     "app can append, cannot read" property. Broker read is out-of-band via the
--     service_role key (bypasses RLS) in the export tooling, logged to audit_exports.

-- ===========================================================================
-- 1. geocode_audit_log
--    Mirrors lib/jurisdiction/geocode/resolveLaAddressV2.ts GeocodeAuditRecord
--    field-for-field, PLUS decision_input_hash. Geocode keeps RAW input_address
--    (street addresses are not chat content; no persistence lock attaches —
--    conflict ruling §4). 7-year retention from decided_at.
-- ===========================================================================
create table public.geocode_audit_log (
  -- audit_record base
  id                                   uuid        primary key default gen_random_uuid(),
  decided_at                           timestamptz not null default now(),
  retention_class                      text        not null default '7yr',
  legal_hold                           boolean     not null default false,
  legal_hold_ref                       text,
  soft_deleted_at                      timestamptz,
  -- GeocodeAuditRecord mirror
  input_address                        text        not null,
  locality                             text,
  administrative_area_level_1          text,
  validation_granularity               text,
  formatted_address                    text,
  latitude                             double precision,
  longitude                            double precision,
  has_inferred_components              boolean     not null,
  has_replaced_components              boolean     not null,
  possible_next_action                 text,
  county                               jsonb,
  county_query_returned_zero_features  boolean,
  county_zip_in_la_zip_set             boolean,
  zimas                                jsonb,
  disposition                          text        not null,
  review_reason                        text,
  branch                               text        not null,
  -- dedup / integrity (SHA-256 of <lowercased-trimmed input_address>|<chain_head_sha>, computed app-side)
  decision_input_hash                  text        not null
);

create index geocode_audit_log_decided_at_idx     on public.geocode_audit_log (decided_at);
create index geocode_audit_log_input_hash_idx      on public.geocode_audit_log (decision_input_hash);
create index geocode_audit_log_disposition_idx     on public.geocode_audit_log (disposition);
create index geocode_audit_log_legal_hold_idx      on public.geocode_audit_log (legal_hold) where legal_hold = true;

-- ===========================================================================
-- 2. manual_review_queue
--    Persistent backing for the ManualReviewQueue contract (geocodeTypes.ts).
--    Links to the geocode audit row; broker-triaged. App INSERTs; broker triage
--    (status updates) happens via service_role / admin tooling, not the app.
--    The aging surface is the view manual_review_queue_aging (pending > 7 days).
-- ===========================================================================
create table public.manual_review_queue (
  id                uuid        primary key default gen_random_uuid(),
  decided_at        timestamptz not null default now(),
  retention_class   text        not null default '7yr',
  legal_hold        boolean     not null default false,
  legal_hold_ref    text,
  soft_deleted_at   timestamptz,
  -- link to the audit row that produced this review item
  geocode_audit_id  uuid        references public.geocode_audit_log (id) on delete restrict,
  -- ManualReviewItem mirror (raw input_address — geocode posture)
  input_address     text        not null,
  review_reason     text        not null,
  observed          jsonb,
  enqueued_at       timestamptz not null default now(),
  -- broker triage
  status            text        not null default 'pending',
  triaged_at        timestamptz,
  resolution        text
);

create index manual_review_queue_status_idx    on public.manual_review_queue (status);
create index manual_review_queue_enqueued_idx  on public.manual_review_queue (enqueued_at);
create index manual_review_queue_audit_idx     on public.manual_review_queue (geocode_audit_id);
create index manual_review_queue_legal_hold_idx on public.manual_review_queue (legal_hold) where legal_hold = true;

create view public.manual_review_queue_aging as
  select id, geocode_audit_id, input_address, review_reason, enqueued_at,
         (now() - enqueued_at) as age
    from public.manual_review_queue
   where status = 'pending'
     and soft_deleted_at is null
     and enqueued_at < now() - interval '7 days';

-- ===========================================================================
-- 3. classifier_audit_log
--    Built per the classifier persistence-lock conflict ruling (2026-06-20),
--    Option C. RAW input_text is NEVER captured — see CI guard
--    scripts/ci/verify_classifier_audit_no_input_text.mjs. Field list = §1.2.
--    7-year retention.
-- ===========================================================================
create table public.classifier_audit_log (
  id                   uuid        primary key default gen_random_uuid(),
  decided_at           timestamptz not null default now(),
  retention_class      text        not null default '7yr',
  legal_hold           boolean     not null default false,
  legal_hold_ref       text,
  soft_deleted_at      timestamptz,
  -- §1.2 field list
  model_id             text        not null,
  model_call_id        text,
  verdict              text        not null,    -- 'ok' | 'unsure' | 'block' | 'other'
  score_or_flags       jsonb,                   -- structured classifier output; NO input text
  decision_latency_ms  integer,
  chain_head_sha       text,
  input_decision_hash  text,                    -- HMAC-SHA-256, non-reversible (ruling §1.3)
  side                 text        not null,    -- 'input' | 'output'
  ok                   boolean     not null,
  unsure               boolean     not null default false,
  reason               text                     -- MUST NOT contain input text (enforced app-side)
);

create index classifier_audit_log_decided_at_idx  on public.classifier_audit_log (decided_at);
create index classifier_audit_log_input_hash_idx   on public.classifier_audit_log (input_decision_hash);
create index classifier_audit_log_side_idx         on public.classifier_audit_log (side);
create index classifier_audit_log_legal_hold_idx   on public.classifier_audit_log (legal_hold) where legal_hold = true;

-- ===========================================================================
-- 4. rate_limit_events
--    TRIGGERS ONLY (a rate-limit block decision), not every check. Counters stay
--    on Upstash (ownerpilot-ratelimit). 7-year retention. No user content.
-- ===========================================================================
create table public.rate_limit_events (
  id                          uuid        primary key default gen_random_uuid(),
  decided_at                  timestamptz not null default now(),
  retention_class             text        not null default '7yr',
  legal_hold                  boolean     not null default false,
  legal_hold_ref              text,
  soft_deleted_at             timestamptz,
  -- event fields
  session_triplet             text        not null,
  limit_class                 text        not null,
  limit_threshold             integer,
  attempted_action            text,
  block_decision_latency_ms   integer
);

create index rate_limit_events_decided_at_idx  on public.rate_limit_events (decided_at);
create index rate_limit_events_session_idx      on public.rate_limit_events (session_triplet);
create index rate_limit_events_legal_hold_idx   on public.rate_limit_events (legal_hold) where legal_hold = true;

-- ===========================================================================
-- 5. audit_deletion_incidents
--    Meta-audit: records when the retention cliff would have deleted a held row
--    (and skipped it), or other deletion-policy violations. 7-year retention.
--    Written by the cliff function (security definer) — NOT by the app.
-- ===========================================================================
create table public.audit_deletion_incidents (
  id                uuid        primary key default gen_random_uuid(),
  decided_at        timestamptz not null default now(),
  retention_class   text        not null default '7yr',
  legal_hold        boolean     not null default false,
  legal_hold_ref    text,
  soft_deleted_at   timestamptz,
  -- incident fields
  incident_type     text        not null,
  target_table      text        not null,
  target_row_id     uuid,
  detail            jsonb
);

create index audit_deletion_incidents_decided_at_idx on public.audit_deletion_incidents (decided_at);
create index audit_deletion_incidents_legal_hold_idx  on public.audit_deletion_incidents (legal_hold) where legal_hold = true;

-- ===========================================================================
-- 6. audit_access_grants
--    Per-incident broker read grants (time + scope bounded). expires_at is
--    mandatory and capped at 30 days from granted_at. 7-year retention.
--    Written by broker tooling (service_role) — NOT by the app.
-- ===========================================================================
create table public.audit_access_grants (
  id                   uuid        primary key default gen_random_uuid(),
  decided_at           timestamptz not null default now(),
  retention_class      text        not null default '7yr',
  legal_hold           boolean     not null default false,
  legal_hold_ref       text,
  soft_deleted_at      timestamptz,
  -- grant fields
  granted_at           timestamptz not null default now(),
  granted_to           text        not null,
  scope                text        not null,
  justification        text        not null,
  expires_at           timestamptz not null,
  revoked_at           timestamptz,
  actually_accessed_at timestamptz,
  constraint audit_access_grants_expiry_cap
    check (expires_at > granted_at and expires_at <= granted_at + interval '30 days')
);

create index audit_access_grants_decided_at_idx on public.audit_access_grants (decided_at);
create index audit_access_grants_expires_idx     on public.audit_access_grants (expires_at);
create index audit_access_grants_legal_hold_idx  on public.audit_access_grants (legal_hold) where legal_hold = true;

-- ===========================================================================
-- 7. audit_exports
--    Export log. default-deny on held rows; --include-held requires
--    --justification. 7-year retention. Written by broker tooling (service_role).
-- ===========================================================================
create table public.audit_exports (
  id                uuid        primary key default gen_random_uuid(),
  decided_at        timestamptz not null default now(),
  retention_class   text        not null default '7yr',
  legal_hold        boolean     not null default false,
  legal_hold_ref    text,
  soft_deleted_at   timestamptz,
  -- export fields
  exported_at       timestamptz not null default now(),
  exported_by       text        not null,
  export_scope      text        not null,
  included_held     boolean     not null default false,
  justification     text,
  row_count         integer,
  archive_path      text,
  constraint audit_exports_held_requires_justification
    check (included_held = false or justification is not null)
);

create index audit_exports_decided_at_idx on public.audit_exports (decided_at);
create index audit_exports_legal_hold_idx  on public.audit_exports (legal_hold) where legal_hold = true;

-- ===========================================================================
-- Legal-hold delete trigger
--   Refuses to DELETE any row where legal_hold = true. DB-level, structural —
--   not a code-review checklist. Attached to all seven audit tables.
-- ===========================================================================
create or replace function public.refuse_delete_held()
returns trigger
language plpgsql
as $$
begin
  if old.legal_hold then
    raise exception 'legal_hold: row % on table % is under legal hold and cannot be deleted',
      old.id, tg_table_name
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger geocode_audit_log_no_delete_held
  before delete on public.geocode_audit_log
  for each row execute function public.refuse_delete_held();

create trigger manual_review_queue_no_delete_held
  before delete on public.manual_review_queue
  for each row execute function public.refuse_delete_held();

create trigger classifier_audit_log_no_delete_held
  before delete on public.classifier_audit_log
  for each row execute function public.refuse_delete_held();

create trigger rate_limit_events_no_delete_held
  before delete on public.rate_limit_events
  for each row execute function public.refuse_delete_held();

create trigger audit_deletion_incidents_no_delete_held
  before delete on public.audit_deletion_incidents
  for each row execute function public.refuse_delete_held();

create trigger audit_access_grants_no_delete_held
  before delete on public.audit_access_grants
  for each row execute function public.refuse_delete_held();

create trigger audit_exports_no_delete_held
  before delete on public.audit_exports
  for each row execute function public.refuse_delete_held();

-- ===========================================================================
-- Retention cliff function
--   * Marks soft_deleted_at at the 7-year cliff (skips legal_hold).
--   * Hard-deletes after a 90-day soft-delete grace (skips legal_hold).
--   * Logs held-past-cliff rows to audit_deletion_incidents.
--   Defaults to p_dry_run = true: running it changes NOTHING until called with
--   false. Scheduling (pg_cron / external runner) is Slice 4, not here.
-- ===========================================================================
create or replace function public.audit_cliff(p_dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tables text[] := array[
    'geocode_audit_log', 'manual_review_queue', 'classifier_audit_log',
    'rate_limit_events', 'audit_deletion_incidents', 'audit_access_grants',
    'audit_exports'
  ];
  v_table       text;
  v_soft_marked bigint := 0;
  v_hard_deleted bigint := 0;
  v_held_past   bigint := 0;
  v_n           bigint;
begin
  foreach v_table in array v_tables loop
    -- 1. soft-delete at the 7-year cliff (skip held, skip already-marked)
    if p_dry_run then
      execute format(
        'select count(*) from public.%I where decided_at < now() - interval ''7 years'' and soft_deleted_at is null and legal_hold = false',
        v_table) into v_n;
    else
      execute format(
        'update public.%I set soft_deleted_at = now() where decided_at < now() - interval ''7 years'' and soft_deleted_at is null and legal_hold = false',
        v_table);
      get diagnostics v_n = row_count;
    end if;
    v_soft_marked := v_soft_marked + v_n;

    -- 2. hard-delete after the 90-day grace (skip held)
    if p_dry_run then
      execute format(
        'select count(*) from public.%I where soft_deleted_at is not null and soft_deleted_at < now() - interval ''90 days'' and legal_hold = false',
        v_table) into v_n;
    else
      execute format(
        'delete from public.%I where soft_deleted_at is not null and soft_deleted_at < now() - interval ''90 days'' and legal_hold = false',
        v_table);
      get diagnostics v_n = row_count;
    end if;
    v_hard_deleted := v_hard_deleted + v_n;

    -- 3. log held rows past the cliff (would-delete-but-held)
    execute format(
      'select count(*) from public.%I where decided_at < now() - interval ''7 years'' and legal_hold = true',
      v_table) into v_n;
    if v_n > 0 and not p_dry_run then
      insert into public.audit_deletion_incidents (incident_type, target_table, detail)
      values ('cliff_held_skip', v_table, jsonb_build_object('held_rows_past_cliff', v_n));
    end if;
    v_held_past := v_held_past + v_n;
  end loop;

  return jsonb_build_object(
    'dry_run', p_dry_run,
    'soft_marked', v_soft_marked,
    'hard_deleted', v_hard_deleted,
    'held_past_cliff', v_held_past
  );
end;
$$;

-- ===========================================================================
-- Row Level Security + privileges
--   App-written tables (anon/authenticated may INSERT, may NOT read):
--     geocode_audit_log, manual_review_queue, classifier_audit_log, rate_limit_events
--   Broker/meta tables (no app access at all; service_role only):
--     audit_deletion_incidents, audit_access_grants, audit_exports
--   service_role bypasses RLS and is the broker read/export path.
-- ===========================================================================

-- App-written: revoke defaults, grant INSERT only, RLS insert-only policy
alter table public.geocode_audit_log    enable row level security;
alter table public.manual_review_queue  enable row level security;
alter table public.classifier_audit_log enable row level security;
alter table public.rate_limit_events     enable row level security;

revoke all on public.geocode_audit_log    from anon, authenticated;
revoke all on public.manual_review_queue  from anon, authenticated;
revoke all on public.classifier_audit_log from anon, authenticated;
revoke all on public.rate_limit_events     from anon, authenticated;

grant insert on public.geocode_audit_log    to anon, authenticated;
grant insert on public.manual_review_queue  to anon, authenticated;
grant insert on public.classifier_audit_log to anon, authenticated;
grant insert on public.rate_limit_events     to anon, authenticated;

create policy "app insert only" on public.geocode_audit_log
  for insert to anon, authenticated with check (true);
create policy "app insert only" on public.manual_review_queue
  for insert to anon, authenticated with check (true);
create policy "app insert only" on public.classifier_audit_log
  for insert to anon, authenticated with check (true);
create policy "app insert only" on public.rate_limit_events
  for insert to anon, authenticated with check (true);

-- Broker/meta: no app access. RLS on, no policies => app sees/writes nothing.
alter table public.audit_deletion_incidents enable row level security;
alter table public.audit_access_grants      enable row level security;
alter table public.audit_exports            enable row level security;

revoke all on public.audit_deletion_incidents from anon, authenticated;
revoke all on public.audit_access_grants      from anon, authenticated;
revoke all on public.audit_exports            from anon, authenticated;
