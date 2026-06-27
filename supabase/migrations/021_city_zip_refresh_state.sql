-- ============================================================================
-- Migration 021 — city_zip_refresh_state + city_zip_refresh_runs
-- ============================================================================
-- State + audit tables for the daily City-of-LA ZIP snapshot refresh poll
-- (A-3 §4.1 daily cadence; §2.2-d snapshot trigger; §3.1-b dormancy clock).
--
-- Governing determination:
--   workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md
--   §4 (refresh cadence) + §3 (currency), as corrected by the currency-trigger
--   field amendment (broker 2026-06-27, §7.3-c defect resolution): the polled
--   field is editingInfo.dataLastEditDate (NOT lastEditDate) — fires only when
--   the boundary geometry actually moves, not on schema/metadata edits.
--
-- The refresh poll is COMPARISON-ONLY in the Edge runtime: it fetches C-8's
-- editingInfo.dataLastEditDate and compares to the baseline below. It does NOT
-- recompute the snapshot (the geospatial construction is the operator-supervised
-- Python rail, §3.3 / §2.4) — on a detected change it alerts the broker that a
-- recompute + A-2 review is due; the prior snapshot keeps serving (§3.2-a).
--
-- Writes occur via service_role (the city-zip-refresh Edge Function), which
-- bypasses RLS. RLS is enabled and anon/authenticated revoked so no client-facing
-- role can read or write. The runtime resolver does NOT consult these tables
-- (it reads the committed snapshot module); these are poll-state + audit only.
-- ============================================================================

-- Singleton state row: the production snapshot's currency baseline + poll bookkeeping.
create table if not exists public.city_zip_refresh_state (
  id                         text primary key default 'singleton'
                               check (id = 'singleton'),
  snapshot_sha256            text not null,
  -- Baseline = C-8 editingInfo.dataLastEditDate of the production snapshot (§7.3-c
  -- field correction). Recompute fires when live dataLastEditDate > this value.
  baseline_data_last_edit    date not null,
  -- §3.1-b dormancy clock anchor: broker initial attestation date for the snapshot.
  broker_attested_at         date not null,
  consecutive_fetch_failures integer not null default 0,
  last_polled_at             timestamptz,
  last_observed_data_last_edit date,
  last_outcome               text,
  updated_at                 timestamptz not null default now()
);

alter table public.city_zip_refresh_state enable row level security;
revoke all on public.city_zip_refresh_state from anon, authenticated;

-- Seed the singleton with the predicate-5 v1 snapshot baseline.
--   snapshot sha256  : e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452
--   baseline date    : 2026-05-19  (C-8 dataLastEditDate, per §7.3-c)
--   broker attested  : 2026-06-27  (§8 predicate-5 attestation; §3.1-b anchor)
insert into public.city_zip_refresh_state
  (id, snapshot_sha256, baseline_data_last_edit, broker_attested_at)
values
  ('singleton',
   'e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452',
   date '2026-05-19',
   date '2026-06-27')
on conflict (id) do nothing;

-- Per-run audit history (one row per poll cycle), for operational forensics and
-- the §2.3 NO-DIFF auto-attestation trail (broker_attestation_routine).
create table if not exists public.city_zip_refresh_runs (
  id                       uuid primary key default gen_random_uuid(),
  ran_at                   timestamptz not null default now(),
  observed_data_last_edit  date,
  baseline_data_last_edit  date,
  outcome                  text not null check (
                             outcome in ('no_diff', 'change_detected',
                                         'fetch_fail', 'dormancy_alert', 'anomaly')),
  alert_sent               boolean not null default false,
  detail                   jsonb
);

alter table public.city_zip_refresh_runs enable row level security;
revoke all on public.city_zip_refresh_runs from anon, authenticated;

create index if not exists city_zip_refresh_runs_ran_at_idx
  on public.city_zip_refresh_runs (ran_at desc);
