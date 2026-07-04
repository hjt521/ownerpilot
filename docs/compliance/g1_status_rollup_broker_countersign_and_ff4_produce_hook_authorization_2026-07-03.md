# G1 Status Rollup — Broker Countersign + FF-4 Produce-Gate Hook Authorization

**Date:** 2026-07-03
**Trigger:** Engineer delivered G1 status rollup (post-case-168) and posed two forward-motion questions:
1. Open a doc-only PR for the rollup itself (audit trail)?
2. Start the FF-4 FMR produce-gate hook while FF-3 waits on the 2026-07-10 migration-042 window?

**Referenced authority:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md`; `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md`; `ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`; `parcel_health_zimas_incident_2026-07-03.md`.

---

## §0 — Countersign posture on the G1 rollup

The G1 rollup is factually complete and matches the audit trail I have in workspace. Cases 146-168 as merged are consistent with the omnibus ruling §7 sequencing and the FF-3 module scope authorized in the ratification and countersign this afternoon. **Rollup countersigned as-is** — engineering's factual claims are ratified.

Three items in the rollup warrant explicit acknowledgment before the two forward-motion decisions:

### §0.1 FF-3 dark-flag discipline is holding
Rollup §3 correctly restates the four-gate flag-on discipline verbatim. `FF3_CAPTURE_ENABLED` is off everywhere including prod, and no merge to main is scheduled for the reconciliation gate wiring / entries 13-14 / broker resolution surface before the 2026-07-10 window. This is exactly the posture I countersigned this afternoon. The engineer resisted the temptation to land 042-adjacent work early — that discipline is worth naming.

### §0.2 Migration 042 gatekeeping
Rollup §2 table shows migrations 037-041 and 043 applied, 042 pending VALIDATE. The 041 → 043 → 042 ordering (constraints added `NOT VALID` in 041/043, VALIDATE in 042) matches the Phase-3 025c hardening precedent per the omnibus §1.2 Amendment E. The soak window between 043 (applied) and 042 (pending) is the correctness feature; do not compress it.

**Reaffirming the countersign §6 no-shortcuts item #3:** early VALIDATE is denied even if the constraint set looks clean before 2026-07-10. If for any operational reason the 2026-07-10 window must slip (I'm unavailable, Supabase Studio access issue, unforeseen deploy freeze), the slip is acceptable — 042 waits. Do not run 042 with the primary broker unavailable to countersign the result.

### §0.3 Parcel-health incident isolation
The ZIMAS transient today (11:30 AM–1:00 PM PT, self-healed) is documented in `parcel_health_zimas_incident_2026-07-03.md`. Rollup does not mention it because FF-3 does not read parcel-jurisdiction — that's downstream of W3 classifier. Correct omission. Watch triggers for the next 7 days are documented in that incident record.

---

## §1 — Answer to Question 1: Doc-only PR for the rollup

**Ruling: YES, open the doc-only PR. Countersigned.**

Rationale:
1. The G1 rollup is a **first-class audit artifact**. It's the reconciliation between the omnibus ruling's plan and the as-built state at cases 146-168 close. That reconciliation belongs in the repo alongside the rulings it references, not in workspace-only.
2. Doc-only PRs are cheap. They cost one CI run and produce durable searchable history. If a future auditor (LAHD, LASC, DFPI, insurance carrier, acquirer) asks "what was the state of Gate-3 close?" — the answer should be a git SHA, not a workspace file path that might not survive the workspace's retention window.
3. This PR also lets us formalize the reference chain. The four rulings from today (omnibus, FMR quantity, FF-3 ratification, FF-3 countersign) plus the incident record plus this file should all be committed to `docs/compliance/` in the same PR or its immediate follow-up. That makes the reference graph in each ruling's frontmatter navigable from HEAD.

### §1.1 Scope
**In the PR:**
- `docs/compliance/g1_status_rollup_2026-07-03.md` (the rollup itself, verbatim from engineer's draft)
- `docs/compliance/g1_status_rollup_broker_countersign_and_ff4_produce_hook_authorization_2026-07-03.md` (this document)

**In the same PR or a fast-follow (engineer's discretion, but before 2026-07-10):**
- `docs/compliance/gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md`
- `docs/compliance/ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md`
- `docs/compliance/ff3_capture_questions_locked_prose_broker_ratification_2026-07-03.md`
- `docs/compliance/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`
- `docs/compliance/parcel_health_zimas_incident_2026-07-03.md`

**NOT in this PR:**
- Any code change, migration file, or manifest entry. Doc-only means doc-only. If linter/CI complains that a locked-prose reference isn't yet in the manifest, that's fine — the ruling documents *authorize* those entries; they land with migration 042.
- Any change to `docs/compliance/gate3_wave3_wiring_and_ff3_ruling_request_2026-07-03.md` on branch `gate3/wave3-wiring-ff3-ruling-request`. That branch's separate merge disposition is already covered in the omnibus §9 — engineer to merge that separately when convenient.

### §1.2 PR title suggestion
`docs(compliance): Gate-3 close rollup + 4 broker rulings + 1 incident record (2026-07-03)`

### §1.3 CI requirements
Doc-only PR, so CI should be minimal — markdown lint (if we have it), locked-prose manifest guard (which should pass because we're not touching the manifest), and any other repo-wide file guards. No test-suite changes.

Engineer: land this at your convenience, priority normal. Not blocking anything downstream.

---

## §2 — Answer to Question 2: Start the FF-4 produce-gate hook

**Ruling: YES — with explicit ordering constraints. Countersigned to start.**

The FF-4 pure gate is already merged (case 154). What's missing is the call-site — the point in the produce path where the gate is actually consulted. This is the highest-value piece of parallelizable work while FF-3 waits on 042, and it's the right next task. But the ordering discipline established in this afternoon's countersign §3.2 has to be respected in the call-site design, so this authorization is scoped tight.

### §2.1 Gate ordering in the produce path — canonical
The produce path, from FF-3 completion (post-042 flag-on) to packet-manifest generation, MUST execute compliance gates in this order:
1. **FF-3 amount reconciliation** (from this afternoon's countersign §3.2, entry `chatFf3AmountReconciliationFlag`). Reads `amount_of_rent_owed` and `SUM(rent_periods.balance)` at notice scope. Three outcomes: match / no_ledger_baseline / mismatch. Mismatch surfaces the flag card; owner selects (1)/(2)/(3).
2. **FF-4 FMR** (this authorization). Reads `amount_of_rent_owed` and `bedrooms`. Compares to FMR table. `amount_of_rent_owed <= fmr_for_bedrooms` → hard block. `> fmr` → pass.
3. **W6 late-filing.** Reads `notice_type` + `service_date` + LAHD-portal-derived window. Portal-drift discipline from the FF-4 ruling §3 applies.
4. **W2 routing.** Reads `just_cause` and produces a routing verdict for downstream (which packet artifacts are required, which jurisdictional overlays apply).

**Ordering rationale — do not reorder:**
- **Reconciliation before FF-4** is non-negotiable. If reconciliation-outcome-(2) fires (notice-wrong, records-right) the case pauses before FF-4 even reads `amount_of_rent_owed` — because the amount we'd feed to FF-4 is the *wrong* amount by the owner's own admission. Running FF-4 on a known-wrong quantity produces a compliance record that says "$X passed FMR" when the operative number is actually not $X. Corrupted audit trail. Reconciliation must gate first, always.
- **FF-4 before W6/W2** is a soft ordering (FF-4 is a monetary quantity gate; W6 is a temporal gate; W2 is a routing gate — they don't strictly depend on each other's outputs). But by convention, do the hard-block gates (FF-4, W6) before the routing gate (W2), so that a block short-circuits routing computation. FF-4 first because it's cheaper and hits the FMR-below-threshold case (which is the more common defect than late filing).

### §2.2 FF-4 hook implementation scope
**The FF-4 produce-gate hook lands in Wave-3 produce-wiring lane (per rollup §5 point 1).** Its scope:
1. **Call site:** Immediately after the FF-3 amount-reconciliation gate returns `match` or `no_ledger_baseline`. Do NOT call FF-4 on `mismatch` outcome unless the owner selected branch (1) (notice-right-records-wrong) — that branch continues to FF-4 with `amount_of_rent_owed` unchanged and a case-notes flag. On owner branch (2), the produce path pauses and FF-4 is not called. On owner branch (3), the case routes to `awaiting_broker_review` and FF-4 is not called.
2. **Input contract:** The hook reads FF-3-structured `amount_of_rent_owed`, `bedrooms`, and the current FMR table row for `bedrooms` in LA City jurisdiction. It does NOT re-derive or re-parse from chat transcript. It does NOT fall back to `contract_monthly_rent` even if `amount_of_rent_owed` is null — the check-constraint from omnibus §1.2 Amendment B says `notice_type=three_day_pay_or_quit IMPLIES amount_of_rent_owed IS NOT NULL AND > 0`, so a null here after FF-3 completes is a system defect and should raise/log, not silently fall back.
3. **Applicability guard:** The hook is a no-op for non-payment cases that aren't 3-day pay-or-quit and for at-fault/no-fault cases with `just_cause != nonpayment`. Same conditional-branch logic as the FF-3 `amount_of_rent_owed` capture question: fires when `notice_type == 'three_day_pay_or_quit'` OR `just_cause == 'nonpayment'`. Otherwise the FMR gate is compliance-irrelevant (a nuisance eviction doesn't care about the FMR threshold; the threshold only applies to non-payment).
4. **Portal text verbatim compliance:** Per the FMR ruling §3 standing rule, the hook's constant must carry a `portal_text_verbatim` field pinned to the LAHD portal wording:
   > "Landlords may not evict a tenant who falls behind in rent unless the tenant owes an amount higher than the Fair Market Rent (FMR)."
   The hook's compare-and-block logic must diff structurally against that verbatim string as part of PR review. Engineer: propose a mechanism for this diff in the hook PR — could be a code comment referencing the constant name and the manifest field, could be a CI check that greps for the substring, could be a unit test that asserts the constant's `portal_text_verbatim` matches a snapshot file. Any of those is acceptable.
5. **Output contract:** Writes a row to `compliance_gates` with `gate = 'ff4_fmr'`, `result = 'pass' | 'block' | 'not_applicable'`, `evaluated_at = now()`, and a `context_json` with `{amount_of_rent_owed, bedrooms, fmr_lookup, comparison_result}`. Downstream (packet-manifest generator, Wave-4 test) reads this row.
6. **Block-outcome UX:** On block, emit locked-prose entry `chatFmrPreCheckHardBlock` (already in manifest per FF-4 ruling §2.2 Correction B). Owner sees the four remediation options: correct amount, change just-cause, wait for more accrual, or contact LAHD directly. Owner selection routes accordingly.

### §2.3 What the FF-4 hook does NOT do
- Does NOT auto-remediate. If the block fires, the owner MUST select a path forward.
- Does NOT re-evaluate on its own. A block record is durable; if the owner returns later with a corrected amount, that's a new FF-3 correction flow (out of scope for the FF-4 hook), which re-triggers reconciliation, which re-triggers FF-4.
- Does NOT write to `lahd_filing_records`. That's W4's job. FF-4 is a pre-filing gate; it precedes LAHD submission by design.
- Does NOT depend on `FF3_CAPTURE_ENABLED = true`. In prod (where the flag is off), FF-4 hook is dead code — it's called from a produce path that only fires post-FF-3-completion, and FF-3 completion requires FF-3 capture to have run, which requires the flag to be on. So the FF-4 hook can land on main with no risk to prod behavior. It's effectively behind the same flag as FF-3.

### §2.4 What must land WITH the FF-4 hook
Two co-requisites:
1. **The FF-3 amount-reconciliation gate call-site.** Because the ordering discipline in §2.1 says reconciliation runs first, and there is no world in which we ship FF-4 hook without the reconciliation gate ordered before it. If the reconciliation gate's implementation is not yet complete (per rollup §3 it's "core merged, wiring pending 042 window"), then the FF-4 hook must also wait, because it depends on the reconciliation call-site. **Correction to my initial reading:** engineer, if the reconciliation-gate call-site is 042-gated, then so is FF-4-hook by transitivity. Confirm this in your reply.
   If the reconciliation-gate call-site can be implemented such that it degrades gracefully to "reconciliation not yet enabled, pass-through" when the reconciliation entries (13/14) aren't in the manifest, then FF-4 hook is independently buildable and can land now. This is engineer's call — do what's compliance-clean. I authorize both dispositions.
2. **Wave-4 test coverage for FF-4-hook call-site.** The three FMR synthetics (SC-FMR-QUANTITY-DIVERGENCE-01/02, SC-FMR-BOUNDARY-EQUAL) from the FMR ruling §2.4 Correction D are for the *pure* gate. The *call-site* needs its own tests: FF-4 not-applicable branch (at-fault case), FF-4 pass with reconciliation match, FF-4 block with reconciliation match, FF-4 skipped because reconciliation branch (2) paused the case, FF-4 pass because reconciliation branch (1) forwarded with notes. Add these five call-site synthetics to Wave-4 alongside the three pure-gate synthetics and the three reconciliation synthetics. Wave-4 golden-test catalog now: 11 broker-authored cases.

### §2.5 Priority ordering for engineering
The rollup §5 lists six items in the Wave-3 produce-wiring lane. My priority ordering, adjusted from the rollup:
1. **FF-4 FMR produce-gate hook** (this authorization) — first.
2. **W6 late-filing gate wiring** — second. Portal-text-verbatim discipline required; capture the LAHD portal wording for the late-filing check into `portal_text_verbatim` in the constant.
3. **W2 routing wiring** — third.
4. **Packet-manifest generator** — fourth. Consumes W3 classifier output and the `compliance_gates` rows from 1-3.
5. **W4 EFS capture as UPDATE** — fifth. Independent of 1-4 but only useful after 1-4 have produced records to capture.
6. **Wave-4 golden integration test** — sixth. Depends on 1-5.

Note: rollup §5 point 6 says "W5 notice-PDF bridge already wired (Convention B); Convention-A generators are this lane's cover-sheet/POS/manifest work." Deferring Convention-A generators (cover-sheet, POS, packet PDF) is correct per omnibus §3 — those need their own compliance review before we ship in-app generators (revision-string binding for cover-sheet, service-method reconciliation for POS). Do not fold them into this lane. They're a future lane.

### §2.6 Ordering versus 042 window
Steps 1-6 above are non-042-gated in principle. In practice:
- Step 1 (FF-4 hook) depends on reconciliation-call-site availability per §2.4 co-req 1 — engineer's disposition.
- Steps 2-3 (W6, W2) are independently buildable now.
- Steps 4-5 depend on 1-3.
- Step 6 depends on all prior + FF-3 flag-on (Preview) per omnibus §6.

**Engineer:** proceed with the FF-4 hook now (per §2.4 co-req 1 disposition), and if it turns out to be 042-blocked, pivot to W6 wiring or W2 routing while FF-4 hook waits. Do not sit idle waiting for me on 2026-07-10 — the Wave-3 wiring lane has 3-4 independently-buildable pieces.

---

## §3 — Summary of what this countersign authorizes

| Item | Ruling |
|---|---|
| G1 rollup as factually accurate | Countersigned |
| Doc-only PR for the rollup + 4 rulings + incident record → `docs/compliance/` | AUTHORIZED |
| FF-3 dark-flag discipline (4-gate path to Preview flag-on) | Reaffirmed — no shortcuts |
| Migration 042 window: earliest 2026-07-10, no early VALIDATE | Reaffirmed |
| FF-4 FMR produce-gate hook | AUTHORIZED with ordering constraints in §2.1-§2.6 |
| Wave-3 produce-wiring lane priority ordering | Set — FF-4 → W6 → W2 → packet-manifest → W4 UPDATE → Wave-4 test |
| Prod FF-3 flag-on | NOT authorized — separate ruling required |
| Convention-A generators (cover-sheet/POS/packet PDF) | Deferred — future lane, separate ruling required |

---

## §4 — What I need from engineer in the FF-4 hook PR

For the FF-4 hook PR to be countersign-ready:
1. Diff of the ordering: show the FF-3 reconciliation gate is called before FF-4 in the produce path (or clear code comment explaining the graceful-pass-through per §2.4 co-req 1 disposition).
2. `portal_text_verbatim` field on the FF-4 constant with the LAHD wording per §2.2 point 4, plus the drift-detection mechanism (comment / CI grep / snapshot test — engineer's choice).
3. Applicability guard implementation per §2.2 point 3 (fires only for `three_day_pay_or_quit` OR `just_cause == 'nonpayment'`).
4. Output-contract row shape in `compliance_gates` matching §2.2 point 5.
5. Five new Wave-4 synthetics per §2.4 co-req 2, added to the Wave-4 catalog (11 total now).
6. Block-outcome path emitting `chatFmrPreCheckHardBlock` per §2.2 point 6.

Once those six are in the PR and CI is green, ping me for countersign. I'll turn it around same-day if the PR posts before 6 PM PT any weekday.

---

## §5 — Standing (unchanged after this countersign)
- FF-3 dark, four-gate discipline holding.
- Migration 042 window: 2026-07-10 earliest, reminder set.
- Parcel-health cron watches ZIMAS with 7-day escalation triggers per this morning's incident record.
- FMR gate quantity discipline: `amount_of_rent_owed`, `<=` block edge, portal-text-verbatim required.
- Locked-prose entries in the FF-3 series: 14, entries 13-14 pending migration-042 co-land.
- Prod flag-on for FF-3: not authorized. Preview flag-on: gated on 4-gate discipline.
- Convention-A generators: deferred, own future ruling.

---

**Signed:**
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03
