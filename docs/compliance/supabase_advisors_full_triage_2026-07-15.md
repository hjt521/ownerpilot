# Supabase Advisors — Full Triage Brief · 2026-07-15

**Project:** `txpetdrfsmqnyooydmas` (production). **Source:** Advisors security lints pulled via API 2026-07-15 (post-Category-A).
**Category A (already remediated tonight):** `compliance_gates` RLS + `audit_cliff` execute lockdown — see `compliance_gates_category_a_remediation_attestation_2026-07-15.md` (countersigned). This brief covers the **21 remaining** findings.
**Method:** each finding grounded against the live DB (policies, grants, function config), the workspace record (migration + ruling), and the code write-path. Standing rulings applied as authority: #1 (RLS enable + anon revoke, no `USING (true)`), #2 (`SECURITY DEFINER` → service-role only).

**Post-Category-A count:** 0 Errors · 9 Warnings · 12 Info.

Category legend (from the initial broker read, corrected where noted):
- **B** — `rls_policy_always_true` anon-INSERT tables. **Judgment call — broker rules the sub-batch** (revoke-anon-and-move-to-service-role vs. keep by-design).
- **C** — `function_search_path_mutable`. Routine hardening under standing discipline. **Batch.**
- **D** — `rls_enabled_no_policy` (Info). Fail-closed lockdown; confirm-intent + optional explicit policy. **Batch.**
- **E** — config/policy items (`pg_net`, leaked-password). Non-urgent. **Batch/ack.**

---

## Category B — permissive anon-INSERT policies (5 findings) · **BROKER JUDGMENT CALL**

| Table | Policy | Grants (anon/auth) | Write path | Purpose |
|---|---|---|---|---|
| `geocode_audit_log` | `app insert only` INSERT `WITH CHECK (true)` {anon,auth} | INSERT only | **anon-key SSR server client** (`lib/jurisdiction/geocode/supabaseAuditSink.ts`) | geocode decision audit row |
| `geocode_dispositions` | same | INSERT only | anon-key geocode path (011) | geocode disposition record |
| `classifier_audit_log` | same | INSERT only | classifier audit sink (`lib/chat/classifierAuditSink.ts`), same anon-key server pattern | classifier side-check audit |
| `rate_limit_events` | same | INSERT only | rate limiter (`lib/chat/rateLimitStore.ts`), same pattern | rate-limit event log |
| `manual_review_queue` | same | INSERT only | **`enqueue_manual_review` trigger** (003), `SECURITY INVOKER` → runs as the anon inserter of `geocode_audit_log` | derived review-queue row |

**Exposure (all five):** anon holds INSERT only (no SELECT/UPDATE/DELETE), and `WITH CHECK (true)` lets an anon-key holder append arbitrary rows via `/rest/v1/<table>`. This is **write-pollution**, not a data leak — an attacker could spam the audit logs, inflate `rate_limit_events`, or inject fake `manual_review_queue` items (operational noise / review-queue poisoning). No read exposure; RLS blocks anon reads on all five.

**Why it's a judgment call, not a routine revoke:** the anon-INSERT grant is *load-bearing by design*. The audit sinks write with the **anon-key SSR client** (`supabase/server createClient()`), and `manual_review_queue` is populated by a `SECURITY INVOKER` trigger that runs as that same anon role. A naive `revoke insert from anon` breaks the geocode/classifier/rate-limit write paths and the enqueue trigger (which would roll back the audit row). This is exactly the `USING/WITH CHECK (true)` pattern standing ruling #1 targets — so it shouldn't stay as-is either.

**Recommended remediation (coupled, one design):** move the audit-sink writes from the anon-key SSR client to a **service-role client** (server-side; these are all server/edge/after() writes — no browser caller needs the anon key). Then:
1. The `enqueue_manual_review` trigger (`SECURITY INVOKER`) runs as `service_role`, which already holds INSERT on `manual_review_queue` — **no trigger surgery needed**.
2. Migration revokes anon/authenticated INSERT on all five tables and drops the `app insert only` policies; adds explicit `service_role` INSERT.

This satisfies ruling #1 (revoke rather than falsify), removes the write-pollution vector entirely, and resolves `manual_review_queue` automatically via the trigger's invoker becoming `service_role`. **Cost:** swap the client in ~4 sink modules (`supabaseAuditSink`, `classifierAuditSink`, `rateLimitStore`, geocode-dispositions writer) + one migration. **Pre-req check at fix time:** confirm each sink is server-only (no client-component/browser caller relies on the anon INSERT) — geocode is confirmed server-only; classifier/rate-limit to confirm per-sink.

**Alternative (if the broker prefers minimal churn):** keep the anon-INSERT-only pattern as by-design, document the intent in each table's migration, and accept the linter WARN as an acknowledged exception. Lower effort, leaves the write-pollution vector open. **Engineering recommends the service-role migration.**

**Per-table recommendation:** all five → service-role migration (above). `manual_review_queue` specifically resolves via the trigger-invoker change; no separate handling.

**`manual_review_queue` record-honesty determination (broker's 2026-06-30 anon-leak ruling):** **not a regression.** The 2026-06-30 ruling (`manual_review_queue_aging_view_anon_leak_broker_ruling_2026-06-30`) targeted the **read leak** on the `manual_review_queue_aging` *view* (input_address + review_reason exposed to anon via an owner-run, non-`security_invoker` view). That fix was applied and remains in place — migration `025b_manual_review_queue_aging_view_grant_correction.sql`: view dropped/recreated `security_invoker=true`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT SELECT TO service_role`. The base table's `WITH CHECK (true)` **INSERT** policy is a separate, intentional trigger write-path (anon can INSERT but not SELECT the base table). The anon-leak fix was applied to the view; the base table was left INSERT-only-by-design, not permissive-for-read. **No divergence from the record; nothing for the Phase-3 supplement on this item beyond noting the base-table INSERT will be tightened in the Category-B batch.**

---

## Category C — mutable function search_path (2 findings) · **BATCH (standing hardening)**

| Function | Security | Current | Fix |
|---|---|---|---|
| `refuse_delete_held` | `SECURITY INVOKER` | no `search_path` set | `alter function public.refuse_delete_held() set search_path = public, pg_temp;` |
| `enqueue_manual_review` | `SECURITY INVOKER` | no `search_path` set | `alter function public.enqueue_manual_review() set search_path = public, pg_temp;` |

Both are `SECURITY INVOKER` (not DEFINER), so the injection risk is lower, but pinning `search_path` is the standard hardening and clears the WARN. **Note:** if the broker takes the Category-B service-role path, `enqueue_manual_review` is unchanged in security model (stays INVOKER, runs as service_role); the `search_path` pin applies either way. **No execute-revoke needed** (ruling #2 is DEFINER-only; these are INVOKER). Batch as one migration.

---

## Category D — RLS enabled, no policy (12 findings, Info) · **BATCH (confirm-intent lockdown)**

All 12 have RLS **on** with **no policy** = deny-all for anon/authenticated, service-role/owner only. This is the **correct fail-closed posture**; the linter flags it only because "RLS on, no policy" is indistinguishable from an accidental lockup without written intent.

| Table | Confirmed intent | Note |
|---|---|---|
| `compliance_gates` | service-role only (Category A) | just remediated; now correctly here |
| `magic_link_tokens` | service-role only (redeem is server-side `app/api/magic-link/redeem`) | **residual anon table grants (SELECT/INSERT/UPDATE/DELETE) exist but RLS neutralizes them — revoke for tidiness.** Cross-check against the lane-2 schema ratification (below). |
| `audit_access_grants`, `audit_deletion_incidents`, `audit_exports`, `cliff_runs` | audit-durability tables, service-role/cron only | written by `audit_cliff`/audit paths (postgres/service) |
| `broker_compliance_actions` | broker rulings/actions store, service-role only | confirm write path is service-role/cron (not anon) |
| `city_zip_refresh_runs`, `city_zip_refresh_state` | rent-control cron (2faf60f6), service-role | cron write path |
| `rtc_refresh_run_results` | LA RTC cron (6528bcda), service-role | cron write path |
| `parcel_health_probe_results` | parcel-health cron/edge, service-role | seen writing via edge runtime in API logs |
| `section8_runs` | section-8 monitor, service-role | `scripts/section8_monitor.ts` |

**Remediation (batch):** low-urgency. Two options: (a) leave as deny-all and record the intent here (cheapest — the state is already safe), or (b) add an explicit `service_role`-scoped policy per table so intent is legible in-schema. **Recommend (a) + this table as the written-intent record**, plus a small migration to **revoke the residual anon/authenticated grants on `magic_link_tokens`** (tidiness; RLS already blocks them). No functional change to any path.

---

## Category E — config / policy (2 findings) · **BATCH / ACK**

| Finding | Fix | Note |
|---|---|---|
| `extension_in_public` — `pg_net` in public schema | Move `pg_net` to a dedicated `extensions` schema (or accept Supabase-managed default) | `pg_net` is used by pg_cron HTTP calls (parcel-health/edge invokes). **Moving it can break `net.*` references — flag as its own careful migration or ack-and-defer.** Recommend defer + document (Supabase installs pg_net in public by default; low real risk). |
| `auth_leaked_password_protection` disabled | Enable in Auth settings (HaveIBeenPwned check) | Dashboard toggle, not a migration. Low relevance (Google SSO primary, magic-link secondary, password never-first) but harmless hardening — recommend enable. |

---

## Cron-impact section

Active crons and their Supabase table touch, cross-referenced against the 21 findings:

| Cron | Supabase tables touched | Finding intersection | Impact of B/C/D/E fixes |
|---|---|---|---|
| `0abb46c4` LAHD forms refresh (Mon 09:00 PT, next 2026-07-20) | file-only (`cron_tracking/lahd_forms/*`) + Notion mirror | none | **none** — no Supabase table in scope |
| `2a58382e` CA 3-day statute watch | file-only + Notion mirror | none | none |
| `2faf60f6` rent-control cities | `city_zip_refresh_runs`, `city_zip_refresh_state` (D) | D | none — service-role writes preserved |
| `6528bcda` LA RTC packet refresh | `rtc_refresh_run_results` (D) | D | none — service-role preserved |
| `f3e68a3c` holiday table verification | file-only | none | none |
| parcel-health probe (edge/cron) | `parcel_health_probe_results` (D), `parcel_health_status` | D | none — service-role preserved |
| `audit_cliff_weekly_dryrun` (009) | `cliff_runs` + 8 audit tables | Category A (done) | none — postgres/owner context |
| geocode-audit reconciliation (`app/api/cron/geocode-audit`) | `geocode_audit_log`, `manual_review_queue` (B) | **B** | **verify at B-fix time** — if this cron writes via service-role it's unaffected; the B migration only revokes anon, and service-role is preserved |

**Conclusion:** every cron writes via service-role/owner. The B/C/D/E fixes only revoke `anon`/`authenticated`/`public` and add explicit `service_role` grants — they never touch `service_role`/owner access. **No cron is impacted.** The one item to confirm empirically before applying B: the geocode-audit reconciliation cron and the request-path sinks both land on the service-role client (they do — the sinks are the only thing changing, from anon-key to service-role). **No cron owner coordination required**, per the broker's step-5 criterion (no `REVOKE ... FROM service_role`, no destructive schema change).

---

## Schema-and-persistence lane-2 ratification cross-reference

`schema_and_persistence_lane2_broker_ratification_2026-06-29` documents the intended tables + access patterns for the chat/intake/magic-link surface. The one Category-D table in lane-2 scope is **`magic_link_tokens`**: confirm the ratification's intended access matches the current state (RLS-on-no-policy = service-role only; redeem server-side). If the ratification specified an explicit policy for `magic_link_tokens` that isn't present, that's a divergence for the Phase-3 supplement. The Category-B tables (geocode/classifier/rate-limit/manual-review) are geocode/audit-durability lane, not lane-2 — no lane-2 divergence. **Action:** verify the `magic_link_tokens` line against the ratification during the D batch; record any divergence in `phase3_closeout_ratification_supplement_2026-07-15.md`.

---

## Phase-3 scope summary (for the supplement)

| Finding class | Phase-3 in-scope? | Disposition |
|---|---|---|
| `compliance_gates` (A, done) | No — post-Phase-3 landing (046, 2026-07) | post-Phase-3 hardening miss |
| `audit_cliff` (A, done) | Yes — Phase-3-era (002/008) | Phase-3 hardening gap: shipped SECURITY DEFINER + default PUBLIC EXECUTE before ruling #2 was codified |
| Category B ×5 | Yes — geocode/audit lane (002–012, June) | by-design anon-INSERT pattern predating standing ruling #1; tighten now |
| Category C ×2 | Yes — same era | search_path discipline not applied at creation |
| Category D ×12 | mixed | correct lockdown; `magic_link_tokens` grants cross-check pending |
| Category E ×2 | config | Supabase defaults; not a code defect |

**Process improvement (supplement):** add "run Advisors, paste full findings" to the pre-merge checklist for any Supabase-schema PR + a weekly Advisors review — this class of drift was found by email 18h late, not by CI.

---

## Recommended remediation sequencing (for broker ruling)

1. **Broker rules Category B** — the coupled service-role migration (recommended) vs. keep-by-design. This is the one judgment call.
2. **On the B ruling + C/D/E batch ratification:** engineering drafts `053_category_b_service_role_writes.sql` (+ the ~4 sink client swaps), `054_function_search_path_pins.sql` (C), `055_magic_link_tokens_grant_tidy.sql` + intent record (D), and handles E (pg_net defer + leaked-password toggle) — applied tomorrow morning, each verified + Advisors-rerun, one attestation.
3. **Phase-3 supplement** (`phase3_closeout_ratification_supplement_2026-07-15.md`) records the Phase-3-miss vs. post-Phase-3 findings, the `magic_link_tokens` ratification cross-check result, the `manual_review_queue` no-regression determination, and the CI/weekly-Advisors process improvement.

— Engineering · Step 3 triage brief · 2026-07-15 · for broker ruling on Category B + ratification of C/D/E batches
