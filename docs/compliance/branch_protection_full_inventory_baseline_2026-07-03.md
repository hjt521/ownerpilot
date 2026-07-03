# Branch-Protection Full-Inventory Baseline — 2026-07-03

**Supersedes:** `branch_protection_baseline_2026-07-03.md` (route-body-parse add) and `branch_protection_actual_baseline_2026-07-01.md` (kept for history).
**Purpose (Wave-1 §3.9):** complete the branch-protection refresh — enumerate **every** CI workflow job, map each to its exact Required-status-check name, reconcile against the helper's `EXPECTED`, and give the broker one authoritative apply-list. Closes the recurring "advisory-vs-required drift" finding (§4.12, 2026-07-01) by inventorying the *whole* set rather than one check at a time.
**By:** Engineering (Claude Code), 2026-07-03. Repo HEAD `main`.
**Governance:** `main` is protected by a **Ruleset** ("main protection", Active). The live Required set is readable **only in the GitHub UI** (Settings → Rules → Rulesets → "main protection"); engineering has no `gh`. **Applying Required-check changes is a §4.13 broker-executed action.**

---

## §1 — Complete workflow-job inventory (20 jobs)

Every job below runs on `pull_request` + `push`. The **check name** column is the exact string to select in the ruleset's Required list (job id, verbatim from `.github/workflows/*.yml`).

| # | Workflow file | Check name (job id) | Guard purpose | Tier |
|---|---|---|---|---|
| 1 | `ci.yml` | `test-and-typecheck` | `npm test` + `tsc --noEmit` + edge tsc | **Required** |
| 2 | `locked-prose-lock.yml` | `verify-locked-prose` | locked-prose hash/drift + guard self-test | **Required** |
| 3 | `system-prompt-lock.yml` | `verify-system-prompt-lock` | system-prompt + documents-sunset + classifier-prompt locks | **Required** |
| 4 | `verify-classifier-lock.yml` | `verify-classifier-lock` | classifier audit carries no input text | **Required** |
| 5 | `verify-no-live-cliff.yml` | `verify-no-live-cliff` | no live-cliff schedule | **Required** |
| 6 | `banned-terms-lock.yml` | `verify-banned-terms` | no banned terms in owner-facing copy | **Required** |
| 7 | `verify-no-operator-secrets.yml` | `verify-no-operator-secrets` | no operator secrets in repo | **Required** |
| 8 | `e2e-seed-guard-lock.yml` | `verify-e2e-seed-guard` | every `app/api/test/*` seed route keeps 4 locks | **Required** |
| 9 | `fetch-binding-lock.yml` | `verify-fetch-binding` | fetch-binding lock | **Required** |
| 10 | `review-produce-parity-lock.yml` | `verify-review-produce-parity` | wizard↔produce parity | **Required** |
| 11 | `daycount-synthetic.yml` | `synthetic-daycount-jul2026` | day-count regression synthetic | **Required** |
| 12 | `route-body-parsing-lock.yml` | `verify-route-body-parsing` | no `req.formData()` without `readRequestBody` | **Required (07-03 add)** |
| 13 | `analytics-no-pii-lock.yml` | `verify-analytics-no-pii` | no PII in analytics events | advisory → **promote** |
| 14 | `preconsent-analytics-lock.yml` | `verify-no-preconsent-analytics` | no analytics mount before consent | advisory → **promote** |
| 15 | `verify-geocode-failure-event.yml` | `verify-geocode-failure-event` | geocode failure events carry no user content | advisory → **promote** |
| 16 | `mirror-denylist-lock.yml` | `verify-mirror-denylist` | A15 mirror denylist | advisory → **promote** |
| 17 | `normalize-identical-lock.yml` | `verify-normalize-identical-to-resolver` | normalize == resolver (no silent divergence) | advisory → **promote** |
| 18 | `sla-sync-lock.yml` | `verify-broker-confirm-sla-sync` | broker-confirm SLA copy in sync | advisory → **promote** |
| 19 | `verify-edge-core-sync.yml` | `verify-edge-core-sync` | rtc-refresh edge core mirror in sync | advisory → **promote (monitor)** |
| 20 | `verify-parcel-health-core-sync.yml` | `verify-parcel-health-core-sync` | parcel-health edge core mirror in sync | advisory → **promote (monitor)** |

## §2 — Helper `EXPECTED` after this refresh (12)

`scripts/verify-branch-protection.mjs` `EXPECTED` now lists rows **1–12** (added `verify-route-body-parsing`, the pending 07-03 §4 engineering follow-up). The helper is a runbook tool (`gh api …/branches/main/protection | node scripts/verify-branch-protection.mjs`), not a CI job, so this change is inert until run. It will report `missing: verify-route-body-parsing` until the broker adds it to the ruleset — which is the correct drift signal.

## §3 — Recommendation: promote the 8 advisory checks → Required = all 20

**Engineering recommendation: make every CI guard merge-blocking.** An advisory guard that runs but does not block is precisely the false-assurance failure mode the §4.12 finding named — a PR can merge red and no one is stopped. Rows 13–18 are compliance/correctness guards (PII, consent, privacy-in-events, content denylist, resolver parity, SLA copy) whose whole value is prevention; there is no reason to run them without enforcing them. Rows 19–20 (edge-core mirror sync) are deterministic but do a `build + git diff`, so they are the only two with any flake surface if the build toolchain drifts — recommend promoting them too and **monitoring** the first few runs.

If the broker prefers a curated middle instead of all-20, the priority order for promotion is: **14, 13, 15** (consent/PII/privacy — highest exposure) → **17, 16, 18** (correctness/content/copy) → **19, 20** (mirror sync, monitor).

## §4 — New guarded surface this cycle (no new Required check needed)

The FF-3 work added `app/api/test/seed-ff3-session/route.ts`. It is **already covered** by the existing Required check `verify-e2e-seed-guard` (row 8), which iterates *all* `app/api/test/*` routes shape-based and asserts the four locks — no new Required check is needed. Confirmed: the guard now passes over **3** seed routes. This is the shape-based-iteration pattern working as designed.

## §5 — Broker apply-list (§4.13)

1. Open Settings → Rules → Rulesets → **"main protection"** → Require status checks to pass.
2. Record the **current live** Required set here (fills the long-standing "helper can't read GitHub" gap).
3. Ensure rows **1–12** (§1) are all present; **add `verify-route-body-parsing`** if not already there.
4. Adopt §3: add rows **13–20** (recommended: all; minimum: the §3 priority order). Confirm each check name matches §1 exactly.
5. Tell engineering the final adopted set → engineering aligns `verify-branch-protection.mjs` `EXPECTED` to it (helper == GitHub) and this doc's §2 is updated to match.

---

— Engineering (Claude Code) · Wave-1 §3.9 branch-protection full-inventory refresh · 2026-07-03
