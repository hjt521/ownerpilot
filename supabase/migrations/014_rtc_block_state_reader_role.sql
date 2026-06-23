-- 014_rtc_block_state_reader_role.sql
-- RTC block-state reader role + grants (P-B read path, auth substrate).
--
-- Authorized by: la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
--   D-1 (M-1(ii): pre-signed read-only-role JWT; PostgREST role-switch),
--   D-8 (this role + grants ship SEPARATE from migration 013's tables for
--        reversibility + audit clarity).
-- Governing: la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md
--   (R-4 / P-B / §2.6 scoped read-only role).
--
-- Companion: la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
-- Created by: Jack Taglyan, CalDRE B9445457 (broker compliance review)
--
-- MECHANISM: the serve path's read route (/api/internal/rtc-block-state) presents
-- a broker-minted, pre-signed JWT (env: SUPABASE_RTC_READER_JWT) whose `role` claim
-- is rtc_block_state_reader. PostgREST's authenticator role-switches into this role;
-- the SELECT-only grants below bound what it can do. The JWT SIGNING SECRET never
-- enters Vercel (broker-local mint only — standing rail §2.4 extended principle:
-- no mint/write capability in Vercel runtime). The role has NO LOGIN, so it cannot
-- be used for any direct connection — only reachable via PostgREST role-switch.
--
-- The SQL between the LOCKED-BEGIN / LOCKED-END markers is broker-authored
-- (ruling §2.7) and wired byte-identical. Do not edit it without a follow-up ruling.

-- === LOCKED-BEGIN (ruling §2.7 — byte-identical) ===
-- Migration 014: RTC block-state reader role + grants
-- Companion: la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
-- Created by: Jack Taglyan, CalDRE B9445457 (broker compliance review)

-- 1. Create the role (no login; PostgREST will role-switch into it via JWT claim)
create role rtc_block_state_reader nologin;

-- 2. Grant schema usage scoped to public (required for PostgREST to address the tables)
grant usage on schema public to rtc_block_state_reader;

-- 3. Grant SELECT on the two RTC state tables ONLY
grant select on table public.rtc_refresh_state to rtc_block_state_reader;
grant select on table public.rtc_refresh_pins to rtc_block_state_reader;

-- 4. Grant the role to the PostgREST authenticator role so it can role-switch
grant rtc_block_state_reader to authenticator;

-- Intentional non-grants (documented for audit clarity):
--   - NO grants on rtc_refresh_run_results (migration 012 INSERT-only-no-SELECT wall stands)
--   - NO grants on any other public.* table
--   - NO INSERT, UPDATE, DELETE on any table
--   - NO LOGIN; role cannot be used for direct PG connections
--   - NO sequence privileges
--   - NO function execute privileges
-- === LOCKED-END ===

-- --- down (reversal) -------------------------------------------------------
-- Mirrors the existing migrations' practice of documenting reversal inline.
-- To reverse 014 (does NOT touch 013's tables):
--   revoke rtc_block_state_reader from authenticator;
--   revoke select on table public.rtc_refresh_pins  from rtc_block_state_reader;
--   revoke select on table public.rtc_refresh_state from rtc_block_state_reader;
--   revoke usage on schema public from rtc_block_state_reader;
--   drop role rtc_block_state_reader;
