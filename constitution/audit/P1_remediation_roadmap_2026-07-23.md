# Phase II P1 — Remediation Roadmap · 2026-07-23

Repository-first remediation design for the four CA-001 findings. **No production change is executed here.** Each item states the action, whether it is operational (standards/migration governance) or architectural (requires an ADR), the executor, and the gate.

## A — Constitution RLS deny-by-default
- **Disposition (engineering):** compliant-with-observation; deny-by-default enforced at the grant layer. **Auditor reserves final disposition.**
- **Remediation:** *no schema change.* (1) Confirm the PostgREST exposed-schema list excludes `constitution` `[HUMAN, dashboard]`. (2) Encode the posture as a **deterministic validation check** so drift is caught (see `constitution/validation/security_posture_checks.sql`): anon/authenticated must have no USAGE/grants/EXECUTE on `constitution`. **Operational; no ADR** (does not change the model).

## B — `pg_net` in `public`
- **Disposition (engineering):** compliant-with-observation / justified deferral. **Auditor reserves.**
- **Remediation:** **renew the documented deferral.** Rationale: Supabase-managed default; functions namespaced under `net`; three cron paths (parcel-health, city-zip-refresh, RTC) depend on `net.http_post`; no supported/rollback-safe relocation demonstrated. **Do not relocate.** If a future supported relocation appears → **architecture-first ADR** (changing an extension placement with live cron dependencies is an architectural decision). Add a deterministic check that alerts if a *new* object starts depending on `net.*` (scope-creep guard).

## C — Append-only audit walls (5 tables)
- **Disposition (engineering):** compliant-with-observation; Fork H-a walls intact (INSERT-only, no read/mutate path, operator-only SELECT). **Auditor reserves.**
- **Remediation:** *no policy change* (the ratified design is correct). **Optional hardening (enhancement, not defect):** replace `WITH CHECK(true)` with a column/shape-constrained check to reduce junk-insert bloat — **only if** the Auditor + Founder judge the bloat/cost risk material. Any such change is **operational** (migration governance) unless it alters the append-only architecture (then ADR). Add deterministic checks that **fail** if any SELECT/UPDATE/DELETE policy or grant ever appears on these tables for anon/authenticated (protects the wall).

## D — Leaked-password protection
- **Disposition (engineering):** **Noncompliant / pending** — enable it.
- **Founder action checklist `[HUMAN]`:**
  1. Supabase Dashboard → **Authentication → Policies / Password settings** → enable **"Leaked password protection"** (HaveIBeenPwned check).
  2. Confirm active providers (magic-link, Google SSO) are unaffected (they are — the setting only gates password sign-ups/changes).
  3. If the Preview E2E admin password is weak, rotate it to a strong value so the E2E flow still passes.
  4. Re-run the Supabase Advisors security scan → confirm `auth_leaked_password_protection` cleared.
  5. Record the confirmation (screenshot + date) → then the Auditor moves D to Compliant.
- **No incompatibility evidenced.** Operational; no ADR.

## Sequencing
1. Founder: enable leaked-password (D) + confirm exposed-schema list (A) `[HUMAN]`.
2. Engineering: land the deterministic `security_posture_checks.sql` into the validation runner + CI (protects A and C, scope-guards B).
3. Auditor: independent disposition pass on all four with this evidence.
4. Renew pg_net deferral (B) in the security standard.

**No ADR is created by P1** — none of the recommended remediations alter the constitutional architecture (deny-by-default, append-only walls, extension placement all stay). An ADR is triggered only if (C) hardening changes the wall design or (B) a real pg_net relocation is undertaken.
