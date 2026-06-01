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
      const d = evaluateDisputeScreen(data.dispute);
      if (d.cleared) {
        return { canAdvance: true, issues: [], hardBlocked: false };
      }
      // Distinguish "unanswered" (not yet blockable, just incomplete) from
      // "answered yes" (hard-blocked to attorney).
      const anyYes =
        data.dispute.tenantFiledComplaint === true ||
        data.dispute.tenantWrittenWithholding === true ||
        data.dispute.tenantBankruptcy === true;
      if (anyYes) {
        return {
          canAdvance: false,
          issues: d.reasons,
          hardBlocked: true,
        };
      }
      return {
        canAdvance: false,
        issues: ['Please answer all three questions to continue.'],
        hardBlocked: false,
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
      if (data.baseRentOnlyConfirmed !== true) {
        issues.push('You must confirm the amount is base rent only.');
      }
      break;

    case FlowStep.PaymentInstructions:
      // This step defers to the payment validator at the produce gate; for
      // advancement we only require that at least one method has been chosen.
      // (Full § 1947.3 / per-method validity is surfaced by the validator and
      // consolidated at Review.)
      if (!data.paymentMethods || data.paymentMethods.length === 0) {
        issues.push('Choose at least one payment method.');
      }
      break;

    case FlowStep.LandlordAgentInfo:
      if (isBlank(data.signerName)) issues.push('A signer name is required.');
      if (!data.signerRole) issues.push('Select who is signing the notice.');
      if (
        data.signerRole &&
        data.signerRole !== 'owner' &&
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
      if (!data.serviceMethod) {
        issues.push('Select how the notice will be served.');
      }
      break;

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
