# PR-A3 §5.2 CORE — Review-Step Client Produce Port (Attestation)

**Re:** `pr_a3_produce_handoff_fork_ruling_2026-07-01.md` (Fork B(ii) client rail-caller + Fork A(iii) client verdict resolution); scope-of-build ruled **Option 2 — Core produce first** (operator, 2026-07-01).
**Filed by:** engineering, 2026-07-01. Opens on the merged base (Lane 2E + §5.1 on `main` at `ae7d723`). Awaiting broker countersign.

## §1 — What was built (LA green path, end-to-end)

- **`lib/chat/reviewProduce.ts`** (new) — the testable client-orchestration core:
  - `buildNoticeDataFromEnvelope` unflattens the §5.1 produce-ready envelope payload into an `IntakeState` and builds the notice model via **`toNoticeFlowData`** — the SAME assembly source the wizard renders from (no defaulting; throws on a missing field).
  - `computeDatesForData` computes the facial compliance dates (shared `computeCompliancePeriod` + verified holidays).
  - `runJurisdictionResolution` (the **wizard's** resolver — Fork A(iii)) resolves the verdict client-side; `routeForVerdict` maps it to a produce route.
  - `planProduce` ties it together with injected `isGateOpen` + `fetchImpl` (production passes `isLaProductionUnblocked` + `boundFetch`).
- **`components/chat/ReviewScreen.tsx`** — the **Generate** button is rewired from the broken GET-navigation (405 against the POST-only route) to: POST `from-chat` → `planProduce` → produce mode. `confirmed_la` → `renderNotice` (shared) → `buildNoticeDocumentHtml` → **`LaProducePanel`** (Fork B(ii): the panel calls the ratified `verify-la` → `la-packet` rail client-side and gates print behind the LAHD acknowledgment). Counsel-route (409) redirects to `/route-to-counsel`.
- **`scripts/ci/verify_review_produce_parity.mjs`** (new) — wizard-parity guard: fails CI if the chat produce path stops reusing the shared `toNoticeFlowData` / `renderNotice` / `LaProducePanel` / `runJurisdictionResolution`, or introduces a divergent renderer. **Recommend adding to the CI workflow + required-checks set** (branch-protection §3.3).

## §2 — Scope boundaries honored (Option 2)

**In scope (built):** client rail-caller wiring (B(ii)); client verdict resolution reusing the wizard resolver (A(iii)); LA green path chat Review → produce → rendered notice; unit + integration tests; branch-routing for the non-green verdicts.

**Routed-but-stubbed (wired, not styled):** `not_la` → stub (`non_la`); `manual_review` → stub (`broker_confirm`); `resolution_failed` / no-address / abort → stub (`unresolved`); gate-closed → stub (`gate_closed`). All route correctly (asserted); the stub is a single minimal "saved your details / come back" surface with a `data-testid` per reason and a TODO citing the fork ruling §5.

**Deferred to fast-follow (fork ruling §5; NOT silently dropped):**
1. **LA produce-audit persistence** — `LaProducePanel.onAudit` is a no-op this pass. The wizard persists `laProduceAudit` (RTC form hashes + LAHD ack timestamp) into flow state; the chat path has no equivalent sink at this boundary (the riskpath record was inserted server-side by §5.1 with `noticeDocumentId: null`). **Requesting broker direction** on persisting the produce audit onto the riskpath record via a produce-audit endpoint. Flagged, captured in code with a TODO — not defaulted.
2. Full stub-branch UX + copy; non-LA (statewide) production; broker-confirm (Decision B) UX; the save-and-resume link (ties to the ratified `chatIntakeCaptureEscalation`).
3. The 4 Playwright green-path traces (Option 2 defers these; unit + integration coverage stands in for this pass).

## §3 — Evidence

- **`lib/chat/reviewProduce.test.ts` 14/0** — envelope → wizard-parity `NoticeFlowData` (`renderNotice` no-throw); facial dates (2026-06-30 personal → 2026-07-06); missing-serviceDate throws (no defaulting); verdict routing for confirmed_la / not_la / manual_review / resolution_failed / gate-closed / no-address; `planProduce` LA green path + gate-closed short-circuits fetch.
- **Wizard-parity guard PASS** — chat Review reuses the shared renderer + assembly + resolver; no divergence.
- **12 lib/chat suites / 0 failed** (existing Lane 2E + scripted-capture suites hold). **tsc clean. banned-terms clean** (stub copy in scope).

## §4 — §1.6 posture

Reusing the wizard's `runJurisdictionResolution` and `toNoticeFlowData` is a **shape reuse**, not a behavioral change: the chat path feeds the same functions the wizard does and consumes the same `BridgeRunResult` / `NoticeFlowData` types (tsc-enforced). No behavioral divergence from the server rail was found. Had one appeared (e.g., the client resolver classifying differently than the server), it would have been a §1.6 escalation, not an as-built-parity reconciliation. Import-path / type-shape reconciliations (if any) are as-built parity per the schema-checkpoint §8 rule of construction.

## §5 — Non-changes

Ratified produce rail (`verify-la`, `la-packet`, `runLaProduceSequence`, `LaProducePanel`) untouched — reused as-is. §5.1 `from-chat` envelope untouched. The wizard (`notice-flow.tsx`) untouched. `toNoticeFlowData` untouched. Send-draft (Group 3) untouched.

On countersign + merge, the fast-follow picks up the §2 deferred items alongside PR-B (omnibus §6 sequencing).

— Engineering · 2026-07-01
