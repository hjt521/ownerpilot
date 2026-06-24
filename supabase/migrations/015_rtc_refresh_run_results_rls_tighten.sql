-- 015_rtc_refresh_run_results_rls_tighten.sql
-- Tighten 012 RLS to match 013 (service-role-only).
--
-- Companion: rtc_refresh_step3_store_decisions_broker_ruling_response_2026-06-24.md (decision 1, option B).
-- Supersedes the anon-writable posture from 012, which was written under the
-- (now-obsolete) assumption that the runner wrote from Vercel as anon. Per the
-- runner-architecture ruling (R-4 Supabase Edge Function), the runner writes via
-- service_role from inside Supabase; service_role bypasses RLS, so the anon INSERT
-- grant on 012 is unused surface. Removed here so both refresh tables share one
-- RLS posture (service-role-only), eliminating the 012/013 inconsistency before go-live.

-- 1. Drop the "app insert only" policy from migration 012.
drop policy if exists "app insert only" on public.rtc_refresh_run_results;

-- 2. Revoke the anon INSERT grant.
revoke insert on table public.rtc_refresh_run_results from anon;

-- 3. Revoke any authenticated grants (defense-in-depth; 012 may not have granted these).
revoke all on table public.rtc_refresh_run_results from authenticated;

-- 4. service_role retains its bypass-RLS write capability (no explicit grant needed;
--    RLS-bypass means policies do not apply). RLS stays enabled (was enabled in 012).
--
-- Post-migration posture (matches 013):
--   service_role: INSERT via RLS bypass
--   anon:          NO policies, NO grants
--   authenticated: NO policies, NO grants
