# FF-3 Migration-042 Co-Batch — Build Attestation — 2026-07-10

**By:** Engineering (Claude). **Authority:** BROKER STANDING ORDER 2026-07-03 §1–§6 + the 042-window opening
(2026-07-10). **Countersign requested** on the three forks in §4.
**Design executed:** `ff3_migration_042_cobatch_implementation_design_2026-07-03.md` (turnkey spec).

## §0 — Window status
Today is 2026-07-10; the migration-042 VALIDATE window is open. This attestation covers the built + verified code
half of the single-PR co-batch. **The 042 VALIDATE and the compliance_gates migration are broker-executed in
Studio and remain gated on the §1 precondition.**

## §1 — Execute-time precondition (BROKER TO CONFIRM before running 042 VALIDATE)
Migration **042** VALIDATEs the six FF-3 CHECK constraints added **NOT VALID in 041**. Per the 042 header + the
standing rulings, this runs only once **041 has soaked ≥7 days** in prod. The window math (041 applied ~07-03 +
7 days) points to today, but the actual prod apply date is broker knowledge. **Do not run 042 VALIDATE until the
041 soak is confirmed.** VALIDATE is non-locking (SHARE UPDATE EXCLUSIVE); NULL rows pass; only populated rows
enforce. Early VALIDATE remains denied.

## §2 — What was built + verified (single PR)
| # | Item (design ref) | File(s) | Status |
| --- | --- | --- | --- |
| 1 | Migration 042 VALIDATE (§1 of design) | `supabase/migrations/042_ff3_validate_constraints.sql` | pre-existing; broker-executed after §1 soak confirm |
| 2 | Produce-gate chain harness (§2) | `lib/intake/produceGateChain.ts` | built; canonical order reconcile→FMR→W6→W2, short-circuit, prerequisite_incomplete=defect; tsc clean |
| 3 | FF-4 FMR `verbatim_hash` retrofit (§6) | `lib/intake/fmrPreCheck.ts` | built; `FMR_PORTAL_TEXT_VERBATIM_HASH` + `evaluated_at`/`verbatim_hash` on result; FMR tests still pass |
| 4 | Locked-prose entries 13 + 14 (§4) | `docs/compliance/locked_prose_manifest_phase2_assembly.json` | added Shape-B; guard PASS at **127**; hashes below |
| 5 | `compliance_gates` migration (§5) + reconciliation_resolution col (§3) | `supabase/migrations/046_compliance_gates.sql` | authored; additive; broker-executed in Studio |
| 6 | Reconciliation call-site pure logic (§3) | `lib/intake/reconciliationCallSite.ts` | built + tested: entry-14 card builder, (1)/(2)/(3)→next-state, flag-gated runner (no-op when FF3 off), compliance_gates payload |
| 7 | Chain/call-site tests + reconcile synthetics (§7) | `lib/intake/__tests__/produceGateChain.test.ts` | pass; SC-FF3-AMOUNT-RECONCILE-{MATCH,NO-LEDGER,MISMATCH} + FMR/W6/W2 coverage |

Locked-prose hashes (engineering computes hashes only; broker authored the prose):
- `chatFf3ResumeAfterBrokerReviewCard` (entry 13) — `11d9d634d319bd9f5047dd2c83504bc18cc2473148364f270537c538ffc0b6f5`
- `chatFf3AmountReconciliationFlag` (entry 14) — `20a29e875f2cfc9aef574edd936773e164171ce2d246a36ec0b7da94d9d32009`

## §3 — Verification
- `tsc --noEmit`: clean (exit 0).
- `produceGateChain.test.ts`: all checks pass (chain order, short-circuit, defect fail-close, three reconcile
  synthetics, FMR applicability/block + verbatim_hash, W6 block/defect, W2 pathway, call-site selections + card +
  flag no-op + persistence rows).
- `fmrPreCheck.test.ts`: pass (§6 retrofit non-breaking).
- `ci:verify-locked-prose`: PASS — 127 entries, no dangling references.
- `check_banned_terms` + `check_attorney_attribution`: OK.

## §4 — Countersign forks (broker)
1. **Entry-13 text.** The 07-04 omnibus §Item 10 said "engineer drafts for countersign," but the resume-card copy
   was already broker-authored in `ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md` §2.2. I
   used that ratified text verbatim (manifest rule: broker authors prose, engineering hashes only). **Confirm this
   is the intended entry-13 copy**, or supply a diff.
2. **041 soak** (§1) — confirm before 042 VALIDATE.
3. **Wave-4 synthetic additions.** Per omnibus §Item 11, the 4 W2 + 5 FF-4 call-site synthetics are ratified for
   the catalog. The three reconcile synthetics + FMR/W6/W2 coverage are exercised in the chain test here; **ratify
   the remaining call-site + W2 catalog additions with this batch** (or flag any that need harness changes).

## §5 — Gating that stays in force (design §8)
- The whole chain is a **no-op until `FF3_CAPTURE_ENABLED`** (Preview only; separate ruling for prod). Verified:
  `runGatedProduceChain` returns null when the flag is off.
- Nothing here changes prod produce behavior until FF-3 flag-on.
- **Remaining seam (not in this batch, lands at FF-3 Preview activation):** the chat/produce route dispatch that
  calls `runGatedProduceChain`, inserts the `toComplianceGateRows` payload, and writes
  `chat_sessions.reconciliation_resolution` on owner selection. Pure logic + payloads are complete + tested here;
  the route + Supabase writes wire when FF-3 is activated in Preview (gated behind the broker-side
  `awaiting_broker_review` resolution surface, per countersign §2.3).

## §6 — Broker-executed steps (after §1 soak confirm)
1. Studio: run `042_ff3_validate_constraints.sql` (VALIDATE the six FF-3 constraints).
2. Studio: run `046_compliance_gates.sql` (additive table + reconciliation_resolution columns).
3. Merge the co-batch PR (all guards green).

— Prepared for Broker Compliance Review · Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
· 2026-07-10
