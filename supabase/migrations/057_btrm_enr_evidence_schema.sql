-- 057_btrm_enr_evidence_schema.sql
-- BTRM-001 Stage 1 (ENR-001) schema — Behavioral Trust and Resolution Model, ratified 2026-07-25 (ADR-013).
-- Introduces the evidence/timeline/commitment tables ENR-001 (Evidence Normalization & Reconstruction) reads
-- and writes. Additive only — three NEW, empty tables; no existing table is altered. NOT wired into any runtime
-- path by this migration alone: lib/btrm/enr/* only activates when BTRM_ENABLED + BTRM_STAGE_ENR_ENABLED are
-- both set (lib/btrm/flag.ts), off by default everywhere including production.
--
-- Design: constitution/enterprise/BTRM-001_behavioral_trust_and_resolution_model.md §4 (data model), §10
-- (migration strategy: schema lands before any component runs). Reconciliation: RPT-011. Ratification: ADR-013.
--
-- matter_id is an OPAQUE reference (not a foreign key to a formal "matters" table, which does not yet exist).
-- Callers pass whatever they already use to identify a case (e.g. a chat_sessions.id or a riskpath_records.id).
-- A dedicated matters table is deferred until real usage shows the shape it needs (avoids speculative schema,
-- per BTRM-001 §12/§13 self-critique and review-board caution against building ahead of demonstrated need).
--
-- Original evidence is IMMUTABLE (BTRM-001 §3.1): evidence_items rows are insert-only from the application's
-- perspective — no UPDATE policy is granted; corrections are new rows, never in-place edits.
--
-- Owner-scoped RLS, same pattern as riskpath_records (028) / lahd_filing_records: auth.uid() = user_id.
-- Broker-executed in Supabase Studio. Safe to run any time (three new empty tables; no backfill).
-- ROLLBACK: drop table public.btrm_commitments; drop table public.btrm_timeline_events; drop table public.btrm_evidence_items;

create table public.btrm_evidence_items (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users(id) on delete cascade,
  matter_id             text not null,
  source                text not null,
  occurred_at           timestamptz not null,
  author_or_origin      text not null,
  evidence_type         text not null,              -- 'message' | 'email' | 'payment_record' | 'notice' | 'photo' | 'document' | ...
  original_content_ref  text not null,               -- pointer to the immutable stored original (storage path or content id)
  related_property      text,
  verification_status   text not null default 'unverified' check (verification_status in ('verified','unverified','disputed')),
  extraction_confidence  numeric(3,2) check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  access_permissions     jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now()
);

create index btrm_evidence_items_user_id_idx  on public.btrm_evidence_items (user_id);
create index btrm_evidence_items_matter_idx   on public.btrm_evidence_items (matter_id);

alter table public.btrm_evidence_items enable row level security;
create policy btrm_evidence_items_owner_select on public.btrm_evidence_items
  for select using (auth.uid() = user_id);
create policy btrm_evidence_items_owner_insert on public.btrm_evidence_items
  for insert with check (auth.uid() = user_id);
-- No update/delete policy: original evidence is immutable once recorded (BTRM-001 §3.1). Corrections are new
-- rows referencing the corrected item, not in-place edits. service_role bypasses RLS for administrative fixes
-- (e.g. GDPR-style deletion requests), same posture as other append-only evidence tables in this schema.

create table public.btrm_timeline_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  matter_id          text not null,
  occurred_at        timestamptz not null,
  occurred_at_uncertain boolean not null default false,
  event_type         text not null,
  participants       jsonb not null default '[]'::jsonb,
  source_item_ids    jsonb not null default '[]'::jsonb,  -- array of btrm_evidence_items.id (not a DB FK: many-to-many, kept in application layer per ENR-001)
  provenance         text not null check (provenance in ('confirmed_fact','document_supported','unverified_statement','disputed_statement','ai_inference','unknown')),
  disputed           boolean not null default false,
  created_at         timestamptz not null default now()
);

create index btrm_timeline_events_user_id_idx on public.btrm_timeline_events (user_id);
create index btrm_timeline_events_matter_idx  on public.btrm_timeline_events (matter_id, occurred_at);

alter table public.btrm_timeline_events enable row level security;
create policy btrm_timeline_events_owner_all on public.btrm_timeline_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.btrm_commitments (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(id) on delete cascade,
  matter_id              text not null,
  committer              text not null,
  description            text not null,
  promised_by            timestamptz not null,
  created_from_event_id  uuid references public.btrm_timeline_events(id) on delete set null,
  status                 text not null default 'open' check (status in ('open','fulfilled','partially_fulfilled','fulfilled_late','not_fulfilled','modified')),
  fulfilled_event_id     uuid references public.btrm_timeline_events(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index btrm_commitments_user_id_idx on public.btrm_commitments (user_id);
create index btrm_commitments_matter_idx  on public.btrm_commitments (matter_id, status);

alter table public.btrm_commitments enable row level security;
create policy btrm_commitments_owner_all on public.btrm_commitments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
