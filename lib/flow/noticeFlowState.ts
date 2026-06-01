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

/** The three pre-flight active-dispute questions (chat HARD RULES, applied to docs). */
export interface DisputeScreen {
  /** Tenant filed any complaint (court, fair housing agency, code enforcement)? */
  tenantFiledComplaint?: boolean;
  /** Tenant gave WRITTEN notice of withholding for habitability/repairs/other dispute? */
  tenantWrittenWithholding?: boolean;
  /** Tenant filed for bankruptcy? */
  tenantBankruptcy?: boolean;
}

export type SignerRole =
  | 'owner'
  | 'authorized_agent_broker'
  | 'other_authorized_agent';

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

  // Step 4 — payment
  paymentMethods: PaymentMethod[];

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
      tenantNames: [],
      rentPeriods: [],
      paymentMethods: [],
    },
  };
}
