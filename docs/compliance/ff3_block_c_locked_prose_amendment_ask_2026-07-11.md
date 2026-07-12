# FF-3 Block C — Locked-Prose Amendment Ask — 2026-07-11

**Status:** AWAITING BROKER RATIFICATION. Engineering drafts below; broker authors/ratifies the final strings.
Per the manifest discipline, engineering computes SHA-256 only — the broker owns every owner-facing byte.
**Authority:** `ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11` §4.
**Blocks:** Block C does not merge with engineer-authored owner-facing strings in it. This ask must clear first.

Manifest floor today: **127** (shape-A 59 + shape-B 68). This ask's net effect: **127 → 129** (see §4).

---

## §1 — Entry-14 button labels (ruling §4.1): NO new strings needed — confirm mapping

The three-way options are **already ratified verbatim inside** `chatFf3AmountReconciliationFlag` (manifest entry 14,
hash `20a29e87…`). The card body enumerates them as bolded sentences:

> **(1) The notice amount is right, my rent-period records are incomplete or out of date.** …
> **(2) The rent-period records are right, the notice amount is wrong.** …
> **(3) I need help figuring out which is right.** …

**Proposal:** the Block C three-way selection renders the entry-14 card verbatim, then three buttons whose labels
are these three sentences **verbatim** (the ordinal-(1)/(2)/(3) substrings already in the ratified entry). No new
locked prose, no manifest change for entry-14 — the buttons reuse ratified text.

- Button (1) → re-POST `reconciliationSelection: "1"` → `records_incomplete` → continue.
- Button (2) → re-POST `reconciliationSelection: "2"` → `notice_wrong` → pause.
- Button (3) → re-POST `reconciliationSelection: "3"` → `broker_review` → awaiting review.

**Broker decision:** ☐ Confirm verbatim-substring mapping (no amendment)   ☐ Amend to add discrete short labels
(if amended, +N new entries — please supply the strings).

---

## §2 — New entry `chatFf3AwaitingBrokerReviewHeld` (ruling §3.2 / §4.2): held-state screen

Shown to the owner immediately after they pick option (3) and the produce seam returns `ff3_awaiting_broker_review`.
No advance action; no notify claim (Decision 2 — no auto-notify); no timeframe promise.

**DRAFT (broker to ratify or replace):**

> Thanks — I've handed this to a broker for review. A California-licensed real estate broker will look at the
> amount we flagged and leave a note on how to proceed. You don't need to do anything right now. When you come
> back and open your session, the broker's note will be here and we'll continue from there.

Self-check: no banned terms (no "verified/guarantee/legally compliant/court-ready…"); no notification-mechanism
claim; broker credential stated plainly; mirrors the admin success-string discipline ("surface when the owner next
opens their session"). Tier A, shape-B. **+1 entry → shape-B 69.**

**Broker decision:** ☐ Ratify draft   ☐ Replace with: ____________________

---

## §3 — Entry-13 reply-clause mismatch (ruling §3.3): continue-only variant required

`chatFf3ResumeAfterBrokerReviewCard` (entry 13, hash `11d9d634…`) currently ends:

> …If it doesn't look right — or if the broker's note surfaces a question you want to ask before we proceed —
> tap **'reply to broker'** and I'll route your message back for another review.

**Problem:** there is **no server-side reply seam** (no endpoint; `ff3ResumeCard` only interpolates the note).
Ruling §3.5 forbids new endpoints in Block C, and §3.3 says defer reply if the seam doesn't exist and **don't fake
it client-side**. Rendering entry-13 verbatim would promise the owner a "reply to broker" control that does not
exist — an owner-facing copy/behavior mismatch.

**Proposal:** ratify a **continue-only variant** for Block C. The reply clause is restored (revert to entry-13
verbatim) when the reply seam ships as a later block.

**DRAFT continue-only variant** (new key `chatFf3ResumeAfterBrokerReviewCardContinueOnly`, or amend entry-13 in
place — broker's call):

> Thanks for your patience. A broker has reviewed the details of your case and I now have what I need to continue.
> Before we pick back up, take a quick look at the note the broker left: **{broker_resolution_note}**. If that
> looks right and matches what you meant, tap continue and I'll move us to the next step.

Note the tradeoff the broker is accepting: until the reply seam ships, an owner who *disagrees* with the note has no
in-flow "reply" path (they'd continue or leave). That is the §3.3 deferral, made explicit.

**Broker decision:**
☐ New key `…ContinueOnly` (entry-13 preserved for the future reply-seam block) → **+1 entry → shape-B 70 → total 129**
☐ Amend entry-13 in place (reply clause removed until seam ships) → total stays 128
☐ Replace draft with: ____________________

---

## §4 — Net manifest effect

| Item | Action | Δ |
|---|---|---|
| §1 entry-14 labels | reuse ratified substrings (recommended) | 0 |
| §2 held state | new `chatFf3AwaitingBrokerReviewHeld` | +1 |
| §3 resume continue-only | new `…ContinueOnly` key (recommended) OR amend-in-place | +1 or 0 |

**Recommended path → 127 → 129.** Amend-in-place on §3 → 128. Engineering computes the SHA-256 for each ratified
string and appends to `locked_prose_manifest_phase2_assembly.json` (shape-B, tier A) once the broker returns the
final bytes; `npm run ci:verify-locked-prose` then re-attests the new floor.

— Engineering draft for Broker Compliance Review · prepared 2026-07-11
