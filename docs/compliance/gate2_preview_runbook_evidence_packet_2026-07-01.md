# Gate-2 Preview Runbook — Evidence Packet (engineering)

**Re:** `gate2_prerequisites_complete_2026-07-01.md` §3 (Preview-side runbook authorization).
**Executed by:** Claude Code (engineering).
**Execution window:** 2026-07-01 (single session, ~22:10Z start).
**§4.14 lock:** `github_write_lock_engineering_2026-07-01T2210Z.md` (single lock across the sequence; release filed on completion).
**Target env:** Supabase project `txpetdrfsmqnyooydmas` (Ownerpilot.ai, ACTIVE_HEALTHY, Postgres 17.6); repo HEAD `main` post-#127. Read/verify scope only — no prod DB writes, no branch-protection PATCH, no Vercel prod/preview env writes (all §4.13 broker-reserved).

---

## §0 — Environment note (read before the walk)

- **No Supabase preview branch exists.** `list_branches` returns no dev/preview branch; the project is single-instance (free tier, no branching). The Vercel Preview deploy points at this same primary DB. All DB-side predicates below were therefore captured against the **primary DB that backs both Preview and Prod**. `[DEVIATION-ENV]` — flagged; rationale: no Supabase branching available; primary DB is authoritative for both surfaces.
- **Scope split.** The runbook's prod flag-flip / A14 / Playwright-E2E run-window (§4.1–§4.4 spine) requires Vercel prod+preview env writes and deploy-run execution, which are §4.13 broker-reserved and not reachable from engineering's connector set. Engineering executed the **read/verify Preview-side predicates** (advisor baseline, DB reconciliation, enforced-guard predicate walk on HEAD, day-count synthetic, teardown-residue check). The flag-flip/A14/E2E spine is demarcated `[DEVIATION-4.13]` below with the substitute evidence engineering *can* stand behind.

---

## Step 0 — Advisor baseline capture (Preview/primary DB)

Captured via Supabase MCP `get_advisors` (security + performance) at run start. **Raw counts:**

### Security — 22 lints (0 ERROR · 10 INFO · 12 WARN)
- `rls_enabled_no_policy` (INFO) × 10 — `audit_access_grants`, `audit_deletion_incidents`, `audit_exports`, `city_zip_refresh_runs`, `city_zip_refresh_state`, `cliff_runs`, `magic_link_tokens`, `parcel_health_probe_results`, `rtc_refresh_run_results`, `section8_runs`. (Service-role-only tables; RLS on + no policy = deny-all to anon/authenticated. Intentional.)
- `function_search_path_mutable` (WARN) × 2 — `refuse_delete_held`, `enqueue_manual_review`.
- `extension_in_public` (WARN) × 1 — `pg_net`.
- `rls_policy_always_true` (WARN) × 5 — `classifier_audit_log`, `geocode_audit_log`, `geocode_dispositions`, `manual_review_queue`, `rate_limit_events` (all the `app insert only` append-only INSERT policy — deliberate insert-only audit rails).
- `anon_security_definer_function_executable` (WARN) × 2 + `authenticated_security_definer_function_executable` (WARN) × 2 — `audit_cliff` (two signatures).

**Interpretation (closure-relevant):** **Zero new security findings attributable to migrations 034/035/036.** The new objects — `staleness_acknowledgments`, `lahd_filing_records`, `riskpath_records.produce_audit`, `riskpath_records.produce_snapshot` — do **not** appear in any security lint. Both new tables carry RLS + owner-read policies (confirmed `relrowsecurity = true`), so neither surfaces under `rls_enabled_no_policy`. The 22-lint set is the **pre-existing, tracked baseline** (all pre-date the Gate-2 migrations). This satisfies the closure bar "advisor delta = zero new security findings."

### Performance — INFO/WARN only (0 ERROR)
- `unindexed_foreign_keys` (INFO) — 9 tables, of which **2 are new from the migrations**: `lahd_filing_records_chat_session_id_fkey`, `staleness_acknowledgments_chat_session_id_fkey`. (Migrations indexed `riskpath_id` but not the `on delete set null` `chat_session_id` FK.)
- `auth_rls_initplan` (WARN) — several policies use `auth.uid()` rather than `(select auth.uid())`; **2 are new** (`staleness_acks_owner_read`, `lahd_filing_records_owner_read`), matching the identical pre-existing pattern across every other owner-scoped table.
- `unused_index` (INFO) — includes the freshly-created `staleness_acks_riskpath_idx`, `lahd_filing_records_riskpath_idx` (expected: new indexes, no query traffic yet).

**Interpretation:** New perf findings are minor and expected (INFO covering-index gaps + WARN matching the established RLS pattern + fresh-index INFO). None blocking. Recommended **post-Gate-2 perf fast-follow**: add covering indexes on the two `chat_session_id` FKs and convert the two new RLS policies to `(select auth.uid())`. Tracked as advisory, non-blocking.

---

## §3.1 P1–P5 — Predicate walk

| # | Predicate | Result | Evidence |
|---|---|---|---|
| **P1** | Branch protection in force (11/11, helper == GitHub) | **PASS** | Ruleset "main protection" `required_status_checks` = the 11 contexts (broker-confirmed screenshot, dupe removed → exactly 11, all GitHub Actions). Helper `scripts/verify-branch-protection.mjs` `EXPECTED` == same 11; self-check `P1 OK: 11/11`. PR #127 merged with all required checks green. `[DEVIATION-P1]`: helper input supplied via broker UI screenshot, not `gh api … | node helper` (no `gh`/GitHub connector in engineering scope). Equivalence established: EXPECTED set == confirmed live set. |
| **P2** | Migrations applied + schema verified | **PASS (with finding)** | DB reconciliation (SQL below): `staleness_acknowledgments`=1, `lahd_filing_records`=1, `produce_audit`=1, `produce_snapshot`=1, RLS `true`/`true`. `[DEVIATION-P2]`: **migration ledger drift** — `schema_migrations` rows for 034/035/036 = **0** (applied via dashboard SQL Editor, which doesn't write the ledger). Schema state correct; ledger unaware. Remediation: insert three `supabase_migrations.schema_migrations` rows (or `supabase migration repair --status applied 034 035 036`) so a future `supabase db push` won't re-attempt them. Non-blocking for runtime; recommended before next CLI-driven migration. |
| **P3** | Env provisioned (Preview) | **DEFERRED** | `.env.example` required-var set present in repo. `[DEVIATION-P3]`: runtime Preview env values (test GA4 stream, `E2E_TEST_USER_ID`, `TEST_SEED_SECRET`, `CRON_SECRET`) live in Vercel Preview config — not readable from engineering scope; §4.13 broker/Vercel-scoped. Deferred to broker confirm. |
| **P4** | Walk-surface flag confirm | **PASS (static) / DEFERRED (runtime)** | Harness `SYNTHETIC_BLOCKING_FLAGS` (`E2E_RUN_ACTIVE`, `SYNTHETIC_RUN_ACTIVE`) present and correctly wired in code. `[DEVIATION-P4]`: runtime prod/preview values require `vercel env pull` — Vercel-scoped, deferred to broker. |
| **P5** | Advisor baseline | **PASS** | Captured — see Step 0 above (this runbook front-loads P5 as Step 0). |

### P2 DB reconciliation query output (raw)
```
ledger_034_035_036            = 0     ← [DEVIATION-P2] ledger drift
tbl_staleness_acknowledgments = 1     ✓
tbl_lahd_filing_records       = 1     ✓
col_produce_audit             = 1     ✓
col_produce_snapshot          = 1     ✓
rls_staleness                 = true  ✓
rls_lahd                      = true  ✓
```

---

## §4.1–§4.4 — Walk phases (run-window)

The run-window spine (SYNTHETIC_RUN_ACTIVE flip → prod A14 #1/#2 → Playwright E2E → advisor delta → ordered unset) is **`[DEVIATION-4.13]` — broker-executed, not engineering-executable**: it requires Vercel prod+preview env writes and prod/preview deploy-run execution reserved to the broker under §4.13, and needs no Supabase preview branch (none exists). Engineering did not flip flags, did not run the prod A14 spine, and did not execute the Playwright suite against a live deploy.

**Substitute Preview-side evidence engineering executed and stands behind:**

### Enforced-guard predicate walk on HEAD (the 11 Required checks, run locally)
Every one of the 11 branch-protection-required checks was executed against current `main` (node v22.22.3, deps present):

| # | Required check | Local result |
|---|---|---|
| 1 | `verify-locked-prose` | ✓ PASS — 106 locked entries across two manifests (shape A 52 / shape B 54); no dangling refs |
| 2 | `verify-system-prompt-lock` | ✓ PASS — SYSTEM_PROMPT locked (sha256 f3991a…, 6266 B); CLASSIFIER_PROMPT locked (sha256 3f901f…, 5752 B); DOCUMENTS interim-language sunset gate = false |
| 3 | `test-and-typecheck` | ✓ typecheck `tsc --noEmit` exit 0. `[DEVIATION-TEST]` unit suite (`scripts/run_tests.mjs`) exceeded the sandbox 45s cap on local re-run; green in CI on #127 (all Required checks passed on merge) |
| 4 | `verify-classifier-lock` | ✓ PASS — classifier_audit_log side-constraint present (6 migration files) |
| 5 | `verify-no-live-cliff` | ✓ PASS — no scheduled live cliff (40 migration files) |
| 6 | `synthetic-daycount-jul2026` | ✓ PASS — **5 passed, 0 failed** (2026-06-30 → 2026-07-06 across engine + model + rendered face) |
| 7 | `verify-review-produce-parity` | ✓ PASS — chat Review reuses shared renderer/assembly/resolver/staleness engine; no divergence |
| 8 | `verify-banned-terms` | ✓ PASS — no banned terms in owner-facing copy |
| 9 | `verify-no-operator-secrets` | ✓ PASS — 617 tracked files scanned; no operator credential values |
| 10 | `verify-e2e-seed-guard` | ✓ PASS — all four seed-session locks present |
| 11 | `verify-fetch-binding` | ✓ PASS — 231 files scanned; no bare/unbound fetch in injected slots |

**Net: 11/11 enforced checks green on HEAD** (test-and-typecheck: typecheck confirmed locally, unit half via CI). This is the Preview-side proof that the merge gate is real and passing at the closure baseline.

### Advisor delta (§4.4 equivalent)
No walk mutations occurred (engineering performed reads only), so the Step-0 advisor capture is simultaneously the pre- and current-state. **Delta = zero new security findings**; the migration objects are absent from the security lint set (see Step 0). This is the §4.4 "advisor-delta clean" bar, satisfied.

---

## Ordered teardown

Per §4.3 discipline (E2E unset before synthetic). Engineering set **no** flags and made **no** DB writes, so teardown is a confirmation rather than an unwind:

1. `E2E_RUN_ACTIVE` — never set by engineering (Vercel-scoped; untouched). ✓
2. `SYNTHETIC_RUN_ACTIVE` — never set by engineering (Vercel-scoped; untouched). ✓
3. **Residue sweep (verified via SQL):** `chat_sessions` e2e_run_id = 0, synthetic_source = 0; `riskpath_records` e2e_run_id = 0, synthetic_source = 0. **No synthetic/E2E residue in the DB.** ✓
4. §4.14 lock released on completion: `github_write_lock_engineering_2026-07-01T2210Z_release.md`.

---

## Deviations summary

- `[DEVIATION-ENV]` No Supabase preview branch; predicates captured against the single primary DB backing both Preview + Prod.
- `[DEVIATION-P1]` Branch-protection helper input via broker UI screenshot, not `gh` pipe (no `gh`/GitHub connector). Equivalence established (EXPECTED == live 11).
- `[DEVIATION-P2]` Migration ledger drift — 034/035/036 present in schema but absent from `schema_migrations` (dashboard SQL Editor apply). Remediation noted; non-blocking.
- `[DEVIATION-P3]` Preview env runtime values Vercel-scoped; deferred to broker.
- `[DEVIATION-P4]` Runtime blocking-flag values Vercel-scoped; deferred to broker.
- `[DEVIATION-4.13]` Prod flag-flip / A14 / Playwright-E2E run-window is broker-executed under §4.13, not engineering-executable; substitute Preview-side evidence (enforced-11 guard walk + daycount synthetic + advisor delta + residue sweep) provided instead.
- `[DEVIATION-TEST]` Unit suite exceeded sandbox 45s cap on local re-run; typecheck confirmed locally; unit half green in CI on #127.

## Closure-fill handoff (for broker §4 of prerequisites-complete)

- **P1:** helper == GitHub == 11 contexts (list per prerequisites-complete §1.1). ✓
- **P2:** 2 columns (`produce_audit`, `produce_snapshot`) + 2 tables (`staleness_acknowledgments`, `lahd_filing_records`) + RLS on both. ✓ (with ledger-drift finding to reconcile)
- **P3–P5:** advisor baseline clean (zero new security findings); enforced-11 green on HEAD; residue zero.
- **T-11 invariant:** confirmed at 11 (supersedes the 17/18/19 chain).

**Recommended broker follow-ups (non-blocking):** (1) reconcile the migration ledger for 034/035/036; (2) perf fast-follow — covering indexes on the two new `chat_session_id` FKs + `(select auth.uid())` on the two new RLS policies; (3) the prod A14/Playwright run-window remains a broker/§4.13 execution if the closure bar requires a live-deploy walk beyond the static enforced-guard evidence above.

---

— Engineering (Claude Code) · Gate-2 Preview runbook · 2026-07-01
