/**
 * Synthetic-only human-mediated executive workflow contracts.
 *
 * These contracts create no runtime activation, provider lookup, tool use,
 * persistence, automatic dispatch, Preview activation, or Production action.
 */

import type {
  AllowedToolPermission,
  EvidenceState,
  ExecutiveRoleId,
  HumanDisposition,
  ModelAssignmentUse,
  PermittedAuthorityCategory,
  ReasoningLevel,
  TaskClass,
} from '../ai/modelRegistry';

import type {
  ExecutiveAgentDraftOutput,
} from './evaluation/modelEvaluation';

export const HUMAN_MEDIATED_WORKFLOW_VERSION =
  'executive-human-mediated-workflow-v1' as const;

export const AUTHORIZED_HUMAN_CLASSES = [
  'founder',
  'human_engineering_reviewer',
  'designated_human_reviewer',
  'founder_designated_human_requester',
] as const;

export type AuthorizedHumanClass =
  (typeof AUTHORIZED_HUMAN_CLASSES)[number];

export const INFORMATION_CLASSIFICATIONS = [
  'human_instruction',
  'verified_fact',
  'reported_status',
  'source_assertion',
  'assumption',
  'unknown',
  'constraint',
  'risk',
  'recommendation',
  'proposal',
  'dissent',
  'human_decision_required',
  'prohibited_or_unavailable_action',
] as const;

export type InformationClassification =
  (typeof INFORMATION_CLASSIFICATIONS)[number];

export const WORKFLOW_EVIDENCE_SOURCE_KINDS = [
  'repository',
  'approved_document',
  'synthetic_fixture',
  'sanitized_preview_log',
  'approved_meeting_record',
  'approved_status_record',
  'prior_role_draft_via_human_handoff',
] as const;

export type WorkflowEvidenceSourceKind =
  (typeof WORKFLOW_EVIDENCE_SOURCE_KINDS)[number];

export const WORKFLOW_EVIDENCE_ORIGINS = [
  'founder',
  'human_engineering_reviewer',
  'designated_human_reviewer',
  'founder_designated_human_requester',
  'approved_repository_source',
  'approved_document',
  'sanitized_preview_evidence',
  'approved_meeting_record',
  'approved_status_record',
  'prior_role_draft_via_human_handoff',
  'synthetic_fixture',
] as const;

export type WorkflowEvidenceOrigin =
  (typeof WORKFLOW_EVIDENCE_ORIGINS)[number];

export const EVIDENCE_VERIFICATION_STATES = [
  'verified',
  'reported',
  'unverified',
  'disputed',
  'unknown',
] as const;

export type EvidenceVerificationState =
  (typeof EVIDENCE_VERIFICATION_STATES)[number];

export const EVIDENCE_TRANSFER_PERMISSIONS = [
  'this_role_only',
  'human_handoff_permitted',
] as const;

export type EvidenceTransferPermission =
  (typeof EVIDENCE_TRANSFER_PERMISSIONS)[number];

export const EXECUTIVE_WORKFLOW_STATES = [
  'draft_request_prepared',
  'awaiting_human_initiation',
  'role_run_authorized',
  'role_draft_completed',
  'role_escalation_required',
  'awaiting_human_review',
  'revision_required',
  'approved_for_draft_use',
  'rejected',
  'handoff_prepared',
  'handoff_explicitly_authorized',
  'receiving_role_run_authorized',
  'receiving_role_draft_completed',
  'final_human_disposition_pending',
  'workflow_closed',
] as const;

export type ExecutiveWorkflowState =
  (typeof EXECUTIVE_WORKFLOW_STATES)[number];

export const WORKFLOW_CONTRACT_BOUNDS = {
  identifierCharacters: 128,
  humanLabelCharacters: 256,
  humanInstructionCharacters: 8_000,
  evidenceItems: 64,
  priorRoleDraftReferences: 12,
  knownConstraints: 32,
  disagreementPositions: 12,
  evidenceReferencesPerPosition: 32,
  assumptions: 32,
  unknowns: 32,
  recommendations: 32,
  dissentEntries: 32,
  requiredHumanDecisions: 32,
  omittedSections: 32,
} as const;

export const HUMAN_AUTHORIZATION_SCOPE_KINDS = [
  'run',
  'handoff',
] as const;

export type HumanAuthorizationScopeKind =
  (typeof HUMAN_AUTHORIZATION_SCOPE_KINDS)[number];

export interface HumanAuthorizationReference {
  humanClass: AuthorizedHumanClass;
  humanIdentifier: string;
  approvalReference: string;
  scopeKind: HumanAuthorizationScopeKind;
  scopeId: string;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  authorizedAt: string;
  authorizationVersion: string;
}

export interface ExecutiveEvidenceItem {
  evidenceId: string;
  sourceKind: WorkflowEvidenceSourceKind;
  locator: string;
  description: string;
  classification: InformationClassification;
  origin: WorkflowEvidenceOrigin;
  verificationState: EvidenceVerificationState;
  introducedByHuman: true;
  transferPermission: EvidenceTransferPermission;
  verbatimPreservationRequired: boolean;
  sensitiveContentPresent: false;
  note?: string;
}

export interface RoleDraftReference {
  draftReferenceId: string;
  originatingRunId: string;
  originatingRoleId: ExecutiveRoleId;
  taskClass: TaskClass;
  sourceCommitSha: string;
  disposition: HumanDisposition;
  noncanonical: true;
  pendingSubstantiveApproval: boolean;
  evidenceReferences: readonly string[];
  dissent: readonly string[];
  unknowns: readonly string[];
  requiredHumanDecisions: readonly string[];
}

export const HUMAN_DISPOSITION_SOURCE_KINDS = [
  'founder',
  'human_engineering_reviewer',
  'designated_human_reviewer',
  'founder_designated_human_requester',
] as const;

export type HumanDispositionSourceKind =
  (typeof HUMAN_DISPOSITION_SOURCE_KINDS)[number];

export interface HumanDispositionRecord {
  dispositionRecordId: string;
  workflowId: string;
  runId: string;
  handoffId: string | null;
  disposition: HumanDisposition;
  sourceKind: HumanDispositionSourceKind;
  sourceIdentifier: string;
  recordedAt: string;
  reason: string;
  resolutionReference: string | null;
  permitsDraftReview: boolean;
  permitsDraftQuotation: boolean;
  permitsDraftComparison: boolean;
  permitsDraftRevision: boolean;
  permitsNoncanonicalIncorporation: boolean;
  permitsHumanMediatedHandoff: boolean;
  implementationAuthorized: false;
  publicationAuthorized: false;
  repositoryModificationAuthorized: false;
  previewActivationAuthorized: false;
  productionUseAuthorized: false;
}

export interface ExecutiveWorkflowEnvelope {
  workflowVersion:
    typeof HUMAN_MEDIATED_WORKFLOW_VERSION;
  workflowId: string;
  runId: string;
  handoffId: string | null;
  parentHandoffId: string | null;
  humanAuthorization: HumanAuthorizationReference;
  explicitHumanInitiation: true;
  sourceCommitSha: string;
  environment: 'preview';
  roleId: ExecutiveRoleId;
  charterVersion: string;
  registryVersion: string;
  registryEntryHash: string;
  requestedTaskClass: TaskClass;
  requestedModelSlot:
    Exclude<ModelAssignmentUse, 'fallback'>;
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  adapterId: string;
  reasoningLevel: ReasoningLevel;
  evidenceState: EvidenceState;
  evidenceItems: readonly ExecutiveEvidenceItem[];
  priorRoleDraftReferences:
    readonly RoleDraftReference[];
  knownConstraints: readonly string[];
  requestedAuthorityCategories:
    readonly PermittedAuthorityCategory[];
  requestedTools: readonly AllowedToolPermission[];
  humanInstructions: string;
  currentHumanDisposition: HumanDisposition;
  createdAt: string;
  supersedesHandoffId: string | null;
  automaticContinuation: false;
  authorityExpansionRequested: false;
}

export const MATERIAL_DISAGREEMENT_VERSION =
  'material-disagreement-v2' as const;

export const DISAGREEMENT_POSITION_ORIGINS = [
  'founder',
  'human_engineering_reviewer',
  'designated_human_reviewer',
  'founder_designated_human_requester',
  'executive.ceo',
  'executive.chief_of_staff',
  'executive.chief_architecture_officer',
  'governing_source_evidence',
] as const;

export type DisagreementPositionOrigin =
  (typeof DISAGREEMENT_POSITION_ORIGINS)[number];

export interface DisagreementPositionV2 {
  positionId: string;
  origin: DisagreementPositionOrigin;
  statement: string;
  evidenceReferences: readonly string[];
  unsupportedAssertions: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  consequenceIfWrong: string;
}

export interface MaterialDisagreementV2 {
  version: typeof MATERIAL_DISAGREEMENT_VERSION;
  disagreementId: string;
  issueInDispute: string;
  positions: readonly DisagreementPositionV2[];
  affectedDependencies: readonly string[];
  securityConsequences: readonly string[];
  reliabilityConsequences: readonly string[];
  costConsequences: readonly string[];
  latencyConsequences: readonly string[];
  reversibilityConsequences: readonly string[];
  consequenceOfDelay: string | null;
  recommendedOption: string | null;
  confidenceAndLimitations: readonly string[];
  recommendedHumanDecisionOwner:
    'founder' | 'human_reviewer';
  founderApprovalRequired: boolean;
  humanDisposition: HumanDisposition | null;
  dispositionSource:
    HumanDispositionRecord | null;
  preservationRequired: true;
  resolved: boolean;
  humanResolutionReference: string | null;
}

export interface ExecutiveEscalationPacket {
  escalationPacketId: string;
  workflowId: string;
  runId: string;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  issue: string;
  evidenceAvailable: readonly string[];
  evidenceMissing: readonly string[];
  options: readonly string[];
  risks: readonly string[];
  requiredHumanDecision: string;
  founderApprovalRequired: boolean;
  verifiedStatus: readonly string[];
  conflictingEvidence: readonly string[];
  affectedDependencies: readonly string[];
  governingConstraints: readonly string[];
  affectedComponents: readonly string[];
  reversibilityConcerns: readonly string[];
  automaticActionAuthorized: false;
}

export interface ClarificationRequestProposal {
  clarificationRequestId: string;
  workflowId: string;
  runId: string;
  roleId: ExecutiveRoleId;
  question: string;
  reason: string;
  evidenceReferences: readonly string[];
  addressedToHuman: true;
  toolCallRequested: false;
  roleDispatchRequested: false;
  automaticContinuationRequested: false;
  evidenceCollectionAuthorized: false;
}

export interface FounderApprovalChecklistItem {
  checklistItemId: string;
  approvalQuestion: string;
  approvalReferenceRequired: boolean;
  currentlyApproved: boolean;
  humanDecisionRequired: true;
  evidenceReferences: readonly string[];
}

export interface RiskDependencyItem {
  itemId: string;
  itemKind: 'risk' | 'dependency';
  statement: string;
  evidenceReferences: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  consequence: string;
  humanDecisionRequired: boolean;
}

export interface StrategicOptionDraft {
  optionId: string;
  title: string;
  summary: string;
  evidenceReferences: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  tradeoffs: readonly string[];
  risks: readonly string[];
  dependencies: readonly string[];
  reversible: boolean | null;
}

export interface HumanMediatedRoleOutput<
  TExtension,
> {
  workflowId: string;
  runId: string;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  commonOutput: ExecutiveAgentDraftOutput;
  roleExtension: TExtension;
  materialDisagreements:
    readonly MaterialDisagreementV2[];
  escalationPacket:
    ExecutiveEscalationPacket | null;
  clarificationRequests:
    readonly ClarificationRequestProposal[];
  humanDecisionRequired: true;
  automaticApproval: false;
  automaticSelection: false;
  automaticContinuation: false;
  roleDispatchPerformed: false;
  toolExecutionPerformed: false;
  persistencePerformed: false;
  previewActivationPerformed: false;
  productionEligible: false;
}

export const CEO_ARTIFACT_KINDS = [
  'strategic_option_memorandum',
  'operating_priority_proposal',
  'executive_brief',
  'draft_decision_memorandum',
  'risk_and_dependency_register',
  'additional_evidence_request',
  'explicit_disagreement_statement',
  'uncertainty_and_limitation_statement',
  'founder_approval_checklist',
] as const;

export type CeoArtifactKind =
  (typeof CEO_ARTIFACT_KINDS)[number];

export interface CeoDraftExtension {
  extensionVersion:
    'executive-ceo-draft-extension-v1';
  artifactKind: CeoArtifactKind;
  strategicOptions:
    readonly StrategicOptionDraft[];
  preferredOptionId: string | null;
  preferredOptionRationale:
    readonly string[];
  tradeoffs: readonly string[];
  riskAndDependencyRegister:
    readonly RiskDependencyItem[];
  additionalEvidenceRequests:
    readonly ClarificationRequestProposal[];
  founderApprovalChecklist:
    readonly FounderApprovalChecklistItem[];
  materialDisagreementIds:
    readonly string[];
  approvalsStillRequired:
    readonly string[];
  implementationAuthorized: false;
  publicationAuthorized: false;
  roleDispatchAuthorized: false;
}

export type CeoHumanMediatedOutput =
  HumanMediatedRoleOutput<CeoDraftExtension>;

export const CHIEF_OF_STAFF_ARTIFACT_KINDS = [
  'meeting_agenda_draft',
  'executive_status_brief',
  'follow_up_register',
  'dependency_map',
  'decision_log',
  'proposed_work_item_sequence',
  'proposed_owner_and_deadline_register',
  'unresolved_question_list',
  'escalation_packet',
  'disagreement_summary',
  'founder_approval_checklist',
] as const;

export type ChiefOfStaffArtifactKind =
  (typeof CHIEF_OF_STAFF_ARTIFACT_KINDS)[number];

export interface ReportedStatusRecord {
  statusId: string;
  statement: string;
  sourceReference: string;
  verificationState:
    EvidenceVerificationState;
  evidenceReferences: readonly string[];
  verifiedFact: false;
}

export interface StatusTransformationRecord {
  transformationId: string;
  sourceReference: string;
  sourceClassification:
    InformationClassification;
  resultingClassification:
    InformationClassification;
  transformationDescription: string;
  classificationChanged: boolean;
  humanApprovalReference: string | null;
  silentReclassificationPerformed: false;
}

export interface WorkflowDependencyItem {
  dependencyId: string;
  statement: string;
  upstreamReferences: readonly string[];
  downstreamReferences: readonly string[];
  evidenceReferences: readonly string[];
  blockers: readonly string[];
  unresolved: boolean;
}

export interface ProposedOwnerRecord {
  proposalId: string;
  workItemReference: string;
  proposedOwnerLabel: string;
  rationale: string;
  evidenceReferences: readonly string[];
  approvalStatus: 'unapproved';
  bindingAssignmentCreated: false;
}

export interface ProposedDeadlineRecord {
  proposalId: string;
  workItemReference: string;
  proposedDeadline: string;
  rationale: string;
  evidenceReferences: readonly string[];
  approvalStatus: 'unapproved';
  bindingCommitmentCreated: false;
}

export interface ProposedWorkSequenceItem {
  sequenceItemId: string;
  workItemReference: string;
  proposedOrder: number;
  dependencies: readonly string[];
  blockers: readonly string[];
  rationale: string;
  approvalStatus: 'unapproved';
}

export interface RecordedHumanDecision {
  decisionRecordId: string;
  decisionStatement: string;
  humanDecisionReference: string;
  recordedBy:
    HumanDispositionSourceKind;
  recordedAt: string;
  evidenceReferences: readonly string[];
  modelGeneratedDecision: false;
}

export interface ChiefOfStaffDraftExtension {
  extensionVersion:
    'executive-chief-of-staff-draft-extension-v1';
  artifactKind: ChiefOfStaffArtifactKind;
  verifiedFacts: readonly string[];
  reportedStatuses:
    readonly ReportedStatusRecord[];
  proposals: readonly string[];
  statusTransformations:
    readonly StatusTransformationRecord[];
  dependencyItems:
    readonly WorkflowDependencyItem[];
  proposedWorkSequence:
    readonly ProposedWorkSequenceItem[];
  proposedOwners:
    readonly ProposedOwnerRecord[];
  proposedDeadlines:
    readonly ProposedDeadlineRecord[];
  unresolvedQuestions: readonly string[];
  disagreementSummaryIds:
    readonly string[];
  escalationPacketId: string | null;
  recordedHumanDecisions:
    readonly RecordedHumanDecision[];
  founderApprovalChecklist:
    readonly FounderApprovalChecklistItem[];
  artificialConsensusCreated: false;
  adjudicationPerformed: false;
  bindingAssignmentAuthorized: false;
  bindingDeadlineAuthorized: false;
  roleDispatchAuthorized: false;
}

export type ChiefOfStaffHumanMediatedOutput =
  HumanMediatedRoleOutput<
    ChiefOfStaffDraftExtension
  >;

export const CAO_ARTIFACT_KINDS = [
  'architecture_option_memorandum',
  'dependency_and_impact_map',
  'interface_proposal',
  'schema_proposal',
  'adapter_boundary_proposal',
  'reversibility_analysis',
  'security_and_reliability_risk_analysis',
  'test_and_evaluation_plan',
  'implementation_sequence_proposal',
  'noncanonical_adr_style_draft',
  'explicit_technical_dissent',
  'additional_evidence_request',
  'founder_approval_checklist',
] as const;

export type CaoArtifactKind =
  (typeof CAO_ARTIFACT_KINDS)[number];

export interface ArchitectureEvidenceRecord {
  evidenceId: string;
  locator: string;
  sourceCommitSha: string;
  description: string;
  available: boolean;
  evidenceReferences: readonly string[];
}

export interface ArchitectureAlternativeDraft {
  alternativeId: string;
  title: string;
  summary: string;
  evidenceReferences: readonly string[];
  constraints: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  affectedComponents: readonly string[];
  securityConsequences: readonly string[];
  reliabilityConsequences: readonly string[];
  costConsequences: readonly string[];
  latencyConsequences: readonly string[];
  reversibilityConsequences: readonly string[];
  implementationAuthorized: false;
}

export interface UnimplementedArchitectureProposal {
  proposalId: string;
  proposalKind:
    | 'interface'
    | 'schema'
    | 'adapter_boundary';
  title: string;
  description: string;
  evidenceReferences: readonly string[];
  affectedComponents: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  markedUnimplemented: true;
  migrationAuthorized: false;
  repositoryModificationAuthorized: false;
  providerAssignmentAuthorized: false;
  adapterAssignmentAuthorized: false;
}

export interface ArchitectureRiskAnalysis {
  analysisId: string;
  riskKind:
    | 'security'
    | 'reliability'
    | 'cost'
    | 'latency'
    | 'reversibility';
  findings: readonly string[];
  evidenceReferences: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  humanDecisionRequired: boolean;
}

export interface TestEvaluationPlanDraft {
  planId: string;
  objective: string;
  syntheticOnly: true;
  proposedCases: readonly string[];
  acceptanceCriteria: readonly string[];
  evidenceReferences: readonly string[];
  executionAuthorized: false;
}

export interface ProposedImplementationSequence {
  sequenceId: string;
  proposedSteps: readonly string[];
  dependencies: readonly string[];
  blockers: readonly string[];
  rollbackConsiderations: readonly string[];
  approvalStatus: 'unapproved';
  implementationAuthorized: false;
}

export interface TechnicalDissentRecord {
  dissentId: string;
  issue: string;
  position: string;
  evidenceReferences: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  confidenceAndLimitations: readonly string[];
  consequenceIfIgnored: string;
  preservationRequired: true;
}

export interface CaoDraftExtension {
  extensionVersion:
    'executive-chief-architecture-officer-draft-extension-v1';
  artifactKind: CaoArtifactKind;
  evidenceInspected:
    readonly ArchitectureEvidenceRecord[];
  evidenceUnavailable:
    readonly ArchitectureEvidenceRecord[];
  alternativesConsidered:
    readonly ArchitectureAlternativeDraft[];
  affectedComponents: readonly string[];
  architectureProposals:
    readonly UnimplementedArchitectureProposal[];
  riskAnalyses:
    readonly ArchitectureRiskAnalysis[];
  reversibilityAnalysis:
    readonly ArchitectureRiskAnalysis[];
  testAndEvaluationPlans:
    readonly TestEvaluationPlanDraft[];
  proposedImplementationSequences:
    readonly ProposedImplementationSequence[];
  recommendedOptionId: string | null;
  technicalDissent:
    readonly TechnicalDissentRecord[];
  confidenceAndLimitations:
    readonly string[];
  founderApprovalChecklist:
    readonly FounderApprovalChecklistItem[];
  approvalsStillRequired:
    readonly string[];
  constitutionalInterpretationPerformed: false;
  legalInterpretationPerformed: false;
  adrRatificationPerformed: false;
  implementationAuthorized: false;
  repositoryModificationAuthorized: false;
  migrationAuthorized: false;
  deploymentAuthorized: false;
  roleDispatchAuthorized: false;
}

export type CaoHumanMediatedOutput =
  HumanMediatedRoleOutput<CaoDraftExtension>;

export const HANDOFF_TRANSFER_SECTIONS = [
  'facts',
  'assumptions',
  'unknowns',
  'recommendations',
  'dissent',
  'required_human_decisions',
  'prohibited_or_unavailable_actions',
  'evidence_references',
  'draft_artifact',
  'role_extension',
  'material_disagreements',
  'escalation_packet',
  'clarification_requests',
] as const;

export type HandoffTransferSection =
  (typeof HANDOFF_TRANSFER_SECTIONS)[number];

export interface HandoffOmissionRecord {
  section: HandoffTransferSection;
  reason: string;
  materialDissentOmitted: false;
  materialUnknownOmitted: false;
  requiredHumanDecisionOmitted: false;
}

export interface HumanMediatedHandoff {
  handoffId: string;
  workflowId: string;
  parentHandoffId: string | null;
  originatingRunId: string;
  originatingRoleId: ExecutiveRoleId;
  receivingRoleId: ExecutiveRoleId;
  originatingDraftReference:
    RoleDraftReference;
  originatingDraftStatus:
    'noncanonical_draft';
  originatingHumanDisposition:
    HumanDisposition;
  substantiveApprovalOccurred: false;
  sectionsSelectedForTransfer:
    readonly HandoffTransferSection[];
  humanSummaryOrInstruction: string;
  humanAuthorization:
    HumanAuthorizationReference;
  humanConfirmationNoncanonical: true;
  humanConfirmationNoSubstantiveApproval: true;
  evidenceReferencesTransferred:
    readonly string[];
  dissentTransferred: readonly string[];
  unknownsTransferred: readonly string[];
  requiredHumanDecisionsTransferred:
    readonly string[];
  materialDisagreementsTransferred:
    readonly MaterialDisagreementV2[];
  omissions: readonly HandoffOmissionRecord[];
  requestedTaskClassForReceiver: TaskClass;
  createdAt: string;
  receivingRoleDisposition:
    HumanDisposition;
  receivingRoleSeparatelyInitiated: false;
  automaticContinuation: false;
  inheritedApproval: false;
  roleDispatchPerformed: false;
  authorityExpansionRequested: false;
  implementationAuthorized: false;
  toolPermissionInherited: false;
  modelAssignmentInherited: false;
}

export interface PendingDraftHandoffConditions {
  originatingDisposition: 'pending';
  explicitlyHumanAuthorized: true;
  originatingDraftRemainsPending: true;
  originatingDraftRemainsNoncanonical: true;
  noSubstantiveApprovalOccurred: true;
  materialDissentPreserved: true;
  materialUnknownsPreserved: true;
  evidenceReferencesPreserved: true;
  requiredHumanDecisionsPreserved: true;
  receivingRoleIndependentlyAuthorized: true;
  receivingRoleSeparatelyInitiated: true;
}

export interface WorkflowClosureRecord {
  closureRecordId: string;
  workflowId: string;
  closedBy:
    HumanDispositionSourceKind;
  closedByIdentifier: string;
  closedAt: string;
  closureReason: string;
  unresolvedDisagreementIds:
    readonly string[];
  unresolvedDissentRemainsVisible: true;
  consensusClaimed: false;
  disagreementResolutionImplied: false;
  implementationAuthorized: false;
  previewActivationAuthorized: false;
  productionActivationAuthorized: false;
}

export interface ExecutiveWorkflowTransition {
  from: ExecutiveWorkflowState;
  to: ExecutiveWorkflowState;
  affirmativeHumanActionRequired: boolean;
  automaticTransitionPermitted: false;
  description: string;
}

export const EXECUTIVE_WORKFLOW_TRANSITIONS = [
  {
    from: 'draft_request_prepared',
    to: 'awaiting_human_initiation',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human accepts the prepared request for initiation review.',
  },
  {
    from: 'awaiting_human_initiation',
    to: 'role_run_authorized',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'An authorized human explicitly initiates one bounded role run.',
  },
  {
    from: 'role_run_authorized',
    to: 'role_draft_completed',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The already-authorized single-role run returns one valid draft.',
  },
  {
    from: 'role_run_authorized',
    to: 'role_escalation_required',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The already-authorized single-role run returns an escalation.',
  },
  {
    from: 'role_draft_completed',
    to: 'awaiting_human_review',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The completed draft is presented for human review.',
  },
  {
    from: 'role_escalation_required',
    to: 'awaiting_human_review',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The escalation packet is presented for human review.',
  },
  {
    from: 'awaiting_human_review',
    to: 'revision_required',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human records that a separately initiated revision is required.',
  },
  {
    from: 'awaiting_human_review',
    to: 'approved_for_draft_use',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human permits only the bounded noncanonical draft uses.',
  },
  {
    from: 'awaiting_human_review',
    to: 'rejected',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human explicitly rejects the draft.',
  },
  {
    from: 'awaiting_human_review',
    to: 'handoff_prepared',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human selects bounded content for a possible handoff.',
  },
  {
    from: 'revision_required',
    to: 'draft_request_prepared',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human prepares a new request; no automatic retry occurs.',
  },
  {
    from: 'approved_for_draft_use',
    to: 'handoff_prepared',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human prepares a nonauthorizing handoff.',
  },
  {
    from: 'handoff_prepared',
    to: 'handoff_explicitly_authorized',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human explicitly authorizes the specific handoff.',
  },
  {
    from: 'handoff_explicitly_authorized',
    to: 'receiving_role_run_authorized',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human separately initiates the receiving role.',
  },
  {
    from: 'receiving_role_run_authorized',
    to: 'receiving_role_draft_completed',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The separately authorized receiving-role run returns one draft.',
  },
  {
    from: 'receiving_role_draft_completed',
    to: 'final_human_disposition_pending',
    affirmativeHumanActionRequired: false,
    automaticTransitionPermitted: false,
    description:
      'The receiving-role draft is presented for final human disposition.',
  },
  {
    from: 'final_human_disposition_pending',
    to: 'workflow_closed',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human administratively closes the workflow.',
  },
  {
    from: 'rejected',
    to: 'workflow_closed',
    affirmativeHumanActionRequired: true,
    automaticTransitionPermitted: false,
    description:
      'A human records administrative closure after rejection.',
  },
] as const satisfies
  readonly ExecutiveWorkflowTransition[];

export const EXECUTIVE_WORKFLOW_AUDIT_EVENT_KINDS = [
  'request_prepared',
  'human_run_authorized',
  'role_run_completed',
  'role_escalation_returned',
  'role_output_presented_for_review',
  'human_disposition_recorded',
  'revision_requested',
  'handoff_prepared',
  'handoff_human_authorized',
  'receiving_role_run_human_authorized',
  'receiving_role_run_completed',
  'workflow_administratively_closed',
] as const;

export type ExecutiveWorkflowAuditEventKind =
  (typeof EXECUTIVE_WORKFLOW_AUDIT_EVENT_KINDS)[number];

export const EXECUTIVE_WORKFLOW_AUDIT_ACTOR_KINDS = [
  'authorized_human',
  'local_in_memory_coordinator',
] as const;

export type ExecutiveWorkflowAuditActorKind =
  (typeof EXECUTIVE_WORKFLOW_AUDIT_ACTOR_KINDS)[number];

export interface CeoRoleAuditExtension {
  extensionVersion:
    'executive-ceo-in-memory-audit-extension-v1';
  roleId: 'executive.ceo';
  artifactKindsProduced:
    readonly CeoArtifactKind[];
  strategicOptionIds:
    readonly string[];
  preferredOptionId: string | null;
  founderChecklistItemIds:
    readonly string[];
  implementationAuthorized: false;
  publicationAuthorized: false;
  roleDispatchAuthorized: false;
}

export interface ChiefOfStaffRoleAuditExtension {
  extensionVersion:
    'executive-chief-of-staff-in-memory-audit-extension-v1';
  roleId: 'executive.chief_of_staff';
  artifactKindsProduced:
    readonly ChiefOfStaffArtifactKind[];
  reportedStatusRecordIds:
    readonly string[];
  dependencyIds:
    readonly string[];
  proposedOwnerRecordIds:
    readonly string[];
  proposedDeadlineRecordIds:
    readonly string[];
  recordedHumanDecisionIds:
    readonly string[];
  assignmentAuthorityExercised: false;
  deadlineAuthorityExercised: false;
  adjudicationPerformed: false;
  artificialConsensusCreated: false;
  roleDispatchAuthorized: false;
}

export interface CaoRoleAuditExtension {
  extensionVersion:
    'executive-chief-architecture-officer-in-memory-audit-extension-v1';
  roleId:
    'executive.chief_architecture_officer';
  artifactKindsProduced:
    readonly CaoArtifactKind[];
  alternativeIds:
    readonly string[];
  architectureProposalIds:
    readonly string[];
  riskAnalysisIds:
    readonly string[];
  testEvaluationPlanIds:
    readonly string[];
  implementationSequenceIds:
    readonly string[];
  providerAssignmentPerformed: false;
  adapterAssignmentPerformed: false;
  schemaMigrationPerformed: false;
  adrRatificationPerformed: false;
  implementationAuthorized: false;
  roleDispatchAuthorized: false;
}

export type ExecutiveRoleAuditExtension =
  | CeoRoleAuditExtension
  | ChiefOfStaffRoleAuditExtension
  | CaoRoleAuditExtension;

export interface ExecutiveWorkflowAuditEvent {
  auditVersion:
    'executive-human-mediated-audit-event-v1';
  auditEventId: string;
  workflowId: string;
  runId: string | null;
  handoffId: string | null;
  eventKind:
    ExecutiveWorkflowAuditEventKind;
  priorState:
    ExecutiveWorkflowState | null;
  nextState: ExecutiveWorkflowState;
  roleId: ExecutiveRoleId | null;
  taskClass: TaskClass | null;
  actorKind:
    ExecutiveWorkflowAuditActorKind;
  actorIdentifier: string;
  humanAuthorization:
    HumanAuthorizationReference | null;
  recordedAt: string;
  sourceCommitSha: string;
  evidenceReferences:
    readonly string[];
  draftReferenceIds:
    readonly string[];
  disagreementIds:
    readonly string[];
  roleAuditExtension:
    ExecutiveRoleAuditExtension | null;
  explicitHumanActionObserved: boolean;
  automaticTransitionPerformed: false;
  autonomousDispatchPerformed: false;
  toolExecutionPerformed: false;
  persistencePerformed: false;
  externalCommunicationPerformed: false;
  previewActivationPerformed: false;
  productionActionPerformed: false;
  legalAuthorityExercised: false;
  constitutionalAuthorityExercised: false;
}

export interface InMemoryWorkflowAuditTrail {
  auditTrailVersion:
    'executive-human-mediated-in-memory-audit-trail-v1';
  workflowId: string;
  events:
    readonly ExecutiveWorkflowAuditEvent[];
  inMemoryOnly: true;
  retainedAfterProcessExit: false;
  persistenceRequested: false;
  persistencePerformed: false;
  databaseResourceCreated: false;
  externalLogDestinationConfigured: false;
  automaticExecutionAuthority: false;
}
