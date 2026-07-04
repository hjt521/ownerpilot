# Gate-3 Six-Seam Scope — Engineering Countersign (against as-built integration points)

**Re:** `gate3_scoping_2026-07-02.md` §4 (first-cut six-seam scope) + §5 (rule of construction — engineering countersigns each seam against actual route/component/handler files).
**By:** Claude Code (engineering), 2026-07-02. Verified against repo HEAD `main` (post-#127).
**Disposition:** **ALL SIX CONFIRMED as-built. No shape divergence.** Each seam's named integration point exists at the path below; the compliance-critical write path is already covered (server handler + guard + unit test); the residual gap is the deploy-run HTTP→DB round-trip, which is genuinely E2E-only.

---

## Per-seam confirmation

### Seam 1 — PR-B Surface 1: warn on drifted re-produce (409 `stale_notice` + ack UI)
- **Integration point (confirmed):** `app/api/notice/produce/from-chat/route.ts` — returns `409 { error: 'stale_notice', priorRiskpathId, staleness: { reason, changedFields, warning } }` when a prior produce_snapshot has drifted and `acknowledgedStaleness` is not set; client records the ack, then re-POSTs with `acknowledgedStaleness=true`. Ack modal on the client: `components/la-produce-panel.tsx` (also `ReviewScreen.tsx`).
- **Write path covered:** the pre-insert staleness gate (`checkStaleness` from `lib/chat/stalenessCheck.ts`) + the 409 short-circuit are server-side and unit-tested (`stalenessCheck` tests). Also carries the G4 counsel hard-stop (`409 routed_to_counsel`).
- **E2E gap (deploy-run only):** the full browser round-trip — drift a snapshot → receive 409 → render the ratified warning → POST ack → re-POST → succeed. Needs a live deploy + DB; not reachable in unit scope.

### Seam 2 — PR-B Surface 2: dashboard riskpath-row banner
- **Integration point (confirmed):** `components/riskpath/Dashboard.tsx` (staleness banner on the dashboard **list** row). **Ratified shape holds:** there is **no** `/riskpath/[id]` page route — the `[riskpathId]` segment exists only under `app/api/notices/` (API handlers), never as a page. The banner is list-level, as ruled.
- **Write path covered:** read-only surface driven by `GET /api/riskpath` staleness state; render logic in the component.
- **E2E gap:** banner renders from real drifted-record data end-to-end (server state → dashboard render).

### Seam 3 — PR-B Surface 3: `POST /api/notices/[riskpathId]/staleness-ack`
- **Integration point (confirmed):** `app/api/notices/[riskpathId]/staleness-ack/route.ts`.
- **Write path covered:** insert-only append into `staleness_acknowledgments` (migration 035, RLS owner-read verified `true` in the Preview runbook); owner-scoped.
- **E2E gap:** the POST persists an ack row keyed to the right riskpath + the re-produce then succeeds — round-trip only.

### Seam 4 — §5.2 produce-audit: `produce_audit` LA-eligibility write path
- **Integration point (confirmed):** `app/api/notices/[riskpathId]/produce-audit/route.ts` (write) + `app/api/riskpath/route.ts` (per-row LA-eligibility derived from `produce_audit` presence).
- **Write path covered:** `produce_audit jsonb` column (migration 034, verified present on prod); eligibility gate reads presence.
- **E2E gap:** produce → produce_audit written → dashboard reflects LA-eligibility from that signal, live.

### Seam 5 — PR-C Surface 5: LAHD filing-completion tracking (post-serve riskpath row)
- **Integration point (confirmed):** `app/api/notices/[riskpathId]/lahd-filing-record/route.ts` + `lib/riskpath/lahdFilingRecord.ts` (validator, `COVER_SHEET_REVISION='Rev 2.6.2026'`) + the LAHD section in `Dashboard.tsx`. Unit-tested: `lahdFilingRecord.test.ts`.
- **Write path covered:** insert-only append into `lahd_filing_records` (migration 036, RLS owner-read verified `true`); eligibility gated on `produce_audit` presence (LA-only).
- **E2E gap:** mark-filed → row persists → dashboard shows filed state, round-trip.

### Seam 6 — PR-C Surface 6: pre-filled cover-sheet artifact (six blanks preserved)
- **Integration point (confirmed):** `app/api/notices/[riskpathId]/lahd-cover-sheet/route.ts` + `lib/produce/lahdCoverSheet.ts`. Unit-tested: `lahdCoverSheet.test.ts`.
- **Write path covered:** artifact generation is read/derive-only (no new table); the anti-defaulting property (six blanks left empty, never auto-filled) is the compliance-critical invariant and is unit-asserted.
- **E2E gap:** the **rendered** cover-sheet artifact over a live produce preserves the six blanks — the rendered-face assertion (same class of gap the day-count synthetic exists for) that unit tests approximate but a deploy-run confirms end-to-end.

---

## §5 rule-of-construction result

Every seam matches its ruled shape against the actual files — no as-built parity divergence to flag. The one shape assertion worth recording affirmatively: **Seam 2's "dashboard list, no `/riskpath/[id]` route" is correct** — confirmed by enumeration (`app/api/notices/[riskpathId]/` contains only `lahd-cover-sheet`, `lahd-filing-record`, `produce-audit`, `staleness-ack`; no page route on that segment).

**Common thread across all six:** the compliance-critical *logic* (staleness detection, eligibility gating, insert-only append, anti-defaulting) is already covered server-side + unit-tested. What remains is uniformly the **deploy-run HTTP→DB→render round-trip** — exactly the class the Preview E2E harness (E1–E4, Playwright) is built for, and which was deferred pending Preview-DB availability (now green post-Gate-2). So the six seams are correctly scoped as E2E-integration work, not new feature logic.

## Disposition

Engineering **countersigns the six-seam scope as ruled.** No amendment requests. Fork rulings A–G (per §7) can proceed — individually or omnibus — on this countersign. When you open the seam build, each E2E spec lands against its confirmed integration point above and runs Preview-side under the existing E4 locks (never prod, per the run-window countersign Amendment A).

---

— Engineering (Claude Code) · Gate-3 six-seam countersign · 2026-07-02
