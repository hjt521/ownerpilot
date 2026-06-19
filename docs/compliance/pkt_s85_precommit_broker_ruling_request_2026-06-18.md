# Build-side escalation — broker ruling requested before committing the §8.5 supersession

**Authored by:** Build side (engineering) — escalation request for broker determination.
**File:** `pkt_s85_precommit_broker_ruling_request_2026-06-18.md`
**Date:** 2026-06-18
**From:** Build side (OwnerPilot AI engineering)
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Subject:** Two reconciliation questions on `packet_redesign_compliance_review_broker_determination_2026-06-18.md` that should be resolved before the §8.5 supersession is committed.

**Posture:** Build-side question only. Build side authors no compliance-determination prose. Any replacement text is left blank below for the broker; build side transcribes verbatim into an exact-match-or-abort patch.

---

## 0. State right now (disk-verified)

- The §8.5 body swap (Option C) is **applied to the working tree, not yet committed.** §8.5 now reads "Mechanical fixes — superseded by Branch-B…"; §8.6 is untouched.
- C7a Branch-B replacement is already committed (`9baefe5`).
- The two questions below concern text the §8.5 patch deliberately did **not** touch.

## 1. [BLOCKING] §8.6-tail "Status: CLOSED" line now contradicts the new §8.5

The line at the end of §8.6 still reads, verbatim on disk:

> **Status: CLOSED for this packet.** §8 miscount ruling is final; build side may apply the three §8.5 edits to the C7a determination at any time without further broker concurrence.

The new §8.5 block directly above §8.6 now says the three edits are **superseded** and "no further action is required." So the §8.6 tail still instructs build side to "apply the three §8.5 edits," which the new §8.5 says no longer exist / were subsumed by the Branch-B replacement. These two statements contradict.

Ruling history: `pkt_s85_reconciliation_broker_ruling_response_2026-06-18.md` §1 ruled this line's disposition **REVISED**, but the `…-5` artifact left it unchanged — so the ruling text and the artifact disagree, and the patch (built to match `…-5`) left it as-is.

**Ruling requested — choose one:**

- **(a) Revise it.** Broker authors verbatim replacement text for this line; build side adds it as a second edit so both land in the same commit.
- **(b) Leave it.** Accept the contradiction on the record (the §8.6 tail keeps "may apply the three §8.5 edits"). Not recommended — it is the kind of internal inconsistency this whole reconciliation set out to remove — but it is the broker's call.

If (a), the new verbatim text is needed below. Build side does not author it.

## 2. [NON-BLOCKING] §8.4 now describes C7a content that no longer exists

§8.4 ("Broker ruling") still reads in the present tense about the pre-Branch-B C7a, e.g.:

> The prose summary in C7a at lines 183 and 279 ("Eleven combinations are valid") is a prose miscount…
> The "five disallowed" figure stated on lines 183, 280, and **the parenthetical on line 183** is correct… The line-183 parenthetical wording (…) is itself a miscount of the five (it sums to six) and is also a prose error…

After Branch B, the committed C7a no longer contains "Eleven combinations are valid" or that parenthetical, and the referenced line numbers have shifted. §8.4 is therefore a present-tense description of a state that no longer exists in the repo.

Two defensible readings, broker's call:

- **(a) Leave §8.4 as historical record** — it is the analytical basis for the miscount ruling, accurate as of when it was written. No change.
- **(b) Revise §8.4** to past-tense / "as-originally-authored" framing so a future reader isn't pointed at C7a content that isn't there. Broker authors the revised wording; build side transcribes.

This does not block the §8.5 commit. It can ride in the same commit if the broker wants, or be deferred.

## 3. Build-side mechanics once ruled

- If 1(a): build side cuts an anchor-exact second edit for the §8.6 Status line (exact-match-or-abort), folds it with the already-applied §8.5 swap, single commit.
- If 2(b): same, anchored on the §8.4 sentences the broker revises.
- If both left as-is: the §8.5 swap commits alone, with the contradictions (1) and staleness (2) on record.
- Then: checkpoint chain (`tsc --noEmit` → `build` → `run_tests` → `ci:verify-locked-prose`) → named `git add` → commit → push.

---

## Broker ruling

- **Q1 (§8.6 Status line) — (a) revise / (b) leave:**
- **Q1 — if (a), verbatim replacement for the Status line:**
- **Q2 (§8.4 staleness) — (a) leave / (b) revise:**
- **Q2 — if (b), verbatim revised §8.4 text:**
- **Commit grouping (all in one commit / split):**
- **Sign-off:**

---

— Awaiting broker ruling. §8.5 swap is staged in the working tree; no commit until the above is resolved.
