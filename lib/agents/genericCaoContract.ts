/**
 * Business-neutral structural contract for a bounded Chief Architecture
 * Officer advisory role.
 *
 * This module defines types and closed vocabularies only. It does not activate
 * a role, grant authority, select a model, read evidence, call a provider,
 * execute tools, persist data, initiate another role, or perform an action.
 *
 * Enterprise identity, governing artifacts, role authorization, business
 * restrictions, platform controls, and runtime implementation are supplied
 * externally through separately governed specialization and infrastructure
 * layers.
 */

export const GENERIC_CAO_CONTRACT_VERSION =
  'generic-cao-contract-v1' as const;

export const GENERIC_CAO_LIFECYCLE_STATES = [
  'draft',
  'awaiting_human_review',
  'approved_for_draft_use',
  'revision_required',
  'rejected',
  'terminated',
] as const;

export type GenericCaoLifecycleState =
  (typeof GENERIC_CAO_LIFECYCLE_STATES)[number];

export const GENERIC_CAO_FAILURE_PHASES = [
  'assignment_validation',
  'authority_validation',
  'evidence_intake',
  'deliberation',
  'output_validation',
  'human_review',
  'termination',
] as const;

export type GenericCaoFailurePhase =
  (typeof GENERIC_CAO_FAILURE_PHASES)[number];

export const GENERIC_CAO_TERMINATION_REASONS = [
  'completed_for_human_review',
  'invalid_assignment',
  'authority_not_established',
  'evidence_unavailable',
  'evidence_insufficient',
  'prohibited_action_required',
  'approval_required',
  'limit_reached',
  'execution_failure',
  'human_termination',
] as const;

export type GenericCaoTerminationReason =
  (typeof GENERIC_CAO_TERMINATION_REASONS)[number];

export interface GenericCaoGoverningReference {
  id: string;
  artifactKind: string;
  locator: string;
  version: string;
  authoritySourceReference: string;
}

export interface GenericCaoAuthorityDeclaration {
  authoritySourceReferences: readonly string[];
  permittedActionClasses: readonly string[];
  prohibitedActionClasses: readonly string[];
  approvalRequirements: readonly string[];
  escalationConditions: readonly string[];
  environmentEligibility: readonly string[];
  authorityGrantingMode: 'external_only';
}

export interface GenericCaoEvidenceReference {
  id: string;
  sourceKind: string;
  locator: string;
  description: string;
  classification: string;
  versionReference: string | null;
  integrityReference: string | null;
  available: boolean;
}

export interface GenericCaoAssignment {
  contractVersion:
    typeof GENERIC_CAO_CONTRACT_VERSION;
  assignmentId: string;
  executiveIdentity: string;
  taskClass: string;
  objective: string;
  governingReferences:
    readonly GenericCaoGoverningReference[];
  authority:
    GenericCaoAuthorityDeclaration;
  evidence:
    readonly GenericCaoEvidenceReference[];
  constraints: readonly string[];
  knownDecisions: readonly string[];
  unresolvedQuestions: readonly string[];
  requestedOutputKind: string;
  explicitHumanInitiation: true;
}

export interface GenericCaoAlternative {
  id: string;
  description: string;
  benefits: readonly string[];
  tradeoffs: readonly string[];
  risks: readonly string[];
  reversibility: readonly string[];
  evidenceReferences: readonly string[];
}

export interface GenericCaoRecommendation {
  summary: string;
  rationale: readonly string[];
  evidenceReferences: readonly string[];
  assumptions: readonly string[];
  limitations: readonly string[];
  confidenceDescription: string;
}

export interface GenericCaoAdvisoryOutput {
  contractVersion:
    typeof GENERIC_CAO_CONTRACT_VERSION;
  assignmentId: string;
  facts: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  alternatives: readonly GenericCaoAlternative[];
  recommendation:
    GenericCaoRecommendation | null;
  dissent: readonly string[];
  risks: readonly string[];
  requiredHumanDecisions: readonly string[];
  prohibitedOrUnavailableActions:
    readonly string[];
  evidenceReferences: readonly string[];
  auditReferences: readonly string[];
  draftArtifact: string;
  humanReviewRequired: true;
  implementationAuthorityGranted: false;
  autonomousContinuationAllowed: false;
}

export interface GenericCaoHumanDisposition {
  disposition:
    | 'pending'
    | 'approved_for_draft_use'
    | 'revision_required'
    | 'rejected';
  recordedBy: string | null;
  recordedAt: string | null;
  authorityReference: string | null;
  notes: readonly string[];
}

export interface GenericCaoFailure {
  phase: GenericCaoFailurePhase;
  code: string;
  sanitizedDetail: string | null;
  evidenceReferences: readonly string[];
  retryAuthorized: false;
  repairAuthorized: false;
  continuationAuthorized: false;
}

export interface GenericCaoTermination {
  state: 'terminated';
  reason: GenericCaoTerminationReason;
  outputReleasedForHumanReview: boolean;
  humanDisposition:
    GenericCaoHumanDisposition;
  implementationPerformed: false;
  externalActionPerformed: false;
  persistencePerformed: false;
  autonomousContinuationPerformed: false;
}

export interface GenericCaoLifecycleRecord {
  assignmentId: string;
  state: GenericCaoLifecycleState;
  startedAt: string;
  completedAt: string | null;
  humanDisposition:
    GenericCaoHumanDisposition;
  failure: GenericCaoFailure | null;
  termination: GenericCaoTermination | null;
  auditReferences: readonly string[];
}
