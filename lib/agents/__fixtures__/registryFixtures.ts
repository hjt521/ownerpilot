/**
 * Synthetic-only fixtures for executive-agent registry validation.
 *
 * These fixtures contain no real provider, model, adapter, customer, tenant,
 * landlord, credential, secret, Production, notice, payment, legal-control,
 * transcript, provider-response, or external-message data.
 */

import {
  PROHIBITED_TOOL_PERMISSIONS,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  type ExecutiveAgentRunRequest,
  type ModelAssignment,
  type RegistryAuditMetadata,
  type RuntimeModelRegistryEntry,
} from '../../ai/modelRegistry';

import type {
  RegistryValidationIssueCode,
} from '../registryValidator';

export type SyntheticFixtureTarget =
  | 'registry'
  | 'run';

export interface SyntheticRegistryValidationFixture {
  name: string;
  target: SyntheticFixtureTarget;
  input: unknown;
  expectedIssueCodes:
    readonly RegistryValidationIssueCode[];
}

type MutableFixtureRecord =
  Record<string, unknown>;

const SYNTHETIC_APPROVAL_REFERENCE =
  'synthetic-founder-approval:executive.ceo:v1';

const SYNTHETIC_SOURCE_COMMIT =
  '0000000000000000000000000000000000000000';

export const SYNTHETIC_PRIMARY_ASSIGNMENT:
  ModelAssignment = {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model',
    pinnedModelVersion: 'synthetic-version-2026-07-31',
    adapterId: 'synthetic-adapter',
    enabled: true,
    intendedUse: 'primary',
  };

export const SYNTHETIC_CHALLENGER_ASSIGNMENT:
  ModelAssignment = {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-challenger-model',
    pinnedModelVersion:
      'synthetic-challenger-version-2026-07-31',
    adapterId: 'synthetic-adapter',
    enabled: false,
    intendedUse: 'challenger',
  };

export const SYNTHETIC_FALLBACK_ASSIGNMENT:
  ModelAssignment = {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-fallback-model',
    pinnedModelVersion:
      'synthetic-fallback-version-2026-07-31',
    adapterId: 'synthetic-adapter',
    enabled: false,
    intendedUse: 'fallback',
  };

export const SYNTHETIC_VALID_REGISTRY_ENTRY:
  RuntimeModelRegistryEntry = {
    roleId: 'executive.ceo',
    registryVersion: 'synthetic-registry-v1',
    charterVersion: 'synthetic-charter-v1',
    status: 'preview_approved',
    primaryModel: SYNTHETIC_PRIMARY_ASSIGNMENT,
    challengerModel: SYNTHETIC_CHALLENGER_ASSIGNMENT,
    fallbackModel: null,
    allowedTaskClasses:
      ROLE_ALLOWED_TASK_CLASSES['executive.ceo'],
    toolPermissions: {
      defaultEffect: 'deny',
      allowed:
        ROLE_ALLOWED_TOOL_PERMISSIONS['executive.ceo'],
      prohibited: PROHIBITED_TOOL_PERMISSIONS,
      approvalRequired: [
        'draft.memo',
        'draft.plan',
        'draft.work_item_proposal',
      ],
    },
    reasoningLevel: 'standard',
    limits: {
      hardTimeoutMs: 30_000,
      targetP95LatencyMs: 10_000,
      maximumInputTokens: 8_000,
      maximumOutputTokens: 2_000,
      maximumEstimatedCostMicrosPerRun: 500_000,
      maximumEstimatedCostMicrosPerDay: 2_000_000,
    },
    humanApprovalRequirements: {
      explicitHumanInitiationRequired: true,
      founderApprovalRequired: true,
      outputDisposition: 'draft_only',
      noApprovalBySilence: true,
    },
    providerSubstitutionPolicy: {
      mode: 'prohibited_without_founder_approval',
      allowAutomaticPrimaryToFallback: false,
      allowAutomaticProviderChange: false,
      requireEquivalentOrStricterLimits: true,
      requireSameTaskAndToolBoundary: true,
      requireAuditReason: true,
      requireFounderApproval: true,
    },
    environmentEligibility: [
      'preview',
    ],
    roleApprovalReference:
      SYNTHETIC_APPROVAL_REFERENCE,
  };

export const SYNTHETIC_VALID_AUDIT_METADATA:
  RegistryAuditMetadata = {
    runId: 'synthetic-run-0001',
    roleId: 'executive.ceo',
    registryVersion: 'synthetic-registry-v1',
    charterVersion: 'synthetic-charter-v1',
    registryEntryHash: 'synthetic-entry-hash',
    environment: 'preview',
    sourceCommitSha: SYNTHETIC_SOURCE_COMMIT,
    requestedBy: 'synthetic-human-reviewer',
    approvalReference:
      SYNTHETIC_APPROVAL_REFERENCE,
    taskClass: 'strategic_analysis',
    modelSlot: 'primary',
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model',
    pinnedModelVersion:
      'synthetic-version-2026-07-31',
    adapterId: 'synthetic-adapter',
    reasoningLevel: 'standard',
    effectiveToolPermissions: [
      'repository.read',
      'approved_documents.read',
      'draft.memo',
    ],
    toolCalls: [
      {
        permission: 'repository.read',
        status: 'completed',
        reasonClass: 'synthetic-read',
      },
      {
        permission: 'draft.memo',
        status: 'completed',
        reasonClass: 'synthetic-draft',
      },
    ],
    substitutionRequested: false,
    substitutionReasonClass: null,
    fallbackReasonClass: null,
    startedAt: '2026-07-31T00:00:00.000Z',
    completedAt: '2026-07-31T00:00:01.000Z',
    latencyMs: 1_000,
    inputTokenCount: 1_000,
    outputTokenCount: 500,
    estimatedCostMicros: 100_000,
    evidenceReferences: [
      'synthetic-evidence-001',
    ],
    unknownsRecorded: [],
    disagreements: [],
    outcome: 'draft_completed',
    humanDisposition: 'pending',
  };

export const SYNTHETIC_VALID_RUN_REQUEST:
  ExecutiveAgentRunRequest = {
    registryEntry:
      SYNTHETIC_VALID_REGISTRY_ENTRY,
    environment: 'preview',
    explicitHumanInitiation: true,
    roleApprovalReference:
      SYNTHETIC_APPROVAL_REFERENCE,
    requestedTaskClass: 'strategic_analysis',
    requestedTools: [
      'repository.read',
      'approved_documents.read',
      'draft.memo',
    ],
    requestedAuthorityCategories: [
      'advisory_draft',
    ],
    authorityExpansionRequested: false,
    disagreementPreservationRequired: true,
    uncertaintyPreservationRequired: true,
    evidenceState: 'complete',
    requestedUsage: {
      inputTokens: 1_000,
      outputTokens: 500,
      estimatedCostMicros: 100_000,
      estimatedDailyCostMicrosAfterRun: 100_000,
      elapsedLatencyMs: 1_000,
      requestedTimeoutMs: 5_000,
    },
    auditMetadata:
      SYNTHETIC_VALID_AUDIT_METADATA,
  };

export function cloneSyntheticFixture<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function asMutableRecord(
  value: unknown,
): MutableFixtureRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      'Synthetic fixture mutation expected an object.',
    );
  }

  return value as MutableFixtureRecord;
}

function childRecord(
  parent: MutableFixtureRecord,
  key: string,
): MutableFixtureRecord {
  return asMutableRecord(parent[key]);
}

function mutateRegistry(
  mutation: (
    draft: MutableFixtureRecord,
  ) => void,
): unknown {
  const draft = cloneSyntheticFixture(
    SYNTHETIC_VALID_REGISTRY_ENTRY,
  ) as unknown;

  const record = asMutableRecord(draft);
  mutation(record);

  return draft;
}

function mutateRun(
  mutation: (
    draft: MutableFixtureRecord,
  ) => void,
): unknown {
  const draft = cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  ) as unknown;

  const record = asMutableRecord(draft);
  mutation(record);

  return draft;
}

function authorityAttempt(
  authorityCategory: string,
  toolPermission?: string,
): unknown {
  return mutateRun((draft) => {
    draft.requestedAuthorityCategories = [
      authorityCategory,
    ];

    if (toolPermission !== undefined) {
      draft.requestedTools = [
        toolPermission,
      ];
    }
  });
}

export const SYNTHETIC_REGISTRY_VALIDATION_FIXTURES:
  readonly SyntheticRegistryValidationFixture[] = [
    {
      name: 'allowed_role_task_and_tool',
      target: 'run',
      input: cloneSyntheticFixture(
        SYNTHETIC_VALID_RUN_REQUEST,
      ),
      expectedIssueCodes: [],
    },
    {
      name: 'unknown_role_rejection',
      target: 'registry',
      input: mutateRegistry((draft) => {
        draft.roleId =
          'executive.synthetic_unknown';
      }),
      expectedIssueCodes: [
        'unknown_role_id',
      ],
    },
    {
      name: 'unlisted_task_rejection',
      target: 'run',
      input: mutateRun((draft) => {
        draft.requestedTaskClass =
          'synthetic_unlisted_task';
      }),
      expectedIssueCodes: [
        'unknown_task_class',
      ],
    },
    {
      name: 'role_specific_task_narrowing',
      target: 'run',
      input: mutateRun((draft) => {
        draft.requestedTaskClass =
          'architecture_analysis';

        const audit = childRecord(
          draft,
          'auditMetadata',
        );

        audit.taskClass =
          'architecture_analysis';
      }),
      expectedIssueCodes: [
        'task_not_allowed_for_role',
      ],
    },
    {
      name: 'unknown_tool_default_deny',
      target: 'run',
      input: mutateRun((draft) => {
        draft.requestedTools = [
          'synthetic.unknown_tool',
        ];
      }),
      expectedIssueCodes: [
        'unknown_tool_permission',
      ],
    },
    {
      name: 'prohibited_tool_rejection',
      target: 'run',
      input: mutateRun((draft) => {
        draft.requestedTools = [
          'repository.write',
        ];
      }),
      expectedIssueCodes: [
        'prohibited_tool_permission',
      ],
    },
    {
      name: 'role_specific_tool_narrowing',
      target: 'run',
      input: mutateRun((draft) => {
        draft.requestedTools = [
          'draft.architecture_option',
        ];
      }),
      expectedIssueCodes: [
        'tool_not_allowed_for_role',
      ],
    },
    {
      name: 'production_environment_rejection',
      target: 'run',
      input: mutateRun((draft) => {
        draft.environment =
          'production';

        const audit = childRecord(
          draft,
          'auditMetadata',
        );

        audit.environment =
          'production';
      }),
      expectedIssueCodes: [
        'production_prohibited',
      ],
    },
    {
      name: 'non_preview_environment_rejection',
      target: 'run',
      input: mutateRun((draft) => {
        draft.environment =
          'local';

        const audit = childRecord(
          draft,
          'auditMetadata',
        );

        audit.environment =
          'local';
      }),
      expectedIssueCodes: [
        'non_preview_environment',
      ],
    },
    {
      name: 'production_registry_eligibility_rejection',
      target: 'registry',
      input: mutateRegistry((draft) => {
        draft.environmentEligibility = [
          'preview',
          'production',
        ];
      }),
      expectedIssueCodes: [
        'production_prohibited',
      ],
    },
    {
      name: 'missing_founder_approval',
      target: 'registry',
      input: mutateRegistry((draft) => {
        draft.roleApprovalReference = '';
      }),
      expectedIssueCodes: [
        'missing_role_approval_reference',
        'missing_founder_approval',
      ],
    },
    {
      name: 'missing_human_initiation',
      target: 'run',
      input: mutateRun((draft) => {
        draft.explicitHumanInitiation =
          false;
      }),
      expectedIssueCodes: [
        'missing_human_initiation',
      ],
    },
    {
      name: 'missing_pinned_model_version',
      target: 'registry',
      input: mutateRegistry((draft) => {
        const primary = childRecord(
          draft,
          'primaryModel',
        );

        primary.pinnedModelVersion = '';
      }),
      expectedIssueCodes: [
        'missing_pinned_model_version',
      ],
    },
    {
      name: 'moving_alias_rejection',
      target: 'registry',
      input: mutateRegistry((draft) => {
        const primary = childRecord(
          draft,
          'primaryModel',
        );

        primary.pinnedModelVersion =
          'latest';
      }),
      expectedIssueCodes: [
        'moving_model_alias',
      ],
    },
    {
      name: 'cost_limit_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.estimatedCostMicros =
          500_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'daily_cost_limit_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.estimatedDailyCostMicrosAfterRun =
          2_000_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'token_limit_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.inputTokens = 8_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'output_token_limit_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.outputTokens = 2_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'latency_limit_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.elapsedLatencyMs =
          10_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'timeout_breach',
      target: 'run',
      input: mutateRun((draft) => {
        const usage = childRecord(
          draft,
          'requestedUsage',
        );

        usage.requestedTimeoutMs =
          30_001;
      }),
      expectedIssueCodes: [
        'limit_bypass',
      ],
    },
    {
      name: 'automatic_provider_substitution_attempt',
      target: 'registry',
      input: mutateRegistry((draft) => {
        const policy = childRecord(
          draft,
          'providerSubstitutionPolicy',
        );

        policy.allowAutomaticProviderChange =
          true;
      }),
      expectedIssueCodes: [
        'automatic_provider_substitution',
      ],
    },
    {
      name: 'automatic_fallback_attempt',
      target: 'registry',
      input: mutateRegistry((draft) => {
        const policy = childRecord(
          draft,
          'providerSubstitutionPolicy',
        );

        policy.allowAutomaticPrimaryToFallback =
          true;
      }),
      expectedIssueCodes: [
        'automatic_fallback',
      ],
    },
    {
      name: 'fallback_authority_expansion_attempt',
      target: 'registry',
      input: mutateRegistry((draft) => {
        draft.fallbackModel = {
          ...cloneSyntheticFixture(
            SYNTHETIC_FALLBACK_ASSIGNMENT,
          ),
          authorityOverrides: [
            'repository.write',
          ],
        };
      }),
      expectedIssueCodes: [
        'fallback_authority_expansion',
      ],
    },
    {
      name: 'disagreement_preservation_requirement',
      target: 'run',
      input: mutateRun((draft) => {
        draft.disagreementPreservationRequired =
          false;
      }),
      expectedIssueCodes: [
        'disagreement_preservation_required',
      ],
    },
    {
      name: 'uncertainty_preservation_requirement',
      target: 'run',
      input: mutateRun((draft) => {
        draft.uncertaintyPreservationRequired =
          false;
      }),
      expectedIssueCodes: [
        'uncertainty_preservation_required',
      ],
    },
    {
      name: 'incomplete_evidence_escalation',
      target: 'run',
      input: mutateRun((draft) => {
        draft.evidenceState =
          'incomplete';
      }),
      expectedIssueCodes: [
        'evidence_escalation_required',
      ],
    },
    {
      name: 'unknown_evidence_escalation',
      target: 'run',
      input: mutateRun((draft) => {
        draft.evidenceState =
          'unknown';
      }),
      expectedIssueCodes: [
        'evidence_escalation_required',
      ],
    },
    {
      name: 'attempted_repository_write',
      target: 'run',
      input: authorityAttempt(
        'repository_write',
        'repository.write',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_database_write',
      target: 'run',
      input: authorityAttempt(
        'database_write',
        'database.write',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_deployment',
      target: 'run',
      input: authorityAttempt(
        'deployment_or_release',
        'deployment.create',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_external_communication',
      target: 'run',
      input: authorityAttempt(
        'external_communication',
        'external_message.send',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_legal_control_activation',
      target: 'run',
      input: authorityAttempt(
        'legal_control',
      ),
      expectedIssueCodes: [
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_notice_production_or_release',
      target: 'run',
      input: authorityAttempt(
        'notice',
        'notice.release',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_payment_consequence',
      target: 'run',
      input: authorityAttempt(
        'payment',
        'payment.action',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_attorney_routing',
      target: 'run',
      input: authorityAttempt(
        'attorney_routing',
        'attorney.route',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_jurisdiction_activation',
      target: 'run',
      input: authorityAttempt(
        'jurisdiction_activation',
        'jurisdiction.activate',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_los_angeles_rule_activation',
      target: 'run',
      input: authorityAttempt(
        'los_angeles_rule_activation',
        'los_angeles_rules.activate',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_constitutional_record_modification',
      target: 'run',
      input: authorityAttempt(
        'constitutional_record_modification',
        'constitutional_record.modify',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_legal_record_modification',
      target: 'run',
      input: authorityAttempt(
        'legal_record_modification',
        'legal_record.modify',
      ),
      expectedIssueCodes: [
        'prohibited_tool_permission',
        'prohibited_authority',
      ],
    },
    {
      name: 'attempted_role_self_expansion',
      target: 'run',
      input: mutateRun((draft) => {
        draft.authorityExpansionRequested =
          true;

        draft.requestedAuthorityCategories = [
          'role_self_expansion',
        ];
      }),
      expectedIssueCodes: [
        'role_self_expansion',
      ],
    },
    {
      name: 'unbounded_audit_metadata_rejection',
      target: 'run',
      input: mutateRun((draft) => {
        const audit = childRecord(
          draft,
          'auditMetadata',
        );

        audit.runId =
          'x'.repeat(513);
      }),
      expectedIssueCodes: [
        'audit_metadata_unbounded',
      ],
    },
    {
      name: 'role_approval_reference_mismatch',
      target: 'run',
      input: mutateRun((draft) => {
        draft.roleApprovalReference =
          'synthetic-founder-approval:mismatch';
      }),
      expectedIssueCodes: [
        'role_approval_reference_mismatch',
        'audit_metadata_mismatch',
      ],
    },
  ];

export const SYNTHETIC_FIXTURE_NAMES =
  SYNTHETIC_REGISTRY_VALIDATION_FIXTURES.map(
    (fixture) => fixture.name,
  );
