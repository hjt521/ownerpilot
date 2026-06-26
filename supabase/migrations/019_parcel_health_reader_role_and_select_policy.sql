-- ============================================================================
-- Migration 019 — parcel_health_reader role + RLS SELECT policy
-- ============================================================================
-- In-process gate-read credential for parcelEndpointHealthCheckLive.
--
-- Governing determination:
--   parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §6
--   (gate reads the rolled-up status only); sub-fork 2 ruling (in-process
--   direct read; NO internal route; narrow SELECT policy on the status table
--   ONLY, not probe-history).
--
-- Companion: parcel_endpoint_health_check_live_determination_broker_2026-06-25.md
-- Created by: Jack Taglyan, CalDRE B9445457 (broker compliance review)
--
-- Pattern mirrors the rtc_block_state_reader role (migration 014) + its SELECT
-- policy (migration 016). Role + grants + policy are created together to avoid
-- the RLS-gap pattern caught in the RTC work (013 enabled RLS with no policy,
-- so the reader could not see rows until 016 added one).
--
-- The serve path reads parcel_health_status with a broker-held reader
-- credential (ES256 JWT carrying role=parcel_health_reader, minted + wired in
-- a later slice). service_role writes bypass RLS; this role is read-only.

-- === LOCKED-BEGIN (parcel_endpoint_health_check_live_determination_broker_2026-06-25.md §6 + sub-fork 2 — byte-identical) ===
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'parcel_health_reader') then
    create role parcel_health_reader nologin;
  end if;
end
$$;

-- PostgREST switches into this role per the JWT role claim; the authenticator
-- role must be able to SET ROLE to it.
grant parcel_health_reader to authenticator;

grant usage on schema public to parcel_health_reader;
grant select on public.parcel_health_status to parcel_health_reader;

-- Narrow: SELECT on the rolled-up status table only. Probe-history (017) is
-- intentionally NOT exposed to this role (§6 reads only rolled-up status).
create policy parcel_health_status_reader_select
  on public.parcel_health_status
  for select
  to parcel_health_reader
  using (true);

-- Intentional non-grants (documented for audit clarity):
--   - NO grants on public.parcel_health_probe_results (017's probe-history table;
--     §6 gate-read does not consult probe-history, only rolled-up status)
--   - NO grants on any other public.* table
--   - NO INSERT, UPDATE, DELETE on any table
--   - NO LOGIN; role cannot be used for direct PG connections
--   - NO sequence privileges
--   - NO function execute privileges
-- === LOCKED-END ===

-- --- down (reversal) -------------------------------------------------------
-- To reverse 019 (does NOT touch 017's or 018's tables):
--   drop policy if exists parcel_health_status_reader_select on public.parcel_health_status;
--   revoke parcel_health_reader from authenticator;
--   revoke select on public.parcel_health_status from parcel_health_reader;
--   revoke usage on schema public from parcel_health_reader;
--   drop role parcel_health_reader;
