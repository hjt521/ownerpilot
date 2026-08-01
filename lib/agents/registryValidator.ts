/**
 * Fail-closed validation for the non-production executive-agent registry.
 *
 * Pure and deterministic:
 * - no model/provider calls;
 * - no environment-variable access;
 * - no persistence;
 * - no network access;
 * - no runtime activation.
 */

import {
  AGENT_RUN_OUTCOMES,
  ALLOWED_TOOL_PERMISSIONS,
  AUTHORITY_CATEGORIES,
  EVIDENCE_STATES,
  EXECUTIVE_ROLE_IDS,
  HUMAN_DISPOSITIONS,
  MODEL_ASSIGNMENT_USES,
  PROHIBITED_AUTHORITY_CATEGORIES,
  PROHIBITED_TOOL_PERMISSIONS,
  REASONING_LEVELS,
  REGISTRY_STATUSES,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  TASK_CLASSES,
  TOOL_CALL_STATUSES,
  type AllowedToolPermission,
  type DisagreementRecord,
  type ExecutiveAgentRunRequest,
  type ExecutiveRoleId,
  type ModelAssignment,
  type ModelAssignmentUse,
  type RegistryAuditMetadata,
  type RegistryLimits,
  type RuntimeModelRegistryEntry,
  type TaskClass,
  type ToolAuditRecord,
  type ToolPermissionPolicy,
  isAllowedToolPermission,
  isExecutiveRoleId,
  isProhibitedToolPermission,
  isTaskAllowedForRole,
  isTaskClass,
  isToolAllowedForRole,
  isToolPermission,
} from '../ai/modelRegistry';

export const REGISTRY_VALIDATION_ISSUE_CODES = [
  'invalid_type',
  'missing_field',
  'unknown_field',
  'invalid_value',
  'unknown_role_id',
  'unknown_task_class',
  'task_not_allowed_for_role',
  'unknown_tool_permission',
  'prohibited_tool_permission',
  'tool_not_allowed_for_role',
  'missing_registry_version',
  'missing_charter_version',
  'missing_pinned_model_version',
  'moving_model_alias',
  'invalid_assignment_slot',
  'assignment_disabled',
  'registry_not_preview_approved',
  'missing_founder_approval',
  'missing_role_approval_reference',
  'role_approval_reference_mismatch',
  'automatic_provider_substitution',
  'automatic_fallback',
  'fallback_authority_expansion',
  'non_preview_environment',
  'production_prohibited',
  'missing_human_initiation',
  'limit_bypass',
  'role_self_expansion',
  'prohibited_authority',
  'disagreement_preservation_required',
  'uncertainty_preservation_required',
  'evidence_escalation_required',
  'invalid_audit_metadata',
  'audit_metadata_mismatch',
  'audit_metadata_unbounded',
] as const;

export type RegistryValidationIssueCode =
  (typeof REGISTRY_VALIDATION_ISSUE_CODES)[number];

export interface RegistryValidationIssue {
  code: RegistryValidationIssueCode;
  path: string;
  message: string;
}

export type RegistryValidationResult<T> =
  | {
      ok: true;
      value: T;
      issues: readonly [];
    }
  | {
      ok: false;
      value: null;
      issues: readonly RegistryValidationIssue[];
    };

const MOVING_ALIAS_TOKENS = new Set([
  'latest',
  'current',
  'stable',
  'preview',
  'production',
  'default',
  'auto',
  'automatic',
  'rolling',
  'main',
  'head',
  'canary',
  'nightly',
]);

const MAX_IDENTIFIER_LENGTH = 256;
const MAX_REFERENCE_LENGTH = 512;
const MAX_FREE_TEXT_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_DISAGREEMENTS = 50;
const MAX_TOOL_CALLS = 100;

const REGISTRY_ENTRY_KEYS = [
  'roleId',
  'registryVersion',
  'charterVersion',
  'status',
  'primaryModel',
  'challengerModel',
  'fallbackModel',
  'allowedTaskClasses',
  'toolPermissions',
  'reasoningLevel',
  'limits',
  'humanApprovalRequirements',
  'providerSubstitutionPolicy',
  'environmentEligibility',
  'roleApprovalReference',
] as const;

const MODEL_ASSIGNMENT_KEYS = [
  'providerId',
  'modelId',
  'pinnedModelVersion',
  'adapterId',
  'enabled',
  'intendedUse',
] as const;

const TOOL_POLICY_KEYS = [
  'defaultEffect',
  'allowed',
  'prohibited',
  'approvalRequired',
] as const;

const LIMIT_KEYS = [
  'hardTimeoutMs',
  'targetP95LatencyMs',
  'maximumInputTokens',
  'maximumOutputTokens',
  'maximumEstimatedCostMicrosPerRun',
  'maximumEstimatedCostMicrosPerDay',
] as const;

const HUMAN_APPROVAL_KEYS = [
  'explicitHumanInitiationRequired',
  'founderApprovalRequired',
  'outputDisposition',
  'noApprovalBySilence',
] as const;

const SUBSTITUTION_POLICY_KEYS = [
  'mode',
  'allowAutomaticPrimaryToFallback',
  'allowAutomaticProviderChange',
  'requireEquivalentOrStricterLimits',
  'requireSameTaskAndToolBoundary',
  'requireAuditReason',
  'requireFounderApproval',
] as const;

const RUN_REQUEST_KEYS = [
  'registryEntry',
  'environment',
  'explicitHumanInitiation',
  'roleApprovalReference',
  'requestedTaskClass',
  'requestedTools',
  'requestedAuthorityCategories',
  'authorityExpansionRequested',
  'disagreementPreservationRequired',
  'uncertaintyPreservationRequired',
  'evidenceState',
  'requestedUsage',
  'auditMetadata',
] as const;

const USAGE_KEYS = [
  'inputTokens',
  'outputTokens',
  'estimatedCostMicros',
  'estimatedDailyCostMicrosAfterRun',
  'elapsedLatencyMs',
  'requestedTimeoutMs',
] as const;

const AUDIT_KEYS = [
  'runId',
  'roleId',
  'registryVersion',
  'charterVersion',
  'registryEntryHash',
  'environment',
  'sourceCommitSha',
  'requestedBy',
  'approvalReference',
  'taskClass',
  'modelSlot',
  'providerId',
  'modelId',
  'pinnedModelVersion',
  'adapterId',
  'reasoningLevel',
  'effectiveToolPermissions',
  'toolCalls',
  'substitutionRequested',
  'substitutionReasonClass',
  'fallbackReasonClass',
  'startedAt',
  'completedAt',
  'latencyMs',
  'inputTokenCount',
  'outputTokenCount',
  'estimatedCostMicros',
  'evidenceReferences',
  'unknownsRecorded',
  'disagreements',
  'outcome',
  'humanDisposition',
] as const;

const TOOL_AUDIT_KEYS = [
  'permission',
  'status',
  'reasonClass',
] as const;

const DISAGREEMENT_KEYS = [
  'issue',
  'positions',
  'evidenceReferences',
  'unknowns',
  'decisionOwner',
  'founderDecisionRequired',
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function includesLiteral(
  values: readonly string[],
  candidate: unknown,
): candidate is string {
  return (
    typeof candidate === 'string' &&
    values.includes(candidate)
  );
}

function addIssue(
  issues: RegistryValidationIssue[],
  code: RegistryValidationIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function validateExactKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
  path: string,
  issues: RegistryValidationIssue[],
): void {
  const allowed = new Set(allowedKeys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      addIssue(
        issues,
        'unknown_field',
        `${path}.${key}`,
        'Unlisted fields are denied by default.',
      );
    }
  }

  for (const key of requiredKeys) {
    if (!(key in value)) {
      addIssue(
        issues,
        'missing_field',
        `${path}.${key}`,
        'Required field is missing.',
      );
    }
  }
}

function validateBoundedString(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
  options: {
    maximumLength?: number;
    allowEmpty?: boolean;
    issueCode?: RegistryValidationIssueCode;
  } = {},
): value is string {
  const maximumLength =
    options.maximumLength ?? MAX_IDENTIFIER_LENGTH;
  const allowEmpty = options.allowEmpty ?? false;

  if (typeof value !== 'string') {
    addIssue(
      issues,
      options.issueCode ?? 'invalid_type',
      path,
      'Expected a string.',
    );
    return false;
  }

  const trimmed = value.trim();

  if (!allowEmpty && trimmed.length === 0) {
    addIssue(
      issues,
      options.issueCode ?? 'invalid_value',
      path,
      'Value must not be empty.',
    );
    return false;
  }

  if (value.length > maximumLength) {
    addIssue(
      issues,
      'audit_metadata_unbounded',
      path,
      `String exceeds the ${maximumLength}-character bound.`,
    );
    return false;
  }

  return true;
}

function validateBooleanLiteral(
  value: unknown,
  expected: boolean,
  path: string,
  issues: RegistryValidationIssue[],
  code: RegistryValidationIssueCode = 'invalid_value',
): value is boolean {
  if (value !== expected) {
    addIssue(
      issues,
      code,
      path,
      `Expected the literal value ${String(expected)}.`,
    );
    return false;
  }

  return true;
}

function validateFiniteNonnegativeInteger(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
  options: {
    positive?: boolean;
    maximum?: number;
  } = {},
): value is number {
  const valid =
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= (options.positive ? 1 : 0) &&
    (
      options.maximum === undefined ||
      value <= options.maximum
    );

  if (!valid) {
    addIssue(
      issues,
      'invalid_value',
      path,
      options.positive
        ? 'Expected a positive finite integer within bounds.'
        : 'Expected a nonnegative finite integer within bounds.',
    );
  }

  return valid;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function validateBoundedStringArray(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
  options: {
    maximumItems?: number;
    maximumItemLength?: number;
    minimumItems?: number;
  } = {},
): value is string[] {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected an array.',
    );
    return false;
  }

  const maximumItems = options.maximumItems ?? MAX_ARRAY_ITEMS;
  const minimumItems = options.minimumItems ?? 0;
  let valid = true;

  if (
    value.length < minimumItems ||
    value.length > maximumItems
  ) {
    addIssue(
      issues,
      'audit_metadata_unbounded',
      path,
      `Array must contain between ${minimumItems} and ${maximumItems} items.`,
    );
    valid = false;
  }

  value.forEach((item, index) => {
    if (
      !validateBoundedString(
        item,
        `${path}[${index}]`,
        issues,
        {
          maximumLength:
            options.maximumItemLength ?? MAX_REFERENCE_LENGTH,
        },
      )
    ) {
      valid = false;
    }
  });

  return valid;
}

function isMovingAlias(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (MOVING_ALIAS_TOKENS.has(normalized)) {
    return true;
  }

  return (
    /(?:^|[/:@._-])(latest|current|stable|default|rolling|canary|nightly|head)(?:$|[/:@._-])/.test(
      normalized,
    )
  );
}

function validateAssignment(
  value: unknown,
  expectedUse: ModelAssignmentUse,
  path: string,
  issues: RegistryValidationIssue[],
): ModelAssignment | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a model-assignment object.',
    );
    return null;
  }

  if (
    expectedUse === 'fallback' &&
    (
      'authorityOverrides' in value ||
      'allowedTaskClasses' in value ||
      'toolPermissions' in value ||
      'authorityCategories' in value
    )
  ) {
    addIssue(
      issues,
      'fallback_authority_expansion',
      path,
      'Fallback assignments cannot carry broader or separate authority.',
    );
  }

  validateExactKeys(
    value,
    MODEL_ASSIGNMENT_KEYS,
    MODEL_ASSIGNMENT_KEYS,
    path,
    issues,
  );

  validateBoundedString(
    value.providerId,
    `${path}.providerId`,
    issues,
  );

  validateBoundedString(
    value.modelId,
    `${path}.modelId`,
    issues,
  );

  const pinnedValid = validateBoundedString(
    value.pinnedModelVersion,
    `${path}.pinnedModelVersion`,
    issues,
    {
      issueCode: 'missing_pinned_model_version',
    },
  );

  validateBoundedString(
    value.adapterId,
    `${path}.adapterId`,
    issues,
  );

  if (typeof value.enabled !== 'boolean') {
    addIssue(
      issues,
      'invalid_type',
      `${path}.enabled`,
      'Expected a boolean.',
    );
  }

  if (value.intendedUse !== expectedUse) {
    addIssue(
      issues,
      'invalid_assignment_slot',
      `${path}.intendedUse`,
      `Expected assignment slot ${expectedUse}.`,
    );
  }

  if (
    typeof value.modelId === 'string' &&
    isMovingAlias(value.modelId)
  ) {
    addIssue(
      issues,
      'moving_model_alias',
      `${path}.modelId`,
      'Moving model aliases are not eligible.',
    );
  }

  if (
    pinnedValid &&
    isMovingAlias(value.pinnedModelVersion as string)
  ) {
    addIssue(
      issues,
      'moving_model_alias',
      `${path}.pinnedModelVersion`,
      'Pinned model version cannot be a moving alias.',
    );
  }

  return value as unknown as ModelAssignment;
}

function validateTaskClasses(
  value: unknown,
  roleId: ExecutiveRoleId | null,
  path: string,
  issues: RegistryValidationIssue[],
): TaskClass[] {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected an array of task classes.',
    );
    return [];
  }

  const validTasks: TaskClass[] = [];
  const seen: string[] = [];

  value.forEach((candidate, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isTaskClass(String(candidate))) {
      addIssue(
        issues,
        'unknown_task_class',
        itemPath,
        'Unknown task classes are denied by default.',
      );
      return;
    }

    const task = candidate as TaskClass;
    seen.push(task);
    validTasks.push(task);

    if (
      roleId !== null &&
      !isTaskAllowedForRole(roleId, task)
    ) {
      addIssue(
        issues,
        'task_not_allowed_for_role',
        itemPath,
        `Task class ${task} is not allowed for ${roleId}.`,
      );
    }
  });

  if (hasDuplicates(seen)) {
    addIssue(
      issues,
      'invalid_value',
      path,
      'Duplicate task classes are not allowed.',
    );
  }

  return validTasks;
}

function validateToolPolicy(
  value: unknown,
  roleId: ExecutiveRoleId | null,
  path: string,
  issues: RegistryValidationIssue[],
): ToolPermissionPolicy | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a tool-permission policy object.',
    );
    return null;
  }

  validateExactKeys(
    value,
    TOOL_POLICY_KEYS,
    TOOL_POLICY_KEYS,
    path,
    issues,
  );

  if (value.defaultEffect !== 'deny') {
    addIssue(
      issues,
      'invalid_value',
      `${path}.defaultEffect`,
      'Tool permissions must deny by default.',
    );
  }

  const allowed: AllowedToolPermission[] = [];

  if (!Array.isArray(value.allowed)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.allowed`,
      'Expected an allowed-tool array.',
    );
  } else {
    const seen: string[] = [];

    value.allowed.forEach((candidate, index) => {
      const itemPath = `${path}.allowed[${index}]`;

      if (typeof candidate !== 'string') {
        addIssue(
          issues,
          'invalid_type',
          itemPath,
          'Expected a tool-permission string.',
        );
        return;
      }

      if (isProhibitedToolPermission(candidate)) {
        addIssue(
          issues,
          'prohibited_tool_permission',
          itemPath,
          `Prohibited tool ${candidate} cannot be allowed.`,
        );
        return;
      }

      if (!isAllowedToolPermission(candidate)) {
        addIssue(
          issues,
          'unknown_tool_permission',
          itemPath,
          'Unlisted tools are denied by default.',
        );
        return;
      }

      seen.push(candidate);
      allowed.push(candidate);

      if (
        roleId !== null &&
        !isToolAllowedForRole(roleId, candidate)
      ) {
        addIssue(
          issues,
          'tool_not_allowed_for_role',
          itemPath,
          `Tool ${candidate} is not allowed for ${roleId}.`,
        );
      }
    });

    if (hasDuplicates(seen)) {
      addIssue(
        issues,
        'invalid_value',
        `${path}.allowed`,
        'Duplicate allowed tools are not permitted.',
      );
    }
  }

  if (!Array.isArray(value.prohibited)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.prohibited`,
      'Expected a prohibited-tool array.',
    );
  } else {
    const prohibitedSeen: string[] = [];

    value.prohibited.forEach((candidate, index) => {
      const itemPath = `${path}.prohibited[${index}]`;

      if (
        typeof candidate !== 'string' ||
        !isProhibitedToolPermission(candidate)
      ) {
        addIssue(
          issues,
          'unknown_tool_permission',
          itemPath,
          'The prohibited list may contain only the closed prohibited vocabulary.',
        );
        return;
      }

      prohibitedSeen.push(candidate);
    });

    if (hasDuplicates(prohibitedSeen)) {
      addIssue(
        issues,
        'invalid_value',
        `${path}.prohibited`,
        'Duplicate prohibited tools are not permitted.',
      );
    }

    for (const required of PROHIBITED_TOOL_PERMISSIONS) {
      if (!prohibitedSeen.includes(required)) {
        addIssue(
          issues,
          'prohibited_tool_permission',
          `${path}.prohibited`,
          `Required prohibition is missing: ${required}.`,
        );
      }
    }
  }

  if (!Array.isArray(value.approvalRequired)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.approvalRequired`,
      'Expected an approval-required tool array.',
    );
  } else {
    const approvalSeen: string[] = [];

    value.approvalRequired.forEach((candidate, index) => {
      const itemPath =
        `${path}.approvalRequired[${index}]`;

      if (
        typeof candidate !== 'string' ||
        !isAllowedToolPermission(candidate)
      ) {
        addIssue(
          issues,
          'unknown_tool_permission',
          itemPath,
          'Approval-required tools must come from the allowed vocabulary.',
        );
        return;
      }

      approvalSeen.push(candidate);

      if (!allowed.includes(candidate)) {
        addIssue(
          issues,
          'invalid_value',
          itemPath,
          'An approval-required tool must also be in the allowed list.',
        );
      }
    });

    if (hasDuplicates(approvalSeen)) {
      addIssue(
        issues,
        'invalid_value',
        `${path}.approvalRequired`,
        'Duplicate approval-required tools are not permitted.',
      );
    }
  }

  return value as unknown as ToolPermissionPolicy;
}

function validateLimits(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
): RegistryLimits | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a limits object.',
    );
    return null;
  }

  validateExactKeys(
    value,
    LIMIT_KEYS,
    LIMIT_KEYS,
    path,
    issues,
  );

  for (const key of LIMIT_KEYS) {
    validateFiniteNonnegativeInteger(
      value[key],
      `${path}.${key}`,
      issues,
      { positive: true },
    );
  }

  if (
    typeof value.targetP95LatencyMs === 'number' &&
    typeof value.hardTimeoutMs === 'number' &&
    value.targetP95LatencyMs > value.hardTimeoutMs
  ) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.targetP95LatencyMs`,
      'Target p95 latency cannot exceed the hard timeout.',
    );
  }

  if (
    typeof value.maximumEstimatedCostMicrosPerRun === 'number' &&
    typeof value.maximumEstimatedCostMicrosPerDay === 'number' &&
    value.maximumEstimatedCostMicrosPerRun >
      value.maximumEstimatedCostMicrosPerDay
  ) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.maximumEstimatedCostMicrosPerRun`,
      'Per-run cost cannot exceed the daily cost limit.',
    );
  }

  return value as unknown as RegistryLimits;
}

function validateHumanApprovalPolicy(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a human-approval policy object.',
    );
    return;
  }

  validateExactKeys(
    value,
    HUMAN_APPROVAL_KEYS,
    HUMAN_APPROVAL_KEYS,
    path,
    issues,
  );

  validateBooleanLiteral(
    value.explicitHumanInitiationRequired,
    true,
    `${path}.explicitHumanInitiationRequired`,
    issues,
    'missing_human_initiation',
  );

  validateBooleanLiteral(
    value.founderApprovalRequired,
    true,
    `${path}.founderApprovalRequired`,
    issues,
    'missing_founder_approval',
  );

  if (value.outputDisposition !== 'draft_only') {
    addIssue(
      issues,
      'invalid_value',
      `${path}.outputDisposition`,
      'Executive-agent output must remain draft-only.',
    );
  }

  validateBooleanLiteral(
    value.noApprovalBySilence,
    true,
    `${path}.noApprovalBySilence`,
    issues,
    'missing_founder_approval',
  );
}

function validateSubstitutionPolicy(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a provider-substitution policy object.',
    );
    return;
  }

  validateExactKeys(
    value,
    SUBSTITUTION_POLICY_KEYS,
    SUBSTITUTION_POLICY_KEYS,
    path,
    issues,
  );

  if (
    value.mode !==
    'prohibited_without_founder_approval'
  ) {
    addIssue(
      issues,
      'automatic_provider_substitution',
      `${path}.mode`,
      'Provider substitution must remain Founder-gated.',
    );
  }

  validateBooleanLiteral(
    value.allowAutomaticPrimaryToFallback,
    false,
    `${path}.allowAutomaticPrimaryToFallback`,
    issues,
    'automatic_fallback',
  );

  validateBooleanLiteral(
    value.allowAutomaticProviderChange,
    false,
    `${path}.allowAutomaticProviderChange`,
    issues,
    'automatic_provider_substitution',
  );

  validateBooleanLiteral(
    value.requireEquivalentOrStricterLimits,
    true,
    `${path}.requireEquivalentOrStricterLimits`,
    issues,
    'fallback_authority_expansion',
  );

  validateBooleanLiteral(
    value.requireSameTaskAndToolBoundary,
    true,
    `${path}.requireSameTaskAndToolBoundary`,
    issues,
    'fallback_authority_expansion',
  );

  validateBooleanLiteral(
    value.requireAuditReason,
    true,
    `${path}.requireAuditReason`,
    issues,
  );

  validateBooleanLiteral(
    value.requireFounderApproval,
    true,
    `${path}.requireFounderApproval`,
    issues,
    'missing_founder_approval',
  );
}

export function validateRuntimeModelRegistryEntry(
  input: unknown,
): RegistryValidationResult<RuntimeModelRegistryEntry> {
  const issues: RegistryValidationIssue[] = [];

  if (!isRecord(input)) {
    addIssue(
      issues,
      'invalid_type',
      'registryEntry',
      'Expected a registry-entry object.',
    );

    return {
      ok: false,
      value: null,
      issues,
    };
  }

  validateExactKeys(
    input,
    REGISTRY_ENTRY_KEYS,
    REGISTRY_ENTRY_KEYS,
    'registryEntry',
    issues,
  );

  let roleId: ExecutiveRoleId | null = null;

  if (
    typeof input.roleId !== 'string' ||
    !isExecutiveRoleId(input.roleId)
  ) {
    addIssue(
      issues,
      'unknown_role_id',
      'registryEntry.roleId',
      'Only the three approved executive role IDs are permitted.',
    );
  } else {
    roleId = input.roleId;
  }

  validateBoundedString(
    input.registryVersion,
    'registryEntry.registryVersion',
    issues,
    { issueCode: 'missing_registry_version' },
  );

  validateBoundedString(
    input.charterVersion,
    'registryEntry.charterVersion',
    issues,
    { issueCode: 'missing_charter_version' },
  );

  if (!includesLiteral(REGISTRY_STATUSES, input.status)) {
    addIssue(
      issues,
      'invalid_value',
      'registryEntry.status',
      'Unknown registry status.',
    );
  }

  const primary = validateAssignment(
    input.primaryModel,
    'primary',
    'registryEntry.primaryModel',
    issues,
  );

  const challenger = validateAssignment(
    input.challengerModel,
    'challenger',
    'registryEntry.challengerModel',
    issues,
  );

  let fallback: ModelAssignment | null = null;

  if (input.fallbackModel !== null) {
    fallback = validateAssignment(
      input.fallbackModel,
      'fallback',
      'registryEntry.fallbackModel',
      issues,
    );
  }

  validateTaskClasses(
    input.allowedTaskClasses,
    roleId,
    'registryEntry.allowedTaskClasses',
    issues,
  );

  validateToolPolicy(
    input.toolPermissions,
    roleId,
    'registryEntry.toolPermissions',
    issues,
  );

  if (!includesLiteral(REASONING_LEVELS, input.reasoningLevel)) {
    addIssue(
      issues,
      'invalid_value',
      'registryEntry.reasoningLevel',
      'Unknown reasoning level.',
    );
  }

  validateLimits(
    input.limits,
    'registryEntry.limits',
    issues,
  );

  validateHumanApprovalPolicy(
    input.humanApprovalRequirements,
    'registryEntry.humanApprovalRequirements',
    issues,
  );

  validateSubstitutionPolicy(
    input.providerSubstitutionPolicy,
    'registryEntry.providerSubstitutionPolicy',
    issues,
  );

  if (!Array.isArray(input.environmentEligibility)) {
    addIssue(
      issues,
      'invalid_type',
      'registryEntry.environmentEligibility',
      'Expected an environment-eligibility array.',
    );
  } else {
    if (
      input.environmentEligibility.length !== 1 ||
      input.environmentEligibility[0] !== 'preview'
    ) {
      const includesProduction =
        input.environmentEligibility.includes('production');

      addIssue(
        issues,
        includesProduction
          ? 'production_prohibited'
          : 'non_preview_environment',
        'registryEntry.environmentEligibility',
        'Preview is the only eligible execution environment.',
      );
    }
  }

  const approvalReferenceValid = validateBoundedString(
    input.roleApprovalReference,
    'registryEntry.roleApprovalReference',
    issues,
    {
      maximumLength: MAX_REFERENCE_LENGTH,
      issueCode: 'missing_role_approval_reference',
    },
  );

  const enabledAssignments = [
    primary,
    challenger,
    fallback,
  ].filter(
    (assignment): assignment is ModelAssignment =>
      assignment !== null && assignment.enabled,
  );

  if (
    enabledAssignments.length > 0 &&
    !approvalReferenceValid
  ) {
    addIssue(
      issues,
      'missing_founder_approval',
      'registryEntry.roleApprovalReference',
      'Enabled assignments require an explicit Founder approval reference.',
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value: input as unknown as RuntimeModelRegistryEntry,
    issues: [],
  };
}

function validateRequestedUsage(
  value: unknown,
  limits: RegistryLimits | null,
  path: string,
  issues: RegistryValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a requested-usage object.',
    );
    return;
  }

  validateExactKeys(
    value,
    USAGE_KEYS,
    USAGE_KEYS,
    path,
    issues,
  );

  for (const key of USAGE_KEYS) {
    validateFiniteNonnegativeInteger(
      value[key],
      `${path}.${key}`,
      issues,
    );
  }

  if (limits === null) {
    return;
  }

  const comparisons: Array<{
    key: keyof typeof value;
    limit: number;
    message: string;
  }> = [
    {
      key: 'inputTokens',
      limit: limits.maximumInputTokens,
      message: 'Input-token limit exceeded.',
    },
    {
      key: 'outputTokens',
      limit: limits.maximumOutputTokens,
      message: 'Output-token limit exceeded.',
    },
    {
      key: 'estimatedCostMicros',
      limit: limits.maximumEstimatedCostMicrosPerRun,
      message: 'Per-run cost limit exceeded.',
    },
    {
      key: 'estimatedDailyCostMicrosAfterRun',
      limit: limits.maximumEstimatedCostMicrosPerDay,
      message: 'Projected daily cost limit exceeded.',
    },
    {
      key: 'elapsedLatencyMs',
      limit: limits.targetP95LatencyMs,
      message: 'Latency limit exceeded.',
    },
    {
      key: 'requestedTimeoutMs',
      limit: limits.hardTimeoutMs,
      message: 'Hard-timeout limit exceeded.',
    },
  ];

  for (const comparison of comparisons) {
    const candidate = value[comparison.key];

    if (
      typeof candidate === 'number' &&
      candidate > comparison.limit
    ) {
      addIssue(
        issues,
        'limit_bypass',
        `${path}.${String(comparison.key)}`,
        comparison.message,
      );
    }
  }
}

function validateDisagreement(
  value: unknown,
  path: string,
  issues: RegistryValidationIssue[],
): DisagreementRecord | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a disagreement object.',
    );
    return null;
  }

  validateExactKeys(
    value,
    DISAGREEMENT_KEYS,
    DISAGREEMENT_KEYS,
    path,
    issues,
  );

  validateBoundedString(
    value.issue,
    `${path}.issue`,
    issues,
    { maximumLength: MAX_FREE_TEXT_LENGTH },
  );

  validateBoundedStringArray(
    value.positions,
    `${path}.positions`,
    issues,
    {
      minimumItems: 2,
      maximumItems: 20,
      maximumItemLength: MAX_FREE_TEXT_LENGTH,
    },
  );

  validateBoundedStringArray(
    value.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    value.unknowns,
    `${path}.unknowns`,
    issues,
    {
      maximumItemLength: MAX_FREE_TEXT_LENGTH,
    },
  );

  if (
    value.decisionOwner !== 'founder' &&
    value.decisionOwner !== 'human_reviewer'
  ) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.decisionOwner`,
      'Unknown human decision owner.',
    );
  }

  if (typeof value.founderDecisionRequired !== 'boolean') {
    addIssue(
      issues,
      'invalid_type',
      `${path}.founderDecisionRequired`,
      'Expected a boolean.',
    );
  }

  return value as unknown as DisagreementRecord;
}

function validateToolAuditRecord(
  value: unknown,
  entry: RuntimeModelRegistryEntry,
  path: string,
  issues: RegistryValidationIssue[],
): ToolAuditRecord | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected a tool-audit record.',
    );
    return null;
  }

  validateExactKeys(
    value,
    TOOL_AUDIT_KEYS,
    TOOL_AUDIT_KEYS,
    path,
    issues,
  );

  if (
    typeof value.permission !== 'string' ||
    !isToolPermission(value.permission)
  ) {
    addIssue(
      issues,
      'unknown_tool_permission',
      `${path}.permission`,
      'Unknown tool permission.',
    );
  } else if (
    isProhibitedToolPermission(value.permission) &&
    value.status !== 'denied'
  ) {
    addIssue(
      issues,
      'prohibited_tool_permission',
      `${path}.status`,
      'A prohibited tool may appear in audit metadata only as denied.',
    );
  } else if (
    isAllowedToolPermission(value.permission) &&
    !entry.toolPermissions.allowed.includes(value.permission) &&
    value.status !== 'denied'
  ) {
    addIssue(
      issues,
      'tool_not_allowed_for_role',
      `${path}.permission`,
      'A tool outside the effective allowlist must be denied.',
    );
  }

  if (!includesLiteral(TOOL_CALL_STATUSES, value.status)) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.status`,
      'Unknown tool-call status.',
    );
  }

  if (
    value.reasonClass !== null &&
    !validateBoundedString(
      value.reasonClass,
      `${path}.reasonClass`,
      issues,
    )
  ) {
    return null;
  }

  return value as unknown as ToolAuditRecord;
}

function selectedAssignment(
  entry: RuntimeModelRegistryEntry,
  slot: ModelAssignmentUse,
): ModelAssignment | null {
  if (slot === 'primary') {
    return entry.primaryModel;
  }

  if (slot === 'challenger') {
    return entry.challengerModel;
  }

  return entry.fallbackModel;
}

function validateAuditMetadata(
  value: unknown,
  entry: RuntimeModelRegistryEntry,
  request: UnknownRecord,
  path: string,
  issues: RegistryValidationIssue[],
): RegistryAuditMetadata | null {
  if (!isRecord(value)) {
    addIssue(
      issues,
      'invalid_type',
      path,
      'Expected bounded audit metadata.',
    );
    return null;
  }

  validateExactKeys(
    value,
    AUDIT_KEYS,
    AUDIT_KEYS,
    path,
    issues,
  );

  const boundedIdentifiers = [
    'runId',
    'registryVersion',
    'charterVersion',
    'registryEntryHash',
    'sourceCommitSha',
    'requestedBy',
    'approvalReference',
    'providerId',
    'modelId',
    'pinnedModelVersion',
    'adapterId',
    'startedAt',
  ] as const;

  for (const key of boundedIdentifiers) {
    validateBoundedString(
      value[key],
      `${path}.${key}`,
      issues,
      {
        maximumLength:
          key === 'sourceCommitSha'
            ? 128
            : MAX_REFERENCE_LENGTH,
      },
    );
  }

  if (
    value.completedAt !== null &&
    !validateBoundedString(
      value.completedAt,
      `${path}.completedAt`,
      issues,
      { maximumLength: MAX_REFERENCE_LENGTH },
    )
  ) {
    addIssue(
      issues,
      'invalid_audit_metadata',
      `${path}.completedAt`,
      'Completion time must be null or a bounded string.',
    );
  }

  if (
    typeof value.roleId !== 'string' ||
    !isExecutiveRoleId(value.roleId)
  ) {
    addIssue(
      issues,
      'unknown_role_id',
      `${path}.roleId`,
      'Unknown audit role ID.',
    );
  }

  if (value.environment !== 'preview') {
    addIssue(
      issues,
      value.environment === 'production'
        ? 'production_prohibited'
        : 'non_preview_environment',
      `${path}.environment`,
      'Audit environment must be Preview.',
    );
  }

  if (
    typeof value.taskClass !== 'string' ||
    !isTaskClass(value.taskClass)
  ) {
    addIssue(
      issues,
      'unknown_task_class',
      `${path}.taskClass`,
      'Unknown audit task class.',
    );
  }

  if (!includesLiteral(MODEL_ASSIGNMENT_USES, value.modelSlot)) {
    addIssue(
      issues,
      'invalid_assignment_slot',
      `${path}.modelSlot`,
      'Unknown model slot.',
    );
  }

  if (!includesLiteral(REASONING_LEVELS, value.reasoningLevel)) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.reasoningLevel`,
      'Unknown reasoning level.',
    );
  }

  if (!Array.isArray(value.effectiveToolPermissions)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.effectiveToolPermissions`,
      'Expected an effective-tool array.',
    );
  } else {
    value.effectiveToolPermissions.forEach(
      (candidate, index) => {
        const itemPath =
          `${path}.effectiveToolPermissions[${index}]`;

        if (
          typeof candidate !== 'string' ||
          !isAllowedToolPermission(candidate)
        ) {
          addIssue(
            issues,
            'unknown_tool_permission',
            itemPath,
            'Unknown effective tool.',
          );
        } else if (
          !entry.toolPermissions.allowed.includes(candidate) ||
          !isToolAllowedForRole(entry.roleId, candidate)
        ) {
          addIssue(
            issues,
            'tool_not_allowed_for_role',
            itemPath,
            'Effective tool exceeds the approved role boundary.',
          );
        }
      },
    );
  }

  if (!Array.isArray(value.toolCalls)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.toolCalls`,
      'Expected a bounded tool-call array.',
    );
  } else if (value.toolCalls.length > MAX_TOOL_CALLS) {
    addIssue(
      issues,
      'audit_metadata_unbounded',
      `${path}.toolCalls`,
      `Tool-call records exceed the ${MAX_TOOL_CALLS}-item bound.`,
    );
  } else {
    value.toolCalls.forEach((toolCall, index) => {
      validateToolAuditRecord(
        toolCall,
        entry,
        `${path}.toolCalls[${index}]`,
        issues,
      );
    });
  }

  if (value.substitutionRequested !== false) {
    addIssue(
      issues,
      'automatic_provider_substitution',
      `${path}.substitutionRequested`,
      'Automatic provider substitution is prohibited.',
    );
  }

  for (const key of [
    'substitutionReasonClass',
    'fallbackReasonClass',
  ] as const) {
    if (
      value[key] !== null &&
      !validateBoundedString(
        value[key],
        `${path}.${key}`,
        issues,
      )
    ) {
      addIssue(
        issues,
        'invalid_audit_metadata',
        `${path}.${key}`,
        'Reason class must be null or a bounded string.',
      );
    }
  }

  for (const key of [
    'latencyMs',
    'inputTokenCount',
    'outputTokenCount',
    'estimatedCostMicros',
  ] as const) {
    validateFiniteNonnegativeInteger(
      value[key],
      `${path}.${key}`,
      issues,
    );
  }

  validateBoundedStringArray(
    value.evidenceReferences,
    `${path}.evidenceReferences`,
    issues,
  );

  validateBoundedStringArray(
    value.unknownsRecorded,
    `${path}.unknownsRecorded`,
    issues,
    {
      maximumItemLength: MAX_FREE_TEXT_LENGTH,
    },
  );

  if (!Array.isArray(value.disagreements)) {
    addIssue(
      issues,
      'invalid_type',
      `${path}.disagreements`,
      'Expected a disagreement array.',
    );
  } else if (value.disagreements.length > MAX_DISAGREEMENTS) {
    addIssue(
      issues,
      'audit_metadata_unbounded',
      `${path}.disagreements`,
      `Disagreements exceed the ${MAX_DISAGREEMENTS}-item bound.`,
    );
  } else {
    value.disagreements.forEach((disagreement, index) => {
      validateDisagreement(
        disagreement,
        `${path}.disagreements[${index}]`,
        issues,
      );
    });
  }

  if (!includesLiteral(AGENT_RUN_OUTCOMES, value.outcome)) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.outcome`,
      'Unknown run outcome.',
    );
  }

  if (!includesLiteral(HUMAN_DISPOSITIONS, value.humanDisposition)) {
    addIssue(
      issues,
      'invalid_value',
      `${path}.humanDisposition`,
      'Unknown human disposition.',
    );
  }

  const mismatchChecks: Array<{
    actual: unknown;
    expected: unknown;
    field: string;
  }> = [
    {
      actual: value.roleId,
      expected: entry.roleId,
      field: 'roleId',
    },
    {
      actual: value.registryVersion,
      expected: entry.registryVersion,
      field: 'registryVersion',
    },
    {
      actual: value.charterVersion,
      expected: entry.charterVersion,
      field: 'charterVersion',
    },
    {
      actual: value.environment,
      expected: request.environment,
      field: 'environment',
    },
    {
      actual: value.approvalReference,
      expected: request.roleApprovalReference,
      field: 'approvalReference',
    },
    {
      actual: value.taskClass,
      expected: request.requestedTaskClass,
      field: 'taskClass',
    },
    {
      actual: value.reasoningLevel,
      expected: entry.reasoningLevel,
      field: 'reasoningLevel',
    },
  ];

  for (const check of mismatchChecks) {
    if (check.actual !== check.expected) {
      addIssue(
        issues,
        'audit_metadata_mismatch',
        `${path}.${check.field}`,
        'Audit metadata does not match the validated request.',
      );
    }
  }

  if (
    includesLiteral(MODEL_ASSIGNMENT_USES, value.modelSlot)
  ) {
    const assignment = selectedAssignment(
      entry,
      value.modelSlot as ModelAssignmentUse,
    );

    if (assignment === null) {
      addIssue(
        issues,
        'invalid_assignment_slot',
        `${path}.modelSlot`,
        'Selected model slot has no assignment.',
      );
    } else if (!assignment.enabled) {
      addIssue(
        issues,
        'assignment_disabled',
        `${path}.modelSlot`,
        'Selected model assignment is disabled.',
      );
    } else {
      const assignmentChecks: Array<{
        field:
          | 'providerId'
          | 'modelId'
          | 'pinnedModelVersion'
          | 'adapterId';
        expected: string;
      }> = [
        {
          field: 'providerId',
          expected: assignment.providerId,
        },
        {
          field: 'modelId',
          expected: assignment.modelId,
        },
        {
          field: 'pinnedModelVersion',
          expected: assignment.pinnedModelVersion,
        },
        {
          field: 'adapterId',
          expected: assignment.adapterId,
        },
      ];

      for (const check of assignmentChecks) {
        if (value[check.field] !== check.expected) {
          addIssue(
            issues,
            'audit_metadata_mismatch',
            `${path}.${check.field}`,
            'Audit model metadata does not match the selected assignment.',
          );
        }
      }
    }
  }

  return value as unknown as RegistryAuditMetadata;
}

export function validateExecutiveAgentRunRequest(
  input: unknown,
): RegistryValidationResult<ExecutiveAgentRunRequest> {
  const issues: RegistryValidationIssue[] = [];

  if (!isRecord(input)) {
    addIssue(
      issues,
      'invalid_type',
      'runRequest',
      'Expected a run-request object.',
    );

    return {
      ok: false,
      value: null,
      issues,
    };
  }

  validateExactKeys(
    input,
    RUN_REQUEST_KEYS,
    RUN_REQUEST_KEYS,
    'runRequest',
    issues,
  );

  const entryResult =
    validateRuntimeModelRegistryEntry(input.registryEntry);

  if (!entryResult.ok) {
    issues.push(...entryResult.issues);
  }

  const entry = entryResult.ok
    ? entryResult.value
    : null;

  if (
    entry !== null &&
    entry.status !== 'preview_approved'
  ) {
    addIssue(
      issues,
      'registry_not_preview_approved',
      'runRequest.registryEntry.status',
      'Only a preview_approved registry entry may be used for execution.',
    );
  }

  if (input.environment !== 'preview') {
    addIssue(
      issues,
      input.environment === 'production'
        ? 'production_prohibited'
        : 'non_preview_environment',
      'runRequest.environment',
      'Executive-agent execution is eligible only in Preview.',
    );
  }

  validateBooleanLiteral(
    input.explicitHumanInitiation,
    true,
    'runRequest.explicitHumanInitiation',
    issues,
    'missing_human_initiation',
  );

  validateBoundedString(
    input.roleApprovalReference,
    'runRequest.roleApprovalReference',
    issues,
    {
      maximumLength: MAX_REFERENCE_LENGTH,
      issueCode: 'missing_role_approval_reference',
    },
  );

  if (
    entry !== null &&
    input.roleApprovalReference !==
      entry.roleApprovalReference
  ) {
    addIssue(
      issues,
      'role_approval_reference_mismatch',
      'runRequest.roleApprovalReference',
      'Run approval reference must match the approved role entry.',
    );
  }

  let requestedTask: TaskClass | null = null;

  if (
    typeof input.requestedTaskClass !== 'string' ||
    !isTaskClass(input.requestedTaskClass)
  ) {
    addIssue(
      issues,
      'unknown_task_class',
      'runRequest.requestedTaskClass',
      'Unknown task classes are denied by default.',
    );
  } else {
    requestedTask = input.requestedTaskClass;

    if (
      entry !== null &&
      (
        !entry.allowedTaskClasses.includes(requestedTask) ||
        !isTaskAllowedForRole(entry.roleId, requestedTask)
      )
    ) {
      addIssue(
        issues,
        'task_not_allowed_for_role',
        'runRequest.requestedTaskClass',
        'Requested task exceeds the role-specific task boundary.',
      );
    }
  }

  if (!Array.isArray(input.requestedTools)) {
    addIssue(
      issues,
      'invalid_type',
      'runRequest.requestedTools',
      'Expected a requested-tool array.',
    );
  } else {
    input.requestedTools.forEach((candidate, index) => {
      const path = `runRequest.requestedTools[${index}]`;

      if (typeof candidate !== 'string') {
        addIssue(
          issues,
          'invalid_type',
          path,
          'Expected a tool-permission string.',
        );
      } else if (isProhibitedToolPermission(candidate)) {
        addIssue(
          issues,
          'prohibited_tool_permission',
          path,
          `Prohibited tool ${candidate} cannot be requested.`,
        );
      } else if (!isAllowedToolPermission(candidate)) {
        addIssue(
          issues,
          'unknown_tool_permission',
          path,
          'Unlisted tools are denied by default.',
        );
      } else if (
        entry !== null &&
        (
          !entry.toolPermissions.allowed.includes(candidate) ||
          !isToolAllowedForRole(entry.roleId, candidate)
        )
      ) {
        addIssue(
          issues,
          'tool_not_allowed_for_role',
          path,
          'Requested tool exceeds the role-specific tool boundary.',
        );
      }
    });
  }

  if (!Array.isArray(input.requestedAuthorityCategories)) {
    addIssue(
      issues,
      'invalid_type',
      'runRequest.requestedAuthorityCategories',
      'Expected an authority-category array.',
    );
  } else {
    input.requestedAuthorityCategories.forEach(
      (candidate, index) => {
        const path =
          `runRequest.requestedAuthorityCategories[${index}]`;

        if (
          typeof candidate !== 'string' ||
          !AUTHORITY_CATEGORIES.includes(
            candidate as (typeof AUTHORITY_CATEGORIES)[number],
          )
        ) {
          addIssue(
            issues,
            'prohibited_authority',
            path,
            'Unknown authority categories are denied.',
          );
        } else if (
          PROHIBITED_AUTHORITY_CATEGORIES.includes(
            candidate as
              (typeof PROHIBITED_AUTHORITY_CATEGORIES)[number],
          )
        ) {
          addIssue(
            issues,
            candidate === 'role_self_expansion'
              ? 'role_self_expansion'
              : 'prohibited_authority',
            path,
            `Authority category ${candidate} is prohibited.`,
          );
        }
      },
    );
  }

  validateBooleanLiteral(
    input.authorityExpansionRequested,
    false,
    'runRequest.authorityExpansionRequested',
    issues,
    'role_self_expansion',
  );

  validateBooleanLiteral(
    input.disagreementPreservationRequired,
    true,
    'runRequest.disagreementPreservationRequired',
    issues,
    'disagreement_preservation_required',
  );

  validateBooleanLiteral(
    input.uncertaintyPreservationRequired,
    true,
    'runRequest.uncertaintyPreservationRequired',
    issues,
    'uncertainty_preservation_required',
  );

  if (!includesLiteral(EVIDENCE_STATES, input.evidenceState)) {
    addIssue(
      issues,
      'invalid_value',
      'runRequest.evidenceState',
      'Unknown evidence state.',
    );
  }

  const limits =
    entry === null ? null : entry.limits;

  validateRequestedUsage(
    input.requestedUsage,
    limits,
    'runRequest.requestedUsage',
    issues,
  );

  if (entry !== null) {
    const audit = validateAuditMetadata(
      input.auditMetadata,
      entry,
      input,
      'runRequest.auditMetadata',
      issues,
    );

    if (
      audit !== null &&
      (
        input.evidenceState === 'incomplete' ||
        input.evidenceState === 'unknown'
      ) &&
      audit.outcome !== 'escalation_required'
    ) {
      addIssue(
        issues,
        'evidence_escalation_required',
        'runRequest.auditMetadata.outcome',
        'Incomplete or unknown evidence requires escalation.',
      );
    }

    if (
      audit !== null &&
      requestedTask !== null &&
      audit.taskClass !== requestedTask
    ) {
      addIssue(
        issues,
        'audit_metadata_mismatch',
        'runRequest.auditMetadata.taskClass',
        'Audit task class does not match the requested task.',
      );
    }
  } else if (!isRecord(input.auditMetadata)) {
    addIssue(
      issues,
      'invalid_audit_metadata',
      'runRequest.auditMetadata',
      'Expected bounded audit metadata.',
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value: input as unknown as ExecutiveAgentRunRequest,
    issues: [],
  };
}

export function assertValidRuntimeModelRegistryEntry(
  input: unknown,
): RuntimeModelRegistryEntry {
  const result = validateRuntimeModelRegistryEntry(input);

  if (!result.ok) {
    throw new RegistryValidationError(result.issues);
  }

  return result.value;
}

export function assertValidExecutiveAgentRunRequest(
  input: unknown,
): ExecutiveAgentRunRequest {
  const result = validateExecutiveAgentRunRequest(input);

  if (!result.ok) {
    throw new RegistryValidationError(result.issues);
  }

  return result.value;
}

export class RegistryValidationError extends Error {
  readonly issues: readonly RegistryValidationIssue[];

  constructor(issues: readonly RegistryValidationIssue[]) {
    super('Executive-agent registry validation failed.');
    this.name = 'RegistryValidationError';
    this.issues = issues;
  }
}

export const CLOSED_EXECUTIVE_ROLE_IDS =
  EXECUTIVE_ROLE_IDS;

export const CLOSED_TASK_CLASSES =
  TASK_CLASSES;

export const CLOSED_ALLOWED_TOOL_PERMISSIONS =
  ALLOWED_TOOL_PERMISSIONS;

export const CLOSED_PROHIBITED_TOOL_PERMISSIONS =
  PROHIBITED_TOOL_PERMISSIONS;

export const ROLE_TASK_BOUNDARIES =
  ROLE_ALLOWED_TASK_CLASSES;

export const ROLE_TOOL_BOUNDARIES =
  ROLE_ALLOWED_TOOL_PERMISSIONS;
