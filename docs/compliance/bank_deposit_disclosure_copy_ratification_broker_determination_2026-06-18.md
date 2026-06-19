# Broker Determination — Bank-Deposit Method Privacy Disclosure Copy (Ratification)

**File:** `bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`
**Date:** 2026-06-18
**Reviewing broker:** Jack Taglyan — California Licensed Real Estate Broker, CalDRE **#B9445457**
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority under Bus. & Prof. Code § 10131(b).
**Scope:** The bank-deposit payment-method privacy disclosure copy and its in-wizard "Why is this required?" presentation.
**Related determinations:**
- [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) — multi-select payment-method face review.
- [`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) — packet pass compliance review (§3 bank-name normalization is the sibling determination to this one).
- [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md) — face-of-notice account-number ruling (broker-ratified).
- [`Part_E_closure_addendum_2026-06-04.md`](Part_E_closure_addendum_2026-06-04.md) — closure addendum on the account-number question.

**Production state:** Shipped on branch `packet-redesign`; promoted via `e886a9b`. Disclosure copy landed in `b13c2c7`; wizard wiring in `102a004`.

**Determination status:** **FINAL** (ratified verbatim and commit-ready as of 2026-06-18 sign-off below).

---

## §0. Top-line read

**The disclosure copy as shipped in `lib/flow/bankDepositDisclosureCopy.ts` (`bankDepositMethodCopyVersion = 'v1'`) is ratified verbatim and is the locked copy of record.** Both the always-visible helper (`bankDepositMethodHelper`) and the expandable disclosure body (`bankDepositMethodDisclosure`) — along with the expand-label (`bankDepositMethodDisclosureExpandLabel`) — are Tier-B locked-prose wizard UI artifacts. They do not modify, paraphrase, or interpret § 1161(2); they explain to the landlord, at the choice point, why the statute requires the account-number disclosure on the face of the notice and what the two compliant privacy alternatives are. The copy is approved, locked at v1, and must be wired byte-identically. Any future edit requires a new broker determination and a version bump.

---

## §1. What this covers (factual record)

When an owner selects Bank Deposit as an offered payment method, the wizard surfaces:

1. An always-visible helper line beneath the Bank Deposit option.
2. An expandable "Why is this required?" disclosure explaining why bank / branch / account details appear on the tenant-facing notice.

### Copy constants (pure module): `lib/flow/bankDepositDisclosureCopy.ts`

- `bankDepositMethodHelper` — always-visible helper line.
- `bankDepositMethodDisclosureExpandLabel` — the link/affordance label that toggles the expanded body.
- `bankDepositMethodDisclosure` — expandable "Why is this required?" body.
- `bankDepositMethodCopyVersion` — version tag, currently `'v1'`.

### Surfaced in

- `components/notice-flow.tsx`, **Step 4 (Payment)**, under the Bank Deposit option (bank-deposit block).

### Behavior

Display / UX copy only. It does not alter the § 1161(2) statutory notice-face text. The bank / branch / account values themselves render on the notice face per the existing locked payment-block design (`fiveMileSentence`, `bankPaperInstrumentSentence`, the bank/branch/account data rows, and the `mailboxRuleSentence` when mail is co-selected).

---

## §2. The approved disclosure copy (LOCKED — ratified verbatim)

The wording shipped in `lib/flow/bankDepositDisclosureCopy.ts` (version `bankDepositMethodCopyVersion = 'v1'`) is **ratified verbatim** as the locked copy of record (broker instruction, 2026-06-18). The constants below are the source of truth; the TS module is wired to render them as-is and **must not be edited at render time, templated, or run through any i18n mutation pipeline**.

### §2.1 `bankDepositMethodHelper` (always visible)

> Selecting bank deposit will print your bank's name, branch address, and full account number on the face of the notice. California Code of Civil Procedure § 1161(2) requires these details to appear on the notice for this payment option to be valid. If account-number visibility on a posted notice is a concern, consider opening a dedicated rent-collection account so your operating-account number is never disclosed.

### §2.2 `bankDepositMethodDisclosureExpandLabel`

> Why is this required?

### §2.3 `bankDepositMethodDisclosure` (expandable body)

> **Why your account number appears on the notice.** When you offer bank deposit as a payment option, California Code of Civil Procedure § 1161(2) requires the notice to identify the financial institution, the branch address (within five miles of the rental property), and the account number where rent may be deposited. The statute names the account number specifically — a masked or truncated number does not satisfy the requirement and can expose the notice to challenge in an unlawful detainer proceeding.
>
> **If privacy is a concern, you have two compliant options:**
>
> 1. **Skip bank deposit on this notice.** It is one of four optional payment methods. In Person and By Mail satisfy the statute on their own.
>
> 2. **Use a dedicated rent-collection account.** Open a separate account used only for inbound rent. The disclosed account number is then the rent-collection account, not your operating account.
>
> This is broker guidance to help you weigh the trade-off — not legal advice. For questions specific to your situation, consult a California licensed attorney of your choosing.

### §2.4 Ratification

The above is ratified as-is and is the locked copy of record. **Version tag: `v1`.** Source module: `lib/flow/bankDepositDisclosureCopy.ts`. Authority: [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) (CalDRE #B9445457).

This §2 is the **single, canonical source** of the locked wording. Any copy elsewhere (the TS module at `lib/flow/bankDepositDisclosureCopy.ts`, the manifest entry in `docs/compliance/locked_prose_manifest.json`, any future fixture or snapshot file) that diverges from this §2 is a defect to be reconciled by replacing the divergent copy with the wording above. The CI guard re-hashes against this file (see §3.4).

---

## §3. Determination

**Approved.** The shipped copy is broker-prepared UX guidance that surfaces the § 1161(2) account-number disclosure trade-off at the choice point in the wizard, before the landlord selects Bank Deposit as a payment method. The ruling and its rationale follow.

### §3.1 Why the disclosure is appropriate at this layer

The face-of-notice account-number rendering is binding per [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md) (broker-ratified). § 1161(2) names the account number as a face-of-notice element when bank deposit is offered; a masked or truncated rendering does not satisfy the statute and exposes the notice to a facial-sufficiency challenge under the *Eshagian v. Cepeda* (2025) line. The face-of-notice ruling is not reopened by this determination.

What this determination does is shift the privacy implication **forward in time** — from a surprise the landlord discovers when the rendered PDF lands in front of them, to a visible disclosure at the wizard step where the choice is made. The two compliant privacy alternatives (skip bank deposit; use a dedicated rent-collection account) are surfaced at the same moment so the landlord has both the implication and the alternatives in view together. This is a UX intervention that improves landlord decision quality without altering any statutory artifact.

### §3.2 What the disclosure must claim

The locked copy at §2 carries exactly four substantive claims, each verifiable against the cited statute or against a broker-ratified prior determination:

1. **Bank deposit, if selected, prints bank name + branch address + full account number on the face of the notice.** Verifiable against the bank-deposit face-rendering rules established in [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md) and the C7a determination §4 combination matrix.
2. **§ 1161(2) requires those details to appear.** Verifiable directly against [Cal. Code Civ. Proc. § 1161(2)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).
3. **A masked or truncated number does not satisfy the requirement and exposes the notice to challenge.** Verifiable against the face-of-notice ruling and the *Eshagian v. Cepeda* (2025) facial-sufficiency doctrine.
4. **Two compliant privacy alternatives exist: skip the method, or use a dedicated rent-collection account.** Verifiable against the § 1947.3 floor — In Person and By Mail satisfy the floor on their own, so dropping Bank Deposit is statutorily compliant — and against general banking practice (any tenant-facing institution will open a dedicated deposit account).

No other substantive claims are made. The copy does not interpret the statute beyond restating it; it does not advise the landlord on the merits of bank deposit as a payment channel; it does not steer the landlord toward or away from any method.

### §3.3 What the disclosure must NOT claim

The copy at §2 conforms to the following negative-scope rules, and any future edit must continue to conform:

- **No legal-advice framing.** The phrase "broker guidance" is used deliberately in the closing line. Phrases like "we recommend," "you should not," "this is the legally safer choice," or any analog are off-limits.
- **No fear framing.** The copy does not warn of identity theft, account compromise, fraud, or litigation. It states what the statute requires and what alternatives exist; it does not amplify the privacy concern beyond the statutory framing.
- **No attorney attribution or implication.** No "attorney," "counsel," "JD," "SBN," "law firm," or "legal advice" tokens. The single closing line directs the landlord to consult a California licensed attorney of their choosing for situation-specific questions, which is the standard locked posture footer formulation and not attribution.
- **No statutory-face mutation.** The copy does not modify, paraphrase, or replace any locked face sentence. The two prose sets (wizard UX prose vs. notice-face prose) remain disjoint by design.
- **No silent feature behavior.** The copy describes the rendering behavior of the produced notice accurately. If the renderer behavior ever changes (e.g., a future masking decision), this copy and the underlying face-of-notice ruling must be revisited together; the copy cannot drift away from rendering reality.

### §3.4 Confirmation that the copy is UX / advisory and not statutory-face text

Confirmed. The two locked strings in §2 are **Tier-B wizard UI prose** per the tier taxonomy in [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md) §2. They render in the produce wizard's payment-methods step only. They never enter the Tenant Service Copy (page 2), the Owner Record Copy (page 3), or the Proof of Service (page 5). They are not face prose; they are pre-selection advisory copy.

CI guard verification requirement: the locked-prose CI guard (`scripts/ci/verify_locked_prose.ts`), built per the guard design in [`locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`](locked_prose_ci_guard_scope_broker_determination_2026-06-15.md), must re-hash `bankDepositMethodHelper`, `bankDepositMethodDisclosureExpandLabel`, and `bankDepositMethodDisclosure` against this file (§2) at build time and fail on any drift. Manifest entry in `docs/compliance/locked_prose_manifest.json` carries `version: "v1"` and the SHA-256 of each string.

### §3.5 Ruling

**Ratified verbatim. The copy at §2 is the locked copy of record at version `v1`. Build side may continue to wire it as shipped in `b13c2c7` / `102a004` with no further changes. The face-of-notice account-number rendering established in [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md) remains binding and is not reopened by this determination.**

---

## §4. Scope limits / what this does NOT cover

This determination is narrowly scoped to the bank-deposit privacy disclosure copy in the wizard. It does NOT:

- **Change the § 1161(2) bank-deposit designation text on the notice face.** The bank name, branch address, and full account number continue to render verbatim on the notice face per the existing locked payment-block design and [`Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`](Part_E_account_number_exposure_attorney_ruling_2026-06-04.md).
- **Change the five-mile-branch sentence (`fiveMileSentence`) or the mailbox-rule sentence (`mailboxRuleSentence`).** Both are locked face sentences carried unchanged through the C7a multiselect determination.
- **Change the bank paper-instrument sentence (`bankPaperInstrumentSentence`) or the EFT-election sentence (`eftElectionSentence`).** Both are locked face sentences and unaffected.
- **Modify the § 1947.3 floor rule or the EFT pairing rule.** Both are validator rules from [`c7a_multiselect_face_review_broker_determination_2026-06-15.md`](c7a_multiselect_face_review_broker_determination_2026-06-15.md) §6–§7 and unaffected.
- **Authorize masking, truncation, or partial-rendering of the account number on the notice face.** Any such change requires a new broker determination that overrules Part E expressly; this determination does not do that.
- **Authorize the wizard to block, gate, or warn the landlord on the substantive choice to offer bank deposit.** The disclosure is informational. The landlord remains free to select bank deposit; the validator continues to permit the choice subject only to the § 1947.3 floor and the EFT pairing rule.
- **Authorize translation, localization, paraphrase, or templating of the locked strings.** The strings are byte-stable English at `v1`. Any future localization (e.g., Spanish for Los Angeles County compliance) requires a new broker determination authoring the localized copy verbatim and a corresponding manifest entry.
- **Authorize i18n string-table indirection that could mask edits.** The constants must be inlined and CI-guarded. If a future i18n migration is undertaken, the migration plan requires a separate broker determination explicitly preserving the CI-guarded byte-stability of these strings.
- **Cover the bank-name normalization confirmation copy (T3 "We formatted this as: …").** That copy is the subject of [`packet_redesign_compliance_review_broker_determination_2026-06-18.md`](packet_redesign_compliance_review_broker_determination_2026-06-18.md) §3 and is a separate UX artifact.

---

## §5. Posture note

This determination is broker-prepared work product under California Licensed Real Estate Broker supervision per Bus. & Prof. Code § 10131(b). It ratifies UX disclosure copy already shipped to production; it does not constitute legal advice, does not modify any statutory face artifact, and does not establish any attorney-client relationship between OwnerPilot AI or Jack Taglyan and any landlord-user of the platform. The closing line of the disclosure body — "For questions specific to your situation, consult a California licensed attorney of your choosing" — is the locked posture formulation and applies to every landlord who reads the disclosure.

The pattern established by this ratification (always-visible helper + expandable disclosure + version tag + CI-guarded locked strings) is the canonical pattern for future pre-selection privacy or compliance disclosures in the produce wizard. Future disclosures on adjacent payment methods (e.g., an EFT-method disclosure surfacing the previously-established-procedure requirement) should follow this pattern with their own broker determinations.

---

## Sign-off

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **#B9445457**
Broker Compliance Review · 2026-06-18

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
