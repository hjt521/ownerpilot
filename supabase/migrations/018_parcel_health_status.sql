-- ============================================================================
-- Migration 018 — parcel_health_status
-- ============================================================================
-- Rolled-up per-endpoint health status. Exactly one row per endpoint
-- ('county', 'zimas'). This is the ONLY table the gate-read consults (§6).
--
-- Governing determination:
--   parcel_endpoint_health_check_live_determination_broker_2026-06-25.md
--   §3 (freshness window), §4 (failure tolerance / two-consecutive roll-up),
--   §6 (gate reads rolled-up status only).
--
-- Writes via service_role (Edge Function upsert on each probe). RLS enabled,
-- anon/authenticated revoked. Seeded not_live so the gate fails closed until
-- the first successful probe sets last_success_at (§3 fail-closed default).
-- ============================================================================

create table if not exists public.parcel_health_status (
  endpoint              text primary key check (endpoint in ('county', 'zimas')),
  current_status        text not null default 'not_live' check (current_status in ('live', 'not_live')),
  consecutive_failures  integer not null default 0 check (consecutive_failures >= 0),
  last_success_at       timestamptz,
  last_probe_at         timestamptz,
  updated_at            timestamptz not null default now()
);

alter table public.parcel_health_status enable row level security;

revoke all on public.parcel_health_status from anon, authenticated;

-- Fail-closed seed: both endpoints start not_live with a null last_success_at,
-- so the freshness-window gate-read (§3) returns not-live until a real
-- successful probe lands. Idempotent; re-running leaves existing rows intact.
insert into public.parcel_health_status (endpoint, current_status, consecutive_failures)
values
  ('county', 'not_live', 0),
  ('zimas',  'not_live', 0)
on conflict (endpoint) do nothing;
