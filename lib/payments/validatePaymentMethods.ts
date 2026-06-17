/**
 * Payment-method constraint validator for the 3-day pay-or-quit flow.
 *
 * A 3-day notice must state how the tenant may pay (CCP § 1161(2)), and the
 * landlord must offer a statutorily-adequate set of payment methods. This
 * module is the single source of truth for whether a chosen set of methods is
 * legally valid, so the rules live in one tested place rather than scattered
 * through UI.
 *
 * LEGAL BASIS (from attorney review of the spec and the v2 template):
 *   - CCP § 1161(2): payee name, telephone, address required; in-person hours
 *     required if in-person offered; bank-deposit branch must be within 5 miles;
 *     EFT only if "previously established".
 *   - Civil Code § 1947.3: the landlord must allow at least one method that is
 *     NOT cash and NOT electronic funds transfer (i.e. check / cashier's check /
 *     money order). Enforced at PICKER TIME, not just review.
 *   - Existing appellate authority: a web payment portal is NOT a valid method
 *     on a 3-day notice (paying by website is not an "EFT" under the statute).
 *   - Cash may be accepted but may NOT be the sole offered method (§ 1947.3).
 *
 * SCOPE BOUNDARY — what this validator does and does NOT do:
 *   It decides whether a payment-method CONFIGURATION is legally valid. It does
 *   NOT verify the underlying FACTS the user attests to. It enforces that a
 *   required attestation (5-mile confirmation, "previously established"
 *   confirmation) is PRESENT — it cannot enforce that the attestation is TRUE.
 *   "validator passed" means "the config is well-formed and complete", NOT "the
 *   bank branch really is within 5 miles". Keep that distinction in the UI.
 *
 * This is property-management form logic, not legal advice.
 */

/** The four offerable method kinds. NOTE: there is intentionally no web-portal kind. */
export type PaymentMethodKind =
  | 'in_person'
  | 'by_mail'
  | 'bank_deposit'
  | 'eft'
  | 'cash';

/**
 * OPEN QUESTION for the attorney: cashier's check and money order are modeled
 * here as variants of the non-cash/non-EFT "check-like" family carried on the
 * in_person and/or mail methods, rather than as separate kinds. If she wants
 * them as distinct selectable methods, that's a taxonomy change. Flagged, not
 * decided.
 */

export interface InPersonMethod {
  kind: 'in_person';
  /** Required if in-person is offered (CCP § 1161(2)). */
  daysHours?: string;
}

export interface MailMethod {
  kind: 'by_mail';
  /** Required if mail is offered; may default to payee address with confirmation. */
  mailAddress?: string;
}

export interface BankDepositMethod {
  kind: 'bank_deposit';
  bankName?: string;
  branchAddress?: string;
  accountNumber?: string;
  /** User attestation that the branch is within five miles of the premises. */
  within5MilesConfirmed?: boolean;
}

export interface EftMethod {
  kind: 'eft';
  /** User attestation that the EFT procedure was previously established with the tenant. */
  previouslyEstablishedConfirmed?: boolean;
}

export interface CashMethod {
  kind: 'cash';
}

export type PaymentMethod =
  | InPersonMethod
  | MailMethod
  | BankDepositMethod
  | EftMethod
  | CashMethod;

export interface PaymentMethodsInput {
  methods: PaymentMethod[];
}

export interface ValidationError {
  /** Stable code for UI mapping / testing. */
  code: string;
  /** Which method kind the error attaches to, or 'set' for whole-configuration errors. */
  scope: PaymentMethodKind | 'set';
  /** Human-readable message safe to surface in the UI. */
  message: string;
}

export interface ValidationResult {
  /** True iff there are zero errors. */
  valid: boolean;
  errors: ValidationError[];
  /**
   * Whether the picker's "Continue" should be enabled. Identical to `valid`;
   * exposed as a named field because the attorney specifically directed
   * enforcement at picker time ("disable Continue until..."), and naming it
   * keeps that intent legible at the call site.
   */
  canContinue: boolean;
}

/** Methods that satisfy the § 1947.3 floor (non-cash AND non-EFT). */
const SECTION_1947_3_SATISFYING: PaymentMethodKind[] = ['in_person', 'by_mail'];

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim() === '';
}

/**
 * Validate a set of offered payment methods against the statutory constraints.
 * Returns all errors found (not just the first) so the UI can surface them
 * together.
 */
export function validatePaymentMethods(
  input: PaymentMethodsInput,
): ValidationResult {
  const errors: ValidationError[] = [];
  const methods = input.methods ?? [];
  const kinds = methods.map((m) => m.kind);

  // --- Set-level rules -----------------------------------------------------

  // At least one method must be offered.
  if (methods.length === 0) {
    errors.push({
      code: 'NO_METHODS',
      scope: 'set',
      message: 'You must offer at least one way for the tenant to pay.',
    });
  }

  // Duplicate kinds are a configuration error (each method offered once).
  const seen = new Set<PaymentMethodKind>();
  for (const k of kinds) {
    if (seen.has(k)) {
      errors.push({
        code: 'DUPLICATE_METHOD',
        scope: k,
        message: `The "${k}" payment method is listed more than once.`,
      });
    }
    seen.add(k);
  }

  // § 1947.3 floor: at least one non-cash, non-EFT method (check/money order
  // delivered in person or by mail).
  const hasFloorMethod = kinds.some((k) =>
    SECTION_1947_3_SATISFYING.includes(k),
  );
  if (methods.length > 0 && !hasFloorMethod) {
    errors.push({
      code: 'SECTION_1947_3_FLOOR',
      scope: 'set',
      message:
        'California law (Civil Code § 1947.3) requires offering at least one ' +
        'non-cash, non-electronic method — for example, payment by check or ' +
        'money order, in person or by mail.',
    });
  }

  // EFT pairing rule (c7a_multiselect_face_review_broker_determination_2026-06-15
  // §6): EFT may only be offered alongside By Mail. In Person does not satisfy
  // the pairing. Message locked verbatim from the determination.
  if (kinds.includes('eft') && !kinds.includes('by_mail')) {
    errors.push({
      code: 'EFT_REQUIRES_MAIL',
      scope: 'eft',
      message:
        "Electronic funds transfer requires that mail payment also be offered " +
        "as a method. Add 'By mail' to the selected payment methods, or remove EFT.",
    });
  }

  // Cash may be offered but never as the sole method (§ 1947.3).
  if (kinds.length === 1 && kinds[0] === 'cash') {
    errors.push({
      code: 'CASH_ONLY',
      scope: 'cash',
      message:
        'Cash cannot be the only payment method offered. Add at least one ' +
        'non-cash method such as check or money order.',
    });
  }

  // --- Per-method rules ----------------------------------------------------

  for (const m of methods) {
    switch (m.kind) {
      case 'in_person':
        if (isBlank(m.daysHours)) {
          errors.push({
            code: 'IN_PERSON_HOURS_REQUIRED',
            scope: 'in_person',
            message:
              'When in-person payment is offered, you must state the days and ' +
              'hours the payee is available to receive payment.',
          });
        }
        break;

      case 'by_mail':
        if (isBlank(m.mailAddress)) {
          errors.push({
            code: 'MAIL_ADDRESS_REQUIRED',
            scope: 'by_mail',
            message: 'When mail payment is offered, a mailing address is required.',
          });
        }
        break;

      case 'bank_deposit':
        if (isBlank(m.bankName)) {
          errors.push({
            code: 'BANK_NAME_REQUIRED',
            scope: 'bank_deposit',
            message: 'Bank deposit requires the name of the financial institution.',
          });
        }
        if (isBlank(m.branchAddress)) {
          errors.push({
            code: 'BANK_BRANCH_REQUIRED',
            scope: 'bank_deposit',
            message: 'Bank deposit requires the branch street address.',
          });
        }
        if (isBlank(m.accountNumber)) {
          errors.push({
            code: 'BANK_ACCOUNT_REQUIRED',
            scope: 'bank_deposit',
            message: 'Bank deposit requires the account number.',
          });
        }
        // The 5-mile rule: the branch must be within five miles of the premises
        // for this option to be valid. We can only enforce that the user has
        // CONFIRMED it (attestation), not that it is true.
        if (m.within5MilesConfirmed !== true) {
          errors.push({
            code: 'BANK_5_MILE_UNCONFIRMED',
            scope: 'bank_deposit',
            message:
              'Bank deposit is only valid if the branch is within five miles ' +
              'of the rental property. Please confirm this, or remove the bank ' +
              'deposit option.',
          });
        }
        break;

      case 'eft':
        // EFT is only valid if the procedure was previously established with
        // the tenant. Again, we enforce the presence of the confirmation, not
        // its truth.
        if (m.previouslyEstablishedConfirmed !== true) {
          errors.push({
            code: 'EFT_NOT_PREVIOUSLY_ESTABLISHED',
            scope: 'eft',
            message:
              'Electronic funds transfer can only be offered if an EFT ' +
              'procedure was previously established with the tenant. Please ' +
              'confirm this, or remove the EFT option.',
          });
        }
        break;

      case 'cash':
        // No per-method requirements; the set-level CASH_ONLY rule governs.
        break;

      default: {
        // Exhaustiveness guard: if a new kind is added without handling, this
        // line fails to compile, forcing the rules to be updated.
        const _exhaustive: never = m;
        void _exhaustive;
      }
    }
  }

  const valid = errors.length === 0;
  return { valid, errors, canContinue: valid };
}
