# C7a Multi-Select Payment Face Text — Broker Composition Determination

**File:** `c7a_multiselect_face_review_broker_determination_2026-06-15.md`
**Date:** Monday, June 15, 2026
**Reviewer:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Role:** Broker Compliance Review — face-text composition determination
**Posture:** Broker-side compliance review under Bus. & Prof. Code § 10131(b). Not attorney sign-off. Not legal advice. Statute references verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/). All new face sentences in this determination are compositions of statutorily required elements grounded in primary-source language, not novel legal advice.

**Subject:** Face-text composition determination on the C7a multi-select payment combinations engineering packet (`c7a_multiselect_face_review_packet_2026-06-15.md`), authoring the locked face sentences and combination rules needed before the multi-select can expose all four payment kinds as independent atoms.

**Lineage:** Successor to `v4_payment_fields_attorney_ruling.md` (2026-06-01) and the A1 Part D sign-off chain (`A1_part_d_attorney_signoff_2026-06-03.md` / `A1_part_d_attorney_countersign_2026-06-04.md`). Adopts the four existing locked sentences from those rulings (`mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`) as building blocks for multi-method compositions. Adds two new locked sentences under broker-side composition rules.

---

## 0. Top-line ruling

**The multi-select rebuild is APPROVED to ship with the face compositions and combination rules locked in this determination.** The build side may expose all four payment kinds (In Person, By Mail, Bank Deposit, EFT) as independent atoms in the multi-select UI, subject to:

- The combination matrix in Section 4 below (which combinations render which face elements).
- The two new locked sentences authored in Sections 3.1 and 5 below.
- The ordering rule in Section 3.5 below.
- The four already-signed-off locked sentences continuing to render unchanged.
- The validator changes in Section 7 below.

The packet itself has a **posture defect that must be fixed before it is checked in or used as the review-of-record:** it is addressed to a reviewing attorney by name and SBN, in contradiction of the broker-scope posture locked on 2026-06-09. See Section 1 below. This is the second packet in two days with the same attribution drift; recommend Claude's standing packet template be updated.

---

## 1. [MUST FIX] Packet attribution defect — recurring issue

The engineering packet at line 3 reads: "Prepared for: Reviewing attorney (Janna Taglyan, JD, SBN 269639) — fresh §1161(2) face-text review."

This is the same defect flagged on the C5 safety-check packet earlier today (2026-06-15) and the broader 2026-06-09 attribution drift documented in `workspace_attribution_inventory_2026-06-09.md`.

**Required fix before this packet is checked in or used as the review-of-record:**

- Line 3 rewrite (locked): "Prepared for: Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457) — broker compliance review on §1161(2) face composition for multi-select payment methods."
- Line 16 rewrite: "This packet states the engineering facts only. It proposes no face wording. Every face-text decision below is left blank for the broker compliance reviewer to author."
- All "attorney" / "Reviewing attorney" / "reviewing attorney determinations" references → "broker compliance review" / "broker compliance determinations."
- Section 6 final line: "Broker compliance review determinations and sign-off below."

**Process recommendation to Claude (build side):** the engineering-packet template appears to be auto-generating the attorney-attribution framing. Two packets in two days have the same defect. The packet template needs to be updated to the broker-scope posture from `broker_scope_internal_note_2026-06-09.md` as a one-time fix, not corrected packet-by-packet. Suggest this as a build-side housekeeping ticket: locate the packet template (likely in `/docs/engineering-packet-template.md` or wherever build-side scaffolding lives) and replace all "Reviewing attorney" / "Janna Taglyan" / "SBN 269639" references with the broker-scope equivalents.

The substantive content of this packet is well-structured and the engineering facts are correct. The attribution is wrong and is the same drift caught two days in a row.

---

## 2. Adopted building blocks (already-signed-off locked sentences)

The following four sentences are adopted as building blocks for all multi-method face compositions in this determination. They are reproduced here for reference only — they are not under review and are not modified by this determination.

| Constant | Verbatim string | Source ruling |
|----------|-----------------|---------------|
| `mailboxRuleSentence` | "If you mail your payment to the name and address above, it is conclusively presumed received on the date posted, provided you can show proof of mailing. (Cal. Code Civ. Proc. § 1161(2).)" | A1 Part D 2026-06-03 / countersign 2026-06-04 |
| `fiveMileSentence` | "The branch identified above is within five miles of the rental property, as required by Cal. Code Civ. Proc. § 1161(2)." | A1 Part D 2026-06-03 / countersign 2026-06-04 |
| `bankPaperInstrumentSentence` | "Payment to the account above may be made by check, money order, or cashier's check." | A1 Part D 2026-06-03 / countersign 2026-06-04 |
| `eftElectionSentence` | "If you have previously established an electronic funds transfer procedure with the landlord, payment may also be made pursuant to that previously established procedure. (Cal. Code Civ. Proc. § 1161(2).)" | A1 Part D 2026-06-03 / countersign 2026-06-04 |

**[MUST PRESERVE]** No byte-level change to any of the four above. The composition rules in this determination reuse them by reference only.

---

## 3. Face-text rulings on the five §3 questions

### 3.1 In Person — only (no mail) — APPROVED with new locked sentence

**Determination:** "In Person Only" is a permitted offered configuration under [CCP § 1161(2)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.). The statute requires the notice to name "a person to whom the rent payment shall be made" and either "the usual days and hours" for personal delivery at that address, or an option to mail. The statute does not require both. Where the landlord designates a payee who can accept personal delivery at stated days and hours, personal delivery alone is statutorily sufficient.

**Composition for In Person Only (no mail):**

- Payee name + telephone + street address
- Personal-delivery **days/hours** (the days-and-hours block, verbatim as today)
- New locked sentence below (replaces the mailbox-rule sentence, which does not render in this combination)
- **No** mailbox-rule sentence
- **No** five-mile sentence
- **No** bank paper-instrument sentence

**New locked sentence (added to the locked-prose set as `inPersonOnlySentence`):**

> "Payment must be delivered in person at the address above, on the days and during the hours stated. Mail and bank-deposit payment are not offered for this notice."

The reason this sentence is necessary: the tenant reading the face must understand affirmatively that mail is **not** an available channel for this notice, because the absence of a mailbox-rule sentence might otherwise be read as silence rather than as an affirmative exclusion. The second sentence ("Mail and bank-deposit payment are not offered for this notice.") is the closure that makes the in-person-only face complete under *Eshagian v. Cepeda* (2025), which requires the face to be independently legible without reference to other documents.

**Broker-scope composition basis for the new sentence:** the sentence states two facts grounded in the face data itself — (a) the method of delivery (already required by the days-and-hours block) and (b) the unavailability of mail/bank-deposit (a fact about which checkboxes the landlord selected, not a legal conclusion). It contains no statutory interpretation and no representation about tenant rights. It is a composition of facts the user has selected, not new legal language. Within broker scope.

**Within-scope caveat:** if and when the platform engages an outside CA landlord-tenant attorney for a fuller pass, this new sentence is one of the items they should review specifically. The 2026-06-14 determination §11 explicitly flagged that broker-side composition is the floor and an attorney pass would be the ceiling. This sentence is the floor.

**Audit field on produce:** `inPersonOnlyFaceVersion: "v1"` written to the produce audit record when this face renders. Versioning the sentence allows future revision without ambiguity about which version a given notice was produced under.

### 3.2 In Person + Bank Deposit (no mail) — APPROVED

**Determination:** This combination is permitted. The composition is mechanical from the existing building blocks.

**Composition:**

- Payee name + telephone + street address
- Personal-delivery days/hours
- Bank name + branch address + account number
- `bankPaperInstrumentSentence`
- `fiveMileSentence`
- New `inPersonOnlySentence` from 3.1 above, **modified** to drop the bank-deposit exclusion clause

**Variant of the new sentence required:** when bank deposit is also offered, the second clause of the `inPersonOnlySentence` ("Mail and bank-deposit payment are not offered for this notice") becomes inaccurate. The composition needs a variant.

**New locked variant (added as `inPersonNoMailSentence`):**

> "Payment must be delivered in person at the address above, on the days and during the hours stated. Mail payment is not offered for this notice."

This variant drops the bank-deposit exclusion because bank deposit is offered in this combination. Mail remains excluded.

The renderer logic for the in-person-related closure sentence is:

- In Person only (no mail, no bank deposit) → `inPersonOnlySentence`
- In Person + Bank Deposit (no mail) → `inPersonNoMailSentence`
- In Person + Mail (with or without bank deposit) → **no in-person closure sentence renders** (the mailbox-rule sentence covers the mail channel, and the in-person days/hours block plus mailbox sentence together make the face independently legible)

### 3.3 Mail + Bank Deposit — APPROVED

**Determination:** Confirmed — the A1 Part D redline composition is correct when both are offered. The mailbox-rule sentence belongs to the mail block; the five-mile and paper-instrument sentences belong to the bank block; they do not overlap or conflict.

**Composition:**

- Payee name + telephone + mail-to address
- `mailboxRuleSentence`
- Bank name + branch address + account number
- `bankPaperInstrumentSentence`
- `fiveMileSentence`

No new sentence required. No in-person closure sentence (in-person is not offered, and the absence of personal-delivery days/hours makes that clear on the face without an additional sentence).

### 3.4 In Person + Mail + Bank Deposit (all three) — APPROVED

**Determination:** Permitted. The composition is mechanical from existing building blocks.

**Composition:**

- Payee name + telephone + address (single address; see ordering rule in 3.5)
- Personal-delivery days/hours
- `mailboxRuleSentence`
- Bank name + branch address + account number
- `bankPaperInstrumentSentence`
- `fiveMileSentence`

No new sentence required. No in-person closure sentence (mail is offered, so the in-person channel is not the exclusive method, and the mailbox sentence carries the affirmative statement about mail availability).

### 3.5 Ordering / assembly rule for multiple methods — APPROVED with locked order

**Determination:** The locked rendering order for any multi-method face is:

1. **Payee identification block** — name, telephone, street address. Renders once even when both in-person delivery and mail use the same address. (If a future product change supports separate in-person and mail addresses, this section is revisited.)
2. **In Person block** — personal-delivery days/hours. Renders only when In Person is selected.
3. **Mail block** — `mailboxRuleSentence`. Renders only when By Mail is selected.
4. **Bank Deposit block** — bank name, branch address, account number, `bankPaperInstrumentSentence`, `fiveMileSentence`. Renders only when Bank Deposit is selected.
5. **EFT block** — `eftElectionSentence`. Renders only when EFT is selected (and per Decision 1, only when at least one non-EFT method is also selected).
6. **In-person closure sentence** (when required by 3.1 or 3.2 above) — `inPersonOnlySentence` or `inPersonNoMailSentence`. Renders only when In Person is selected and Mail is not.

The order is from "most direct" (personal delivery) to "most attenuated" (electronic transfer), which is how a tenant reading the face would naturally process the options. The closure sentence comes last as a clarifying statement after the methods have been enumerated.

**Sectional separation:** each block is rendered as its own short paragraph (or labeled row, per existing render shape) with a blank line between blocks. Headings within each block (e.g., "By mail:" / "Bank deposit:") follow the existing A1 Part D label conventions — no new label strings authored here.

---

## 4. Combination matrix — what renders for each multi-select state

The following matrix is the locked authoritative reference for the renderer. The build side wires `composeFaceText(selectedMethods)` to produce these compositions exactly.

| In Person | By Mail | Bank Deposit | EFT | Composition |
|:---:|:---:|:---:|:---:|---|
| ✓ | | | | Payee + days/hours + `inPersonOnlySentence` |
| | ✓ | | | Payee + `mailboxRuleSentence` (existing `mail_only` branch) |
| | | ✓ | | **DISALLOWED** — bank-deposit-alone violates §1947.3 floor (Decision 1) |
| | | | ✓ | **DISALLOWED** — EFT-alone violates Decision 1 |
| ✓ | ✓ | | | Payee + days/hours + `mailboxRuleSentence` (existing `in_person_and_mail` branch) |
| ✓ | | ✓ | | Payee + days/hours + bank block + `inPersonNoMailSentence` (new — §3.2) |
| ✓ | | | ✓ | **DISALLOWED** — see Section 7 below |
| | ✓ | ✓ | | Payee + `mailboxRuleSentence` + bank block (§3.3) |
| | ✓ | | ✓ | Payee + `mailboxRuleSentence` + `eftElectionSentence` |
| | | ✓ | ✓ | **DISALLOWED** — bank-deposit + EFT alone violates the §1947.3 floor (no in-person or mail option, both of which are required floor satisfaction under Decision 1) |
| ✓ | ✓ | ✓ | | Payee + days/hours + `mailboxRuleSentence` + bank block (§3.4) |
| ✓ | ✓ | | ✓ | Payee + days/hours + `mailboxRuleSentence` + `eftElectionSentence` |
| ✓ | | ✓ | ✓ | **DISALLOWED** — see Section 7 below (in-person + EFT pairing question) |
| | ✓ | ✓ | ✓ | Payee + `mailboxRuleSentence` + bank block + `eftElectionSentence` |
| ✓ | ✓ | ✓ | ✓ | Payee + days/hours + `mailboxRuleSentence` + bank block + `eftElectionSentence` |

Eleven combinations are valid. Five are disallowed (the four involving EFT-with-only-bank or EFT-with-only-in-person, and the two single-method-non-floor cases). See Section 7 for the EFT pairing rule.

---

## 5. Section 4 of the packet — distinct paper-instrument kinds (cashier's check, money order, by mail or in person)

**Determination:** Cashier's check and money order are **not** independently selectable payment kinds in the multi-select. They are forms of payment the tenant may use within the existing channels (in person, by mail), not separate channels themselves.

**Reasoning:** § 1161(2) governs the **method** of payment delivery (in person, by mail, bank deposit, EFT) — not the **instrument** the tenant uses to pay. The statute requires the face to name how the tenant may deliver payment, not what kind of instrument the tenant must use. Cashier's check and money order are types of payment instrument; check, cash, and electronic transfer are also types. The face does not need to enumerate which instruments are acceptable for in-person or mail delivery — that is between the landlord and the tenant, governed by the lease and by general contract principles.

**Why bank-deposit is the exception:** `bankPaperInstrumentSentence` exists because banks impose their own restrictions on what they accept for deposit to a third party's account (typically check, money order, or cashier's check — not cash, and not electronic transfer initiated by a non-account-holder). The sentence informs the tenant of this constraint **of the financial institution**, not of the landlord. That's why it lives in the bank-deposit block and not as a general payment-instrument disclosure.

**Build-side implementation:** the multi-select UI does **not** expose cashier's check or money order as independent checkboxes. The four payment kinds remain In Person, By Mail, Bank Deposit, EFT. If a landlord wishes to limit accepted payment instruments for in-person or mail delivery (e.g., "no personal checks"), that is a private landlord-tenant arrangement outside the scope of the § 1161(2) face. No new locked sentence is required for this packet.

**[CONSIDER]** A future Phase 2 feature could add an optional landlord-side note ("Payments by cash will not be accepted at the address above") as a non-statutory addition to the face. That is not part of this determination and would require its own composition review.

---

## 6. EFT pairing rule — clarification

The packet doesn't ask this directly, but the combination matrix in Section 4 made me confront it: **what is EFT permitted to pair with?**

**Determination — EFT must be paired with at least one non-EFT, non-bank-deposit method** (i.e., In Person or By Mail).

**Reasoning:** Decision 1 of `v4_payment_fields_attorney_ruling.md` (2026-06-01) established the §1947.3 floor — at least one of {in person, by mail} must be offered. Bank deposit does not satisfy the floor because not all tenants have access to the financial institution branch within the five-mile rule, and the floor exists to ensure every tenant has a usable payment channel. EFT does not satisfy the floor because it requires a "previously established" procedure, which not all tenants have.

The valid floor-satisfying methods are **In Person and By Mail only.** Therefore EFT must be paired with at least one of those two.

**Disallowed combinations (added to validator):**

- In Person + EFT (no mail) — **DISALLOWED** because while In Person alone satisfies the floor, the addition of EFT without mail creates a face that says "pay in person or pay electronically." That is a face that excludes mail entirely. While In Person Only is permitted (§3.1), pairing In Person Only with EFT is the equivalent of saying "you can pay in person, or if you have an EFT relationship with the landlord, electronically." The reason this is disallowed where In-Person-Only-without-EFT is allowed is the §1161(2) proviso: the EFT election sentence implicitly references the landlord's right to receive electronic payment, and combining that with the absence of mail creates ambiguity about whether a tenant without EFT capability has a non-in-person fallback. The clean rule: **EFT requires Mail to also be offered.**

Updated rule (locked): **When EFT is selected, By Mail must also be selected.** In Person + EFT (no mail) and Bank Deposit + EFT (no mail) are both disallowed by this rule. The combination matrix in Section 4 reflects this.

**Validator error message (locked, non-face):**

> "Electronic funds transfer requires that mail payment also be offered as a method. Add 'By mail' to the selected payment methods, or remove EFT."

---

## 7. Updated validator rules

The `validatePaymentMethods` rule set after this determination:

1. At least one method must be selected. (Existing.)
2. At least one of {In Person, By Mail} must be selected — the §1947.3 floor. (Existing — Decision 1.)
3. When EFT is selected, By Mail must also be selected. (New — Section 6.)
4. When Bank Deposit is selected, the within-five-miles attestation must be accepted. (Existing — Decision 2.)
5. When EFT is selected, the previously-established attestation must be accepted. (Existing — Decision 3.)
6. When In Person is selected and By Mail is not selected, the renderer must include the appropriate in-person closure sentence (`inPersonOnlySentence` or `inPersonNoMailSentence`). (New — Section 3.)

Validator error messages for the new rule (Rule 3) are locked in Section 6 above.

---

## 8. Locked sentence inventory after this determination

Six locked sentences total. Four pre-existing, two new.

| Constant | Status | Source |
|----------|--------|--------|
| `mailboxRuleSentence` | Unchanged | A1 Part D 2026-06-03/04 |
| `fiveMileSentence` | Unchanged | A1 Part D 2026-06-03/04 |
| `bankPaperInstrumentSentence` | Unchanged | A1 Part D 2026-06-03/04 |
| `eftElectionSentence` | Unchanged | A1 Part D 2026-06-03/04 |
| `inPersonOnlySentence` | **New** | This determination (2026-06-15) |
| `inPersonNoMailSentence` | **New** | This determination (2026-06-15) |

The two new sentences are wired as build-locked constants in `lib/produce/renderNotice.ts` with the same lock semantics as the four existing constants (byte-level change requires a fresh broker compliance review packet).

**Verbatim strings of the two new sentences (locked):**

- `inPersonOnlySentence`: "Payment must be delivered in person at the address above, on the days and during the hours stated. Mail and bank-deposit payment are not offered for this notice."
- `inPersonNoMailSentence`: "Payment must be delivered in person at the address above, on the days and during the hours stated. Mail payment is not offered for this notice."

---

## 9. Audit-record additions

The produce audit record gains:

- `offeredMethods`: array of selected method atoms (`['in_person', 'by_mail', 'bank_deposit', 'eft']` subset).
- `renderedFaceComposition`: the actual rendered face text, frozen at produce time.
- `inPersonClosureSentenceVersion`: `"v1"` when `inPersonOnlySentence` or `inPersonNoMailSentence` is rendered; `null` otherwise.
- `compositionDeterminationDate`: `"2026-06-15"` (this file).

Versioning the closure sentence allows future revision under a new determination without ambiguity about which version a given notice was produced under.

---

## 10. What ships, what's gated

**Ships now (multi-select v1):**

- All four payment kinds (In Person, By Mail, Bank Deposit, EFT) as independent atoms in the multi-select UI.
- Eleven permitted combinations per the matrix in Section 4.
- Five disallowed combinations blocked by the validator with the error messages in Sections 6 and 7.
- Two new locked sentences (`inPersonOnlySentence`, `inPersonNoMailSentence`) wired in the renderer.
- Combination matrix and ordering rule from Section 3.5 wired in `composeFaceText`.
- Audit-record additions per Section 9.

**Gated to future review (not in this determination):**

- Distinct payment-instrument kinds (cashier's check, money order) as independent atoms — declined per Section 5; revisit only if a specific landlord-tenant scenario surfaces a real need.
- Separate in-person and mail addresses (today the same address is used for both; if the platform ever supports distinct addresses, the ordering rule in Section 3.5 is revisited).
- Phase-2 optional landlord-side payment-instrument notes ("no personal checks," etc.) — out of scope for this determination.

---

## 11. What still needs separate attorney review (Section 11 of 2026-06-14 floor/ceiling)

Three items in this determination are tagged as broker-scope floor that an outside CA landlord-tenant attorney should review at the ceiling pass, when one is engaged:

1. **The two new locked sentences** (`inPersonOnlySentence`, `inPersonNoMailSentence`). These are compositions of facts within broker scope, but they are new face text on a statutorily prescribed document. An attorney should confirm the wording is correct under *Eshagian v. Cepeda* (2025) before they are treated as production-stable.
2. **The EFT-requires-Mail pairing rule (Section 6).** The reasoning is grounded in Decision 1 of `v4_payment_fields_attorney_ruling.md`, but extending the §1947.3 floor logic to disallow In-Person + EFT-without-Mail is a derivation an attorney should confirm. The conservative posture (require Mail when EFT is offered) is defensible at broker scope; an attorney might rule it stricter than necessary, in which case the rule can be loosened later.
3. **The In-Person-Only configuration itself** (Section 3.1). Broker-scope analysis supports it under § 1161(2). An attorney should confirm the configuration is producible in California courts without controversy.

This determination ships as the floor. An attorney pass remains advisable.

---

## 12. Posture note

This is broker-side compliance review under California Real Estate Broker scope (Bus. & Prof. Code § 10131(b)). OwnerPilot AI is not a law firm and does not provide legal advice. Statute references are verified against primary sources at [leginfo.legislature.ca.gov](https://leginfo.legislature.ca.gov/). For legal matters specific to a notice or case, consult a California licensed attorney of your choosing.

Primary sources cited:

- [Cal. Code Civ. Proc. § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.) — 3-day notice content, including § 1161(2) pay-or-quit.
- Cal. Civ. Code § 1947.3 — landlord may not require cash-only or EFT-only payment.
- *Eshagian v. Cepeda* (2025) — commencement and expiration dates and per-method facial content must be independently complete on the face.
- Cal. Bus. & Prof. Code § 10131(b) — California Real Estate Broker scope.

Related broker-side and prior determinations:

- `v4_payment_fields_attorney_ruling.md` (2026-06-01) — Decisions 1–3 establishing the §1947.3 floor, the five-mile attestation, and the EFT previously-established attestation.
- `A1_part_d_attorney_signoff_2026-06-03.md` and `A1_part_d_attorney_countersign_2026-06-04.md` — face wording lock-in for the four existing locked sentences and the three pre-existing branches.
- `v4_wording_signoff_ratification_and_closeouts_2026-06-05.md` — V4_WORDING_SIGNED_OFF = true.
- `broker_scope_internal_note_2026-06-09.md` — broker-scope posture.
- `workspace_attribution_inventory_2026-06-09.md` — attorney-attribution inventory (15 markdown files).
- `redesign_compliance_review_broker_determination_2026-06-14.md` — full redesign review including Step 3 multi-select direction.
- `c7a_multiselect_face_review_packet_2026-06-15.md` — engineering packet under review (must be reattributed per Section 1 above).

---

— Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
Broker Compliance Review · 2026-06-15
