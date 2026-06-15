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
  // Landlord identity (who the landlord is) is captured BEFORE payment,
  // because the (S) 1161(2) payee name is derived from it (derivePayeeName).
  // The signer/service questions stay on LandlordAgentInfo, later in the flow.
  LandlordIdentity = 'step3_landlord_identity',
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

// --- Defect #1 (corporate-landlord ruling 2026-06-04/05): landlord identity ---
// Step 3 two-stage capture. `landlordIdentity` is the single source of truth for
// "who is the landlord." `signerCapacity` is the canonical capacity field with
// branch-specific options. (Defect #3, countersigned 2026-06-05, removed the
// legacy derived `signerRole`: the individual face now derives its role label
// from signerCapacity directly, and the entity face renders the entity signature
// block. Entity production is unblocked once the gate lifts.)

export type EntityType = 'llc' | 'corporation' | 'lp' | 'gp' | 'trust' | 'other';

export type LlcManagementType = 'member-managed' | 'manager-managed' | 'not-sure';

export type LandlordIdentity =
  | { type: 'individual'; names: string[] }
  | {
      type: 'entity';
      entityLegalName: string;
      entityType: EntityType;
      /** FIX 1: California LLC management structure. Member-managed: any
       *  member may bind the LLC. Manager-managed: only designated managers
       *  may. Drives the signer-authority warning; required to advance when
       *  entityType === 'llc'. Unset for non-LLC entity types. */
      managementType?: LlcManagementType;
    };

export type SignerCapacity =
  | 'owner' // individual branch: the natural-person owner
  | 'officer_member_trustee' // entity branch: insider (managing member / officer / trustee)
  | 'broker_or_manager' // both branches: licensed broker / property manager
  | 'authorized_agent'; // both branches: other authorized agent

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
  /**
   * @deprecated (Defect #2, 2026-06-05) No longer the source of the § 1161(2)
   * "Payable to:" name. The payee name is now DERIVED from `landlordIdentity`
   * (composed owner line / entity legal name) or, when the payee is a
   * non-landlord, from `payeeOverrideName` — see derivePayeeName() in
   * lib/produce/renderNotice.ts. Retained as an optional field so existing
   * reads/snapshots don't break; removed once the Step-4 UI cutover lands. Do
   * not author new reads against this for the face.
   */
  name?: string;
  /** Required; validated as a US phone (10 digits; formatted variants accepted). */
  phone?: string;
  /** Required; the street address where rent is paid / mailed. */
  streetAddress?: string;
}

/** Everything the flow collects. All optional — the flow fills it incrementally. */
export interface NoticeFlowData {
  dispute: DisputeScreen;
  /**
   * C5 (det. 2026-06-14, soft mode): audit of the Step 1 safety-check answers
   * as last confirmed by the user. [SHOULD FIX]
   */
  safetyCheckAnswers?: {
    tenantFiledComplaint?: DisputeAnswer;
    tenantWrittenWithholding?: DisputeAnswer;
    tenantBankruptcy?: DisputeAnswer;
    acceptedAt?: string;
  };
  /**
   * C5 (det. 2026-06-14, soft mode): logged when the user proceeds DESPITE a
   * flagged answer, via the confirmation modal. [MUST FIX] audit trail. Absent
   * means no override was needed or none accepted. In soft mode, a flagged
   * screen is production-clearable only when this is present.
   */
  safetyCheckOverride?: {
    /**
     * All flagged answers the user overrode (JT 2026-06-14: array, not a single
     * question - fuller audit of exactly what was flagged at override time).
     */
    flaggedAnswers: { question: keyof DisputeScreen; answer: DisputeAnswer }[];
    acceptedAt: string;
    userAgent?: string;
    /** Not available client-side; reserved for a server-side enhancement. */
    ipHash?: string;
    /** Which version of the override-modal copy the user saw (det. 2026-06-15). */
    modalCopyVersion?: string;
    /** True when the bankruptcy-specific enhanced modal was the one shown. */
    enhancedModalShown?: boolean;
  };

  // Step 1 — property
  propertyAddress?: string;
  /** Optional unit/apt/suite designation (det. 2026-06-14). Composed onto the
   *  property line at display via formatPropertyLine; not statutorily required
   *  but material to the property description for multi-unit buildings. */
  propertyUnit?: string;
  propertyCity?: string;
  propertyCounty?: string;

  // Step 2 — tenants
  tenantNames: string[];

  // Step 3 — amount
  rentPeriods: RentPeriod[];
  baseRentOnlyConfirmed?: boolean;
  /** C6 (det. 2026-06-14): combined produce-gate attestation. Replaces
   *  the Step 2 base-rent checkbox as the producibility gate. Covers base
   *  rent only + names correct + signer authorized. */
  produceAttestationConfirmed?: boolean;
  /** ISO timestamp when the produce attestation was accepted (audit). */
  produceAttestationAcceptedAt?: string;

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
  /**
   * UI-only: set true when the landlord dismisses the bank account-number
   * interstitial (Part E). Sticky for the notice — the callout shows once at
   * first bank-details entry and, once dismissed, does NOT reappear on field
   * edits or on leaving/returning to Step 4. A new notice (fresh flow state)
   * shows it again. Inert w.r.t. legal logic: not gated, not snapshotted, not
   * part of staleness.
   */
  bankInterstitialDismissed?: boolean;

  // Step 4 — non-landlord payee override (Defect #2, ruling 2026-06-05 §1/§3).
  // Default (false/undefined): the § 1161(2) payee name is the landlord, derived
  // from landlordIdentity. When true, rent is paid to someone other than the
  // landlord (e.g. a property manager); the face renders
  // "[payeeOverrideName], as agent for [landlord identity]". The "as agent for"
  // phrasing and owner-line joiners are build-locked face constants in
  // renderNotice.ts; composition happens only there (see derivePayeeName).
  /** True when rent is paid to a non-landlord payee (the override checkbox). */
  payeeIsNonLandlord?: boolean;
  /** Required when payeeIsNonLandlord: the non-landlord payee's name. */
  payeeOverrideName?: string;

  // Step 3 — landlord identity + signer (Defect #1, ruling §1.1)
  /** Single source of truth for who the landlord is. Set via the Stage-1 toggle. */
  landlordIdentity?: LandlordIdentity;
  /** True once the user has affirmatively chosen individual vs entity. Gates
   *  production: a notice cannot produce until the landlord type is confirmed. */
  landlordIdentityConfirmed?: boolean;
  signerName?: string;
  /** Canonical signer capacity. */
  signerCapacity?: SignerCapacity;
  /** Required when signerCapacity = 'officer_member_trustee' (entity insider),
   *  and for any entity landlord (the "By: [name], [title]" face line). */
  signerTitle?: string;
  /** For broker/other-agent signers, evidence of authority must be on file. */
  authorityEvidenceOnFile?: boolean;
  /** C7b (det. 2026-06-14, Step 3 item 3): the landlord's mailing/correspondence
   *  address. Plain intake; not a face constant and not gated. Used as the
   *  default source for the payee street-address prefill on the payment step
   *  (non-destructive: it only seeds an empty payee address, never overwrites). */
  mailingAddress?: string;

  // --- Notice execution + service dates (attorney ruling B1, 2026-06-02) ----
  // BINDING: the signing date (the "Dated:" line) and the service date(s) are
  // two distinct legal facts and must be two distinct fields. The face carries
  // the signingDate (invariant after signing); the proof of service carries the
  // service attempt(s); the 3-day clock runs from the day after the SUCCESSFUL
  // service. See deriveComplianceInputs() in lib/flow/escalation.ts.

  /** The "Dated:" line on the notice face (when the landlord executed it).
   *  Invariant after signing; never changes on re-serve. */
  signingDate?: string; // 'YYYY-MM-DD'
  /** Optional: where the notice was signed. Not currently shown on the face. */
  signingAddress?: string;

  // LEGACY single-shot date inputs. Retained so existing gates/renderer/flow
  // keep working until the re-serve UI slice cuts over to deriving these from
  // the successful service attempt. NOT removed in this slice (would break
  // signed-off code). deriveComplianceInputs() computes the effective values
  // from serviceAttempts when present.
  serviceDate?: string; // 'YYYY-MM-DD'
  serviceMethod?: ServiceMethod;

  // --- A2 escalation model (attorney ruling B1, 2026-06-02) -----------------
  // Additive and persistence-agnostic: a later persistence slice can save/load
  // these unchanged.

  /**
   * Reasonable-diligence record of service attempts. Per attorney B1, failed
   * attempts establish diligence for escalating to the next method; they do
   * NOT affect the date computation and never alter the face. The proof of
   * service lists failed attempts as the diligence narrative and the SUCCESS
   * entry as the actual service event.
   */
  serviceAttempts?: ServiceAttempt[];
  /** Computed: id of the SUCCESS entry in serviceAttempts, if any. */
  successfulServiceAttemptId?: string;
  /**
   * Detection basis for staleness: a snapshot of the face-determining fields
   * captured when the notice was produced. Compared against current data by
   * evaluateStaleness (lib/flow/escalation.ts). Service date/method are
   * intentionally excluded — re-serving on a new date is the normal path.
   */
  productionSnapshot?: ProductionSnapshot;
  /**
   * Verdict (attorney B1): null/undefined = the produced notice is still valid;
   * a non-null reason means the notice's face has drifted and a NEW notice must
   * be generated (new signingDate, new serviceAttempts[], no carry-over of
   * prior failed attempts). Derived from evaluateStaleness.
   */
  stalenessReason?: StalenessReason | null;
}

/** Outcome of a single service attempt (attorney B1 enum). */
export type ServiceAttemptOutcome = 'SUCCESS' | 'FAILED';

/**
 * Identity of the person who attempted service. A valid server must be 18+ and
 * must NOT be a party to the notice (CCP service requirements). Captured for
 * the proof of service.
 */
export interface ServiceServerIdentity {
  name: string;
  address: string;
  /** Must be true for a valid server. */
  age18Plus: boolean;
  /** Must be false — a party to the notice may not serve it. */
  partyToNotice: boolean;
}

/**
 * A single recorded service attempt (attorney B1 binding shape).
 * NOTE: `method` keeps the existing engine ServiceMethod enum
 * ('personal' | 'substituted' | 'post_and_mail'); the attorney's ruling uses
 * the uppercase labels PERSONAL / SUBSTITUTED / POSTING_AND_MAILING, which map
 * 1:1. Keeping the lowercase enum avoids a breaking rename across the date
 * engine (flagged for her as a representation detail, not legal substance).
 */
export interface ServiceAttempt {
  /** Stable id (so successfulServiceAttemptId can reference it). */
  id?: string;
  /** Date the attempt was made, 'YYYY-MM-DD'. */
  attemptDate: string;
  method: ServiceMethod;
  outcome: ServiceAttemptOutcome;
  /** Reasonable-diligence record (e.g. "no answer, 6pm weekday"). */
  notes?: string;
  /** Required for substituted / post-and-mail SUCCESS: the date mailing
   *  completed. The compliance engine counts from this date for those methods. */
  mailingDate?: string;
  server: ServiceServerIdentity;
}

/** Why a produced notice is stale (attorney B1 enum). */
export type StalenessReason = 'AMOUNT_CHANGED' | 'FACE_FIELD_CHANGED';

/**
 * The face-determining values captured at production time. Compared against
 * current data by evaluateStaleness. Deliberately EXCLUDES serviceDate /
 * serviceMethod: re-serving by a new method on a new date is the normal
 * escalation path, not a "stale" change. A change to any field captured here
 * means the notice's face would differ from what was produced => new notice.
 */
export interface ProductionSnapshot {
  /** When the snapshot was taken (ISO timestamp). */
  producedAtISO: string;
  propertyAddress: string;
  propertyCounty: string;
  tenantNames: string[];
  /** Sum of base-rent amounts demanded, for a fast amount-changed check. */
  totalAmount: number;
  rentPeriods: { start: string; end: string; amount: number }[];
  payeeName: string;
  payeePhone: string;
  payeeStreetAddress: string;
  paymentBranch?: PaymentBranch;
  personalDeliveryDays?: string;
  personalDeliveryHours?: string;
  bankName?: string;
  bankBranchAddress?: string;
  bankAccountNumber?: string;
  eftElectionAvailable?: boolean;
  signerName: string;
  signerCapacity?: SignerCapacity;
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
