// lib/btrm/rie/catalog.ts
// RIE-001 — the canonical ResolutionOptionType -> reversibility / materialConsequence mapping (BTRM-001 spec
// §3.6, §6 state-machine guard). Fixed by type, never inferred from hint content — the same closed-vocabulary
// posture TM-001's dimensions.ts and BAE-001's dimensions.ts already establish for their own closed vocabularies.
//
// materialConsequence classification rationale: BTRM-001 §6 defines material consequence by category (formal
// notice, termination, filing prep, settlement terms, material financial concession, intentional-misconduct
// claim, external reporting), not directly by RIE-001's own ten option types. Mapping each type to those
// categories requires a judgment call for two types that carry financial or rent terms without being an
// unambiguous single §6 category (payment_plan, repair_and_rent_coordination). Per the no-automated-adverse-
// action safety posture (§11) and the same "a hard failure is not averaged away" principle already applied
// elsewhere in BTRM-001, ambiguous cases are classified materialConsequence: true here — a false positive only
// adds an extra human-review gate, while a false negative would let a consequential option skip review entirely.
// This mapping is a Stage 5 implementation decision, not a constitutional ruling, and should be revisited if
// Founder or legal review disagrees with any individual classification.

import type { ResolutionOption } from '../types';

export type ResolutionOptionType =
  | 'clarification_request'
  | 'evidence_request'
  | 'reminder'
  | 'structured_commitment'
  | 'payment_plan'
  | 'repair_and_rent_coordination'
  | 'cure_agreement'
  | 'mutual_move_out'
  | 'mediation_referral'
  | 'formal_notice_workflow'
  | 'escalation_to_filing_prep';

export const ALL_RESOLUTION_OPTION_TYPES: ResolutionOptionType[] = [
  'clarification_request',
  'evidence_request',
  'reminder',
  'structured_commitment',
  'payment_plan',
  'repair_and_rent_coordination',
  'cure_agreement',
  'mutual_move_out',
  'mediation_referral',
  'formal_notice_workflow',
  'escalation_to_filing_prep',
];

export const RESOLUTION_OPTION_REVERSIBILITY: Record<ResolutionOptionType, ResolutionOption['reversibility']> = {
  clarification_request: 'fully_reversible',
  evidence_request: 'fully_reversible',
  reminder: 'fully_reversible',
  structured_commitment: 'partially_reversible',
  payment_plan: 'partially_reversible',
  repair_and_rent_coordination: 'partially_reversible',
  cure_agreement: 'partially_reversible',
  mediation_referral: 'partially_reversible',
  mutual_move_out: 'not_reversible',
  formal_notice_workflow: 'not_reversible',
  escalation_to_filing_prep: 'not_reversible',
};

export const RESOLUTION_OPTION_MATERIAL_CONSEQUENCE: Record<ResolutionOptionType, boolean> = {
  clarification_request: false,
  evidence_request: false,
  reminder: false,
  structured_commitment: false,
  mediation_referral: false, // a referral is not itself a binding or adverse action
  payment_plan: true, // §6 "material financial concession"
  repair_and_rent_coordination: true, // may bind rent/financial terms to a repair concession
  cure_agreement: true, // §6 "settlement terms"
  mutual_move_out: true, // §6 "termination"
  formal_notice_workflow: true, // §6 "formal notice"
  escalation_to_filing_prep: true, // §6 "filing prep"
};

export function reversibilityFor(type: ResolutionOptionType): ResolutionOption['reversibility'] {
  return RESOLUTION_OPTION_REVERSIBILITY[type];
}

export function isMaterialConsequence(type: ResolutionOptionType): boolean {
  return RESOLUTION_OPTION_MATERIAL_CONSEQUENCE[type];
}
