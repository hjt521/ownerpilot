# SC-DAYCOUNT-JUL2026 Synthetic — Attestation (fast-follow closeout)

**Re:** `lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md` §4 + §6 [MUST FIX]; `pr_c_lahd_checklist_countersign_broker_ruling_2026-07-01.md` §2 (standing item) + §6 (tracker discipline).
**Filed by:** engineering, 2026-07-01. On `main` at `af897b6` (PR-C #125 merged).

## §1 — What was built

- **`scripts/synthetic/sc_daycount_jul2026.ts`** — the named end-to-end day-count synthetic. Produces the exact defect scenario (Clifton Alexander shape: 5537 La Mirada Ave Unit 202, $6,000, personal service, **served 2026-06-30**) through the production path and asserts, across all three defect classes the ruling §3.5 named:
  1. **Engine:** `computeCompliancePeriod` + `getVerifiedHolidaySet(2026)` → expiration `2026-07-06` (and ≠ the `2026-07-02` defect).
  2. **Model:** `renderNotice(...).model.compliance.expirationFormatted` = the correct face date.
  3. **Rendered face:** `buildNoticeDocumentHtml(model)` contains the correct expiration and **does NOT contain** the `2026-07-02` defect date.
- **Runs on every CI commit (§4):** `.github/workflows/daycount-synthetic.yml` (job `synthetic-daycount-jul2026`) runs on `pull_request` + push to `main`. No database (unlike the A14 preview-DB retry synthetics) — pure produce path. Also `npm run synthetic:daycount:jul2026`.

## §2 — Why a dedicated workflow, not the A14 preview-DB harness

The cover-sheet ruling §4 requires this to "run on every CI commit touching the day-count engine, the holiday tables, or the notice-template renderer." The A14 harness (`a14_503`, `a14_exhaust`) is **preview-DB-gated** (refuses to run without `--preview-db`), so it would NOT run on ordinary CI. SC-DAYCOUNT needs no DB, so it lands as its own always-on workflow — the correct home for "every CI commit." This is the catalogued named synthetic (§6 [MUST FIX]).

## §3 — Relationship to existing coverage

The engine-level unit regression already existed (`computeCompliancePeriod.test.ts` / `intendedServiceDate.test.ts` assert `2026-06-30 → 2026-07-06`; `holidays.test.ts` asserts `2026-07-03`). This synthetic is **stronger**: it asserts the rendered **notice face**, so it also catches a renderer defect that leaves the engine correct but prints the wrong date — the exact end-to-end gap §4.10 prohibits and the original defect exhibited.

## §4 — Evidence

- Synthetic **5/0**. tsc clean. Workflow YAML validates.

## §5 — Tracker + operator

- `deploy_run_e2e_fastfollow_tracker.md` "Non-E2E deferred items" → `SC-DAYCOUNT-JUL2026` marked **DONE**.
- Broker may add `synthetic-daycount-jul2026` to branch-protection required-checks (operator action; not required for merge).
- Cover-sheet ruling §6 [MUST FIX] for the synthetic is closed. (The standing **Clifton Alexander DO NOT SERVE** on the specific already-produced notice remains the broker's to lift per §3.6 — unaffected.)

— Engineering · 2026-07-01
