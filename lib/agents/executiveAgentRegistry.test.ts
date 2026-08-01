import {
  EXECUTIVE_ROLE_IDS,
  PROHIBITED_TOOL_PERMISSIONS,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  type ExecutiveAgentRunRequest,
} from '../ai/modelRegistry';

import {
  cloneSyntheticFixture,
  SYNTHETIC_VALID_RUN_REQUEST,
} from './__fixtures__/registryFixtures';

import {
  validateExecutiveAgentRunRequest,
  validateRuntimeModelRegistryEntry,
} from './registryValidator';

import {
  DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES,
  EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE,
  EXECUTIVE_AGENT_REGISTRY_APPROVAL_REFERENCE,
  EXECUTIVE_AGENT_REGISTRY_VERSION,
  getDraftExecutiveAgentRegistryEntry,
} from './executiveAgentRegistry';

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

function sameMembers(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    expected.every(value =>
      actual.includes(value),
    )
  );
}

console.log(
  '\nDraft executive-agent registry entries',
);

check(
  'contains exactly the three approved roles',
  sameMembers(
    DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES.map(
      entry => entry.roleId,
    ),
    EXECUTIVE_ROLE_IDS,
  ),
);

check(
  'registry version is explicit and fixed',
  EXECUTIVE_AGENT_REGISTRY_VERSION ===
    'executive-agent-registry-draft-v1',
);

check(
  'draft authority reference is explicit',
  EXECUTIVE_AGENT_REGISTRY_APPROVAL_REFERENCE ===
    'founder-omnibus-authorization-2026-08-01',
);

for (
  const entry of
  DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES
) {
  const result =
    validateRuntimeModelRegistryEntry(entry);

  check(
    `${entry.roleId} draft entry validates`,
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );

  check(
    `${entry.roleId} remains draft and non-executable`,
    entry.status === 'draft' &&
      !entry.primaryModel.enabled &&
      !entry.challengerModel.enabled &&
      entry.fallbackModel === null,
  );

  check(
    `${entry.roleId} proposes Terra primary`,
    entry.primaryModel.providerId ===
      'openai' &&
      entry.primaryModel.modelId ===
        'openai/gpt-5.6-terra' &&
      entry.primaryModel.pinnedModelVersion ===
        entry.primaryModel.modelId &&
      entry.primaryModel.intendedUse ===
        'primary',
  );

  check(
    `${entry.roleId} proposes Sonnet challenger`,
    entry.challengerModel.providerId ===
      'anthropic' &&
      entry.challengerModel.modelId ===
        'anthropic/claude-sonnet-5' &&
      entry.challengerModel
        .pinnedModelVersion ===
        entry.challengerModel.modelId &&
      entry.challengerModel.intendedUse ===
        'challenger',
  );

  check(
    `${entry.roleId} uses the evaluation adapter`,
    entry.primaryModel.adapterId ===
      'vercel-ai-gateway-v1' &&
      entry.challengerModel.adapterId ===
        'vercel-ai-gateway-v1',
  );

  check(
    `${entry.roleId} preserves exact charter tasks`,
    sameMembers(
      entry.allowedTaskClasses,
      ROLE_ALLOWED_TASK_CLASSES[
        entry.roleId
      ],
    ),
  );

  check(
    `${entry.roleId} preserves exact charter tools`,
    sameMembers(
      entry.toolPermissions.allowed,
      ROLE_ALLOWED_TOOL_PERMISSIONS[
        entry.roleId
      ],
    ),
  );

  check(
    `${entry.roleId} preserves every prohibition`,
    sameMembers(
      entry.toolPermissions.prohibited,
      PROHIBITED_TOOL_PERMISSIONS,
    ),
  );

  check(
    `${entry.roleId} uses its immutable charter blob`,
    entry.charterVersion ===
      EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE[
        entry.roleId
      ] &&
      entry.charterVersion.startsWith(
        'git-blob:',
      ),
  );

  check(
    `${entry.roleId} has no fallback or substitution`,
    entry.fallbackModel === null &&
      !entry.providerSubstitutionPolicy
        .allowAutomaticPrimaryToFallback &&
      !entry.providerSubstitutionPolicy
        .allowAutomaticProviderChange,
  );

  check(
    `${entry.roleId} is Preview-only and draft-only`,
    sameMembers(
      entry.environmentEligibility,
      ['preview'],
    ) &&
      entry.humanApprovalRequirements
        .outputDisposition === 'draft_only',
  );

  check(
    `${entry.roleId} lookup is exact`,
    getDraftExecutiveAgentRegistryEntry(
      entry.roleId,
    ) === entry,
  );
}

const sampleEntry =
  DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES[0];

const attemptedRun =
  cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  ) as ExecutiveAgentRunRequest;

attemptedRun.registryEntry = sampleEntry;
attemptedRun.roleApprovalReference =
  sampleEntry.roleApprovalReference;
attemptedRun.requestedTaskClass =
  sampleEntry.allowedTaskClasses[0];
attemptedRun.requestedTools = [];

attemptedRun.auditMetadata.roleId =
  sampleEntry.roleId;
attemptedRun.auditMetadata.registryVersion =
  sampleEntry.registryVersion;
attemptedRun.auditMetadata.charterVersion =
  sampleEntry.charterVersion;
attemptedRun.auditMetadata.approvalReference =
  sampleEntry.roleApprovalReference;
attemptedRun.auditMetadata.taskClass =
  attemptedRun.requestedTaskClass;
attemptedRun.auditMetadata.modelSlot =
  'primary';
attemptedRun.auditMetadata.providerId =
  sampleEntry.primaryModel.providerId;
attemptedRun.auditMetadata.modelId =
  sampleEntry.primaryModel.modelId;
attemptedRun.auditMetadata.pinnedModelVersion =
  sampleEntry.primaryModel.pinnedModelVersion;
attemptedRun.auditMetadata.adapterId =
  sampleEntry.primaryModel.adapterId;
attemptedRun.auditMetadata.reasoningLevel =
  sampleEntry.reasoningLevel;
attemptedRun.auditMetadata
  .effectiveToolPermissions = [];
attemptedRun.auditMetadata.toolCalls = [];

const attemptedRunResult =
  validateExecutiveAgentRunRequest(
    attemptedRun,
  );

check(
  'draft disabled entry cannot execute',
  !attemptedRunResult.ok &&
    attemptedRunResult.issues.some(
      issue =>
        issue.code ===
        'registry_not_preview_approved',
    ) &&
    attemptedRunResult.issues.some(
      issue =>
        issue.code ===
        'assignment_disabled',
    ),
  attemptedRunResult.ok
    ? 'unexpected acceptance'
    : JSON.stringify(
        attemptedRunResult.issues,
      ),
);

console.log(
  `\n${'-'.repeat(72)}\n` +
    `  ${passed} passed, ${failed} failed\n` +
    `${'-'.repeat(72)}`,
);

if (failed > 0) {
  process.exit(1);
}
