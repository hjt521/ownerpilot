import type {
  ExecutiveAgentRunRequest,
} from '../ai/modelRegistry';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
  CAO_PREVIEW_REGISTRY_ENTRY,
  CAO_PREVIEW_REGISTRY_VERSION,
} from './caoPreviewRegistry';

import {
  EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE,
  EXECUTIVE_AGENTS_PREVIEW_FLAG,
  EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION,
  evaluateExecutiveAgentsPreviewGate,
  type ExecutiveAgentsPreviewGateResult,
} from './executiveAgentsPreviewGate';

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
  detail = '',
): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
    return;
  }

  failed += 1;
  console.log(
    `  ✗ ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

function clone<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function validRun():
ExecutiveAgentRunRequest {
  const entry = clone(
    CAO_PREVIEW_REGISTRY_ENTRY,
  );

  return {
    registryEntry: entry,
    environment: 'preview',
    explicitHumanInitiation: true,
    roleApprovalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    requestedTaskClass:
      'architecture_analysis',
    requestedTools: [],
    requestedAuthorityCategories: [
      'advisory_draft',
    ],
    authorityExpansionRequested: false,
    disagreementPreservationRequired: true,
    uncertaintyPreservationRequired: true,
    evidenceState: 'complete',
    requestedUsage: {
      inputTokens: 2_000,
      outputTokens: 1_000,
      estimatedCostMicros: 20_000,
      estimatedDailyCostMicrosAfterRun:
        20_000,
      elapsedLatencyMs: 5_000,
      requestedTimeoutMs: 60_000,
    },
    auditMetadata: {
      runId:
        'synthetic-cao-gate-run-0001',
      roleId:
        'executive.chief_architecture_officer',
      registryVersion:
        CAO_PREVIEW_REGISTRY_VERSION,
      charterVersion:
        entry.charterVersion,
      registryEntryHash:
        'synthetic-cao-preview-entry-hash',
      environment: 'preview',
      sourceCommitSha:
        '0000000000000000000000000000000000000000',
      requestedBy:
        'synthetic-founder',
      approvalReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
      taskClass:
        'architecture_analysis',
      modelSlot: 'primary',
      providerId:
        CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      modelId:
        CAO_PREVIEW_PRIMARY_MODEL_ID,
      pinnedModelVersion:
        CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
      adapterId:
        CAO_PREVIEW_ADAPTER_ID,
      reasoningLevel: 'standard',
      effectiveToolPermissions: [],
      toolCalls: [],
      substitutionRequested: false,
      substitutionReasonClass: null,
      fallbackReasonClass: null,
      startedAt:
        '2026-08-02T00:00:00.000Z',
      completedAt:
        '2026-08-02T00:00:05.000Z',
      latencyMs: 5_000,
      inputTokenCount: 2_000,
      outputTokenCount: 1_000,
      estimatedCostMicros: 20_000,
      evidenceReferences: [
        'synthetic-cao-evidence-001',
      ],
      unknownsRecorded: [],
      disagreements: [],
      outcome: 'draft_completed',
      humanDisposition: 'pending',
    },
  };
}

function evaluate(
  runRequest: unknown = validRun(),
  deploymentEnvironment: unknown =
    'preview',
  previewEnabledValue: unknown =
    'true',
): ExecutiveAgentsPreviewGateResult {
  return evaluateExecutiveAgentsPreviewGate({
    deploymentEnvironment,
    previewEnabledValue,
    runRequest,
  });
}

function hasGateIssue(
  result: ExecutiveAgentsPreviewGateResult,
  code: string,
): boolean {
  return (
    !result.ok &&
    result.issues.some(
      issue => issue.code === code,
    )
  );
}

function hasRegistryIssue(
  result: ExecutiveAgentsPreviewGateResult,
  code: string,
): boolean {
  return (
    !result.ok &&
    result.registryValidationIssues.some(
      issue => issue.code === code,
    )
  );
}

console.log(
  '\nExecutive-agent restricted Preview gate',
);

{
  const result = evaluate();

  check(
    'valid CAO Preview request passes',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result),
  );

  check(
    'accepted gate metadata remains bounded and nonconsequential',
    result.ok &&
      result.value.gateVersion ===
        EXECUTIVE_AGENTS_PREVIEW_GATE_VERSION &&
      result.value.deploymentEnvironment ===
        'preview' &&
      result.value.previewEnabled === true &&
      result.value.modelSlot ===
        'primary' &&
      result.value.requestedTools.length ===
        0 &&
      result.value
        .effectiveToolPermissions.length ===
        0 &&
      result.value.toolCalls.length === 0 &&
      result.value
        .automaticFallbackAllowed ===
        false &&
      result.value
        .automaticProviderSubstitutionAllowed ===
        false &&
      result.value.productionEligible ===
        false &&
      result.value.persistenceAllowed ===
        false &&
      result.value
        .automaticContinuationAllowed ===
        false,
  );
}

for (const disabledValue of [
  undefined,
  '',
  'false',
  'TRUE',
  true,
] as const) {
  const result =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment: 'preview',
      previewEnabledValue:
        disabledValue,
      runRequest: validRun(),
    });

  check(
    `flag value ${String(disabledValue)} fails closed`,
    hasGateIssue(
      result,
      'preview_flag_disabled',
    ),
  );
}

check(
  'flag name is exact',
  EXECUTIVE_AGENTS_PREVIEW_FLAG ===
    'EXECUTIVE_AGENTS_PREVIEW_ENABLED' &&
    EXECUTIVE_AGENTS_PREVIEW_ENABLED_VALUE ===
      'true',
);

for (const environment of [
  undefined,
  '',
  'development',
  'test',
  'local',
  'unknown',
] as const) {
  const result =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment:
        environment,
      previewEnabledValue: 'true',
      runRequest: validRun(),
    });

  check(
    `environment ${String(environment)} is rejected`,
    hasGateIssue(
      result,
      'non_preview_environment',
    ),
  );
}

{
  const result = evaluate(
    validRun(),
    'production',
    'true',
  );

  check(
    'Production is rejected even when the flag is true',
    hasGateIssue(
      result,
      'production_prohibited',
    ),
  );
}

{
  const run = validRun();

  run.registryEntry.registryVersion =
    'stale-cao-preview-registry-v0';

  run.auditMetadata.registryVersion =
    run.registryEntry.registryVersion;

  const result = evaluate(run);

  check(
    'stale but otherwise valid registry entry is rejected',
    hasGateIssue(
      result,
      'registry_entry_mismatch',
    ),
  );
}

{
  const run = validRun();

  run.registryEntry.roleApprovalReference =
    'stale-founder-reference';

  run.roleApprovalReference =
    run.registryEntry.roleApprovalReference;

  run.auditMetadata.approvalReference =
    run.registryEntry.roleApprovalReference;

  const result = evaluate(run);

  check(
    'stale approval reference is rejected',
    hasGateIssue(
      result,
      'registry_entry_mismatch',
    ),
  );
}

{
  const run = validRun();

  (
    run as unknown as {
      explicitHumanInitiation: boolean;
    }
  ).explicitHumanInitiation = false;

  const result = evaluate(run);

  check(
    'missing explicit human initiation is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'missing_human_initiation',
      ),
  );
}

{
  const run = validRun();

  run.requestedTaskClass =
    'risk_register_draft';

  run.auditMetadata.taskClass =
    'risk_register_draft';

  const result = evaluate(run);

  check(
    'task outside the initial CAO slice is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'task_not_allowed_for_role',
      ),
  );
}

{
  const run = validRun();

  run.requestedTools = [
    'repository.read',
  ];

  const result = evaluate(run);

  check(
    'requested tool is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'tool_not_allowed_for_role',
      ),
  );
}

{
  const run = validRun();

  run.auditMetadata
    .effectiveToolPermissions = [
      'repository.read',
    ];

  const result = evaluate(run);

  check(
    'effective tool permission is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'tool_not_allowed_for_role',
      ),
  );
}

{
  const run = validRun();

  run.auditMetadata.toolCalls = [
    {
      permission:
        'repository.read',
      status: 'completed',
      reasonClass:
        'synthetic-prohibited-tool-use',
    },
  ];

  const result = evaluate(run);

  check(
    'tool call is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'tool_not_allowed_for_role',
      ),
  );
}

{
  const run = validRun();

  run.auditMetadata.modelSlot =
    'challenger';

  run.auditMetadata.providerId =
    run.registryEntry
      .challengerModel.providerId;

  run.auditMetadata.modelId =
    run.registryEntry
      .challengerModel.modelId;

  run.auditMetadata.pinnedModelVersion =
    run.registryEntry
      .challengerModel
      .pinnedModelVersion;

  run.auditMetadata.adapterId =
    run.registryEntry
      .challengerModel.adapterId;

  const result = evaluate(run);

  check(
    'disabled challenger slot is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'assignment_disabled',
      ),
  );
}

{
  const run = validRun();

  (
    run.auditMetadata as unknown as {
      modelSlot: string;
    }
  ).modelSlot = 'fallback';

  const result = evaluate(run);

  check(
    'fallback slot is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ),
  );
}

{
  const run = validRun();

  run.registryEntry.primaryModel.modelId =
    'openai/unauthorized-model-version';

  run.registryEntry.primaryModel
    .pinnedModelVersion =
    run.registryEntry.primaryModel.modelId;

  run.auditMetadata.modelId =
    run.registryEntry.primaryModel.modelId;

  run.auditMetadata.pinnedModelVersion =
    run.registryEntry.primaryModel
      .pinnedModelVersion;

  const result = evaluate(run);

  check(
    'mismatched executable model configuration is rejected',
    hasGateIssue(
      result,
      'registry_entry_mismatch',
    ),
  );
}

{
  const run = validRun();

  run.requestedAuthorityCategories = [
    'advisory_draft',
    'advisory_draft',
  ];

  const result = evaluate(run);

  check(
    'non-exact advisory authority set is rejected',
    hasGateIssue(
      result,
      'authority_not_authorized',
    ),
  );
}

{
  const run =
    clone(validRun()) as unknown as
      Record<string, unknown>;

  run.unexpectedGateBypass = true;

  const result = evaluate(run);

  check(
    'unknown run field is rejected',
    hasGateIssue(
      result,
      'invalid_run_request',
    ) &&
      hasRegistryIssue(
        result,
        'unknown_field',
      ),
  );
}

console.log(
  `\n${'-'.repeat(72)}\n` +
    `  ${passed} passed, ${failed} failed\n` +
    `${'-'.repeat(72)}`,
);

if (failed > 0) {
  process.exit(1);
}
