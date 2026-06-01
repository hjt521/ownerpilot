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

// --- 1. Dispute hard-block -------------------------------------------------

export interface DisputeBlockResult {
  /** True if any dispute condition is present OR any answer is still missing. */
  blocked: boolean;
  /** True only when all three questions are answered AND all are 'no'. */
  cleared: boolean;
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

  const allAnswered =
    tenantFiledComplaint !== undefined &&
    tenantWrittenWithholding !== undefined &&
    tenantBankruptcy !== undefined;

  if (tenantFiledComplaint === true) {
    reasons.push(
      'Tenant has filed a complaint (court, fair housing, or code enforcement).',
    );
  }
  if (tenantWrittenWithholding === true) {
    reasons.push(
      'Tenant has given written notice of withholding rent over a dispute.',
    );
  }
  if (tenantBankruptcy === true) {
    reasons.push('Tenant has filed for bankruptcy.');
  }

  const anyYes = reasons.length > 0;
  const cleared = allAnswered && !anyYes;
  // Blocked if any 'yes', OR if not all answered (fail closed).
  const blocked = anyYes || !allAnswered;

  if (!allAnswered && !anyYes) {
    reasons.push('Pre-flight dispute questions are not all answered.');
  }

  return { blocked, cleared, reasons };
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
