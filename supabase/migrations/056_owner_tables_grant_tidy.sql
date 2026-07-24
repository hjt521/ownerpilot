-- 056_owner_tables_grant_tidy.sql
-- Security tidy — least-privilege on the owner-scoped public tables surfaced repeatedly by the CA-001 P1 and the
-- ECAP Wave-1 delivery reviews (RPT-007 / RPT-010): chat_sessions, riskpath_records, lahd_filing_records. Each has
-- RLS enabled with owner-scoped policies (auth.uid() = user_id); the residual broad anon/authenticated table grants
-- are a side effect of the Data API "Automatically expose new tables" setting and are already neutralized by RLS.
--
-- Verified SAFE (2026-07-24): every application access to these three tables is server-side via serviceClient()
-- (service_role). A grep of app/ lib/ shows all from('chat_sessions' | 'riskpath_records' | 'lahd_filing_records')
-- call sites use the service client, and @/lib/supabase/client (the browser/anon client) is not imported anywhere.
-- The anon/authenticated grants are therefore unused; revoking them aligns these tables to the same
-- "service-role-only" posture as 055_magic_link_tokens_grant_tidy. service_role retains full access. No functional
-- change (RLS already denied anon/authenticated; this removes the lingering grant as defense-in-depth).
--
-- COMPANION (dashboard, not SQL): Settings → API (Data API) → turn OFF "Automatically expose new tables" so future
-- public tables do not re-acquire these grants. That closes the recurrence at the source.
--
-- TIMING: apply AFTER the FF-3 production flip (~2026-07-28). chat_sessions is the FF-3 hot-path table; although
-- this change is functionally inert (writes go through service_role), do it outside the flip window out of caution.
--
-- ROLLBACK (if ever needed): re-grant per the auto-expose default —
--   grant select, insert, update, delete, truncate, references, trigger
--     on public.chat_sessions, public.riskpath_records, public.lahd_filing_records to anon, authenticated;

revoke all on public.chat_sessions       from anon, authenticated;
revoke all on public.riskpath_records    from anon, authenticated;
revoke all on public.lahd_filing_records from anon, authenticated;
