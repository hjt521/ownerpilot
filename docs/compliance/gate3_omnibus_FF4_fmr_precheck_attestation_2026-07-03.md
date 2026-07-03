# Gate-3 Omnibus — Lane FF-4 (FMR pre-check) — Build Attestation

**Re:** omnibus §3.3 as amended by `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md` (Option 1 — amount owed vs FMR).
**By:** Claude Code (engineering), 2026-07-03.

---

## §1 — §2.5 attestation checklist (all five green)

| # | Ruling requirement | Result |
|---|---|---|
| 1 | Gate quantity is `amount_of_rent_owed` (asserted against a code path) | ✅ `fmrPreCheck({ bedrooms, amountOwed })` compares **amountOwed** to FMR; tests exercise the Clifton case on amount owed (6000), and the divergence cases prove monthly-rent would give the wrong answer. |
| 2 | Operator `<=` block / `>` pass, boundary tested | ✅ `blocked = amountOwed <= fmr`; `SC-FMR-BOUNDARY-EQUAL` (owed 2903 → BLOCK) + boundary+1 (2904 → PASS) tested. |
| 3 | Locked prose `FMR_HARD_BLOCK_EN` matches Correction B verbatim | ✅ Added to `locked_prose_manifest_phase2_assembly.json` (tier A, hash `9539622bd84170c3…`, `source_determination` = ruling §2.3, `portal_text_verbatim` field). verify-locked-prose PASS (110). Includes new option (3) wait-to-accrue. |
| 4 | Clifton golden (§4.4) passes with corrected assertion (Correction C) | ✅ `SC-CLIFTON`: `amount_owed 6000 > FMR 2903 → pass`, asserting the gate reads amount owed, not contract rent (3000). Full end-to-end §4.4 chain lands in the Wave-4 integration PR; the FMR-quantity assertion is locked here. |
| 5 | Three synthetics from Correction D in the harness + passing | ✅ `SC-FMR-QUANTITY-DIVERGENCE-01` (owed 5600 → PASS), `SC-FMR-QUANTITY-DIVERGENCE-02` (owed 2000 → BLOCK), `SC-FMR-BOUNDARY-EQUAL` (owed 2903 → BLOCK) — named cases in `lib/intake/__tests__/fmrPreCheck.test.ts`, all green. |

## §2 — What shipped
- `lib/intake/fmrPreCheck.ts`: `FMR_LA_TABLE` (0–4 BR, effective 2026-05-21..09-30, verified from portal), `fmrThreshold` (clamps >4 BR to 4 BR), `fmrPreCheck` (block on `amountOwed <= fmr`), `fmrHardBlockMessage` (renders Correction B), and `FMR_PORTAL_TEXT_VERBATIM` pinned per the standing rule.
- `FMR_HARD_BLOCK_EN` locked-prose entry (Correction B).
- `lib/intake/__tests__/fmrPreCheck.test.ts` (18 assertions).
- tsc 0; verify-locked-prose PASS (110).

## §3 — Standing rule (ruling §3) — portal-derived gates
`FMR_PORTAL_TEXT_VERBATIM` is pinned in the module and `portal_text_verbatim` is stored on the manifest entry so the operative quantity/operator/boundary can be diffed against the portal text. A full CI guard that mechanically diffs `portal_text_verbatim` against the code's compare/branch structure is **noted as a follow-up** (engineer's-call per the ruling; it's invasive to do generically) — for now it is enforced by this attestation + the PR-review checklist for FF-*/portal-scope work.

## §4 — Integration dependency (not in this PR)
The **pure gate** is complete. Wiring it into the live flow requires:
- **FF-3 field:** `amount_of_rent_owed` must be captured in intake_state as a field distinct from contract monthly rent (a required field for non-payment cases). Until FF-3 lands, the gate has no owed-amount to read.
- **Produce-gate hook:** call `fmrPreCheck` for `just_cause=non_payment` + 3-day-pay-or-quit at the produce entry (same shape as the W7 DO-NOT-SERVE gate) and return the hard-block message. Folds into the Wave-3 intake/produce wiring + the Wave-4 §4.4 integration test.

## §5 — Broker note-only (ruling §2.4)
Add a §3.3 addendum row to `gate3_status_rollup_2026-07-03.md` §6 recording the quantity correction (amount owed, `<=` boundary) for evidence-trail completeness. Not a wave restart.

---

— Engineering (Claude Code) · Lane FF-4 FMR pre-check (amount-owed ruling) · 2026-07-03
