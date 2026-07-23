# Phase II P1 — Founder Ratifications · 2026-07-24

Records the Founder's constitutional review and decisions on the P1 security evidence (`P1_security_evidence_report_2026-07-23.md`, `P1_remediation_roadmap_2026-07-23.md`). Repository record only — no production change is executed by this file. `[HUMAN]` items remain the Founder's dashboard actions; the engineering track does not perform them.

## Constitutional review outcome
**P1 approved from an architectural perspective.** The Founder affirmed the governing behavior: no production database changes; final audit dispositions reserved for the independent Constitutional Auditor; remediation separated from architectural change (no unnecessary ADR); TM-001 recorded as PROPOSED without premature design or ratification.

## Decisions

### 1. Enable leaked-password protection (Finding D) — APPROVED
The only finding classified Noncompliant/Pending in the engineering assessment. Founder authorizes remediation via the Supabase Auth dashboard (HaveIBeenPwned check), per the remediation roadmap checklist. Execution is a `[HUMAN]` dashboard action; the Auditor moves D to Compliant only after enablement is confirmed (Advisors re-scan + dated evidence).

### 2. Confirm `constitution` is not in the exposed PostgREST schema (Finding A) — APPROVED
Founder authorizes closing the remaining evidence gap for Finding A by confirming the exposed-schema list excludes `constitution`. Note: this is completeness only — deny-by-default is already provable at the grant layer (anon/authenticated have 0 schema USAGE, 0 grants, 0 EXECUTE).

### 3. Ratify the `pg_net` deferral (Finding B) — RATIFIED
Founder ratifies keeping `pg_net` in `public`. Rationale accepted: Supabase-managed default; callable functions namespaced under `net`; three cron paths (parcel-health, city-zip-refresh, RTC) depend on `net.http_post`; no supported, rollback-safe relocation has been demonstrated. **Do not relocate.** Revisit only if Supabase provides a supported relocation path — which would then require an architecture-first ADR. The `sec9_pg_net_new_callers` scope-guard in `validation/security_posture_checks.sql` stands as the drift alarm.

## Disposition status after this record
- A → engineering: compliant-with-observation; **Auditor reserves final disposition** (evidence gap authorized for closure).
- B → **Founder-ratified deferral**; Auditor reserves final disposition on the finding record.
- C → engineering: compliant-with-observation (walls intact); **Auditor reserves final disposition**.
- D → Noncompliant/pending → **remediation Founder-approved**; Compliant after confirmed enablement.

Founder ratification does not substitute for the independent Auditor's disposition; it authorizes the `[HUMAN]` actions and settles the pg_net operational decision.
