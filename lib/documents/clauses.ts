// lib/documents/clauses.ts
// AI-first Resolve & Document — clause registry + per-path clause/disclaimer mapping. Clauses are LOCKED prose
// (G1.1-G1.7); resolved by manifest ID, never authored/interpolated in code. The clauses reference "above"/"stated
// above" fields rendered in the document's field table — NO interpolation inside the clause body (G1 test).

import { lockedProse } from '@/lib/compliance/lockedProse';
import type { DocumentPathId } from '@/lib/riskpath/paths';
import { RD_DISCLAIMERS, UD_INTAKE_FOOTER, type RDDisclaimerKey } from '@/lib/riskpath/disclaimers';

// Locked-prose keys resolved by this registry (shape-B assembly manifest). Enumerated for the
// CI guard's dangling-reference scanner since clauseBody() resolves them dynamically by id.
// LockedKey: CLAUSE_PAYMENT_RECEIVED_V1
// LockedKey: CLAUSE_POST_DEADLINE_ACCEPTANCE_V1
// LockedKey: CLAUSE_PAYMENT_PLAN_V1
// LockedKey: CLAUSE_MOVE_OUT_V1
// LockedKey: CLAUSE_MOVE_OUT_MLT_BRANCH_V1
// LockedKey: CLAUSE_SURRENDER_V1
// LockedKey: CLAUSE_UD_INTAKE_V1

export type ClauseId =
  | 'CLAUSE_PAYMENT_RECEIVED_V1' | 'CLAUSE_POST_DEADLINE_ACCEPTANCE_V1' | 'CLAUSE_PAYMENT_PLAN_V1'
  | 'CLAUSE_MOVE_OUT_V1' | 'CLAUSE_MOVE_OUT_MLT_BRANCH_V1' | 'CLAUSE_SURRENDER_V1' | 'CLAUSE_UD_INTAKE_V1';

/** Resolve a clause body byte-exact from the locked-prose manifest. Throws if the ID is missing (build-time safety). */
export function clauseBody(id: ClauseId): string {
  return lockedProse(id);
}

/** Each v1 document path → its body clause(s) + footer disclaimer. move_out gets the MLT branch clause when toggled. */
export interface PathDocSpec { clauses: ClauseId[]; disclaimer: RDDisclaimerKey; udFooter?: boolean; }

export const PATH_DOC_SPEC: Record<DocumentPathId, PathDocSpec> = {
  payment_received:      { clauses: ['CLAUSE_PAYMENT_RECEIVED_V1'], disclaimer: 'general' },
  post_deadline_payment: { clauses: ['CLAUSE_POST_DEADLINE_ACCEPTANCE_V1'], disclaimer: 'payment_plan' },
  payment_plan:          { clauses: ['CLAUSE_PAYMENT_PLAN_V1'], disclaimer: 'payment_plan' },
  move_out_agreement:    { clauses: ['CLAUSE_MOVE_OUT_V1'], disclaimer: 'move_out_agreement' },
  surrender_record:      { clauses: ['CLAUSE_SURRENDER_V1'], disclaimer: 'surrender_record' },
  ud_settlement_intake:  { clauses: ['CLAUSE_UD_INTAKE_V1'], disclaimer: 'ud_case', udFooter: true },
};

/** Resolve the clause set for a path, adding the MLT branch clause when the move-out MLT toggle is on. */
export function clausesForPath(path: DocumentPathId, mutualLeaseTermination = false): ClauseId[] {
  const base = [...PATH_DOC_SPEC[path].clauses];
  if (path === 'move_out_agreement' && mutualLeaseTermination) base.push('CLAUSE_MOVE_OUT_MLT_BRANCH_V1');
  return base;
}

export function disclaimerForPath(path: DocumentPathId): string {
  return RD_DISCLAIMERS[PATH_DOC_SPEC[path].disclaimer];
}
export function udFooterForPath(path: DocumentPathId): string | null {
  return PATH_DOC_SPEC[path].udFooter ? UD_INTAKE_FOOTER : null;
}

/** §11 reservation-of-rights slot — INERT (G2). Never emits prose; the placeholder is the production behavior. */
export const RESERVATION_OF_RIGHTS_SLOT = { present: false as const, prose: '[BROKER ATTORNEY DRAFTING REQUIRED]', emits: false as const };

/** Broker attribution block — shown on every produced document footer. */
export const BROKER_ATTRIBUTION =
  'Prepared with OwnerPilot AI under California real estate broker supervision (CalDRE B9445457). Not a law firm; not legal advice.';
