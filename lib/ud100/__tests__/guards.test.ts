import {
  UD100_ENTITY_STATES,
  UD100_FAIL_CLOSED_STATES,
  UD100_NATURAL_PERSON_STATES,
  type Ud100DecisionToFileConfirmation,
  type Ud100EntityAuthority,
  type Ud100MatterBoundarySnapshot,
  type Ud100ServiceGate,
} from '../contracts';
import {
  currentAuthorizedFilingPosture,
  plaintiffTrackFor,
  validateEntityAuthority,
  validateFilingPosture,
  validateMinisterialOperation,
  validatePreparationEligibility,
  validateServiceGate,
  validateStageTransition,
  workflowStatesForPlaintiff,
} from '../guards';

let failed = 0;
function check(name: string, condition: boolean) {
  if (!condition) {
    failed++;
    console.error('FAIL:', name);
  } else {
    console.log('ok -', name);
  }
}

const decisionConfirmed: Ud100DecisionToFileConfirmation = {
  decisionToFileConfirmed: true,
  filingElectionsConfirmed: true,
  decisionObjectVersion: 'decision-v1',
  factSnapshotHash: 'facts-v1',
  controlVersion: 'phase-c-2026-08-09',
};

const decisionUnconfirmed: Ud100DecisionToFileConfirmation = {
  ...decisionConfirmed,
  decisionToFileConfirmed: false,
};

const freeGate: Ud100ServiceGate = { mode: 'free_limited_beta', compensationPresent: false };

const validEntityAuthority: Ud100EntityAuthority = {
  entityName: 'Example Owner LLC',
  entityType: 'llc',
  signerIdentity: 'Alex Owner',
  signerTitleOrRelationship: 'Managing member',
  signerCategory: 'managing_member',
  authorityBasis: 'Managing member with authority to verify for the entity',
  signerAttested: true,
  verificationStatus: 'verified',
  documentaryDiligenceStatus: 'not_required',
};

function transitionBase() {
  return {
    plaintiffType: 'natural_person' as const,
    decision: decisionConfirmed,
    serviceGate: freeGate,
    materialControlHold: 'none' as const,
  };
}

check('natural person maps to natural_person track', plaintiffTrackFor('natural_person') === 'natural_person');
check('natural-person vocabulary uses the canonical target sequence',
  workflowStatesForPlaintiff('natural_person') === UD100_NATURAL_PERSON_STATES);
check('Decision Intelligence -> Decision Confirmation passes',
  validateStageTransition({ ...transitionBase(), from: 'Decision Intelligence', to: 'Decision Confirmation' }).ok);
check('confirmed natural person -> Ministerial Filing Engine passes',
  validateStageTransition({ ...transitionBase(), from: 'Decision Confirmation', to: 'Ministerial Filing Engine' }).ok);
check('ministerial -> customer review passes',
  validateStageTransition({ ...transitionBase(), from: 'Ministerial Filing Engine', to: 'Customer Review and Signature' }).ok);
check('customer review -> Customer-Controlled Filing passes',
  validateStageTransition({ ...transitionBase(), from: 'Customer Review and Signature', to: 'Customer-Controlled Filing' }).ok);
check('Customer-Controlled Filing -> post-filing passes',
  validateStageTransition({ ...transitionBase(), from: 'Customer-Controlled Filing', to: 'Post-Filing Classification' }).ok);

for (const entityType of ['corporation', 'llc'] as const) {
  const authority = { ...validEntityAuthority, entityType };
  check(`${entityType} maps to unified entity track`, plaintiffTrackFor(entityType) === 'entity');
  check(`${entityType} uses the same entity state vocabulary`, workflowStatesForPlaintiff(entityType) === UD100_ENTITY_STATES);
  check(`${entityType} with verified attestation may enter ministerial preparation`,
    validateStageTransition({
      ...transitionBase(),
      plaintiffType: entityType,
      entityAuthority: authority,
      from: 'Decision Confirmation',
      to: 'Ministerial Filing Engine',
    }).ok);
}

{
  const result = validatePreparationEligibility({
    ...transitionBase(),
    plaintiffType: 'llc',
    entityAuthority: { ...validEntityAuthority, verificationStatus: 'unresolved' },
  });
  check('unresolved entity authority fails closed', !result.ok && result.reason === 'entity_authority_unresolved');
}

check('attestation-first entity authority passes when diligence is not required', validateEntityAuthority(validEntityAuthority).ok);

{
  const required = validateEntityAuthority({ ...validEntityAuthority, documentaryDiligenceStatus: 'required' });
  check('required documentary diligence cannot be silently treated as satisfied',
    !required.ok && required.reason === 'documentary_diligence_unresolved');
  const held = validateEntityAuthority({ ...validEntityAuthority, verificationStatus: 'held' });
  check('held authority verification fails closed', !held.ok && held.reason === 'entity_authority_verification_held');
}

{
  const result = validateEntityAuthority({ ...validEntityAuthority, signerAttested: false });
  check('missing entity signer attestation fails closed',
    !result.ok && result.reason === 'entity_authority_attestation_required');
}

{
  const result = validateStageTransition({
    ...transitionBase(),
    decision: decisionUnconfirmed,
    from: 'Decision Intelligence',
    to: 'Ministerial Filing Engine',
  });
  check('Decision Intelligence cannot directly enter ministerial mode',
    !result.ok && result.reason === 'customer_decision_not_confirmed');
}

check('Decision Confirmation + decision_to_file confirmation enables ministerial handoff',
  validateStageTransition({ ...transitionBase(), from: 'Decision Confirmation', to: 'Ministerial Filing Engine' }).ok);

{
  const result = validatePreparationEligibility({
    ...transitionBase(),
    decision: { ...decisionConfirmed, filingElectionsConfirmed: false },
  });
  check('unconfirmed filing elections fail closed', !result.ok && result.reason === 'filing_elections_not_confirmed');
}

for (const operation of ['recommend_file', 'recommend_not_file', 'select_form_claim_or_remedy', 'select_stronger_legal_theory'] as const) {
  const result = validateMinisterialOperation(operation);
  check(`${operation} is prohibited in the filing engine`,
    !result.ok && result.reason === 'prohibited_filing_engine_recommendation');
}
check('factual completeness validation remains permitted ministerially', validateMinisterialOperation('validate_factual_completeness').ok);

{
  const denied = validateStageTransition({ ...transitionBase(), from: 'Ministerial Filing Engine', to: 'Decision Intelligence' });
  check('ministerial mode cannot silently return to recommendations', !denied.ok && denied.reason === 'invalid_state_transition');
  check('explicit decision-review exit is permitted',
    validateStageTransition({
      ...transitionBase(),
      from: 'Ministerial Filing Engine',
      to: 'Decision Intelligence',
      intentionalDecisionReviewExit: true,
    }).ok);
}

const preparedOnly: Ud100MatterBoundarySnapshot = {
  preparation: 'prepared',
  filing: 'not_filed',
  representation: 'none',
};
check('packet preparation does not equal filing', preparedOnly.preparation === 'prepared' && preparedOnly.filing === 'not_filed');
const filedWithoutRepresentation: Ud100MatterBoundarySnapshot = {
  preparation: 'prepared',
  filing: 'customer_reported_filed',
  representation: 'none',
};
check('filing does not equal court representation',
  filedWithoutRepresentation.filing === 'customer_reported_filed' && filedWithoutRepresentation.representation === 'none');

check('authorized filing posture is customer-controlled', currentAuthorizedFilingPosture() === 'customer_controlled');
check('customer-controlled filing posture passes', validateFilingPosture('customer_controlled').ok);
{
  const result = validateFilingPosture('autonomous_direct');
  check('autonomous/direct filing posture is rejected', !result.ok && result.reason === 'autonomous_filing_not_authorized');
}

{
  const result = validateServiceGate({ mode: 'compensated_phase_c', udaLdaComplianceSatisfied: false });
  check('paid Phase C fails closed without UDA/LDA compliance representation',
    !result.ok && result.reason === 'paid_compliance_gate_unsatisfied');
}

check('satisfied paid compliance representation passes only the pure service gate',
  validateServiceGate({ mode: 'compensated_phase_c', udaLdaComplianceSatisfied: true }).ok);

{
  const result = validateServiceGate({ mode: 'free_limited_beta', compensationPresent: true });
  check('compensation inside free beta fails closed', !result.ok && result.reason === 'free_beta_compensation_present');
}

{
  const result = validatePreparationEligibility({ ...transitionBase(), plaintiffType: null });
  check('unresolved plaintiff type fails closed', !result.ok && result.reason === 'plaintiff_type_unresolved');
}

check('natural person does not require entity authority object', validatePreparationEligibility({ ...transitionBase(), entityAuthority: null }).ok);

{
  const route = validateMinisterialOperation('route_to_attorney');
  check('attorney routing is rejected', !route.ok && route.reason === 'attorney_routing_not_authorized');
  const representation = validateMinisterialOperation('represent_in_court');
  check('OwnerPilot court representation is rejected',
    !representation.ok && representation.reason === 'representation_boundary_violation');
  const signature = validateMinisterialOperation('sign_for_customer');
  check('OwnerPilot customer signature is rejected', !signature.ok && signature.reason === 'ownerpilot_signature_not_authorized');
  const filing = validateMinisterialOperation('autonomous_submit');
  check('autonomous filing is rejected', !filing.ok && filing.reason === 'autonomous_filing_not_authorized');
}

{
  const result = validateStageTransition({ ...transitionBase(), from: 'Decision Confirmation', to: 'Post-Filing Classification' });
  check('invalid stage transition returns typed rejection reason', !result.ok && result.reason === 'invalid_state_transition');
}

for (const hold of ['unsupported_or_uncertain', 'legal_control_hold', 'stale_source_hold'] as const) {
  const result = validatePreparationEligibility({ ...transitionBase(), materialControlHold: hold });
  check(`${hold} fails closed`, !result.ok && result.reason === 'material_control_held');
}
check('canonical fail-closed state vocabulary remains present',
  UD100_FAIL_CLOSED_STATES.includes('external_counsel_consultation_recommended'));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nPhase C UD-100 domain contracts and guards: all passed');
