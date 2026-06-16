# Attorney Countersign — A1 Part D (FINANCIAL_INSTITUTION re-render)

**Re:** [`A1_financial_institution_refix_note.md`](/home/user/workspace/uploaded_attachments/e3f89cbf3ceb46b2bece2588ac745c84/A1_financial_institution_refix_note.md) — engineering's re-render of the FINANCIAL_INSTITUTION sample addressing the single [MUST FIX] from yesterday's sign-off.

**Prior sign-off:** [`A1_part_d_attorney_signoff_2026-06-03.md`](/home/user/workspace/A1_part_d_attorney_signoff_2026-06-03.md)

**Status:** **COUNTERSIGNED.** All four samples now pass. The thirteen renderer prose constants are **build-locked**. `V4_WORDING_SIGNED_OFF = true`. Single-branch + EFT-add-on payment production is unblocked.

---

## What I checked

1. **The fix is gating, not wording.** Confirmed: the `mailboxRuleSentence` constant string is unchanged. Only the `bank_deposit` branch's push of that sentence onto the rendered list was removed. That is exactly what I asked for — the string remains valid where it belongs (§ 1161(2) alternative (i)), and it no longer mis-renders in the alternative (ii) branch.

2. **The re-rendered FINANCIAL_INSTITUTION "HOW TO PAY" block** (re-quoted from §"Corrected FINANCIAL_INSTITUTION …" of the refix note):

    ```
    HOW TO PAY

    Payable to: Example Property Owner LLC
    Telephone: (555) 123-4567
    Bank: Example Bank, N.A.
    Branch: 750 Finance Boulevard, Exampleville, CA 90001
    Account number: 000000001234

    Payment to the account above may be made by check, money order, or cashier's check.
    The branch identified above is within five miles of the rental property, as required by Cal. Code Civ. Proc. § 1161(2).
    ```

    This is correct on the face. It satisfies § 1161(2) alternative (ii):

    - Payee identified (`Payable to`)
    - Telephone number on face
    - Financial institution name
    - Branch street address (the five-mile attestation references it)
    - Account number
    - Paper-instrument disclosure (check / money order / cashier's check) — consistent with the prior ruling in [`v4_payment_fields_attorney_ruling.md`](/home/user/workspace/v4_payment_fields_attorney_ruling.md) Decision 1 that bank deposit is paper-instrument only
    - Five-mile attestation sentence on face, citing § 1161(2) inline (per-page citation discipline)

    No mailbox-rule sentence. No invitation to mail rent to the bank. The Eshagian-style ambiguity I flagged is gone.

3. **Regression check on the three previously-approved samples.** Per the refix note, MAIL_ONLY, PERSONAL_DELIVERY, and MAIL_ONLY + EFT renderings are unchanged. The mailbox-rule sentence still renders where it should. That is consistent with a gating-only fix in the `bank_deposit` branch and is the correct outcome.

---

## Build-lock declaration

Per [`ownerpilot_open_attorney_questions_attorney_ruling_2026-06-02.md`](/home/user/workspace/ownerpilot_open_attorney_questions_attorney_ruling_2026-06-02.md) A1(2):

- **The thirteen renderer prose constants build-lock effective this countersign.** Verbatim renderings only. Any string-level change requires a fresh attorney review packet (one rendered sample per affected branch + the source constant + the audit dump). Whitespace, punctuation, and capitalization are part of the locked string.
- **`V4_WORDING_SIGNED_OFF = true`** for single-branch + EFT-add-on payment production.
- **Multi-method (B3) wording is NOT covered by this lock.** When the multi-method renderer ships, a new Part D-style packet is owed (one rendered sample per shipping subset combination), per the A2 gate.

---

## Two open items the refix note flagged — my rulings

### 1. EFT-can't-be-sole enforcement in `validatePaymentBranch` [MUST CONFIRM, not blocking build-lock]

The refix note correctly recalls my prior instruction that the "EFT may not be the sole offered method" constraint must live in renderer validation logic, not just in samples.

- **Ruling:** Build-lock proceeds. The structural model (EFT has no `paymentBranch`; a primary branch is always required) carries most of the weight on its own. The remaining risk is a future code path that constructs a notice with `offeredMethods = ["EFT"]` and slips past.
- **What I need from engineering, within one sprint:** a one-screen confirmation that `validatePaymentBranch` (or its equivalent) throws when `offeredMethods` contains EFT and no non-EFT, non-cash primary. A unit test asserting the throw. Send as a short attorney-note; no full review packet needed. This is a `[SHOULD FIX]` to close the loop, not a `[MUST FIX]` to halt production.

### 2. Full bank account number on the served face [MUST FIX before production — separate from this sign-off]

This is the right question and I should have flagged it explicitly on the first round. Calling it out now:

- **§ 1161(2) requires the account number on the face of a financial-institution notice.** That is the statutory text, not a drafting choice. So masking the account number on the **served notice itself** is not available.
- **But there is real and obvious downstream exposure.** A served three-day notice ends up in tenant files, sometimes attached to UD pleadings (which become court records), sometimes photographed and shared. A landlord's full operating-account number is then on file in places the landlord did not intend.
- **What I'm requiring before this goes into customer production** (separate workstream, does **not** block the build-lock above):
    1. **Use a dedicated rent-collection sub-account, not the operating account.** OwnerPilot should advise this in the intake / setup flow. Surface it in the notice composition step when the landlord enters bank details for the first time — a short interstitial: *"This account number will appear on the served notice and may end up in court records. We recommend using a dedicated rent-collection account, not your primary operating account."*
    2. **For attached / archival copies** (the landlord's own records, the PDF the platform stores for re-service or proof of service), the account number must render in full — same as the served face. Masking the archival copy creates a mismatch with the served document and breaks the audit trail.
    3. **For tenant-display surfaces other than the served face** (e.g., a portal preview shown to the tenant before service is completed, if such a surface exists), masking is acceptable and probably wise. Confirm with engineering whether any such surface exists; if so, mask there with the last four visible.
    4. **For UD-filing attachments**, leave the account number visible — courts need the unredacted served notice. Redaction is a court-level decision (Cal. Rules of Court 1.20 / 1.201), not ours.
- **Treat this as a separate Part E item.** Send a short note covering (1) the interstitial copy, (2) confirmation of any tenant-preview surface, and (3) which platform surfaces show the account number. I'll rule on the interstitial language and the masking policy in one round.

---

## Summary for the build sheet

| Item | Status |
|---|---|
| FINANCIAL_INSTITUTION mailbox-rule [MUST FIX] | **CLEARED** |
| Thirteen renderer prose constants | **BUILD-LOCKED** |
| `V4_WORDING_SIGNED_OFF` | **`true`** |
| Single-branch + EFT-add-on payment production | **UNBLOCKED** |
| Multi-method (B3) wording lock | Pending separate Part D-style packet when renderer ships |
| `validatePaymentBranch` EFT-not-sole enforcement | [SHOULD FIX] — one-screen confirmation owed within one sprint |
| Bank account number exposure (interstitial + masking policy) | New Part E item — separate short packet owed before customer production |

— Reviewing Attorney · 2026-06-04 · SBN [pending]
