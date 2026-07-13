# FF-3 Block C — Resume and Pause Seams

**Broker Compliance Review · 2026-07-12 (early PT)**

Ruling on the two gaps engineering surfaced during Block C wiring prep:

- **Gap A** — no server resume contract exists for the "Continue" action on the entry-13 resume card.
- **Gap B** — selection (2) `notice_wrong` returns `ff3_notice_wrong_pause` (409) but has no ratified owner-facing pause surface.

Both are the same class of catch as the entry-13 reply-clause mismatch — surfaces referenced in prior rulings whose server-side contract or copy was never built. Both stop-the-line, both to be ruled together.

Companions: [`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md), [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md).

---

## §0 · Ruling summary

| Gap | Ruling | Block C impact |
|---|---|---|
| **A** — server resume contract missing | **Define a proper resume contract (Option 2).** Small, focused server addition; keeps Block C's compliance intent intact. Reject Option 1 (reuse `selection='1'`) — reasoning in §1.2. | Adds one server endpoint, one migration column, one client wire-up. Blocks C. |
| **B** — selection (2) pause surface missing | **New pause-state locked-prose entry** `chatFf3NoticeWrongPause`. Ratified inline in this ruling (§2.3). Manifest 129 → 130. | Adds one entry to the manifest, one client screen, no new server work. Blocks C. |

Net effect: Block C now depends on one small server addition (Gap A) + one new locked-prose entry (Gap B). Corrected calendar in §4.

---

## §1 · Gap A — server resume contract

### §1.1 · What's actually missing

The entry-13 flow (`…ContinueOnly` variant per [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md) §3) renders after the broker has resolved the awaiting-review row. Owner taps "Continue." Today there is no server behavior that carries the session forward — re-POSTing the original produce payload would re-hit the reconciliation gate because the underlying amount mismatch hasn't changed. The broker's `broker_resolution_note` is prose in the DB; it doesn't influence the produce gate's math.

Concretely, what "Continue" needs to mean is: **the session is authorized to proceed past the reconciliation gate on this specific amount for this specific ledger period, because a broker resolved the mismatch out-of-band.** That authorization needs to be a durable server-side fact that the produce path reads.

### §1.2 · Why not Option 1 (reuse `selection='1'` proceed path)

`selection='1'` means "the notice amount is right, my rent-period records are incomplete or out of date" — that's an *owner-authored claim about their own records*. Piggybacking the broker's resolution on that path erases the compliance-critical distinction between "owner claimed their records were incomplete" and "broker reviewed and authorized proceeding." Those are two very different audit facts:

- If a downstream compliance question ever asks "who took responsibility for the amount discrepancy on session X?", the audit log for a piggybacked `selection='1'` says the owner did. It didn't.
- The reconciliation_resolution column would say `'broker_review'`, but the effective downstream path would be indistinguishable from `'records_incomplete'`. That's an integrity gap.
- Reversing the piggyback later (once a proper resume contract lands) requires re-migrating historical rows — a needless mess.

Reject Option 1.

### §1.3 · Why not Option 3 (defer resume to a follow-up block)

Deferring resume means Block C ships with a resume card that has no working Continue action. Owner sees a note from the broker, taps Continue, nothing happens (or a soft error). That's exactly the class of owner-facing copy/behavior mismatch the entry-13 reply-clause catch avoided. Can't ship the resume card without a resume path.

The alternative — ship Block C without the resume card at all, deferring the *entire* resume experience — collapses the escalate→resolve→resume evidence path that Gate 4 rests on. We'd be back to the SQL-seed problem: no way to demonstrate the walk works end-to-end.

Reject Option 3.

### §1.4 · Adopted — Option 2: define a proper resume contract

Scope, deliberately narrow:

**Server side:**

1. **Migration 049** — add one column to `chat_sessions`:
   ```sql
   ALTER TABLE chat_sessions
     ADD COLUMN broker_resume_authorization jsonb NULL;
   ```
   Nullable, additive, no soak required (same discipline as migration 048). Stores the authorization scope as a small JSON object; §1.5 defines the shape.

2. **Admin resolve endpoint update** — when a broker resolves an awaiting row via `/admin/ff3-review` (per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §4), the resolve action *also* writes `broker_resume_authorization` in the same transaction. The auth object captures the exact amount+period the broker authorized proceeding on. **This does not change the ratified admin surface behavior** — the broker still writes only the note; the authorization object is derived server-side from the session's reconciliation state at resolve time. No new admin UI field.

3. **New endpoint** `POST /api/chat/ff3/resume` — thin. Reads the session, checks `broker_resume_authorization IS NOT NULL`, validates the current produce request matches the authorized scope (same amount, same ledger period, same session id, requesting user matches the session owner), stamps a `broker_resume_consumed_at` timestamp on the session, and returns a signed continuation token the produce path recognizes.

4. **Produce path check** — modify the FF-3 reconciliation gate to first check for an unconsumed broker resume authorization on this session. If present and scope matches, bypass the reconciliation math and proceed. If present but scope doesn't match (owner somehow changed the amount after broker resolution — see §1.5), invalidate the authorization and re-run reconciliation normally.

**Client side:**

5. Entry-13 `…ContinueOnly` "Continue" button calls `/api/chat/ff3/resume` first, then on 200 with the continuation token, re-POSTs the original produce request with the token in the payload. On any error from `/resume`, the owner sees a soft error message directing them to close and re-open the session; the resume authorization on the server side is untouched.

### §1.5 · Authorization scope object

Server-authored, stored in `broker_resume_authorization` at admin-resolve time:

```json
{
  "amount_of_rent_owed_cents": <int>,
  "ledger_period_start": "YYYY-MM-DD",
  "ledger_period_end": "YYYY-MM-DD",
  "session_id": "<uuid>",
  "authorized_at": "<timestamptz>",
  "authorized_by_email": "<broker email from ADMIN_EMAILS>",
  "resolution_note_hash": "<sha256 of broker_resolution_note at authorization time>"
}
```

Every field is a scope constraint. The produce path validates all six against the current request. If any drifts, the authorization is invalid for the current request. This is intentional — a broker's resolution is scoped to the *specific* mismatch they reviewed. If the owner comes back a week later with a different amount typed in, that's a new mismatch that needs a new review.

**`resolution_note_hash` is included as a scope constraint** — if the broker's note were edited between resolve and resume (the admin surface ruling forbids edit-after-resolve per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §4, but defense-in-depth), the hash mismatch invalidates the resume. That way any future DB-side tampering with the note also invalidates the resume authorization.

### §1.6 · One-shot consumption

`broker_resume_consumed_at` is set the first time the resume endpoint successfully issues a continuation token. Subsequent resume calls for the same session return 409 `ff3_resume_already_consumed`. If the owner needs to escalate again after using their one resume (e.g., they hit reconciliation again on a different amount), they go through the full reconciliation walk again → new broker review → new resolution → new authorization. This is deliberate: one broker review authorizes one produce attempt, not an open-ended override on the session.

**Do not build an owner-facing screen for `ff3_resume_already_consumed`** — this state is only reachable via client bugs or replay attacks; a soft error is sufficient.

### §1.7 · Playwright coverage

The extended spec per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §3 now covers:

- Assertion after admin resolve: `broker_resume_authorization` populated with correct scope, all six fields match the session's reconciliation state at resolve time.
- Assertion after owner taps Continue: `broker_resume_consumed_at` populated, session advances past reconciliation gate to next produce step.
- Negative case: mid-spec, mutate the session's `amount_of_rent_owed_cents` before Continue → assert resume endpoint returns 409 `ff3_resume_scope_mismatch`, owner sees soft error, authorization remains unconsumed. (This exercises §1.4-4 explicitly.)

## §2 · Gap B — selection (2) pause surface

### §2.1 · What selection (2) means

From the ratified entry-14 verbatim mapping (per [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md) §1):

> **(2) The rent-period records are right, the notice amount is wrong.**

Owner is telling us they typed the amount incorrectly and the ledger is authoritative. Compliance intent: the flow *cannot proceed* with a knowingly-wrong amount on the notice. Pausing is correct — the ratified server behavior returns `ff3_notice_wrong_pause` (409), and the owner needs a surface that reflects that state.

### §2.2 · What the pause needs to do

- Acknowledge the owner's selection.
- Do NOT auto-correct the amount to the ledger sum. Corrective input has to be owner-authored, not system-imposed — the owner may want to consult their records, dispute a ledger entry, or start a new session with a different amount entirely.
- Provide a single action: "start over with the correct amount" — which resets the FF-3 capture flow so the owner can re-enter a new amount from scratch. This does NOT re-use the current session; it starts a new session. Reason in §2.4.
- No timeframe promise, no notification, no "we'll fix it" language.

### §2.3 · Ratified locked-prose entry — `chatFf3NoticeWrongPause`

**Final ratified string (Tier A, shape-B):**

> Got it — the amount on the notice was wrong. I don't want to guess at the right number, so let's start over from the top with the correct amount. When you're ready, open a new session and enter the amount your rent-period records show. Your progress on this session ends here.

**Self-check confirmations:**
- No banned terms.
- No auto-correct claim.
- No timeframe.
- No notification promise.
- Clear end-state for the current session ("progress on this session ends here").
- Owner-driven next action (open a new session, re-enter amount).
- No CTA button rendering "correct" or "the ledger amount is $X" — the owner types the new amount themselves in the new session.

**Placement:** Tier A, shape-B, new entry. Manifest key: `chatFf3NoticeWrongPause`. Floor moves 129 → 130.

### §2.4 · Why "start new session" rather than "edit and retry in place"

Editing the amount in-place on the current session preserves the reconciliation-gate history on a row that now has a corrected value. The audit trail becomes ambiguous: was the amount `$X` (the wrong one) or `$Y` (the corrected one) at the time the produce gate ran? Which one is the "canonical" input? Session-level FF-3 audit becomes messy.

New session means the wrong-amount session ends cleanly (owner's own attestation that they entered the wrong amount), and the new session starts with a fresh audit trail keyed to the corrected amount. This mirrors the discipline of never rewriting historical rows — new intent, new row.

**Client-side implementation of "start new session":** the pause screen has one action button labeled `"Start a new session"`. Tapping it navigates the owner to `/chat` fresh (new session id), same as if they'd manually started over. The wrong-amount session's row remains in the DB with `reconciliation_resolution = 'notice_wrong'` and its `reconciliation_resolved_at` timestamp; no further activity on that row.

**Client button label discipline:** `"Start a new session"` is a system-action label, not owner-facing prose about compliance state. Engineer may author this label directly — it names a UI action rather than making a claim about the notice, the amount, the broker, or the flow's semantics. This is the same class as browser "Back" buttons or form "Submit" buttons — action labels, not prose. Explicit exception to the Block C "no engineer-authored owner-facing prose" rule, narrowly scoped to action-only labels that name what the button does mechanically.

## §3 · Manifest state after this ruling

Post-ratification of §2.3:

- Shape-A: 59 (unchanged)
- Shape-B: 70 → 71 (`+chatFf3NoticeWrongPause`)
- **Total floor: 129 → 130**

Engineer's next action on the manifest: hash the exact string in §2.3 (single paragraph, single spaces between sentences, straight apostrophes as with the prior ratification), append to `locked_prose_manifest_phase2_assembly.json` under shape-B, run `ci:verify-locked-prose`, capture floor 130 in the Block C PR description.

## §4 · Corrected sequencing and calendar

Block C dependency chain updated:

1. **Locked-prose amendment for `chatFf3NoticeWrongPause`** — engineer hashes + appends now. Same-day. Floor 129 → 130.
2. **Server side of Gap A** — migration 049, admin resolve endpoint update, new `/api/chat/ff3/resume` endpoint, produce path gate update. Its own PR ("PR B-server-resume") ahead of PR C. Reason for its own PR in §4.1.
3. **PR C** — Block C client wiring, now covering:
   - Selection (1) proceed path (unchanged from prior scope)
   - Selection (2) → new pause screen rendering `chatFf3NoticeWrongPause` + "Start a new session" action
   - Selection (3) → held state (unchanged from prior scope)
   - Entry-13 `…ContinueOnly` resume card, "Continue" calls `/api/chat/ff3/resume` then produce
   - Soft-error handling on resume endpoint failures
4. **PR B — extended Playwright spec** per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §3 + the new coverage in §1.7 above.
5. **Preview flag flip + attestation + Gate 4 countersign.**

### §4.1 · Why PR B-server-resume is separate from PR C

Same reasoning as splitting Block C from PR B originally: the server resume contract is a compliance-weighted change (it introduces the mechanism by which broker authorization overrides the reconciliation gate — a genuinely audit-relevant piece of code). I want it isolated in the commit history under its own review. Combining it into PR C bundles two structurally distinct concerns and makes both harder to review.

PR B-server-resume can go up in parallel with the locked-prose hashing since it doesn't depend on new prose. Rough sequencing:

- Day 0 (today): manifest hash + append; engineer starts on PR B-server-resume.
- Day 1: PR B-server-resume review + merge. Engineer starts on PR C.
- Day 2-3: PR C review + merge.
- Day 3-4: PR B (Playwright) build + merge.
- Day 4-5: Preview flag flip + attestation + Gate 4.

**Corrected calendar: 4-6 working days to flag flip.** Prior estimate was 3-5; this ruling adds one day for the server-resume PR. Still not a slip against any committed date.

## §5 · What this ruling does NOT do

- Does NOT authorize any change to the ratified admin resolve surface behavior (per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md)) — the authorization object is derived server-side from state that already exists.
- Does NOT authorize edit-after-resolve on the broker's note. Still forbidden. `resolution_note_hash` in the authorization is defense-in-depth against that ever changing.
- Does NOT authorize multi-shot resume. One broker review → one authorized produce attempt.
- Does NOT authorize an owner-facing screen for `ff3_resume_already_consumed`. Soft error only.
- Does NOT authorize the reply-to-broker seam. Still deferred.
- Does NOT authorize prod flip. Still a separate future ruling.

## §6 · Companion rulings

- [`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md) — Block C shape and scope
- [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md) — locked-prose additions for held state and continue-only variant
- [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) — Block B admin surface
- [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) — Playwright evidence path, extended in §1.7 above

---

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-12
Authority: Cal. Bus. & Prof. Code § 10131(b)
