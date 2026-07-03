# PR-A2 Completion Audit — intendedServiceDate wiring + UI

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Governing ruling:** `pr_a_field_placement_b1_supersession_branch_split_broker_ruling_2026-06-30.md` §1, §2, §4 (+ `daycount_defect_workflow_fork_broker_ruling_2026-06-30.md` §2.3 PR-A)
**Finding:** PR-A2 was implemented across prior sessions and is **complete**. This audit verifies every §5 MUST-FIX against as-built code, closes the one genuinely-open item (§4.2 pre-lock), and tombstones two stale B1 test comments (§2.2 orphan cleanup).

---

## §5 PR-A2 checklist — as-built verification

| Ruling item | Requirement | As-built evidence | Status |
|---|---|---|---|
| §1.2 | `intendedServiceDate` a **produce-payload** required field, validator-gated | `app/api/notice/produce/from-chat/route.ts:85–90` — `validateIntendedServiceDate(body.intendedServiceDate)`; 400 on invalid; produce cannot proceed with it unset | ✅ |
| §1.2 / §1.3 | **NOT** on the chat `INTAKE_FIELD` enum (model stays 14 fields) | absent from `lib/chat/intakeSchema.ts` (grep clean) | ✅ |
| §1.2 | Review-step date picker init to **today**, range `[today, today + MAX_LEAD_DAYS]` | `components/chat/ReviewScreen.tsx:62–63` (`today=isoDay(0)`, `maxDate=isoDay(MAX_LEAD_DAYS)`), `:191–192` (`min={today} max={maxDate}`) — agrees with the validator window | ✅ |
| §1.2 | No "skip" path; produce rejects unset | validator rejects missing/null/bad-format (`lib/dates/intendedServiceDate.ts`); UI defaults to today (a valid value) | ✅ |
| §1.2 (req 5) | Real-time recompute via `onChange`, synchronous in the React tree, no server round-trip | `ReviewScreen.tsx:193` (`onChange`→`setServiceDate`), `:47` (`computeCompliancePeriod` in-tree), holidays loaded once on mount | ✅ |
| §1.2 | Playwright test pins real-time recompute | `e2e/intended-service-date-recompute.spec.ts` — changes the picker, asserts `expiration-display` updates same render cycle | ✅ |
| §2.2 | `renderNotice.ts` `Dated:` prints `intendedServiceDate`, cited comment | `lib/produce/renderNotice.ts:559–568` (cited B1-supersession comment), `:639` (`Dated:` from `dateOfService`=`data.serviceDate`) | ✅ |
| §2.2 | `gates.ts` g2 collapses to no-op, cited comment | `lib/flow/gates.ts:483` (g2 no-op with facial-coherence citation) | ✅ |
| §2.2 | `renderNotice.test.ts` triple-pin + no-divergence invariant | `lib/produce/renderNotice.test.ts:211–229` — Dated prints service date not signing; audit `signing_date == date_of_service`; `model.signature.datedFormatted` == formatted service date | ✅ |
| §2.2 (Jun30→Jul6) | intake-to-produce day-count pin | `lib/dates/computeCompliancePeriod.test.ts` §9 (Branch-1 regression: Jun 30 2026 → Jul 6) | ✅ |
| §2.2 | grep B1 references → update or tombstone | live code clean; two **test** fixtures (`advancement.test.ts:39`, `gates.v4.test.ts:43`) carried stale `// B1: execution date` comments → **tombstoned this PR** | ✅ (this PR) |
| §4.1 | `intendedServiceDateExplainer` locked-prose entry in manifest, guard-asserted | already present in `locked_prose_manifest.json` (constant `intendedServiceDateExplainer`, hash `62872b7c…`); rendered at `ReviewScreen.tsx:202`; guard PASS | ✅ |
| §4.2 | `serve_time_stale_facial_dates_guard_block` pre-locked (PR-B copy, "lock now") | **added this PR** as Shape-B entry in `locked_prose_manifest_phase2_assembly.json` (hash `d6684b26…`); no call site yet (serve-time logging is PR-B) — pre-lock per §4.2 intent | ✅ (this PR) |

## Changes in this PR

1. **§4.2 pre-lock** — added `serve_time_stale_facial_dates_guard_block` (Shape-B, value-in-manifest) so PR-B's serve-time guard does not stall on copy review when it lands. Verbatim from ruling §4.2; single-brace `{intendedServiceDate}` / `{actualServiceDate}` tokens, consistent with Shape-B convention. No code reader yet (intentional — PR-B wires it).
2. **§2.2 orphan tombstones** — the only remaining B1 references were two test-fixture comments (both fixtures already use `signing == service`, so the "distinct execution date" comments were stale). Updated to cite the supersession.

## What this audit did NOT change

- No production code touched — the wiring, UI, validator, and render path were already implemented and are unchanged.
- Did not re-open field placement, the B1 supersession semantics, or the g2 no-op — all verified in place.
- §4.2's copy is pre-locked only; no serve-time logging feature is built here (that is PR-B).

## Verification

`tsc --noEmit` clean · locked-prose PASS (125 entries: 63 Shape-A / 62 Shape-B) · touched-tree test suites green · banned-terms OK.

**Conclusion: PR-A2 (task #82) is complete.** The remaining downstream item is PR-B (serve-time staleness guard), which now has its §4.2 copy pre-locked and ready.

---

— Engineering (Claude Code) · PR-A2 completion audit · 2026-07-03
