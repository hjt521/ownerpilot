-- ============================================================================
-- Migration 017 — parcel_health_probe_results
-- ============================================================================
-- Per-probe history for the County parcel endpoint and the ZIMAS endpoint
-- health-check. One row per probe attempt.
--
-- Governing determination:
--   parcel_endpoint_health_check_live_determination_broker_2026-06-25.md
--   §2 (healthy-probe definition: HTTP 200 + structured-shape + <=10s latency).
--
-- Writes occur via service_role (the parcel-health Edge Function), which
-- bypasses RLS. RLS is enabled and anon/authenticated are revoked so no
-- client-facing role can read or write this table. The gate-read path does
-- NOT consult this table (it reads only the rolled-up status in 018); this
-- table is probe-history for operational forensics and attestation evidence.
-- ============================================================================

create table if not exists public.parcel_health_probe_results (
  id            uuid primary key default gen_random_uuid(),
  endpoint      text not null check (endpoint in ('county', 'zimas')),
  outcome       text not null check (outcome in ('healthy', 'unhealthy')),
  reason        text check (reason in ('http_status', 'response_shape', 'latency')),
  http_status   integer,
  latency_ms    integer,
  error_detail  text,
  probed_at     timestamptz not null default now(),
  -- §2 invariant: a healthy probe carries no failure reason; an unhealthy
  -- probe names exactly which of the three §2 conditions failed.
  constraint parcel_health_probe_reason_matches_outcome check (
    (outcome = 'healthy'   and reason is null) or
    (outcome = 'unhealthy' and reason is not null)
  )
);

alter table public.parcel_health_probe_results enable row level security;

revoke all on public.parcel_health_probe_results from anon, authenticated;

-- Supports the "last successful probe for endpoint X" lookup the roll-up and
-- freshness-window (§3) checks perform.
create index if not exists parcel_health_probe_results_endpoint_probed_at_idx
  on public.parcel_health_probe_results (endpoint, probed_at desc);
