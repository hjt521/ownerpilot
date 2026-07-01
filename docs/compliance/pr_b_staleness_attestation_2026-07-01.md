# PR-B — Serve-Time Stale-Facial-Dates Guard (Attestation)

**Re:** `pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md` (Modified Option B+).
**Filed by:** engineering, 2026-07-01. On the §5.2-merged base (`main` at `5cab32f`). Awaiting broker countersign.

## §1 — What was built (per §§3-7)

- **Migration `035_staleness_guard.sql`** — (1) `produce_snapshot jsonb` on `riskpath_records` (Fork 1 → **1A durable persistence**); (2) `staleness_acknowledgments` insert-only child table (`riskpath_id`, `chat_session_id`, `acknowledged_at`, `staleness_reason`, `changed_fields`, `action_taken`) + RLS owner-read. **⚠️ Operator applies to the DB before/with merge.**
- **`lib/chat/stalenessCopy.ts`** — the 3 ratified Tier-A blocks (`chatStalenessWarningAmountChanged`, `chatStalenessWarningFaceChanged`, `chatStalenessAckButton`), flat literals, one `{{changedFields}}` slot, real em-dash. Manifest-appended (§2). EN ratified; ES deferred (§4).
- **`lib/chat/stalenessCheck.ts`** — pure `checkStaleness(current, prior)` reusing the wizard's `evaluateStaleness` UNCHANGED; deterministic reason→copy branch; fills `{{changedFields}}`.
- **Surface 1 (§4.1)** — `from-chat` writes `captureProductionSnapshot(toNoticeFlowData(...))` onto `produce_snapshot` at produce, and **pre-insert** compares the current face against the most-recent prior produced row for the session. On drift + not-yet-acknowledged → **409 `stale_notice`** (no insert). `ReviewScreen` shows the ratified warning + ack button; on ack it POSTs `/staleness-ack` (`proceed_to_reproduce`) then re-produces with `acknowledgedStaleness=true` (**warn-then-require-new-row**, never silent, never hard-block).
- **Surface 2 (§4.2)** — GET `/api/riskpath` returns a per-row `staleness` verdict (current session intake vs the row's `produce_snapshot` via `checkStaleness`). The dashboard renders the same ratified warning banner on a stale row (+ "Review & produce a new notice" link + Dismiss → `/staleness-ack` `dismiss_banner`), and the §4.4 transitional fallback on rows lacking `produce_snapshot`. No new route — banner on the existing dashboard list (smallest surface that fires the guard).
- **§5 acknowledgment** — `POST /api/notices/[riskpathId]/staleness-ack` (owner-scoped, insert-only; validated `action_taken` ∈ {`proceed_to_reproduce`, `dismiss_banner`, `cancel_at_generate`}). Called by both surfaces.
- **CI parity (§3.1)** — extended `verify_review_produce_parity.mjs` (the existing required check, no new branch-protection entry needed): asserts `from-chat` calls `captureProductionSnapshot` unchanged, **writes** `produce_snapshot`, the gate **reads** `produce_snapshot` (durable 1A, not derive-on-the-fly), and `stalenessCheck` reuses `evaluateStaleness`.

## §2 — Manifest count (verified, per §6.4 discipline)

Actual pre-PR-B Shape-A count **43** (verified against the live file — matches the ruling's assumption; no correction needed this time). Post-append **46**. Locked-prose guard PASS (100 across both manifests, no dangling refs).

## §3 — Deviations (as-built parity, §9)

1. **`{{changedFields}}` label source.** The ruling (§6.1) anticipated an engineer-built label mapper. As-built, `evaluateStaleness` already returns human-readable labels ("Amount demanded", "Tenant names", …), so the slot is the joined label list directly — no separate mapper. Shape reconciliation, not a behavior change.
2. **Surface 2 home.** No per-row route (`/riskpath/[id]`) exists; per §4.2 the minimum is a banner on the dashboard list row. Built there.
3. **Surface 2 comparison serviceDate.** `toNoticeFlowData` needs a serviceDate to assemble; `serviceDate`/`serviceMethod` are excluded from `evaluateStaleness`, so a fixed placeholder is used purely to assemble the current `NoticeFlowData` (does not affect the verdict).
4. **ES.** The ruling marks ES PROVISIONAL but provided no ES text; per the Lane 2E entityType precedent, ES is deferred to the general ES pass (EN only shipped) — flagged, not fabricated.

## §4 — Evidence

- **`stalenessCheck.test.ts` 8/0** — identical→fresh; no-snapshot fallback; amount-drift→AMOUNT_CHANGED + amount copy; face-drift→FACE_FIELD_CHANGED + face copy; serviceDate-only change → NOT stale; slot fill.
- **`stalenessAck.test.ts` 7/0** — all three `action_taken`, both reasons, defaults, and rejections.
- **15 lib/chat + lib/riskpath suites / 0 failed** (existing suites hold). **tsc clean.**
- **CI parity guard PASS (extended)** · **locked-prose guard PASS (46)** · **banned-terms clean** (staleness copy + fallback in scope).
- **§7 coverage:** unit (`captureProductionSnapshot`/`evaluateStaleness` reuse via the helper tests; ack validator) is in-repo; the **integration surface-firing tests** (Surface 1 warn on drifted re-produce; Surface 2 banner; ack endpoint writes) are **deploy-run**, same posture as the Group-5 E2E suite — the pure logic + the CI parity guard cover the drift risk for this pass. Flagging, not claiming live coverage.

## §5 — Non-changes

Wizard `evaluateStaleness` / `captureProductionSnapshot` reused verbatim (no wrapping, no field add/remove — §9 anti-defaulting). Wizard `serve-track.tsx` / `notice-flow.tsx` untouched. `produce_audit` untouched. §5.2 produce path untouched except the added Surface-1 pre-insert gate + `produce_snapshot` write.

## §6 — Operator + sequencing (§8)

1. **Apply migration `035`** (DB) before/with merge.
2. Countersign → **PR-B merges**.
3. The extended parity check rides the existing required `verify-review-produce-parity` — no new branch-protection entry.
4. **PR-C** opens on PR-B merge (LAHD checklist + cron, scope unchanged).

— Engineering · 2026-07-01
