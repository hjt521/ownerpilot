/**
 * The two production-blocking gates for the 3-day notice flow.
 *
 * 1. Dispute hard-block: the pre-flight safety gate. If the tenant has asserted
 *    any claim (complaint, written withholding, bankruptcy), document production
 *    is the wrong move — stop and route to attorney. This mirrors the chat
 *    system prompt's HARD RULES, applied to document production.
 *
 * 2. Review gate (`evaluateCanProduce`): aggregates EVERY blocking condition
 *    into one decision. Fails closed — `canProduce` is true only when every
 *    condition is affirmatively satisfied. Wires in the real modules.
 *
 * Not legal advice; product workflow logic.
 */

import {
  NoticeFlowData,
  DisputeScreen,
} from './noticeFlowState';
import {
  validatePaymentMethods,
  ValidationError,
} from '../payments/validatePaymentMethods';
import { detectJurisdiction } from '../jurisdiction/detectJurisdiction';
import { getVerifiedHolidaySet } from '../dates/holidays';
import { computeCompliancePeriod } from '../dates/computeCompliancePeriod';
import {
  validatePaymentBranch,
  PaymentBranchError,
  PaymentBranchWarning,
} from '../payments/validatePaymentBranch';
import {
  NOTICE_TEMPLATE_VERSION,
  V4_WORDING_SIGNED_OFF,
  GEOCODING_LIVE,
} from './templateVersion';

// --- 1. Dispute hard-block -------------------------------------------------

/**
 * Per-question policy for an 'unknown' answer. This is the attorney-reviewable
 * heart of the dispute screen: which "I don't know" answers may proceed
 * (with a logged warning) vs. which must block.
 *
 *  - complaint  : 'unknown' may PROCEED (lower stakes; a tenant complaint does
 *                 not void a 3-day notice). Logged, not silently dropped.
 *  - withholding: 'unknown' BLOCKS. A written habitability/repair withholding
 *                 can be an affirmative defense to the UD; must be confirmed.
 *  - bankruptcy : 'unknown' BLOCKS, with automatic-stay guidance.
 *
 * NOTE: this relaxation (complaint-unknown proceeding) is a change to the
 * attorney-reviewed dispute screen and is flagged for her next review.
 */
export const UNKNOWN_PROCEEDS: Record<keyof DisputeScreen, boolean> = {
  tenantFiledComplaint: true, // proceed-with-warning
  tenantWrittenWithholding: false, // blocks
  tenantBankruptcy: false, // blocks (automatic stay)
};

export interface DisputeBlockResult {
  /** True if any dispute condition is present OR any BLOCKING answer is missing/unknown. */
  blocked: boolean;
  /** True when the screen may advance (all 'yes' absent; all blocking-unknowns resolved). */
  cleared: boolean;
  /**
   * True when an answer is 'yes' — route to attorney handoff. Distinct from a
   * mere 'unknown'/unanswered.
   */
  hardBlocked: boolean;
  /**
   * True when blocked solely because a BLOCKING question is 'unknown' or
   * unanswered (no 'yes'). UI shows "confirm before serving" guidance.
   */
  needsCheck: boolean;
  /** True specifically when BANKRUPTCY is 'unknown' — triggers the automatic-stay box. */
  bankruptcyUnknown: boolean;
  /**
   * Per-question advisory state for inline UI. 'proceed_warning' = unknown that
   * is allowed forward but logged; 'blocking' = unknown/unanswered that blocks.
   */
  perQuestion: Partial<
    Record<keyof DisputeScreen, 'proceed_warning' | 'blocking'>
  >;
  reasons: string[];
}

/**
 * Evaluate the pre-flight dispute screen. Fails closed: if any of the three
 * questions is unanswered, the screen is NOT cleared (and is treated as
 * blocking for production purposes) — we never proceed past an unanswered
 * safety question.
 */
export function evaluateDisputeScreen(
  dispute: DisputeScreen,
): DisputeBlockResult {
  const reasons: string[] = [];
  const { tenantFiledComplaint, tenantWrittenWithholding, tenantBankruptcy } =
    dispute;

  // 'yes' answers => hard-block to attorney.
  if (tenantFiledComplaint === 'yes') {
    reasons.push(
      'Tenant has filed a complaint (court, fair housing, or code enforcement).',
    );
  }
  if (tenantWrittenWithholding === 'yes') {
    reasons.push(
      'Tenant has given written notice of withholding rent over a dispute.',
    );
  }
  if (tenantBankruptcy === 'yes') {
    reasons.push('Tenant has filed for bankruptcy.');
  }
  const anyYes = reasons.length > 0;

  // Classify each question. An answer is "settled" (won't block) when it is
  // 'no', OR it is 'unknown' on a question whose policy allows proceeding.
  // 'unanswered' (undefined) always blocks. 'unknown' on a blocking question
  // blocks. 'unknown' is NEVER treated as 'no'.
  const perQuestion: DisputeBlockResult['perQuestion'] = {};
  const keys: (keyof DisputeScreen)[] = [
    'tenantFiledComplaint',
    'tenantWrittenWithholding',
    'tenantBankruptcy',
  ];
  let anyBlockingUnknownOrUnanswered = false;
  for (const k of keys) {
    const v = dispute[k];
    if (v === 'unknown') {
      if (UNKNOWN_PROCEEDS[k]) {
        perQuestion[k] = 'proceed_warning';
      } else {
        perQuestion[k] = 'blocking';
        anyBlockingUnknownOrUnanswered = true;
      }
    } else if (v === undefined) {
      // Unanswered always blocks, regardless of the question's unknown policy.
      perQuestion[k] = 'blocking';
      anyBlockingUnknownOrUnanswered = true;
    }
  }

  const bankruptcyUnknown = tenantBankruptcy === 'unknown';

  // Cleared = no 'yes', and no question is blocking (unanswered or blocking-unknown).
  const cleared = !anyYes && !anyBlockingUnknownOrUnanswered;
  const hardBlocked = anyYes;
  const needsCheck = !anyYes && anyBlockingUnknownOrUnanswered;
  const blocked = !cleared;

  // Reason messages for blocking states (bankruptcy gets the detailed box in UI).
  if (bankruptcyUnknown) {
    reasons.push(
      "You marked tenant bankruptcy as \u201cI don\u2019t know.\u201d This must be " +
        'confirmed before serving — see the guidance below.',
    );
  }
  if (perQuestion.tenantWrittenWithholding === 'blocking' && tenantWrittenWithholding === 'unknown') {
    reasons.push(
      "You marked the written-withholding question as \u201cI don\u2019t know.\u201d " +
        'A written habitability or repair dispute can be a defense to an ' +
        'eviction — please confirm before serving.',
    );
  }
  if (needsCheck && reasons.length === 0) {
    reasons.push(
      'Please answer the remaining question(s) before continuing.',
    );
  }

  return {
    blocked,
    cleared,
    hardBlocked,
    needsCheck,
    bankruptcyUnknown,
    perQuestion,
    reasons,
  };
}

/** The user-facing handoff when the dispute screen blocks. */
export const DISPUTE_HANDOFF_MESSAGE =
  'This is past where a broker-prepared notice is the right move. Talk to a ' +
  'California licensed attorney before serving any notice.';

// --- 2. Aggregate review gate ----------------------------------------------

export interface ProduceBlocker {
  code: string;
  message: string;
}

export interface CanProduceResult {
  /** Fails closed: true only when there are zero blockers. */
  canProduce: boolean;
  blockers: ProduceBlocker[];
  /** Surfaced for the UI when the date engine could run (else undefined). */
  computedDates?: { commencementDate: string; expirationDate: string };
  /** Pass-through of payment validation errors for field-level UI mapping. */
  paymentErrors: ValidationError[];
}

/**
 * Aggregate every blocking condition into one decision. This is the gate that
 * Step 6 (Review) and the produce-PDF action consult. It calls the real
 * modules; it does not reimplement their logic.
 *
 * Fails closed: any unmet/unknown condition is a blocker. `canProduce` is true
 * only when `blockers` is empty.
 */
export function evaluateCanProduce(data: NoticeFlowData): CanProduceResult {
  const blockers: ProduceBlocker[] = [];

  // (a) Dispute screen must be cleared.
  const dispute = evaluateDisputeScreen(data.dispute);
  if (!dispute.cleared) {
    blockers.push({
      code: 'DISPUTE_NOT_CLEARED',
      message:
        dispute.reasons[0] ??
        'The pre-flight dispute screen has not been cleared.',
    });
  }

  // (b) Property + jurisdiction. A NEEDS_CONFIRMATION or BLOCK decision blocks
  //     production; only a clean NO_KNOWN_OVERLAY proceeds. (LA support that
  //     produces the Right-to-Counsel attachment is a later slice; for now an
  //     LA-ish address blocks production pending that build + confirmation.)
  if (!data.propertyAddress || data.propertyAddress.trim() === '') {
    blockers.push({
      code: 'PROPERTY_ADDRESS_MISSING',
      message: 'A property address is required.',
    });
  } else {
    const jur = detectJurisdiction({
      address: data.propertyAddress,
      city: data.propertyCity,
    });
    if (jur.decision !== 'NO_KNOWN_OVERLAY') {
      blockers.push({
        code: `JURISDICTION_${jur.decision}`,
        message: jur.message,
      });
    }
  }

  // (c) At least one tenant named.
  if (!data.tenantNames || data.tenantNames.filter((n) => n.trim()).length === 0) {
    blockers.push({
      code: 'NO_TENANT',
      message: 'At least one tenant name is required.',
    });
  }

  // (d) Rent periods present and base-rent-only confirmed.
  if (!data.rentPeriods || data.rentPeriods.length === 0) {
    blockers.push({
      code: 'NO_RENT_PERIODS',
      message: 'At least one rent period (base rent) is required.',
    });
  }
  if (data.baseRentOnlyConfirmed !== true) {
    blockers.push({
      code: 'BASE_RENT_NOT_CONFIRMED',
      message:
        'You must confirm the amount is base rent only (no late fees, ' +
        'utilities, or other charges).',
    });
  }

  // (e) Payment methods valid (delegates to the validator).
  const pay = validatePaymentMethods({ methods: data.paymentMethods });
  if (!pay.valid) {
    blockers.push({
      code: 'PAYMENT_METHODS_INVALID',
      message: 'The offered payment methods are not yet valid.',
    });
  }

  // (f) Signer + authority. Broker/other-agent signers need authority on file.
  if (!data.signerName || data.signerName.trim() === '') {
    blockers.push({
      code: 'SIGNER_MISSING',
      message: 'A signer name is required.',
    });
  }
  if (!data.signerRole) {
    blockers.push({
      code: 'SIGNER_ROLE_MISSING',
      message: 'A signer role is required.',
    });
  } else if (
    data.signerRole !== 'owner' &&
    data.authorityEvidenceOnFile !== true
  ) {
    blockers.push({
      code: 'AUTHORITY_EVIDENCE_MISSING',
      message:
        'A non-owner signer requires authority evidence (property management ' +
        'agreement or written authorization) on file.',
    });
  }

  // (g) Dates: service date + method present, and the engine can compute
  //     against a VERIFIED holiday year. A missing/unverified year blocks
  //     (the engine throws by design) rather than proceeding.
  let computedDates: CanProduceResult['computedDates'];
  if (!data.serviceDate || !data.serviceMethod) {
    blockers.push({
      code: 'SERVICE_DATE_OR_METHOD_MISSING',
      message: 'A service date and service method are required.',
    });
  } else {
    try {
      const year = Number(data.serviceDate.slice(0, 4));
      const holidays = getVerifiedHolidaySet(year);
      const period = computeCompliancePeriod({
        serviceDate: data.serviceDate,
        serviceMethod: data.serviceMethod,
        holidays,
      });
      computedDates = {
        commencementDate: period.commencementDate,
        expirationDate: period.expirationDate,
      };
    } catch (e) {
      blockers.push({
        code: 'DATES_NOT_COMPUTABLE',
        message:
          'The compliance dates cannot be computed for this service date ' +
          '(the holiday calendar for that year may not be verified yet).',
      });
    }
  }

  return {
    canProduce: blockers.length === 0,
    blockers,
    computedDates,
    paymentErrors: pay.errors,
  };
}

// --- 3. v4 aggregate review gate (payment-fields change) -------------------
//
// Parallel to evaluateCanProduce, for the v4 payment model (single payment
// branch + § 1161(2) payee trio + additive EFT), per the attorney ruling of
// 2026-06-01. The final UI cutover will switch Review to call this and the old
// gate will be removed. Until then this is additive and unused in production.
//
// Adds two v4-specific production gates on top of the shared checks:
//   - TEMPLATE_NOT_SIGNED_OFF: blocks until the attorney signs off v4 wording.
//   - BANK_5_MILE_NOT_VERIFIED: a notice listing a bank-deposit branch needs the
//     § 1161(2) 5-mile rule satisfied. Until geocoding is live, that means a
//     human within-5-miles attestation (ruling C2). Intake only warns; PRODUCTION
//     blocks here.

export interface CanProduceResultV4 {
  /** Fails closed: true only when there are zero blockers. */
  canProduce: boolean;
  blockers: ProduceBlocker[];
  computedDates?: { commencementDate: string; expirationDate: string };
  /** Payment-config field errors, for field-level UI mapping. */
  paymentErrors: PaymentBranchError[];
  /** Payment-config advisories (e.g. 5-mile not yet attested). */
  paymentWarnings: PaymentBranchWarning[];
  /** The template version this decision was made against. */
  templateVersion: string;
}

export function evaluateCanProduceV4(data: NoticeFlowData): CanProduceResultV4 {
  const blockers: ProduceBlocker[] = [];

  // (a) Dispute screen must be cleared (shared logic).
  const dispute = evaluateDisputeScreen(data.dispute);
  if (!dispute.cleared) {
    blockers.push({
      code: 'DISPUTE_NOT_CLEARED',
      message:
        dispute.reasons[0] ?? 'The pre-flight dispute screen has not been cleared.',
    });
  }

  // (b) Property + jurisdiction.
  if (!data.propertyAddress || data.propertyAddress.trim() === '') {
    blockers.push({ code: 'PROPERTY_ADDRESS_MISSING', message: 'A property address is required.' });
  } else {
    const jur = detectJurisdiction({ address: data.propertyAddress, city: data.propertyCity });
    if (jur.decision !== 'NO_KNOWN_OVERLAY') {
      blockers.push({ code: `JURISDICTION_${jur.decision}`, message: jur.message });
    }
  }

  // (c) At least one tenant named.
  if (!data.tenantNames || data.tenantNames.filter((n) => n.trim()).length === 0) {
    blockers.push({ code: 'NO_TENANT', message: 'At least one tenant name is required.' });
  }

  // (d) Rent periods present and base-rent-only confirmed.
  if (!data.rentPeriods || data.rentPeriods.length === 0) {
    blockers.push({ code: 'NO_RENT_PERIODS', message: 'At least one rent period (base rent) is required.' });
  }
  if (data.baseRentOnlyConfirmed !== true) {
    blockers.push({
      code: 'BASE_RENT_NOT_CONFIRMED',
      message:
        'You must confirm the amount is base rent only (no late fees, utilities, or other charges).',
    });
  }

  // (e) v4 payment configuration valid (§ 1161(2) payee trio + branch + EFT).
  const pay = validatePaymentBranch(data);
  if (!pay.valid) {
    blockers.push({
      code: 'PAYMENT_CONFIG_INVALID',
      message: 'The payment configuration is not yet complete or valid.',
    });
  }

  // (e2) 5-mile production gate for the bank-deposit branch (ruling C2).
  if (data.paymentBranch === 'bank_deposit') {
    if (GEOCODING_LIVE) {
      // When geocoding lands, verify by distance here instead of attestation.
      // (Left intentionally to the geocode-dependency slice.)
    } else if (data.bankBranchWithinFiveMilesAttested !== true) {
      blockers.push({
        code: 'BANK_5_MILE_NOT_VERIFIED',
        message:
          'A notice listing a bank-deposit branch requires confirmation that the ' +
          'branch is within five miles of the rental property (Cal. Code Civ. Proc. ' +
          '§ 1161(2)). Confirm this, or choose a different payment method.',
      });
    }
  }

  // (f) Signer + authority (the signer may differ from the § 1161(2) payee).
  if (!data.signerName || data.signerName.trim() === '') {
    blockers.push({ code: 'SIGNER_MISSING', message: 'A signer name is required.' });
  }
  if (!data.signerRole) {
    blockers.push({ code: 'SIGNER_ROLE_MISSING', message: 'A signer role is required.' });
  } else if (data.signerRole !== 'owner' && data.authorityEvidenceOnFile !== true) {
    blockers.push({
      code: 'AUTHORITY_EVIDENCE_MISSING',
      message:
        'A non-owner signer requires authority evidence (property management ' +
        'agreement or written authorization) on file.',
    });
  }

  // (g) Dates: service date + method present, computable against a verified year.
  let computedDates: CanProduceResultV4['computedDates'];
  if (!data.serviceDate || !data.serviceMethod) {
    blockers.push({
      code: 'SERVICE_DATE_OR_METHOD_MISSING',
      message: 'A service date and service method are required.',
    });
  } else {
    try {
      const year = Number(data.serviceDate.slice(0, 4));
      const holidays = getVerifiedHolidaySet(year);
      const period = computeCompliancePeriod({
        serviceDate: data.serviceDate,
        serviceMethod: data.serviceMethod,
        holidays,
      });
      computedDates = { commencementDate: period.commencementDate, expirationDate: period.expirationDate };
    } catch {
      blockers.push({
        code: 'DATES_NOT_COMPUTABLE',
        message:
          'The compliance dates cannot be computed for this service date ' +
          '(the holiday calendar for that year may not be verified yet).',
      });
    }
  }

  // (h) v4 wording sign-off gate — fails closed until the attorney signs off.
  if (!V4_WORDING_SIGNED_OFF) {
    blockers.push({
      code: 'TEMPLATE_NOT_SIGNED_OFF',
      message:
        'This notice version is pending attorney sign-off of the updated ' +
        'payment-section wording and cannot be produced yet.',
    });
  }

  return {
    canProduce: blockers.length === 0,
    blockers,
    computedDates,
    paymentErrors: pay.errors,
    paymentWarnings: pay.warnings,
    templateVersion: NOTICE_TEMPLATE_VERSION,
  };
}
