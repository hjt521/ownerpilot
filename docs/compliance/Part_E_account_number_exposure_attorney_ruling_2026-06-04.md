# Broker Compliance Ruling — Part E: Account-Number Exposure on Face of Notice

**File:** `Part_E_account_number_exposure_attorney_ruling_2026-06-04.md`
**Date:** 2026-06-04 (re-committed under broker authority 2026-06-18)
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE **#B9445457**
**Authority:** [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md) — sole compliance authority under Bus. & Prof. Code § 10131(b).
**Status:** Binding determination. Re-committed as broker work product under the 2026-06-15 blanket authorization. Filename retained for citation continuity from the pre-2026-06-15 session record.
**Posture:** Broker-prepared workflow under California Licensed Real Estate Broker supervision. Not legal advice.

> **Attribution note (2026-06-18):** This file's name preserves the original session-record filename for citation continuity with downstream determinations that reference it. The substance is broker work product authored under [`broker_blanket_authorization_2026-06-15.md`](broker_blanket_authorization_2026-06-15.md). No attorney engagement is implied; the "attorney_ruling" suffix in the filename is a legacy artifact and is superseded by this broker attribution. Future Part_E amendments are dated forward as broker determinations.

---

## §1. The question

When a landlord offers bank deposit as a payment method under Cal. Code Civ. Proc. § 1161(2), the statute requires the notice to identify the bank account into which rent may be deposited. The question is whether the account number must render in full on the face of the served notice, or whether it may be masked or truncated (e.g., `*****6789`) to mitigate the privacy exposure of posting a full account number on a tenant's door.

---

## §2. Ruling

**The full account number must render verbatim on the face of the served notice. No mask. No truncation. No partial-digit disclosure.**

This applies to:
- The Tenant Service Copy (page 2 of the packet).
- The Owner Record Copy (page 3 of the packet) — identical to the served copy by design.

The renderer must not introduce any partial-rendering pathway for the account number when bank deposit is offered.

---

## §3. Reasoning

### §3.1 Statutory text

Cal. Code Civ. Proc. § 1161(2) requires the notice, when bank deposit is offered as a payment option, to identify:

> a financial institution within five miles of the rental property, the address of that institution, **and the account number into which the rental payment may be deposited**.

The statute names "the account number" as a face-of-notice element. It does not say "an identifier for the account," "the last four digits of the account number," or "a reference to the account." It names the account number itself. Primary source: [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).

### §3.2 Facial-sufficiency challenge under *Eshagian v. Cepeda* (2025)

On an unlawful-detainer challenge, opposing counsel will argue that a masked or truncated account number does not satisfy § 1161(2) because the tenant cannot use it to make the bank deposit the statute requires the landlord to offer. A masked number is not the account number — it is a redaction of it. Under the *Eshagian v. Cepeda* (2025) line, the notice must carry each statutorily-required element on its face in a form that permits the tenant to act on it; a redacted element is a missing element. The notice would be quashed and the landlord would re-serve and re-file. That is a fatal defect.

### §3.3 The privacy concern is real but resolved by the statute

A full account number printed on a posted notice is a real exposure. The statute resolves the trade-off in favor of disclosure. A landlord who is not comfortable with that disclosure has two **compliant** privacy alternatives, neither of which involves masking the number on the face of the notice:

1. **Do not offer bank deposit on this notice.** Bank deposit is one of four optional payment methods. In Person and By Mail satisfy § 1947.3 on their own. Dropping bank deposit removes the disclosure entirely.
2. **Use a dedicated rent-collection account.** Open a separate bank account used only for inbound rent. The disclosed account number is then the rent-collection account, not the landlord's operating account, and the privacy exposure is contained to that account's rent flow.

These alternatives are surfaced to the landlord at the wizard's choice point via the Tier-B locked-prose disclosure (`bankDepositMethodHelper` and `bankDepositMethodDisclosure`) per [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md).

### §3.4 Why "last 4 digits" is not a workaround

A frequent suggestion is to render only the last 4 digits of the account number (`*****6789`). This fails for the same reason any other mask fails: the tenant cannot use `*****6789` to make a deposit. The statute requires the account number to appear so the tenant has an actionable channel to cure the default. Last-4 is no more actionable than a complete redaction.

### §3.5 Why the bank name + branch address alone is not enough

A second frequent suggestion is to provide bank name and branch address but omit the account number, on the theory that a tenant can visit the branch and ask. This also fails. The statute names three elements (institution, branch address, account number); omitting any one of them is facial insufficiency. The branch counter cannot lawfully disclose the landlord's account number to a tenant without the landlord's authorization, and even if it could, requiring the tenant to walk into a branch to obtain the number is not the channel the statute contemplates.

---

## §4. Build-side renderer constraints (binding)

The renderer must conform to the following:

1. **No masking pathway.** The `composeFaceText` function and any downstream PDF/HTML renderer must render the full account number when bank deposit is in `selectedMethods[]`. No conditional masking. No feature flag that hides digits.
2. **No truncation pathway.** No "last 4 digits" rendering, no "first 4 + last 4," no ellipsis substitution.
3. **No optional-omission pathway.** If bank deposit is selected, the bank block renders with bank name, branch address (within five miles), and the full account number. All three. No partial bank blocks.
4. **The owner has two compliant outs.** Both must remain available in the wizard:
   - Drop bank deposit from `paymentMethods[]` (the wizard's multi-select must not coerce bank deposit as default).
   - Enter a dedicated rent-collection account number (the wizard's account-number field accepts any valid US account number; the landlord chooses which account).
5. **The Tier-B locked-prose disclosure must surface this trade-off at the choice point.** Per [`bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md`](bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md), `bankDepositMethodHelper` and `bankDepositMethodDisclosure` render adjacent to the Bank Deposit checkbox in the produce wizard's payment-methods step.

---

## §5. What this ruling does NOT do

- Does not modify § 1161(2) or interpret it beyond restating its text.
- Does not address EFT (Electronic Funds Transfer) account-number exposure. EFT under § 1161(2) requires a "previously established" procedure and does not require the account number on the face — see [`EFT_not_sole_attorney_ruling_2026-06-04.md`](EFT_not_sole_attorney_ruling_2026-06-04.md) and the C7a multiselect determination §6 for the EFT pairing rule.
- Does not address routing numbers. The statute names the account number specifically; routing numbers are not face-of-notice elements under § 1161(2).
- Does not authorize the wizard to block a landlord from offering bank deposit. The choice is the landlord's; the wizard surfaces the implication and provides the two compliant alternatives.
- Does not modify the bank name, branch address, or five-mile-rule disclosures. Those are governed by `fiveMileSentence` (locked face sentence) and the A1 Part D rulings.

---

## §6. Statutory anchor

- **Cal. Code Civ. Proc. § 1161(2)** — bank-deposit face-of-notice elements. Primary source: [leginfo § 1161](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=1161.).
- **Cal. Civ. Code § 1947.3** — landlord may not require cash-only or EFT-only payment; floor rule for In Person and By Mail. Primary source: [leginfo § 1947.3](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1947.3.).
- ***Eshagian v. Cepeda*** (2025) — face-of-notice element doctrine.

---

## §7. Sign-off

**Ruling:** Full account number renders verbatim on the face of the served notice when bank deposit is offered. No mask. No truncation. The landlord has two compliant privacy alternatives (drop the method or use a dedicated account), both of which the wizard surfaces at the choice point. Closed at [`Part_E_closure_addendum_2026-06-04.md`](Part_E_closure_addendum_2026-06-04.md).

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **#B9445457**
Broker Compliance Review · 2026-06-04 (re-committed 2026-06-18)

---

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
