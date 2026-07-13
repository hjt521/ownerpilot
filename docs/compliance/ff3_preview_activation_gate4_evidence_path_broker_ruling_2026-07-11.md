# FF-3 Preview Activation — Gate-4 Evidence Path

**Broker Compliance Review · 2026-07-11 (evening PT)**

Ruling on the three-way fork engineering surfaced before touching the Vercel `FF3_CAPTURE_ENABLED` flag: how do we produce the `awaiting_broker_review` row that the `/admin/ff3-review` screenshots and attestation item 5 depend on?

---

## §0 · Ruling — Option 3 (full E2E including admin resolve)

**Adopt option 3.** Un-fixme the reconciliation E2E path, include the `/admin/ff3-review` resolve step in the same Playwright run, and let evidence item 5 be produced by the automated flow end-to-end rather than by SQL hand-seeding or a half-automated capture.

Options 1 and 2 are rejected — reasoning in §2. Sequencing and deliverables in §3.

---

## §1 · Why the fork exists

The `/admin/ff3-review` surface renders sessions matching the predicate from [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §1:

```
reconciliation_resolution = 'broker_review'
AND reconciliation_resolved_at IS NOT NULL
AND broker_resolution_note IS NULL
```

That predicate is only reached when an owner completes the reconciliation walk (typed amount ≠ ledger sum → picks option (3) "broker review"). The Playwright spec has that walk scaffolded but marked `test.fixme` — it exists structurally, has never actually run green. Evidence item 5 of the Gate-4 attestation packet requires proof the escalate→resolve→resume path is functional in Preview.

Three ways to produce the row:

1. **Un-fixme reconciliation E2E** — flip the fixme, run the walk, admin capture screenshots after the fact.
2. **Hand-seed via Studio SQL** — INSERT/UPDATE a `chat_sessions` row directly into the awaiting state, then screenshot the admin surface.
3. **Full E2E including admin resolve** — un-fixme reconciliation, extend the same spec to also drive the admin resolve action, capture the entry-13 resume card on the owner side.

## §2 · Why the other two are rejected

### §2.1 · Option 2 (SQL hand-seed) — rejected

Hand-seeding a row into `chat_sessions` produces a screenshot that *looks* like the admin surface working, but proves nothing. It skips the escalation trigger (which is what the reconciliation walk exercises), skips the reconciliation math (which is what the FF-3 amount_of_rent_owed capture actually does in production), and skips whatever real payload shape the produce-gate chain writes. If migration 048's new columns interact with any not-yet-noticed constraint, or if the produce chain writes any column my ruling didn't explicitly name, the hand-seeded row won't hit those code paths.

A Gate-4 attestation resting on SQL-seeded evidence is a Gate-4 attestation resting on a demo, not a proof. I would not countersign flag-on against that packet, and I would then have to ask engineering to redo the walk automated anyway. Save the round trip and skip this option now.

### §2.2 · Option 1 (un-fixme reconciliation only, resolve captured separately) — rejected

Option 1 gets us the escalation half automated but leaves the resolve action captured by-hand (a broker literally clicking Resolve while a video runs). That's better than option 2, but it splits the evidence: one artifact from an automated Playwright run, another artifact from a manual click session. The two artifacts have no shared session id in the automated fixture, so I'd have to trust that the manual capture was against the same row that the automated escalation created.

More importantly, the *resume* step (owner sees entry-13, taps continue) then becomes a *third* manual capture in a *fourth* browser session, and by that point the evidence chain has enough handoffs that reconstructing "what happened" from the attestation packet becomes an exercise in trust rather than an exercise in reading a test log.

Option 1 also leaves the resolve endpoint and the entry-13 interpolation *unproven under automation.* Those are the two pieces of the surface that carry the most compliance weight (per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §4 and §6.1). Leaving them untested by automation means the next time engineering touches that code, there's no regression guard.

### §2.3 · Option 3 — adopted

One Playwright run drives owner-side escalation, admin-side resolve, and owner-side resume-card acknowledgment. Same session id threads through the whole thing. Same fixture data. Deterministic. Screenshots and video come from a single test run against Preview. The attestation packet reads as one continuous evidence stream.

Cost: one additional bit of Playwright wiring — an admin browser context with the ADMIN_EMAILS credential and the resolve-button click. That's an hour or two of engineer time, not a slip on the calendar. And it produces the regression guard that survives past Gate 4.

## §3 · Deliverables under Option 3

Consolidated list — engineering executes in order:

1. **Un-fixme** `reconciliation_ff3.spec.ts` (or wherever the Playwright reconciliation walk lives). Verify the reconciliation-mismatch → option (3) "broker review" path completes and writes a row matching the §1 predicate.

2. **Extend the same spec** to add a second browser context authenticated as an ADMIN_EMAILS user, navigate to `/admin/ff3-review`, verify the row appears with the correct fields (session id, reconciliation_resolved_at, direct deep link), enter a deterministic test note, click Resolve, verify 200 response.

3. **Assert the DB state after resolve** in the spec: `broker_resolution_note`, `broker_resolution_resolved_at`, `broker_resolution_reviewer_email` all populated per migration 048 (per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §4.2). Assert the row still matches the *resolved* predicate (`broker_resolution_note IS NOT NULL`) rather than the awaiting predicate.

4. **Re-enter the owner session** in the original owner context. Verify entry-13 (`chatFf3ResumeAfterBrokerReviewCard`) renders with the exact `{broker_resolution_note}` interpolation matching the note the admin wrote. Screenshot this.

5. **Test note discipline** — use a fixture note that reads sensibly as owner-facing prose, not a stub like "test note 123." Suggested fixture: `"The amount you entered matches your ledger for the June 2026 period. You can continue with the notice as drafted."` This mirrors the placeholder-warning discipline from [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §6.1 and produces an entry-13 screenshot that itself reads well as evidence.

6. **Fixture cleanup at test-end** — the same spec deletes its own session row after asserting resume. Keep Preview clean.

## §4 · Sequencing against the flag flip

Order stays consistent with [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md) §5:

1. Un-fixme + extend the Playwright spec (deliverables §3.1–§3.6). Land in a PR to `main`.
2. Do NOT flip `FF3_CAPTURE_ENABLED` in Vercel until that PR is merged.
3. Set `FF3_CAPTURE_ENABLED = true` **in Preview scope only** on Vercel.
4. Run the full Playwright spec against Preview.
5. Capture the attestation packet from that run: video, screenshots at each stage, Playwright test-log output, SQL evidence dump of the session row's before/after state.
6. Submit the packet to me. I countersign flag-on **retroactively** — meaning: the flag is technically on before I countersign, but I'm attesting the evidence *produced under the flag* is Gate-4 clean. If the evidence fails, we flip the flag off, fix, and re-run.

**Fork on step 6:** if you'd rather sequence it as flag-off-until-countersign (Playwright runs against Preview with flag off, evidence captured, countersign, flag on) — I'd accept that too. Engineering's call which is smoother. The retroactive path is more common because Playwright needs the flag on to exercise the produce path realistically. Say which and I'll ratify.

## §5 · What this ruling does NOT do

- Does NOT authorize `FF3_CAPTURE_ENABLED = true` in Preview yet. That happens after the extended spec merges to `main`.
- Does NOT authorize prod flip. Still a separate future ruling with its own two-tier gates per [`gate2_prod_runwindow_runbook_2026-07-02_amended.md`](file:///home/user/workspace/gate2_prod_runwindow_runbook_2026-07-02_amended.md).
- Does NOT modify anything in [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md). Migration 048, admin surface behavior, resolution-endpoint semantics all stand as ruled.
- Does NOT authorize expanding the Playwright fixture to seed multiple concurrent awaiting rows. One row per spec run; the spec is a compliance walk, not a load test.

## §6 · Companion rulings

- [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) — the surface being tested
- [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md) §5 — the four-gate sequencing this ruling threads through
- [`ff3_migration_042_cobatch_build_countersign_broker_ruling_2026-07-10.md`](file:///home/user/workspace/ff3_migration_042_cobatch_build_countersign_broker_ruling_2026-07-10.md) — Block A + migration 042 cleared, prerequisite for this step
- [`omnibus_broker_ruling_2026-07-04.md`](file:///home/user/workspace/omnibus_broker_ruling_2026-07-04.md) Item 13 — `ADMIN_EMAILS` value the admin browser context authenticates as

---

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-11
Authority: Cal. Bus. & Prof. Code § 10131(b)
