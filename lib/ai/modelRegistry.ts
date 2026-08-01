/**
 * Provider-neutral executive-agent registry foundation.
 *
 * This module defines closed vocabularies and pure TypeScript types only.
 * It creates no model assignment, provider assignment, adapter assignment,
 * feature flag, runtime gate, agent execution path, persistence, or network call.
 */

export const EXECUTIVE_ROLE_IDS = [
  'executive.ceo',
  'executive.chief_of_staff',
  'executive.chief_architecture_officer',
] as const;

export type ExecutiveRoleId = (typeof EXECUTIVE_ROLE_IDS)[number];

export const REGISTRY_STATUSES = [
  'draft',
  'preview_approved',
  'suspended',
  'retired',
] as const;

export type RegistryStatus = (typeof REGISTRY_STATUSES)[number];

export const MODEL_ASSIGNMENT_USES = [
  'primary',
  'challenger',
  'fallback',
] as const;

export type ModelAssignmentUse = (typeof MODEL_ASSIGNMENT_USES)[number];

export const REASONING_LEVELS = [
  'minimal',
  'standard',
  'deep',
] as const;

export type ReasoningLevel = (typeof REASONING_LEVELS)[number];

export const EXECUTION_ENVIRONMENTS = [
  'preview',
] as const;

export type ExecutionEnvironment = (typeof EXECUTION_ENVIRONMENTS)[number];

export const OUTPUT_DISPOSITIONS = [
  'draft_only',
] as const;

export type OutputDisposition = (typeof OUTPUT_DISPOSITIONS)[number];

export const TASK_CLASSES = [
  'strategic_analysis',
  'operating_priority_draft',
  'executive_brief',
  'cross_function_synthesis',
  'dependency_review',
  'architecture_analysis',
  'architecture_option_draft',
  'risk_register_draft',
  'decision_memo_draft',
  'meeting_agenda_draft',
  'follow_up_register_draft',
  'evaluation_only',
] as const;

export type TaskClass = (typeof TASK_CLASSES)[number];

export const ALLOWED_TOOL_PERMISSIONS = [
  'repository.read',
  'approved_documents.read',
  'preview_logs.read_sanitized',
  'evaluation.run_local',
  'draft.memo',
  'draft.plan',
  'draft.architecture_option',
  'draft.work_item_proposal',
] as const;

export type AllowedToolPermission =
  (typeof ALLOWED_TOOL_PERMISSIONS)[number];

export const PROHIBITED_TOOL_PERMISSIONS = [
  'repository.write',
  'git.commit',
  'git.push',
  'github.merge',
  'deployment.create',
  'production.read_secret',
  'production.write',
  'environment.modify',
  'database.write',
  'external_message.send',
  'notice.release',
  'payment.action',
  'attorney.route',
  'jurisdiction.activate',
  'los_angeles_rules.activate',
  'constitutional_record.modify',
  'legal_record.modify',
  'authority.self_expand',
] as const;

export type ProhibitedToolPermission =
  (typeof PROHIBITED_TOOL_PERMISSIONS)[number];

export const TOOL_PERMISSIONS = [
  ...ALLOWED_TOOL_PERMISSIONS,
  ...PROHIBITED_TOOL_PERMISSIONS,
] as const;

export type ToolPermission = (typeof TOOL_PERMISSIONS)[number];

export const AUTHORITY_CATEGORIES = [
  'advisory_draft',
  'repository_write',
  'database_write',
  'deployment_or_release',
  'external_communication',
  'legal_control',
  'notice',
  'payment',
  'attorney_routing',
  'jurisdiction_activation',
  'los_angeles_rule_activation',
  'constitutional_record_modification',
  'legal_record_modification',
  'role_self_expansion',
] as const;

export type AuthorityCategory = (typeof AUTHORITY_CATEGORIES)[number];

export const PERMITTED_AUTHORITY_CATEGORIES = [
  'advisory_draft',
] as const;

export type PermittedAuthorityCategory =
  (typeof PERMITTED_AUTHORITY_CATEGORIES)[number];

export const PROHIBITED_AUTHORITY_CATEGORIES = [
  'repository_write',
  'database_write',
  'deployment_or_release',
  'external_communication',
  'legal_control',
  'notice',
  'payment',
  'attorney_routing',
  'jurisdiction_activation',
  'los_angeles_rule_activation',
  'constitutional_record_modification',
  'legal_record_modification',
  'role_self_expansion',
] as const;

export type ProhibitedAuthorityCategory =
  (typeof PROHIBITED_AUTHORITY_CATEGORIES)[number];

export const EVIDENCE_STATES = [
  'complete',
  'incomplete',
  'unknown',
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const AGENT_RUN_OUTCOMES = [
  'draft_completed',
  'blocked_validation',
  'blocked_limit',
  'escalation_required',
  'cancelled',
] as const;

export type AgentRunOutcome = (typeof AGENT_RUN_OUTCOMES)[number];

export const HUMAN_DISPOSITIONS = [
  'pending',
  'approved_for_draft_use',
  'rejected',
  'revision_required',
  'not_applicable',
] as const;

export type HumanDisposition = (typeof HUMAN_DISPOSITIONS)[number];

export const TOOL_CALL_STATUSES = [
  'proposed',
  'allowed',
  'denied',
  'completed',
  'failed',
] as const;

export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

export const ROLE_ALLOWED_TASK_CLASSES = {
  'executive.ceo': [
    'strategic_analysis',
    'operating_priority_draft',
    'executive_brief',
    'cross_function_synthesis',
    'dependency_review',
    'risk_register_draft',
    'decision_memo_draft',
    'evaluation_only',
  ],
  'executive.chief_of_staff': [
    'operating_priority_draft',
    'executive_brief',
    'cross_function_synthesis',
    'dependency_review',
    'risk_register_draft',
    'decision_memo_draft',
    'meeting_agenda_draft',
    'follow_up_register_draft',
    'evaluation_only',
  ],
  'executive.chief_architecture_officer': [
    'cross_function_synthesis',
    'dependency_review',
    'architecture_analysis',
    'architecture_option_draft',
    'risk_register_draft',
    'decision_memo_draft',
    'evaluation_only',
  ],
} as const satisfies Readonly<
  Record<ExecutiveRoleId, readonly TaskClass[]>
>;

export const ROLE_ALLOWED_TOOL_PERMISSIONS = {
  'executive.ceo': [
    'repository.read',
    'approved_documents.read',
    'preview_logs.read_sanitized',
    'evaluation.run_local',
    'draft.memo',
    'draft.plan',
    'draft.work_item_proposal',
  ],
  'executive.chief_of_staff': [
    'repository.read',
    'approved_documents.read',
    'preview_logs.read_sanitized',
    'evaluation.run_local',
    'draft.memo',
    'draft.plan',
    'draft.work_item_proposal',
  ],
  'executive.chief_architecture_officer': [
    'repository.read',
    'approved_documents.read',
    'preview_logs.read_sanitized',
    'evaluation.run_local',
    'draft.memo',
    'draft.plan',
    'draft.architecture_option',
    'draft.work_item_proposal',
  ],
} as const satisfies Readonly<
  Record<ExecutiveRoleId, readonly AllowedToolPermission[]>
>;

export interface ModelAssignment {
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  adapterId: string;
  enabled: boolean;
  intendedUse: ModelAssignmentUse;
}

export interface ToolPermissionPolicy {
  defaultEffect: 'deny';
  allowed: readonly AllowedToolPermission[];
  prohibited: readonly ProhibitedToolPermission[];
  approvalRequired: readonly AllowedToolPermission[];
}

export interface RegistryLimits {
  hardTimeoutMs: number;
  targetP95LatencyMs: number;
  maximumInputTokens: number;
  maximumOutputTokens: number;
  maximumEstimatedCostMicrosPerRun: number;
  maximumEstimatedCostMicrosPerDay: number;
}

export interface HumanApprovalPolicy {
  explicitHumanInitiationRequired: true;
  founderApprovalRequired: true;
  outputDisposition: OutputDisposition;
  noApprovalBySilence: true;
}

export interface ProviderSubstitutionPolicy {
  mode: 'prohibited_without_founder_approval';
  allowAutomaticPrimaryToFallback: false;
  allowAutomaticProviderChange: false;
  requireEquivalentOrStricterLimits: true;
  requireSameTaskAndToolBoundary: true;
  requireAuditReason: true;
  requireFounderApproval: true;
}

export interface RuntimeModelRegistryEntry {
  roleId: ExecutiveRoleId;
  registryVersion: string;
  charterVersion: string;
  status: RegistryStatus;
  primaryModel: ModelAssignment;
  challengerModel: ModelAssignment;
  fallbackModel: ModelAssignment | null;
  allowedTaskClasses: readonly TaskClass[];
  toolPermissions: ToolPermissionPolicy;
  reasoningLevel: ReasoningLevel;
  limits: RegistryLimits;
  humanApprovalRequirements: HumanApprovalPolicy;
  providerSubstitutionPolicy: ProviderSubstitutionPolicy;
  environmentEligibility: readonly ExecutionEnvironment[];
  roleApprovalReference: string;
}

export interface RequestedRunUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
  estimatedDailyCostMicrosAfterRun: number;
  elapsedLatencyMs: number;
  requestedTimeoutMs: number;
}

export interface DisagreementRecord {
  issue: string;
  positions: readonly string[];
  evidenceReferences: readonly string[];
  unknowns: readonly string[];
  decisionOwner: 'founder' | 'human_reviewer';
  founderDecisionRequired: boolean;
}

export interface ToolAuditRecord {
  permission: ToolPermission;
  status: ToolCallStatus;
  reasonClass: string | null;
}

export interface RegistryAuditMetadata {
  runId: string;
  roleId: ExecutiveRoleId;
  registryVersion: string;
  charterVersion: string;
  registryEntryHash: string;
  environment: ExecutionEnvironment;
  sourceCommitSha: string;
  requestedBy: string;
  approvalReference: string;
  taskClass: TaskClass;
  modelSlot: ModelAssignmentUse;
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  adapterId: string;
  reasoningLevel: ReasoningLevel;
  effectiveToolPermissions: readonly AllowedToolPermission[];
  toolCalls: readonly ToolAuditRecord[];
  substitutionRequested: boolean;
  substitutionReasonClass: string | null;
  fallbackReasonClass: string | null;
  startedAt: string;
  completedAt: string | null;
  latencyMs: number;
  inputTokenCount: number;
  outputTokenCount: number;
  estimatedCostMicros: number;
  evidenceReferences: readonly string[];
  unknownsRecorded: readonly string[];
  disagreements: readonly DisagreementRecord[];
  outcome: AgentRunOutcome;
  humanDisposition: HumanDisposition;
}

export interface ExecutiveAgentRunRequest {
  registryEntry: RuntimeModelRegistryEntry;
  environment: ExecutionEnvironment;
  explicitHumanInitiation: true;
  roleApprovalReference: string;
  requestedTaskClass: TaskClass;
  requestedTools: readonly AllowedToolPermission[];
  requestedAuthorityCategories:
    readonly PermittedAuthorityCategory[];
  authorityExpansionRequested: false;
  disagreementPreservationRequired: true;
  uncertaintyPreservationRequired: true;
  evidenceState: EvidenceState;
  requestedUsage: RequestedRunUsage;
  auditMetadata: RegistryAuditMetadata;
}

function includesLiteral<const T extends readonly string[]>(
  values: T,
  candidate: string,
): candidate is T[number] {
  return (values as readonly string[]).includes(candidate);
}

export function isExecutiveRoleId(
  candidate: string,
): candidate is ExecutiveRoleId {
  return includesLiteral(EXECUTIVE_ROLE_IDS, candidate);
}

export function isTaskClass(candidate: string): candidate is TaskClass {
  return includesLiteral(TASK_CLASSES, candidate);
}

export function isToolPermission(
  candidate: string,
): candidate is ToolPermission {
  return includesLiteral(TOOL_PERMISSIONS, candidate);
}

export function isAllowedToolPermission(
  candidate: string,
): candidate is AllowedToolPermission {
  return includesLiteral(ALLOWED_TOOL_PERMISSIONS, candidate);
}

export function isProhibitedToolPermission(
  candidate: string,
): candidate is ProhibitedToolPermission {
  return includesLiteral(PROHIBITED_TOOL_PERMISSIONS, candidate);
}

export function isTaskAllowedForRole(
  roleId: ExecutiveRoleId,
  taskClass: TaskClass,
): boolean {
  return (
    ROLE_ALLOWED_TASK_CLASSES[roleId] as readonly TaskClass[]
  ).includes(taskClass);
}

export function isToolAllowedForRole(
  roleId: ExecutiveRoleId,
  permission: AllowedToolPermission,
): boolean {
  return (
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId] as
      readonly AllowedToolPermission[]
  ).includes(permission);
}
