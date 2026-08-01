import {
  ALLOWED_TOOL_PERMISSIONS,
  AUTHORITY_CATEGORIES,
  EXECUTION_ENVIRONMENTS,
  EXECUTIVE_ROLE_IDS,
  PERMITTED_AUTHORITY_CATEGORIES,
  PROHIBITED_AUTHORITY_CATEGORIES,
  PROHIBITED_TOOL_PERMISSIONS,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  TASK_CLASSES,
  TOOL_PERMISSIONS,
  isAllowedToolPermission,
  isExecutiveRoleId,
  isProhibitedToolPermission,
  isTaskAllowedForRole,
  isTaskClass,
  isToolAllowedForRole,
  isToolPermission,
  type ExecutiveRoleId,
  type TaskClass,
} from './modelRegistry';

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

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function sameMembers(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    expected.every((value) => actual.includes(value))
  );
}

console.log(
  '\nExecutive-agent model-registry vocabulary tests',
);

check(
  'only the three Founder-approved role IDs exist',
  sameMembers(
    EXECUTIVE_ROLE_IDS,
    [
      'executive.ceo',
      'executive.chief_of_staff',
      'executive.chief_architecture_officer',
    ],
  ),
);

check(
  'role IDs are unique',
  unique(EXECUTIVE_ROLE_IDS),
);

check(
  'known role IDs are accepted',
  EXECUTIVE_ROLE_IDS.every(
    (roleId) => isExecutiveRoleId(roleId),
  ),
);

check(
  'unknown role IDs are rejected',
  !isExecutiveRoleId('executive.unknown') &&
    !isExecutiveRoleId('director.operations') &&
    !isExecutiveRoleId('worker.synthetic'),
);

check(
  'task-class vocabulary is unique',
  unique(TASK_CLASSES),
);

check(
  'all declared task classes are recognized',
  TASK_CLASSES.every(
    (taskClass) => isTaskClass(taskClass),
  ),
);

check(
  'unlisted task classes are denied',
  !isTaskClass('notice_generation') &&
    !isTaskClass('payment_processing') &&
    !isTaskClass('repository_write') &&
    !isTaskClass('synthetic_unlisted_task'),
);

check(
  'only Preview is encoded as an eligible environment',
  sameMembers(
    EXECUTION_ENVIRONMENTS,
    ['preview'],
  ),
);

check(
  'Production is not an eligible execution environment',
  !(EXECUTION_ENVIRONMENTS as readonly string[]).includes(
    'production',
  ),
);

check(
  'allowed tool vocabulary is unique',
  unique(ALLOWED_TOOL_PERMISSIONS),
);

check(
  'prohibited tool vocabulary is unique',
  unique(PROHIBITED_TOOL_PERMISSIONS),
);

check(
  'allowed and prohibited tool vocabularies do not overlap',
  ALLOWED_TOOL_PERMISSIONS.every(
    (tool) =>
      !(
        PROHIBITED_TOOL_PERMISSIONS as readonly string[]
      ).includes(tool),
  ),
);

check(
  'combined tool vocabulary contains every allowed tool',
  ALLOWED_TOOL_PERMISSIONS.every(
    (tool) => TOOL_PERMISSIONS.includes(tool),
  ),
);

check(
  'combined tool vocabulary contains every prohibited tool',
  PROHIBITED_TOOL_PERMISSIONS.every(
    (tool) => TOOL_PERMISSIONS.includes(tool),
  ),
);

check(
  'known allowed tools are classified as allowed',
  ALLOWED_TOOL_PERMISSIONS.every(
    (tool) => isAllowedToolPermission(tool),
  ),
);

check(
  'known prohibited tools are classified as prohibited',
  PROHIBITED_TOOL_PERMISSIONS.every(
    (tool) => isProhibitedToolPermission(tool),
  ),
);

check(
  'unknown tools are denied by all classification guards',
  !isToolPermission('synthetic.unknown_tool') &&
    !isAllowedToolPermission('synthetic.unknown_tool') &&
    !isProhibitedToolPermission('synthetic.unknown_tool'),
);

check(
  'all prohibited authority categories are represented',
  PROHIBITED_AUTHORITY_CATEGORIES.every(
    (category) =>
      AUTHORITY_CATEGORIES.includes(category),
  ),
);

check(
  'advisory draft is the only permitted authority category',
  sameMembers(
    PERMITTED_AUTHORITY_CATEGORIES,
    ['advisory_draft'],
  ),
);

check(
  'permitted and prohibited authority categories do not overlap',
  PERMITTED_AUTHORITY_CATEGORIES.every(
    (category) =>
      !(
        PROHIBITED_AUTHORITY_CATEGORIES as readonly string[]
      ).includes(category),
  ),
);

const expectedTasks: Readonly<
  Record<ExecutiveRoleId, readonly TaskClass[]>
> = {
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
};

for (const roleId of EXECUTIVE_ROLE_IDS) {
  check(
    `${roleId} task boundary exactly matches its charter`,
    sameMembers(
      ROLE_ALLOWED_TASK_CLASSES[roleId],
      expectedTasks[roleId],
    ),
  );

  check(
    `${roleId} task boundary contains no duplicates`,
    unique(ROLE_ALLOWED_TASK_CLASSES[roleId]),
  );

  check(
    `${roleId} accepts every listed role task`,
    ROLE_ALLOWED_TASK_CLASSES[roleId].every(
      (taskClass) =>
        isTaskAllowedForRole(roleId, taskClass),
    ),
  );

  const unlistedForRole = TASK_CLASSES.filter(
    (taskClass) =>
      !(
        ROLE_ALLOWED_TASK_CLASSES[roleId] as
          readonly TaskClass[]
      ).includes(taskClass),
  );

  check(
    `${roleId} denies every unlisted role task`,
    unlistedForRole.every(
      (taskClass) =>
        !isTaskAllowedForRole(roleId, taskClass),
    ),
  );

  check(
    `${roleId} tool boundary contains only globally allowed tools`,
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId].every(
      (tool) => isAllowedToolPermission(tool),
    ),
  );

  check(
    `${roleId} tool boundary contains no prohibited tools`,
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId].every(
      (tool) =>
        !isProhibitedToolPermission(tool),
    ),
  );

  check(
    `${roleId} tool boundary contains no duplicates`,
    unique(
      ROLE_ALLOWED_TOOL_PERMISSIONS[roleId],
    ),
  );

  check(
    `${roleId} accepts every listed role tool`,
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId].every(
      (tool) =>
        isToolAllowedForRole(roleId, tool),
    ),
  );

  const unlistedToolsForRole =
    ALLOWED_TOOL_PERMISSIONS.filter(
      (tool) =>
        !(
          ROLE_ALLOWED_TOOL_PERMISSIONS[roleId] as
            readonly string[]
        ).includes(tool),
    );

  check(
    `${roleId} denies every globally allowed but role-unlisted tool`,
    unlistedToolsForRole.every(
      (tool) =>
        !isToolAllowedForRole(roleId, tool),
    ),
  );
}

check(
  'CEO cannot use architecture-option drafting',
  !isToolAllowedForRole(
    'executive.ceo',
    'draft.architecture_option',
  ),
);

check(
  'Chief of Staff cannot use architecture-option drafting',
  !isToolAllowedForRole(
    'executive.chief_of_staff',
    'draft.architecture_option',
  ),
);

check(
  'Chief Architecture Officer may use architecture-option drafting',
  isToolAllowedForRole(
    'executive.chief_architecture_officer',
    'draft.architecture_option',
  ),
);

check(
  'CEO cannot perform architecture analysis',
  !isTaskAllowedForRole(
    'executive.ceo',
    'architecture_analysis',
  ),
);

check(
  'Chief of Staff cannot perform strategic analysis',
  !isTaskAllowedForRole(
    'executive.chief_of_staff',
    'strategic_analysis',
  ),
);

check(
  'Chief Architecture Officer cannot draft meeting agendas',
  !isTaskAllowedForRole(
    'executive.chief_architecture_officer',
    'meeting_agenda_draft',
  ),
);

console.log(
  `\n${'-'.repeat(64)}\n` +
    `  ${passed} passed, ${failed} failed\n` +
    `${'-'.repeat(64)}`,
);

if (failed > 0) {
  process.exit(1);
}
