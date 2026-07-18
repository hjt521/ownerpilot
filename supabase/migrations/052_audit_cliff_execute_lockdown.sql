-- 052_audit_cliff_execute_lockdown.sql
-- Category A security remediation — audit_cliff SECURITY DEFINER lockdown (both overloads)
-- Authorizing: broker ruling 2026-07-15 (Ruling 2); standing ruling #2
-- Applied to production project txpetdrfsmqnyooydmas on 2026-07-15.
-- Codebase check clean: no application caller; pg_cron 009 dry-run runs in postgres/owner context (unaffected).
-- Attestation: compliance_gates_category_a_remediation_attestation_2026-07-15.md

revoke execute on function public.audit_cliff(boolean) from public, anon, authenticated;
revoke execute on function public.audit_cliff(boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.audit_cliff(boolean) to service_role;
grant execute on function public.audit_cliff(boolean, text, text, text) to service_role;
