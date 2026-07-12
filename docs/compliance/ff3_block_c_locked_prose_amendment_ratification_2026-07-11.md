# FF-3 Block C — Locked-Prose Amendment Ratification

**Broker Compliance Review · 2026-07-11 (late PT)**

Ratifying the three-item amendment ask engineering filed against [`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md) §4. Same-day turnaround per §5 sequencing.

Companions: [`ff3_block_c_locked_prose_amendment_ask_2026-07-11.md`](file:///home/user/workspace/uploaded_attachments/3692068afa444091a9378b986fe5e741/ff3_block_c_locked_prose_amendment_ask_2026-07-11.md), [`ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md`](file:///home/user/workspace/ff3_countersign_ordering_awaiting_review_reconciliation_2026-07-03.md).

---

## §0 · Ruling summary

| Ask item | Ruling | Manifest Δ |
|---|---|---|
| §1 entry-14 button labels | **Confirm verbatim-substring mapping** (no amendment) | 0 |
| §2 held-state `chatFf3AwaitingBrokerReviewHeld` | **Ratify draft with two small edits** (§2 below) | +1 |
| §3 entry-13 reply-clause mismatch | **New key `…ContinueOnly` with edits** (preserve entry-13 for future reply-seam block) | +1 |

**Net manifest floor: 127 → 129.** Engineer proceeds to hash + append.

---

## §1 · Entry-14 button labels — ratified as verbatim-substring mapping

**Ratified.** No amendment to entry-14. Buttons render the three bolded ordinal sentences from `chatFf3AmountReconciliationFlag` verbatim as label text, mapped to `reconciliationSelection: "1" | "2" | "3"` per engineer's proposal.

**Why the verbatim-substring path over discrete short labels:**

Short button labels ("The typed amount is correct", "The ledger is correct", "Send for review") would be *engineer-authored owner-facing prose* — exactly what Block C's ruling §4 forbids. Adding them as new manifest entries is possible but pointless: the ratified entry-14 sentences already function as complete, self-contained action prompts, and each sentence begins with the ordinal `(1)` / `(2)` / `(3)` which naturally scans as a button identity. Owner reads the card body once (the three-sentence enumeration); the same three sentences repeat as buttons below. That's mild redundancy but zero compliance risk. Discrete labels would introduce interpretation drift ("is the notice amount right or is the record right?") that the ratified full sentences don't have.

**Rendering discipline** — must hold at implementation:

- Buttons render the **entirety** of each ordinal sentence, including the ordinal itself, verbatim from the manifest string. No truncation, no ellipsis, no rewording.
- If the sentences are long enough that buttons need to wrap, they wrap. Do not shorten.
- Ordinal-prefix parsing is a client-side regex against the ratified string — never a hand-typed literal. If entry-14 is ever amended in the future, the button rendering must re-derive from the new manifest text, not from a Block C hard-coded array.
- No decorative icons on the buttons. No colored highlights suggesting one is "recommended." Neutral treatment across all three.

## §2 · Held-state entry `chatFf3AwaitingBrokerReviewHeld` — ratify with two edits

The engineer's draft is close. Two edits — both tightening claims, no expansion.

**Final ratified string (Tier A, shape-B):**

> Thanks — I've handed this to a broker for review. A California-licensed real estate broker will look at the amount we flagged and leave a note here on how to proceed. There's nothing to do right now — you can close this window and come back anytime. Your next visit to this session will show the broker's note if it's ready, or this same screen if the review is still open.

**Edits vs. the engineer's draft:**

1. **"leave a note on how to proceed" → "leave a note here on how to proceed."** One-word addition. The "here" anchors the promise to *this surface* (the chat session), which matches Decision 2 (no push/email/SMS auto-notify — resume is owner-driven by re-opening the session). Without "here" the sentence reads as if the note might arrive somewhere else.

2. **Final sentence reworded** — from "When you come back and open your session, the broker's note will be here and we'll continue from there" to the two-outcome version above. The engineer's original implicitly promises the note *will* be ready on the next visit. It might not be. The two-outcome sentence is honest: next visit shows either the resume card (if resolved) or the same held-state screen (if not). No timeframe promise, no notification-mechanism claim, but no false certainty either.

**Self-check confirmations** (matching the engineer's original discipline):
- No banned terms (no verified/guarantee/legally compliant/court-ready/attorney).
- No notification-mechanism claim.
- Broker credential stated plainly with jurisdiction.
- No timeframe promise.
- Mirrors the admin success-string discipline from [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md) §6.1 — surface when the owner next opens their session.
- No CTA button on the held-state screen. Content only.

**Placement:** Tier A, shape-B, new entry. Manifest key: `chatFf3AwaitingBrokerReviewHeld`.

**Engineer's next action on this item:** compute SHA-256 of the exact string above (single paragraph, no leading/trailing whitespace, single spaces between sentences), append to `locked_prose_manifest_phase2_assembly.json` under shape-B, run `npm run ci:verify-locked-prose`, capture the new floor number in the Block C PR description.

## §3 · Entry-13 reply-clause mismatch — new key `chatFf3ResumeAfterBrokerReviewCardContinueOnly`

**Ratified: new key, not amend-in-place.**

Preserve entry-13 (`chatFf3ResumeAfterBrokerReviewCard`, hash `11d9d634…`) untouched in the manifest. The reply-clause language stays ratified for a future block when the server-side reply seam ships. Block C renders the new `…ContinueOnly` variant instead, which has the same interpolation contract minus the reply promise.

**Why new key rather than amend-in-place:**

Amend-in-place would remove the reply promise from the ratified entry, then require re-adding it (with a different hash) when the reply seam eventually ships. That's two amendment cycles on the same entry over a period where the underlying compliance intent hasn't actually changed — the intent has always been "let the owner reply." What's changing is only the *shipping cadence.* Preserving entry-13 keeps the manifest history clean: one entry authored once, ratified once, and *rendered* only when its full server contract is in place. The `…ContinueOnly` variant is explicit temporal scaffolding, and when it's retired at reply-seam ship time, we retire it as its own manifest event rather than folding it into a re-amendment of entry-13.

**Final ratified string for `chatFf3ResumeAfterBrokerReviewCardContinueOnly`:**

> Thanks for your patience. A California-licensed real estate broker has reviewed the amount we flagged and left a note. Here's what the broker wrote: **{broker_resolution_note}** If that reads right for your situation, tap continue and we'll pick up where we left off.

**Edits vs. the engineer's draft:**

1. **"A broker has reviewed the details of your case" → "A California-licensed real estate broker has reviewed the amount we flagged."** Two changes bundled. First, restate the credential + jurisdiction (matches the held-state entry §2 above — consistency across the pair). Second, narrow "the details of your case" (broad, sounds like a legal review) to "the amount we flagged" (specific, matches what the broker actually reviewed — a reconciliation of typed amount vs. ledger). "Details of your case" is close to attorney-scope framing and I don't want it in the ratified prose.

2. **"Before we pick back up, take a quick look at the note the broker left" → "Here's what the broker wrote"** — tightens. The engineer's phrasing sequences the reading ("before we pick back up... take a look... the note"); the edit just presents it. Owner reads the interpolated note in-line as the next thing they see.

3. **"If that looks right and matches what you meant" → "If that reads right for your situation."** "What you meant" implies the owner authored the amount and we're checking their intent. In fact the broker is the author of the resolution and the owner is confirming they can proceed on it. "For your situation" is truer to the flow and avoids implying the broker's note is a corrective read of the owner's earlier input.

4. **"I'll move us to the next step" → "we'll pick up where we left off."** "Move us to the next step" reads as system-driven advancement; the flow is genuinely a resume of what was interrupted. Matches the paused-mid-produce mental model.

**Interpolation contract** — same as entry-13:
- `{broker_resolution_note}` — required, must be populated by server, must render verbatim.
- Bold formatting on the interpolated slot per the manifest's markdown convention.

**Self-check confirmations:**
- No banned terms.
- Credential + jurisdiction stated.
- Scope of broker's action is narrow ("amount we flagged"), not broad ("your case").
- No reply-to-broker promise. Only continue.
- No auto-advance implication.
- No "verified" / "reviewed and approved" framing.

**Placement:** Tier A, shape-B, new entry. Manifest key: `chatFf3ResumeAfterBrokerReviewCardContinueOnly`.

**Engineer's next action on this item:** compute SHA-256 of the exact string above (single paragraph, single spaces between sentences), append to `locked_prose_manifest_phase2_assembly.json` under shape-B, run `npm run ci:verify-locked-prose`, capture the new floor number in the Block C PR description.

## §4 · Post-ratification manifest state

- Shape-A: 59 (unchanged)
- Shape-B: 68 → 70 (+`chatFf3AwaitingBrokerReviewHeld`, +`chatFf3ResumeAfterBrokerReviewCardContinueOnly`)
- **Total floor: 127 → 129**

Entry-14 (`chatFf3AmountReconciliationFlag`) hash unchanged. Entry-13 (`chatFf3ResumeAfterBrokerReviewCard`) hash unchanged and remains in the manifest, unrendered by Block C, awaiting future reply-seam block.

## §5 · What this ratification does NOT do

- Does NOT authorize any further amendment to entry-13 or entry-14.
- Does NOT authorize the reply-to-broker button in Block C — that ships in a later block when server seam exists.
- Does NOT authorize adding a "when will the broker reply?" timeframe to any of the ratified strings.
- Does NOT authorize CTAs on the held-state screen. Content only, per §2.
- Does NOT authorize interpolation of `{broker_resolution_note}` anywhere other than the `…ContinueOnly` entry.

## §6 · Sequencing next

Per [`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md) §5:

1. **Now:** engineer hashes both new strings, appends to `locked_prose_manifest_phase2_assembly.json`, runs `ci:verify-locked-prose`, captures new floor 129 in PR C description.
2. **Then:** engineer builds PR C — Block C client wiring against manifest floor 129.
3. **Then:** PR C review + merge to `main`. All guards green including manifest at floor 129. `FF3_CAPTURE_ENABLED` still false everywhere.
4. **Then:** PR B — extended Playwright spec per [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md) §3.
5. **Then:** Preview flag flip + attestation + Gate 4 countersign.

---

Signed:
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-11
Authority: Cal. Bus. & Prof. Code § 10131(b)
