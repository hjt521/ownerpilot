# System-Prompt Drift Diff — Attorney Correction

**Reviewer:** Janna Taglyan, JD, SBN 269639
**Subject:** Correction to `system_prompt_drift_diff_attorney_ruling_2026-06-06.md` §3.2 disposition; reconciliation of the 2026-06-02 sign-off chain with commit d20ccc7 and yesterday's drift diff
**Companion to:** `system_prompt_drift_diff_attorney_ruling_2026-06-06.md` (yesterday's diff ruling — this corrects §3.2); `ownerpilot_route_ts_chat_prompt_attorney_signoff.md` (2026-06-02 sign-off); `ownerpilot_route_ts_chat_prompt_attorney_ruling_round_2.md` (2026-06-02 Round 2, contains the verbatim Q8 SELF-HELP and DOCUMENTS interim language); `ownerpilot_route_ts_chat_prompt_attorney_ruling.md` (2026-06-02 Round 1)
**Headline:** **§3.2 disposition retracted and re-disposed. The 2026-06-02 sign-off chain DID cover both the SELF-HELP section AND the DOCUMENTS notice-response wording verbatim. Commit d20ccc7 is correctly attributed; the deployed text is byte-identical to my own Round 2 interim language. No revert, no fresh pass — the §3.2 paragraph is sign-off-of-record from Round 2. Yesterday's "fresh attorney pass required" was a memory-side error on my part: I did not search the 2026-06-02 ruling chain before issuing the disposition, and my drift diff ran against the wrong baseline (the v4-final source document, not the 2026-06-02 conditional sign-off that superseded it on these two sections).**

---

## 1. What changed my answer

Jack asked: did the 2026-06-02 ruling cover the SELF-HELP section and the DOCUMENTS notice-response wording, or only the standing UI disclosure? That is exactly the right question, and I checked the actual 2026-06-02 ruling chain in my workspace before answering. Three files are on the record from 2026-06-02:

- `ownerpilot_route_ts_chat_prompt_attorney_ruling.md` — Round 1, 8 questions
- `ownerpilot_route_ts_chat_prompt_attorney_ruling_round_2.md` — Round 2, three open items resolved verbatim
- `ownerpilot_route_ts_chat_prompt_attorney_signoff.md` — Sign-off, four conditions

The 2026-06-02 sign-off file's conditions 1 and 2 read verbatim:

> **1.** Q8 SELF-HELP section is in the committed prompt **as written in Round 2** — covering lockout, utility shutoff, belongings removal, § 1954 entry, threats / § 1940.3 immigration coercion, and § 1942.5 retaliation — with the CITATION HONESTY carve-out allowing those statutes to be cited by number. ... **If it is not, hold commit and add it.**
>
> **2.** **DOCUMENTS interim language** (from Round 2) remains in force until both (a) the v4 payment-fields wording is signed off, AND (b) the broker-supervised workflow is production-cleared. Restore original v4 DOCUMENTS language only when both are true.

The Round 2 ruling provides the **verbatim** language for both. The DOCUMENTS interim wording in Round 2 (file line 104) reads:

> When a user asks you to write a notice or other landlord-tenant document, respond like this: "I can walk you through the substance — the timing, what has to be in it, what to watch out for — but I'm not going to draft the actual notice here in chat. A produced notice needs broker review, current template versioning, and a service record, and chat isn't the place for that. For the actual draft, the cleanest path right now is to take what we work out together to your broker or attorney for the final draft and service. Want to start with the substance?"

That is byte-identical to the deployed text yesterday's diff flagged in §3.2. Same for the SELF-HELP section: Round 2 specifies it verbatim with the same statute citations (§ 789.3, §§ 1980–1991, § 1954, § 1940.3, § 1942.5) and the same posture language ("never validate, always correct"; "do not validate it, do not 'yes-and' it, and do not soften it"). The CITATION HONESTY carve-out sentence is also specified verbatim in Round 2 line 85: *"The self-help-eviction statutes in the SELF-HELP section are an exception — cite those by number, because the user needs to be able to verify them."*

Commit d20ccc7's attribution to "attorney signed off 2026-06-02" is accurate on the substantive content. The commit did exactly what the 2026-06-02 sign-off chain required.

---

## 2. Why yesterday's diff missed this

Two errors compounded:

**First — wrong baseline.** Yesterday's diff ran against `ownerpilot_system_prompt_v4_final.md` (2026-05-30) as the source of record. That was the right baseline as of 2026-05-30, but the 2026-06-02 ruling chain explicitly amended it in two places: it added the SELF-HELP section to the prompt (Round 2 Q8) and replaced the DOCUMENTS notice-response paragraph with the interim language (Round 2 DOCUMENTS-timing ruling). The 2026-06-02 sign-off file made those amendments conditions of the sign-off. After 2026-06-02, **the canonical source for the deployed prompt is the v4-final AS AMENDED by the 2026-06-02 ruling chain**, not the v4-final standing alone.

The deployed prompt is therefore byte-identical to the 2026-06-02-amended source. The drift I diagnosed in §3.1, §3.2, and §3.3 of yesterday's ruling does not exist as drift. It exists as **amendments I authored and signed off on**, which I then failed to recall when the build side asked me to diff against the wrong-because-stale baseline.

**Second — no search of the ruling chain.** Yesterday I went straight to a textual diff against the v4-final and did not check whether intervening rulings between 2026-05-30 and 2026-06-06 had amended that source. That is the kind of "trust your verbatim cross-reference, not your memory" discipline that the v4 HOW TO PAY ratification (2026-06-05 §1.2) was built on — and I failed to apply it to my own prior rulings two days later. The §0 posture cuts both directions: against the build side (don't paper over gaps), and against me (don't issue a drift finding without checking whether the "drift" is actually a prior sign-off I forgot about).

The build side caught this with one well-placed question. On the record: that question is the §0 posture working exactly as it should.

---

## 3. Re-disposition

### §3.1 CITATION HONESTY exception sentence — RE-DISPOSED

**Previous disposition:** Conditionally adopted into next v4 revision (paired with §3.3).

**Correct disposition:** **ALREADY SIGNED OFF on 2026-06-02 (Round 2 line 85).** Deployed text is byte-identical to the verbatim Round 2 language. No action. No "conditional adoption" — adoption already happened on 2026-06-02 and is baked into the canonical source as of that date.

### §3.2 DOCUMENTS notice-response script — RETRACTED

**Previous disposition:** "Fresh attorney pass required." Revert demanded.

**Correct disposition:** **ALREADY SIGNED OFF on 2026-06-02 (Round 2 DOCUMENTS-timing ruling, file line 104).** Deployed text is byte-identical to the verbatim Round 2 interim language. The substantive change I called out yesterday — "handoff target changed from OwnerPilot's broker-supervised workflow to your broker or attorney" — was a deliberate Round 2 ruling I authored, with the explicit rationale that the v4-final assumed the broker-supervised workflow was live ("if that workflow isn't live yet, the chat will tell users to use a thing that doesn't exist," per the v4-final ops note line 201). The interim language was the right call on 2026-06-02 and remains the right deployed text today, until the two sunset conditions are met.

**Sunset conditions (carried forward from Round 2 verbatim):** Restore the original v4-final DOCUMENTS language the moment both are true:

- (a) v4 payment-fields wording is signed off — **TRUE as of 2026-06-04** (`A1_part_d_attorney_signoff_2026-06-03.md` + `A1_part_d_attorney_countersign_2026-06-04.md`; ratification confirmed 2026-06-05 in `v4_wording_signoff_ratification_and_closeouts_2026-06-05.md`).
- (b) broker-supervised workflow is production-cleared — **STATUS UNKNOWN to me.** Build side or Jack: please confirm whether the broker-supervised workflow is production-cleared today. If yes, sunset condition (b) is also satisfied and the DOCUMENTS interim language should be **scheduled for sunset** in a planned, attorney-reviewed prompt revision — not immediate revert (the interim language is not wrong; it just outlives its purpose once both conditions clear). If no, the interim language continues to run.

[MUST FIX, build side / Jack] — confirm production-clearance status of the broker-supervised workflow so I can rule on whether to schedule the sunset.

**Revert order retracted.** The build side should NOT revert the deployed DOCUMENTS paragraph to v4-final language. The deployed text is the correctly-sign-off-of-record interim language and stays in place until I rule on the sunset.

### §3.3 SELF-HELP section — RE-DISPOSED

**Previous disposition:** Conditionally adopted into next v4 revision; refine §§ 1980–1991 scope statement.

**Correct disposition:** **ALREADY SIGNED OFF on 2026-06-02 (Round 2 Q8, file lines 60-85 approximately).** Deployed text matches the verbatim Round 2 specification. No "conditional adoption" — adoption already happened.

**On the §§ 1980–1991 scope-statement refinement I suggested yesterday.** That suggestion was a yesterday-Janna observation that the current "the only lawful process for left-behind personal property" phrasing is operationally safe but scope-imprecise. **It does not retroactively invalidate the 2026-06-02 sign-off.** The sign-off stands. But the observation is good — the phrasing is slightly overbroad — and I am opening it as a **[CONSIDER]-tier line edit** for the next prompt revision (not a sign-off-blocking item). When the broker-supervised workflow production-clearance question (§3.2 sunset) resolves and the prompt comes back for the next planned revision, I will fold the §§ 1980–1991 wording refinement into the same pass. Until then, the deployed text stands as signed-off-of-record.

---

## 4. The "where this prompt came from" canonical source — for the engagement record

Yesterday's diff was right to want a single canonical source against which to detect future drift. That source needs to be updated to reflect the 2026-06-02 amendments. **I will deliver `ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md` today** — a single file containing the v4 prompt as amended by the 2026-06-02 ruling chain, with the SELF-HELP section and the DOCUMENTS interim language baked in as the source-of-record (not as overlays on the v4-final). That file becomes the new baseline for any future drift diff.

The new file will:

- Reproduce the deployed prompt body verbatim, byte-identical to `ownerpilot_deployed_system_prompt_extracted_2026-06-06_1.md`.
- Identify each amendment (SELF-HELP section, CITATION HONESTY exception sentence, DOCUMENTS interim paragraph) with its source ruling and date.
- Document the DOCUMENTS interim sunset gate (both conditions, current status of each).
- Carry the [CONSIDER]-tier §§ 1980–1991 wording refinement note for the next planned revision.

Once that file lands, the route comment can be updated from "Ported verbatim from `ownerpilot_system_prompt_v4_final.md`" to **"Ported verbatim from `ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md` (supersedes v4 final on SELF-HELP section, CITATION HONESTY exception, and DOCUMENTS interim paragraph; see file for amendment chain)."** Build side: apply that comment update when the file lands.

---

## 5. Workflow-hardening recommendations from yesterday's ruling — adjusted

Yesterday's ruling proposed three workflow-hardening items. Two stand; one is updated:

1. **Git-history check** — **DONE**. The build side ran it and surfaced commit d20ccc7. That was the missing piece, and it is what made this correction tractable. Mark as resolved.
2. **Pre-commit or CI guard on `SYSTEM_PROMPT` changes** — **STILL RECOMMENDED.** Plumbing the build side can implement. The fact that we resolved this one cleanly doesn't mean we don't need the guard; we needed it specifically to catch the case I missed (an attorney-signed amendment that wasn't propagated to the canonical source file). The guard's check should be: any change to `SYSTEM_PROMPT` requires a PR tag pointing to a workspace ruling file by name, with a date no older than 14 days.
3. **Route comment with revision pointer** — **UPDATED.** Use the new v4.1 sign-off file name (see §4) instead of v4-final. Add a content checksum line for the body of the deployed prompt.

---

## 6. On the broker-side discipline that surfaced this

A short note on the record:

The build side's question — "did your 2026-06-02 ruling cover SELF-HELP and DOCUMENTS, or only the disclosure?" — is the single most important sentence in this exchange. It surfaced both (a) a real piece of evidence (the commit attribution and message), (b) the right diagnostic question (was the attribution accurate or over-broad?), and (c) the cleanest unblock (locating the ruling). That sequence is the §0 posture at its best: don't accept the senior reviewer's confident drift finding without testing it against the available evidence.

Specifically, the build side did not push back on yesterday's revert order; they asked a question whose answer would tell us whether the order was correct. That is the better technique than direct pushback because it gives the reviewer (me) the room to retract cleanly without losing face. **Marking this on the engagement record as a workflow datapoint worth preserving.** The pattern is: "you've ruled X; I have evidence that may complicate X; is X still right when the evidence is in?" That is the correct way to handle a finding you suspect is wrong but don't yet have the standing to overturn.

---

## 7. Summary of dispositions

| Item | Yesterday's disposition | Correct disposition |
|---|---|---|
| §3.1 CITATION HONESTY exception sentence | Conditionally adopt | **ALREADY SIGNED OFF 2026-06-02.** No action. |
| §3.2 DOCUMENTS notice-response script | Fresh attorney pass; revert | **ALREADY SIGNED OFF 2026-06-02 as interim language.** No revert. Sunset gate has one open condition (broker-supervised workflow production-clearance status); pending Jack/build-side confirmation. |
| §3.3 SELF-HELP section | Conditionally adopt; refine §§ 1980–1991 scope | **ALREADY SIGNED OFF 2026-06-02.** §§ 1980–1991 refinement moved to [CONSIDER]-tier for next planned revision. |
| Canonical source-of-record | Run drift against v4-final | **Run drift against v4.1 sign-off file** (to be delivered today). |
| Git-history check | Recommended | Done; resolved. |
| CI guard on SYSTEM_PROMPT | Recommended | Still recommended; specifications above. |
| Route comment | Add revision pointer | Updated to v4.1 file; specifications above. |

---

## 8. Cutover gate status — updated

Help-chatbox cutover gate item #1:

| Item | Status |
|---|---|
| #1 §2 PROMPT-DRIFT | **CLOSED on substantive content** — no actual drift; deployed prompt is byte-identical to 2026-06-02 sign-off chain. **Still open on workflow tasks:** (a) deliver v4.1 canonical source file (Janna, today), (b) update route comment to v4.1 file (build side, when file lands), (c) confirm broker-supervised workflow production-clearance to resolve DOCUMENTS interim sunset gate (Jack/build side), (d) CI guard plumbing (build side, plumbing). None of these block non-dev deploy; they are file-and-comment hygiene plus the broker-workflow status question. |
| #2 §3 H1 output guard + input pre-check scaffold | OPEN — build side can start in parallel |
| #3 §3 H1 legal-adjacent strings | OPEN — pending #1 canonical source delivery; now unblocked once v4.1 file lands |
| #4 §4 H2 (auth + rate limit + persistence) | PARTIALLY CLOSED — persistence done; auth + rate limit need Jack |
| #5 §5 H3 message-history caps | OPEN — build side can start in parallel |
| #6 §6 M2 strip err.message | OPEN — build side can start in parallel |

**The non-dev deploy block from yesterday's ruling is lifted on the §3.2 revert demand specifically.** Non-dev deploy is no longer gated by "fresh attorney pass on DOCUMENTS" because there is no fresh pass owed. Non-dev deploy remains gated by items #2–#6 as previously described.

---

## 9. Final sign-off

✅ **§3.1 — Already signed off 2026-06-02. No action.**
✅ **§3.2 — Already signed off 2026-06-02 as interim language. Revert order RETRACTED. Sunset gate pending broker-workflow production-clearance confirmation.**
✅ **§3.3 — Already signed off 2026-06-02. §§ 1980–1991 refinement moved to [CONSIDER] for next planned revision.**
🟡 **v4.1 canonical source file owed today** — `ownerpilot_system_prompt_v4_1_attorney_signoff_2026-06-07.md`.
✅ **Commit d20ccc7 attribution is accurate.** Build side correctly relied on it.
✅ **The build-side question that surfaced this is on the engagement record as the right way to handle a suspect ruling.**

Reviewer: Janna Taglyan, JD, SBN 269639
Date: 2026-06-07
Scope: Correction to yesterday's drift-diff ruling §3.1, §3.2, §3.3 dispositions; reconciliation of commit d20ccc7 against the 2026-06-02 sign-off chain; retraction of the §3.2 revert order; identification of the canonical source-of-record gap and commitment to deliver v4.1 sign-off file today.

---

— Reviewing Attorney · Janna Taglyan, JD, SBN 269639 · 2026-06-07
