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
import { computeCompliancePeriod, type ServiceMethod } from '../dates/computeCompliancePeriod';
import {
  validatePaymentBranch,
  looksLikePoBox,
  isUsPhone,
  PaymentBranchError,
  PaymentBranchWarning,
} from '../payments/validatePaymentBranch';
// Defect #2: the v4 produce gate fails closed if the DERIVED § 1161(2) payee
// name (composed from the Step-3 identity / non-landlord override) is empty.
// derivePayeeName is the single composition site; importing it here keeps the
// gate from re-deriving. (flow → produce dependency; renderNotice does not
// import gates, so there is no cycle.)
import { derivePayeeName } from '../produce/renderNotice';
import {
  NOTICE_TEMPLATE_VERSION,
  V4_WORDING_SIGNED_OFF,
  GEOCODING_LIVE,
} from './templateVersion';
import { validateSigningDate, getSuccessfulAttempt, deriveComplianceInputs } from './escalation';

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
  /**
   * True when any answer is 'yes' or 'unknown': the routing copy shows and the
   * user must pass the override modal to produce. Independent of `blocked`.
   */
  flagged: boolean;
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

  // C5 soft mode: any 'yes' or 'unknown' flags the screen (routing copy shows,
  // override modal required to produce) but does NOT hard-block. The exception
  // is an UNANSWERED question, which still blocks in both modes - we can't route
  // or produce on an unanswered safety question.
  const anyUnknown =
    tenantFiledComplaint === 'unknown' ||
    tenantWrittenWithholding === 'unknown' ||
    tenantBankruptcy === 'unknown';
  const anyUnanswered =
    tenantFiledComplaint === undefined ||
    tenantWrittenWithholding === undefined ||
    tenantBankruptcy === undefined;
  // Soft-recommend is unconditional (det. 2026-06-15, flag retired): any
  // 'yes'/'unknown' FLAGS the screen (routing copy + override modal) but does
  // not block. Only an UNANSWERED question blocks - we never route or produce
  // on an unanswered safety question.
  const flagged = anyYes || anyUnknown;
  const cleared = !anyUnanswered;
  const needsCheck = anyUnanswered;
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
    needsCheck,
    bankruptcyUnknown,
    perQuestion,
    reasons,
    flagged,
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

/**
 * § 1161(2) payee-trio + in-person deliverability blockers for the produce gate.
 *
 * Keeps the branch-INDEPENDENT checks that used to live in validatePaymentBranch
 * (payee override name; telephone present + US format; street address present),
 * and runs the C1 P.O.-box gate whenever in-person is among the selected payment
 * methods (c1_pobox_scope_multiselect_broker_determination_2026-06-15 §1: the
 * gate follows the in-person leg, not the historical in_person_and_mail branch).
 * Method-level validity is handled separately by validatePaymentMethods.
 */
function validatePayeeTrioAndDelivery(
  data: NoticeFlowData,
): { code: string; message: string }[] {
  const out: { code: string; message: string }[] = [];
  const contact = data.landlordContact ?? {};
  const blank = (s: string | undefined): boolean => (s ?? '').trim() === '';

  if (data.payeeIsNonLandlord === true && blank(data.payeeOverrideName)) {
    out.push({
      code: 'PAYEE_OVERRIDE_NAME_REQUIRED',
      message: 'Enter the name of the payee who receives rent.',
    });
  }
  if (blank(contact.phone)) {
    out.push({
      code: 'CONTACT_PHONE_REQUIRED',
      message:
        'A telephone number for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  } else if (!isUsPhone(contact.phone)) {
    out.push({
      code: 'CONTACT_PHONE_FORMAT',
      message: 'Enter a valid US telephone number (10 digits).',
    });
  }
  if (blank(contact.streetAddress)) {
    out.push({
      code: 'CONTACT_ADDRESS_REQUIRED',
      message:
        'A street address for the person to whom rent is paid is required ' +
        '(Cal. Code Civ. Proc. § 1161(2)).',
    });
  }
  // C1 P.O.-box gate: fires whenever the in-person leg is offered.
  const offersInPerson = (data.paymentMethods ?? []).some(
    (m) => m.kind === 'in_person',
  );
  if (offersInPerson && looksLikePoBox(contact.streetAddress)) {
    out.push({
      code: 'PERSONAL_DELIVERY_POBOX',
      message:
        'A P.O. box cannot accept personal delivery. Enter a street address ' +
        'where payment can be delivered in person.',
    });
  }
  return out;
}

export function evaluateCanProduce(data: NoticeFlowData): CanProduceResult {
  const blockers: ProduceBlocker[] = [];

  // (a) Dispute screen must be cleared. A flagged screen is clearable once the
  // override has been logged (the user passed the modal).
  const dispute = evaluateDisputeScreen(data.dispute);
  const disputeProducible =
    dispute.cleared && (!dispute.flagged || !!data.safetyCheckOverride);
  if (!disputeProducible) {
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
  if (data.produceAttestationConfirmed !== true) {
    blockers.push({
      code: 'PRODUCE_ATTESTATION_MISSING',
      message:
        'Confirm the produce-gate attestation below (base rent only; names correct; signer authorized) before producing.',
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
  if (!data.signerCapacity) {
    blockers.push({
      code: 'SIGNER_ROLE_MISSING',
      message: 'A signer role is required.',
    });
  } else if (
    data.signerCapacity !== 'owner' &&
    data.signerCapacity !== 'officer_member_trustee' &&
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
  if (!data.serviceDate) {
    blockers.push({
      code: 'SERVICE_DATE_OR_METHOD_MISSING',
      message: 'A service date is required.',
    });
  } else {
    try {
      const year = Number(data.serviceDate.slice(0, 4));
      const holidays = getVerifiedHolidaySet(year);
      // Face deadline is method-independent (engine invariant; broker
      // determination 2026-06-12). Method is captured at serve time.
      const period = computeCompliancePeriod({
        serviceDate: data.serviceDate,
        serviceMethod: data.serviceMethod ?? 'personal',
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
  /** Payment-config field errors, for field-level UI mapping (payee trio +
   *  delivery + method-level validity). */
  paymentErrors: { code: string; message: string }[];
  /** Payment-config advisories. Empty since C7a (the 5-mile item is now a
   *  hard produce blocker, not a soft warning). */
  paymentWarnings: { code: string; message: string }[];
  /** The template version this decision was made against. */
  templateVersion: string;
}

export function evaluateCanProduceV4(data: NoticeFlowData): CanProduceResultV4 {
  const blockers: ProduceBlocker[] = [];

  // (a) Dispute screen must be cleared (shared logic). Flagged screen clearable
  // once the override is logged.
  const dispute = evaluateDisputeScreen(data.dispute);
  const disputeProducible =
    dispute.cleared && (!dispute.flagged || !!data.safetyCheckOverride);
  if (!disputeProducible) {
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
  if (data.produceAttestationConfirmed !== true) {
    blockers.push({
      code: 'PRODUCE_ATTESTATION_MISSING',
      message:
        'Confirm the produce-gate attestation below (base rent only; names correct; signer authorized) before producing.',
    });
  }

  // (e) § 1161(2) payee trio (name/phone/address) + C1 P.O.-box deliverability.
  // Method-level field rules (bank fields, EFT, § 1947.3 floor) are enforced by
  // validatePaymentMethods at gate (e0) above; the bank-deposit paper-instrument
  // requirement (Decision 1) is enforced at gate (e2) below. P.O.-box scope per
  // c1_pobox_scope_multiselect_broker_determination_2026-06-15.
  for (const b of validatePayeeTrioAndDelivery(data)) blockers.push(b);

  // (e2) Bank-deposit production gates (Decision 1 paper instrument + C2 5-mile).
  if ((data.paymentMethods ?? []).some((m) => m.kind === 'bank_deposit')) {
    // Decision 1: a bank deposit satisfies the § 1947.3 floor ONLY by a paper
    // instrument; a cash deposit is still cash. Enforced here at the produce
    // gate (the renderer also fails closed). Wording locked from the
    // v4_payment_fields ruling (2026-06-01) via validatePaymentBranch.
    if (data.bankDepositPaperInstrumentConfirmed !== true) {
      blockers.push({
        code: 'BANK_PAPER_INSTRUMENT_REQUIRED',
        message:
          'Bank deposit is only a valid method when the tenant pays by a ' +
          'paper check, money order, or cashier’s check (a cash deposit ' +
          'is still cash under Civil Code § 1947.3). Confirm a paper ' +
          'instrument, or choose a different method.',
      });
    }
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

  // (e3) Derived § 1161(2) payee name must resolve (Defect #2). The name is
  //      composed from the Step-3 landlord identity (individual owner line /
  //      entity legal name) or, when rent is paid to a non-landlord, the
  //      "[payee], as agent for [landlord]" override. An individual identity
  //      with no usable name — or an override missing its payee name — would
  //      leave the face's "Payable to:" line empty. Fail closed here so
  //      renderNotice never has to.
  if (derivePayeeName(data).name.trim() === '') {
    blockers.push({
      code: 'PAYEE_NAME_UNRESOLVED',
      message:
        'The name to receive payment could not be determined. Confirm the ' +
        'landlord on Step 3 (or, if rent is paid to someone else, that payee\u2019s name).',
    });
  }

  // (f) Signer + authority (the signer may differ from the § 1161(2) payee).
  if (!data.signerName || data.signerName.trim() === '') {
    blockers.push({ code: 'SIGNER_MISSING', message: 'A signer name is required.' });
  }
  if (!data.signerCapacity) {
    blockers.push({ code: 'SIGNER_ROLE_MISSING', message: 'A signer role is required.' });
  } else if (
    data.signerCapacity !== 'owner' &&
    data.signerCapacity !== 'officer_member_trustee' &&
    data.authorityEvidenceOnFile !== true
  ) {
    blockers.push({
      code: 'AUTHORITY_EVIDENCE_MISSING',
      message:
        'A non-owner signer requires authority evidence (property management ' +
        'agreement or written authorization) on file.',
    });
  }

  // (f2) Entity-landlord gate — TYPE-BASED (Stage 1 / Defect #1, corporate-landlord
  //      ruling Round 3 2026-06-05). REPLACES the interim suffix-only gate (now
  //      retired): the landlord type is captured explicitly on Step 3, so this keys
  //      on landlordIdentity.type rather than a name-suffix heuristic — eliminating
  //      the false positives on individual co-owners that the Round 2 broadened gate
  //      (§3.2-§3.4, SHELVED) produced. Two blocks:
  //        1. type not yet confirmed → cannot produce until the user chooses.
  //        2. entity selected → gated until the Defect #3 renderer packet (entity
  //           signature block + new locked prose) is countersigned. The approved
  //           "coming soon / consult counsel" copy (Round 1 §5.2 Option A) renders
  //           on Step 3 itself; this is the production backstop. The blocker message
  //           below is operator copy, concise; the approved long-form is on Step 3.
  //
  //      TODO(attorney-ruling-2026-06-05): when the audit-sink persistence slice
  //      ships (Part E forward trigger #1), log each fire of the entity block with
  //      { landlordType, signerName, signerCapacity, timestamp }. Not done here: no
  //      audit sink exists yet, and this is a pure gate re-evaluated on every render
  //      (the wrong layer for discrete-event logging).
  // (f2) Landlord-type gate. The landlord type must be confirmed on Step 3.
  //      Entity production was previously blocked by ENTITY_LANDLORD_NOT_SUPPORTED;
  //      that block is LIFTED per the Defect #3 entity-signature countersign
  //      (2026-06-05), which closed the corporate-landlord track. Entity notices
  //      now produce (individual and entity alike), subject to (f3).
  //
  //      TODO(attorney-ruling-2026-06-05): when the audit-sink persistence slice
  //      ships (Part E forward trigger #1), log entity-landlord productions with
  //      { landlordType, signerName, signerCapacity, timestamp }. Not done here:
  //      no audit sink exists yet.
  if (!data.landlordIdentity || data.landlordIdentityConfirmed !== true) {
    blockers.push({
      code: 'LANDLORD_TYPE_UNCONFIRMED',
      message: 'Select whether the landlord is an individual or an entity.',
    });
  } else if (
    data.landlordIdentity.type === 'entity' &&
    (!data.signerTitle || data.signerTitle.trim() === '')
  ) {
    // (f3) signerTitleRequired (Defect #3 countersign §1, LOCKED): an entity
    //      notice composes "By: [name], [title]" — a blank title would leave a
    //      trailing-comma blank on the face. Intake guards this; the gate
    //      re-checks so canProduce === true implies renderNotice won't throw.
    blockers.push({
      code: 'SIGNER_TITLE_REQUIRED',
      message: "Enter the signer's title (Managing Member, President, Trustee, etc.).",
    });
  }

  // (g) Dates (attorney B1): once a service attempt has SUCCEEDED, the 3-day
  //     clock counts from that attempt — mailingDate for substituted /
  //     posting-and-mailing, attemptDate for personal (deriveComplianceInputs).
  //     Before any successful attempt, fall back to the intended single-shot
  //     serviceDate/serviceMethod (the pre-serve estimate shown at Review).
  //     NO MATH CHANGE — same engine, just fed from the successful attempt.
  //     Fails closed: a SUCCESS missing its required mailing date blocks here
  //     rather than silently reverting to the pre-serve estimate.
  let computedDates: CanProduceResultV4['computedDates'];
  let effServiceDate: string | undefined;
  let effServiceMethod: ServiceMethod | undefined;
  const successfulAttempt = getSuccessfulAttempt(data);
  if (successfulAttempt) {
    const derived = deriveComplianceInputs(data);
    if (!derived) {
      blockers.push({
        code: 'SERVICE_ATTEMPT_INCOMPLETE',
        message:
          'The successful service attempt is missing the mailing date required ' +
          'for substituted or posting-and-mailing service.',
      });
    } else {
      effServiceDate = derived.serviceDate;
      effServiceMethod = derived.serviceMethod;
    }
  } else {
    effServiceDate = data.serviceDate;
    effServiceMethod = data.serviceMethod;
    if (!effServiceDate) {
      blockers.push({
        code: 'SERVICE_DATE_OR_METHOD_MISSING',
        message: 'A service date is required.',
      });
    }
  }
  if (effServiceDate) {
    try {
      const year = Number(effServiceDate.slice(0, 4));
      const holidays = getVerifiedHolidaySet(year);
      const period = computeCompliancePeriod({
        serviceDate: effServiceDate,
        serviceMethod: effServiceMethod ?? 'personal',
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

  // (g2) Signing (execution) date present, and not after the service date
  //      (attorney ruling B1, 2026-06-02). The face "Dated:" line reads this
  //      value, so production must fail closed when it is missing or invalid.
  //      The >30-day-before case is a soft warning in the UI, not a blocker.
  if (!data.signingDate) {
    blockers.push({
      code: 'SIGNING_DATE_MISSING',
      message: 'A signing (execution) date for the notice is required.',
    });
  } else {
    const sd = validateSigningDate(data.signingDate, data.serviceDate);
    if (!sd.ok) {
      blockers.push({
        code: 'SIGNING_AFTER_SERVICE',
        message:
          sd.error ??
          'The signing date cannot be after the first service date.',
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

  // C7a: payment field errors = payee-trio/delivery blockers + method-level
  // validator errors. No soft warnings (5-mile is a hard blocker now).
  const paymentFieldErrors = [
    ...validatePayeeTrioAndDelivery(data),
    ...validatePaymentMethods({ methods: data.paymentMethods ?? [] }).errors.map(
      (e) => ({ code: e.code, message: e.message }),
    ),
  ];
  return {
    canProduce: blockers.length === 0,
    blockers,
    computedDates,
    paymentErrors: paymentFieldErrors,
    paymentWarnings: [],
    templateVersion: NOTICE_TEMPLATE_VERSION,
  };
}
