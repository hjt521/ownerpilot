-- 055_magic_link_tokens_grant_tidy.sql
-- Security tidy — Supabase Advisors INFO `rls_enabled_no_policy` on magic_link_tokens. RLS is enabled with no
-- policy (deny-all for anon/authenticated). Redeem is server-side via service_role (app/api/magic-link/redeem +
-- app/api/magic-link/request both use serviceClient()). The residual default anon/authenticated table grants are
-- already neutralized by RLS but should not linger in the schema.
--
-- Lane-2 cross-check (broker ruling 2026-07-15): the intended access pattern was confirmed against
-- deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md (§155/§179 — "no public
-- policy on magic_link_tokens") and gate2_preview_runbook_evidence_packet_2026-07-01.md (service-role-only,
-- intentional). NOTE: the name "schema_and_persistence_lane2_broker_ratification_2026-06-29" cited earlier in the
-- triage brief does not exist as a file; those two documents are the actual authority. Current state matches
-- intent; this revoke aligns with the "no anon access" posture. No functional change.

revoke all on public.magic_link_tokens from anon, authenticated;
