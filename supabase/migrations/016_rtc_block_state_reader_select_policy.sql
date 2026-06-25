-- 016_rtc_block_state_reader_select_policy.sql
-- RTC block-state reader — scoped SELECT policy (RLS window for the sanctioned read path).
--
-- Authorized by: rtc_block_state_reader_rls_policy_broker_determination_2026-06-25.md
--   §1 (scoped RLS SELECT policy, not BYPASSRLS; USING (true); both tables; migration 016),
--   §2.6 (this header must cite the determination + carry the completion-not-reversal framing),
--   §2.8 (one CREATE POLICY per table, two statements total; no role, no grant, no table change).
--
-- Companion rulings:
--   la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md
--     (D-5/§2.6 — RLS posture amended here; P-B — the sanctioned server-side read path)
--   la_rtc_block_state_reader_auth_mechanism_broker_ruling_response_2026-06-23.md
--     (M-1(ii) — pre-signed reader JWT; role rtc_block_state_reader; SELECT-only-on-two-tables)
--   Migration 014 — created role rtc_block_state_reader (NOLOGIN) + granted SELECT on both tables.
--
-- COMPLETION, NOT REVERSAL (determination §2.1): D-5/§2.6's "RLS on, no policies =>
-- app sees/writes nothing" was load-bearing against the public-facing roles (anon,
-- authenticated) reachable from any Vercel client path. The rtc_block_state_reader
-- role did not exist when D-5/§2.6 was ruled; it was created by migration 014 as the
-- runner architecture's own P-B sanctioned read path — server-only, NOLOGIN, assumable
-- only via the pre-signed JWT in SUPABASE_RTC_READER_JWT, SELECT-only on these two tables.
-- Reading D-5/§2.6 as forbidding a scoped policy for this role would make the runner
-- architecture's own read path impossible. This migration cuts ONE named-role window
-- through the wall, sized exactly to what P-B requires, and no wider. The default-deny
-- posture against anon/authenticated remains fully intact (they are unaffected and
-- continue to see nothing).
--
-- WHAT THIS DOES NOT TOUCH (determination §2.5): SELECT-only — no INSERT/UPDATE/DELETE
-- grant is created or implied. anon and authenticated gain nothing. The INSERT-only /
-- no-public-access walls of migrations 012, 013, 015 remain in force. The Edge Function's
-- service_role write path is unchanged. No write-capable identity enters Vercel runtime.
-- ---------------------------------------------------------------------------
-- Policy 1: rtc_refresh_state — scoped SELECT for the reader role, all rows.
-- Block-state is non-PII operational data; the serve path needs every language's
-- status to compute the freshness/blocked-language decision, so USING (true) is the
-- honest minimal predicate (determination §2.3). Does not widen reach beyond the two
-- tables migration 014 already granted SELECT on.
-- ---------------------------------------------------------------------------
create policy rtc_block_state_reader_select_all
  on public.rtc_refresh_state
  for select
  to rtc_block_state_reader
  using (true);
-- ---------------------------------------------------------------------------
-- Policy 2: rtc_refresh_pins — symmetric scoped SELECT for the reader role, all rows.
-- Migration 014 granted SELECT on both tables as a single block-state surface; a policy
-- on only one would leave the other in the same default-deny gap that triggered this
-- determination (determination §2.4). Both tables, one migration, symmetric posture.
-- ---------------------------------------------------------------------------
create policy rtc_block_state_reader_select_all
  on public.rtc_refresh_pins
  for select
  to rtc_block_state_reader
  using (true);
