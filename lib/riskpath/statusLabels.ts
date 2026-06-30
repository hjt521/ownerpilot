// lib/riskpath/statusLabels.ts
// AI-first /riskpath — human-readable labels + tone for the 15 locked RiskPath statuses (transitions.ts SSOT).
// Pure; tone drives the dashboard badge color (neutral / progress / resolved / attention).

import { RISKPATH_STATUSES, type RiskPathStatus } from './transitions';

export type StatusTone = 'neutral' | 'progress' | 'resolved' | 'attention';

export interface StatusMeta { label: string; tone: StatusTone }

export const STATUS_LABELS: Record<RiskPathStatus, StatusMeta> = {
  tenant_responded:                 { label: 'Tenant responded', tone: 'progress' },
  payment_received:                 { label: 'Payment received', tone: 'progress' },
  post_deadline_payment_accepted:   { label: 'Payment accepted (post-deadline)', tone: 'attention' },
  payment_plan_active:              { label: 'Payment plan active', tone: 'progress' },
  move_out_agreement_drafted:       { label: 'Move-out agreement drafted', tone: 'progress' },
  move_out_agreement_signed:        { label: 'Move-out agreement signed', tone: 'progress' },
  mutual_termination_drafted:       { label: 'Mutual termination drafted', tone: 'progress' },
  mutual_termination_signed:        { label: 'Mutual termination signed', tone: 'progress' },
  move_out_pending:                 { label: 'Move-out pending', tone: 'progress' },
  possession_returned:              { label: 'Possession returned', tone: 'progress' },
  surrender_record_saved:           { label: 'Surrender recorded', tone: 'progress' },
  security_deposit_followup_pending:{ label: 'Security-deposit follow-up pending', tone: 'attention' },
  notice_closed:                    { label: 'Notice closed', tone: 'resolved' },
  ud_review_needed:                 { label: 'UD review needed', tone: 'attention' },
  counsel_recommended:              { label: 'Routed to counsel', tone: 'attention' },
};

export function statusMeta(status: string): StatusMeta {
  return (STATUS_LABELS as Record<string, StatusMeta>)[status] ?? { label: status, tone: 'neutral' };
}

/** Every locked status has a label (guard against drift if §12 ever changes). */
export function allStatusesLabeled(): boolean {
  return RISKPATH_STATUSES.every((s) => !!STATUS_LABELS[s]);
}
