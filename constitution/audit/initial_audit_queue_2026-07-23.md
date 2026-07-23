# CA-001 — Initial Audit Queue · 2026-07-23

Audit **plan** for four evidence-backed Supabase security items. These are the Constitutional Auditor's opening work items — not final conclusions. Per CA-001 §5, any item lacking complete independent evidence is `Indeterminate`, never `Compliant`. Each uses the canonical finding model. **No policy, extension, or auth setting was modified by this task.**

---

## AUD-2026-07-23-A — Constitution/schema RLS deny-by-default posture
- **severity:** Advisory · **domain:** 6 Database security · **governing_authority:** ADR-003/004 (RLS deny-by-default), CONSTITUTION.md
- **requirement:** RLS-enabled/no-policy tables must be genuinely deny-by-default for anon/authenticated, with denial preserved by grants, functions, service roles, and every client access path; the repository baseline + validation must encode it.
- **observed_evidence:** all 59 `constitution` tables + the `public` audit/cron tables are RLS-enabled with 0 policies; validation checks #3 (RLS coverage) and the drift baseline encode this; the schema is not PostgREST-exposed. **evidence gap:** full grant matrix + client-path enumeration not yet independently re-verified end-to-end.
- **expected_state:** deny-by-default provable via grants + non-exposure + tests. **actual_state:** consistent with deny-by-default; grant/path re-verification pending.
- **conclusion:** **Indeterminate** (pending grant-matrix + access-path evidence) → lean Compliant-with-observation. · **confidence:** medium.
- **remediation:** produce a grant/access-path evidence bundle; add a grants-posture check to the validation runner. · **owner:** Engineering (evidence), Auditor (evaluation). · **disposition:** open.

## AUD-2026-07-23-B — `pg_net` installed in `public` schema
- **severity:** Moderate · **domain:** 6 Database security · **governing_authority:** security standards; Advisors `extension_in_public`.
- **requirement:** extensions should not sit in `public` unless justified; relocation must be architecture-first and dependency-safe.
- **observed_evidence:** `pg_net` is in `public`; it is a Supabase-managed default backing `pg_cron` HTTP (parcel-health / RTC / city-refresh); recorded as a deferral in the public-schema advisors remediation attestation (§E). **evidence gap:** whether a safe relocation is supported without breaking `net.*` callers.
- **expected_state:** relocated or a ratified deferral with dependency analysis. **actual_state:** deferred, dependency analysis incomplete.
- **conclusion:** **Compliant with observation** (documented deferral) · **confidence:** medium. · **remediation:** dependency inventory + architecture-first relocation proposal *if* safe; else re-ratify the deferral. · **owner:** Engineering. · **disposition:** open. **Do not modify during audit.**

## AUD-2026-07-23-C — `WITH CHECK (true)` INSERT policies (5 public audit tables)
- **severity:** Moderate · **domain:** 6 Database security · **governing_authority:** least-privilege; Advisors `rls_policy_always_true`; Fork H-a audit-durability ruling (2026-06-20).
- **scope:** `public.classifier_audit_log`, `geocode_audit_log`, `geocode_dispositions`, `manual_review_queue`, `rate_limit_events`.
- **requirement:** identify intended callers; confirm anon/authenticated write need; assess abuse/spoofing/integrity/cost; recommend least-privilege replacements.
- **observed_evidence:** these are the **ratified Fork H-a "app can append, cannot read" audit walls** — anon INSERT-only + deliberately-absent SELECT so a request-path compromise cannot exfiltrate; recorded as ratified linter exceptions in the advisors baseline snapshot with authorizing rulings. The `WITH CHECK (true)` is the append capability, paired with no SELECT. **evidence gap:** independent re-confirmation that no SELECT/mutation path exists and cost/abuse limits are enforced.
- **expected_state:** append-only wall with no read path (ratified). **actual_state:** matches the ratified design.
- **conclusion:** **Compliant with observation** (documented ratification; verify no read path + rate-limit enforcement) · **confidence:** medium-high. · **remediation:** confirm absence of SELECT policies + abuse controls; keep the ratified exception on record. · **owner:** Auditor + Engineering. · **disposition:** open. **Do not alter policies during audit.**

## AUD-2026-07-23-D — Leaked-password protection disabled
- **severity:** High · **domain:** 6 Database security · **governing_authority:** security standards; Advisors `auth_leaked_password_protection`.
- **requirement:** document auth exposure; determine if password auth is active; recommend enablement unless an evidenced incompatibility exists.
- **observed_evidence:** leaked-password protection is disabled; it is a known pending remediation (advisors §E, in the baseline `pending[]`); the Founder/broker has committed to enabling it via the Auth dashboard. **evidence gap:** confirmation of enablement + whether password auth is in active use vs SSO/magic-link only.
- **expected_state:** enabled (or a documented incompatibility). **actual_state:** disabled; enablement pending.
- **conclusion:** **Noncompliant** (pending remediation) · **confidence:** high. · **remediation:** enable in Auth dashboard; record confirmation; then close. · **owner:** Founder/broker. · **disposition:** open.

---

## Queue disposition
Preliminary only. Final dispositions require the Auditor's independent evidence pass (grant matrices, access-path enumeration, dashboard confirmations) and, where flagged, a human governance decision. Two are **Compliant-with-observation** against documented ratifications (B, C), one is **Indeterminate** pending grant evidence (A), one is **Noncompliant/pending** (D). None was remediated by this task.
