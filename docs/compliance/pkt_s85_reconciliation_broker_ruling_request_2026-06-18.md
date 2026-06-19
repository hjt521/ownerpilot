# Build-side escalation — broker ruling requested: packet_redesign §8.5 reconciliation (Option B vs C)

**Authored by:** Build side (engineering) — escalation request for broker determination.
**File:** `pkt_s85_reconciliation_broker_ruling_request_2026-06-18.md`
**Date:** 2026-06-18
**From:** Build side (OwnerPilot AI engineering)
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Subject:** How to reconcile §8.5 of `packet_redesign_compliance_review_broker_determination_2026-06-18.md` now that C7a has been replaced (Branch B, committed `9baefe5`).

**Posture:** Build-side question only. Build side authors no compliance-determination prose. The §8.5 replacement text and the ruling below are left blank for the broker. Build side will transcribe the broker's verbatim text into an exact-match-or-abort patch.

---

## 1. What is committed right now (disk-verified 2026-06-18)

- **C7a determination:** replaced with the Branch-B (`…-3`) state — committed `9baefe5`. No parenthetical; `Ten` on both count lines; §11 = "Future amendment authority."
- **packet_redesign §8.5 (still as committed, untouched):** heading `### §8.5 Staged mechanical fixes (build side applies all three, verbatim)`. It stages **three** edits to C7a as still-to-do, including edit #2, the parenthetical rewrite. It closes: "build side may apply the three §8.5 edits to the C7a determination at any time."

**The seam:** §8.5 as committed instructs build side to apply three surgical edits to a C7a file that **no longer exists in that form** — Branch B replaced it wholesale. The three staged edits are now moot (the count is already `Ten`; the parenthetical edit #2 targets a parenthetical that is gone). Left unchanged, the committed audit trail tells a future reader to perform edits that cannot apply and were superseded.

**Note — three §8.5 versions existed across workspace and repo:**

- **Committed (repo):** "Staged mechanical fixes … applies all three, verbatim" — the original to-do inventory. *(this is the real starting point)*
- **Workspace `…-3`:** "Mechanical fixes — APPLIED 2026-06-18" — a reconciled draft that never reached the repo.
- **Workspace `…-4`:** "Mechanical fixes — SUPERSEDED by Branch-B …" — the post-ruling draft that never reached the repo.

The earlier ruling (`c7a_filestate_broker_ruling_response_2026-06-18.md` §4) authored a REPLACE block against the **workspace `…-3` "APPLIED"** text. That FIND does not exist in the repo, so that patch aborted. Any §8.5 edit must now be authored against the **committed "Staged" block**.

## 2. A factual seam to resolve before reusing the prior REPLACE text

The prior ruling's REPLACE block (the "SUPERSEDED" paragraph) states, verbatim:

> "…the surgical 'Eleven→Ten' edits described in the prior draft of this section **were applied**; those edits therefore landed against the workspace artifact and did not reach the repo."

The committed §8.5 never claimed the edits were applied — it **stages** them ("build side applies all three, verbatim"). So dropping that REPLACE text in verbatim would have the audit trail assert the committed section once said "applied," which it did not. If the prior REPLACE text is reused, this clause needs the broker's adjustment to match what the committed section actually said (staged, not applied).

## 3. Ruling requested — Option B or Option C

**Option B — reuse the prior "SUPERSEDED" REPLACE block, broker-adjusted.** Broker confirms the prior REPLACE paragraph (from `c7a_filestate_broker_ruling_response_2026-06-18.md` §4) should replace the committed "Staged mechanical fixes" block, **with the "were applied" clause (§2 above) corrected to "staged."** Build side rebuilds the FIND from the real committed bytes, drops in the broker-corrected REPLACE verbatim, sandbox-tests, ships as a single-target patch.

**Option C — fresh §8.5 supersession text.** Broker authors a new replacement block written directly against the committed "Staged mechanical fixes" starting point (no "prior draft / were applied" framing to untangle). Build side transcribes verbatim.

Either way the disposition is the same in substance: §8.5 should record that the three staged edits were **superseded by the Branch-B whole-file replacement of C7a (committed `9baefe5`)**, with a pointer to `c7a_filestate_broker_ruling_response_2026-06-18.md` as the authoritative resolution. Only the wording origin differs (reuse-and-correct vs. fresh).

## 4. Build-side mechanics once text is provided

- FIND = the exact committed §8.5 block, heading `### §8.5 Staged mechanical fixes …` through the end of the "Status: CLOSED for this packet." paragraph, rebuilt byte-exact from the repo (exact-match-or-abort; if the committed bytes differ by even one character, the patch aborts and reports, no write).
- REPLACE = the broker's verbatim text from Option B or C.
- Single-target patch on `docs/compliance/packet_redesign_compliance_review_broker_determination_2026-06-18.md`. Idempotent. Then the standard checkpoint chain and a named-add commit.

---

## Broker ruling

- **Option chosen (B / C):**
- **If B — confirm reuse of the prior REPLACE block:** (yes / no)
- **If B — corrected "were applied" → "staged" clause, verbatim:**
- **If C — full verbatim §8.5 replacement block:**
- **Should the "Status: CLOSED" closing paragraph be retained, revised, or dropped:**
- **Sign-off:**

---

— Awaiting broker ruling. No packet_redesign edit until the above is authored. C7a (Branch B) already committed `9baefe5`.
