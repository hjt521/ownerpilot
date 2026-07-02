# Gate-3 Slice 1 (PR-B Seams 1–3) — E2E Build Attestation

**Re:** `gate3_slice1_seed_strategy_broker_ruling_2026-07-02.md` (Option A) + `gate3_six_seam_scope_engineering_countersign_2026-07-02.md` (integration points) + `gate3_scoping_2026-07-02.md` §4.
**By:** Claude Code (engineering), 2026-07-02. Repo HEAD `main` (post-#127). Preview-side only, under E4 locks — never prod (run-window Amendment A).

---

## §1 — What shipped

### Seed (Option A, sibling route — keeps each route's schema strict)
`app/api/test/seed-produced-session/route.ts` — creates a **claimed** (`E2E_TEST_USER_ID`), **intake-complete** (`completeIntakeState()`), **non-counsel** session **plus** a prior `riskpath_records` row carrying a **real** `produce_snapshot` built via `captureProductionSnapshot(toNoticeFlowData(...))` — the production capture path, no hand-built object. All four E4 locks (S2 prod-404, S3 `E2E_RUN_ACTIVE`, S4 `TEST_SEED_SECRET`, S7 `z.object({}).strict()`); S5 tags **both** rows with `e2e_run_id` + `synthetic_source='e2e'` so teardown's tag + FK sweep cleans them (run-window §9.2 alignment).

### Guard generalization (standing pattern)
`scripts/ci/verify_e2e_seed_guard.mjs` — rewritten to **iterate every `app/api/test/*/route.ts`** and assert the four locks per file (route-specific failure message). Closes the "unguarded new seed route" hole permanently. S7 asserted generically via `.strict(` (the per-route strict symbol differs — seed-session uses `isCounselRouteTrigger`). Confirmed PASS on **2** routes.

### Three specs (deploy-run, Preview-only)
- `e2e/staleness-reproduce.spec.ts` — **Seam 1**: seed → drift `rent_amount_due` via `PATCH /api/chat/review` → re-produce `409 stale_notice` (asserts `priorRiskpathId`, reason ∈ {AMOUNT_CHANGED, FACE_FIELD_CHANGED}, non-empty `changedFields`, `warning` present) → record ack → re-produce with `acknowledgedStaleness=true` → success.
- `e2e/staleness-dashboard-banner.spec.ts` — **Seam 2**: seed → drift → `GET /api/riskpath` reports the row `staleness.stale` (deterministic API assertion) → cookie-auth the browser → `/riskpath` list shows the banner → **Dismiss** fires `POST /staleness-ack` (`dismiss_banner`) and hides the banner.
- `e2e/staleness-ack.spec.ts` — **Seam 3**: all three `action_taken` values (`proceed_to_reproduce`, `dismiss_banner`, `cancel_at_generate`) persist; foreign (non-owned) riskpath → `404`; invalid enum → `400`.

## §2 — Verification

| Check | Result |
|---|---|
| `verify-e2e-seed-guard` (generalized) | ✓ all four locks on 2 test-seed routes |
| `tsc --noEmit` (main; seed route + libs) | ✓ exit 0 |
| e2e specs typecheck (temp config, path aliases + @playwright/test) | ✓ exit 0 (temp config removed) |
| `verify-locked-prose` | ✓ 106 entries, no dangling |
| `verify-banned-terms` | ✓ |
| `verify-fetch-binding` | ✓ 232 files |
| `verify-no-operator-secrets` | ✓ 617 files |

Note: the `e2e/` dir is excluded from the main tsconfig (as are all existing specs — Playwright transpiles them at runtime); the specs were typechecked separately against a temp config and are otherwise "deploy-run" like `chat-to-produce.spec.ts` et al. Their green pass is Preview-side at deploy-run.

## §3 — Standing-pattern conformance
- Guard iteration over `app/api/test/*/route.ts` is now the standing pattern (broker ruling §"standing patterns") — future test-seed routes are guarded automatically, no fresh ruling.
- Both new DB rows carry `e2e_run_id` → covered by the run-window §9.2 residue sweep and `lib/testing/e2eCleanup` FK teardown.
- No prod surface touched; the seed is 404 in production by S2. Consistent with run-window Amendment A (E2E never runs against prod).

## §4 — Tracker
`gate3_scoping_2026-07-02.md` §4 seam rows: **Seam 1 DONE · Seam 2 DONE · Seam 3 DONE** (specs authored + guards green + tsc clean; deploy-run pass Preview-side).

## §5 — Not in this slice
Seam 4 (produce-audit), Seam 5 (LAHD filing), Seam 6 (cover-sheet) — Slice 2. Their seed strategy (whether this slice's `seed-produced-session` is reused/extended) surfaces at Slice 2 kickoff per the ruling's "not decided."

---

— Engineering (Claude Code) · Gate-3 Slice 1 build attestation · 2026-07-02
