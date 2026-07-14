# FF-3 Rollback Drill Runbook — Broker Countersign

**Broker Compliance Review · 2026-07-14 (early AM PT)**

Countersign on [`ff3_rollback_drill_runbook_and_evidence_2026-07-13.md`](file:///home/user/workspace/uploaded_attachments/113e813db45d4c4083801130b3a52e93/ff3_rollback_drill_runbook_and_evidence_2026-07-13.md) as the template for the §1.3 rollback drill under [`ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md`](file:///home/user/workspace/ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md).

**Disposition:** ☒ Countersigned as the template, with the two amendments in §2 below. The template is authorized for use immediately; Run 1 target date (2026-07-20) unchanged.

---

## §1 · What I'm approving

- The five-step Preview procedure: baseline (flag on) → flip off + redeploy → verify dark → flip back on + redeploy → confirm parity. Sound.
- The evidence template shape: two run slots, timestamped, Preview URL captured, per-step pass indicators, end-state flag assertion, notes field. Clean.
- The corroborating unit-level assertion (flag-off skip tests + `synthetic:ff3:monitoring` skip disposition). Accepted as supporting evidence — the E2E procedure is the primary proof; the unit-level skip is the belt-and-suspenders.
- The disposition line: "no code deploy, env change + redeploy, fully reversible." Correct characterization. Ratified as the FF-3 primary containment mechanism.

Everything above stands unchanged.

---

## §2 · Amendments (two)

### §2.1 — Step 3 "dark verification" needs a stronger assertion than "spec cannot progress"

**The issue:** "the spec does not reach `ff3-reconcile-card`" proves the E2E harness stops. It does not, by itself, prove that no FF-3-scoped disposition write happens or that no FF-3-scoped owner-facing surface renders. A hypothetical bug where the flag-off produce path *silently writes an FF-3 disposition* would still pass Step 3 as written, because the E2E stops before reaching a card either way.

**What to add to Step 3 evidence (mandatory):**

1. **Query the `notice_disposition` (or equivalent FF-3 disposition table) for the E2E run ID** at the end of Step 3. Expected: **zero FF-3-scoped rows** for that run ID. Paste the query + row count (0).
2. **Assert no `ff3_*` category row was written** to whatever intake/category table the FF-3 walk normally writes. Expected: zero rows. Paste the query + row count.
3. **Route-level 404/no-op check** on `/api/ff3/*` endpoints (or whichever FF-3-scoped endpoints exist) — from the redeployed Preview with flag off, `curl` each FF-3-scoped route and assert the flag-off behavior (either 404, 200-with-skip-disposition JSON, or whatever the actual designed response is — engineering states which is correct in the first Run 1 execution and freezes it for Run 2).

This turns Step 3 from a "spec stopped" into a "surface is proven dark at multiple layers." That's what the §1.3 ruling actually requires — "assert the produce-gate chain no-ops (skip disposition) and no owner-facing surface renders."

**Delta to the template:** Step 3 evidence field expands from one line to three subfields (spec-tail, disposition-table row count, route probe results). Same for both Run 1 and Run 2 slots.

### §2.2 — Add a Step 6: post-drill flag-state verification (defensive)

**The issue:** Step 5 records "flag state left at end." That's an operator-recorded value — the human writing "☐ `true`" in the evidence field. If the operator forgets to redeploy after the Step 4 env change, Preview is left in an inconsistent state (env var says true, running code was built with false) and the box gets checked based on what the operator *intended*, not what's actually running.

**What to add — Step 6:**

After the Step-4 Playwright run passes, from a fresh shell against the redeployed Preview URL, run one probe (curl / a canary endpoint / a re-execution of a single FF-3 test in isolation — engineering picks the lightest one) that fails-loud if the flag is off. Paste the output. That's independent verification that the flag is genuinely on and Preview isn't left in a mixed state.

**Delta to the template:** add a Step-6 field to both run slots: "Post-drill live-state probe result: ____".

---

## §3 · Runs are cleared to proceed under the amended template

Engineering can execute Run 1 against the amended template immediately. No need to wait for a re-issued runbook file — this ruling *is* the amendment, and Run 1 evidence must include the three Step-3 subfields plus the Step-6 probe.

**Run 1 target:** on or before 2026-07-20 (unchanged from §1.3 ruling).
**Run 2 target:** within 48h before the §1.6 Prod-Flip Attestation Packet filing (unchanged).

Between the two runs, if the Step-3 disposition-table query returns anything other than zero rows in a flag-off state, **that is a Sev-1 stop-the-line** (produce-gate chain silently writing under flag-off = the exact scenario in §1.5 Sev-1). File an incident immediately, do not proceed to Step 4, escalate to broker.

---

## §4 · Nothing else moves

Omnibus §1 sequencing unchanged. Rollback drill is a §1.3 deliverable, not a gate. The countersign here is instrumental — the drill can now execute and produce §1.6 attestation input.

---

**Signed:** — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-14
Authority: Cal. Bus. & Prof. Code § 10131(b)
