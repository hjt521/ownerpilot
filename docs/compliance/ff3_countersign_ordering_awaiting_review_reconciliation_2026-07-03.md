# FF-3 Countersign — Ordering, `awaiting_broker_review` Handling, and Amount-Reconciliation Ruling

**Date:** 2026-07-03
**Trigger:** Engineer requested broker countersign on three FF-3 module-build decisions before finalizing the module and beginning the activation lane.
**Referenced authority:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md`; `ff3_capture_questions_locked_prose_broker_ratification_2026-07-03.md`; `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md`.
**Attestation status:** FF-3 module built inert (flag off, not wired into `SCRIPTED_CATEGORIES`). Migration 037 additive landed. Migration 042 pending VALIDATE post-soak on 2026-07-10.

---

## §0 — Countersign posture

Three decisions surfaced. All three engineer defaults are compliance-sound. Countersigning all three, with one amendment on Decision 3 (the reconciliation question) because the reconciliation itself becomes a compliance guard that produces a Wave-4 test case.

---

## §1 — Decision 1: FF-3 ordering within `SCRIPTED_CATEGORIES`

**Engineer default:** FF-3 runs last in the scripted-capture sequence (i.e., after existing categories, before produce).
**Alternative considered:** FF-3 runs first.

**Ruling: DEFAULT ADOPTED — FF-3 runs last.**

### §1.1 Why

Two considerations, both pointing to "last":

1. **The existing scripted categories are structural** (address, service_date, tenant identification, etc.) — they establish the *identity* of the case. FF-3's five fields (`bedrooms`, `contract_monthly_rent`, `amount_of_rent_owed`, `just_cause`, `notice_type`) are *substantive* — they establish the *shape* of the case. Substantive fields depend on structural fields. Running FF-3 first would require capturing `just_cause` before we've even confirmed which unit's tenancy we're ending, which is out of order both from an owner-UX perspective ("wait, which case is this again?") and from a produce-audit perspective (the compliance gates FF-4/W6/W2 all read structural fields too).

2. **Escalation-off-ramp cost is lower at the end of the sequence.** If FF-3 hits the "rule of three → `awaiting_broker_review`" exit per the ratification §6, the owner has already invested effort in the structural categories. Their session state is meaningful and worth broker review. If FF-3 ran first and escalated on question 1, we'd be queueing a broker-review case that has almost no substrate — the broker would open it and see "owner said 'I'm not sure what kind of notice' and left." That's low-signal for broker triage. Last-position escalations carry the maximum context.

Countersigned: FF-3 runs at the tail of `SCRIPTED_CATEGORIES`.

### §1.2 One implementation note

The tail position means FF-3's completion is the trigger for the produce handoff (FF-4 FMR gate, W6 late-filing gate, W2 routing) per the omnibus ruling §7 sequencing. Engineer: confirm the `nextScriptedCategory` return value after FF-3 completes is the produce-handoff sentinel, not a null-terminator that leaves the state machine in an indeterminate state. This is a small correctness check, not a fork.

---

## §2 — Decision 2: `awaiting_broker_review` handling — session parked, no auto-resume

**Engineer default:** When any of the five FF-3 fields exits to `awaiting_broker_review` (per ratification §6 rule-of-three), the session is parked. No auto-resume.
**Alternative considered:** Auto-resume after broker resolution posts back to the case.

**Ruling: DEFAULT ADOPTED — session parked, no auto-resume.**

### §2.1 Why

Auto-resume is a footgun for a compliance system. The threat model:

- Broker resolves an `awaiting_broker_review` case at, say, 4 PM Friday by writing a value into the field via the operator-items surface. If auto-resume fires immediately, the owner's next-session-start could be at 11 PM Friday, at which point the escalation-card copy the owner last saw ("a broker will look at this within one business day") no longer aligns with the state — they get a smoothly-continuing capture flow with no indication the broker touched the case. That's not a compliance defect *per se*, but it erodes the audit trail's clarity about who authored what.
- Auto-resume also creates a race: what if the broker resolves *and* the owner returns to chat before the resolution's notification reaches the owner-facing UI? The owner sees the escalation card, the state has moved on, the state machine is ambiguous about which prose to render.

Manual resume — where the broker's resolution triggers a distinct locked-prose "we've reviewed your case, click here to continue" card that the owner must acknowledge before the state machine re-enters capture — eliminates both problems. It gives the audit trail a clean handshake and it gives the owner a moment of orientation.

Countersigned: session parked, no auto-resume. Resolution posts a resume-card; owner acknowledges to continue.

### §2.2 New locked-prose entry required

The resume-card copy is new locked prose that must land alongside migration 042 (not before, because migration 042 introduces the `awaiting_broker_review` admissible state per the ratification §6). Copy:

> "Thanks for your patience. A broker has reviewed the details of your case and I now have what I need to continue. Before we pick back up, take a quick look at the note the broker left: **{broker_resolution_note}**. If that looks right and matches what you meant, tap continue and I'll move us to the next step. If it doesn't look right — or if the broker's note surfaces a question you want to ask before we proceed — tap 'reply to broker' and I'll route your message back for another review."

Add as locked-prose entry `chatFf3ResumeAfterBrokerReviewCard`. This is entry number 13 in the FF-3 series (12 were listed in the ratification §7). Manifest regenerates in the migration-042 PR, not in the current module PR — timing matters because the field state depends on migration 042 having landed.

### §2.3 Broker-side surface (out of scope for this PR)

The broker-side operator-items surface for resolving `awaiting_broker_review` cases is a separate surface (likely lives alongside the existing operator-items dashboard per `operator_items_update_2026-07-02_do_not_serve_lift.md`). Its build is not on the FF-3 module lane. Countersigned engineer default is that this surface will be scoped in a follow-up ruling before flag-on happens — not blocking the current module or the Playwright/Preview lane, but blocking flag-on in Preview because we need a mechanism for me to actually resolve the escalation state before we can run the E2E test that includes it.

Sequence into the four gates: this surface must land between the Playwright spec (gate 2) and Preview E2E (gate 3). Not gating gate 1 or gate 2.

---

## §3 — Decision 3: `amount_of_rent_owed` vs `rent_periods` reconciliation

**Engineer statement:** FF-3's `amount_of_rent_owed` and the base `rent_periods` amounts are captured independently. Should they reconcile?

**Ruling: YES, they reconcile — and the reconciliation is a compliance guard, not a passive check.**

### §3.1 Why the question matters

This is the highest-signal decision of the three. The two quantities:

- **`amount_of_rent_owed`** (FF-3): The total dollar figure stated on the served notice as the rent owed. Per this morning's FF-4 FMR ruling, this is the operative quantity for the FMR gate and the amount owed in the UD-100 packet's Item 4.
- **`rent_periods`** (base schema): Per-period rent records — presumably rows like `{period_start, period_end, amount_charged, amount_paid, balance}`. These would be the ledger view of the tenancy.

If these two quantities *don't* reconcile — i.e., `amount_of_rent_owed != SUM(rent_periods.balance WHERE period IN 3day_notice_scope)` — then one of three things is true:

1. **The owner made an arithmetic error on the notice.** Common. CCP § 1161(2) requires the amount on the notice to be the actual rent due. An over-demand or under-demand can void the notice and, in bad-faith over-demand cases, expose the landlord to fee-shifting under CCP § 1174.21.
2. **The notice includes non-rent items** (late fees, interest, damages, utilities not billed as rent). CCP § 1161(2) explicitly prohibits including non-rent items in a pay-or-quit demand. If the FF-3 amount is inflated relative to `rent_periods`, we may be looking at an unlawful demand.
3. **The `rent_periods` ledger is incomplete or stale.** Rare in-app but possible if the owner has been maintaining rent-period records elsewhere and only recently backfilled.

In all three cases, we want to know. Silently accepting a divergence between the two would let the app assemble a packet around a notice that's already voidable, which produces an owner-facing failure we could have caught at intake.

### §3.2 Ruling: they reconcile, and divergence is a compliance flag (not an auto-block)

Add a **reconciliation check** that fires immediately after FF-3 completes and BEFORE FF-4 FMR runs. The check computes:

```
expected_owed = SUM(rent_periods.balance)
  WHERE period_end <= notice_service_date
  AND period covered by notice scope (typically: unpaid periods)
```

And compares to `amount_of_rent_owed` from FF-3.

**Three outcomes:**

**(a) Exact match** (`expected_owed == amount_of_rent_owed`): Pass silently. Log the reconciliation result to the case's `compliance_gates` row with `gate = 'ff3_amount_reconciliation'`, `result = 'match'`. Continue to FF-4.

**(b) Zero-diff-tolerance mismatch, no `rent_periods` populated** (`rent_periods` is empty or has no covered periods): Pass with soft warning. This is the case where the owner hasn't built a ledger yet — we can't reconcile because there's no baseline. Log `result = 'no_ledger_baseline'`, `note = 'rent_periods empty at service date; owner not maintaining ledger in-app'`. Continue to FF-4. This is not a defect — it's a signal that the owner is using OwnerPilot for notice/filing but keeping rent records elsewhere, which is fine.

**(c) Mismatch with ledger present** (`|expected_owed - amount_of_rent_owed| > $0.01` and `rent_periods` non-empty): **Compliance flag — surface to owner in-chat before proceeding to FF-4.** Do NOT auto-block. This is the same posture as FF-4's own hard-block versus a soft-flag distinction: we surface the issue and let the owner decide, but the decision is logged for the audit trail.

Locked-prose card for outcome (c) — add as entry `chatFf3AmountReconciliationFlag`:

> "Before we run compliance checks, I want to flag something I noticed. From the rent-period records on file for this tenancy, the amount that appears to be unpaid across the period(s) your notice covers is **${expected_owed}**. On the notice, you told me the amount owed is **${amount_of_rent_owed}**. These don't match, and the difference matters because California law (CCP § 1161(2)) requires the amount on a 3-day pay-or-quit notice to be the actual rent due — nothing more (no late fees, interest, or other charges), and nothing less. If the number on the notice is high because it includes late fees or other charges, that could void the notice. If it's low or high because of an arithmetic error, that could also void the notice. If it's different because the rent-period records aren't complete or you've been keeping them elsewhere, that's fine — the notice amount is the one that governs the filing. Three options: **(1) The notice amount is right, my rent-period records are incomplete or out of date.** I'll flag this in your case notes and continue. **(2) The rent-period records are right, the notice amount is wrong.** I'll pause the case so you can serve a corrected notice — the compliance path forward starts with the corrected notice. **(3) I need help figuring out which is right.** I'll route to broker review before we do anything else. Which is it?"

Owner selects (1), (2), or (3). Selection is logged. On (1), continue to FF-4 with `amount_of_rent_owed` unchanged; case-notes surface the reconciliation gap for downstream visibility. On (2), pause the case — do NOT proceed to FF-4 — surface a locked-prose "here's how to correct and re-serve" card (defer that card's copy to a follow-up ruling, out of scope for this countersign). On (3), route to `awaiting_broker_review` per §2.

**Implementation note:** This reconciliation gate goes into `compliance_gates` as its own row alongside FF-4, W6, W2. In the packet-manifest generator (Decision 2 in the omnibus ruling), the manifest's `compliance_gates` array must include this reconciliation gate. The Wave-4 golden test (Decision 6) must exercise all three outcomes — add three synthetic cases to the Wave-4 catalog:

- `SC-FF3-AMOUNT-RECONCILE-MATCH`: `amount_of_rent_owed = $6,000`, `rent_periods` shows two unpaid $3,000 periods, expected = $6,000 → **match** → continue.
- `SC-FF3-AMOUNT-RECONCILE-NO-LEDGER`: `amount_of_rent_owed = $6,000`, `rent_periods` empty → **no_ledger_baseline** → soft-continue.
- `SC-FF3-AMOUNT-RECONCILE-MISMATCH`: `amount_of_rent_owed = $6,300`, `rent_periods` shows two unpaid $3,000 periods (expected $6,000, $300 gap likely late fees) → **mismatch** → owner sees the flag card, selects (1)/(2)/(3), each branch tested.

Add these three synthetics to Wave-4 alongside the three FMR synthetics from this morning's FF-4 ruling — the Wave-4 catalog now has six broker-authored synthetics driving the golden test. Do NOT double-house these in FF-3 unit tests AND Wave-4 — Wave-4 only, per the omnibus §6 discipline.

### §3.3 One locked-prose entry, two new synthetics, three-way owner branch

New locked-prose entry required for this decision: `chatFf3AmountReconciliationFlag` (entry 14, joins entry 13 from Decision 2 above).

Total locked-prose entries in the FF-3 series after this countersign: **14**.
1. `chatFf3IntakeConfirmationCard` (omnibus §1.3)
2-11. Ten capture question + re-ask entries (ratification §7)
12. `chatFf3EscalationCard` (ratification §6)
13. `chatFf3ResumeAfterBrokerReviewCard` (this countersign §2.2)
14. `chatFf3AmountReconciliationFlag` (this countersign §3.2)

Entries 13 and 14 land with migration 042 (in the migration-042 PR), NOT in the current module PR. That's fine because both are inert until flag-on.

---

## §4 — Flag-on gate discipline (formal)

Engineer surfaced the four gates blocking flag-on. Countersigning the gate list as **the only path** to `FF3_CAPTURE_ENABLED = true` in Preview. Committing this to writing so no future engineer (including future-me) can shortcut it:

**Gate 1 — Migration 042 VALIDATE.** Do not flip the flag before the 7-day soak completes and VALIDATE runs cleanly. Earliest possible date: 2026-07-10. If VALIDATE fails, do not flip; open a follow-up ruling on the failure mode. The 2026-07-10 reminder engineer set earlier today is the gate keeper.

**Gate 2 — Playwright spec.** Must cover:
- All five capture categories (`bedrooms`, `contract_monthly_rent`, `notice_type`, `just_cause`, `amount_of_rent_owed`).
- Each category's escalation off-ramp (rule-of-three → `awaiting_broker_review` → resume card).
- The confirmation card (`chatFf3IntakeConfirmationCard`) with edit/correct flow.
- The reconciliation flag card's three-way branch (match, no-ledger, mismatch with all three owner selections).
- The conditional-branch logic on `amount_of_rent_owed` (fires when `notice_type == 3day_pay_or_quit` OR `just_cause == nonpayment` OR extractor has candidate — per ratification §5).

Spec is required to be a first-class artifact under `packages/*/e2e/` (or whatever the repo's Playwright convention is) — not a smoke test.

**Gate 3 — Preview E2E.** Full run of the Playwright spec against a Preview deployment. Do NOT run against Prod. Preview must have:
- Migration 042 landed (Gate 1).
- All 14 locked-prose entries in the manifest with hashes matching the copy in the ratification and this countersign.
- The broker-side `awaiting_broker_review` resolution surface (§2.3 above) shipped to Preview and functional — because at least one Playwright test path traverses it.
- The three Wave-4 reconciliation synthetics executable end-to-end.

Any Gate-3 failure resets to the failing lane, not to Gate 1. Fix the failure, re-run E2E.

**Gate 4 — Broker countersign of Gates 1-3 evidence packet.** I countersign flag-on after receiving an attestation packet containing:
1. Migration 042 VALIDATE output (SQL trace).
2. Playwright spec test file(s) + CI run showing all specs pass.
3. Preview E2E run video/screenshots covering the paths in Gate 2.
4. Locked-prose manifest diff showing all 14 entries added with correct hashes.
5. Confirmation that the broker-side resolution surface is live in Preview.
6. Wave-4 reconciliation-synthetics evidence (SC-FF3-AMOUNT-RECONCILE-*).

Only then does `FF3_CAPTURE_ENABLED = true` in **Preview**. Prod flag-on is a separate ruling that I will not pre-authorize here — Prod requires its own attestation with additional gates (production data volume review, rollback drill evidence, on-call staffing confirmation), consistent with the two-tier flag discipline in `gate2_prod_runwindow_runbook_2026-07-02_amended.md`.

---

## §5 — Sequencing summary

| Step | Lane | Gates cleared | Broker action |
|---|---|---|---|
| Now (post-countersign) | FF-3 module PR merges to main | — | Countersigned (this doc) |
| Between now and 2026-07-10 | Playwright spec build + broker-side resolution surface build | Gate 2 in progress | — |
| 2026-07-10 morning | Migration 042 VALIDATE runs | Gate 1 | Pre-flight reminder fires |
| 2026-07-10 same day | Locked-prose entries 13-14 merge with migration-042 PR | Gate 2 | — |
| Between 2026-07-10 and Preview E2E date | Playwright spec finalizes; broker-side resolution surface hits Preview | Gate 2 complete | — |
| Preview E2E date | Full Playwright E2E run against Preview | Gate 3 | Attestation packet drafted |
| Preview E2E + 24h | Broker countersign of attestation | Gate 4 | I countersign here |
| Countersign +1 | `FF3_CAPTURE_ENABLED = true` in Preview only | Flag on (Preview) | — |
| Prod flag-on | Separate ruling, additional gates | — | Not authorized here |

---

## §6 — What this countersign does NOT authorize

To keep the record clean:

1. Does NOT authorize wiring FF-3 into `SCRIPTED_CATEGORIES` on main (that's Gate 4).
2. Does NOT authorize Prod flag-on (separate ruling required, see §4).
3. Does NOT authorize skipping Gate 1 even if migration 042 appears clean before 2026-07-10 (the soak window is the point — early-VALIDATE is denied).
4. Does NOT authorize any transcript backfill for pre-FF-3 cases (per omnibus ruling §1.2 Amendment D).
5. Does NOT authorize the FF-3 escalation surface to auto-resolve `awaiting_broker_review` states without broker input (per §2 above).
6. Does NOT rule on the "corrected notice" branch copy for reconciliation-flag outcome (2) (§3.2) — that's a follow-up ruling, needs its own attention because it touches CCP § 1161(2) waiver-of-defect doctrine.

---

## §7 — What FF-3 unblocks (record for the audit trail)

Per omnibus ruling §7 sequencing, FF-3 landing (flag-on in Preview) unblocks:
- FF-4 FMR gate wiring into produce (with the reconciliation gate ordered before it per §3.2).
- W6 late-filing gate wiring into produce (with the portal-drift standing rule from FF-4 ruling §3 applied).
- W2 routing wiring into produce.
- Packet-manifest generator lane (omnibus Decision 2).
- W4 EFS capture UPDATE lane (omnibus Decision 4).
- Wave-4 golden integration test (omnibus Decision 6) with expanded synthetic catalog (3 FMR + 3 reconciliation = 6 broker-authored goldens).
- W5 notice-PDF download bridge (omnibus Decision 3, tail of the sequence).

Prod flag-on is not on the critical path for any of the above except W4 (which reads production EFS records). W4 UPDATE build itself can proceed on Preview data.

---

**Signed:**
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03
