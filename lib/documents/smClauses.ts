// lib/documents/smClauses.ts
// Santa Monica v1 document forms → locked SM clause IDs. Reuses the Group 2 DocumentRender composition
// (title + field table + clause(s) + disclaimer + broker attribution). Clauses are byte-exact locked prose (G7).
// The 3 SM v1 forms (omnibus §5): 3-day pay-or-quit overlay, 30/60-day termination just-cause, rent-control disclosure.

import { lockedProse } from '@/lib/compliance/lockedProse';
import { RD_DISCLAIMERS } from '@/lib/riskpath/disclaimers';

// Locked-prose keys resolved dynamically by smClauseBody() — enumerated for the guard's scanner.
// LockedKey: CLAUSE_SM_3DAY_PAY_OR_QUIT_OVERLAY_V1
// LockedKey: CLAUSE_SM_TERMINATION_JUST_CAUSE_V1
// LockedKey: CLAUSE_SM_RENT_CONTROL_STATUS_DISCLOSURE_V1

export type SmFormId = 'sm_3day_pay_or_quit' | 'sm_termination_just_cause' | 'sm_rent_control_disclosure';
export type SmClauseId =
  | 'CLAUSE_SM_3DAY_PAY_OR_QUIT_OVERLAY_V1'
  | 'CLAUSE_SM_TERMINATION_JUST_CAUSE_V1'
  | 'CLAUSE_SM_RENT_CONTROL_STATUS_DISCLOSURE_V1';

export interface SmFormSpec { pdfTitle: string; clause: SmClauseId; disclaimerKey: 'general'; }

export const SM_FORMS: Record<SmFormId, SmFormSpec> = {
  sm_3day_pay_or_quit:        { pdfTitle: 'Santa Monica 3-Day Notice to Pay Rent or Quit (Rent-Control Overlay)', clause: 'CLAUSE_SM_3DAY_PAY_OR_QUIT_OVERLAY_V1', disclaimerKey: 'general' },
  sm_termination_just_cause:  { pdfTitle: 'Santa Monica Notice of Termination (Just Cause)', clause: 'CLAUSE_SM_TERMINATION_JUST_CAUSE_V1', disclaimerKey: 'general' },
  sm_rent_control_disclosure: { pdfTitle: 'Santa Monica Notice to Tenants of Rent Control Status', clause: 'CLAUSE_SM_RENT_CONTROL_STATUS_DISCLOSURE_V1', disclaimerKey: 'general' },
};

export function smClauseBody(id: SmClauseId): string {
  return lockedProse(id);
}

/** Resolve a SM form's locked clause body + disclaimer for the renderer. */
export function resolveSmForm(form: SmFormId): { pdfTitle: string; clauseBody: string; disclaimer: string } {
  const spec = SM_FORMS[form];
  return { pdfTitle: spec.pdfTitle, clauseBody: smClauseBody(spec.clause), disclaimer: RD_DISCLAIMERS[spec.disclaimerKey] };
}
