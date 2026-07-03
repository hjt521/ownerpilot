# FF-3 capture questions — locked prose broker ratification

**Date:** 2026-07-03
**Trigger:** Engineer authored drafts for FF-3 scripted-capture category questions + re-asks; broker must ratify (or author) before they can enter `persona.ts` and be hashed into the locked-prose manifest.
**Referenced authority:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` §1 (FF-3 authorization + enums + Amendment C chat-capture UX); `ff4_fmr_gate_quantity_reconciliation_broker_ruling_2026-07-03.md` (FMR gate quantity discipline).

---

## §0 — Ratification posture

Engineer's drafts are 80% right. Three of the five field questions are ratified verbatim. Two (`just_cause`, `notice_type`) need tightening to survive the locked-prose discipline because they're the ones that feed enum fields — the question copy has to expose the enum options non-exhaustively-but-anchored so the LLM extractor doesn't hallucinate a value that isn't in the enum set. One (`amount_of_rent_owed`) needs a conditional-branch clarification. All five re-asks need one shared amendment about escalation posture.

Below: each of the five capture pairs, ratified with `[APPROVED VERBATIM]` or `[AMENDED — new copy below]`, and one shared amendment (§6) that applies to all re-asks.

---

## §1 — `notice_type`

**Engineer draft:**
> "What kind of notice are you serving? For example: a 3-day notice to pay rent or quit, a 3-day notice to cure or quit, or a 30-, 60-, or 90-day termination."
> re-ask: "I want to record the notice type correctly. Is it a 3-day pay-or-quit, a 3-day cure-or-quit, or a 30/60/90-day termination?"

**Ruling: [AMENDED — new copy below]**

The enum has **six** admissible values (per omnibus ruling §1.2 Amendment B): `three_day_pay_or_quit`, `three_day_cure_or_quit`, `three_day_unconditional_quit`, `thirty_day_termination`, `sixty_day_termination`, `ninety_day_termination_section8`. The engineer's draft drops `three_day_unconditional_quit` (nuisance/illegal-use cases), which is a genuine notice type and its omission would make the question misrepresent the option set.

Also: `ninety_day_termination_section8` is Section 8-specific and its inclusion in the primary question would confuse most owners. Handle it as a targeted follow-up in the re-ask branch.

**Ratified question (primary):**
> "What kind of notice are you serving on the tenant? The common ones are: a **3-day notice to pay rent or quit** (for non-payment), a **3-day notice to cure or quit** (for a lease violation the tenant can fix), a **3-day notice to quit** without a cure period (for nuisance, illegal use, or an unauthorized subtenant), or a **30-, 60-, or 90-day termination notice** (for ending a tenancy where no fault is alleged). Which one applies to your case?"

**Ratified re-ask:**
> "I want to record the notice type correctly, because the compliance rules that apply next depend on it. Is it a **3-day pay-or-quit**, a **3-day cure-or-quit**, a **3-day quit (no cure)**, a **30-day termination**, a **60-day termination**, or a **90-day termination** (which usually applies only to Section 8 tenancies)? If none of these match what you're serving, tell me the exact title of the notice and I'll record it as an escalation for broker review."

Rationale: (1) all six enum values are exposed with plain-English labels; (2) `three_day_unconditional_quit` gets its own line so nuisance/illegal-use cases don't get miscoded as cure-or-quit; (3) the "escalation for broker review" tail is the LLM's off-ramp — if the owner describes something that doesn't map to any enum, the scripted capture must not force a value; it must surface for review. This tail is used in every re-ask below (see §6).

---

## §2 — `just_cause`

**Engineer draft:**
> "What is the reason for ending the tenancy?"
> re-ask: "I want to record the reason correctly — for example: non-payment of rent, a lease violation, or an owner move-in."

**Ruling: [AMENDED — new copy below]**

Same issue as §1 — the enum has 13 admissible values (per omnibus ruling §1.2 Amendment B) and the primary question is far too open. LAHD's Section E dropdown at time of Clifton filing had all 13. If the primary question doesn't anchor the LLM extractor to that set, extraction will produce free-text nouns the enum doesn't accept and the type-column persistence will fail (or worse, silently coerce).

But 13 options in a single spoken-language sentence is unreadable. Solution: split by category ("at-fault" vs "no-fault") and use LAHD's own grouping — the same grouping the portal Section E dropdown uses.

**Ratified question (primary):**
> "What is the reason you are ending the tenancy? California and LA City law group these into two categories.
>
> **At-fault reasons** (the tenant did something):
> - Non-payment of rent
> - Breach of a material lease term
> - Nuisance or damage to the property
> - Using the unit for an illegal purpose
> - Refusing to allow lawful entry
> - Having an unapproved subtenant, pet, or occupant
> - End of a fixed lease term (for SRO or covered no-fault-eligible units only)
>
> **No-fault reasons** (owner or government action, tenant did nothing wrong):
> - Owner or eligible family member moving in
> - Withdrawal of the unit from the rental market (Ellis Act)
> - Demolition of the property
> - Substantial capital improvements requiring the unit to be vacant
> - Government order requiring the unit to be vacated
>
> Which reason applies? If you have a reason that doesn't fit any of the above, tell me and I'll record it for broker review."

**Ratified re-ask:**
> "I want to make sure I record the reason correctly, because the compliance requirements are very different for at-fault vs no-fault, and different again inside each group. From what you told me, I'm not sure which of the 12 recognized reasons applies. Can you tell me in one short phrase — for example, **'non-payment of rent'**, **'lease violation for unauthorized pet'**, **'owner moving in'**, or **'Ellis Act withdrawal'**? If your situation doesn't match any of these, tell me and I'll surface it as an escalation for broker review — we do not proceed with an unrecognized reason."

Rationale: (1) all 13 enum values are exposed under their LAHD-portal grouping; (2) `other` remains available as a compliance escalation (the LLM extractor writes `null` + surfaces as escalation, NOT `other`, which would silently swallow the case); (3) the enumerated groups match how LAHD's own portal presents the dropdown, so an owner who has already read LAHD materials sees familiar language.

---

## §3 — `bedrooms`

**Engineer draft:**
> "How many bedrooms does the rental unit have? (A studio counts as 0.)"
> re-ask: "Please give me the bedroom count as a number from 0 to 6 — a studio is 0."

**Ruling: [APPROVED VERBATIM]**

Copy is correct. Enum is small-int, the studio-as-zero clarification is the exact right disambiguation, and the re-ask's explicit 0-6 range matches the enum spec (per omnibus ruling §1.2 Amendment B: "if a case genuinely has more than 6 bedrooms, that's an escalation, not a schema problem"). Zero amendment needed.

---

## §4 — `contract_monthly_rent`

**Engineer draft:**
> "What is the tenant's current monthly rent, in dollars?"
> re-ask: "Please give me the monthly rent as a dollar amount — for example, $2,400."

**Ruling: [APPROVED VERBATIM] with one framing note (not a copy change).**

Copy is fine. Framing note for engineer implementation: the LAHD portal label for this field is verbatim *"What is the Tenant's Current Monthly Rent (do not include surcharges or other fees)?"* (per Clifton page-3 screenshot). Our question drops the parenthetical, which is fine because owners rarely include surcharges in casual answers — but the extractor / typed-column persistence must be robust to owners who volunteer surcharge language ("$3,000 base plus $50 pet fee"). If that happens, extractor stores `3000` and appends the surcharge mention to the case notes as an escalation for broker review. Do not attempt to reconcile arithmetic.

No copy change to the question or re-ask.

---

## §5 — `amount_of_rent_owed`

**Engineer draft:**
> "What is the total amount of rent the tenant currently owes, in dollars?"
> re-ask: "Please give me the total amount owed as a dollar amount — for example, $6,000."
> **[only asked when notice_type == three_day_pay_or_quit]**

**Ruling: [AMENDED — new copy below] + conditional-branch clarification.**

Two problems with the engineer's version:

**Problem A — conditional-branch semantics.** The engineer's "only asked when `notice_type == three_day_pay_or_quit`" is correct as a first pass, but the omnibus ruling §1.2 Amendment B's check constraint is: `notice_type = 'three_day_pay_or_quit' IMPLIES amount_of_rent_owed IS NOT NULL AND amount_of_rent_owed > 0`. That's an implication, not an equivalence. Meaning: a `three_day_cure_or_quit` case that involves non-payment (e.g., non-payment + a lease violation combined into a cure notice) may ALSO have an amount owed. The scripted capture MUST NOT hard-gate this question on `notice_type == three_day_pay_or_quit`. It must ask the question when:

- `notice_type == three_day_pay_or_quit` (mandatory — check constraint enforces `NOT NULL`), OR
- `just_cause == nonpayment` regardless of notice type (mandatory in practice — a non-payment case needs the amount even if styled as cure-or-quit), OR
- (soft) the owner has voluntarily mentioned an amount in prior chat turns and the extractor has a candidate value.

Otherwise skip. That means the branching lives on `notice_type OR just_cause`, not just `notice_type`.

**Problem B — the framing needs to align with the FMR gate.** This morning's FF-4 ruling made `amount_of_rent_owed` the FMR gate quantity. The question copy needs to be precise about *what* amount — specifically, the total demanded on the notice, not "how much back rent do you feel is owed conceptually." The Clifton case is the clarifier: monthly rent $3,000, amount demanded on the notice was $6,000 (May+June). If we ask "what does the tenant owe" the owner might say $6,000 (correct) or $6,300 (adding late fees, which the notice can't demand per CCP § 1161(2)) or $9,000 (adding July when July wasn't yet on the notice). We want the amount **stated on the served notice**, not the owner's arithmetic-of-the-moment.

**Ratified question (primary):**
> "What is the total dollar amount stated on the notice you're serving? This should be the exact amount you wrote on the notice as the rent owed — not late fees, not interest, not future rent that hasn't come due yet. For example, if the tenant missed May and June rent of $3,000 each, and your notice demands both months, the amount is $6,000."

**Ratified re-ask:**
> "I want to record the amount from the notice exactly as written. Please give me the total dollar amount that appears on the served notice as the rent owed — for example, **$6,000**. If you haven't written the notice yet or you're not sure of the exact figure, tell me and I'll surface this as an escalation for broker review before we proceed to compliance checks."

**Conditional-branch clarification for engineer:**
The capture question fires when ANY of:
- `notice_type == 'three_day_pay_or_quit'` (mandatory, check constraint enforces)
- `just_cause == 'nonpayment'` (mandatory in practice)
- Extractor has a candidate value from prior chat turns (soft — always confirm)

Skip only when all three are false. This should be a small `shouldCaptureAmountOwed(state): boolean` helper co-located with the category definition; write it once and unit-test it against the omnibus ruling's check constraint semantics.

---

## §6 — Shared amendment: re-ask escalation posture

**Applies to all five re-asks above.**

Every re-ask must include, verbatim or paraphrased in the field-appropriate way, the same escalation off-ramp: **if the owner cannot answer the question in a form that maps to the enum / type / expected shape, the extractor MUST NOT force a value. It surfaces as an escalation.**

The engineer's original drafts implied re-asks would loop indefinitely until the owner produced a valid answer. That is not the discipline. Locked prose has escalation off-ramps for a reason — some cases genuinely don't fit the enum (a novel just-cause fact pattern, a foreign notice type, an unusual bedroom configuration) and forcing a value corrupts the audit trail and can produce a non-compliant filing.

**Rule of three:** if the owner has been re-asked the same question and still hasn't produced a value that maps to the enum, the scripted category exits, marks the field as `awaiting_broker_review` (a new admissible state on the field's capture record — engineer: add this to the FF-3 migration), and the case is queued for broker review. The chat does not continue to downstream compliance checks until broker review clears the field.

Copy for the "we're escalating" state (add as new locked-prose entry `chatFf3EscalationCard`):

> "I've asked a few times and I want to make sure I get this right rather than record a value I'm not confident in. I'm going to hold this case for broker review before we go any further. Your case is not lost — a broker will look at what you've told me so far and either clarify what I should ask next, or make the determination directly. You'll get an update within one business day. In the meantime, please continue to keep records of anything relevant to the case."

Add `chatFf3EscalationCard` to the manifest in the FF-3 PR. This entry is required by every re-ask flow; if any of the five capture categories can loop past three re-asks without hitting this card, that's a compliance defect and the Wave-3 attestation must not sign off.

---

## §7 — Summary table

| Field | Question | Re-ask | Ratification |
|---|---|---|---|
| `notice_type` | §1 primary | §1 re-ask | AMENDED |
| `just_cause` | §2 primary | §2 re-ask | AMENDED |
| `bedrooms` | §3 (engineer draft) | §3 (engineer draft) | APPROVED VERBATIM |
| `contract_monthly_rent` | §4 (engineer draft) | §4 (engineer draft) | APPROVED VERBATIM (framing note only) |
| `amount_of_rent_owed` | §5 primary | §5 re-ask | AMENDED + branch clarification |
| escalation card | §6 (new) | — | NEW LOCKED-PROSE ENTRY |

Total new locked-prose entries added to manifest in the FF-3 PR:

1. `chatFf3IntakeConfirmationCard` (from omnibus ruling §1.3, already ratified)
2. `chatFf3CaptureNoticeType` (§1 primary)
3. `chatFf3CaptureNoticeTypeReask` (§1 re-ask)
4. `chatFf3CaptureJustCause` (§2 primary)
5. `chatFf3CaptureJustCauseReask` (§2 re-ask)
6. `chatFf3CaptureBedrooms` (§3 primary)
7. `chatFf3CaptureBedroomsReask` (§3 re-ask)
8. `chatFf3CaptureContractRent` (§4 primary)
9. `chatFf3CaptureContractRentReask` (§4 re-ask)
10. `chatFf3CaptureAmountOwed` (§5 primary)
11. `chatFf3CaptureAmountOwedReask` (§5 re-ask)
12. `chatFf3EscalationCard` (§6)

Twelve entries total. Manifest regenerates in the FF-3 PR.

---

## §8 — Sequencing note

Engineer's plan to build FF-3 as a self-contained module (capture category + locked prompts + typed-column persistence + unit tests) NOT yet wired into `SCRIPTED_CATEGORIES`, then gate the activation on Playwright + Preview E2E verification, is the correct posture per the omnibus ruling §7 sequencing discipline. This ratification unblocks the module build.

**Activation wiring is separately gated** on:
1. All 12 locked-prose entries above in the manifest with hashes matching the copy in this document.
2. Migration 037 (additive) landed and validated.
3. Playwright spec that exercises all five capture categories AND the escalation off-ramp for each of them.
4. Preview E2E run showing a full FF-3 → FF-4 → W6 → W2 → packet-manifest happy-path plus at least one escalation-off-ramp path.

Do not wire into `SCRIPTED_CATEGORIES` on main until all four are green. Preview-only for the wiring PR until countersign.

---

**Signed:**
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-03
