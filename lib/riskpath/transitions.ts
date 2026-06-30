// lib/riskpath/transitions.ts
// AI-first /chat rebuild — RiskPath status state machine.
// Authoritative source: resolve_and_document_layer_broker_ruling_2026-06-28.md §12 (15 LOCKED enums + 3 locked constraints).
// lane-2: riskpath_records.current_state is `text`, validated HERE. Do NOT add/remove/re-order the 15 (broker lane-4 instruction).
// The transition GRAPH (beyond the 3 locked constraints) is engineering-owned.

/** The 15 LOCKED RiskPath statuses, verbatim and in ruling §12 order. */
export const RISKPATH_STATUSES = [
  'tenant_responded',
  'payment_received',
  'post_deadline_payment_accepted',
  'payment_plan_active',
  'move_out_agreement_drafted',
  'move_out_agreement_signed',
  'mutual_termination_drafted',
  'mutual_termination_signed',
  'move_out_pending',
  'possession_returned',
  'surrender_record_saved',
  'security_deposit_followup_pending',
  'notice_closed',
  'ud_review_needed',
  'counsel_recommended',
] as const;

export type RiskPathStatus = (typeof RISKPATH_STATUSES)[number];

export function isRiskPathStatus(x: string): x is RiskPathStatus {
  return (RISKPATH_STATUSES as readonly string[]).includes(x);
}

/** Terminal statuses (ruling §12). counsel_recommended is terminal; notice_closed is terminal EXCEPT -> counsel_recommended. */
export const TERMINAL_STATUSES: ReadonlySet<RiskPathStatus> = new Set(['counsel_recommended']);

/**
 * Engineering-owned transition graph (within the 3 locked constraints).
 * A counsel-route trigger can fire at any point, so counsel_recommended is reachable from every
 * non-terminal status (added programmatically below). notice_closed -> ONLY counsel_recommended.
 */
const BASE_TRANSITIONS: Record<RiskPathStatus, RiskPathStatus[]> = {
  tenant_responded: [
    'payment_received', 'post_deadline_payment_accepted', 'payment_plan_active',
    'move_out_agreement_drafted', 'mutual_termination_drafted', 'move_out_pending', 'ud_review_needed',
  ],
  payment_received: ['notice_closed'],
  post_deadline_payment_accepted: ['notice_closed'], // continue-to-evict is counsel-routed (added below)
  payment_plan_active: ['payment_received', 'notice_closed'], // (breach/default path is Fork 3 — not present)
  move_out_agreement_drafted: ['move_out_agreement_signed'],
  move_out_agreement_signed: ['move_out_pending'],
  mutual_termination_drafted: ['mutual_termination_signed'],
  mutual_termination_signed: ['move_out_pending'],
  move_out_pending: ['possession_returned'],
  possession_returned: ['surrender_record_saved'],
  surrender_record_saved: ['security_deposit_followup_pending', 'notice_closed'],
  security_deposit_followup_pending: ['notice_closed'],
  notice_closed: [], // terminal except -> counsel_recommended (added below)
  ud_review_needed: [], // UD Settlement Intake terminates in counsel_recommended (added below)
  counsel_recommended: [], // terminal from workflow standpoint
};

/** Final graph: every non-terminal status may also transition to counsel_recommended (a trigger can fire anytime). */
export const ALLOWED_TRANSITIONS: Record<RiskPathStatus, ReadonlySet<RiskPathStatus>> =
  Object.fromEntries(
    RISKPATH_STATUSES.map((s) => {
      const base = new Set(BASE_TRANSITIONS[s]);
      if (s !== 'counsel_recommended') base.add('counsel_recommended');
      return [s, base];
    }),
  ) as unknown as Record<RiskPathStatus, ReadonlySet<RiskPathStatus>>;

export interface TransitionResult {
  ok: boolean;
  error?: { code: 'invalid_status' | 'terminal_state' | 'invalid_transition'; message: string };
}

/** Validate a status transition. Rejects unknown statuses, moves out of terminal states, and disallowed edges. */
export function validateTransition(from: string, to: string): TransitionResult {
  if (!isRiskPathStatus(from)) {
    return { ok: false, error: { code: 'invalid_status', message: `Unknown from-status: ${from}` } };
  }
  if (!isRiskPathStatus(to)) {
    return { ok: false, error: { code: 'invalid_status', message: `Unknown to-status: ${to}` } };
  }
  if (TERMINAL_STATUSES.has(from)) {
    return { ok: false, error: { code: 'terminal_state', message: `${from} is terminal; no transitions out` } };
  }
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    return { ok: false, error: { code: 'invalid_transition', message: `${from} -> ${to} is not permitted` } };
  }
  return { ok: true };
}
