import {
  PROHIBITED_TOOL_PERMISSIONS,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  type AllowedToolPermission,
  type ExecutiveAgentRunRequest,
  type ExecutiveRoleId,
  type TaskClass,
} from '../ai/modelRegistry';

import {
  RegistryValidationError,
  assertValidExecutiveAgentRunRequest,
  assertValidRuntimeModelRegistryEntry,
  validateExecutiveAgentRunRequest,
  validateRuntimeModelRegistryEntry,
  type RegistryValidationIssueCode,
} from './registryValidator';

import {
  SYNTHETIC_REGISTRY_VALIDATION_FIXTURES,
  SYNTHETIC_VALID_REGISTRY_ENTRY,
  SYNTHETIC_VALID_RUN_REQUEST,
  cloneSyntheticFixture,
} from './__fixtures__/registryFixtures';

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

interface IssueBearingValidationResult {
  readonly ok: boolean;
  readonly issues: readonly {
    readonly code: RegistryValidationIssueCode;
  }[];
}

function issueCodes(
  result: IssueBearingValidationResult,
): readonly RegistryValidationIssueCode[] {
  return result.issues.map((issue) => issue.code);
}

function hasIssue(
  result: IssueBearingValidationResult,
  code: RegistryValidationIssueCode,
): boolean {
  return issueCodes(result).includes(code);
}

function hasAllIssues(
  result: IssueBearingValidationResult,
  expected: readonly RegistryValidationIssueCode[],
): boolean {
  const actual = issueCodes(result);

  return expected.every((code) => actual.includes(code));
}

function mutableRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Expected a mutable object fixture.');
  }

  return value as Record<string, unknown>;
}

function childRecord(
  parent: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return mutableRecord(parent[key]);
}

function validRunForRole(
  roleId: ExecutiveRoleId,
  taskClass: TaskClass,
  requestedTools: readonly AllowedToolPermission[],
): ExecutiveAgentRunRequest {
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  const approvalReference =
    `synthetic-founder-approval:${roleId}:v1`;

  run.registryEntry.roleId = roleId;
  run.registryEntry.allowedTaskClasses =
    ROLE_ALLOWED_TASK_CLASSES[roleId];
  run.registryEntry.toolPermissions.allowed =
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId];
  run.registryEntry.toolPermissions.prohibited =
    PROHIBITED_TOOL_PERMISSIONS;
  run.registryEntry.toolPermissions.approvalRequired =
    requestedTools.filter(
      (permission) => permission.startsWith('draft.'),
    );
  run.registryEntry.roleApprovalReference =
    approvalReference;

  run.roleApprovalReference = approvalReference;
  run.requestedTaskClass = taskClass;
  run.requestedTools = requestedTools;

  run.auditMetadata.roleId = roleId;
  run.auditMetadata.approvalReference =
    approvalReference;
  run.auditMetadata.taskClass = taskClass;
  run.auditMetadata.effectiveToolPermissions =
    requestedTools;
  run.auditMetadata.toolCalls =
    requestedTools.map((permission) => ({
      permission,
      status: 'completed',
      reasonClass: 'synthetic-test',
    }));

  return run;
}

console.log(
  '\nExecutive-agent registry validator tests',
);

const validRegistryResult =
  validateRuntimeModelRegistryEntry(
    SYNTHETIC_VALID_REGISTRY_ENTRY,
  );

check(
  'valid synthetic registry entry passes',
  validRegistryResult.ok,
  validRegistryResult.ok
    ? ''
    : JSON.stringify(validRegistryResult.issues),
);

const validRunResult =
  validateExecutiveAgentRunRequest(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

check(
  'valid synthetic run request passes',
  validRunResult.ok,
  validRunResult.ok
    ? ''
    : JSON.stringify(validRunResult.issues),
);

console.log(
  '\nSynthetic authorization fixture coverage',
);

for (
  const fixture of
  SYNTHETIC_REGISTRY_VALIDATION_FIXTURES
) {
  const result =
    fixture.target === 'registry'
      ? validateRuntimeModelRegistryEntry(
          fixture.input,
        )
      : validateExecutiveAgentRunRequest(
          fixture.input,
        );

  if (fixture.expectedIssueCodes.length === 0) {
    check(
      `fixture ${fixture.name} is accepted`,
      result.ok,
      result.ok
        ? ''
        : JSON.stringify(result.issues),
    );
    continue;
  }

  check(
    `fixture ${fixture.name} is rejected`,
    !result.ok,
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );

  check(
    `fixture ${fixture.name} reports required issue codes`,
    hasAllIssues(
      result,
      fixture.expectedIssueCodes,
    ),
    `expected=${fixture.expectedIssueCodes.join(',')} actual=${issueCodes(result).join(',')}`,
  );
}

console.log(
  '\nRole-specific valid request coverage',
);

const roleRuns: readonly [
  ExecutiveRoleId,
  TaskClass,
  readonly AllowedToolPermission[],
][] = [
  [
    'executive.ceo',
    'strategic_analysis',
    [
      'repository.read',
      'approved_documents.read',
      'draft.memo',
    ],
  ],
  [
    'executive.chief_of_staff',
    'meeting_agenda_draft',
    [
      'repository.read',
      'draft.memo',
      'draft.plan',
    ],
  ],
  [
    'executive.chief_architecture_officer',
    'architecture_analysis',
    [
      'repository.read',
      'approved_documents.read',
      'draft.architecture_option',
    ],
  ],
];

for (const [roleId, taskClass, tools] of roleRuns) {
  const result = validateExecutiveAgentRunRequest(
    validRunForRole(
      roleId,
      taskClass,
      tools,
    ),
  );

  check(
    `${roleId} valid narrowed request passes`,
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

console.log(
  '\nStrict and fail-closed validation',
);

{
  const entry = cloneSyntheticFixture(
    SYNTHETIC_VALID_REGISTRY_ENTRY,
  ) as unknown;

  mutableRecord(entry).unexpectedField =
    'synthetic-unlisted-value';

  const result =
    validateRuntimeModelRegistryEntry(entry);

  check(
    'unknown registry fields are denied',
    !result.ok &&
      hasIssue(result, 'unknown_field'),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  ) as unknown;

  mutableRecord(run).unexpectedField =
    'synthetic-unlisted-value';

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'unknown run-request fields are denied',
    !result.ok &&
      hasIssue(result, 'unknown_field'),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  ) as unknown;

  const record = mutableRecord(run);
  record.environment = 'production';

  const audit = childRecord(
    record,
    'auditMetadata',
  );

  audit.environment = 'production';

  record.EXECUTIVE_AGENTS_PREVIEW_ENABLED =
    true;

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'Production remains prohibited when reserved future flag concept is present',
    !result.ok &&
      hasIssue(
        result,
        'production_prohibited',
      ) &&
      hasIssue(result, 'unknown_field'),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

for (const status of [
  'draft',
  'suspended',
  'retired',
] as const) {
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.registryEntry.status = status;

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    `${status} registry entry cannot execute`,
    !result.ok &&
      hasIssue(
        result,
        'registry_not_preview_approved',
      ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.registryEntry.primaryModel.enabled =
    false;

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'disabled selected primary assignment cannot execute',
    !result.ok &&
      hasIssue(
        result,
        'assignment_disabled',
      ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.modelSlot =
    'challenger';
  run.auditMetadata.providerId =
    run.registryEntry.challengerModel.providerId;
  run.auditMetadata.modelId =
    run.registryEntry.challengerModel.modelId;
  run.auditMetadata.pinnedModelVersion =
    run.registryEntry.challengerModel
      .pinnedModelVersion;
  run.auditMetadata.adapterId =
    run.registryEntry.challengerModel.adapterId;

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'disabled selected challenger assignment cannot execute',
    !result.ok &&
      hasIssue(
        result,
        'assignment_disabled',
      ),
    result.ok
      ? 'unexpected acceptance'
      : JSON.stringify(result.issues),
  );
}

{
  const entry = cloneSyntheticFixture(
    SYNTHETIC_VALID_REGISTRY_ENTRY,
  );

  entry.fallbackModel = {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-fallback-model',
    pinnedModelVersion:
      'synthetic-fallback-version-2026-07-31',
    adapterId: 'synthetic-adapter',
    enabled: false,
    intendedUse: 'fallback',
  };

  const result =
    validateRuntimeModelRegistryEntry(entry);

  check(
    'bounded disabled fallback assignment passes without expanding authority',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.evidenceState = 'unknown';
  run.auditMetadata.outcome =
    'escalation_required';
  run.auditMetadata.unknownsRecorded = [
    'synthetic evidence gap',
  ];

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'unknown evidence passes only with escalation outcome',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.disagreements = [
    {
      issue: 'Synthetic architectural choice',
      positions: [
        'Synthetic option A',
        'Synthetic option B',
      ],
      evidenceReferences: [
        'synthetic-evidence-A',
        'synthetic-evidence-B',
      ],
      unknowns: [
        'Synthetic unresolved dependency',
      ],
      decisionOwner: 'founder',
      founderDecisionRequired: true,
    },
  ];

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'bounded disagreement preservation record passes',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.toolCalls = [
    ...run.auditMetadata.toolCalls,
    {
      permission: 'repository.write',
      status: 'denied',
      reasonClass: 'synthetic-denial',
    },
  ];

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'prohibited tool may be audited only as denied',
    result.ok,
    result.ok
      ? ''
      : JSON.stringify(result.issues),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.toolCalls = [
    ...run.auditMetadata.toolCalls,
    {
      permission: 'repository.write',
      status: 'completed',
      reasonClass: 'synthetic-invalid-completion',
    },
  ];

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'completed prohibited tool call is rejected',
    !result.ok &&
      hasIssue(
        result,
        'prohibited_tool_permission',
      ),
  );
}

console.log(
  '\nBounded audit-metadata validation',
);

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  ) as unknown;

  const audit = childRecord(
    mutableRecord(run),
    'auditMetadata',
  );

  audit.unexpectedAuditField =
    'synthetic-unlisted-value';

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'unknown audit fields are denied',
    !result.ok &&
      hasIssue(result, 'unknown_field'),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.toolCalls =
    Array.from(
      { length: 101 },
      (_, index) => ({
        permission: 'repository.read' as const,
        status: 'completed' as const,
        reasonClass:
          `synthetic-tool-call-${index}`,
      }),
    );

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'audit tool-call arrays are bounded',
    !result.ok &&
      hasIssue(
        result,
        'audit_metadata_unbounded',
      ),
  );
}

{
  const run = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

  run.auditMetadata.disagreements =
    Array.from(
      { length: 51 },
      (_, index) => ({
        issue:
          `Synthetic disagreement ${index}`,
        positions: [
          'Synthetic option A',
          'Synthetic option B',
        ],
        evidenceReferences: [],
        unknowns: [],
        decisionOwner:
          'human_reviewer' as const,
        founderDecisionRequired: false,
      }),
    );

  const result =
    validateExecutiveAgentRunRequest(run);

  check(
    'audit disagreement arrays are bounded',
    !result.ok &&
      hasIssue(
        result,
        'audit_metadata_unbounded',
      ),
  );
}

console.log(
  '\nAssertion helpers',
);

{
  let returned = false;

  try {
    const value =
      assertValidRuntimeModelRegistryEntry(
        SYNTHETIC_VALID_REGISTRY_ENTRY,
      );

    returned =
      value.roleId === 'executive.ceo';
  } catch {
    returned = false;
  }

  check(
    'valid registry assertion returns typed value',
    returned,
  );
}

{
  let returned = false;

  try {
    const value =
      assertValidExecutiveAgentRunRequest(
        SYNTHETIC_VALID_RUN_REQUEST,
      );

    returned =
      value.environment === 'preview';
  } catch {
    returned = false;
  }

  check(
    'valid run assertion returns typed value',
    returned,
  );
}

{
  let threwExpectedError = false;

  try {
    assertValidExecutiveAgentRunRequest({
      ...cloneSyntheticFixture(
        SYNTHETIC_VALID_RUN_REQUEST,
      ),
      environment: 'production',
    });
  } catch (error) {
    threwExpectedError =
      error instanceof RegistryValidationError &&
      error.issues.some(
        (issue) =>
          issue.code ===
          'production_prohibited',
      );
  }

  check(
    'invalid run assertion throws bounded RegistryValidationError',
    threwExpectedError,
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
