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

## Confirmation of enablement (2026-07-24)
- **Finding D — leaked-password protection: ENABLED and VERIFIED.** Founder toggled "Prevent use of leaked passwords" ON (Authentication → Sign In / Providers → Email; HaveIBeenPwned Pwned Passwords API) and saved. A post-change Supabase security-advisor scan (via MCP `get_advisors`, 2026-07-24) confirms the `auth_leaked_password_protection` lint **no longer appears** — it was present in the pre-change baseline and is now absent. A full diff of the advisor output shows **no other change** and **no new finding**. Incidental hardening also enabled in the same save: "Require current password when updating" (ON).
- **Remaining expected advisor lints (unchanged, all ratified/by-design):** `extension_in_public` for `pg_net` (Founder-ratified deferral, §3 above); 5× `rls_policy_always_true` INSERT on the append-only walls (ratified Fork H-a); ~70× `rls_enabled_no_policy` INFO across `constitution` (deny-by-default). No action.
- **Finding A — exposed-schema visual confirmation: CONFIRMED (2026-07-24).** Founder opened Integrations → Data API → Settings → Exposed schemas. The list reads **"2 of 3 schemas exposed"** with `public` and `graphql_public` checked and **`constitution` present but unchecked (NOT exposed)**. This closes the A evidence gap by direct observation, corroborating the grant-layer evidence (anon/authenticated zero USAGE) and the advisor (no sensitive-schema-exposed lint).
- **New observation (adjacent, not a P1 finding) — `[HUMAN]` decision:** on the same Data API Settings panel, **"Automatically expose new tables" is ON**. Supabase's own guidance recommends disabling it to control Data API access manually. It does **not** affect `constitution` (unexposed → its tables stay private regardless), but it auto-exposes any new **`public`** table to the Data API. Recommend the Founder consider turning it OFF as public-schema hygiene; logged for the Auditor's public-surface queue, out of P1 scope.
- **Disposition impact:** Finding D → **remediated, evidence supports Compliant** (Auditor issues final). Finding A → **evidence gap closed** (visually confirmed unexposed + grant-layer denial); Auditor reserves final disposition. Findings B/C unchanged (Auditor reserves).
