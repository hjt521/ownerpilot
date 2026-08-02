/**
 * Pure fail-closed gate for restricted executive-agent Preview evaluation.
 *
 * This module reads no environment variables, performs no provider lookup or
 * model call, grants no tools, persists nothing, and cannot activate Preview
 * or Production. The caller must explicitly provide all gate inputs.
 */

import type {
  ExecutiveAgentRunRequest,
  ModelAssignment,
} from '../ai/modelRegistry';

import {
  validateExecutiveAgentRunRequest,
  type RegistryValidationIssue,
} from './registryValidator';

import {
  CAO_PREVIEW_REGISTRY_ENTRY,
} from './caoPreviewRegistry';

export const EXECUTIVE_AGENTS_PREVIEW_FLAG =
  'EXECUTIVE_AGENTS_PREVIEW_ENABLED' as const;

export const EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION =
  'executive-agents-preview-gate-v1' as const;

export const EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE =
  'true' as const;

export const EXECUTIVE_AGENTS_PREVIEW_GATE_ISSUE_CODES = [
  'preview_flag_disabled',
  'non_preview_environment',
  'production_prohibited',
  'invalid_run_request',
  'registry_entry_mismatch',
  'role_not_authorized',
  'task_not_authorized',
  'model_slot_not_authorized',
  'tool_use_prohibited',
  'authority_not_authorized',
] as const;

export type ExecutiveAgentsPreviewGateIssueCode =
  (
    typeof EXECUTIVE_AGENTS_PREVIEW_GATE_ISSUE_CODES
  )[number];

export interface ExecutiveAgentsPreviewGateInput {
  deploymentEnvironment: unknown;
  previewEnabledValue: unknown;
  runRequest: unknown;
}

export interface ExecutiveAgentsPreviewGateIssue {
  code: ExecutiveAgentsPreviewGateIssueCode;
  path: string;
  message: string;
}

export interface ExecutiveAgentsPreviewGateAcceptance {
  gateVersion:
    typeof EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION;
  deploymentEnvironment: 'preview';
  previewEnabled: true;
  runRequest: ExecutiveAgentRunRequest;
  modelSlot: 'primary';
  selectedAssignment: ModelAssignment;
  requestedTools: readonly [];
  effectiveToolPermissions: readonly [];
  toolCalls: readonly [];
  automaticFallbackAllowed: false;
  automaticProviderSubstitutionAllowed: false;
  productionEligible: false;
  persistenceAllowed: false;
  automaticContinuationAllowed: false;
}

export type ExecutiveAgentsPreviewGateResult =
  | {
      ok: true;
      value:
        ExecutiveAgentsPreviewGateAcceptance;
      issues: readonly [];
      registryValidationIssues: readonly [];
    }
  | {
      ok: false;
      value: null;
      issues:
        readonly ExecutiveAgentsPreviewGateIssue[];
      registryValidationIssues:
        readonly RegistryValidationIssue[];
    };

function gateIssue(
  code: ExecutiveAgentsPreviewGateIssueCode,
  path: string,
  message: string,
): ExecutiveAgentsPreviewGateIssue {
  return {
    code,
    path,
    message,
  };
}

function normalizeForComparison(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const record =
      value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map(key => [
          key,
          normalizeForComparison(
            record[key],
          ),
        ]),
    );
  }

  return value;
}

function structurallyEqual(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(
      normalizeForComparison(left),
    ) ===
    JSON.stringify(
      normalizeForComparison(right),
    )
  );
}

function isExactAdvisoryAuthority(
  request: ExecutiveAgentRunRequest,
): boolean {
  return (
    request.requestedAuthorityCategories
      .length === 1 &&
    request.requestedAuthorityCategories[0] ===
      'advisory_draft'
  );
}

export function evaluateExecutiveAgentsPreviewGate(
  input: ExecutiveAgentsPreviewGateInput,
): ExecutiveAgentsPreviewGateResult {
  const issues:
    ExecutiveAgentsPreviewGateIssue[] = [];

  if (
    input.deploymentEnvironment !==
    'preview'
  ) {
    issues.push(
      gateIssue(
        input.deploymentEnvironment ===
          'production'
          ? 'production_prohibited'
          : 'non_preview_environment',
        'deploymentEnvironment',
        'Executive-agent execution is restricted to the exact Preview environment.',
      ),
    );
  }

  if (
    input.previewEnabledValue !==
    EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE
  ) {
    issues.push(
      gateIssue(
        'preview_flag_disabled',
        EXECUTIVE_AGENTS_PREVIEW_FLAG,
        'The restricted Preview gate must be explicitly enabled with the exact value true.',
      ),
    );
  }

  const validation =
    validateExecutiveAgentRunRequest(
      input.runRequest,
    );

  if (!validation.ok) {
    issues.push(
      gateIssue(
        'invalid_run_request',
        'runRequest',
        'The proposed run request failed closed registry validation.',
      ),
    );

    return {
      ok: false,
      value: null,
      issues,
      registryValidationIssues:
        validation.issues,
    };
  }

  const request = validation.value;

  if (
    !structurallyEqual(
      request.registryEntry,
      CAO_PREVIEW_REGISTRY_ENTRY,
    )
  ) {
    issues.push(
      gateIssue(
        'registry_entry_mismatch',
        'runRequest.registryEntry',
        'The run must use the exact currently approved CAO Preview registry entry.',
      ),
    );
  }

  if (
    request.registryEntry.roleId !==
    'executive.chief_architecture_officer'
  ) {
    issues.push(
      gateIssue(
        'role_not_authorized',
        'runRequest.registryEntry.roleId',
        'Only the Chief Architecture Officer is authorized in this initial Preview slice.',
      ),
    );
  }

  if (
    request.requestedTaskClass !==
      'architecture_analysis' &&
    request.requestedTaskClass !==
      'evaluation_only'
  ) {
    issues.push(
      gateIssue(
        'task_not_authorized',
        'runRequest.requestedTaskClass',
        'Only architecture analysis and evaluation-only tasks are authorized.',
      ),
    );
  }

  if (
    request.auditMetadata.modelSlot !==
    'primary'
  ) {
    issues.push(
      gateIssue(
        'model_slot_not_authorized',
        'runRequest.auditMetadata.modelSlot',
        'Only the enabled pinned primary slot is authorized in this slice.',
      ),
    );
  }

  if (
    request.requestedTools.length !== 0 ||
    request.auditMetadata
      .effectiveToolPermissions.length !==
      0 ||
    request.auditMetadata.toolCalls.length !==
      0
  ) {
    issues.push(
      gateIssue(
        'tool_use_prohibited',
        'runRequest',
        'Requested tools, effective tools, and tool calls must all remain empty.',
      ),
    );
  }

  if (!isExactAdvisoryAuthority(request)) {
    issues.push(
      gateIssue(
        'authority_not_authorized',
        'runRequest.requestedAuthorityCategories',
        'The only permitted authority category is advisory_draft.',
      ),
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
      registryValidationIssues: [],
    };
  }

  return {
    ok: true,
    value: {
      gateVersion:
        EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION,
      deploymentEnvironment: 'preview',
      previewEnabled: true,
      runRequest: request,
      modelSlot: 'primary',
      selectedAssignment:
        request.registryEntry.primaryModel,
      requestedTools: [],
      effectiveToolPermissions: [],
      toolCalls: [],
      automaticFallbackAllowed: false,
      automaticProviderSubstitutionAllowed:
        false,
      productionEligible: false,
      persistenceAllowed: false,
      automaticContinuationAllowed: false,
    },
    issues: [],
    registryValidationIssues: [],
  };
}
