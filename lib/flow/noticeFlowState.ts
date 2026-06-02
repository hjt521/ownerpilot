/**
 * Flow state model for the 3-day pay-or-quit field-collection workflow.
 *
 * This is the HEADLESS core: a typed state object plus the orchestration logic
 * that decides, at each point, whether the user may proceed and whether a
 * notice may be produced. It contains NO UI — the React layer renders this
 * state and feeds user input back in.
 *
 * DESIGN PRINCIPLES (consistent with the rest of the codebase):
 *  - Fails closed: production is blocked unless every condition is
 *    affirmatively satisfied. Missing/unknown => blocked, never proceed.
 *  - Orchestrates, does not reimplement: the legal logic lives in the tested
 *    modules (validatePaymentMethods, detectJurisdiction, computeCompliancePeriod);
 *    this core sequences them and aggregates their verdicts.
 *
 * Not legal advice; product workflow logic.
 */

import type { PaymentMethod } from '../payments/validatePaymentMethods';
import type { ServiceMethod } from '../dates/computeCompliancePeriod';

/** The ordered steps of the flow. Pre-flight precedes Step 1. */
export enum FlowStep {
  PreflightDispute = 'preflight_dispute',
  PropertyIdentification = 'step1_property',
  Tenants = 'step2_tenants',
  AmountOwed = 'step3_amount',
  PaymentInstructions = 'step4_payment',
  LandlordAgentInfo = 'step5_landlord',
  Review = 'step6_review',
  ServiceInstructions = 'step7_service',
}

/** A single rent period owed (base rent only). */
export interface RentPeriod {
  periodStartDate: string; // 'YYYY-MM-DD'
  periodEndDate: string; // 'YYYY-MM-DD'
  amount: number;
}

/**
 * A tri-state answer for the pre-flight dispute questions. `unknown` ("I don't
 * know") is a FIRST-CLASS state, distinct from `no`. It is NEVER treated as
 * `no`: an unchecked unknown must not flow through as a clean answer, because
 * (for bankruptcy especially) proceeding on an unchecked unknown can mean
 * serving into an active automatic stay. `unknown` blocks clearing, same as an
 * unanswered question.
 */
export type DisputeAnswer = 'yes' | 'no' | 'unknown';

/** The three pre-flight active-dispute questions (chat HARD RULES, applied to docs). */
export interface DisputeScreen {
  /** Tenant filed any complaint (court, fair housing agency, code enforcement)? */
  tenantFiledComplaint?: DisputeAnswer;
  /** Tenant gave WRITTEN notice of withholding for habitability/repairs/other dispute? */
  tenantWrittenWithholding?: DisputeAnswer;
  /** Tenant filed for bankruptcy? */
  tenantBankruptcy?: DisputeAnswer;
}

export type SignerRole =
  | 'owner'
  | 'authorized_agent_broker'
  | 'other_authorized_agent';

/**
 * v4 (CCP § 1161(2) payment-fields change, per attorney ruling 2026-06-01).
 *
 * The landlord selects ONE payment configuration (single-choice model approved
 * as a product simplification; not legally required). Each maps to a § 1161(2)
 * alternative:
 *   - 'mail_only'           — pay by mail to the payee street address.
 *   - 'in_person_and_mail'  — pay in person (days/hours stated) OR by mail.
 *   - 'bank_deposit'        — deposit at a financial institution (within 5 mi),
 *                             valid for the § 1947.3 floor ONLY when a PAPER
 *                             instrument (check / money order / cashier's check)
 *                             is deposited (a cash deposit is still cash).
 * EFT is an ADD-ON only (never a branch), and only when previously established.
 * There is intentionally no cash branch (§ 1947.3 cash-only is a separate form).
 */
export type PaymentBranch = 'mail_only' | 'in_person_and_mail' | 'bank_deposit';

/**
 * The § 1161(2) payee identity — the person to whom rent is paid. Distinct from
 * the signer (a managing agent may sign while rent is paid to the owner). The
 * statute lists name + telephone + address as a unitary trio; all are required.
 */
export interface LandlordContact {
  name?: string;
  /** Required; validated as a US phone (10 digits; formatted variants accepted). */
  phone?: string;
  /** Required; the street address where rent is paid / mailed. */
  streetAddress?: string;
}

/** Everything the flow collects. All optional — the flow fills it incrementally. */
export interface NoticeFlowData {
  dispute: DisputeScreen;

  // Step 1 — property
  propertyAddress?: string;
  propertyCity?: string;
  propertyCounty?: string;

  // Step 2 — tenants
  tenantNames: string[];

  // Step 3 — amount
  rentPeriods: RentPeriod[];
  baseRentOnlyConfirmed?: boolean;

  // Step 4 — payment (legacy multi-method model; superseded by the v4 branch
  // model below. Kept until the Slice-2 gate/renderer cutover removes it.)
  paymentMethods: PaymentMethod[];

  // Step 4 — payment (v4 model, per attorney ruling 2026-06-01)
  /** § 1161(2) payee: name + telephone + street address (all required). */
  landlordContact?: LandlordContact;
  /** The single selected payment configuration. */
  paymentBranch?: PaymentBranch;
  // 'in_person_and_mail' branch:
  personalDeliveryDays?: string; // e.g. 'Monday through Friday'
  personalDeliveryHours?: string; // e.g. '9:00 a.m. to 5:00 p.m.'
  // 'bank_deposit' branch:
  bankName?: string;
  bankBranchAddress?: string;
  bankAccountNumber?: string;
  /**
   * Decision 1: landlord attests the tenant deposits a PAPER instrument
   * (check / money order / cashier's check), so the branch is non-cash /
   * non-EFT and satisfies the § 1947.3 floor. Required for a valid bank branch.
   */
  bankDepositPaperInstrumentConfirmed?: boolean;
  /**
   * C2: human attestation the branch is within five miles of the premises.
   * Required to PRODUCE a notice listing a bank branch until geocoding is live
   * (the produce gate enforces this; intake only warns).
   */
  bankBranchWithinFiveMilesAttested?: boolean;
  // Additive EFT election (never primary):
  eftElectionAvailable?: boolean;
  /** Required true when eftElectionAvailable: § 1161(2) allows EFT only if previously established. */
  eftPreviouslyEstablishedConfirmed?: boolean;

  // Step 5 — landlord/agent
  signerName?: string;
  signerRole?: SignerRole;
  /** For broker/other-agent signers, evidence of authority must be on file. */
  authorityEvidenceOnFile?: boolean;

  // Date inputs (drive the date engine at production time)
  serviceDate?: string; // 'YYYY-MM-DD'
  serviceMethod?: ServiceMethod;
}

export interface NoticeFlowState {
  step: FlowStep;
  data: NoticeFlowData;
}

/** Construct an empty flow state at the pre-flight step. */
export function createFlowState(): NoticeFlowState {
  return {
    step: FlowStep.PreflightDispute,
    data: {
      dispute: {},
      tenantNames: [''],
      rentPeriods: [{ periodStartDate: '', periodEndDate: '', amount: 0 }],
      paymentMethods: [],
    },
  };
}
