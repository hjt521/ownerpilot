// lib/chat/ff3ScriptedCategory.ts
// Lane FF-3 (gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03 §5–§8) — the scripted capture STATE MACHINE
// for the five structured intake fields. Pure/deterministic: no LLM call, no DB write. Consumes the locked persona
// prompts (verbatim, via constant references — NOT re-typed here) and the ff3Capture matchers, and drives the owner
// through notice_type → just_cause → bedrooms → contract_rent → amount_owed (conditional) → confirm.
//
// This module is deliberately SELF-CONTAINED (its own cursor/turn types) and NOT yet wired into CaptureCategory /
// SCRIPTED_CATEGORIES / the orchestrator. Wave-4 activation (ruling §8) does that wiring behind a Preview-only gate;
// this slice exists to be unit-tested in isolation first.
//
// Rule of three (ruling §6): the owner gets FF3_MAX_ATTEMPTS asks per field. After the third failed parse the
// category exits to broker review (chatFf3EscalationCard + captureStatus 'awaiting_broker_review') — we never force
// a value we're not confident in. Inline field-corrections at the confirm step are handled by the orchestrator
// wiring (part 3), not here: a non-affirmative confirm safely holds for broker review rather than looping.

import {
  chatFf3CaptureNoticeType, chatFf3CaptureNoticeTypeReask,
  chatFf3CaptureJustCause, chatFf3CaptureJustCauseReask,
  chatFf3CaptureBedrooms, chatFf3CaptureBedroomsReask,
  chatFf3CaptureContractRent, chatFf3CaptureContractRentReask,
  chatFf3CaptureAmountOwed, chatFf3CaptureAmountOwedReask,
  chatFf3EscalationCard,
} from './persona';
import { parseAmount, parseTriState } from './scriptedCapture';
import { matchJustCause, matchNoticeType, parseBedrooms, buildFf3FromRaw } from '@/lib/intake/ff3Capture';
import { ff3ConfirmationCard, type Ff3Intake, type JustCause, type NoticeType } from '@/lib/intake/ff3Fields';

/** Rule-of-three: three asks per field, then exit to broker review (ruling §6). */
export const FF3_MAX_ATTEMPTS = 3;

export type Ff3Step =
  | 'notice_type' | 'just_cause' | 'bedrooms' | 'contract_rent' | 'amount_owed' | 'confirm';

/** Raw values captured so far, already promoted to enums/numbers by each step's parser. */
export interface Ff3Scratch {
  notice_type?: NoticeType;
  just_cause?: JustCause;
  bedrooms?: number;
  contract_monthly_rent?: number;
  amount_of_rent_owed?: number;
}

export interface Ff3Cursor {
  step: Ff3Step;
  attempts: number;      // failed parses on the CURRENT step (0 on entry)
  scratch: Ff3Scratch;
}

export type Ff3CaptureStatus = 'in_progress' | 'complete' | 'awaiting_broker_review';

/** The typed-column payload persisted to chat_sessions once capture completes (the wiring runs the UPDATE). */
export interface Ff3PersistPayload {
  bedrooms: number;
  amount_of_rent_owed: number | null;
  contract_monthly_rent: number;
  just_cause: JustCause;
  notice_type: NoticeType;
  ff3_capture_status: Ff3CaptureStatus;
}

export interface Ff3Turn {
  /** Message to show the owner (a locked prose constant, or the confirmation card). */
  reply: string;
  /** prompt = first ask for a field; reask = a retry within rule-of-three; complete/escalate = terminal. */
  kind: 'prompt' | 'reask' | 'complete' | 'escalate';
  /** Next cursor to persist, or null when terminal (complete/escalate). */
  nextCursor: Ff3Cursor | null;
  /** Session-level capture status to write to chat_sessions.ff3_capture_status. */
  captureStatus: Ff3CaptureStatus;
  /** On complete: the typed columns to persist. On escalate: undefined (only status flips). */
  persist?: Ff3PersistPayload;
  /** On escalate: the validated payload could not be produced. Present for observability, not persisted. */
  escalatedAt?: Ff3Step;
}

// --- Per-step config: locked prompt, locked reask, and the deterministic parser (value | null). ------------------

interface StepConfig {
  prompt: string;
  reask: string;
  /** Parse the owner message into the scratch field's value; null = no confident match. */
  parse: (msg: string) => NoticeType | JustCause | number | null;
  /** Write the parsed value into scratch. */
  apply: (scratch: Ff3Scratch, value: NoticeType | JustCause | number) => void;
}

const STEP_CONFIG: Record<Exclude<Ff3Step, 'confirm'>, StepConfig> = {
  notice_type: {
    prompt: chatFf3CaptureNoticeType,
    reask: chatFf3CaptureNoticeTypeReask,
    parse: (m) => matchNoticeType(m),
    apply: (s, v) => { s.notice_type = v as NoticeType; },
  },
  just_cause: {
    prompt: chatFf3CaptureJustCause,
    reask: chatFf3CaptureJustCauseReask,
    parse: (m) => matchJustCause(m),
    apply: (s, v) => { s.just_cause = v as JustCause; },
  },
  bedrooms: {
    prompt: chatFf3CaptureBedrooms,
    reask: chatFf3CaptureBedroomsReask,
    parse: (m) => parseBedrooms(m),
    apply: (s, v) => { s.bedrooms = v as number; },
  },
  contract_rent: {
    prompt: chatFf3CaptureContractRent,
    reask: chatFf3CaptureContractRentReask,
    parse: (m) => parseAmount(m),
    apply: (s, v) => { s.contract_monthly_rent = v as number; },
  },
  amount_owed: {
    prompt: chatFf3CaptureAmountOwed,
    reask: chatFf3CaptureAmountOwedReask,
    parse: (m) => parseAmount(m),
    apply: (s, v) => { s.amount_of_rent_owed = v as number; },
  },
};

/**
 * Whether we must capture the notice's stated amount owed (ruling §5.2). Fires when the notice is a 3-day
 * pay-or-quit, when the reason is non-payment, or when an amount candidate is already present. Otherwise the amount
 * is not part of this notice and we skip straight to confirmation.
 */
export function shouldCaptureAmountOwed(scratch: Ff3Scratch): boolean {
  return (
    scratch.notice_type === 'three_day_pay_or_quit' ||
    scratch.just_cause === 'nonpayment' ||
    scratch.amount_of_rent_owed != null
  );
}

/** The field that follows `step` once it's been captured (given what's in scratch). */
function nextStepAfter(step: Exclude<Ff3Step, 'confirm'>, scratch: Ff3Scratch): Ff3Step {
  switch (step) {
    case 'notice_type': return 'just_cause';
    case 'just_cause': return 'bedrooms';
    case 'bedrooms': return 'contract_rent';
    case 'contract_rent': return shouldCaptureAmountOwed(scratch) ? 'amount_owed' : 'confirm';
    case 'amount_owed': return 'confirm';
  }
}

/** Build the turn that ENTERS `step` (fresh prompt, attempts reset), or the confirm/terminal turn. */
function enterStep(step: Ff3Step, scratch: Ff3Scratch): Ff3Turn {
  if (step === 'confirm') return enterConfirm(scratch);
  return {
    reply: STEP_CONFIG[step].prompt,
    kind: 'prompt',
    nextCursor: { step, attempts: 0, scratch },
    captureStatus: 'in_progress',
  };
}

/** Entering confirm: validate the assembled scratch. On success show the confirmation card; on failure escalate. */
function enterConfirm(scratch: Ff3Scratch): Ff3Turn {
  const built = buildFf3FromRaw({
    bedrooms: scratch.bedrooms,
    contract_monthly_rent: scratch.contract_monthly_rent ?? null,
    amount_of_rent_owed: scratch.amount_of_rent_owed ?? null,
    just_cause: scratch.just_cause ?? null,
    notice_type: scratch.notice_type ?? null,
  });
  if (!built.ok) return escalate('confirm');
  return {
    reply: ff3ConfirmationCard(built.value),
    kind: 'prompt',
    nextCursor: { step: 'confirm', attempts: 0, scratch },
    captureStatus: 'in_progress',
  };
}

/** Terminal escalation turn (rule-of-three exhausted or unbuildable): hold for broker review. */
function escalate(at: Ff3Step): Ff3Turn {
  return {
    reply: chatFf3EscalationCard,
    kind: 'escalate',
    nextCursor: null,
    captureStatus: 'awaiting_broker_review',
    escalatedAt: at,
  };
}

/** Terminal completion turn: emit the persist payload for the typed columns. */
function complete(value: Ff3Intake): Ff3Turn {
  return {
    reply: ff3ConfirmationCard(value),
    kind: 'complete',
    nextCursor: null,
    captureStatus: 'complete',
    persist: ff3PersistPayload(value),
  };
}

/** Map a validated Ff3Intake to the chat_sessions typed-column update (status defaults to 'complete'). */
export function ff3PersistPayload(
  value: Ff3Intake,
  status: Ff3CaptureStatus = 'complete',
): Ff3PersistPayload {
  return {
    bedrooms: value.bedrooms,
    amount_of_rent_owed: value.amount_of_rent_owed ?? null,
    contract_monthly_rent: value.contract_monthly_rent,
    just_cause: value.just_cause,
    notice_type: value.notice_type,
    ff3_capture_status: status,
  };
}

/** First turn of the FF-3 scripted category: ask for the notice type. */
export function ff3Begin(): Ff3Turn {
  return enterStep('notice_type', {});
}

/**
 * Advance the state machine one owner message. Deterministic reducer:
 *  - a field step parses `msg`; success advances (resetting attempts), failure re-asks up to FF3_MAX_ATTEMPTS then
 *    escalates;
 *  - the confirm step parses a tri-state affirmation: 'yes' completes (with persist payload); anything else safely
 *    holds for broker review (inline corrections are an orchestrator concern, not this reducer's).
 */
export function stepFf3(cursor: Ff3Cursor, msg: string): Ff3Turn {
  if (cursor.step === 'confirm') return stepConfirm(cursor, msg);

  const cfg = STEP_CONFIG[cursor.step];
  const parsed = cfg.parse(msg);

  if (parsed === null) {
    const attempts = cursor.attempts + 1;
    if (attempts >= FF3_MAX_ATTEMPTS) return escalate(cursor.step);
    return {
      reply: cfg.reask,
      kind: 'reask',
      nextCursor: { step: cursor.step, attempts, scratch: cursor.scratch },
      captureStatus: 'in_progress',
    };
  }

  // Captured: promote into a fresh scratch copy and enter the next step.
  const scratch: Ff3Scratch = { ...cursor.scratch };
  cfg.apply(scratch, parsed);
  return enterStep(nextStepAfter(cursor.step, scratch), scratch);
}

/** Confirm step: 'yes' → complete; anything else → hold for broker review (bounded, never proceeds unconfirmed). */
function stepConfirm(cursor: Ff3Cursor, msg: string): Ff3Turn {
  if (parseTriState(msg) === 'yes') {
    const built = buildFf3FromRaw({
      bedrooms: cursor.scratch.bedrooms,
      contract_monthly_rent: cursor.scratch.contract_monthly_rent ?? null,
      amount_of_rent_owed: cursor.scratch.amount_of_rent_owed ?? null,
      just_cause: cursor.scratch.just_cause ?? null,
      notice_type: cursor.scratch.notice_type ?? null,
    });
    if (built.ok) return complete(built.value);
    return escalate('confirm');
  }
  return escalate('confirm');
}
