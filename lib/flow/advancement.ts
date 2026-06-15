/**
 * Step-advancement logic for the 3-day notice flow.
 *
 * Answers a DIFFERENT question than the produce gate (gates.ts):
 *   - evaluateCanProduce  -> "is the WHOLE notice ready to produce?"
 *   - canAdvance (here)   -> "is THIS step complete enough to move on?"
 *
 * Per-step validators check only that step's fields, and only for PRESENCE and
 * BASIC SHAPE — not the deep legal/cross-cutting checks. Those stay in the
 * produce gate and the individual modules. A step can be advanceable while the
 * notice is still not produceable, and that is intentional: users fill
 * everything in and meet the consolidated blocker list at Review, rather than
 * getting stuck mid-flow on an end-state condition.
 *
 * THE ONE EXCEPTION: the pre-flight dispute step. Advancing past it is not
 * "is it complete" but "is it CLEARED". If it blocks, the user does not advance
 * to Step 1 — they hit the attorney handoff. That gate is the hard-block from
 * gates.ts, reused here, not rebuilt.
 *
 * Not legal advice; product workflow logic.
 */

import {
  FlowStep,
  NoticeFlowState,
  NoticeFlowData,
} from './noticeFlowState';
import { evaluateDisputeScreen } from './gates';
import { isSafetyCheckSoftMode } from './featureFlags';
import { validateSigningDate } from './escalation';
import { isUsPhone } from '../payments/validatePaymentBranch';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface StepValidation {
  /** Whether the user may leave this step going forward. */
  canAdvance: boolean;
  /** Field-level issues for THIS step (presence/shape only). */
  issues: string[];
  /**
   * Only set for the dispute step: if true, the user is hard-blocked to the
   * attorney handoff rather than advancing. Distinct from ordinary
   * incompleteness.
   */
  hardBlocked?: boolean;
}

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim() === '';
}

function validISO(s: string | undefined): boolean {
  if (s === undefined || !ISO_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Validate a single step's own fields (presence + basic shape only). */
export function validateStep(
  step: FlowStep,
  data: NoticeFlowData,
): StepValidation {
  const issues: string[] = [];

  switch (step) {
    case FlowStep.PreflightDispute: {
      // Special: advancement = cleared, not merely complete.
      // C5 soft mode: no hard-block to attorney; a 'yes'/'unknown' flags the
      // screen but is data-advanceable (the override modal at the navigation
      // layer is what actually gates proceeding). Only an UNANSWERED question
      // blocks in soft mode. Hard mode is unchanged.
      const softMode = isSafetyCheckSoftMode();
      const d = evaluateDisputeScreen(data.dispute, softMode);
      if (d.cleared) {
        return { canAdvance: true, issues: [], hardBlocked: false };
      }
      // 'yes' => hard-block to attorney (hard mode only). 'unknown'/unanswered
      // => block as a "go check" state. An 'unknown' is NEVER allowed to
      // advance as if it were 'no'.
      return {
        canAdvance: false,
        issues: d.reasons,
        hardBlocked: d.hardBlocked,
      };
    }

    case FlowStep.PropertyIdentification:
      if (isBlank(data.propertyAddress)) {
        issues.push('A property address is required.');
      }
      // County is optional at advancement time (may be geocoded later).
      break;

    case FlowStep.Tenants:
      if (!data.tenantNames || data.tenantNames.filter((n) => !isBlank(n)).length === 0) {
        issues.push('At least one tenant name is required.');
      }
      break;

    case FlowStep.LandlordIdentity: {
      // Defect #1: landlord type must be chosen and confirmed; entity branch
      // fields complete. Captured BEFORE payment so the derived (S) 1161(2)
      // payee name is available there. SIGNER fields + service/signing dates
      // are validated on LandlordAgentInfo, NOT here.
      const id = data.landlordIdentity;
      if (!id || !data.landlordIdentityConfirmed) {
        issues.push('Select whether the landlord is an individual or an entity.');
      }
      if (id?.type === 'entity') {
        if (isBlank(id.entityLegalName)) issues.push("Enter the entity's full legal name.");
        if (!id.entityType) issues.push('Select the entity type.');
        // FIX 1: a California LLC must declare member- vs manager-managed; it
        // drives the signer-authority warning on the signer step. Required to
        // advance. (manager-managed members may lack authority to bind.)
        if (id.entityType === 'llc' && !id.managementType) {
          issues.push('Select how this LLC is managed.');
        }
      }
      break;
    }

    case FlowStep.AmountOwed:
      if (!data.rentPeriods || data.rentPeriods.length === 0) {
        issues.push('Add at least one rent period.');
      } else {
        data.rentPeriods.forEach((p, i) => {
          const label = `Rent period ${i + 1}`;
          if (!validISO(p.periodStartDate)) issues.push(`${label}: start date is invalid.`);
          if (!validISO(p.periodEndDate)) issues.push(`${label}: end date is invalid.`);
          if (
            validISO(p.periodStartDate) &&
            validISO(p.periodEndDate) &&
            p.periodEndDate < p.periodStartDate
          ) {
            issues.push(`${label}: end date is before start date.`);
          }
          if (!(typeof p.amount === 'number' && p.amount > 0)) {
            issues.push(`${label}: amount must be greater than zero.`);
          }
        });
      }
      // Base-rent-only confirmation moved to the Step 4 produce-gate
      // attestation (C6, det. 2026-06-14). Step 2 no longer gates on it.
      break;

    case FlowStep.PaymentInstructions: {
      // v4 model (attorney ruling 2026-06-01): the § 1161(2) payee trio + one
      // payment branch. Advancement checks PRESENCE/shape only; deep validity
      // (phone format, P.O.-box rules, § 1947.3 paper-instrument, 5-mile,
      // EFT-previously-established, wording sign-off) is surfaced by
      // validatePaymentBranch and consolidated at Review by evaluateCanProduceV4.
      const c = data.landlordContact;
      // Defect #2 cutover: the payee NAME is derived from the Step-3 identity,
      // not typed here. Validate only the non-landlord override name when the
      // override is on; the derived name is consolidated at Review
      // (evaluateCanProduceV4 / PAYEE_NAME_UNRESOLVED).
      if (data.payeeIsNonLandlord && isBlank(data.payeeOverrideName)) {
        issues.push('Enter the name of the payee who receives rent.');
      }
      if (isBlank(c?.phone)) {
        issues.push('A telephone number for payment is required.');
      } else if (!isUsPhone(c?.phone)) {
        issues.push('Enter a valid US telephone number (10 digits).');
      }
      if (isBlank(c?.streetAddress)) {
        issues.push('A street address to receive payment is required.');
      }
      if (!data.paymentBranch) {
        issues.push('Choose how rent may be paid.');
      } else if (data.paymentBranch === 'in_person_and_mail') {
        if (isBlank(data.personalDeliveryDays)) {
          issues.push('Enter the days personal delivery is available.');
        }
        if (isBlank(data.personalDeliveryHours)) {
          issues.push('Enter the hours personal delivery is available.');
        }
      } else if (data.paymentBranch === 'bank_deposit') {
        if (isBlank(data.bankName)) issues.push('Enter the bank name.');
        if (isBlank(data.bankBranchAddress)) issues.push('Enter the bank branch address.');
        if (isBlank(data.bankAccountNumber)) issues.push('Enter the account number.');
      }
      break;
    }

    case FlowStep.LandlordAgentInfo: {
      // Signer + execution/service. Landlord IDENTITY is validated on the
      // LandlordIdentity step (earlier); the entity-title rule below still
      // keys off id.type, which is already set by the time the user is here.
      const id = data.landlordIdentity;
      if (isBlank(data.signerName)) issues.push('A signer name is required.');
      if (!data.signerCapacity) issues.push('Select who is signing the notice.');
      // signerTitleRequired (Defect #3 countersign 2026-06-05 §1, LOCKED): for an
      // entity landlord the signer title is required, so the face never composes
      // "By: [name], " with a trailing comma and blank title. Intake-layer guard;
      // the renderer also fails closed, and the produce gate re-checks it.
      if (id?.type === 'entity' && isBlank(data.signerTitle)) {
        issues.push("Enter the signer's title (Managing Member, President, Trustee, etc.).");
      }
      // Authority evidence required when the signer is not the insider
      // (owner for an individual, officer/member/trustee for an entity).
      if (
        data.signerCapacity &&
        data.signerCapacity !== 'owner' &&
        data.signerCapacity !== 'officer_member_trustee' &&
        data.authorityEvidenceOnFile !== true
      ) {
        issues.push(
          'Upload authority evidence (management agreement or written ' +
            'authorization) to sign as an agent.',
        );
      }
      // Service date/method are collected here too (they drive the dates).
      if (!validISO(data.serviceDate)) {
        issues.push('A valid intended service date is required.');
      }
      // Service method is no longer captured here. It is recorded at serve
      // time on Serve & Track, where the successful attempt's method is the
      // operative record (broker determination 2026-06-12). The face deadline
      // is method-independent, so production does not require it.
      // Signing (execution) date — a distinct legal fact from the service date
      // (attorney ruling B1, 2026-06-02). It prints on the face "Dated:" line.
      if (!validISO(data.signingDate)) {
        issues.push('A valid signing (execution) date is required.');
      } else {
        // HARD error if the notice is signed AFTER the first service date. The
        // >30-day-before case is a soft warning surfaced in the UI, NOT a block
        // (build decision: warn, don't block).
        const sd = validateSigningDate(data.signingDate, data.serviceDate);
        if (!sd.ok && sd.error) issues.push(sd.error);
      }
      break;
    }

    case FlowStep.Review:
      // Review has no "own fields" — its advancement is governed entirely by
      // the produce gate (evaluateCanProduce), consulted by the UI, not here.
      break;

    case FlowStep.ServiceInstructions:
      // Terminal step in this slice; proof-of-service capture (7b) is a later
      // slice with its own fields.
      break;

    default: {
      const _exhaustive: never = step;
      void _exhaustive;
    }
  }

  return { canAdvance: issues.length === 0, issues };
}

/** Ordered step sequence for forward/back navigation. */
export const STEP_ORDER: FlowStep[] = [
  FlowStep.PreflightDispute,
  FlowStep.PropertyIdentification,
  FlowStep.Tenants,
  FlowStep.LandlordIdentity,
  FlowStep.AmountOwed,
  FlowStep.PaymentInstructions,
  FlowStep.LandlordAgentInfo,
  FlowStep.Review,
  FlowStep.ServiceInstructions,
];

function indexOfStep(step: FlowStep): number {
  return STEP_ORDER.indexOf(step);
}

export interface AdvanceResult {
  state: NoticeFlowState;
  moved: boolean;
  /** If advancement was refused, why. */
  validation: StepValidation;
}

/**
 * Attempt to advance to the next step. Returns a NEW state (immutably) and
 * whether the move happened. Refuses if the current step does not validate.
 * The dispute step's hard-block surfaces via validation.hardBlocked.
 */
export function advance(state: NoticeFlowState): AdvanceResult {
  const validation = validateStep(state.step, state.data);
  if (!validation.canAdvance) {
    return { state, moved: false, validation };
  }
  const i = indexOfStep(state.step);
  const isLast = i === STEP_ORDER.length - 1;
  if (isLast) {
    return { state, moved: false, validation };
  }
  const next = STEP_ORDER[i + 1];
  return {
    state: { ...state, step: next },
    moved: true,
    validation,
  };
}

/**
 * Go back one step. Always allowed (no validation on backward navigation);
 * never moves before the first step. Returns a new state.
 */
export function goBack(state: NoticeFlowState): NoticeFlowState {
  const i = indexOfStep(state.step);
  if (i <= 0) return state;
  return { ...state, step: STEP_ORDER[i - 1] };
}
