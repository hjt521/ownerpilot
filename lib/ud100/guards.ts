import {
  UD100_ENTITY_STATES,
  UD100_NATURAL_PERSON_STATES,
  type Ud100ControlStage,
  type Ud100DecisionToFileConfirmation,
  type Ud100EntityAuthority,
  type Ud100FilingPosture,
  type Ud100MaterialControlHold,
  type Ud100MinisterialOperation,
  type Ud100PlaintiffTrack,
  type Ud100PlaintiffType,
  type Ud100RequestedFilingPosture,
  type Ud100RequestedOperation,
  type Ud100ServiceGate,
  type Ud100ValidationResult,
  type Ud100WorkflowState,
} from './contracts';

const PASS: Ud100ValidationResult = { ok: true };

type Rejected = Exclude<Ud100ValidationResult, { ok: true }>;

function reject(reason: Rejected['reason']): Ud100ValidationResult {
  return { ok: false, reason };
}

export function plaintiffTrackFor(type: Ud100PlaintiffType): Ud100PlaintiffTrack {
  return type === 'natural_person' ? 'natural_person' : 'entity';
}

export function workflowStatesForPlaintiff(type: Ud100PlaintiffType): readonly Ud100WorkflowState[] {
  return plaintiffTrackFor(type) === 'entity' ? UD100_ENTITY_STATES : UD100_NATURAL_PERSON_STATES;
}

export function validateEntityAuthority(authority: Ud100EntityAuthority | null | undefined): Ud100ValidationResult {
  if (!authority) return reject('entity_authority_unresolved');
  if (!authority.signerAttested) return reject('entity_authority_attestation_required');

  if (authority.verificationStatus === 'held') return reject('entity_authority_verification_held');
  if (authority.verificationStatus !== 'verified') return reject('entity_authority_unresolved');

  if (
    !authority.entityName?.trim() ||
    !authority.signerIdentity?.trim() ||
    !authority.signerTitleOrRelationship?.trim() ||
    !authority.signerCategory ||
    !authority.authorityBasis?.trim()
  ) {
    return reject('entity_authority_unresolved');
  }

  if (authority.documentaryDiligenceStatus === 'held' || authority.documentaryDiligenceStatus === 'required') {
    return reject('documentary_diligence_unresolved');
  }

  return PASS;
}

export function validateServiceGate(gate: Ud100ServiceGate): Ud100ValidationResult {
  if (gate.mode === 'free_limited_beta') {
    return gate.compensationPresent ? reject('free_beta_compensation_present') : PASS;
  }
  return gate.udaLdaComplianceSatisfied ? PASS : reject('paid_compliance_gate_unsatisfied');
}

export interface Ud100PreparationEligibilityInput {
  readonly plaintiffType: Ud100PlaintiffType | null;
  readonly decision: Ud100DecisionToFileConfirmation;
  readonly entityAuthority?: Ud100EntityAuthority | null;
  readonly serviceGate: Ud100ServiceGate;
  readonly materialControlHold: Ud100MaterialControlHold;
}

export function validatePreparationEligibility(input: Ud100PreparationEligibilityInput): Ud100ValidationResult {
  if (!input.plaintiffType) return reject('plaintiff_type_unresolved');
  if (input.materialControlHold !== 'none') return reject('material_control_held');
  if (!input.decision.decisionToFileConfirmed) return reject('customer_decision_not_confirmed');
  if (!input.decision.filingElectionsConfirmed) return reject('filing_elections_not_confirmed');

  const service = validateServiceGate(input.serviceGate);
  if (!service.ok) return service;

  if (plaintiffTrackFor(input.plaintiffType) === 'entity') {
    return validateEntityAuthority(input.entityAuthority);
  }

  return PASS;
}

export interface Ud100StageTransitionInput extends Ud100PreparationEligibilityInput {
  readonly from: Ud100ControlStage;
  readonly to: Ud100ControlStage;
  readonly intentionalDecisionReviewExit?: boolean;
}

export function validateStageTransition(input: Ud100StageTransitionInput): Ud100ValidationResult {
  if (input.from === input.to) return reject('invalid_state_transition');

  if (input.from === 'Decision Intelligence' && input.to === 'Decision Confirmation') return PASS;

  if (input.to === 'Ministerial Filing Engine') {
    if (input.from !== 'Decision Confirmation') {
      if (!input.decision.decisionToFileConfirmed) return reject('customer_decision_not_confirmed');
      return reject('invalid_state_transition');
    }
    return validatePreparationEligibility(input);
  }

  if (input.from === 'Ministerial Filing Engine' && input.to === 'Decision Intelligence') {
    return input.intentionalDecisionReviewExit ? PASS : reject('invalid_state_transition');
  }

  if (input.from === 'Ministerial Filing Engine' && input.to === 'Customer Review and Signature') return PASS;
  if (input.from === 'Customer Review and Signature' && input.to === 'Customer-Controlled Filing') return PASS;
  if (input.from === 'Customer-Controlled Filing' && input.to === 'Post-Filing Classification') return PASS;

  return reject('invalid_state_transition');
}

const MINISTERIAL_OPERATIONS: readonly Ud100MinisterialOperation[] = [
  'populate_confirmed_fields',
  'validate_factual_completeness',
  'identify_missing_facts',
  'surface_factual_inconsistency',
  'organize_packet',
  'preview_packet',
  'export_packet',
];

export function validateMinisterialOperation(operation: Ud100RequestedOperation): Ud100ValidationResult {
  if ((MINISTERIAL_OPERATIONS as readonly string[]).includes(operation)) return PASS;

  switch (operation) {
    case 'recommend_file':
    case 'recommend_not_file':
    case 'select_form_claim_or_remedy':
    case 'select_stronger_legal_theory':
      return reject('prohibited_filing_engine_recommendation');
    case 'autonomous_submit':
      return reject('autonomous_filing_not_authorized');
    case 'sign_for_customer':
      return reject('ownerpilot_signature_not_authorized');
    case 'represent_in_court':
      return reject('representation_boundary_violation');
    case 'route_to_attorney':
      return reject('attorney_routing_not_authorized');
    default:
      return reject('invalid_state_transition');
  }
}

export function validateFilingPosture(posture: Ud100RequestedFilingPosture): Ud100ValidationResult {
  return posture === 'customer_controlled' ? PASS : reject('autonomous_filing_not_authorized');
}

export function currentAuthorizedFilingPosture(): Ud100FilingPosture {
  return 'customer_controlled';
}
