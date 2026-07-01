# Branch-Protection Actual Baseline — 2026-07-01 (reconciliation output, §2.4 step 1)

**Read by:** JT (broker), GitHub web UI (Settings → Rules → Rulesets → "main protection").
**Method:** UI read (no `gh` available on either the sandbox or the user machine; broker connector dismissed). This screen is authoritative for `main`'s enforced required checks.
**Repo HEAD context:** `main` at `24ebf47` (post-#126).
**Governance mechanism:** a **Ruleset** named "main protection" (Active), targeting `main`. **Classic branch protection is NOT configured.**

## Ruleset "main protection" — enabled rules
- Require a pull request before merging ✅
- Require status checks to pass ✅ (Require branches up to date ✅)
- Block force pushes ✅

## Status checks that are required (ACTUAL) — count: 5
1. `verify-locked-prose`
2. `verify-system-prompt-lock`
3. `test-and-typecheck`
4. `verify-classifier-lock`
5. `verify-no-live-cliff`

## Reconciliation verdict — NEITHER Case A nor Case B

The errata §1.1 anticipated pre-daycount 18 (parity Required) or 17 (parity in helper only). **Reality is 5.**

- `verify-review-produce-parity` — **NOT Required** (absent).
- `synthetic-daycount-jul2026` — **NOT Required** (absent; expected pre-execution state ✓).
- **13 checks in the helper's `EXPECTED` list are NOT actually Required on GitHub:**
  `verify-banned-terms`, `verify-analytics-no-pii`, `verify-no-preconsent-analytics`, `verify-mirror-denylist`,
  `verify-broker-confirm-sla-sync`, `verify-normalize-identical-to-resolver`, `verify-geocode-failure-event`,
  `verify-no-operator-secrets`, `verify-edge-core-sync`, `verify-parcel-health-core-sync`, `verify-e2e-seed-guard`,
  `verify-fetch-binding`, `verify-review-produce-parity`.

## §4.12 finding (surfaced to broker — requires a ruling; NOT delegated per errata §1.2)

`scripts/verify-branch-protection.mjs` `EXPECTED` (18, staged to 19) **does not match GitHub reality (5)**. The predraft/amendment/errata "17→18→19" baseline chain is built on a count that was never enforced. This must be reconciled before any PATCH and before the closure artifact's P1/T-17 invariant can assert a number.

**Broker's corrective choice (errata §1.2 — broker's, not delegated):**
- **(a) Bring GitHub UP to the attested set** — PATCH the 13 missing checks (+`synthetic-daycount-jul2026`) onto Required → 19. Enforcement-grade for all authored guards; largest change; every future PR must pass all 19.
- **(b) Correct the helper DOWN to reality** — set `EXPECTED` to the actual 5 (+`synthetic-daycount-jul2026` if the broker wants day-count enforced) → 5 or 6. Smallest change; accepts that only these are enforcement-grade.
- **(c) Curated middle** — add the compliance-critical guards the broker deems enforcement-grade (candidates: `synthetic-daycount-jul2026` day-count face, `verify-review-produce-parity` wizard parity, `verify-banned-terms`, `verify-no-operator-secrets`, `verify-e2e-seed-guard`) and correct the helper to match that set exactly.

**Engineering recommendation:** (c) — enforce the compliance-critical faces (day-count, wizard-parity, banned-terms, operator-secrets, e2e-seed-guard) plus the current 5, and set the helper `EXPECTED` to exactly that set so helper == GitHub. Rationale: (a) makes every advisory guard a hard merge-blocker (some are informational and would create false stops); (b) leaves compliance-critical faces like the day-count regression *not* enforcement-grade, which is the opposite of why the daycount synthetic was built. But this is a compliance call — broker rules.

**Note:** the staged helper edit (`gate2/branch-protection-baseline-19`, `cc380ac`) assumed 19 and is now **premature** — do NOT merge it until the broker rules the corrective set; I'll re-target the helper `EXPECTED` to whatever set the broker chooses.

— Engineering reconciliation · 2026-07-01
