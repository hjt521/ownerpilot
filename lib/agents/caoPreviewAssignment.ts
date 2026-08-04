import {
  CAO_EVIDENCE_SCOPES,
} from './caoRepositoryEvidence';

import {
  CAO_PREVIEW_APPROVAL_REFERENCE,
} from './caoPreviewRegistry';

export const CAO_ASSIGNMENT_VERSION =
  'cao-preview-assignment-v1' as const;

export const CAO_REQUESTED_OUTPUT_TYPES = [
  'architecture_recommendation',
  'engineering_handoff_packet',
] as const;

export type CaoRequestedOutputType =
  (typeof CAO_REQUESTED_OUTPUT_TYPES)[number];

export interface CaoPreviewAssignment {
  version: typeof CAO_ASSIGNMENT_VERSION;
  taskClass: 'architecture_analysis' | 'evaluation_only';
  runId: string;
  objective: string;
  evidenceScopeId: keyof typeof CAO_EVIDENCE_SCOPES;
  sourceCommit: string;
  constraints: readonly string[];
  knownDecisions: readonly string[];
  unresolvedQuestions: readonly string[];
  founderApprovalReference: typeof CAO_PREVIEW_APPROVAL_REFERENCE;
  requestedOutputType: CaoRequestedOutputType;
  explicitHumanInitiation: true;
  sensitiveContentPresent: false;
}

export type CaoAssignmentIssueCode =
  | 'invalid_type'
  | 'unknown_field'
  | 'invalid_version'
  | 'unapproved_task_class'
  | 'invalid_run_id'
  | 'missing_objective'
  | 'unapproved_evidence_scope'
  | 'source_commit_mismatch'
  | 'invalid_constraints'
  | 'invalid_known_decisions'
  | 'invalid_unresolved_questions'
  | 'missing_founder_approval_reference'
  | 'unapproved_output_type'
  | 'human_initiation_required'
  | 'sensitive_content_rejected';

export interface CaoAssignmentValidationResult {
  ok: boolean;
  value: CaoPreviewAssignment | null;
  issues: readonly CaoAssignmentIssueCode[];
}

const ASSIGNMENT_KEYS = [
  'version',
  'taskClass',
  'runId',
  'objective',
  'evidenceScopeId',
  'sourceCommit',
  'constraints',
  'knownDecisions',
  'unresolvedQuestions',
  'founderApprovalReference',
  'requestedOutputType',
  'explicitHumanInitiation',
  'sensitiveContentPresent',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function boundedStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length <= 32 && value.every(item => boundedString(item, 2_000));
}

export function validateCaoPreviewAssignment(input: unknown): CaoAssignmentValidationResult {
  const issues: CaoAssignmentIssueCode[] = [];

  if (!isRecord(input)) {
    return { ok: false, value: null, issues: ['invalid_type'] };
  }

  const keys = Object.keys(input).sort();
  const expected = [...ASSIGNMENT_KEYS].sort();
  if (keys.length !== expected.length || !keys.every((key, index) => key === expected[index])) {
    issues.push('unknown_field');
  }

  if (input.version !== CAO_ASSIGNMENT_VERSION) issues.push('invalid_version');
  if (input.taskClass !== 'architecture_analysis' && input.taskClass !== 'evaluation_only') issues.push('unapproved_task_class');
  if (!boundedString(input.runId, 128) || !/^[A-Za-z0-9._:-]+$/.test(String(input.runId))) issues.push('invalid_run_id');
  if (!boundedString(input.objective, 8_000)) issues.push('missing_objective');

  const scopeId = typeof input.evidenceScopeId === 'string' ? input.evidenceScopeId : '';
  const scope = (CAO_EVIDENCE_SCOPES as Readonly<Record<string, { sourceCommit: string }>>)[scopeId];
  if (!scope) issues.push('unapproved_evidence_scope');
  if (scope && input.sourceCommit !== scope.sourceCommit) issues.push('source_commit_mismatch');

  if (!boundedStringArray(input.constraints)) issues.push('invalid_constraints');
  if (!boundedStringArray(input.knownDecisions)) issues.push('invalid_known_decisions');
  if (!boundedStringArray(input.unresolvedQuestions)) issues.push('invalid_unresolved_questions');
  if (input.founderApprovalReference !== CAO_PREVIEW_APPROVAL_REFERENCE) issues.push('missing_founder_approval_reference');
  if (!CAO_REQUESTED_OUTPUT_TYPES.includes(input.requestedOutputType as CaoRequestedOutputType)) issues.push('unapproved_output_type');
  if (input.explicitHumanInitiation !== true) issues.push('human_initiation_required');
  if (input.sensitiveContentPresent !== false) issues.push('sensitive_content_rejected');

  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: input as unknown as CaoPreviewAssignment, issues: [] };
}
