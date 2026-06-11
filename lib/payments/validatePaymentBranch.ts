/**
 * validatePaymentBranch — v4 payment configuration validator.
 *
 * Implements the attorney ruling of 2026-06-01 on the § 1161(2) payment-fields
 * change (see v4_payment_fields_attorney_review + ruling). This is the single
 * source of truth for whether a v4 payment configuration is WELL-FORMED at
 * intake. It does NOT decide production-readiness — the produce gate
 * (evaluateCanProduce) layers the 5-mile production requirement and the
 * attorney wording sign-off on top of this.
 *
 * Ruling translated to rules:
 *  - § 1161(2) payee trio (name, telephone, street address) all required;
 *    telephone validated as a US phone.
 *  - Single-choice branch model (Decision 2): exactly one of mail_only /
 *    in_person_and_mail / bank_deposit. EFT is add-on only and only when
 *    previously established. No cash branch (Decision 3).
 *  - bank_deposit (Decision 1): valid for the § 1947.3 floor ONLY when the
 *    landlord confirms a PAPER instrument is deposited; otherwise the branch is
 *    invalid (a cash deposit is still cash). Bank name / branch / account also
 *    required.
 *  - in_person_and_mail: personal-delivery days AND hours required; the street
 *    address must accept personal delivery, so a P.O.-box-style address is
 *    rejected on this branch (C1).
 *  - The § 1161(2) mailbox-rule sentence applies on every v4 branch (the listed
 *    address may receive mail); `mailboxRuleApplies` is surfaced for the
 *    renderer. A P.O.-box-style address always forces it (C1).
 *  - 5-mile rule (C2): NOT enforced at intake (geocoding not live). Surfaced as
 *    a WARNING + a flag so the produce gate can require a human attestation.
 *
 * SCOPE BOUNDARY: "valid" means the configuration is well-formed and complete,
 * NOT that the attested facts (5-mile, previously-established EFT, paper
 * instrument) are TRUE. This validator enforces that required attestations are
 * PRESENT; it cannot verify them. Property-management form logic, not legal advice.
 */

import type {
  NoticeFlowData,
  PaymentBranch,
} from '../flow/noticeFlowState';

export type PaymentBranchErrorCode =
  | 'PAYEE_OVERRIDE_NAME_REQUIRED'
  | 'CONTACT_PHONE_REQUIRED'
  | 'CONTACT_PHONE_FORMAT'
  | 'CONTACT_ADDRESS_REQUIRED'
  | 'BRANCH_REQUIRED'
  | 'BRANCH_INVALID'
  | 'PERSONAL_DELIVERY_DAYS_REQUIRED'
  | 'PERSONAL_DELIVERY_HOURS_REQUIRED'
  | 'PERSONAL_DELIVERY_POBOX'
  | 'BANK_NAME_REQUIRED'
  | 'BANK_BRANCH_REQUIRED'
  | 'BANK_ACCOUNT_REQUIRED'
  | 'BANK_PAPER_INSTRUMENT_REQUIRED'
  | 'EFT_REQUIRES_NON_EFT_PRIMARY'
  | 'EFT_NOT_PREVIOUSLY_ESTABLISHED';

export type PaymentBranchWarningCode = 'BANK_5_MILE_UNVERIFIED';

export type PaymentBranchScope =
  | 'contact'
  | 'branch'
  | 'in_person_and_mail'
  | 'bank_deposit'
  | 'eft';

export interface PaymentBranchError {
  code: PaymentBranchErrorCode;
  scope: PaymentBranchScope;
  message: string;
}

export interface PaymentBranchWarning {
  code: PaymentBranchWarningCode;
  scope: PaymentBranchScope;
  message: string;
}

export interface PaymentBranchResult {
  /** True iff there are zero errors (warnings do not affect validity). */
  valid: boolean;
  errors: PaymentBranchError[];
  warnings: PaymentBranchWarning[];
  /** Identical to `valid`; named for the picker's "disable Continue until…" intent. */
  canContinue: boolean;
  /**
   * Whether the § 1161(2) mailbox-rule sentence must render for this config.
   * True on every v4 branch (the listed address can receive mail), and always
   * true when the listed address looks like a P.O. box. The RENDERER consumes
   * this; the exact sentence wording was locked by the 2026-06-04 A1 Part D countersign.
   */
  mailboxRuleApplies: boolean;
  /** True when the listed street address looks like a P.O. box (C1 heuristic). */
  listedAddressLooksLikePoBox: boolean;
}

/** Input is the relevant slice of the flow data (whole data accepted for convenience). */
export type PaymentBranchInput = Pick<
  NoticeFlowData,
  | 'landlordContact'
  | 'paymentBranch'
  | 'personalDeliveryDays'
  | 'personalDeliveryHours'
  | 'bankName'
  | 'bankBranchAddress'
  | 'bankAccountNumber'
  | 'bankDepositPaperInstrumentConfirmed'
  | 'bankBranchWithinFiveMilesAttested'
  | 'eftElectionAvailable'
  | 'eftPreviouslyEstablishedConfirmed'
  | 'payeeIsNonLandlord'
  | 'payeeOverrideName'
>;

const VALID_BRANCHES: PaymentBranch[] = [
  'mail_only',
  'in_person_and_mail',
  'bank_deposit',
];

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim() === '';
}

/** US phone: 10 digits, or 11 with a leading country code '1'. Formatting ignored. */
export function isUsPhone(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;
  return false;
}

/** Heuristic P.O.-box detector (C1): best-effort, not authoritative. */
export function looksLikePoBox(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  // Matches "PO Box", "P.O. Box", "P O Box", "Post Office Box", "POB 123".
  return /\b(p\.?\s*o\.?\s*box|post\s+office\s+box|\bpob)\b/i.test(raw);
}

export function validatePaymentBranch(
  input: PaymentBranchInput,
): PaymentBranchResult {
  const errors: PaymentBranchError[] = [];
  const warnings: PaymentBranchWarning[] = [];

  // --- § 1161(2) payee trio: name + telephone + street address ------------
  const contact = input.landlordContact ?? {};
  // Defect #2 cutover: the payee NAME is no longer typed here. It is derived
  // from the Step-3 landlord identity (validated on Step 3 and by the produce
  // gate's PAYEE_NAME_UNRESOLVED check). The only name this validator now owns
  // is the non-landlord override name: when the override is on, it must be set.
  if (input.payeeIsNonLandlord === true && isBlank(input.payeeOverrideName)) {
    errors.push({
      code: 'PAYEE_OVERRIDE_NAME_REQUIRED',
      scope: 'contact',
      message: 'Enter the name of the payee who receives rent.',
    });
  }
  if (isBlank(contact.phone)) {
    errors.push({
      code: 'CONTACT_PHONE_REQUIRED',
      scope: 'contact',
      message:
        'A telephone number for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  } else if (!isUsPhone(contact.phone)) {
    errors.push({
      code: 'CONTACT_PHONE_FORMAT',
      scope: 'contact',
      message: 'Enter a valid US telephone number (10 digits).',
    });
  }
  if (isBlank(contact.streetAddress)) {
    errors.push({
      code: 'CONTACT_ADDRESS_REQUIRED',
      scope: 'contact',
      message:
        'A street address for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  }

  const addressPoBox = looksLikePoBox(contact.streetAddress);

  // --- Branch selection ----------------------------------------------------
  const branch = input.paymentBranch;
  if (branch === undefined) {
    errors.push({
      code: 'BRANCH_REQUIRED',
      scope: 'branch',
      message: 'Choose how rent may be paid.',
    });
  } else if (!VALID_BRANCHES.includes(branch)) {
    errors.push({
      code: 'BRANCH_INVALID',
      scope: 'branch',
      message: 'The selected payment configuration is not valid.',
    });
  }

  // --- Branch-specific rules ----------------------------------------------
  if (branch === 'in_person_and_mail') {
    if (isBlank(input.personalDeliveryDays)) {
      errors.push({
        code: 'PERSONAL_DELIVERY_DAYS_REQUIRED',
        scope: 'in_person_and_mail',
        message:
          'State the days the payee is available to receive payment in person.',
      });
    }
    if (isBlank(input.personalDeliveryHours)) {
      errors.push({
        code: 'PERSONAL_DELIVERY_HOURS_REQUIRED',
        scope: 'in_person_and_mail',
        message:
          'State the hours the payee is available to receive payment in person.',
      });
    }
    // C1: a P.O. box cannot accept personal delivery.
    if (addressPoBox) {
      errors.push({
        code: 'PERSONAL_DELIVERY_POBOX',
        scope: 'in_person_and_mail',
        message:
          'The payment address is a P.O. box, which cannot accept personal ' +
          'delivery. Use a street address that allows personal delivery, or ' +
          'choose mail-only.',
      });
    }
  }

  if (branch === 'bank_deposit') {
    if (isBlank(input.bankName)) {
      errors.push({
        code: 'BANK_NAME_REQUIRED',
        scope: 'bank_deposit',
        message: 'Bank deposit requires the name of the financial institution.',
      });
    }
    if (isBlank(input.bankBranchAddress)) {
      errors.push({
        code: 'BANK_BRANCH_REQUIRED',
        scope: 'bank_deposit',
        message: 'Bank deposit requires the branch street address.',
      });
    }
    if (isBlank(input.bankAccountNumber)) {
      errors.push({
        code: 'BANK_ACCOUNT_REQUIRED',
        scope: 'bank_deposit',
        message: 'Bank deposit requires the account number.',
      });
    }
    // Decision 1: a bank deposit satisfies the § 1947.3 floor ONLY when a paper
    // instrument is deposited. Without that confirmation the branch is invalid.
    if (input.bankDepositPaperInstrumentConfirmed !== true) {
      errors.push({
        code: 'BANK_PAPER_INSTRUMENT_REQUIRED',
        scope: 'bank_deposit',
        message:
          'Bank deposit is only a valid sole method when the tenant pays by a ' +
          'paper check, money order, or cashier\u2019s check (a cash deposit ' +
          'is still cash under Civil Code § 1947.3). Confirm a paper ' +
          'instrument, or choose a different method.',
      });
    }
    // C2: the 5-mile rule is not enforced at intake (geocoding not live). Warn,
    // and let the produce gate require the human attestation before producing.
    if (input.bankBranchWithinFiveMilesAttested !== true) {
      warnings.push({
        code: 'BANK_5_MILE_UNVERIFIED',
        scope: 'bank_deposit',
        message:
          'The branch must be within five miles of the rental property ' +
          '(Cal. Code Civ. Proc. § 1161(2)). This will require confirmation ' +
          'before a notice can be produced.',
      });
    }
  }

  // --- Additive EFT election ----------------------------------------------
  // EFT is never a branch; it only attaches to a valid primary branch and only
  // when previously established (§ 1161(2)). It can never be the sole method.
  if (input.eftElectionAvailable === true) {
    // EFT is an ADD-ON only — never the sole offered method. It must attach to
    // a valid NON-EFT primary branch (mail_only / in_person_and_mail /
    // bank_deposit). Enforced explicitly (attorney A1 countersign, 2026-06-04)
    // so the rule does not depend on the incidental BRANCH_REQUIRED error: a
    // config carrying an EFT election with no valid primary branch is rejected
    // here by name. (A bank_deposit without a confirmed paper instrument is a
    // cash method and is already rejected by BANK_PAPER_INSTRUMENT_REQUIRED, so
    // the only configs that survive are those with a genuine non-cash,
    // non-EFT primary.)
    if (branch === undefined || !VALID_BRANCHES.includes(branch)) {
      errors.push({
        code: 'EFT_REQUIRES_NON_EFT_PRIMARY',
        scope: 'eft',
        message:
          'Electronic funds transfer cannot be the only payment method offered ' +
          'on the notice. Add a non-EFT method — by mail, in person, or by bank ' +
          'deposit — as the primary method. (Cal. Code Civ. Proc. § 1161(2).)',
      });
    }
    if (input.eftPreviouslyEstablishedConfirmed !== true) {
      errors.push({
        code: 'EFT_NOT_PREVIOUSLY_ESTABLISHED',
        scope: 'eft',
        message:
          'Electronic funds transfer can only be added if an EFT procedure was ' +
          'previously established with the tenant (Cal. Code Civ. Proc. § 1161(2)).',
      });
    }
  }

  // Mailbox-rule sentence applies on every v4 branch (the listed address may
  // receive mail), and always when the address looks like a P.O. box (C1).
  const mailboxRuleApplies = branch !== undefined || addressPoBox;

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    canContinue: valid,
    mailboxRuleApplies,
    listedAddressLooksLikePoBox: addressPoBox,
  };
}
