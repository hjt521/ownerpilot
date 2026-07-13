# FF-3 Reconciliation Gate — Runtime Defect Fix Placement

**Broker Compliance Review · 2026-07-12 (afternoon PT)**

Ruling on the runtime defect engineering surfaced during PR B-server-resume wiring: the FF-3 reconciliation gate reads `session.rent_periods`, but no such column exists — the data lives at `session.intake_state.rent_periods.value`. Gate has been resolving `no_ledger_baseline` and soft-continuing every time. Unit tests pass because they hand `rent_periods` directly to the pure functions, bypassing the wiring layer.

Impact if unpatched: the moment `FF3_CAPTURE_ENABLED` flips in Preview, the gate silently never fires. No mismatch, no escalation, no `awaiting_broker_review` row — kills the Option-3 evidence path and ships a dead compliance gate.

Companions: [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md), [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md), [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md).

---

## §0 · Ruling — Option 2 (separate precursor fix PR)

**Adopt Option 2.** The one-line fix lives in its own PR ("PR A-reconcile-gate-fix"), landed to `main` before PR B-server-resume. Reject Option 1. Reasoning in §2, precursor-PR scope in §3.

The corrected calendar in §5 absorbs this into the same 4–6 working day range from the omnibus signature — the isolated PR is small enough that it doesn't slip the flag flip.

---

## §1 · First: on the shape of this catch

This is the fourth stop-the-line escalation in this same chain — entry-13 reply-clause, then Block C existence, then the resume-contract + pause surface, and now this. Every one has been the right shape and every one has caught something before it turned into a live-fire incident.

**Naming what this one specifically caught:** a compliance gate that has been in main since Block A shipped and has, in effect, been broken the entire time — it just wasn't observably broken because the flag has been off. Unit tests passed because they didn't test the wiring layer that actually reads from the session. The moment the flag flips, the gate becomes a no-op in production and every FF-3 session soft-continues through reconciliation regardless of whether the amount matches the ledger. That's not a subtle bug; that's the gate being off while the flag is nominally on.

If this had been discovered *after* the Preview flag flip and Gate-4 countersign, the attestation packet would have shown Playwright green (because the tests bypass the wiring layer and hand `rent_periods` directly to the pure functions) while the actual runtime behavior in Preview shipped with the gate disabled. The evidence would have been meaningless. I would have signed off on nothing.

Good catch. On the record.

## §2 · Why not Option 1 (own commit inside PR B-server-resume)

Bundling the fix into PR B-server-resume mixes two structurally distinct changes in one review:

- The **defect fix** is a one-line data-source correction. It changes a compliance gate's runtime behavior from "never fires" to "fires as designed." That's a *behavior-change* commit in a compliance-weighted code path.
- The **resume-contract build** is the addition of a broker-authorization override mechanism. That's a *feature-add* commit that introduces new server surface area.

Reviewing both in one PR means the reviewer (me) has to hold both mental models simultaneously: "does this new authorization mechanism work correctly?" AND "does this one-line change actually restore the gate to firing correctly?" Those are different verification tasks. Splitting them means each PR has one thing to prove.

More importantly for compliance-audit-trail purposes: **I want the defect fix to have its own commit hash.** If we ever need to answer "when did the reconciliation gate start actually firing in production?" — that's a specific, dated, git-blameable moment. Bundling it into PR B-server-resume mudddles the answer to "the gate started firing when the broker-authorization override was added," which reads as if the gate's activation was contingent on the override existing. It wasn't. The gate should have been firing since Block A; the fix just corrects a wiring defect that predates the resume contract by two months of code history.

Same reasoning that split PR C from PR B-Playwright, and split PR B-server-resume from PR C. Compliance-weighted changes get their own commits.

**Reject Option 1.**

## §3 · Adopted — Option 2: PR A-reconcile-gate-fix

Scope, deliberately minimal:

### §3.1 · The fix itself

One-line change in the from-chat produce route:

```typescript
// Before
const ledger = sumLedger(session.rent_periods);

// After
const ledger = sumLedger(session.intake_state?.rent_periods?.value);
```

(Or whatever the exact idiom is per the codebase's null-safety pattern — engineer's call on the null-safe operator chain, provided the semantic is "read the Lane-2E intake_state.rent_periods.value if present, else undefined and let sumLedger's null-ledger branch handle it as designed.")

### §3.2 · What the fix does NOT change

- Does NOT change `sumLedger` or any of the pure reconciliation functions.
- Does NOT change the reconciliation gate's *semantics* — the `no_ledger_baseline` branch stays intact for sessions that genuinely have no rent_periods captured. The fix just ensures we actually check `intake_state` before concluding no baseline exists.
- Does NOT change entry-14 or any locked-prose entry.
- Does NOT change migration 048 or introduce migration 049.
- Does NOT change unit tests that pass `rent_periods` directly to pure functions.

### §3.3 · What the fix DOES add

The fix must be accompanied by a **wiring-layer test** that exercises the from-chat produce route with a session that has `intake_state.rent_periods.value` populated but no top-level `rent_periods` column (i.e., the actual production data shape). Assert the reconciliation gate reads a non-null ledger and either continues cleanly (if amount matches) or 409s (if it doesn't).

The absence of this test is precisely why the defect wasn't caught earlier. Adding it in the same PR closes the regression loop. Engineer's discretion on whether it's a unit test with a mocked session or a light integration test — either works, as long as it exercises the actual wiring layer that reads from the session shape.

**PR A-reconcile-gate-fix contents:**

1. The one-line fix in the from-chat route.
2. The new wiring-layer test that would have caught this.
3. A short PR description explaining what changed and why, with a compliance line signed by me.

Nothing else. No refactoring, no drive-by cleanup, no touching adjacent code. If engineer sees other things in the vicinity worth fixing, note them and file them separately after this ships.

### §3.4 · Verification before PR A merges

Before I sign the compliance line on the PR A merge, engineer supplies:

1. Screenshot or log output of the new wiring-layer test **failing** against the pre-fix code (proves the test actually catches the defect).
2. Screenshot or log output of the same test **passing** against the post-fix code.
3. All 12 required GitHub checks green on the PR A merge commit.
4. Explicit confirmation that no other code path in the FF-3 lane reads `session.rent_periods` directly — a quick grep across the FF-3 files. If any other path does, they get the same fix in the same PR (still one-line-per-callsite, still no refactoring). If there are zero other callsites (which the engineer's investigation seems to indicate), the PR stays as described.

## §4 · Sequencing update

Corrected order to `main`:

1. **PR A-reconcile-gate-fix** — the one-line defect fix + wiring-layer test. Broker-signed compliance line. Merges through the 12/12 gate.
2. **PR B-server-resume** — migration 049 + resume mechanism + admin-resolve authorization write + produce-gate token check. Broker-signed compliance line. Merges through the gate.
3. **PR C-client** — Block C client wiring per omnibus §6. Broker-signed compliance line. Merges through the gate.
4. **PR B-Playwright** — extended spec including the new coverage from omnibus §7 criteria 2, 4, 7, 8. Broker-signed compliance line. Merges through the gate.
5. **Preview flag flip + attestation + Gate-4 countersign** per omnibus §7 twelve criteria.

**PR A must land first** because every subsequent PR builds against the assumption that the reconciliation gate fires. PR B-server-resume in particular needs the gate to fire so its authorization-scope binding to `rent_periods` has real data to bind to. PR C's owner-facing UI is testable in isolation of PR A but pointless until the gate fires.

### §4.1 · Playwright coverage — additional assertion

The extended Playwright spec (PR B-Playwright) already covers the happy escalate→resolve→resume walk and the negative scope-mismatch case per [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) §7. Add one more assertion:

- **Positive gate-fires assertion:** the spec's fixture session must have `intake_state.rent_periods.value` populated with a divergent ledger (not the top-level `rent_periods` column, since that column doesn't exist). Assert the produce POST returns 409 with `code = "ff3_reconciliation_flag"` — i.e., the gate actually fired. If the fixture accidentally shaped as `rent_periods` at the top level, the test would still catch escalation but wouldn't prove the gate reads from the correct path.

This is a fixture-shape assertion, not a new test case. Engineer confirms the seed helper (`app/api/test/seed-ff3-session/route.ts`) writes to `intake_state.rent_periods.value` — the fixture must match production data shape.

## §5 · Calendar impact

PR A is small — a one-line fix, a new test, a compliance line. Engineer estimate: half a day to build and review. Add half a day for my compliance line and the 12/12 checks running.

Prior omnibus calendar: 4–6 working days to flag flip. Adding PR A adds roughly half a day. **Revised: 4.5–6.5 working days.** Still not a slip against anything committed; still bounded within the same week.

If engineer can land PR A same-day-as-omnibus-signature (which is realistic given the small scope), the effective calendar impact is zero — PR A goes up in parallel with the manifest hashing for §1 of the omnibus signature.

## §6 · What this ruling does NOT do

- Does NOT authorize any refactoring of the reconciliation gate beyond the one-line data-source fix.
- Does NOT authorize touching `sumLedger` or the pure reconciliation functions.
- Does NOT authorize changing the `no_ledger_baseline` semantics — sessions genuinely lacking rent_periods still resolve to that branch by design.
- Does NOT authorize post-hoc modification of the omnibus §7 twelve-criteria checklist. The additional Playwright fixture-shape assertion in §4.1 above is an addition to the existing criteria, not a modification of them.
- Does NOT authorize a retrospective audit of historical sessions that may have soft-continued through the disabled gate. There are no such sessions in production because the flag has been off in production; any Preview sessions from prior test runs are non-compliance-weighted. If engineer wants a cleanup ruling on Preview test data, file it separately.

## §7 · One thing I want on the record about ongoing risk

Four stop-the-lines in the same feature-flag rollout is a signal about the general practice, not just about the individual defects. Each one has been the right escalation, and I've said so each time. But the pattern says something about how compliance-weighted seams should be reviewed *before* they're built into shipping code.

I don't want to make a governance change ruling right now — this omnibus + PR A + PR B/C/Playwright chain needs to finish before we introduce new process. But once Gate 4 is countersigned and the Preview flip is live, I want a short retrospective ruling that captures: (a) what a "compliance seam" is defined as, (b) what class of pre-implementation review those seams should get, and (c) whether the manifest discipline should extend to server-side contract shapes the way it currently extends to owner-facing prose.

That's a note for future me. Not blocking anything now. Filing it here so it doesn't get lost.

## §8 · Companion rulings

- [`ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md`](file:///home/user/workspace/ff3_gate4_omnibus_authorization_broker_signature_2026-07-12.md) — omnibus that PR A now precedes
- [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md) — resume contract that PR B-server-resume builds
- [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md) — origin of the reconciliation gate design

---

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-12
Authority: Cal. Bus. & Prof. Code § 10131(b)
