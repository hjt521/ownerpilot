# FF-3 Soak-Clock Decouple — Engineering Input — 2026-07-14

**Engineering input to a pending broker supersession ruling. NOT a ruling.** Supports Broker Option-A supersession
of `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.1 — running the FF-3 Preview soak on
its own 14-day floor from Gate-4 activation instead of braiding it to the Gate-3 F2 timer. The broker's supersession
ruling is the amending instrument; this note enumerates the engineering-side impact and the cross-references the
ruling should supersede. Governance §4.13 — all Studio/Vercel/GitHub/branch-protection actions remain broker-executed.

---

## §1 · What changes

The FF-3 Preview soak clock is decoupled from the Gate-3 F2 timer. FF-3 soak runs its own **14-day floor from
Gate-4 activation (2026-07-13 late PT) → clears 2026-07-27**. The Gate-3 F2 timer (2026-08-01 14:53 PT) is
**unchanged** and remains its own instrument. The result is two independent attestations instead of one braided
sequence: the FF-3 prod-flip attestation (~2026-07-27–28) and the Gate-3 closure predraft (~2026-08-01).

**No evidence rigor is reduced.** §1.2 monitoring parity, §1.3 rollback drill ×2, §1.4 data-volume affirmation,
§1.5 on-call runbook, and the §1.6 attestation packet contents are all unchanged — only the clock the FF-3 soak
runs on changes.

---

## §2 · The clause

**Current §1.1 (verbatim, to be superseded):**

> - **Duration:** 2026-07-13 (Preview-live) through **2026-08-01 14:53 PT** (F2 expiry). ~19 days, clears the 14-day floor.

**Proposed replacement §1.1 Duration clause (for the broker's supersession ruling):**

> - **Duration:** 2026-07-13 late PT (Gate-4 activation, Preview-live) through **2026-07-27** — a **14-day floor
>   from activation, run on its own clock, independent of the Gate-3 F2 timer.** The Gate-3 F2 timer (2026-08-01
>   14:53 PT) is a separate instrument and does not gate the FF-3 prod flip.

The §1.1 "clean" criteria (1)–(5) and the soak-break policy are **unchanged** — only the window's end anchor moves
from F2 expiry to the 14-day floor.

---

## §3 · Sequencing (omnibus §5 rewritten with two clocks)

| Window | Activity | Owner |
|---|---|---|
| Now → **2026-07-20** | Unchanged: key rotation, prod `ADMIN_EMAILS`, §1.2 monitoring parity, §1.3 rollback drill **Run 1**, §1.5 runbook, §2.1 waves-3–4 closure evidence, §2.2 Sentry toggles, §4.1 retrospective drafting | eng + broker |
| **2026-07-20 → 2026-07-27** | **FF-3 soak accrual only** (14-day floor). Engineering monitors per §1.2; no new build. §1.3 rollback drill **Run 2** within 48h before the FF-3 attestation filing (~2026-07-25–27) | eng |
| **2026-07-27** (FF-3 soak clean-expiry) | Engineering files the **FF-3 prod-flip attestation packet** (§1.6 items 1–7) | eng → broker |
| **2026-07-27 → 2026-08-01** | F2 continues to accrue on its own clock. Broker countersigns the FF-3 attestation → **Production `FF3_CAPTURE_ENABLED=true` effective ~2026-07-28** | broker |
| **2026-08-01** (F2 clean-expiry) | Broker promotes §2.3 CI guard to Required; broker drafts **§2.4 Gate-3 closure predraft** (unchanged — Gate-3 stays on F2) | broker |
| Post-Gate-3 closure | Deferred seams (reply-to-broker, telemetry, review@ digest) sequenced individually | broker rulings |

The only structural change vs. omnibus §5: the FF-3 flip milestone moves **off** the 2026-08-01 line to ~2026-07-28,
ahead of F2 clean-expiry. Everything Gate-3 keeps its 2026-08-01 anchor.

---

## §4 · Rollback drill Run-2 timing under the new clock

Under the old braided clock, Run 2 ("within 48h before the §1.6 attestation") landed ~2026-07-30 (before the
~2026-08-01 flip). Under the decoupled clock the FF-3 attestation files ~2026-07-27, so **Run 2 lands ~2026-07-25–27**.
The ratified evidence-template Run-2 heading is updated in this PR to carry that timing hint as a comment (not a
hard-coded date field, so it survives a schedule shift). The drill **procedure and evidence-field structure are
unchanged** — only the timing hint moves.

---

## §5 · Cross-references for the broker's supersession ruling to amend

Per instruction, engineering does **not** modify these files here — the broker's supersession ruling is the amending
instrument. Enumerated for review (file → sentence to supersede → proposed replacement):

1. **`ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.1**
   - Now: *"Duration: 2026-07-13 (Preview-live) through 2026-08-01 14:53 PT (F2 expiry). ~19 days, clears the 14-day floor."*
   - Replace with the §2 proposed clause above (14-day floor → 2026-07-27, own clock).

2. **Same file, §5 sequence (line "2026-07-20 → 2026-08-01 (F2 clean-expiry): soak accrual…")**
   - Now: soak accrues through F2 expiry; rollback Run 2 "on 2026-08-01 clean."
   - Replace with the two-clock §3 table above: FF-3 soak accrues 07-20 → 07-27; Run 2 ~07-25–27; flip ~07-28.

3. **Same file, §1.6 pre-authorization expiration**
   - Now: *"if the Prod-Flip Attestation Packet is not filed within 45 days of F2 clean-expiry, this pre-authorization lapses…"*
   - Proposed: re-anchor the 45-day window to **FF-3 soak clean-expiry (2026-07-27)** rather than F2 clean-expiry, so the pre-authorization's staleness clock tracks the FF-3 instrument it governs. (Broker's call; flagged because the anchor date moves.)

4. **`ownerpilot_go_live_readiness_audit_2026-07-13.md`** (lines ~176, ~200)
   - Now: *"FF-3 production flip is the natural next milestone after F2 clean-expiry"* / *"about six broker rulings + a soak window away from production; Gate 3 closes cleanly around 2026-08-01."*
   - Proposed supersession note: the FF-3 flip is now ~2026-07-28 (decoupled, ahead of F2); Gate-3 closure remains ~2026-08-01. Audit percentages are unaffected — only the FF-3-flip milestone date moves earlier.

**No change needed (correctly anchored to Gate-3, which stays on F2):**
- `ff3_omnibus_waves_3_4_closure_evidence_2026-07-13.md` line 44 ("folds into the Gate-3 closure predraft… on/after F2 clean-expiry (2026-08-01)") — Gate-3 reference, stays.
- `ff3_prod_flip_and_scope_a_closure_omnibus_request_2026-07-13.md` — the superseded engineering request; a historical record, not amended.

---

## §6 · No-change confirmations

- **No code changes.** This is a scheduling supersession; no application or build code is touched.
- **Monitoring / rollback drill / runbook artifacts unchanged.** `scripts/synthetic/ff3_prod_monitoring.ts`
  (13 checks green), the §1.5 on-call runbook addendum, and the §1.3 drill *procedure* + *evidence-field structure*
  are all unchanged. Only the rollback-drill Run-2 **timing hint** annotation moves (Deliverable 2 of this PR).
- **§1.6 prod-flip attestation packet contents (omnibus §1.6 items 1–7) unchanged.** Same soak-evidence extract,
  monitoring-parity attestation, both rollback-drill runs, data-volume affirmation, runbook, migration proofs, and
  green-check history — only the filing date moves earlier (~2026-07-27).
- **Run 1 unaffected.** The §1.3 rollback drill Run 1 (target ≤ 2026-07-20) still runs against the current ratified
  template; this decouple does not touch Run 1.

---

## §7 · Disposition

Engineering input filed for the broker's Option-A supersession ruling. On the broker issuing that ruling, the §5
cross-references are amended by that instrument, and the FF-3 prod-flip attestation is filed against the 2026-07-27
soak clean-expiry.

— Engineering input · prepared 2026-07-14 · for Broker Compliance Review (supersession ruling to follow)
