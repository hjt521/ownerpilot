/**
 * Provider-neutral contracts for Conversational Intelligence Evaluation v2A.
 *
 * This module is evaluation-only. It does not call providers, read credentials,
 * persist customer data, modify Production chat, select a model, provide fallback,
 * or grant legal/product/execution authority.
 */

export const CONVERSATIONAL_TASK_CLASSES = [
  'NORMAL_OWNER_CONVERSATION',
  'DETERMINISTIC_RESULT_EXPLANATION',
  'TARGETED_CLARIFICATION',
  'LEGAL_BOUNDARY_EXPLANATION',
  'FACT_CORRECTION',
  'EVIDENCE_GROUNDING',
  'CURRENT_RESEARCH_SYNTHESIS',
  'CONFLICT_SYNTHESIS',
  'UNAUTHORIZED_ACTION_RESPONSE',
  'PDI_EXPLANATION',
] as const;

export type ConversationalTaskClass =
  (typeof CONVERSATIONAL_TASK_CLASSES)[number];

export const RETRIEVAL_MODES = [
  'NONE',
  'INJECTED_EVIDENCE_ONLY',
] as const;

export type RetrievalMode = (typeof RETRIEVAL_MODES)[number];

export const EVALUATION_ENVIRONMENT_ELIGIBILITY = [
  'LOCAL_SYNTHETIC_ONLY',
] as const;

export type EvaluationEnvironmentEligibility =
  (typeof EVALUATION_ENVIRONMENT_ELIGIBILITY)[number];

export const MODEL_ASSIGNMENT_ROLES = [
  'CONVERSATIONAL_REASONER',
  'RESEARCH_SYNTHESIZER',
  'CHALLENGER_ASSURANCE',
] as const;

export type ModelAssignmentRole =
  (typeof MODEL_ASSIGNMENT_ROLES)[number];

export const DETERMINISTIC_VALUE_KINDS = [
  'LEGAL_PRODUCT_JURISDICTION_DECISION',
  'DATE_SERVICE_PAYMENT_CALCULATION',
  'WORKFLOW_FACT',
] as const;

export type DeterministicValueKind =
  (typeof DETERMINISTIC_VALUE_KINDS)[number];

export interface DeterministicValue {
  id: string;
  kind: DeterministicValueKind;
  value: string;
  sourceRef: string;
}

export interface DeterministicControlSnapshot {
  version: string;
  values: readonly DeterministicValue[];
}

export const EVIDENCE_SOURCE_KINDS = [
  'GOVERNED_RECORD',
  'OFFICIAL_SOURCE',
  'SYNTHETIC_RESEARCH',
] as const;

export type EvidenceSourceKind =
  (typeof EVIDENCE_SOURCE_KINDS)[number];

export const EVIDENCE_TRUST_LEVELS = [
  'TRUSTED',
  'UNTRUSTED',
] as const;

export type EvidenceTrustLevel =
  (typeof EVIDENCE_TRUST_LEVELS)[number];

export interface EvidenceItem {
  id: string;
  sourceKind: EvidenceSourceKind;
  trust: EvidenceTrustLevel;
  locator: string;
  title: string;
  content: string;
  observedAt: string;
  conflictGroupId?: string;
  containsUntrustedInstructions: boolean;
}

export interface ResearchEvidenceBundle {
  mode: RetrievalMode;
  researchRequired: boolean;
  items: readonly EvidenceItem[];
  unresolvedConflictIds: readonly string[];
}

export interface GovernanceSourceRef {
  id: string;
  kind:
    | 'ARCHITECTURE_DIRECTIVE'
    | 'PRODUCT_CONTROL'
    | 'DETERMINISTIC_CONTROL';
  locator: string;
}

export interface EvaluationGovernanceSnapshot {
  snapshotVersion: string;
  sourceRefs: readonly GovernanceSourceRef[];
  deterministicControlsAuthoritative: true;
  evidenceIsAuthority: false;
  modelDecisionAuthority: 'NONE';
  executionAuthority: 'NONE';
  fallbackPolicy: 'NONE';
  productionPersonaImported: false;
}

export interface ConversationTurn {
  role: 'OWNER' | 'ASSISTANT';
  content: string;
}

export interface GovernedConversationInput {
  fixtureId: string;
  taskClass: ConversationalTaskClass;
  ownerMessage: string;
  priorTurns: readonly ConversationTurn[];
  governance: EvaluationGovernanceSnapshot;
  deterministicControls: DeterministicControlSnapshot;
  evidence: ResearchEvidenceBundle;
  requiredControlIds: readonly string[];
  requiredEvidenceIds: readonly string[];
  clarificationExpected: boolean;
}

export interface ModelAssignment {
  role: ModelAssignmentRole;
  provider: string;
  model: string;
  taskClass: ConversationalTaskClass;
  retrievalMode: RetrievalMode;
  environmentEligibility: EvaluationEnvironmentEligibility;
  tools: readonly string[];
  fallback: 'NONE';
  authority: 'NONE';
}

export const AUTHORITY_CLAIM_KINDS = [
  'FILING_READINESS',
  'FORM_REQUIREDNESS',
  'SERVICE_SUFFICIENCY',
  'LEGAL_EFFECT',
  'CUSTOMER_ENTITLEMENT',
  'COURT_ACCEPTANCE',
] as const;

export type AuthorityClaimKind =
  (typeof AUTHORITY_CLAIM_KINDS)[number];

export interface CandidateAuthorityClaim {
  kind: AuthorityClaimKind;
  value: string;
  sourceControlId: string | null;
}

export const EXTERNAL_ACTION_KINDS = [
  'SEND',
  'FILE',
  'SERVE',
  'SIGN',
  'NEGOTIATE',
  'EXECUTE',
] as const;

export type ExternalActionKind =
  (typeof EXTERNAL_ACTION_KINDS)[number];

export interface CandidateExternalActionClaim {
  action: ExternalActionKind;
  status: 'OCCURRED' | 'NOT_OCCURRED';
}

export interface CandidateControlAcknowledgement {
  controlId: string;
  value: string;
}

export interface ConversationalCandidateOutput {
  schemaVersion: 'conversational-candidate-v2a';
  answer: string;
  clarificationQuestion: string | null;
  citations: readonly string[];
  controlAcknowledgements: readonly CandidateControlAcknowledgement[];
  authorityClaims: readonly CandidateAuthorityClaim[];
  unresolvedConflictIds: readonly string[];
  followedEvidenceInstructionIds: readonly string[];
  externalActionClaims: readonly CandidateExternalActionClaim[];
  authorityTransition: 'RECOMMENDATION_ONLY' | 'OWNER_DECISION' | 'EXECUTION';
  recommendations: readonly string[];
  ownerDecisionRecorded: boolean;
  executionOccurred: boolean;
}

export interface CandidateRunMetrics {
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostMicros: number | null;
}

export interface InjectedCandidateRunReport {
  runStatus: 'COMPLETED' | 'PROVIDER_FAILED';
  actualProvider: string;
  actualModel: string;
  fallbackUsed: boolean;
  providerFailureClass: string | null;
  output: unknown;
  metrics: CandidateRunMetrics;
}

export interface InjectedEvaluationRequest {
  assignment: ModelAssignment;
  input: GovernedConversationInput;
}

export type InjectedCandidateRunner = (
  request: InjectedEvaluationRequest,
) => Promise<InjectedCandidateRunReport>;

export const HARD_GATE_FAILURE_CODES = [
  'DETERMINISTIC_DECISION_CHANGED',
  'DETERMINISTIC_CALCULATION_CHANGED',
  'UNAUTHORIZED_AUTHORITY_CLAIM',
  'EXTERNAL_ACTION_CLAIMED',
  'RECOMMENDATION_PROMOTED',
  'EVIDENCE_CONFLICT_CONCEALED',
  'UNTRUSTED_EVIDENCE_INSTRUCTION_FOLLOWED',
  'OUTPUT_CONTRACT_INVALID',
  'PROVIDER_SUBSTITUTION',
  'FALLBACK_USED',
  'PROVIDER_FAILURE',
] as const;

export type HardGateFailureCode =
  (typeof HARD_GATE_FAILURE_CODES)[number];

export interface HardGateFailure {
  code: HardGateFailureCode;
  detail: string;
}

export interface HardGateResult {
  passed: boolean;
  failures: readonly HardGateFailure[];
}

export const CONVERSATIONAL_QUALITY_DIMENSIONS = [
  'FACTUAL_CONTEXT_ACCURACY',
  'USEFULNESS_DIRECTNESS',
  'NATURAL_CONVERSATIONAL_QUALITY',
  'CLARIFICATION_BEHAVIOR',
  'INSTRUCTION_FOLLOWING',
  'MULTI_TURN_CONTEXT_RETENTION',
  'GROUNDING_PROVENANCE_FIDELITY',
  'UNCERTAINTY_HANDLING',
  'CONFLICT_DISSENT_HANDLING',
  'RECOMMENDATION_AUTHORITY_SEPARATION',
  'DRAFTING_USEFULNESS',
] as const;

export type ConversationalQualityDimension =
  (typeof CONVERSATIONAL_QUALITY_DIMENSIONS)[number];

export interface QualityObservation {
  dimension: ConversationalQualityDimension;
  finding: 'NOT_SCORED' | 'STRONG' | 'ACCEPTABLE' | 'WEAK' | 'FAILED';
  rationale: string;
}

export interface EvaluationResult {
  fixtureId: string;
  assignment: ModelAssignment;
  hardGates: HardGateResult;
  output: ConversationalCandidateOutput | null;
  qualityObservations: readonly QualityObservation[];
  metrics: CandidateRunMetrics;
  providerFailureClass: string | null;
  humanReviewRequired: true;
  automaticWinner: false;
  compositeScore: null;
}

export interface ConversationalEvaluationFixture {
  id: string;
  title: string;
  category: string;
  input: GovernedConversationInput;
}

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
      issues: readonly [];
    }
  | {
      ok: false;
      value: null;
      issues: readonly string[];
    };
