import {
  PROHIBITED_TOOL_PERMISSIONS,
  type ExecutiveAgentRunRequest,
  type RuntimeModelRegistryEntry,
} from '../ai/modelRegistry';

import {
  validateExecutiveAgentRunRequest,
  validateRuntimeModelRegistryEntry,
} from './registryValidator';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_ALLOWED_TASK_CLASSES,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
  CAO_PREVIEW_REGISTRY_ENTRY,
  CAO_PREVIEW_REGISTRY_VERSION,
  getCaoPreviewRegistryEntry,
} from './caoPreviewRegistry';

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

function cloneEntry():
RuntimeModelRegistryEntry {
  return JSON.parse(
    JSON.stringify(
      CAO_PREVIEW_REGISTRY_ENTRY,
    ),
  ) as RuntimeModelRegistryEntry;
}

function validCaoRun():
ExecutiveAgentRunRequest {
  const entry = cloneEntry();

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
        'synthetic-cao-preview-run-0001',
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

function hasIssue(
  result: ReturnType<
    typeof validateExecutiveAgentRunRequest
  >,
  code: string,
): boolean {
  return (
    !result.ok &&
    result.issues.some(
      issue => issue.code === code,
    )
  );
}

console.log(
  '\nCAO restricted Preview registry',
);

{
  const result =
    validateRuntimeModelRegistryEntry(
      CAO_PREVIEW_REGISTRY_ENTRY,
    );

  check(
    'registry entry passes fail-closed validation',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

check(
  'entry is limited to the Chief Architecture Officer',
  CAO_PREVIEW_REGISTRY_ENTRY.roleId ===
    'executive.chief_architecture_officer',
);

check(
  'entry has the exact approved Preview status and version',
  CAO_PREVIEW_REGISTRY_ENTRY.status ===
    'preview_approved' &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .registryVersion ===
      CAO_PREVIEW_REGISTRY_VERSION,
);

check(
  'primary model is explicit, pinned, and enabled',
  CAO_PREVIEW_REGISTRY_ENTRY
    .primaryModel.providerId ===
      CAO_PREVIEW_PRIMARY_PROVIDER_ID &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .primaryModel.modelId ===
      CAO_PREVIEW_PRIMARY_MODEL_ID &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .primaryModel.pinnedModelVersion ===
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .primaryModel.adapterId ===
      CAO_PREVIEW_ADAPTER_ID &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .primaryModel.enabled === true &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .primaryModel.intendedUse ===
      'primary',
);

check(
  'challenger remains disabled and fallback remains absent',
  CAO_PREVIEW_REGISTRY_ENTRY
    .challengerModel.enabled === false &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .fallbackModel === null,
);

check(
  'task scope contains only architecture analysis and evaluation',
  CAO_PREVIEW_REGISTRY_ENTRY
    .allowedTaskClasses.length === 2 &&
    CAO_PREVIEW_ALLOWED_TASK_CLASSES.every(
      task =>
        CAO_PREVIEW_REGISTRY_ENTRY
          .allowedTaskClasses.includes(task),
    ),
);

check(
  'runtime tool posture is exactly empty',
  CAO_PREVIEW_REGISTRY_ENTRY
    .toolPermissions.allowed.length === 0 &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .toolPermissions
      .approvalRequired.length === 0,
);

check(
  'closed prohibited-tool vocabulary remains complete',
  CAO_PREVIEW_REGISTRY_ENTRY
    .toolPermissions.prohibited.length ===
      PROHIBITED_TOOL_PERMISSIONS.length &&
    PROHIBITED_TOOL_PERMISSIONS.every(
      permission =>
        CAO_PREVIEW_REGISTRY_ENTRY
          .toolPermissions.prohibited
          .includes(permission),
    ),
);

check(
  'environment is exactly Preview',
  CAO_PREVIEW_REGISTRY_ENTRY
    .environmentEligibility.length === 1 &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .environmentEligibility[0] ===
      'preview',
);

check(
  'Founder approval reference is exact',
  CAO_PREVIEW_REGISTRY_ENTRY
    .roleApprovalReference ===
    CAO_PREVIEW_APPROVAL_REFERENCE,
);

check(
  'human initiation and draft-only disposition remain mandatory',
  CAO_PREVIEW_REGISTRY_ENTRY
    .humanApprovalRequirements
    .explicitHumanInitiationRequired ===
      true &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .humanApprovalRequirements
      .founderApprovalRequired === true &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .humanApprovalRequirements
      .outputDisposition ===
      'draft_only' &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .humanApprovalRequirements
      .noApprovalBySilence === true,
);

check(
  'fallback and provider substitution remain prohibited',
  CAO_PREVIEW_REGISTRY_ENTRY
    .providerSubstitutionPolicy
    .allowAutomaticPrimaryToFallback ===
      false &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .providerSubstitutionPolicy
      .allowAutomaticProviderChange ===
      false &&
    CAO_PREVIEW_REGISTRY_ENTRY
      .providerSubstitutionPolicy
      .requireFounderApproval === true,
);

check(
  'lookup returns the exact approved entry',
  getCaoPreviewRegistryEntry() ===
    CAO_PREVIEW_REGISTRY_ENTRY,
);

{
  const run = validCaoRun();
  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'tool-free human-initiated CAO Preview request validates',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

{
  const run = validCaoRun();

  (
    run as unknown as {
      environment: string;
    }
  ).environment = 'production';

  (
    run.auditMetadata as unknown as {
      environment: string;
    }
  ).environment = 'production';

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'Production request remains prohibited',
    hasIssue(
      result,
      'production_prohibited',
    ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

{
  const run = validCaoRun();
  run.requestedTools = [
    'repository.read',
  ];

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'any requested tool is rejected',
    hasIssue(
      result,
      'tool_not_allowed_for_role',
    ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

{
  const run = validCaoRun();

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

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'disabled challenger cannot execute',
    hasIssue(
      result,
      'assignment_disabled',
    ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
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
