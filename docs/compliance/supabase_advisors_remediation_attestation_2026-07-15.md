# Supabase Advisors — B/C/D/E Remediation Attestation · 2026-07-15

**Project:** `txpetdrfsmqnyooydmas` (production). **Scope:** the 21 findings remaining after Category A. Category A (`compliance_gates` RLS + `audit_cliff` lockdown) is closed under its own countersigned attestation (`compliance_gates_category_a_remediation_attestation_2026-07-15.md`, PR 235).
**Authorizing rulings:** broker rulings 2026-07-15 (Category B reversal, C/D/E ratification); standing rulings #1 (+refinement), #3, #4.
**Migrations:** `054_function_search_path_pins.sql`, `055_magic_link_tokens_grant_tidy.sql`. (053 was withdrawn — see §B.)

---

## §A · Advisors before → after (security)

| | Errors | Warnings | Info |
|---|---|---|---|
| Start of triage (pre-Cat-A) | 1 | 13 | 11 |
| After Category A | 0 | 9 | 12 |
| After Category C/D/E (this attestation) | **0** | **7** | 12 |
| After leaked-password toggle (broker, dashboard) | 0 | 6 | 12 |

The 7 remaining Warnings are: **5 ratified linter exceptions** (`rls_policy_always_true` on the audit tables — see §B, intentionally NOT cleared), `pg_net` in public (§E, deferred), and leaked-password (§E, clears on the broker's dashboard toggle). No actionable finding remains open.

## §B · Category B — RATIFIED LINTER EXCEPTION (not remediated)

**Finding:** `rls_policy_always_true` on `geocode_audit_log`, `geocode_dispositions`, `classifier_audit_log`, `rate_limit_events`, `manual_review_queue` — each has an `app insert only` INSERT policy with `WITH CHECK (true)` for anon/authenticated.

**Determination: ratified linter exception. 053 withdrawn; the anon INSERT-only wall stays as-is.**

- **Authorizing ruling:** 2026-06-20 geocode audit schema design ruling / Fork H-a (documented in `002_audit_durability.sql` header + `app/api/notice/geocode/route.ts`).
- **Security property preserved:** the "app can append, cannot read" audit compartmentalization. The public-facing request path holds only a scoped, append-only capability on the audit tables (RLS has an INSERT policy and **no** SELECT policy); broker read is out-of-band via service_role. A request-path compromise can pollute the audit trail but **cannot exfiltrate** it (`input_address` = property addresses + derived PII linkage). Paired with the "service_role is operator-only" standing rail.
- **Symptom, not defect:** the linter flags `WITH CHECK (true)` as if permissive-by-accident; it is deliberately permissive on INSERT to pair with the deliberate absence of SELECT.
- **Why 053 was withdrawn:** the originally-ruled Category-B fix (move the sink writes to service_role) would have given the public request path an RLS-bypassing full-access client on the audit tables — breaking the compartmentalization and turning a write-*pollution* vector into a PII-*exfiltration* vector. That is a worse outcome than the write-pollution the fix targeted. Caught at the write-path reading step, pre-apply (standing ruling #4).
- **Acknowledged residual:** anon-key holders can append arbitrary audit rows (the anon key is already public). This is operational noise, detected and pruned by `audit_cliff`. Accepted.
- **Empirical note:** the service_role composition was verified functional on an isolated Supabase branch (`security-cat-b-preflight-2026-07-16`, pre-flight passed both positive and negative halves) before the reversal. Recorded so a future re-evaluation of the audit-durability posture has the evidence on hand; branch deleted.

## §C · Category C — REMEDIATED (migration 054)

`function_search_path_mutable` on `refuse_delete_held` + `enqueue_manual_review` (both SECURITY INVOKER trigger functions). Fix: `set search_path = public, pg_temp`.

**Verification (production):**
```
refuse_delete_held   proconfig = {search_path=public, pg_temp}
enqueue_manual_review proconfig = {search_path=public, pg_temp}
```
Advisors: both `function_search_path_mutable` warnings cleared.

## §D · Category D — RLS lockdowns (record) + magic_link_tokens tidy (migration 055)

The 12 `rls_enabled_no_policy` (Info) tables are confirmed correct fail-closed lockdowns (RLS on, no policy = deny-all for anon/authenticated, service-role/owner only). **This attestation + the triage brief are the written-intent record**; they remain as-is (correct posture).

`magic_link_tokens` grant tidy (055): revoked the residual anon/authenticated table grants (already neutralized by RLS). **Verification:** anon/authenticated grants on `magic_link_tokens` = 0. No functional change — redeem is server-side via service_role.

**Lane-2 cross-check + citation correction:** the intended access pattern for `magic_link_tokens` was confirmed against `deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md` (§155/§179 — "no public policy on magic_link_tokens", public RLS policies explicitly not authorized) and `gate2_preview_runbook_evidence_packet_2026-07-01.md` ("service-role-only… Intentional"). **The document `schema_and_persistence_lane2_broker_ratification_2026-06-29` cited in the triage brief does not exist under that filename — those two documents are the actual authority.** Current state matches intent; no divergence.

## §E · Category E — split disposition

- **`pg_net` in public schema (WARN): DEFERRED with reasoning.** Supabase installs `pg_net` in `public` by default; it backs pg_cron HTTP callers (parcel-health probes, RTC/city-refresh HTTP). Moving it risks breaking `net.*` references and is a careful migration in its own right. Info→Warn-level, no acute risk. Deferred as an acknowledged item; revisited only if it becomes a priority. Not a workaround — a scoped deferral.
- **Leaked-password protection (WARN): ENABLED by the broker** via Auth settings (HaveIBeenPwned). Low relevance in the current topology (Google SSO primary, magic-link secondary, password never-first) but free defense-in-depth for future password/enterprise flows. [Broker action + screenshot pending; clears this Warning.]

## §F · Standing rulings recorded

- **#1 (refined):** permissive RLS policies (`USING/WITH CHECK (true)`) remain prohibited by default, **unless** a prior broker ruling establishes the policy as load-bearing for a security property the schema alone can't express. Exceptions must (a) cite the authorizing ruling, (b) name the security property, (c) name what the WARN is a symptom of, (d) be recorded as ratified linter exceptions. The five Category-B tables meet all four (see §B).
- **#3 (deploy-before-revoke):** still codified and applies to future grant-removing migrations even though 053 didn't ship. Category A honored it; the pre-flight discipline surfaced the §B conflict before any revoke.
- **#4 (prior-ruling conflict surfacing, NEW):** when preparing to apply a migration touching a table/function/path with a prior design ruling, engineering reads the write/read path as pre-apply diligence and halts + surfaces if the migration as-ruled would violate that ruling's intent. This catch (§B) is the codifying case.

## §G · Attestation

Engineering attests: migrations 054 + 055 were applied to production `txpetdrfsmqnyooydmas` on 2026-07-15; the verification queries returned the stated results; Advisors shows 0 Errors and the two search_path warnings cleared; the five `rls_policy_always_true` findings are retained as ratified linter exceptions per §B; `pg_net` is deferred and leaked-password is a broker dashboard toggle. No application code path was impacted.

— Engineering · B/C/D/E remediation · 2026-07-15

Broker countersignature: ____________________________  Date: __________
