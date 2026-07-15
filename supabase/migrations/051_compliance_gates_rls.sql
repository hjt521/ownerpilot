-- 051_compliance_gates_rls.sql
-- Category A security remediation — compliance_gates
-- Authorizing: broker ruling 2026-07-15 (Ruling 1); standing ruling #1
-- Applied to production project txpetdrfsmqnyooydmas on 2026-07-15.
-- Attestation: compliance_gates_category_a_remediation_attestation_2026-07-15.md

alter table public.compliance_gates enable row level security;
revoke all on public.compliance_gates from anon, authenticated;
grant select, insert, update on public.compliance_gates to service_role;
