-- 025c_broker_confirm_fn_exec_lockdown.sql
-- Phase 3 SECURITY DEFINER hardening — broker ruling 2026-06-30 (phase3_025c_security_definer_hardening).
-- 024/025 created mark_expired_broker_confirms() + sweep_broker_confirm_contacts() as SECURITY DEFINER, but
-- Supabase's default PUBLIC grant made them anon/authenticated-executable via /rest/v1/rpc/... (live exposure:
-- anon could trigger the SLA-expiry shift or the contact-PII purge), and their search_path was role-mutable
-- (privilege-escalation vector on a SECURITY DEFINER function).
--   F1: REVOKE EXECUTE from PUBLIC/anon/authenticated (explicit GRANT to service_role retained for the
--       edge-function path; pg_cron invokes as owner/postgres, unaffected).
--   F2: pin search_path = pg_catalog, public (keeps `public` so unqualified table refs resolve; body unchanged).

REVOKE EXECUTE ON FUNCTION public.mark_expired_broker_confirms() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sweep_broker_confirm_contacts() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_expired_broker_confirms() TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_broker_confirm_contacts() TO service_role;

ALTER FUNCTION public.mark_expired_broker_confirms() SET search_path = pg_catalog, public;
ALTER FUNCTION public.sweep_broker_confirm_contacts() SET search_path = pg_catalog, public;
