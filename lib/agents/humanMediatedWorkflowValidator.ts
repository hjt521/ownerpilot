/**
 * Fail-closed validators for the synthetic-only human-mediated workflow.
 *
 * This module is pure and in-memory. It performs no provider lookup, model
 * execution, tool use, persistence, routing, Preview activation, or
 * Production action.
 */

import {
  EVIDENCE_STATES,
  HUMAN_DISPOSITIONS,
  REASONING_LEVELS,
  isExecutiveRoleId,
  isTaskAllowedForRole,
  isTaskClass,
} from '../ai/modelRegistry';

import {
  AUTHORIZED_HUMAN_CLASSES,
  CAO_ARTIFACT_KINDS,
  CEO_ARTIFACT_KINDS,
  CHIEF_OF_STAFF_ARTIFACT_KINDS,
  EVIDENCE_TRANSFER_PERMISSIONS,
  EVIDENCE_VERIFICATION_STATES,
  EXECUTIVE_WORKFLOW_AUDIT_ACTOR_KINDS,
  EXECUTIVE_WORKFLOW_AUDIT_EVENT_KINDS,
  EXECUTIVE_WORKFLOW_STATES,
  EXECUTIVE_WORKFLOW_TRANSITIONS,
  HANDOFF_TRANSFER_SECTIONS,
  HUMAN_AUTHORIZATION_SCOPE_KINDS,
  HUMAN_DISPOSITION_SOURCE_KINDS,
  HUMAN_MEDIATED_WORKFLOW_VERSION,
  INFORMATION_CLASSIFICATIONS,
  MATERIAL_DISAGREEMENT_VERSION,
  DISAGREEMENT_POSITION_ORIGINS,
  WORKFLOW_CONTRACT_BOUNDS,
  WORKFLOW_EVIDENCE_ORIGINS,
  WORKFLOW_EVIDENCE_SOURCE_KINDS,
  type ArchitectureAlternativeDraft,
  type ArchitectureEvidenceRecord,
  type ArchitectureRiskAnalysis,
  type CaoDraftExtension,
  type CaoHumanMediatedOutput,
  type CeoDraftExtension,
  type CeoHumanMediatedOutput,
  type ChiefOfStaffDraftExtension,
  type ChiefOfStaffHumanMediatedOutput,
  type ClarificationRequestProposal,
  type DisagreementPositionV2,
  type ExecutiveEscalationPacket,
  type ExecutiveEvidenceItem,
  type FounderApprovalChecklistItem,
  type ExecutiveRoleAuditExtension,
  type ProposedDeadlineRecord,
  type ProposedImplementationSequence,
  type ProposedOwnerRecord,
  type ProposedWorkSequenceItem,
  type RecordedHumanDecision,
  type ReportedStatusRecord,
  type RiskDependencyItem,
  type StrategicOptionDraft,
  type StatusTransformationRecord,
  type TestEvaluationPlanDraft,
  type TechnicalDissentRecord,
  type WorkflowDependencyItem,
  type UnimplementedArchitectureProposal,
  type ExecutiveWorkflowAuditEvent,
  type ExecutiveWorkflowEnvelope,
  type HandoffOmissionRecord,
  type InMemoryWorkflowAuditTrail,
  type HumanAuthorizationReference,
  type HumanDispositionRecord,
  type WorkflowClosureRecord,
  type HumanMediatedHandoff,
  type MaterialDisagreementV2,
  type RoleDraftReference,
} from './humanMediatedWorkflowTypes';

import type {
  ExecutiveAgentDraftOutput,
} from './evaluation/modelEvaluation';

export const HUMAN_MEDIATED_VALIDATION_CODES = [
  'invalid_type',
  'missing_value',
  'unknown_field',
  'invalid_value',
  'value_too_long',
  'too_many_items',
  'unknown_role',
  'unknown_task',
  'task_not_allowed_for_role',
  'sensitive_content_prohibited',
  'human_authorization_mismatch',
] as const;

export type HumanMediatedValidationCode =
  (typeof HUMAN_MEDIATED_VALIDATION_CODES)[number];

export interface HumanMediatedValidationIssue {
  path: string;
  code: HumanMediatedValidationCode;
  message: string;
}

export type HumanMediatedValidationResult<T> =
  | {
      ok: true;
      value: T;
      issues: readonly [];
    }
  | {
      ok: false;
      value: null;
      issues: readonly HumanMediatedValidationIssue[];
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function includesLiteral<
  const TValues extends readonly string[],
>(
  values: TValues,
  candidate: unknown,
): candidate is TValues[number] {
  return (
    typeof candidate === 'string' &&
    (values as readonly string[]).includes(candidate)
  );
}

function issue(
  path: string,
  code: HumanMediatedValidationCode,
  message: string,
): HumanMediatedValidationIssue {
  return {
    path,
    code,
    message,
  };
}

function validateExactKeys(
  value: Record<string, unknown>,
  permittedKeys: readonly string[],
  path: string,
  issues: HumanMediatedValidationIssue[],
): void {
  const allowed = new Set(permittedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(
        issue(
          `${path}.${key}`,
          'unknown_field',
          `Unknown field "${key}" is not permitted.`,
        ),
      );
    }
  }
}

function validateBoundedString(
  value: unknown,
  path: string,
  maximumCharacters: number,
  issues: HumanMediatedValidationIssue[],
): value is string {
  if (typeof value !== 'string') {
    issues.push(
      issue(
        path,
        'invalid_type',
        'Expected a string.',
      ),
    );
    return false;
  }

  if (value.trim().length === 0) {
    issues.push(
      issue(
        path,
        'missing_value',
        'A nonempty value is required.',
      ),
    );
    return false;
  }

  if (value.length > maximumCharacters) {
    issues.push(
      issue(
        path,
        'value_too_long',
        `Value exceeds ${maximumCharacters} characters.`,
      ),
    );
    return false;
  }

  return true;
}

function result<T>(
  value: T,
  issues: HumanMediatedValidationIssue[],
): HumanMediatedValidationResult<T> {
  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value,
    issues: [],
  };
}

export function validateHumanAuthorizationReference(
  candidate: unknown,
): HumanMediatedValidationResult<
  HumanAuthorizationReference
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          'humanAuthorization',
          'invalid_type',
          'Expected a human-authorization object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'humanClass',
      'humanIdentifier',
      'approvalReference',
      'scopeKind',
      'scopeId',
      'roleId',
      'taskClass',
      'authorizedAt',
      'authorizationVersion',
    ],
    'humanAuthorization',
    issues,
  );

  if (
    !includesLiteral(
      AUTHORIZED_HUMAN_CLASSES,
      candidate.humanClass,
    )
  ) {
    issues.push(
      issue(
        'humanAuthorization.humanClass',
        'invalid_value',
        'Unknown authorized-human class.',
      ),
    );
  }

  validateBoundedString(
    candidate.humanIdentifier,
    'humanAuthorization.humanIdentifier',
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.approvalReference,
    'humanAuthorization.approvalReference',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      HUMAN_AUTHORIZATION_SCOPE_KINDS,
      candidate.scopeKind,
    )
  ) {
    issues.push(
      issue(
        'humanAuthorization.scopeKind',
        'invalid_value',
        'Scope kind must be run or handoff.',
      ),
    );
  }

  validateBoundedString(
    candidate.scopeId,
    'humanAuthorization.scopeId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    typeof candidate.roleId !== 'string' ||
    !isExecutiveRoleId(candidate.roleId)
  ) {
    issues.push(
      issue(
        'humanAuthorization.roleId',
        'unknown_role',
        'Unknown executive role.',
      ),
    );
  }

  if (
    typeof candidate.taskClass !== 'string' ||
    !isTaskClass(candidate.taskClass)
  ) {
    issues.push(
      issue(
        'humanAuthorization.taskClass',
        'unknown_task',
        'Unknown task class.',
      ),
    );
  } else if (
    typeof candidate.roleId === 'string' &&
    isExecutiveRoleId(candidate.roleId) &&
    !isTaskAllowedForRole(
      candidate.roleId,
      candidate.taskClass,
    )
  ) {
    issues.push(
      issue(
        'humanAuthorization.taskClass',
        'task_not_allowed_for_role',
        'Task class is not allowed for the authorized role.',
      ),
    );
  }

  validateBoundedString(
    candidate.authorizedAt,
    'humanAuthorization.authorizedAt',
    64,
    issues,
  );

  validateBoundedString(
    candidate.authorizationVersion,
    'humanAuthorization.authorizationVersion',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  return result(
    candidate as unknown as HumanAuthorizationReference,
    issues,
  );
}

export function validateExecutiveEvidenceItem(
  candidate: unknown,
  path = 'evidenceItem',
): HumanMediatedValidationResult<
  ExecutiveEvidenceItem
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an evidence-item object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'evidenceId',
      'sourceKind',
      'locator',
      'description',
      'classification',
      'origin',
      'verificationState',
      'introducedByHuman',
      'transferPermission',
      'verbatimPreservationRequired',
      'sensitiveContentPresent',
      'note',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.evidenceId,
    `${path}.evidenceId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      WORKFLOW_EVIDENCE_SOURCE_KINDS,
      candidate.sourceKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.sourceKind`,
        'invalid_value',
        'Unknown evidence source kind.',
      ),
    );
  }

  validateBoundedString(
    candidate.locator,
    `${path}.locator`,
    2_048,
    issues,
  );

  validateBoundedString(
    candidate.description,
    `${path}.description`,
    2_000,
    issues,
  );

  if (
    !includesLiteral(
      INFORMATION_CLASSIFICATIONS,
      candidate.classification,
    )
  ) {
    issues.push(
      issue(
        `${path}.classification`,
        'invalid_value',
        'Unknown information classification.',
      ),
    );
  }

  if (
    !includesLiteral(
      WORKFLOW_EVIDENCE_ORIGINS,
      candidate.origin,
    )
  ) {
    issues.push(
      issue(
        `${path}.origin`,
        'invalid_value',
        'Unknown evidence origin.',
      ),
    );
  }

  if (
    !includesLiteral(
      EVIDENCE_VERIFICATION_STATES,
      candidate.verificationState,
    )
  ) {
    issues.push(
      issue(
        `${path}.verificationState`,
        'invalid_value',
        'Unknown evidence verification state.',
      ),
    );
  }

  if (candidate.introducedByHuman !== true) {
    issues.push(
      issue(
        `${path}.introducedByHuman`,
        'invalid_value',
        'Synthetic evidence must be selected by a human.',
      ),
    );
  }

  if (
    !includesLiteral(
      EVIDENCE_TRANSFER_PERMISSIONS,
      candidate.transferPermission,
    )
  ) {
    issues.push(
      issue(
        `${path}.transferPermission`,
        'invalid_value',
        'Unknown evidence-transfer permission.',
      ),
    );
  }

  if (
    typeof candidate.verbatimPreservationRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.verbatimPreservationRequired`,
        'invalid_type',
        'Expected a boolean preservation marker.',
      ),
    );
  }

  if (candidate.sensitiveContentPresent !== false) {
    issues.push(
      issue(
        `${path}.sensitiveContentPresent`,
        'sensitive_content_prohibited',
        'Sensitive content is prohibited in this phase.',
      ),
    );
  }

  if (
    candidate.note !== undefined &&
    (
      typeof candidate.note !== 'string' ||
      candidate.note.length > 1_000
    )
  ) {
    issues.push(
      issue(
        `${path}.note`,
        'invalid_value',
        'Optional note must be a string of at most 1,000 characters.',
      ),
    );
  }

  return result(
    candidate as unknown as ExecutiveEvidenceItem,
    issues,
  );
}

const MOVING_MODEL_ALIAS_PATTERN =
  /(?:^|[/:@._-])(latest|current|stable|default|rolling|canary|nightly|head)(?:$|[/:@._-])/i;

function validateOptionalIdentifier(
  value: unknown,
  path: string,
  issues: HumanMediatedValidationIssue[],
): void {
  if (value === null) {
    return;
  }

  validateBoundedString(
    value,
    path,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );
}

function validateBoundedStringArray(
  value: unknown,
  path: string,
  maximumItems: number,
  maximumCharactersPerItem: number,
  issues: HumanMediatedValidationIssue[],
): value is readonly string[] {
  if (!Array.isArray(value)) {
    issues.push(
      issue(
        path,
        'invalid_type',
        'Expected an array.',
      ),
    );
    return false;
  }

  if (value.length > maximumItems) {
    issues.push(
      issue(
        path,
        'too_many_items',
        `Array exceeds ${maximumItems} items.`,
      ),
    );
  }

  value.forEach((item, index) => {
    validateBoundedString(
      item,
      `${path}[${index}]`,
      maximumCharactersPerItem,
      issues,
    );
  });

  return true;
}

function authorizedHumanMatchesRole(
  humanClass: unknown,
  roleId: unknown,
): boolean {
  if (
    typeof humanClass !== 'string' ||
    typeof roleId !== 'string' ||
    !isExecutiveRoleId(roleId)
  ) {
    return false;
  }

  if (humanClass === 'founder') {
    return true;
  }

  if (roleId === 'executive.ceo') {
    return (
      humanClass ===
      'founder_designated_human_requester'
    );
  }

  if (
    roleId ===
    'executive.chief_architecture_officer'
  ) {
    return (
      humanClass ===
      'human_engineering_reviewer'
    );
  }

  return (
    humanClass ===
    'designated_human_reviewer'
  );
}

export function validateExecutiveWorkflowEnvelope(
  candidate: unknown,
): HumanMediatedValidationResult<
  ExecutiveWorkflowEnvelope
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          'workflowEnvelope',
          'invalid_type',
          'Expected a workflow-envelope object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'workflowVersion',
      'workflowId',
      'runId',
      'handoffId',
      'parentHandoffId',
      'humanAuthorization',
      'explicitHumanInitiation',
      'sourceCommitSha',
      'environment',
      'roleId',
      'charterVersion',
      'registryVersion',
      'registryEntryHash',
      'requestedTaskClass',
      'requestedModelSlot',
      'providerId',
      'modelId',
      'pinnedModelVersion',
      'adapterId',
      'reasoningLevel',
      'evidenceState',
      'evidenceItems',
      'priorRoleDraftReferences',
      'knownConstraints',
      'requestedAuthorityCategories',
      'requestedTools',
      'humanInstructions',
      'currentHumanDisposition',
      'createdAt',
      'supersedesHandoffId',
      'automaticContinuation',
      'authorityExpansionRequested',
    ],
    'workflowEnvelope',
    issues,
  );

  if (
    candidate.workflowVersion !==
    HUMAN_MEDIATED_WORKFLOW_VERSION
  ) {
    issues.push(
      issue(
        'workflowEnvelope.workflowVersion',
        'invalid_value',
        'Unknown workflow contract version.',
      ),
    );
  }

  validateBoundedString(
    candidate.workflowId,
    'workflowEnvelope.workflowId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    'workflowEnvelope.runId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateOptionalIdentifier(
    candidate.handoffId,
    'workflowEnvelope.handoffId',
    issues,
  );

  validateOptionalIdentifier(
    candidate.parentHandoffId,
    'workflowEnvelope.parentHandoffId',
    issues,
  );

  const authorization =
    validateHumanAuthorizationReference(
      candidate.humanAuthorization,
    );

  if (!authorization.ok) {
    issues.push(...authorization.issues);
  }

  if (
    candidate.explicitHumanInitiation !== true
  ) {
    issues.push(
      issue(
        'workflowEnvelope.explicitHumanInitiation',
        'invalid_value',
        'Every run requires explicit human initiation.',
      ),
    );
  }

  if (
    typeof candidate.sourceCommitSha !== 'string' ||
    !/^[0-9a-f]{40}$/.test(
      candidate.sourceCommitSha,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.sourceCommitSha',
        'invalid_value',
        'A 40-character lowercase commit SHA is required.',
      ),
    );
  }

  if (candidate.environment !== 'preview') {
    issues.push(
      issue(
        'workflowEnvelope.environment',
        'invalid_value',
        'Only the Preview identifier is permitted.',
      ),
    );
  }

  const roleValid =
    typeof candidate.roleId === 'string' &&
    isExecutiveRoleId(candidate.roleId);

  if (!roleValid) {
    issues.push(
      issue(
        'workflowEnvelope.roleId',
        'unknown_role',
        'Unknown executive role.',
      ),
    );
  }

  validateBoundedString(
    candidate.charterVersion,
    'workflowEnvelope.charterVersion',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.registryVersion,
    'workflowEnvelope.registryVersion',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.registryEntryHash,
    'workflowEnvelope.registryEntryHash',
    256,
    issues,
  );

  const taskValid =
    typeof candidate.requestedTaskClass ===
      'string' &&
    isTaskClass(candidate.requestedTaskClass);

  if (!taskValid) {
    issues.push(
      issue(
        'workflowEnvelope.requestedTaskClass',
        'unknown_task',
        'Unknown requested task class.',
      ),
    );
  } else if (
    roleValid &&
    !isTaskAllowedForRole(
      candidate.roleId as Parameters<
        typeof isTaskAllowedForRole
      >[0],
      candidate.requestedTaskClass as Parameters<
        typeof isTaskAllowedForRole
      >[1],
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.requestedTaskClass',
        'task_not_allowed_for_role',
        'Requested task is not allowed for the role.',
      ),
    );
  }

  if (
    candidate.requestedModelSlot !== 'primary' &&
    candidate.requestedModelSlot !== 'challenger'
  ) {
    issues.push(
      issue(
        'workflowEnvelope.requestedModelSlot',
        'invalid_value',
        'Only primary or challenger is permitted; fallback is prohibited.',
      ),
    );
  }

  validateBoundedString(
    candidate.providerId,
    'workflowEnvelope.providerId',
    256,
    issues,
  );

  validateBoundedString(
    candidate.modelId,
    'workflowEnvelope.modelId',
    256,
    issues,
  );

  if (
    typeof candidate.modelId === 'string' &&
    MOVING_MODEL_ALIAS_PATTERN.test(
      candidate.modelId,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.modelId',
        'invalid_value',
        'Moving model aliases are prohibited.',
      ),
    );
  }

  validateBoundedString(
    candidate.pinnedModelVersion,
    'workflowEnvelope.pinnedModelVersion',
    256,
    issues,
  );

  if (
    typeof candidate.pinnedModelVersion ===
      'string' &&
    MOVING_MODEL_ALIAS_PATTERN.test(
      candidate.pinnedModelVersion,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.pinnedModelVersion',
        'invalid_value',
        'A pinned immutable model version is required.',
      ),
    );
  }

  validateBoundedString(
    candidate.adapterId,
    'workflowEnvelope.adapterId',
    256,
    issues,
  );

  if (
    !includesLiteral(
      REASONING_LEVELS,
      candidate.reasoningLevel,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.reasoningLevel',
        'invalid_value',
        'Unknown reasoning level.',
      ),
    );
  }

  if (
    !includesLiteral(
      EVIDENCE_STATES,
      candidate.evidenceState,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.evidenceState',
        'invalid_value',
        'Unknown evidence state.',
      ),
    );
  }

  if (!Array.isArray(candidate.evidenceItems)) {
    issues.push(
      issue(
        'workflowEnvelope.evidenceItems',
        'invalid_type',
        'Evidence items must be an array.',
      ),
    );
  } else {
    if (
      candidate.evidenceItems.length >
      WORKFLOW_CONTRACT_BOUNDS.evidenceItems
    ) {
      issues.push(
        issue(
          'workflowEnvelope.evidenceItems',
          'too_many_items',
          'Too many evidence items.',
        ),
      );
    }

    candidate.evidenceItems.forEach(
      (item, index) => {
        const evidenceValidation =
          validateExecutiveEvidenceItem(
            item,
            `workflowEnvelope.evidenceItems[${index}]`,
          );

        if (!evidenceValidation.ok) {
          issues.push(
            ...evidenceValidation.issues,
          );
        }
      },
    );
  }

  if (
    !Array.isArray(
      candidate.priorRoleDraftReferences,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.priorRoleDraftReferences',
        'invalid_type',
        'Prior-role draft references must be an array.',
      ),
    );
  } else if (
    candidate.priorRoleDraftReferences.length >
    WORKFLOW_CONTRACT_BOUNDS
      .priorRoleDraftReferences
  ) {
    issues.push(
      issue(
        'workflowEnvelope.priorRoleDraftReferences',
        'too_many_items',
        'Too many prior-role draft references.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.knownConstraints,
    'workflowEnvelope.knownConstraints',
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  if (
    !Array.isArray(
      candidate.requestedAuthorityCategories,
    ) ||
    candidate.requestedAuthorityCategories.length !==
      1 ||
    candidate.requestedAuthorityCategories[0] !==
      'advisory_draft'
  ) {
    issues.push(
      issue(
        'workflowEnvelope.requestedAuthorityCategories',
        'invalid_value',
        'Only the advisory_draft authority category is permitted.',
      ),
    );
  }

  if (
    !Array.isArray(candidate.requestedTools) ||
    candidate.requestedTools.length !== 0
  ) {
    issues.push(
      issue(
        'workflowEnvelope.requestedTools',
        'invalid_value',
        'The synthetic workflow must remain tool-free.',
      ),
    );
  }

  validateBoundedString(
    candidate.humanInstructions,
    'workflowEnvelope.humanInstructions',
    WORKFLOW_CONTRACT_BOUNDS
      .humanInstructionCharacters,
    issues,
  );

  if (
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.currentHumanDisposition,
    )
  ) {
    issues.push(
      issue(
        'workflowEnvelope.currentHumanDisposition',
        'invalid_value',
        'Unknown human disposition.',
      ),
    );
  }

  validateBoundedString(
    candidate.createdAt,
    'workflowEnvelope.createdAt',
    64,
    issues,
  );

  if (
    typeof candidate.createdAt === 'string' &&
    Number.isNaN(Date.parse(candidate.createdAt))
  ) {
    issues.push(
      issue(
        'workflowEnvelope.createdAt',
        'invalid_value',
        'Timestamp must be valid ISO-8601 text.',
      ),
    );
  }

  validateOptionalIdentifier(
    candidate.supersedesHandoffId,
    'workflowEnvelope.supersedesHandoffId',
    issues,
  );

  if (candidate.automaticContinuation !== false) {
    issues.push(
      issue(
        'workflowEnvelope.automaticContinuation',
        'invalid_value',
        'Automatic continuation is prohibited.',
      ),
    );
  }

  if (
    candidate.authorityExpansionRequested !== false
  ) {
    issues.push(
      issue(
        'workflowEnvelope.authorityExpansionRequested',
        'invalid_value',
        'Authority expansion is prohibited.',
      ),
    );
  }

  if (authorization.ok) {
    if (
      authorization.value.scopeKind !== 'run' ||
      authorization.value.scopeId !==
        candidate.runId ||
      authorization.value.roleId !==
        candidate.roleId ||
      authorization.value.taskClass !==
        candidate.requestedTaskClass
    ) {
      issues.push(
        issue(
          'workflowEnvelope.humanAuthorization',
          'human_authorization_mismatch',
          'Authorization must match this specific run, role, and task.',
        ),
      );
    }

    if (
      !authorizedHumanMatchesRole(
        authorization.value.humanClass,
        candidate.roleId,
      )
    ) {
      issues.push(
        issue(
          'workflowEnvelope.humanAuthorization.humanClass',
          'human_authorization_mismatch',
          'Human class is not authorized to initiate this role.',
        ),
      );
    }
  }

  return result(
    candidate as unknown as ExecutiveWorkflowEnvelope,
    issues,
  );
}

function validateDisagreementPositionV2(
  candidate: unknown,
  path: string,
): HumanMediatedValidationResult<
  DisagreementPositionV2
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a disagreement-position object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'positionId',
      'origin',
      'statement',
      'evidenceReferences',
      'unsupportedAssertions',
      'assumptions',
      'unknowns',
      'consequenceIfWrong',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.positionId,
    `${path}.positionId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      DISAGREEMENT_POSITION_ORIGINS,
      candidate.origin,
    )
  ) {
    issues.push(
      issue(
        `${path}.origin`,
        'invalid_value',
        'Unknown disagreement-position origin.',
      ),
    );
  }

  validateBoundedString(
    candidate.statement,
    `${path}.statement`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS
      .evidenceReferencesPerPosition,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedStringArray(
    candidate.unsupportedAssertions,
    `${path}.unsupportedAssertions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    2_000,
    issues,
  );

  validateBoundedString(
    candidate.consequenceIfWrong,
    `${path}.consequenceIfWrong`,
    4_000,
    issues,
  );

  return result(
    candidate as unknown as DisagreementPositionV2,
    issues,
  );
}

export function validateMaterialDisagreementV2(
  candidate: unknown,
  path = 'materialDisagreement',
): HumanMediatedValidationResult<
  MaterialDisagreementV2
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a material-disagreement object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'version',
      'disagreementId',
      'issueInDispute',
      'positions',
      'affectedDependencies',
      'securityConsequences',
      'reliabilityConsequences',
      'costConsequences',
      'latencyConsequences',
      'reversibilityConsequences',
      'consequenceOfDelay',
      'recommendedOption',
      'confidenceAndLimitations',
      'recommendedHumanDecisionOwner',
      'founderApprovalRequired',
      'humanDisposition',
      'dispositionSource',
      'preservationRequired',
      'resolved',
      'humanResolutionReference',
    ],
    path,
    issues,
  );

  if (
    candidate.version !==
    MATERIAL_DISAGREEMENT_VERSION
  ) {
    issues.push(
      issue(
        `${path}.version`,
        'invalid_value',
        'Unknown material-disagreement version.',
      ),
    );
  }

  validateBoundedString(
    candidate.disagreementId,
    `${path}.disagreementId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.issueInDispute,
    `${path}.issueInDispute`,
    4_000,
    issues,
  );

  if (!Array.isArray(candidate.positions)) {
    issues.push(
      issue(
        `${path}.positions`,
        'invalid_type',
        'Positions must be an array.',
      ),
    );
  } else {
    if (candidate.positions.length < 2) {
      issues.push(
        issue(
          `${path}.positions`,
          'invalid_value',
          'A material disagreement requires at least two positions.',
        ),
      );
    }

    if (
      candidate.positions.length >
      WORKFLOW_CONTRACT_BOUNDS
        .disagreementPositions
    ) {
      issues.push(
        issue(
          `${path}.positions`,
          'too_many_items',
          'Too many disagreement positions.',
        ),
      );
    }

    const positionIds = new Set<string>();
    const positionStatements = new Set<string>();

    candidate.positions.forEach(
      (position, index) => {
        const positionPath =
          `${path}.positions[${index}]`;

        const validation =
          validateDisagreementPositionV2(
            position,
            positionPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        if (
          positionIds.has(
            validation.value.positionId,
          )
        ) {
          issues.push(
            issue(
              `${positionPath}.positionId`,
              'invalid_value',
              'Disagreement position IDs must be unique.',
            ),
          );
        }

        positionIds.add(
          validation.value.positionId,
        );

        const normalizedStatement =
          validation.value.statement
            .trim()
            .toLowerCase();

        if (
          positionStatements.has(
            normalizedStatement,
          )
        ) {
          issues.push(
            issue(
              `${positionPath}.statement`,
              'invalid_value',
              'Positions must be materially different.',
            ),
          );
        }

        positionStatements.add(
          normalizedStatement,
        );
      },
    );
  }

  validateBoundedStringArray(
    candidate.affectedDependencies,
    `${path}.affectedDependencies`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.securityConsequences,
    `${path}.securityConsequences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.reliabilityConsequences,
    `${path}.reliabilityConsequences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.costConsequences,
    `${path}.costConsequences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.latencyConsequences,
    `${path}.latencyConsequences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.reversibilityConsequences,
    `${path}.reversibilityConsequences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  if (candidate.consequenceOfDelay !== null) {
    validateBoundedString(
      candidate.consequenceOfDelay,
      `${path}.consequenceOfDelay`,
      4_000,
      issues,
    );
  }

  if (candidate.recommendedOption !== null) {
    validateBoundedString(
      candidate.recommendedOption,
      `${path}.recommendedOption`,
      4_000,
      issues,
    );
  }

  validateBoundedStringArray(
    candidate.confidenceAndLimitations,
    `${path}.confidenceAndLimitations`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  if (
    candidate.recommendedHumanDecisionOwner !==
      'founder' &&
    candidate.recommendedHumanDecisionOwner !==
      'human_reviewer'
  ) {
    issues.push(
      issue(
        `${path}.recommendedHumanDecisionOwner`,
        'invalid_value',
        'Unknown human decision owner.',
      ),
    );
  }

  if (
    typeof candidate.founderApprovalRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.founderApprovalRequired`,
        'invalid_type',
        'Expected a boolean Founder-approval marker.',
      ),
    );
  }

  if (
    candidate.humanDisposition !== null &&
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.humanDisposition,
    )
  ) {
    issues.push(
      issue(
        `${path}.humanDisposition`,
        'invalid_value',
        'Unknown human disposition.',
      ),
    );
  }

  if (
    candidate.dispositionSource !== null &&
    !isRecord(candidate.dispositionSource)
  ) {
    issues.push(
      issue(
        `${path}.dispositionSource`,
        'invalid_type',
        'Disposition source must be a human-disposition record or null.',
      ),
    );
  }

  if (
    candidate.humanDisposition === null &&
    candidate.dispositionSource !== null
  ) {
    issues.push(
      issue(
        `${path}.dispositionSource`,
        'invalid_value',
        'A disposition source requires an explicit human disposition.',
      ),
    );
  }

  if (
    candidate.humanDisposition !== null &&
    candidate.dispositionSource === null
  ) {
    issues.push(
      issue(
        `${path}.dispositionSource`,
        'missing_value',
        'An explicit human disposition requires its human source record.',
      ),
    );
  }

  if (candidate.preservationRequired !== true) {
    issues.push(
      issue(
        `${path}.preservationRequired`,
        'invalid_value',
        'Material disagreement preservation is mandatory.',
      ),
    );
  }

  if (typeof candidate.resolved !== 'boolean') {
    issues.push(
      issue(
        `${path}.resolved`,
        'invalid_type',
        'Expected a boolean resolution state.',
      ),
    );
  }

  if (candidate.resolved === true) {
    if (
      candidate.humanDisposition === null ||
      candidate.humanDisposition === 'pending'
    ) {
      issues.push(
        issue(
          `${path}.humanDisposition`,
          'invalid_value',
          'Resolved disagreement requires a non-pending explicit human disposition.',
        ),
      );
    }

    if (candidate.dispositionSource === null) {
      issues.push(
        issue(
          `${path}.dispositionSource`,
          'missing_value',
          'Resolved disagreement requires human disposition provenance.',
        ),
      );
    }

    validateBoundedString(
      candidate.humanResolutionReference,
      `${path}.humanResolutionReference`,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );
  }

  if (
    candidate.resolved === false &&
    candidate.humanResolutionReference !== null
  ) {
    issues.push(
      issue(
        `${path}.humanResolutionReference`,
        'invalid_value',
        'An unresolved disagreement cannot have a human resolution reference.',
      ),
    );
  }

  return result(
    candidate as unknown as MaterialDisagreementV2,
    issues,
  );
}

function validateRoleDraftReference(
  candidate: unknown,
  path: string,
): HumanMediatedValidationResult<
  RoleDraftReference
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a role-draft reference object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'draftReferenceId',
      'originatingRunId',
      'originatingRoleId',
      'taskClass',
      'sourceCommitSha',
      'disposition',
      'noncanonical',
      'pendingSubstantiveApproval',
      'evidenceReferences',
      'dissent',
      'unknowns',
      'requiredHumanDecisions',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.draftReferenceId,
    `${path}.draftReferenceId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.originatingRunId,
    `${path}.originatingRunId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  const roleValid =
    typeof candidate.originatingRoleId ===
      'string' &&
    isExecutiveRoleId(
      candidate.originatingRoleId,
    );

  if (!roleValid) {
    issues.push(
      issue(
        `${path}.originatingRoleId`,
        'unknown_role',
        'Unknown originating role.',
      ),
    );
  }

  const taskValid =
    typeof candidate.taskClass === 'string' &&
    isTaskClass(candidate.taskClass);

  if (!taskValid) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown originating task class.',
      ),
    );
  } else if (
    roleValid &&
    !isTaskAllowedForRole(
      candidate.originatingRoleId as Parameters<
        typeof isTaskAllowedForRole
      >[0],
      candidate.taskClass as Parameters<
        typeof isTaskAllowedForRole
      >[1],
    )
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Originating task is not allowed for the originating role.',
      ),
    );
  }

  if (
    typeof candidate.sourceCommitSha !== 'string' ||
    !/^[0-9a-f]{40}$/.test(
      candidate.sourceCommitSha,
    )
  ) {
    issues.push(
      issue(
        `${path}.sourceCommitSha`,
        'invalid_value',
        'A 40-character lowercase commit SHA is required.',
      ),
    );
  }

  if (
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.disposition,
    )
  ) {
    issues.push(
      issue(
        `${path}.disposition`,
        'invalid_value',
        'Unknown originating draft disposition.',
      ),
    );
  }

  if (candidate.noncanonical !== true) {
    issues.push(
      issue(
        `${path}.noncanonical`,
        'invalid_value',
        'Transferred role drafts must remain noncanonical.',
      ),
    );
  }

  if (
    typeof candidate.pendingSubstantiveApproval !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.pendingSubstantiveApproval`,
        'invalid_type',
        'Expected a boolean pending-approval marker.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedStringArray(
    candidate.dissent,
    `${path}.dissent`,
    WORKFLOW_CONTRACT_BOUNDS.dissentEntries,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.requiredHumanDecisions,
    `${path}.requiredHumanDecisions`,
    WORKFLOW_CONTRACT_BOUNDS
      .requiredHumanDecisions,
    2_000,
    issues,
  );

  return result(
    candidate as unknown as RoleDraftReference,
    issues,
  );
}

function validateHandoffOmissionRecord(
  candidate: unknown,
  path: string,
): HumanMediatedValidationResult<
  HandoffOmissionRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a handoff-omission record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'section',
      'reason',
      'materialDissentOmitted',
      'materialUnknownOmitted',
      'requiredHumanDecisionOmitted',
    ],
    path,
    issues,
  );

  if (
    !includesLiteral(
      HANDOFF_TRANSFER_SECTIONS,
      candidate.section,
    )
  ) {
    issues.push(
      issue(
        `${path}.section`,
        'invalid_value',
        'Unknown omitted handoff section.',
      ),
    );
  }

  validateBoundedString(
    candidate.reason,
    `${path}.reason`,
    2_000,
    issues,
  );

  if (candidate.materialDissentOmitted !== false) {
    issues.push(
      issue(
        `${path}.materialDissentOmitted`,
        'invalid_value',
        'Material dissent may not be omitted.',
      ),
    );
  }

  if (candidate.materialUnknownOmitted !== false) {
    issues.push(
      issue(
        `${path}.materialUnknownOmitted`,
        'invalid_value',
        'Material unknowns may not be omitted.',
      ),
    );
  }

  if (
    candidate.requiredHumanDecisionOmitted !== false
  ) {
    issues.push(
      issue(
        `${path}.requiredHumanDecisionOmitted`,
        'invalid_value',
        'Required human decisions may not be omitted.',
      ),
    );
  }

  return result(
    candidate as unknown as HandoffOmissionRecord,
    issues,
  );
}

function containsEveryString(
  source: readonly string[],
  transferred: readonly string[],
): boolean {
  const transferredValues = new Set(
    transferred,
  );

  return source.every(value =>
    transferredValues.has(value),
  );
}

function isPermittedHandoffDirection(
  originatingRole: string,
  receivingRole: string,
  receivingTask: string,
): boolean {
  if (
    originatingRole ===
      'executive.chief_architecture_officer' &&
    (
      receivingRole ===
        'executive.chief_of_staff' ||
      receivingRole === 'executive.ceo'
    )
  ) {
    return true;
  }

  if (
    originatingRole ===
      'executive.chief_of_staff' &&
    receivingRole === 'executive.ceo'
  ) {
    return true;
  }

  if (
    (
      originatingRole === 'executive.ceo' ||
      originatingRole ===
        'executive.chief_of_staff'
    ) &&
    receivingRole ===
      'executive.chief_architecture_officer'
  ) {
    return receivingTask === 'architecture_analysis';
  }

  return false;
}

export function validateHumanMediatedHandoff(
  candidate: unknown,
): HumanMediatedValidationResult<
  HumanMediatedHandoff
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          'handoff',
          'invalid_type',
          'Expected a human-mediated handoff object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'handoffId',
      'workflowId',
      'parentHandoffId',
      'originatingRunId',
      'originatingRoleId',
      'receivingRoleId',
      'originatingDraftReference',
      'originatingDraftStatus',
      'originatingHumanDisposition',
      'substantiveApprovalOccurred',
      'sectionsSelectedForTransfer',
      'humanSummaryOrInstruction',
      'humanAuthorization',
      'humanConfirmationNoncanonical',
      'humanConfirmationNoSubstantiveApproval',
      'evidenceReferencesTransferred',
      'dissentTransferred',
      'unknownsTransferred',
      'requiredHumanDecisionsTransferred',
      'materialDisagreementsTransferred',
      'omissions',
      'requestedTaskClassForReceiver',
      'createdAt',
      'receivingRoleDisposition',
      'receivingRoleSeparatelyInitiated',
      'automaticContinuation',
      'inheritedApproval',
      'roleDispatchPerformed',
      'authorityExpansionRequested',
      'implementationAuthorized',
      'toolPermissionInherited',
      'modelAssignmentInherited',
    ],
    'handoff',
    issues,
  );

  validateBoundedString(
    candidate.handoffId,
    'handoff.handoffId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    'handoff.workflowId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateOptionalIdentifier(
    candidate.parentHandoffId,
    'handoff.parentHandoffId',
    issues,
  );

  validateBoundedString(
    candidate.originatingRunId,
    'handoff.originatingRunId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  const originatingRoleValid =
    typeof candidate.originatingRoleId ===
      'string' &&
    isExecutiveRoleId(
      candidate.originatingRoleId,
    );

  const receivingRoleValid =
    typeof candidate.receivingRoleId ===
      'string' &&
    isExecutiveRoleId(
      candidate.receivingRoleId,
    );

  if (!originatingRoleValid) {
    issues.push(
      issue(
        'handoff.originatingRoleId',
        'unknown_role',
        'Unknown originating role.',
      ),
    );
  }

  if (!receivingRoleValid) {
    issues.push(
      issue(
        'handoff.receivingRoleId',
        'unknown_role',
        'Unknown receiving role.',
      ),
    );
  }

  if (
    originatingRoleValid &&
    receivingRoleValid &&
    candidate.originatingRoleId ===
      candidate.receivingRoleId
  ) {
    issues.push(
      issue(
        'handoff.receivingRoleId',
        'invalid_value',
        'A cross-role handoff requires different originating and receiving roles.',
      ),
    );
  }

  const draftValidation =
    validateRoleDraftReference(
      candidate.originatingDraftReference,
      'handoff.originatingDraftReference',
    );

  if (!draftValidation.ok) {
    issues.push(...draftValidation.issues);
  }

  if (
    candidate.originatingDraftStatus !==
    'noncanonical_draft'
  ) {
    issues.push(
      issue(
        'handoff.originatingDraftStatus',
        'invalid_value',
        'Originating draft must remain noncanonical.',
      ),
    );
  }

  if (
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.originatingHumanDisposition,
    )
  ) {
    issues.push(
      issue(
        'handoff.originatingHumanDisposition',
        'invalid_value',
        'Unknown originating human disposition.',
      ),
    );
  } else if (
    candidate.originatingHumanDisposition !==
      'pending' &&
    candidate.originatingHumanDisposition !==
      'approved_for_draft_use'
  ) {
    issues.push(
      issue(
        'handoff.originatingHumanDisposition',
        'invalid_value',
        'Only pending or approved-for-draft-use drafts may be handed off.',
      ),
    );
  }

  if (candidate.substantiveApprovalOccurred !== false) {
    issues.push(
      issue(
        'handoff.substantiveApprovalOccurred',
        'invalid_value',
        'A handoff may not imply substantive approval.',
      ),
    );
  }

  if (
    !Array.isArray(
      candidate.sectionsSelectedForTransfer,
    )
  ) {
    issues.push(
      issue(
        'handoff.sectionsSelectedForTransfer',
        'invalid_type',
        'Selected handoff sections must be an array.',
      ),
    );
  } else {
    const seenSections = new Set<string>();

    candidate.sectionsSelectedForTransfer.forEach(
      (section, index) => {
        if (
          !includesLiteral(
            HANDOFF_TRANSFER_SECTIONS,
            section,
          )
        ) {
          issues.push(
            issue(
              `handoff.sectionsSelectedForTransfer[${index}]`,
              'invalid_value',
              'Unknown handoff transfer section.',
            ),
          );
          return;
        }

        if (seenSections.has(section)) {
          issues.push(
            issue(
              `handoff.sectionsSelectedForTransfer[${index}]`,
              'invalid_value',
              'Transfer sections must be unique.',
            ),
          );
        }

        seenSections.add(section);
      },
    );
  }

  validateBoundedString(
    candidate.humanSummaryOrInstruction,
    'handoff.humanSummaryOrInstruction',
    WORKFLOW_CONTRACT_BOUNDS
      .humanInstructionCharacters,
    issues,
  );

  const authorization =
    validateHumanAuthorizationReference(
      candidate.humanAuthorization,
    );

  if (!authorization.ok) {
    issues.push(...authorization.issues);
  }

  if (
    candidate.humanConfirmationNoncanonical !== true
  ) {
    issues.push(
      issue(
        'handoff.humanConfirmationNoncanonical',
        'invalid_value',
        'A human must confirm the draft remains noncanonical.',
      ),
    );
  }

  if (
    candidate
      .humanConfirmationNoSubstantiveApproval !==
    true
  ) {
    issues.push(
      issue(
        'handoff.humanConfirmationNoSubstantiveApproval',
        'invalid_value',
        'A human must confirm that no substantive approval occurred.',
      ),
    );
  }

  const evidenceValid =
    validateBoundedStringArray(
      candidate.evidenceReferencesTransferred,
      'handoff.evidenceReferencesTransferred',
      WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );

  const dissentValid =
    validateBoundedStringArray(
      candidate.dissentTransferred,
      'handoff.dissentTransferred',
      WORKFLOW_CONTRACT_BOUNDS.dissentEntries,
      2_000,
      issues,
    );

  const unknownsValid =
    validateBoundedStringArray(
      candidate.unknownsTransferred,
      'handoff.unknownsTransferred',
      WORKFLOW_CONTRACT_BOUNDS.unknowns,
      2_000,
      issues,
    );

  const decisionsValid =
    validateBoundedStringArray(
      candidate.requiredHumanDecisionsTransferred,
      'handoff.requiredHumanDecisionsTransferred',
      WORKFLOW_CONTRACT_BOUNDS
        .requiredHumanDecisions,
      2_000,
      issues,
    );

  if (
    !Array.isArray(
      candidate.materialDisagreementsTransferred,
    )
  ) {
    issues.push(
      issue(
        'handoff.materialDisagreementsTransferred',
        'invalid_type',
        'Transferred material disagreements must be an array.',
      ),
    );
  } else {
    candidate.materialDisagreementsTransferred.forEach(
      (disagreement, index) => {
        const validation =
          validateMaterialDisagreementV2(
            disagreement,
            `handoff.materialDisagreementsTransferred[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
        }
      },
    );
  }

  if (!Array.isArray(candidate.omissions)) {
    issues.push(
      issue(
        'handoff.omissions',
        'invalid_type',
        'Omissions must be an array.',
      ),
    );
  } else {
    if (
      candidate.omissions.length >
      WORKFLOW_CONTRACT_BOUNDS.omittedSections
    ) {
      issues.push(
        issue(
          'handoff.omissions',
          'too_many_items',
          'Too many omitted sections.',
        ),
      );
    }

    candidate.omissions.forEach(
      (omission, index) => {
        const validation =
          validateHandoffOmissionRecord(
            omission,
            `handoff.omissions[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
        }
      },
    );
  }

  const receivingTaskValid =
    typeof candidate
      .requestedTaskClassForReceiver ===
      'string' &&
    isTaskClass(
      candidate.requestedTaskClassForReceiver,
    );

  if (!receivingTaskValid) {
    issues.push(
      issue(
        'handoff.requestedTaskClassForReceiver',
        'unknown_task',
        'Unknown receiving-role task.',
      ),
    );
  } else if (
    receivingRoleValid &&
    !isTaskAllowedForRole(
      candidate.receivingRoleId as Parameters<
        typeof isTaskAllowedForRole
      >[0],
      candidate
        .requestedTaskClassForReceiver as Parameters<
          typeof isTaskAllowedForRole
        >[1],
    )
  ) {
    issues.push(
      issue(
        'handoff.requestedTaskClassForReceiver',
        'task_not_allowed_for_role',
        'Requested task is not allowed for the receiving role.',
      ),
    );
  }

  if (
    originatingRoleValid &&
    receivingRoleValid &&
    receivingTaskValid &&
    !isPermittedHandoffDirection(
      candidate.originatingRoleId as string,
      candidate.receivingRoleId as string,
      candidate.requestedTaskClassForReceiver as string,
    )
  ) {
    issues.push(
      issue(
        'handoff.receivingRoleId',
        'invalid_value',
        'The proposed role direction and receiving task are not authorized.',
      ),
    );
  }

  validateBoundedString(
    candidate.createdAt,
    'handoff.createdAt',
    64,
    issues,
  );

  if (
    typeof candidate.createdAt === 'string' &&
    Number.isNaN(Date.parse(candidate.createdAt))
  ) {
    issues.push(
      issue(
        'handoff.createdAt',
        'invalid_value',
        'Timestamp must be valid ISO-8601 text.',
      ),
    );
  }

  if (
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.receivingRoleDisposition,
    )
  ) {
    issues.push(
      issue(
        'handoff.receivingRoleDisposition',
        'invalid_value',
        'Unknown receiving-role disposition.',
      ),
    );
  } else if (
    candidate.receivingRoleDisposition !==
    'pending'
  ) {
    issues.push(
      issue(
        'handoff.receivingRoleDisposition',
        'invalid_value',
        'The receiving role must begin with pending human disposition.',
      ),
    );
  }

  const requiredFalseFields = [
    'receivingRoleSeparatelyInitiated',
    'automaticContinuation',
    'inheritedApproval',
    'roleDispatchPerformed',
    'authorityExpansionRequested',
    'implementationAuthorized',
    'toolPermissionInherited',
    'modelAssignmentInherited',
  ] as const;

  requiredFalseFields.forEach(field => {
    if (candidate[field] !== false) {
      issues.push(
        issue(
          `handoff.${field}`,
          'invalid_value',
          `${field} must remain false.`,
        ),
      );
    }
  });

  if (authorization.ok) {
    if (
      authorization.value.scopeKind !==
        'handoff' ||
      authorization.value.scopeId !==
        candidate.handoffId ||
      authorization.value.roleId !==
        candidate.receivingRoleId ||
      authorization.value.taskClass !==
        candidate.requestedTaskClassForReceiver
    ) {
      issues.push(
        issue(
          'handoff.humanAuthorization',
          'human_authorization_mismatch',
          'Authorization must match this specific handoff, receiving role, and receiving task.',
        ),
      );
    }

    if (
      !authorizedHumanMatchesRole(
        authorization.value.humanClass,
        candidate.receivingRoleId,
      )
    ) {
      issues.push(
        issue(
          'handoff.humanAuthorization.humanClass',
          'human_authorization_mismatch',
          'Human class is not authorized for the receiving role.',
        ),
      );
    }
  }

  if (draftValidation.ok) {
    const draft = draftValidation.value;

    if (
      draft.originatingRunId !==
        candidate.originatingRunId ||
      draft.originatingRoleId !==
        candidate.originatingRoleId
    ) {
      issues.push(
        issue(
          'handoff.originatingDraftReference',
          'invalid_value',
          'Draft reference must match the originating run and role.',
        ),
      );
    }

    if (
      draft.disposition !==
      candidate.originatingHumanDisposition
    ) {
      issues.push(
        issue(
          'handoff.originatingHumanDisposition',
          'invalid_value',
          'Handoff disposition must match the originating draft reference.',
        ),
      );
    }

    if (
      candidate.originatingHumanDisposition ===
        'pending' &&
      draft.pendingSubstantiveApproval !== true
    ) {
      issues.push(
        issue(
          'handoff.originatingDraftReference.pendingSubstantiveApproval',
          'invalid_value',
          'A pending draft must remain pending substantive approval.',
        ),
      );
    }

    if (
      evidenceValid &&
      !containsEveryString(
        draft.evidenceReferences,
        candidate.evidenceReferencesTransferred as
          readonly string[],
      )
    ) {
      issues.push(
        issue(
          'handoff.evidenceReferencesTransferred',
          'invalid_value',
          'All originating evidence references must be preserved.',
        ),
      );
    }

    if (
      dissentValid &&
      !containsEveryString(
        draft.dissent,
        candidate.dissentTransferred as
          readonly string[],
      )
    ) {
      issues.push(
        issue(
          'handoff.dissentTransferred',
          'invalid_value',
          'All material dissent must be preserved.',
        ),
      );
    }

    if (
      unknownsValid &&
      !containsEveryString(
        draft.unknowns,
        candidate.unknownsTransferred as
          readonly string[],
      )
    ) {
      issues.push(
        issue(
          'handoff.unknownsTransferred',
          'invalid_value',
          'All material unknowns must be preserved.',
        ),
      );
    }

    if (
      decisionsValid &&
      !containsEveryString(
        draft.requiredHumanDecisions,
        candidate.requiredHumanDecisionsTransferred as
          readonly string[],
      )
    ) {
      issues.push(
        issue(
          'handoff.requiredHumanDecisionsTransferred',
          'invalid_value',
          'All required human decisions must be preserved.',
        ),
      );
    }
  }

  return result(
    candidate as unknown as HumanMediatedHandoff,
    issues,
  );
}

function validateLiteralStringArray<
  const TValues extends readonly string[],
>(
  value: unknown,
  allowedValues: TValues,
  path: string,
  maximumItems: number,
  issues: HumanMediatedValidationIssue[],
): value is readonly TValues[number][] {
  if (
    !validateBoundedStringArray(
      value,
      path,
      maximumItems,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    )
  ) {
    return false;
  }

  value.forEach((item, index) => {
    if (!includesLiteral(allowedValues, item)) {
      issues.push(
        issue(
          `${path}[${index}]`,
          'invalid_value',
          `Unknown value "${item}".`,
        ),
      );
    }
  });

  return true;
}

function validateRequiredFalseFields(
  candidate: Record<string, unknown>,
  fields: readonly string[],
  path: string,
  issues: HumanMediatedValidationIssue[],
): void {
  fields.forEach(field => {
    if (candidate[field] !== false) {
      issues.push(
        issue(
          `${path}.${field}`,
          'invalid_value',
          `${field} must remain false.`,
        ),
      );
    }
  });
}

export function validateExecutiveRoleAuditExtension(
  candidate: unknown,
  expectedRoleId: string | null = null,
  path = 'roleAuditExtension',
): HumanMediatedValidationResult<
  ExecutiveRoleAuditExtension
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a role-specific audit extension.',
        ),
      ],
    };
  }

  const roleId = candidate.roleId;

  if (roleId === 'executive.ceo') {
    validateExactKeys(
      candidate,
      [
        'extensionVersion',
        'roleId',
        'artifactKindsProduced',
        'strategicOptionIds',
        'preferredOptionId',
        'founderChecklistItemIds',
        'implementationAuthorized',
        'publicationAuthorized',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );

    if (
      candidate.extensionVersion !==
      'executive-ceo-in-memory-audit-extension-v1'
    ) {
      issues.push(
        issue(
          `${path}.extensionVersion`,
          'invalid_value',
          'Unknown CEO audit-extension version.',
        ),
      );
    }

    validateLiteralStringArray(
      candidate.artifactKindsProduced,
      CEO_ARTIFACT_KINDS,
      `${path}.artifactKindsProduced`,
      WORKFLOW_CONTRACT_BOUNDS.recommendations,
      issues,
    );

    validateBoundedStringArray(
      candidate.strategicOptionIds,
      `${path}.strategicOptionIds`,
      WORKFLOW_CONTRACT_BOUNDS.recommendations,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );

    validateOptionalIdentifier(
      candidate.preferredOptionId,
      `${path}.preferredOptionId`,
      issues,
    );

    validateBoundedStringArray(
      candidate.founderChecklistItemIds,
      `${path}.founderChecklistItemIds`,
      WORKFLOW_CONTRACT_BOUNDS
        .requiredHumanDecisions,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );

    validateRequiredFalseFields(
      candidate,
      [
        'implementationAuthorized',
        'publicationAuthorized',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );
  } else if (
    roleId === 'executive.chief_of_staff'
  ) {
    validateExactKeys(
      candidate,
      [
        'extensionVersion',
        'roleId',
        'artifactKindsProduced',
        'reportedStatusRecordIds',
        'dependencyIds',
        'proposedOwnerRecordIds',
        'proposedDeadlineRecordIds',
        'recordedHumanDecisionIds',
        'assignmentAuthorityExercised',
        'deadlineAuthorityExercised',
        'adjudicationPerformed',
        'artificialConsensusCreated',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );

    if (
      candidate.extensionVersion !==
      'executive-chief-of-staff-in-memory-audit-extension-v1'
    ) {
      issues.push(
        issue(
          `${path}.extensionVersion`,
          'invalid_value',
          'Unknown Chief of Staff audit-extension version.',
        ),
      );
    }

    validateLiteralStringArray(
      candidate.artifactKindsProduced,
      CHIEF_OF_STAFF_ARTIFACT_KINDS,
      `${path}.artifactKindsProduced`,
      WORKFLOW_CONTRACT_BOUNDS.recommendations,
      issues,
    );

    [
      'reportedStatusRecordIds',
      'dependencyIds',
      'proposedOwnerRecordIds',
      'proposedDeadlineRecordIds',
      'recordedHumanDecisionIds',
    ].forEach(field => {
      validateBoundedStringArray(
        candidate[field],
        `${path}.${field}`,
        WORKFLOW_CONTRACT_BOUNDS.recommendations,
        WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
        issues,
      );
    });

    validateRequiredFalseFields(
      candidate,
      [
        'assignmentAuthorityExercised',
        'deadlineAuthorityExercised',
        'adjudicationPerformed',
        'artificialConsensusCreated',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );
  } else if (
    roleId ===
    'executive.chief_architecture_officer'
  ) {
    validateExactKeys(
      candidate,
      [
        'extensionVersion',
        'roleId',
        'artifactKindsProduced',
        'alternativeIds',
        'architectureProposalIds',
        'riskAnalysisIds',
        'testEvaluationPlanIds',
        'implementationSequenceIds',
        'providerAssignmentPerformed',
        'adapterAssignmentPerformed',
        'schemaMigrationPerformed',
        'adrRatificationPerformed',
        'implementationAuthorized',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );

    if (
      candidate.extensionVersion !==
      'executive-chief-architecture-officer-in-memory-audit-extension-v1'
    ) {
      issues.push(
        issue(
          `${path}.extensionVersion`,
          'invalid_value',
          'Unknown CAO audit-extension version.',
        ),
      );
    }

    validateLiteralStringArray(
      candidate.artifactKindsProduced,
      CAO_ARTIFACT_KINDS,
      `${path}.artifactKindsProduced`,
      WORKFLOW_CONTRACT_BOUNDS.recommendations,
      issues,
    );

    [
      'alternativeIds',
      'architectureProposalIds',
      'riskAnalysisIds',
      'testEvaluationPlanIds',
      'implementationSequenceIds',
    ].forEach(field => {
      validateBoundedStringArray(
        candidate[field],
        `${path}.${field}`,
        WORKFLOW_CONTRACT_BOUNDS.recommendations,
        WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
        issues,
      );
    });

    validateRequiredFalseFields(
      candidate,
      [
        'providerAssignmentPerformed',
        'adapterAssignmentPerformed',
        'schemaMigrationPerformed',
        'adrRatificationPerformed',
        'implementationAuthorized',
        'roleDispatchAuthorized',
      ],
      path,
      issues,
    );
  } else {
    issues.push(
      issue(
        `${path}.roleId`,
        'unknown_role',
        'Unknown role-specific audit extension.',
      ),
    );
  }

  if (
    expectedRoleId !== null &&
    roleId !== expectedRoleId
  ) {
    issues.push(
      issue(
        `${path}.roleId`,
        'invalid_value',
        'Role audit extension does not match the audit-event role.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ExecutiveRoleAuditExtension,
    issues,
  );
}

export function validateExecutiveWorkflowAuditEvent(
  candidate: unknown,
  path = 'auditEvent',
): HumanMediatedValidationResult<
  ExecutiveWorkflowAuditEvent
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an audit-event object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'auditVersion',
      'auditEventId',
      'workflowId',
      'runId',
      'handoffId',
      'eventKind',
      'priorState',
      'nextState',
      'roleId',
      'taskClass',
      'actorKind',
      'actorIdentifier',
      'humanAuthorization',
      'recordedAt',
      'sourceCommitSha',
      'evidenceReferences',
      'draftReferenceIds',
      'disagreementIds',
      'roleAuditExtension',
      'explicitHumanActionObserved',
      'automaticTransitionPerformed',
      'autonomousDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'externalCommunicationPerformed',
      'previewActivationPerformed',
      'productionActionPerformed',
      'legalAuthorityExercised',
      'constitutionalAuthorityExercised',
    ],
    path,
    issues,
  );

  if (
    candidate.auditVersion !==
    'executive-human-mediated-audit-event-v1'
  ) {
    issues.push(
      issue(
        `${path}.auditVersion`,
        'invalid_value',
        'Unknown workflow audit-event version.',
      ),
    );
  }

  validateBoundedString(
    candidate.auditEventId,
    `${path}.auditEventId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateOptionalIdentifier(
    candidate.runId,
    `${path}.runId`,
    issues,
  );

  validateOptionalIdentifier(
    candidate.handoffId,
    `${path}.handoffId`,
    issues,
  );

  if (
    !includesLiteral(
      EXECUTIVE_WORKFLOW_AUDIT_EVENT_KINDS,
      candidate.eventKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.eventKind`,
        'invalid_value',
        'Unknown workflow audit-event kind.',
      ),
    );
  }

  const priorState = candidate.priorState;
  const nextState = candidate.nextState;

  const priorStateValid =
    priorState === null ||
    includesLiteral(
      EXECUTIVE_WORKFLOW_STATES,
      priorState,
    );

  const nextStateValid =
    includesLiteral(
      EXECUTIVE_WORKFLOW_STATES,
      nextState,
    );

  if (!priorStateValid) {
    issues.push(
      issue(
        `${path}.priorState`,
        'invalid_value',
        'Unknown prior workflow state.',
      ),
    );
  }

  if (!nextStateValid) {
    issues.push(
      issue(
        `${path}.nextState`,
        'invalid_value',
        'Unknown next workflow state.',
      ),
    );
  }

  const roleId = candidate.roleId;
  const taskClass = candidate.taskClass;

  const roleValid =
    roleId === null ||
    (
      typeof roleId === 'string' &&
      isExecutiveRoleId(roleId)
    );

  const taskValid =
    taskClass === null ||
    (
      typeof taskClass === 'string' &&
      isTaskClass(taskClass)
    );

  if (!roleValid) {
    issues.push(
      issue(
        `${path}.roleId`,
        'unknown_role',
        'Unknown audit-event role.',
      ),
    );
  }

  if (!taskValid) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown audit-event task class.',
      ),
    );
  }

  if (
    roleId !== null &&
    taskClass !== null &&
    typeof roleId === 'string' &&
    typeof taskClass === 'string' &&
    isExecutiveRoleId(roleId) &&
    isTaskClass(taskClass) &&
    !isTaskAllowedForRole(roleId, taskClass)
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Audit-event task is not allowed for the role.',
      ),
    );
  }

  if (
    !includesLiteral(
      EXECUTIVE_WORKFLOW_AUDIT_ACTOR_KINDS,
      candidate.actorKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.actorKind`,
        'invalid_value',
        'Unknown workflow audit actor.',
      ),
    );
  }

  validateBoundedString(
    candidate.actorIdentifier,
    `${path}.actorIdentifier`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  let authorizationResult:
    HumanMediatedValidationResult<
      HumanAuthorizationReference
    > | null = null;

  if (candidate.humanAuthorization !== null) {
    authorizationResult =
      validateHumanAuthorizationReference(
        candidate.humanAuthorization,
      );

    if (!authorizationResult.ok) {
      issues.push(...authorizationResult.issues);
    }
  }

  validateBoundedString(
    candidate.recordedAt,
    `${path}.recordedAt`,
    64,
    issues,
  );

  if (
    typeof candidate.recordedAt === 'string' &&
    Number.isNaN(Date.parse(candidate.recordedAt))
  ) {
    issues.push(
      issue(
        `${path}.recordedAt`,
        'invalid_value',
        'Audit timestamp must be valid ISO-8601 text.',
      ),
    );
  }

  if (
    typeof candidate.sourceCommitSha !== 'string' ||
    !/^[0-9a-f]{40}$/.test(
      candidate.sourceCommitSha,
    )
  ) {
    issues.push(
      issue(
        `${path}.sourceCommitSha`,
        'invalid_value',
        'A 40-character lowercase commit SHA is required.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedStringArray(
    candidate.draftReferenceIds,
    `${path}.draftReferenceIds`,
    WORKFLOW_CONTRACT_BOUNDS
      .priorRoleDraftReferences,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedStringArray(
    candidate.disagreementIds,
    `${path}.disagreementIds`,
    WORKFLOW_CONTRACT_BOUNDS
      .disagreementPositions,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (candidate.roleAuditExtension !== null) {
    const extensionValidation =
      validateExecutiveRoleAuditExtension(
        candidate.roleAuditExtension,
        typeof roleId === 'string'
          ? roleId
          : null,
        `${path}.roleAuditExtension`,
      );

    if (!extensionValidation.ok) {
      issues.push(...extensionValidation.issues);
    }

    if (roleId === null) {
      issues.push(
        issue(
          `${path}.roleAuditExtension`,
          'invalid_value',
          'A role audit extension requires an audit-event role.',
        ),
      );
    }
  }

  if (
    typeof candidate.explicitHumanActionObserved !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.explicitHumanActionObserved`,
        'invalid_type',
        'Expected a boolean human-action marker.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'automaticTransitionPerformed',
      'autonomousDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'externalCommunicationPerformed',
      'previewActivationPerformed',
      'productionActionPerformed',
      'legalAuthorityExercised',
      'constitutionalAuthorityExercised',
    ],
    path,
    issues,
  );

  if (
    priorState === null &&
    nextStateValid
  ) {
    if (
      candidate.eventKind !==
        'request_prepared' ||
      nextState !== 'draft_request_prepared'
    ) {
      issues.push(
        issue(
          `${path}.nextState`,
          'invalid_value',
          'A null prior state is permitted only for initial request preparation.',
        ),
      );
    }
  } else if (
    priorState !== null &&
    includesLiteral(
      EXECUTIVE_WORKFLOW_STATES,
      priorState,
    ) &&
    nextStateValid
  ) {
    const transition =
      EXECUTIVE_WORKFLOW_TRANSITIONS.find(
        item =>
          item.from === priorState &&
          item.to === nextState,
      );

    if (transition === undefined) {
      issues.push(
        issue(
          `${path}.nextState`,
          'invalid_value',
          'The recorded workflow-state transition is not permitted.',
        ),
      );
    } else if (
      transition.affirmativeHumanActionRequired &&
      (
        candidate.explicitHumanActionObserved !==
          true ||
        candidate.actorKind !==
          'authorized_human' ||
        candidate.humanAuthorization === null
      )
    ) {
      issues.push(
        issue(
          `${path}.explicitHumanActionObserved`,
          'human_authorization_mismatch',
          'This transition requires affirmative human action and authorization.',
        ),
      );
    }
  }

  if (
    candidate.actorKind === 'authorized_human'
  ) {
    if (
      candidate.explicitHumanActionObserved !==
      true
    ) {
      issues.push(
        issue(
          `${path}.explicitHumanActionObserved`,
          'human_authorization_mismatch',
          'An authorized-human audit event must record explicit human action.',
        ),
      );
    }

    if (candidate.humanAuthorization === null) {
      issues.push(
        issue(
          `${path}.humanAuthorization`,
          'missing_value',
          'An authorized-human audit event requires authorization provenance.',
        ),
      );
    }
  }

  if (
    candidate.actorKind ===
      'local_in_memory_coordinator' &&
    candidate.humanAuthorization !== null
  ) {
    issues.push(
      issue(
        `${path}.humanAuthorization`,
        'invalid_value',
        'Coordinator audit events may not impersonate human authorization.',
      ),
    );
  }

  if (
    authorizationResult !== null &&
    authorizationResult.ok
  ) {
    const authorization =
      authorizationResult.value;

    if (
      roleId !== null &&
      authorization.roleId !== roleId
    ) {
      issues.push(
        issue(
          `${path}.humanAuthorization.roleId`,
          'human_authorization_mismatch',
          'Audit authorization role does not match the event role.',
        ),
      );
    }

    if (
      taskClass !== null &&
      authorization.taskClass !== taskClass
    ) {
      issues.push(
        issue(
          `${path}.humanAuthorization.taskClass`,
          'human_authorization_mismatch',
          'Audit authorization task does not match the event task.',
        ),
      );
    }

    const expectedScopeId =
      authorization.scopeKind === 'handoff'
        ? candidate.handoffId
        : candidate.runId;

    if (
      expectedScopeId === null ||
      authorization.scopeId !==
        expectedScopeId
    ) {
      issues.push(
        issue(
          `${path}.humanAuthorization.scopeId`,
          'human_authorization_mismatch',
          'Audit authorization does not match the recorded run or handoff.',
        ),
      );
    }
  }

  return result(
    candidate as unknown as
      ExecutiveWorkflowAuditEvent,
    issues,
  );
}

export function validateInMemoryWorkflowAuditTrail(
  candidate: unknown,
): HumanMediatedValidationResult<
  InMemoryWorkflowAuditTrail
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          'auditTrail',
          'invalid_type',
          'Expected an in-memory audit-trail object.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'auditTrailVersion',
      'workflowId',
      'events',
      'inMemoryOnly',
      'retainedAfterProcessExit',
      'persistenceRequested',
      'persistencePerformed',
      'databaseResourceCreated',
      'externalLogDestinationConfigured',
      'automaticExecutionAuthority',
    ],
    'auditTrail',
    issues,
  );

  if (
    candidate.auditTrailVersion !==
    'executive-human-mediated-in-memory-audit-trail-v1'
  ) {
    issues.push(
      issue(
        'auditTrail.auditTrailVersion',
        'invalid_value',
        'Unknown in-memory audit-trail version.',
      ),
    );
  }

  validateBoundedString(
    candidate.workflowId,
    'auditTrail.workflowId',
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (!Array.isArray(candidate.events)) {
    issues.push(
      issue(
        'auditTrail.events',
        'invalid_type',
        'Audit events must be an array.',
      ),
    );
  } else {
    if (candidate.events.length > 128) {
      issues.push(
        issue(
          'auditTrail.events',
          'too_many_items',
          'An in-memory audit trail may contain at most 128 events.',
        ),
      );
    }

    const eventIds = new Set<string>();
    let priorValidatedEvent:
      ExecutiveWorkflowAuditEvent | null = null;

    candidate.events.forEach(
      (event, index) => {
        const eventPath =
          `auditTrail.events[${index}]`;

        const validation =
          validateExecutiveWorkflowAuditEvent(
            event,
            eventPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        const validatedEvent = validation.value;

        if (
          validatedEvent.workflowId !==
          candidate.workflowId
        ) {
          issues.push(
            issue(
              `${eventPath}.workflowId`,
              'invalid_value',
              'Every audit event must belong to the audit-trail workflow.',
            ),
          );
        }

        if (
          eventIds.has(
            validatedEvent.auditEventId,
          )
        ) {
          issues.push(
            issue(
              `${eventPath}.auditEventId`,
              'invalid_value',
              'Audit-event IDs must be unique.',
            ),
          );
        }

        eventIds.add(
          validatedEvent.auditEventId,
        );

        if (priorValidatedEvent !== null) {
          if (
            validatedEvent.priorState !==
            priorValidatedEvent.nextState
          ) {
            issues.push(
              issue(
                `${eventPath}.priorState`,
                'invalid_value',
                'Audit-event state lineage is discontinuous.',
              ),
            );
          }

          if (
            Date.parse(validatedEvent.recordedAt) <
            Date.parse(
              priorValidatedEvent.recordedAt,
            )
          ) {
            issues.push(
              issue(
                `${eventPath}.recordedAt`,
                'invalid_value',
                'Audit events must remain chronologically ordered.',
              ),
            );
          }
        }

        priorValidatedEvent = validatedEvent;
      },
    );
  }

  if (candidate.inMemoryOnly !== true) {
    issues.push(
      issue(
        'auditTrail.inMemoryOnly',
        'invalid_value',
        'The audit trail must remain in memory only.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'retainedAfterProcessExit',
      'persistenceRequested',
      'persistencePerformed',
      'databaseResourceCreated',
      'externalLogDestinationConfigured',
      'automaticExecutionAuthority',
    ],
    'auditTrail',
    issues,
  );

  return result(
    candidate as unknown as
      InMemoryWorkflowAuditTrail,
    issues,
  );
}

function validateUniqueStringValues(
  value: unknown,
  path: string,
  issues: HumanMediatedValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    return;
  }

  const seen = new Set<string>();

  value.forEach((item, index) => {
    if (typeof item !== 'string') {
      return;
    }

    if (seen.has(item)) {
      issues.push(
        issue(
          `${path}[${index}]`,
          'invalid_value',
          'Values must be unique.',
        ),
      );
    }

    seen.add(item);
  });
}

export function validateExecutiveAgentDraftOutput(
  candidate: unknown,
  path = 'roleOutput.commonOutput',
): HumanMediatedValidationResult<
  ExecutiveAgentDraftOutput
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a common executive-agent draft output.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'facts',
      'assumptions',
      'unknowns',
      'recommendations',
      'dissent',
      'requiredHumanDecisions',
      'prohibitedOrUnavailableActions',
      'evidenceReferences',
      'escalationRequired',
      'draftArtifact',
    ],
    path,
    issues,
  );

  validateBoundedStringArray(
    candidate.facts,
    `${path}.facts`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.recommendations,
    `${path}.recommendations`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.dissent,
    `${path}.dissent`,
    WORKFLOW_CONTRACT_BOUNDS.dissentEntries,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.requiredHumanDecisions,
    `${path}.requiredHumanDecisions`,
    WORKFLOW_CONTRACT_BOUNDS
      .requiredHumanDecisions,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.prohibitedOrUnavailableActions,
    `${path}.prohibitedOrUnavailableActions`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (
    typeof candidate.escalationRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.escalationRequired`,
        'invalid_type',
        'Expected a boolean escalation marker.',
      ),
    );
  }

  validateBoundedString(
    candidate.draftArtifact,
    `${path}.draftArtifact`,
    WORKFLOW_CONTRACT_BOUNDS
      .humanInstructionCharacters,
    issues,
  );

  return result(
    candidate as unknown as
      ExecutiveAgentDraftOutput,
    issues,
  );
}

export function validateClarificationRequestProposal(
  candidate: unknown,
  path = 'clarificationRequest',
): HumanMediatedValidationResult<
  ClarificationRequestProposal
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a clarification-request proposal.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'clarificationRequestId',
      'workflowId',
      'runId',
      'roleId',
      'question',
      'reason',
      'evidenceReferences',
      'addressedToHuman',
      'toolCallRequested',
      'roleDispatchRequested',
      'automaticContinuationRequested',
      'evidenceCollectionAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.clarificationRequestId,
    `${path}.clarificationRequestId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    `${path}.runId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    typeof candidate.roleId !== 'string' ||
    !isExecutiveRoleId(candidate.roleId)
  ) {
    issues.push(
      issue(
        `${path}.roleId`,
        'unknown_role',
        'Unknown clarification-request role.',
      ),
    );
  }

  validateBoundedString(
    candidate.question,
    `${path}.question`,
    4_000,
    issues,
  );

  validateBoundedString(
    candidate.reason,
    `${path}.reason`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.addressedToHuman !== true) {
    issues.push(
      issue(
        `${path}.addressedToHuman`,
        'invalid_value',
        'Clarification requests must be addressed to a human.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'toolCallRequested',
      'roleDispatchRequested',
      'automaticContinuationRequested',
      'evidenceCollectionAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      ClarificationRequestProposal,
    issues,
  );
}

export function validateFounderApprovalChecklistItem(
  candidate: unknown,
  path = 'founderApprovalChecklistItem',
): HumanMediatedValidationResult<
  FounderApprovalChecklistItem
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a Founder approval checklist item.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'checklistItemId',
      'approvalQuestion',
      'approvalReferenceRequired',
      'currentlyApproved',
      'humanDecisionRequired',
      'evidenceReferences',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.checklistItemId,
    `${path}.checklistItemId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.approvalQuestion,
    `${path}.approvalQuestion`,
    4_000,
    issues,
  );

  if (
    typeof candidate.approvalReferenceRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.approvalReferenceRequired`,
        'invalid_type',
        'Expected a boolean approval-reference marker.',
      ),
    );
  }

  if (
    typeof candidate.currentlyApproved !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.currentlyApproved`,
        'invalid_type',
        'Expected a boolean current-approval marker.',
      ),
    );
  }

  if (candidate.humanDecisionRequired !== true) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_value',
        'Founder checklist items require a human decision.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  return result(
    candidate as unknown as
      FounderApprovalChecklistItem,
    issues,
  );
}

export function validateStrategicOptionDraft(
  candidate: unknown,
  path = 'strategicOption',
): HumanMediatedValidationResult<
  StrategicOptionDraft
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a strategic-option draft.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'optionId',
      'title',
      'summary',
      'evidenceReferences',
      'assumptions',
      'unknowns',
      'tradeoffs',
      'risks',
      'dependencies',
      'reversible',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.optionId,
    `${path}.optionId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.title,
    `${path}.title`,
    1_000,
    issues,
  );

  validateBoundedString(
    candidate.summary,
    `${path}.summary`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.tradeoffs,
    `${path}.tradeoffs`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.risks,
    `${path}.risks`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.dependencies,
    `${path}.dependencies`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  if (
    candidate.reversible !== null &&
    typeof candidate.reversible !== 'boolean'
  ) {
    issues.push(
      issue(
        `${path}.reversible`,
        'invalid_type',
        'Reversibility must be boolean or null.',
      ),
    );
  }

  return result(
    candidate as unknown as StrategicOptionDraft,
    issues,
  );
}

export function validateRiskDependencyItem(
  candidate: unknown,
  path = 'riskDependencyItem',
): HumanMediatedValidationResult<
  RiskDependencyItem
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a risk or dependency item.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'itemId',
      'itemKind',
      'statement',
      'evidenceReferences',
      'assumptions',
      'unknowns',
      'consequence',
      'humanDecisionRequired',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.itemId,
    `${path}.itemId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    candidate.itemKind !== 'risk' &&
    candidate.itemKind !== 'dependency'
  ) {
    issues.push(
      issue(
        `${path}.itemKind`,
        'invalid_value',
        'Item kind must be risk or dependency.',
      ),
    );
  }

  validateBoundedString(
    candidate.statement,
    `${path}.statement`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    2_000,
    issues,
  );

  validateBoundedString(
    candidate.consequence,
    `${path}.consequence`,
    4_000,
    issues,
  );

  if (
    typeof candidate.humanDecisionRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_type',
        'Expected a boolean human-decision marker.',
      ),
    );
  }

  return result(
    candidate as unknown as RiskDependencyItem,
    issues,
  );
}

export function validateExecutiveEscalationPacket(
  candidate: unknown,
  path = 'escalationPacket',
): HumanMediatedValidationResult<
  ExecutiveEscalationPacket
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an executive escalation packet.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'escalationPacketId',
      'workflowId',
      'runId',
      'roleId',
      'taskClass',
      'issue',
      'evidenceAvailable',
      'evidenceMissing',
      'options',
      'risks',
      'requiredHumanDecision',
      'founderApprovalRequired',
      'verifiedStatus',
      'conflictingEvidence',
      'affectedDependencies',
      'governingConstraints',
      'affectedComponents',
      'reversibilityConcerns',
      'automaticActionAuthorized',
    ],
    path,
    issues,
  );

  [
    'escalationPacketId',
    'workflowId',
    'runId',
  ].forEach(field => {
    validateBoundedString(
      candidate[field],
      `${path}.${field}`,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );
  });

  const roleValid =
    typeof candidate.roleId === 'string' &&
    isExecutiveRoleId(candidate.roleId);

  const taskValid =
    typeof candidate.taskClass === 'string' &&
    isTaskClass(candidate.taskClass);

  if (!roleValid) {
    issues.push(
      issue(
        `${path}.roleId`,
        'unknown_role',
        'Unknown escalation-packet role.',
      ),
    );
  }

  if (!taskValid) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown escalation-packet task.',
      ),
    );
  } else if (
    typeof candidate.roleId === 'string' &&
    isExecutiveRoleId(candidate.roleId) &&
    typeof candidate.taskClass === 'string' &&
    isTaskClass(candidate.taskClass) &&
    !isTaskAllowedForRole(
      candidate.roleId,
      candidate.taskClass,
    )
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Escalation task is not allowed for the role.',
      ),
    );
  }

  validateBoundedString(
    candidate.issue,
    `${path}.issue`,
    4_000,
    issues,
  );

  [
    'evidenceAvailable',
    'evidenceMissing',
    'options',
    'risks',
    'verifiedStatus',
    'conflictingEvidence',
    'affectedDependencies',
    'governingConstraints',
    'affectedComponents',
    'reversibilityConcerns',
  ].forEach(field => {
    validateBoundedStringArray(
      candidate[field],
      `${path}.${field}`,
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
      2_000,
      issues,
    );
  });

  validateBoundedString(
    candidate.requiredHumanDecision,
    `${path}.requiredHumanDecision`,
    4_000,
    issues,
  );

  if (
    typeof candidate.founderApprovalRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.founderApprovalRequired`,
        'invalid_type',
        'Expected a boolean Founder-approval marker.',
      ),
    );
  }

  if (candidate.automaticActionAuthorized !== false) {
    issues.push(
      issue(
        `${path}.automaticActionAuthorized`,
        'invalid_value',
        'Automatic escalation action must remain unauthorized.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ExecutiveEscalationPacket,
    issues,
  );
}

export function validateCeoDraftExtension(
  candidate: unknown,
  path = 'roleOutput.roleExtension',
): HumanMediatedValidationResult<
  CeoDraftExtension
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a CEO draft extension.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'extensionVersion',
      'artifactKind',
      'strategicOptions',
      'preferredOptionId',
      'preferredOptionRationale',
      'tradeoffs',
      'riskAndDependencyRegister',
      'additionalEvidenceRequests',
      'founderApprovalChecklist',
      'materialDisagreementIds',
      'approvalsStillRequired',
      'implementationAuthorized',
      'publicationAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  if (
    candidate.extensionVersion !==
    'executive-ceo-draft-extension-v1'
  ) {
    issues.push(
      issue(
        `${path}.extensionVersion`,
        'invalid_value',
        'Unknown CEO draft-extension version.',
      ),
    );
  }

  if (
    !includesLiteral(
      CEO_ARTIFACT_KINDS,
      candidate.artifactKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.artifactKind`,
        'invalid_value',
        'Unknown CEO artifact kind.',
      ),
    );
  }

  const strategicOptionIds: string[] = [];

  if (!Array.isArray(candidate.strategicOptions)) {
    issues.push(
      issue(
        `${path}.strategicOptions`,
        'invalid_type',
        'Strategic options must be an array.',
      ),
    );
  } else {
    if (
      candidate.strategicOptions.length >
      WORKFLOW_CONTRACT_BOUNDS.recommendations
    ) {
      issues.push(
        issue(
          `${path}.strategicOptions`,
          'too_many_items',
          'Too many strategic options.',
        ),
      );
    }

    candidate.strategicOptions.forEach(
      (option, index) => {
        const validation =
          validateStrategicOptionDraft(
            option,
            `${path}.strategicOptions[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        strategicOptionIds.push(
          validation.value.optionId,
        );
      },
    );

    validateUniqueStringValues(
      strategicOptionIds,
      `${path}.strategicOptions`,
      issues,
    );
  }

  validateOptionalIdentifier(
    candidate.preferredOptionId,
    `${path}.preferredOptionId`,
    issues,
  );

  if (
    typeof candidate.preferredOptionId ===
      'string' &&
    !strategicOptionIds.includes(
      candidate.preferredOptionId,
    )
  ) {
    issues.push(
      issue(
        `${path}.preferredOptionId`,
        'invalid_value',
        'Preferred option must reference a validated strategic option.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.preferredOptionRationale,
    `${path}.preferredOptionRationale`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.tradeoffs,
    `${path}.tradeoffs`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    2_000,
    issues,
  );

  const riskDependencyIds: string[] = [];

  if (
    !Array.isArray(
      candidate.riskAndDependencyRegister,
    )
  ) {
    issues.push(
      issue(
        `${path}.riskAndDependencyRegister`,
        'invalid_type',
        'Risk and dependency register must be an array.',
      ),
    );
  } else {
    if (
      candidate.riskAndDependencyRegister.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.riskAndDependencyRegister`,
          'too_many_items',
          'Too many risk or dependency items.',
        ),
      );
    }

    candidate.riskAndDependencyRegister.forEach(
      (item, index) => {
        const validation =
          validateRiskDependencyItem(
            item,
            `${path}.riskAndDependencyRegister[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        riskDependencyIds.push(
          validation.value.itemId,
        );
      },
    );

    validateUniqueStringValues(
      riskDependencyIds,
      `${path}.riskAndDependencyRegister`,
      issues,
    );
  }

  const clarificationRequestIds: string[] = [];

  if (
    !Array.isArray(
      candidate.additionalEvidenceRequests,
    )
  ) {
    issues.push(
      issue(
        `${path}.additionalEvidenceRequests`,
        'invalid_type',
        'Additional evidence requests must be an array.',
      ),
    );
  } else {
    if (
      candidate.additionalEvidenceRequests.length >
      WORKFLOW_CONTRACT_BOUNDS
        .requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.additionalEvidenceRequests`,
          'too_many_items',
          'Too many additional evidence requests.',
        ),
      );
    }

    candidate.additionalEvidenceRequests.forEach(
      (request, index) => {
        const validation =
          validateClarificationRequestProposal(
            request,
            `${path}.additionalEvidenceRequests[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        clarificationRequestIds.push(
          validation.value
            .clarificationRequestId,
        );
      },
    );

    validateUniqueStringValues(
      clarificationRequestIds,
      `${path}.additionalEvidenceRequests`,
      issues,
    );
  }

  const checklistItemIds: string[] = [];

  if (
    !Array.isArray(
      candidate.founderApprovalChecklist,
    )
  ) {
    issues.push(
      issue(
        `${path}.founderApprovalChecklist`,
        'invalid_type',
        'Founder approval checklist must be an array.',
      ),
    );
  } else {
    if (
      candidate.founderApprovalChecklist.length >
      WORKFLOW_CONTRACT_BOUNDS
        .requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.founderApprovalChecklist`,
          'too_many_items',
          'Too many Founder checklist items.',
        ),
      );
    }

    candidate.founderApprovalChecklist.forEach(
      (item, index) => {
        const validation =
          validateFounderApprovalChecklistItem(
            item,
            `${path}.founderApprovalChecklist[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        checklistItemIds.push(
          validation.value.checklistItemId,
        );
      },
    );

    validateUniqueStringValues(
      checklistItemIds,
      `${path}.founderApprovalChecklist`,
      issues,
    );
  }

  validateBoundedStringArray(
    candidate.materialDisagreementIds,
    `${path}.materialDisagreementIds`,
    WORKFLOW_CONTRACT_BOUNDS
      .disagreementPositions,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.materialDisagreementIds,
    `${path}.materialDisagreementIds`,
    issues,
  );

  validateBoundedStringArray(
    candidate.approvalsStillRequired,
    `${path}.approvalsStillRequired`,
    WORKFLOW_CONTRACT_BOUNDS
      .requiredHumanDecisions,
    2_000,
    issues,
  );

  validateRequiredFalseFields(
    candidate,
    [
      'implementationAuthorized',
      'publicationAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as CeoDraftExtension,
    issues,
  );
}

export function validateCeoHumanMediatedOutput(
  candidate: unknown,
  path = 'roleOutput',
): HumanMediatedValidationResult<
  CeoHumanMediatedOutput
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a CEO human-mediated role output.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'workflowId',
      'runId',
      'roleId',
      'taskClass',
      'commonOutput',
      'roleExtension',
      'materialDisagreements',
      'escalationPacket',
      'clarificationRequests',
      'humanDecisionRequired',
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    `${path}.runId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (candidate.roleId !== 'executive.ceo') {
    issues.push(
      issue(
        `${path}.roleId`,
        'invalid_value',
        'CEO output must use the executive.ceo role.',
      ),
    );
  }

  if (
    typeof candidate.taskClass !== 'string' ||
    !isTaskClass(candidate.taskClass)
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown CEO output task class.',
      ),
    );
  } else if (
    !isTaskAllowedForRole(
      'executive.ceo',
      candidate.taskClass,
    )
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Task class is not allowed for the CEO role.',
      ),
    );
  }

  const commonValidation =
    validateExecutiveAgentDraftOutput(
      candidate.commonOutput,
      `${path}.commonOutput`,
    );

  if (!commonValidation.ok) {
    issues.push(...commonValidation.issues);
  }

  const extensionValidation =
    validateCeoDraftExtension(
      candidate.roleExtension,
      `${path}.roleExtension`,
    );

  if (!extensionValidation.ok) {
    issues.push(...extensionValidation.issues);
  }

  const disagreementIds: string[] = [];

  if (!Array.isArray(candidate.materialDisagreements)) {
    issues.push(
      issue(
        `${path}.materialDisagreements`,
        'invalid_type',
        'Material disagreements must be an array.',
      ),
    );
  } else {
    if (
      candidate.materialDisagreements.length >
      WORKFLOW_CONTRACT_BOUNDS
        .disagreementPositions
    ) {
      issues.push(
        issue(
          `${path}.materialDisagreements`,
          'too_many_items',
          'Too many material disagreements.',
        ),
      );
    }

    candidate.materialDisagreements.forEach(
      (disagreement, index) => {
        const validation =
          validateMaterialDisagreementV2(
            disagreement,
            `${path}.materialDisagreements[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        disagreementIds.push(
          validation.value.disagreementId,
        );
      },
    );

    validateUniqueStringValues(
      disagreementIds,
      `${path}.materialDisagreements`,
      issues,
    );
  }

  const clarificationIds: string[] = [];

  if (!Array.isArray(candidate.clarificationRequests)) {
    issues.push(
      issue(
        `${path}.clarificationRequests`,
        'invalid_type',
        'Clarification requests must be an array.',
      ),
    );
  } else {
    if (
      candidate.clarificationRequests.length >
      WORKFLOW_CONTRACT_BOUNDS
        .requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.clarificationRequests`,
          'too_many_items',
          'Too many clarification requests.',
        ),
      );
    }

    candidate.clarificationRequests.forEach(
      (request, index) => {
        const requestPath =
          `${path}.clarificationRequests[${index}]`;

        const validation =
          validateClarificationRequestProposal(
            request,
            requestPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        clarificationIds.push(
          validation.value.clarificationRequestId,
        );

        if (
          validation.value.workflowId !==
          candidate.workflowId
        ) {
          issues.push(
            issue(
              `${requestPath}.workflowId`,
              'invalid_value',
              'Clarification workflow must match the role output.',
            ),
          );
        }

        if (
          validation.value.runId !==
          candidate.runId
        ) {
          issues.push(
            issue(
              `${requestPath}.runId`,
              'invalid_value',
              'Clarification run must match the role output.',
            ),
          );
        }

        if (
          validation.value.roleId !==
          candidate.roleId
        ) {
          issues.push(
            issue(
              `${requestPath}.roleId`,
              'invalid_value',
              'Clarification role must match the role output.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      clarificationIds,
      `${path}.clarificationRequests`,
      issues,
    );
  }

  if (candidate.escalationPacket !== null) {
    const escalationValidation =
      validateExecutiveEscalationPacket(
        candidate.escalationPacket,
        `${path}.escalationPacket`,
      );

    if (!escalationValidation.ok) {
      issues.push(...escalationValidation.issues);
    } else {
      const escalation =
        escalationValidation.value;

      if (
        escalation.workflowId !==
        candidate.workflowId
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.workflowId`,
            'invalid_value',
            'Escalation workflow must match the role output.',
          ),
        );
      }

      if (escalation.runId !== candidate.runId) {
        issues.push(
          issue(
            `${path}.escalationPacket.runId`,
            'invalid_value',
            'Escalation run must match the role output.',
          ),
        );
      }

      if (escalation.roleId !== candidate.roleId) {
        issues.push(
          issue(
            `${path}.escalationPacket.roleId`,
            'invalid_value',
            'Escalation role must match the role output.',
          ),
        );
      }

      if (
        escalation.taskClass !==
        candidate.taskClass
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.taskClass`,
            'invalid_value',
            'Escalation task must match the role output.',
          ),
        );
      }
    }
  }

  if (commonValidation.ok) {
    if (
      commonValidation.value.escalationRequired &&
      candidate.escalationPacket === null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'missing_value',
          'An escalation-required output needs an escalation packet.',
        ),
      );
    }

    if (
      !commonValidation.value.escalationRequired &&
      candidate.escalationPacket !== null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'invalid_value',
          'A non-escalating output may not include an escalation packet.',
        ),
      );
    }
  }

  if (extensionValidation.ok) {
    const extension =
      extensionValidation.value;

    extension.materialDisagreementIds.forEach(
      (disagreementId, index) => {
        if (!disagreementIds.includes(disagreementId)) {
          issues.push(
            issue(
              `${path}.roleExtension.materialDisagreementIds[${index}]`,
              'invalid_value',
              'Disagreement ID must reference a validated top-level disagreement.',
            ),
          );
        }
      },
    );

    disagreementIds.forEach(
      disagreementId => {
        if (
          !extension.materialDisagreementIds.includes(
            disagreementId,
          )
        ) {
          issues.push(
            issue(
              `${path}.roleExtension.materialDisagreementIds`,
              'missing_value',
              'Every top-level disagreement must be preserved in the CEO extension.',
            ),
          );
        }
      },
    );

    extension.additionalEvidenceRequests.forEach(
      (request, index) => {
        const requestPath =
          `${path}.roleExtension.additionalEvidenceRequests[${index}]`;

        if (
          !clarificationIds.includes(
            request.clarificationRequestId,
          )
        ) {
          issues.push(
            issue(
              `${requestPath}.clarificationRequestId`,
              'invalid_value',
              'Additional evidence request must reference a top-level clarification request.',
            ),
          );
        }

        if (request.workflowId !== candidate.workflowId) {
          issues.push(
            issue(
              `${requestPath}.workflowId`,
              'invalid_value',
              'Additional evidence workflow must match the role output.',
            ),
          );
        }

        if (request.runId !== candidate.runId) {
          issues.push(
            issue(
              `${requestPath}.runId`,
              'invalid_value',
              'Additional evidence run must match the role output.',
            ),
          );
        }

        if (request.roleId !== candidate.roleId) {
          issues.push(
            issue(
              `${requestPath}.roleId`,
              'invalid_value',
              'Additional evidence role must match the role output.',
            ),
          );
        }
      },
    );
  }

  if (candidate.humanDecisionRequired !== true) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_value',
        'Human decision must remain required.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      CeoHumanMediatedOutput,
    issues,
  );
}

export function validateReportedStatusRecord(
  candidate: unknown,
  path = 'reportedStatus',
): HumanMediatedValidationResult<
  ReportedStatusRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a reported-status record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'statusId',
      'statement',
      'sourceReference',
      'verificationState',
      'evidenceReferences',
      'verifiedFact',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.statusId,
    `${path}.statusId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.statement,
    `${path}.statement`,
    4_000,
    issues,
  );

  validateBoundedString(
    candidate.sourceReference,
    `${path}.sourceReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      EVIDENCE_VERIFICATION_STATES,
      candidate.verificationState,
    )
  ) {
    issues.push(
      issue(
        `${path}.verificationState`,
        'invalid_value',
        'Unknown evidence-verification state.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.verifiedFact !== false) {
    issues.push(
      issue(
        `${path}.verifiedFact`,
        'invalid_value',
        'A reported status may not be represented as a verified fact.',
      ),
    );
  }

  return result(
    candidate as unknown as ReportedStatusRecord,
    issues,
  );
}

export function validateStatusTransformationRecord(
  candidate: unknown,
  path = 'statusTransformation',
): HumanMediatedValidationResult<
  StatusTransformationRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a status-transformation record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'transformationId',
      'sourceReference',
      'sourceClassification',
      'resultingClassification',
      'transformationDescription',
      'classificationChanged',
      'humanApprovalReference',
      'silentReclassificationPerformed',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.transformationId,
    `${path}.transformationId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.sourceReference,
    `${path}.sourceReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  const sourceClassificationValid =
    includesLiteral(
      INFORMATION_CLASSIFICATIONS,
      candidate.sourceClassification,
    );

  const resultingClassificationValid =
    includesLiteral(
      INFORMATION_CLASSIFICATIONS,
      candidate.resultingClassification,
    );

  if (!sourceClassificationValid) {
    issues.push(
      issue(
        `${path}.sourceClassification`,
        'invalid_value',
        'Unknown source information classification.',
      ),
    );
  }

  if (!resultingClassificationValid) {
    issues.push(
      issue(
        `${path}.resultingClassification`,
        'invalid_value',
        'Unknown resulting information classification.',
      ),
    );
  }

  validateBoundedString(
    candidate.transformationDescription,
    `${path}.transformationDescription`,
    4_000,
    issues,
  );

  if (
    typeof candidate.classificationChanged !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.classificationChanged`,
        'invalid_type',
        'Expected a boolean classification-change marker.',
      ),
    );
  }

  validateOptionalIdentifier(
    candidate.humanApprovalReference,
    `${path}.humanApprovalReference`,
    issues,
  );

  if (
    sourceClassificationValid &&
    resultingClassificationValid &&
    typeof candidate.classificationChanged ===
      'boolean'
  ) {
    const classificationsDiffer =
      candidate.sourceClassification !==
      candidate.resultingClassification;

    if (
      candidate.classificationChanged !==
      classificationsDiffer
    ) {
      issues.push(
        issue(
          `${path}.classificationChanged`,
          'invalid_value',
          'Classification-change marker must match the source and resulting classifications.',
        ),
      );
    }

    if (
      classificationsDiffer &&
      candidate.humanApprovalReference === null
    ) {
      issues.push(
        issue(
          `${path}.humanApprovalReference`,
          'missing_value',
          'An actual classification change requires human approval provenance.',
        ),
      );
    }
  }

  if (
    candidate.silentReclassificationPerformed !==
    false
  ) {
    issues.push(
      issue(
        `${path}.silentReclassificationPerformed`,
        'invalid_value',
        'Silent reclassification must remain prohibited.',
      ),
    );
  }

  return result(
    candidate as unknown as
      StatusTransformationRecord,
    issues,
  );
}

export function validateWorkflowDependencyItem(
  candidate: unknown,
  path = 'workflowDependency',
): HumanMediatedValidationResult<
  WorkflowDependencyItem
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a workflow-dependency item.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'dependencyId',
      'statement',
      'upstreamReferences',
      'downstreamReferences',
      'evidenceReferences',
      'blockers',
      'unresolved',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.dependencyId,
    `${path}.dependencyId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.statement,
    `${path}.statement`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.upstreamReferences,
    `${path}.upstreamReferences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.upstreamReferences,
    `${path}.upstreamReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.downstreamReferences,
    `${path}.downstreamReferences`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.downstreamReferences,
    `${path}.downstreamReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.blockers,
    `${path}.blockers`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  if (typeof candidate.unresolved !== 'boolean') {
    issues.push(
      issue(
        `${path}.unresolved`,
        'invalid_type',
        'Expected a boolean unresolved-state marker.',
      ),
    );
  }

  return result(
    candidate as unknown as WorkflowDependencyItem,
    issues,
  );
}

export function validateProposedOwnerRecord(
  candidate: unknown,
  path = 'proposedOwner',
): HumanMediatedValidationResult<
  ProposedOwnerRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a proposed-owner record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'proposalId',
      'workItemReference',
      'proposedOwnerLabel',
      'rationale',
      'evidenceReferences',
      'approvalStatus',
      'bindingAssignmentCreated',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.proposalId,
    `${path}.proposalId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workItemReference,
    `${path}.workItemReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.proposedOwnerLabel,
    `${path}.proposedOwnerLabel`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.rationale,
    `${path}.rationale`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.approvalStatus !== 'unapproved') {
    issues.push(
      issue(
        `${path}.approvalStatus`,
        'invalid_value',
        'A proposed owner must remain unapproved.',
      ),
    );
  }

  if (candidate.bindingAssignmentCreated !== false) {
    issues.push(
      issue(
        `${path}.bindingAssignmentCreated`,
        'invalid_value',
        'A proposed owner may not create a binding assignment.',
      ),
    );
  }

  return result(
    candidate as unknown as ProposedOwnerRecord,
    issues,
  );
}

export function validateProposedDeadlineRecord(
  candidate: unknown,
  path = 'proposedDeadline',
): HumanMediatedValidationResult<
  ProposedDeadlineRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a proposed-deadline record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'proposalId',
      'workItemReference',
      'proposedDeadline',
      'rationale',
      'evidenceReferences',
      'approvalStatus',
      'bindingCommitmentCreated',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.proposalId,
    `${path}.proposalId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workItemReference,
    `${path}.workItemReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.proposedDeadline,
    `${path}.proposedDeadline`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.rationale,
    `${path}.rationale`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.approvalStatus !== 'unapproved') {
    issues.push(
      issue(
        `${path}.approvalStatus`,
        'invalid_value',
        'A proposed deadline must remain unapproved.',
      ),
    );
  }

  if (candidate.bindingCommitmentCreated !== false) {
    issues.push(
      issue(
        `${path}.bindingCommitmentCreated`,
        'invalid_value',
        'A proposed deadline may not create a binding commitment.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ProposedDeadlineRecord,
    issues,
  );
}

export function validateProposedWorkSequenceItem(
  candidate: unknown,
  path = 'proposedWorkSequenceItem',
): HumanMediatedValidationResult<
  ProposedWorkSequenceItem
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a proposed work-sequence item.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'sequenceItemId',
      'workItemReference',
      'proposedOrder',
      'dependencies',
      'blockers',
      'rationale',
      'approvalStatus',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.sequenceItemId,
    `${path}.sequenceItemId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workItemReference,
    `${path}.workItemReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    typeof candidate.proposedOrder !== 'number' ||
    !Number.isInteger(candidate.proposedOrder) ||
    candidate.proposedOrder < 1
  ) {
    issues.push(
      issue(
        `${path}.proposedOrder`,
        'invalid_value',
        'Proposed order must be a positive integer.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.dependencies,
    `${path}.dependencies`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.dependencies,
    `${path}.dependencies`,
    issues,
  );

  validateBoundedStringArray(
    candidate.blockers,
    `${path}.blockers`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.blockers,
    `${path}.blockers`,
    issues,
  );

  validateBoundedString(
    candidate.rationale,
    `${path}.rationale`,
    4_000,
    issues,
  );

  if (candidate.approvalStatus !== 'unapproved') {
    issues.push(
      issue(
        `${path}.approvalStatus`,
        'invalid_value',
        'A proposed work sequence must remain unapproved.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ProposedWorkSequenceItem,
    issues,
  );
}

export function validateRecordedHumanDecision(
  candidate: unknown,
  path = 'recordedHumanDecision',
): HumanMediatedValidationResult<
  RecordedHumanDecision
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a recorded human-decision record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'decisionRecordId',
      'decisionStatement',
      'humanDecisionReference',
      'recordedBy',
      'recordedAt',
      'evidenceReferences',
      'modelGeneratedDecision',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.decisionRecordId,
    `${path}.decisionRecordId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.decisionStatement,
    `${path}.decisionStatement`,
    4_000,
    issues,
  );

  validateBoundedString(
    candidate.humanDecisionReference,
    `${path}.humanDecisionReference`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      HUMAN_DISPOSITION_SOURCE_KINDS,
      candidate.recordedBy,
    )
  ) {
    issues.push(
      issue(
        `${path}.recordedBy`,
        'invalid_value',
        'Unknown human-decision source kind.',
      ),
    );
  }

  validateBoundedString(
    candidate.recordedAt,
    `${path}.recordedAt`,
    64,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.modelGeneratedDecision !== false) {
    issues.push(
      issue(
        `${path}.modelGeneratedDecision`,
        'invalid_value',
        'A recorded human decision may not be model generated.',
      ),
    );
  }

  return result(
    candidate as unknown as RecordedHumanDecision,
    issues,
  );
}

export function validateChiefOfStaffDraftExtension(
  candidate: unknown,
  path = 'roleOutput.roleExtension',
): HumanMediatedValidationResult<
  ChiefOfStaffDraftExtension
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a Chief of Staff draft extension.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'extensionVersion',
      'artifactKind',
      'verifiedFacts',
      'reportedStatuses',
      'proposals',
      'statusTransformations',
      'dependencyItems',
      'proposedWorkSequence',
      'proposedOwners',
      'proposedDeadlines',
      'unresolvedQuestions',
      'disagreementSummaryIds',
      'escalationPacketId',
      'recordedHumanDecisions',
      'founderApprovalChecklist',
      'artificialConsensusCreated',
      'adjudicationPerformed',
      'bindingAssignmentAuthorized',
      'bindingDeadlineAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  if (
    candidate.extensionVersion !==
    'executive-chief-of-staff-draft-extension-v1'
  ) {
    issues.push(
      issue(
        `${path}.extensionVersion`,
        'invalid_value',
        'Unknown Chief of Staff extension version.',
      ),
    );
  }

  if (
    !includesLiteral(
      CHIEF_OF_STAFF_ARTIFACT_KINDS,
      candidate.artifactKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.artifactKind`,
        'invalid_value',
        'Unknown Chief of Staff artifact kind.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.verifiedFacts,
    `${path}.verifiedFacts`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.proposals,
    `${path}.proposals`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unresolvedQuestions,
    `${path}.unresolvedQuestions`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.disagreementSummaryIds,
    `${path}.disagreementSummaryIds`,
    WORKFLOW_CONTRACT_BOUNDS.disagreementPositions,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.disagreementSummaryIds,
    `${path}.disagreementSummaryIds`,
    issues,
  );

  validateOptionalIdentifier(
    candidate.escalationPacketId,
    `${path}.escalationPacketId`,
    issues,
  );

  const reportedStatusIds: string[] = [];

  if (!Array.isArray(candidate.reportedStatuses)) {
    issues.push(
      issue(
        `${path}.reportedStatuses`,
        'invalid_type',
        'Reported statuses must be an array.',
      ),
    );
  } else {
    if (
      candidate.reportedStatuses.length >
      WORKFLOW_CONTRACT_BOUNDS.evidenceItems
    ) {
      issues.push(
        issue(
          `${path}.reportedStatuses`,
          'too_many_items',
          'Too many reported statuses.',
        ),
      );
    }

    candidate.reportedStatuses.forEach(
      (reportedStatus, index) => {
        const validation =
          validateReportedStatusRecord(
            reportedStatus,
            `${path}.reportedStatuses[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        reportedStatusIds.push(
          validation.value.statusId,
        );
      },
    );

    validateUniqueStringValues(
      reportedStatusIds,
      `${path}.reportedStatuses`,
      issues,
    );
  }

  const transformationIds: string[] = [];

  if (!Array.isArray(candidate.statusTransformations)) {
    issues.push(
      issue(
        `${path}.statusTransformations`,
        'invalid_type',
        'Status transformations must be an array.',
      ),
    );
  } else {
    if (
      candidate.statusTransformations.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.statusTransformations`,
          'too_many_items',
          'Too many status transformations.',
        ),
      );
    }

    candidate.statusTransformations.forEach(
      (transformation, index) => {
        const validation =
          validateStatusTransformationRecord(
            transformation,
            `${path}.statusTransformations[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        transformationIds.push(
          validation.value.transformationId,
        );
      },
    );

    validateUniqueStringValues(
      transformationIds,
      `${path}.statusTransformations`,
      issues,
    );
  }

  const dependencyIds: string[] = [];

  if (!Array.isArray(candidate.dependencyItems)) {
    issues.push(
      issue(
        `${path}.dependencyItems`,
        'invalid_type',
        'Dependency items must be an array.',
      ),
    );
  } else {
    if (
      candidate.dependencyItems.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.dependencyItems`,
          'too_many_items',
          'Too many dependency items.',
        ),
      );
    }

    candidate.dependencyItems.forEach(
      (dependency, index) => {
        const validation =
          validateWorkflowDependencyItem(
            dependency,
            `${path}.dependencyItems[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        dependencyIds.push(
          validation.value.dependencyId,
        );
      },
    );

    validateUniqueStringValues(
      dependencyIds,
      `${path}.dependencyItems`,
      issues,
    );
  }

  const sequenceItemIds: string[] = [];
  const proposedOrders: number[] = [];

  if (!Array.isArray(candidate.proposedWorkSequence)) {
    issues.push(
      issue(
        `${path}.proposedWorkSequence`,
        'invalid_type',
        'Proposed work sequence must be an array.',
      ),
    );
  } else {
    if (
      candidate.proposedWorkSequence.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.proposedWorkSequence`,
          'too_many_items',
          'Too many proposed work-sequence items.',
        ),
      );
    }

    candidate.proposedWorkSequence.forEach(
      (sequenceItem, index) => {
        const validation =
          validateProposedWorkSequenceItem(
            sequenceItem,
            `${path}.proposedWorkSequence[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        sequenceItemIds.push(
          validation.value.sequenceItemId,
        );

        proposedOrders.push(
          validation.value.proposedOrder,
        );
      },
    );

    validateUniqueStringValues(
      sequenceItemIds,
      `${path}.proposedWorkSequence`,
      issues,
    );

    proposedOrders.forEach(
      (proposedOrder, index) => {
        if (
          proposedOrders.indexOf(proposedOrder) !==
          index
        ) {
          issues.push(
            issue(
              `${path}.proposedWorkSequence[${index}].proposedOrder`,
              'invalid_value',
              'Proposed work-sequence orders must be unique.',
            ),
          );
        }
      },
    );
  }

  const ownerProposalIds: string[] = [];

  if (!Array.isArray(candidate.proposedOwners)) {
    issues.push(
      issue(
        `${path}.proposedOwners`,
        'invalid_type',
        'Proposed owners must be an array.',
      ),
    );
  } else {
    if (
      candidate.proposedOwners.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.proposedOwners`,
          'too_many_items',
          'Too many proposed owners.',
        ),
      );
    }

    candidate.proposedOwners.forEach(
      (proposedOwner, index) => {
        const validation =
          validateProposedOwnerRecord(
            proposedOwner,
            `${path}.proposedOwners[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        ownerProposalIds.push(
          validation.value.proposalId,
        );
      },
    );

    validateUniqueStringValues(
      ownerProposalIds,
      `${path}.proposedOwners`,
      issues,
    );
  }

  const deadlineProposalIds: string[] = [];

  if (!Array.isArray(candidate.proposedDeadlines)) {
    issues.push(
      issue(
        `${path}.proposedDeadlines`,
        'invalid_type',
        'Proposed deadlines must be an array.',
      ),
    );
  } else {
    if (
      candidate.proposedDeadlines.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.proposedDeadlines`,
          'too_many_items',
          'Too many proposed deadlines.',
        ),
      );
    }

    candidate.proposedDeadlines.forEach(
      (proposedDeadline, index) => {
        const validation =
          validateProposedDeadlineRecord(
            proposedDeadline,
            `${path}.proposedDeadlines[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        deadlineProposalIds.push(
          validation.value.proposalId,
        );
      },
    );

    validateUniqueStringValues(
      deadlineProposalIds,
      `${path}.proposedDeadlines`,
      issues,
    );
  }

  const decisionRecordIds: string[] = [];

  if (!Array.isArray(candidate.recordedHumanDecisions)) {
    issues.push(
      issue(
        `${path}.recordedHumanDecisions`,
        'invalid_type',
        'Recorded human decisions must be an array.',
      ),
    );
  } else {
    if (
      candidate.recordedHumanDecisions.length >
      WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.recordedHumanDecisions`,
          'too_many_items',
          'Too many recorded human decisions.',
        ),
      );
    }

    candidate.recordedHumanDecisions.forEach(
      (recordedDecision, index) => {
        const validation =
          validateRecordedHumanDecision(
            recordedDecision,
            `${path}.recordedHumanDecisions[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        decisionRecordIds.push(
          validation.value.decisionRecordId,
        );
      },
    );

    validateUniqueStringValues(
      decisionRecordIds,
      `${path}.recordedHumanDecisions`,
      issues,
    );
  }

  const checklistItemIds: string[] = [];

  if (!Array.isArray(candidate.founderApprovalChecklist)) {
    issues.push(
      issue(
        `${path}.founderApprovalChecklist`,
        'invalid_type',
        'Founder approval checklist must be an array.',
      ),
    );
  } else {
    if (
      candidate.founderApprovalChecklist.length >
      WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.founderApprovalChecklist`,
          'too_many_items',
          'Too many Founder approval checklist items.',
        ),
      );
    }

    candidate.founderApprovalChecklist.forEach(
      (checklistItem, index) => {
        const validation =
          validateFounderApprovalChecklistItem(
            checklistItem,
            `${path}.founderApprovalChecklist[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        checklistItemIds.push(
          validation.value.checklistItemId,
        );
      },
    );

    validateUniqueStringValues(
      checklistItemIds,
      `${path}.founderApprovalChecklist`,
      issues,
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'artificialConsensusCreated',
      'adjudicationPerformed',
      'bindingAssignmentAuthorized',
      'bindingDeadlineAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      ChiefOfStaffDraftExtension,
    issues,
  );
}

export function validateChiefOfStaffHumanMediatedOutput(
  candidate: unknown,
  path = 'roleOutput',
): HumanMediatedValidationResult<
  ChiefOfStaffHumanMediatedOutput
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a Chief of Staff human-mediated role output.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'workflowId',
      'runId',
      'roleId',
      'taskClass',
      'commonOutput',
      'roleExtension',
      'materialDisagreements',
      'escalationPacket',
      'clarificationRequests',
      'humanDecisionRequired',
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    `${path}.runId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (candidate.roleId !== 'executive.chief_of_staff') {
    issues.push(
      issue(
        `${path}.roleId`,
        'invalid_value',
        'Chief of Staff output must use the executive.chief_of_staff role.',
      ),
    );
  }

  if (
    typeof candidate.taskClass !== 'string' ||
    !isTaskClass(candidate.taskClass)
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown Chief of Staff output task class.',
      ),
    );
  } else if (
    !isTaskAllowedForRole(
      'executive.chief_of_staff',
      candidate.taskClass,
    )
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Task class is not allowed for the Chief of Staff role.',
      ),
    );
  }

  const commonValidation =
    validateExecutiveAgentDraftOutput(
      candidate.commonOutput,
      `${path}.commonOutput`,
    );

  if (!commonValidation.ok) {
    issues.push(...commonValidation.issues);
  }

  const extensionValidation =
    validateChiefOfStaffDraftExtension(
      candidate.roleExtension,
      `${path}.roleExtension`,
    );

  if (!extensionValidation.ok) {
    issues.push(...extensionValidation.issues);
  }

  const disagreementIds: string[] = [];

  if (!Array.isArray(candidate.materialDisagreements)) {
    issues.push(
      issue(
        `${path}.materialDisagreements`,
        'invalid_type',
        'Material disagreements must be an array.',
      ),
    );
  } else {
    if (
      candidate.materialDisagreements.length >
      WORKFLOW_CONTRACT_BOUNDS.disagreementPositions
    ) {
      issues.push(
        issue(
          `${path}.materialDisagreements`,
          'too_many_items',
          'Too many material disagreements.',
        ),
      );
    }

    candidate.materialDisagreements.forEach(
      (disagreement, index) => {
        const validation =
          validateMaterialDisagreementV2(
            disagreement,
            `${path}.materialDisagreements[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        disagreementIds.push(
          validation.value.disagreementId,
        );
      },
    );

    validateUniqueStringValues(
      disagreementIds,
      `${path}.materialDisagreements`,
      issues,
    );
  }

  const clarificationIds: string[] = [];

  if (!Array.isArray(candidate.clarificationRequests)) {
    issues.push(
      issue(
        `${path}.clarificationRequests`,
        'invalid_type',
        'Clarification requests must be an array.',
      ),
    );
  } else {
    if (
      candidate.clarificationRequests.length >
      WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.clarificationRequests`,
          'too_many_items',
          'Too many clarification requests.',
        ),
      );
    }

    candidate.clarificationRequests.forEach(
      (request, index) => {
        const requestPath =
          `${path}.clarificationRequests[${index}]`;

        const validation =
          validateClarificationRequestProposal(
            request,
            requestPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        clarificationIds.push(
          validation.value.clarificationRequestId,
        );

        if (
          validation.value.workflowId !==
          candidate.workflowId
        ) {
          issues.push(
            issue(
              `${requestPath}.workflowId`,
              'invalid_value',
              'Clarification workflow must match the role output.',
            ),
          );
        }

        if (
          validation.value.runId !==
          candidate.runId
        ) {
          issues.push(
            issue(
              `${requestPath}.runId`,
              'invalid_value',
              'Clarification run must match the role output.',
            ),
          );
        }

        if (
          validation.value.roleId !==
          candidate.roleId
        ) {
          issues.push(
            issue(
              `${requestPath}.roleId`,
              'invalid_value',
              'Clarification role must match the role output.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      clarificationIds,
      `${path}.clarificationRequests`,
      issues,
    );
  }

  let validatedEscalation:
    ExecutiveEscalationPacket | null = null;

  if (candidate.escalationPacket !== null) {
    const escalationValidation =
      validateExecutiveEscalationPacket(
        candidate.escalationPacket,
        `${path}.escalationPacket`,
      );

    if (!escalationValidation.ok) {
      issues.push(...escalationValidation.issues);
    } else {
      validatedEscalation =
        escalationValidation.value;

      if (
        validatedEscalation.workflowId !==
        candidate.workflowId
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.workflowId`,
            'invalid_value',
            'Escalation workflow must match the role output.',
          ),
        );
      }

      if (
        validatedEscalation.runId !==
        candidate.runId
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.runId`,
            'invalid_value',
            'Escalation run must match the role output.',
          ),
        );
      }

      if (
        validatedEscalation.roleId !==
        candidate.roleId
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.roleId`,
            'invalid_value',
            'Escalation role must match the role output.',
          ),
        );
      }

      if (
        validatedEscalation.taskClass !==
        candidate.taskClass
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.taskClass`,
            'invalid_value',
            'Escalation task must match the role output.',
          ),
        );
      }
    }
  }

  if (commonValidation.ok) {
    if (
      commonValidation.value.escalationRequired &&
      candidate.escalationPacket === null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'missing_value',
          'An escalation-required output needs an escalation packet.',
        ),
      );
    }

    if (
      !commonValidation.value.escalationRequired &&
      candidate.escalationPacket !== null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'invalid_value',
          'A non-escalating output may not include an escalation packet.',
        ),
      );
    }
  }

  if (extensionValidation.ok) {
    const extension =
      extensionValidation.value;

    extension.disagreementSummaryIds.forEach(
      (disagreementId, index) => {
        if (!disagreementIds.includes(disagreementId)) {
          issues.push(
            issue(
              `${path}.roleExtension.disagreementSummaryIds[${index}]`,
              'invalid_value',
              'Disagreement summary ID must reference a validated top-level disagreement.',
            ),
          );
        }
      },
    );

    disagreementIds.forEach(
      disagreementId => {
        if (
          !extension.disagreementSummaryIds.includes(
            disagreementId,
          )
        ) {
          issues.push(
            issue(
              `${path}.roleExtension.disagreementSummaryIds`,
              'missing_value',
              'Every top-level disagreement must be preserved in the Chief of Staff extension.',
            ),
          );
        }
      },
    );

    if (
      extension.escalationPacketId === null &&
      candidate.escalationPacket !== null
    ) {
      issues.push(
        issue(
          `${path}.roleExtension.escalationPacketId`,
          'missing_value',
          'The extension must reference the top-level escalation packet.',
        ),
      );
    }

    if (
      extension.escalationPacketId !== null &&
      candidate.escalationPacket === null
    ) {
      issues.push(
        issue(
          `${path}.roleExtension.escalationPacketId`,
          'invalid_value',
          'The extension may not reference an absent escalation packet.',
        ),
      );
    }

    if (
      extension.escalationPacketId !== null &&
      validatedEscalation !== null &&
      extension.escalationPacketId !==
        validatedEscalation.escalationPacketId
    ) {
      issues.push(
        issue(
          `${path}.roleExtension.escalationPacketId`,
          'invalid_value',
          'The extension escalation ID must match the validated top-level escalation packet.',
        ),
      );
    }
  }

  if (candidate.humanDecisionRequired !== true) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_value',
        'Human decision must remain required.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      ChiefOfStaffHumanMediatedOutput,
    issues,
  );
}

export function validateArchitectureEvidenceRecord(
  candidate: unknown,
  path = 'architectureEvidence',
): HumanMediatedValidationResult<
  ArchitectureEvidenceRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an architecture-evidence record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'evidenceId',
      'locator',
      'sourceCommitSha',
      'description',
      'available',
      'evidenceReferences',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.evidenceId,
    `${path}.evidenceId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.locator,
    `${path}.locator`,
    2_000,
    issues,
  );

  validateBoundedString(
    candidate.sourceCommitSha,
    `${path}.sourceCommitSha`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.description,
    `${path}.description`,
    4_000,
    issues,
  );

  if (typeof candidate.available !== 'boolean') {
    issues.push(
      issue(
        `${path}.available`,
        'invalid_type',
        'Expected a boolean evidence-availability marker.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  return result(
    candidate as unknown as
      ArchitectureEvidenceRecord,
    issues,
  );
}

export function validateArchitectureAlternativeDraft(
  candidate: unknown,
  path = 'architectureAlternative',
): HumanMediatedValidationResult<
  ArchitectureAlternativeDraft
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an architecture-alternative draft.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'alternativeId',
      'title',
      'summary',
      'evidenceReferences',
      'constraints',
      'assumptions',
      'unknowns',
      'affectedComponents',
      'securityConsequences',
      'reliabilityConsequences',
      'costConsequences',
      'latencyConsequences',
      'reversibilityConsequences',
      'implementationAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.alternativeId,
    `${path}.alternativeId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.title,
    `${path}.title`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.summary,
    `${path}.summary`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.constraints,
    `${path}.constraints`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.affectedComponents,
    `${path}.affectedComponents`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  for (const field of [
    'securityConsequences',
    'reliabilityConsequences',
    'costConsequences',
    'latencyConsequences',
    'reversibilityConsequences',
  ] as const) {
    validateBoundedStringArray(
      candidate[field],
      `${path}.${field}`,
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
      4_000,
      issues,
    );
  }

  if (candidate.implementationAuthorized !== false) {
    issues.push(
      issue(
        `${path}.implementationAuthorized`,
        'invalid_value',
        'An architecture alternative may not authorize implementation.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ArchitectureAlternativeDraft,
    issues,
  );
}

export function validateUnimplementedArchitectureProposal(
  candidate: unknown,
  path = 'architectureProposal',
): HumanMediatedValidationResult<
  UnimplementedArchitectureProposal
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an unimplemented architecture proposal.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'proposalId',
      'proposalKind',
      'title',
      'description',
      'evidenceReferences',
      'affectedComponents',
      'assumptions',
      'unknowns',
      'markedUnimplemented',
      'migrationAuthorized',
      'repositoryModificationAuthorized',
      'providerAssignmentAuthorized',
      'adapterAssignmentAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.proposalId,
    `${path}.proposalId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    candidate.proposalKind !== 'interface' &&
    candidate.proposalKind !== 'schema' &&
    candidate.proposalKind !== 'adapter_boundary'
  ) {
    issues.push(
      issue(
        `${path}.proposalKind`,
        'invalid_value',
        'Unknown architecture-proposal kind.',
      ),
    );
  }

  validateBoundedString(
    candidate.title,
    `${path}.title`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.description,
    `${path}.description`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.affectedComponents,
    `${path}.affectedComponents`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.affectedComponents,
    `${path}.affectedComponents`,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.assumptions,
    `${path}.assumptions`,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.unknowns,
    `${path}.unknowns`,
    issues,
  );

  if (candidate.markedUnimplemented !== true) {
    issues.push(
      issue(
        `${path}.markedUnimplemented`,
        'invalid_value',
        'An architecture proposal must remain explicitly unimplemented.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'migrationAuthorized',
      'repositoryModificationAuthorized',
      'providerAssignmentAuthorized',
      'adapterAssignmentAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      UnimplementedArchitectureProposal,
    issues,
  );
}

export function validateArchitectureRiskAnalysis(
  candidate: unknown,
  path = 'architectureRiskAnalysis',
): HumanMediatedValidationResult<
  ArchitectureRiskAnalysis
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected an architecture-risk analysis.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'analysisId',
      'riskKind',
      'findings',
      'evidenceReferences',
      'assumptions',
      'unknowns',
      'humanDecisionRequired',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.analysisId,
    `${path}.analysisId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    candidate.riskKind !== 'security' &&
    candidate.riskKind !== 'reliability' &&
    candidate.riskKind !== 'cost' &&
    candidate.riskKind !== 'latency' &&
    candidate.riskKind !== 'reversibility'
  ) {
    issues.push(
      issue(
        `${path}.riskKind`,
        'invalid_value',
        'Unknown architecture-risk kind.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.findings,
    `${path}.findings`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.findings,
    `${path}.findings`,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.assumptions,
    `${path}.assumptions`,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.unknowns,
    `${path}.unknowns`,
    issues,
  );

  if (
    typeof candidate.humanDecisionRequired !==
    'boolean'
  ) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_type',
        'Expected a boolean human-decision requirement.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ArchitectureRiskAnalysis,
    issues,
  );
}

export function validateTestEvaluationPlanDraft(
  candidate: unknown,
  path = 'testEvaluationPlan',
): HumanMediatedValidationResult<
  TestEvaluationPlanDraft
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a test-and-evaluation plan draft.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'planId',
      'objective',
      'syntheticOnly',
      'proposedCases',
      'acceptanceCriteria',
      'evidenceReferences',
      'executionAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.planId,
    `${path}.planId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.objective,
    `${path}.objective`,
    4_000,
    issues,
  );

  if (candidate.syntheticOnly !== true) {
    issues.push(
      issue(
        `${path}.syntheticOnly`,
        'invalid_value',
        'A CAO test-and-evaluation plan must remain synthetic only.',
      ),
    );
  }

  validateBoundedStringArray(
    candidate.proposedCases,
    `${path}.proposedCases`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.proposedCases,
    `${path}.proposedCases`,
    issues,
  );

  validateBoundedStringArray(
    candidate.acceptanceCriteria,
    `${path}.acceptanceCriteria`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.acceptanceCriteria,
    `${path}.acceptanceCriteria`,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  if (candidate.executionAuthorized !== false) {
    issues.push(
      issue(
        `${path}.executionAuthorized`,
        'invalid_value',
        'A test-and-evaluation plan may not authorize execution.',
      ),
    );
  }

  return result(
    candidate as unknown as
      TestEvaluationPlanDraft,
    issues,
  );
}

export function validateProposedImplementationSequence(
  candidate: unknown,
  path = 'proposedImplementationSequence',
): HumanMediatedValidationResult<
  ProposedImplementationSequence
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a proposed implementation sequence.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'sequenceId',
      'proposedSteps',
      'dependencies',
      'blockers',
      'rollbackConsiderations',
      'approvalStatus',
      'implementationAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.sequenceId,
    `${path}.sequenceId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedStringArray(
    candidate.proposedSteps,
    `${path}.proposedSteps`,
    WORKFLOW_CONTRACT_BOUNDS.recommendations,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.proposedSteps,
    `${path}.proposedSteps`,
    issues,
  );

  validateBoundedStringArray(
    candidate.dependencies,
    `${path}.dependencies`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.dependencies,
    `${path}.dependencies`,
    issues,
  );

  validateBoundedStringArray(
    candidate.blockers,
    `${path}.blockers`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    2_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.blockers,
    `${path}.blockers`,
    issues,
  );

  validateBoundedStringArray(
    candidate.rollbackConsiderations,
    `${path}.rollbackConsiderations`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.rollbackConsiderations,
    `${path}.rollbackConsiderations`,
    issues,
  );

  if (candidate.approvalStatus !== 'unapproved') {
    issues.push(
      issue(
        `${path}.approvalStatus`,
        'invalid_value',
        'A proposed implementation sequence must remain unapproved.',
      ),
    );
  }

  if (candidate.implementationAuthorized !== false) {
    issues.push(
      issue(
        `${path}.implementationAuthorized`,
        'invalid_value',
        'A proposed implementation sequence may not authorize implementation.',
      ),
    );
  }

  return result(
    candidate as unknown as
      ProposedImplementationSequence,
    issues,
  );
}

export function validateTechnicalDissentRecord(
  candidate: unknown,
  path = 'technicalDissent',
): HumanMediatedValidationResult<
  TechnicalDissentRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a technical-dissent record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'dissentId',
      'issue',
      'position',
      'evidenceReferences',
      'assumptions',
      'unknowns',
      'confidenceAndLimitations',
      'consequenceIfIgnored',
      'preservationRequired',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.dissentId,
    `${path}.dissentId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.issue,
    `${path}.issue`,
    4_000,
    issues,
  );

  validateBoundedString(
    candidate.position,
    `${path}.position`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    WORKFLOW_CONTRACT_BOUNDS.evidenceItems,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    candidate.assumptions,
    `${path}.assumptions`,
    WORKFLOW_CONTRACT_BOUNDS.assumptions,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.assumptions,
    `${path}.assumptions`,
    issues,
  );

  validateBoundedStringArray(
    candidate.unknowns,
    `${path}.unknowns`,
    WORKFLOW_CONTRACT_BOUNDS.unknowns,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.unknowns,
    `${path}.unknowns`,
    issues,
  );

  validateBoundedStringArray(
    candidate.confidenceAndLimitations,
    `${path}.confidenceAndLimitations`,
    WORKFLOW_CONTRACT_BOUNDS.dissentEntries,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.confidenceAndLimitations,
    `${path}.confidenceAndLimitations`,
    issues,
  );

  validateBoundedString(
    candidate.consequenceIfIgnored,
    `${path}.consequenceIfIgnored`,
    4_000,
    issues,
  );

  if (candidate.preservationRequired !== true) {
    issues.push(
      issue(
        `${path}.preservationRequired`,
        'invalid_value',
        'Technical dissent must remain explicitly preserved.',
      ),
    );
  }

  return result(
    candidate as unknown as
      TechnicalDissentRecord,
    issues,
  );
}

export function validateCaoDraftExtension(
  candidate: unknown,
  path = 'roleOutput.roleExtension',
): HumanMediatedValidationResult<
  CaoDraftExtension
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a Chief Architecture Officer draft extension.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'extensionVersion',
      'artifactKind',
      'evidenceInspected',
      'evidenceUnavailable',
      'alternativesConsidered',
      'affectedComponents',
      'architectureProposals',
      'riskAnalyses',
      'reversibilityAnalysis',
      'testAndEvaluationPlans',
      'proposedImplementationSequences',
      'recommendedOptionId',
      'technicalDissent',
      'confidenceAndLimitations',
      'founderApprovalChecklist',
      'approvalsStillRequired',
      'constitutionalInterpretationPerformed',
      'legalInterpretationPerformed',
      'adrRatificationPerformed',
      'implementationAuthorized',
      'repositoryModificationAuthorized',
      'migrationAuthorized',
      'deploymentAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  if (
    candidate.extensionVersion !==
    'executive-chief-architecture-officer-draft-extension-v1'
  ) {
    issues.push(
      issue(
        `${path}.extensionVersion`,
        'invalid_value',
        'Unknown Chief Architecture Officer extension version.',
      ),
    );
  }

  if (
    !includesLiteral(
      CAO_ARTIFACT_KINDS,
      candidate.artifactKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.artifactKind`,
        'invalid_value',
        'Unknown Chief Architecture Officer artifact kind.',
      ),
    );
  }

  const inspectedEvidenceIds: string[] = [];

  if (!Array.isArray(candidate.evidenceInspected)) {
    issues.push(
      issue(
        `${path}.evidenceInspected`,
        'invalid_type',
        'Inspected evidence must be an array.',
      ),
    );
  } else {
    if (
      candidate.evidenceInspected.length >
      WORKFLOW_CONTRACT_BOUNDS.evidenceItems
    ) {
      issues.push(
        issue(
          `${path}.evidenceInspected`,
          'too_many_items',
          'Too many inspected evidence records.',
        ),
      );
    }

    candidate.evidenceInspected.forEach(
      (evidence, index) => {
        const evidencePath =
          `${path}.evidenceInspected[${index}]`;

        const validation =
          validateArchitectureEvidenceRecord(
            evidence,
            evidencePath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        inspectedEvidenceIds.push(
          validation.value.evidenceId,
        );

        if (validation.value.available !== true) {
          issues.push(
            issue(
              `${evidencePath}.available`,
              'invalid_value',
              'Inspected evidence must be marked available.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      inspectedEvidenceIds,
      `${path}.evidenceInspected`,
      issues,
    );
  }

  const unavailableEvidenceIds: string[] = [];

  if (!Array.isArray(candidate.evidenceUnavailable)) {
    issues.push(
      issue(
        `${path}.evidenceUnavailable`,
        'invalid_type',
        'Unavailable evidence must be an array.',
      ),
    );
  } else {
    if (
      candidate.evidenceUnavailable.length >
      WORKFLOW_CONTRACT_BOUNDS.evidenceItems
    ) {
      issues.push(
        issue(
          `${path}.evidenceUnavailable`,
          'too_many_items',
          'Too many unavailable evidence records.',
        ),
      );
    }

    candidate.evidenceUnavailable.forEach(
      (evidence, index) => {
        const evidencePath =
          `${path}.evidenceUnavailable[${index}]`;

        const validation =
          validateArchitectureEvidenceRecord(
            evidence,
            evidencePath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        unavailableEvidenceIds.push(
          validation.value.evidenceId,
        );

        if (validation.value.available !== false) {
          issues.push(
            issue(
              `${evidencePath}.available`,
              'invalid_value',
              'Unavailable evidence must be marked unavailable.',
            ),
          );
        }

        if (
          inspectedEvidenceIds.includes(
            validation.value.evidenceId,
          )
        ) {
          issues.push(
            issue(
              `${evidencePath}.evidenceId`,
              'invalid_value',
              'Evidence may not appear in both inspected and unavailable collections.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      unavailableEvidenceIds,
      `${path}.evidenceUnavailable`,
      issues,
    );
  }

  const alternativeIds: string[] = [];

  if (!Array.isArray(candidate.alternativesConsidered)) {
    issues.push(
      issue(
        `${path}.alternativesConsidered`,
        'invalid_type',
        'Architecture alternatives must be an array.',
      ),
    );
  } else {
    if (
      candidate.alternativesConsidered.length >
      WORKFLOW_CONTRACT_BOUNDS.recommendations
    ) {
      issues.push(
        issue(
          `${path}.alternativesConsidered`,
          'too_many_items',
          'Too many architecture alternatives.',
        ),
      );
    }

    candidate.alternativesConsidered.forEach(
      (alternative, index) => {
        const validation =
          validateArchitectureAlternativeDraft(
            alternative,
            `${path}.alternativesConsidered[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        alternativeIds.push(
          validation.value.alternativeId,
        );
      },
    );

    validateUniqueStringValues(
      alternativeIds,
      `${path}.alternativesConsidered`,
      issues,
    );
  }

  validateBoundedStringArray(
    candidate.affectedComponents,
    `${path}.affectedComponents`,
    WORKFLOW_CONTRACT_BOUNDS.knownConstraints,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateUniqueStringValues(
    candidate.affectedComponents,
    `${path}.affectedComponents`,
    issues,
  );

  const proposalIds: string[] = [];

  if (!Array.isArray(candidate.architectureProposals)) {
    issues.push(
      issue(
        `${path}.architectureProposals`,
        'invalid_type',
        'Architecture proposals must be an array.',
      ),
    );
  } else {
    if (
      candidate.architectureProposals.length >
      WORKFLOW_CONTRACT_BOUNDS.recommendations
    ) {
      issues.push(
        issue(
          `${path}.architectureProposals`,
          'too_many_items',
          'Too many architecture proposals.',
        ),
      );
    }

    candidate.architectureProposals.forEach(
      (proposal, index) => {
        const validation =
          validateUnimplementedArchitectureProposal(
            proposal,
            `${path}.architectureProposals[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        proposalIds.push(
          validation.value.proposalId,
        );
      },
    );

    validateUniqueStringValues(
      proposalIds,
      `${path}.architectureProposals`,
      issues,
    );
  }

  const riskAnalysisIds: string[] = [];

  if (!Array.isArray(candidate.riskAnalyses)) {
    issues.push(
      issue(
        `${path}.riskAnalyses`,
        'invalid_type',
        'Architecture-risk analyses must be an array.',
      ),
    );
  } else {
    if (
      candidate.riskAnalyses.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.riskAnalyses`,
          'too_many_items',
          'Too many architecture-risk analyses.',
        ),
      );
    }

    candidate.riskAnalyses.forEach(
      (analysis, index) => {
        const validation =
          validateArchitectureRiskAnalysis(
            analysis,
            `${path}.riskAnalyses[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        riskAnalysisIds.push(
          validation.value.analysisId,
        );
      },
    );

    validateUniqueStringValues(
      riskAnalysisIds,
      `${path}.riskAnalyses`,
      issues,
    );
  }

  const reversibilityAnalysisIds: string[] = [];

  if (!Array.isArray(candidate.reversibilityAnalysis)) {
    issues.push(
      issue(
        `${path}.reversibilityAnalysis`,
        'invalid_type',
        'Reversibility analyses must be an array.',
      ),
    );
  } else {
    if (
      candidate.reversibilityAnalysis.length >
      WORKFLOW_CONTRACT_BOUNDS.knownConstraints
    ) {
      issues.push(
        issue(
          `${path}.reversibilityAnalysis`,
          'too_many_items',
          'Too many reversibility analyses.',
        ),
      );
    }

    candidate.reversibilityAnalysis.forEach(
      (analysis, index) => {
        const analysisPath =
          `${path}.reversibilityAnalysis[${index}]`;

        const validation =
          validateArchitectureRiskAnalysis(
            analysis,
            analysisPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        reversibilityAnalysisIds.push(
          validation.value.analysisId,
        );

        if (
          validation.value.riskKind !==
          'reversibility'
        ) {
          issues.push(
            issue(
              `${analysisPath}.riskKind`,
              'invalid_value',
              'Reversibility analysis entries must use the reversibility risk kind.',
            ),
          );
        }

        if (
          riskAnalysisIds.includes(
            validation.value.analysisId,
          )
        ) {
          issues.push(
            issue(
              `${analysisPath}.analysisId`,
              'invalid_value',
              'A risk-analysis identifier may not be reused in the reversibility collection.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      reversibilityAnalysisIds,
      `${path}.reversibilityAnalysis`,
      issues,
    );
  }

  const testPlanIds: string[] = [];

  if (!Array.isArray(candidate.testAndEvaluationPlans)) {
    issues.push(
      issue(
        `${path}.testAndEvaluationPlans`,
        'invalid_type',
        'Test-and-evaluation plans must be an array.',
      ),
    );
  } else {
    if (
      candidate.testAndEvaluationPlans.length >
      WORKFLOW_CONTRACT_BOUNDS.recommendations
    ) {
      issues.push(
        issue(
          `${path}.testAndEvaluationPlans`,
          'too_many_items',
          'Too many test-and-evaluation plans.',
        ),
      );
    }

    candidate.testAndEvaluationPlans.forEach(
      (plan, index) => {
        const validation =
          validateTestEvaluationPlanDraft(
            plan,
            `${path}.testAndEvaluationPlans[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        testPlanIds.push(
          validation.value.planId,
        );
      },
    );

    validateUniqueStringValues(
      testPlanIds,
      `${path}.testAndEvaluationPlans`,
      issues,
    );
  }

  const implementationSequenceIds: string[] = [];

  if (
    !Array.isArray(
      candidate.proposedImplementationSequences,
    )
  ) {
    issues.push(
      issue(
        `${path}.proposedImplementationSequences`,
        'invalid_type',
        'Proposed implementation sequences must be an array.',
      ),
    );
  } else {
    if (
      candidate.proposedImplementationSequences.length >
      WORKFLOW_CONTRACT_BOUNDS.recommendations
    ) {
      issues.push(
        issue(
          `${path}.proposedImplementationSequences`,
          'too_many_items',
          'Too many proposed implementation sequences.',
        ),
      );
    }

    candidate.proposedImplementationSequences.forEach(
      (sequence, index) => {
        const validation =
          validateProposedImplementationSequence(
            sequence,
            `${path}.proposedImplementationSequences[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        implementationSequenceIds.push(
          validation.value.sequenceId,
        );
      },
    );

    validateUniqueStringValues(
      implementationSequenceIds,
      `${path}.proposedImplementationSequences`,
      issues,
    );
  }

  validateOptionalIdentifier(
    candidate.recommendedOptionId,
    `${path}.recommendedOptionId`,
    issues,
  );

  if (
    typeof candidate.recommendedOptionId ===
      'string' &&
    !alternativeIds.includes(
      candidate.recommendedOptionId,
    )
  ) {
    issues.push(
      issue(
        `${path}.recommendedOptionId`,
        'invalid_value',
        'Recommended option must reference a validated architecture alternative.',
      ),
    );
  }

  const dissentIds: string[] = [];

  if (!Array.isArray(candidate.technicalDissent)) {
    issues.push(
      issue(
        `${path}.technicalDissent`,
        'invalid_type',
        'Technical dissent must be an array.',
      ),
    );
  } else {
    if (
      candidate.technicalDissent.length >
      WORKFLOW_CONTRACT_BOUNDS.dissentEntries
    ) {
      issues.push(
        issue(
          `${path}.technicalDissent`,
          'too_many_items',
          'Too many technical-dissent records.',
        ),
      );
    }

    candidate.technicalDissent.forEach(
      (dissent, index) => {
        const validation =
          validateTechnicalDissentRecord(
            dissent,
            `${path}.technicalDissent[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        dissentIds.push(
          validation.value.dissentId,
        );
      },
    );

    validateUniqueStringValues(
      dissentIds,
      `${path}.technicalDissent`,
      issues,
    );
  }

  validateBoundedStringArray(
    candidate.confidenceAndLimitations,
    `${path}.confidenceAndLimitations`,
    WORKFLOW_CONTRACT_BOUNDS.dissentEntries,
    4_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.confidenceAndLimitations,
    `${path}.confidenceAndLimitations`,
    issues,
  );

  const checklistItemIds: string[] = [];

  if (
    !Array.isArray(
      candidate.founderApprovalChecklist,
    )
  ) {
    issues.push(
      issue(
        `${path}.founderApprovalChecklist`,
        'invalid_type',
        'Founder approval checklist must be an array.',
      ),
    );
  } else {
    if (
      candidate.founderApprovalChecklist.length >
      WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.founderApprovalChecklist`,
          'too_many_items',
          'Too many Founder approval checklist items.',
        ),
      );
    }

    candidate.founderApprovalChecklist.forEach(
      (checklistItem, index) => {
        const validation =
          validateFounderApprovalChecklistItem(
            checklistItem,
            `${path}.founderApprovalChecklist[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        checklistItemIds.push(
          validation.value.checklistItemId,
        );
      },
    );

    validateUniqueStringValues(
      checklistItemIds,
      `${path}.founderApprovalChecklist`,
      issues,
    );
  }

  validateBoundedStringArray(
    candidate.approvalsStillRequired,
    `${path}.approvalsStillRequired`,
    WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions,
    2_000,
    issues,
  );

  validateUniqueStringValues(
    candidate.approvalsStillRequired,
    `${path}.approvalsStillRequired`,
    issues,
  );

  validateRequiredFalseFields(
    candidate,
    [
      'constitutionalInterpretationPerformed',
      'legalInterpretationPerformed',
      'adrRatificationPerformed',
      'implementationAuthorized',
      'repositoryModificationAuthorized',
      'migrationAuthorized',
      'deploymentAuthorized',
      'roleDispatchAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as CaoDraftExtension,
    issues,
  );
}

export function validateCaoHumanMediatedOutput(
  candidate: unknown,
  path = 'roleOutput',
): HumanMediatedValidationResult<
  CaoHumanMediatedOutput
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a Chief Architecture Officer human-mediated role output.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'workflowId',
      'runId',
      'roleId',
      'taskClass',
      'commonOutput',
      'roleExtension',
      'materialDisagreements',
      'escalationPacket',
      'clarificationRequests',
      'humanDecisionRequired',
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    `${path}.runId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    candidate.roleId !==
    'executive.chief_architecture_officer'
  ) {
    issues.push(
      issue(
        `${path}.roleId`,
        'invalid_value',
        'Chief Architecture Officer output must use the executive.chief_architecture_officer role.',
      ),
    );
  }

  if (
    typeof candidate.taskClass !== 'string' ||
    !isTaskClass(candidate.taskClass)
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'unknown_task',
        'Unknown Chief Architecture Officer output task class.',
      ),
    );
  } else if (
    !isTaskAllowedForRole(
      'executive.chief_architecture_officer',
      candidate.taskClass,
    )
  ) {
    issues.push(
      issue(
        `${path}.taskClass`,
        'task_not_allowed_for_role',
        'Task class is not allowed for the Chief Architecture Officer role.',
      ),
    );
  }

  const commonValidation =
    validateExecutiveAgentDraftOutput(
      candidate.commonOutput,
      `${path}.commonOutput`,
    );

  if (!commonValidation.ok) {
    issues.push(...commonValidation.issues);
  }

  const extensionValidation =
    validateCaoDraftExtension(
      candidate.roleExtension,
      `${path}.roleExtension`,
    );

  if (!extensionValidation.ok) {
    issues.push(...extensionValidation.issues);
  }

  const disagreementIds: string[] = [];

  if (!Array.isArray(candidate.materialDisagreements)) {
    issues.push(
      issue(
        `${path}.materialDisagreements`,
        'invalid_type',
        'Material disagreements must be an array.',
      ),
    );
  } else {
    if (
      candidate.materialDisagreements.length >
      WORKFLOW_CONTRACT_BOUNDS.disagreementPositions
    ) {
      issues.push(
        issue(
          `${path}.materialDisagreements`,
          'too_many_items',
          'Too many material disagreements.',
        ),
      );
    }

    candidate.materialDisagreements.forEach(
      (disagreement, index) => {
        const validation =
          validateMaterialDisagreementV2(
            disagreement,
            `${path}.materialDisagreements[${index}]`,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        disagreementIds.push(
          validation.value.disagreementId,
        );
      },
    );

    validateUniqueStringValues(
      disagreementIds,
      `${path}.materialDisagreements`,
      issues,
    );
  }

  const clarificationIds: string[] = [];

  if (!Array.isArray(candidate.clarificationRequests)) {
    issues.push(
      issue(
        `${path}.clarificationRequests`,
        'invalid_type',
        'Clarification requests must be an array.',
      ),
    );
  } else {
    if (
      candidate.clarificationRequests.length >
      WORKFLOW_CONTRACT_BOUNDS.requiredHumanDecisions
    ) {
      issues.push(
        issue(
          `${path}.clarificationRequests`,
          'too_many_items',
          'Too many clarification requests.',
        ),
      );
    }

    candidate.clarificationRequests.forEach(
      (request, index) => {
        const requestPath =
          `${path}.clarificationRequests[${index}]`;

        const validation =
          validateClarificationRequestProposal(
            request,
            requestPath,
          );

        if (!validation.ok) {
          issues.push(...validation.issues);
          return;
        }

        clarificationIds.push(
          validation.value.clarificationRequestId,
        );

        if (
          validation.value.workflowId !==
          candidate.workflowId
        ) {
          issues.push(
            issue(
              `${requestPath}.workflowId`,
              'invalid_value',
              'Clarification workflow must match the role output.',
            ),
          );
        }

        if (
          validation.value.runId !==
          candidate.runId
        ) {
          issues.push(
            issue(
              `${requestPath}.runId`,
              'invalid_value',
              'Clarification run must match the role output.',
            ),
          );
        }

        if (
          validation.value.roleId !==
          candidate.roleId
        ) {
          issues.push(
            issue(
              `${requestPath}.roleId`,
              'invalid_value',
              'Clarification role must match the role output.',
            ),
          );
        }
      },
    );

    validateUniqueStringValues(
      clarificationIds,
      `${path}.clarificationRequests`,
      issues,
    );
  }

  if (candidate.escalationPacket !== null) {
    const escalationValidation =
      validateExecutiveEscalationPacket(
        candidate.escalationPacket,
        `${path}.escalationPacket`,
      );

    if (!escalationValidation.ok) {
      issues.push(...escalationValidation.issues);
    } else {
      const escalation =
        escalationValidation.value;

      if (
        escalation.workflowId !==
        candidate.workflowId
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.workflowId`,
            'invalid_value',
            'Escalation workflow must match the role output.',
          ),
        );
      }

      if (escalation.runId !== candidate.runId) {
        issues.push(
          issue(
            `${path}.escalationPacket.runId`,
            'invalid_value',
            'Escalation run must match the role output.',
          ),
        );
      }

      if (escalation.roleId !== candidate.roleId) {
        issues.push(
          issue(
            `${path}.escalationPacket.roleId`,
            'invalid_value',
            'Escalation role must match the role output.',
          ),
        );
      }

      if (
        escalation.taskClass !==
        candidate.taskClass
      ) {
        issues.push(
          issue(
            `${path}.escalationPacket.taskClass`,
            'invalid_value',
            'Escalation task must match the role output.',
          ),
        );
      }
    }
  }

  if (commonValidation.ok) {
    if (
      commonValidation.value.escalationRequired &&
      candidate.escalationPacket === null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'missing_value',
          'An escalation-required output needs an escalation packet.',
        ),
      );
    }

    if (
      !commonValidation.value.escalationRequired &&
      candidate.escalationPacket !== null
    ) {
      issues.push(
        issue(
          `${path}.escalationPacket`,
          'invalid_value',
          'A non-escalating output may not include an escalation packet.',
        ),
      );
    }
  }

  if (candidate.humanDecisionRequired !== true) {
    issues.push(
      issue(
        `${path}.humanDecisionRequired`,
        'invalid_value',
        'Human decision must remain required.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'automaticApproval',
      'automaticSelection',
      'automaticContinuation',
      'roleDispatchPerformed',
      'toolExecutionPerformed',
      'persistencePerformed',
      'previewActivationPerformed',
      'productionEligible',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      CaoHumanMediatedOutput,
    issues,
  );
}

export function validateWorkflowClosureRecord(
  candidate: unknown,
  path = 'workflowClosureRecord',
): HumanMediatedValidationResult<
  WorkflowClosureRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a workflow-closure record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'closureRecordId',
      'workflowId',
      'closedBy',
      'closedByIdentifier',
      'closedAt',
      'closureReason',
      'unresolvedDisagreementIds',
      'unresolvedDissentRemainsVisible',
      'consensusClaimed',
      'disagreementResolutionImplied',
      'implementationAuthorized',
      'previewActivationAuthorized',
      'productionActivationAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.closureRecordId,
    `${path}.closureRecordId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    !includesLiteral(
      HUMAN_DISPOSITION_SOURCE_KINDS,
      candidate.closedBy,
    )
  ) {
    issues.push(
      issue(
        `${path}.closedBy`,
        'invalid_value',
        'Unknown human closure source.',
      ),
    );
  }

  validateBoundedString(
    candidate.closedByIdentifier,
    `${path}.closedByIdentifier`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.closedAt,
    `${path}.closedAt`,
    64,
    issues,
  );

  if (
    typeof candidate.closedAt === 'string' &&
    Number.isNaN(Date.parse(candidate.closedAt))
  ) {
    issues.push(
      issue(
        `${path}.closedAt`,
        'invalid_value',
        'Closure timestamp must be valid ISO-8601 text.',
      ),
    );
  }

  validateBoundedString(
    candidate.closureReason,
    `${path}.closureReason`,
    4_000,
    issues,
  );

  validateBoundedStringArray(
    candidate.unresolvedDisagreementIds,
    `${path}.unresolvedDisagreementIds`,
    WORKFLOW_CONTRACT_BOUNDS
      .disagreementPositions,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (
    candidate.unresolvedDissentRemainsVisible !==
    true
  ) {
    issues.push(
      issue(
        `${path}.unresolvedDissentRemainsVisible`,
        'invalid_value',
        'Administrative closure must preserve unresolved dissent visibly.',
      ),
    );
  }

  validateRequiredFalseFields(
    candidate,
    [
      'consensusClaimed',
      'disagreementResolutionImplied',
      'implementationAuthorized',
      'previewActivationAuthorized',
      'productionActivationAuthorized',
    ],
    path,
    issues,
  );

  return result(
    candidate as unknown as
      WorkflowClosureRecord,
    issues,
  );
}

export function validateHumanDispositionRecord(
  candidate: unknown,
  path = 'humanDispositionRecord',
): HumanMediatedValidationResult<
  HumanDispositionRecord
> {
  const issues: HumanMediatedValidationIssue[] = [];

  if (!isRecord(candidate)) {
    return {
      ok: false,
      value: null,
      issues: [
        issue(
          path,
          'invalid_type',
          'Expected a human-disposition record.',
        ),
      ],
    };
  }

  validateExactKeys(
    candidate,
    [
      'dispositionRecordId',
      'workflowId',
      'runId',
      'handoffId',
      'disposition',
      'sourceKind',
      'sourceIdentifier',
      'recordedAt',
      'reason',
      'resolutionReference',
      'permitsDraftReview',
      'permitsDraftQuotation',
      'permitsDraftComparison',
      'permitsDraftRevision',
      'permitsNoncanonicalIncorporation',
      'permitsHumanMediatedHandoff',
      'implementationAuthorized',
      'publicationAuthorized',
      'repositoryModificationAuthorized',
      'previewActivationAuthorized',
      'productionUseAuthorized',
    ],
    path,
    issues,
  );

  validateBoundedString(
    candidate.dispositionRecordId,
    `${path}.dispositionRecordId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.workflowId,
    `${path}.workflowId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  validateBoundedString(
    candidate.runId,
    `${path}.runId`,
    WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
    issues,
  );

  if (candidate.handoffId !== null) {
    validateBoundedString(
      candidate.handoffId,
      `${path}.handoffId`,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );
  }

  if (
    !includesLiteral(
      HUMAN_DISPOSITIONS,
      candidate.disposition,
    )
  ) {
    issues.push(
      issue(
        `${path}.disposition`,
        'invalid_value',
        'Unknown human disposition.',
      ),
    );
  }

  if (
    !includesLiteral(
      HUMAN_DISPOSITION_SOURCE_KINDS,
      candidate.sourceKind,
    )
  ) {
    issues.push(
      issue(
        `${path}.sourceKind`,
        'invalid_value',
        'Unknown human-disposition source kind.',
      ),
    );
  }

  validateBoundedString(
    candidate.sourceIdentifier,
    `${path}.sourceIdentifier`,
    WORKFLOW_CONTRACT_BOUNDS.humanLabelCharacters,
    issues,
  );

  validateBoundedString(
    candidate.recordedAt,
    `${path}.recordedAt`,
    64,
    issues,
  );

  validateBoundedString(
    candidate.reason,
    `${path}.reason`,
    4_000,
    issues,
  );

  if (candidate.resolutionReference !== null) {
    validateBoundedString(
      candidate.resolutionReference,
      `${path}.resolutionReference`,
      WORKFLOW_CONTRACT_BOUNDS.identifierCharacters,
      issues,
    );
  }

  const permissionFields = [
    'permitsDraftReview',
    'permitsDraftQuotation',
    'permitsDraftComparison',
    'permitsDraftRevision',
    'permitsNoncanonicalIncorporation',
    'permitsHumanMediatedHandoff',
  ] as const;

  for (const field of permissionFields) {
    if (typeof candidate[field] !== 'boolean') {
      issues.push(
        issue(
          `${path}.${field}`,
          'invalid_type',
          `${field} must be boolean.`,
        ),
      );
    }
  }

  const prohibitedAuthorityFields = [
    'implementationAuthorized',
    'publicationAuthorized',
    'repositoryModificationAuthorized',
    'previewActivationAuthorized',
    'productionUseAuthorized',
  ] as const;

  for (const field of prohibitedAuthorityFields) {
    if (candidate[field] !== false) {
      issues.push(
        issue(
          `${path}.${field}`,
          'invalid_value',
          `${field} must remain false.`,
        ),
      );
    }
  }

  return result(
    candidate as unknown as HumanDispositionRecord,
    issues,
  );
}
