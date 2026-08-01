/**
 * Draft executive-agent model-registry entries.
 *
 * These entries record a human-review recommendation only. Every entry and
 * assignment is disabled, remains non-executable, and creates no Preview or
 * Production activation, provider call, persistence, or fallback authority.
 */

import {
  PROHIBITED_TOOL_PERMISSIONS,
  ROLE_ALLOWED_TASK_CLASSES,
  ROLE_ALLOWED_TOOL_PERMISSIONS,
  type ExecutiveRoleId,
  type ModelAssignment,
  type RuntimeModelRegistryEntry,
} from '../ai/modelRegistry';

export const EXECUTIVE_AGENT_REGISTRY_VERSION =
  'executive-agent-registry-draft-v1' as const;

export const EXECUTIVE_AGENT_REGISTRY_APPROVAL_REFERENCE =
  'founder-omnibus-authorization-2026-08-01' as const;

export const EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE = {
  'executive.ceo':
    'git-blob:b50d3e94858d433a89c96acacdcc671f1aebdd93',
  'executive.chief_of_staff':
    'git-blob:d2ace2a51af3616e97551cd2e473b1483222915c',
  'executive.chief_architecture_officer':
    'git-blob:bec2ba6e9fcf35a473eacebb3b2d1211486827a3',
} as const satisfies Readonly<
  Record<ExecutiveRoleId, string>
>;

const PROPOSED_PRIMARY_MODEL: ModelAssignment = {
  providerId: 'openai',
  modelId: 'openai/gpt-5.6-terra',
  pinnedModelVersion: 'openai/gpt-5.6-terra',
  adapterId: 'vercel-ai-gateway-v1',
  enabled: false,
  intendedUse: 'primary',
};

const PROPOSED_CHALLENGER_MODEL: ModelAssignment = {
  providerId: 'anthropic',
  modelId: 'anthropic/claude-sonnet-5',
  pinnedModelVersion: 'anthropic/claude-sonnet-5',
  adapterId: 'vercel-ai-gateway-v1',
  enabled: false,
  intendedUse: 'challenger',
};

function draftEntry(
  roleId: ExecutiveRoleId,
): RuntimeModelRegistryEntry {
  const allowedTools =
    ROLE_ALLOWED_TOOL_PERMISSIONS[roleId];

  return {
    roleId,
    registryVersion:
      EXECUTIVE_AGENT_REGISTRY_VERSION,
    charterVersion:
      EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE[
        roleId
      ],
    status: 'draft',
    primaryModel: {
      ...PROPOSED_PRIMARY_MODEL,
    },
    challengerModel: {
      ...PROPOSED_CHALLENGER_MODEL,
    },
    fallbackModel: null,
    allowedTaskClasses:
      ROLE_ALLOWED_TASK_CLASSES[roleId],
    toolPermissions: {
      defaultEffect: 'deny',
      allowed: allowedTools,
      prohibited: PROHIBITED_TOOL_PERMISSIONS,
      approvalRequired: allowedTools.filter(
        permission =>
          permission.startsWith('draft.'),
      ),
    },
    reasoningLevel: 'standard',
    limits: {
      hardTimeoutMs: 120_000,
      targetP95LatencyMs: 30_000,
      maximumInputTokens: 12_000,
      maximumOutputTokens: 4_000,
      maximumEstimatedCostMicrosPerRun:
        100_000,
      maximumEstimatedCostMicrosPerDay:
        1_000_000,
    },
    humanApprovalRequirements: {
      explicitHumanInitiationRequired: true,
      founderApprovalRequired: true,
      outputDisposition: 'draft_only',
      noApprovalBySilence: true,
    },
    providerSubstitutionPolicy: {
      mode:
        'prohibited_without_founder_approval',
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
      EXECUTIVE_AGENT_REGISTRY_APPROVAL_REFERENCE,
  };
}

export const DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES =
  [
    draftEntry('executive.ceo'),
    draftEntry('executive.chief_of_staff'),
    draftEntry(
      'executive.chief_architecture_officer',
    ),
  ] as const;

export function getDraftExecutiveAgentRegistryEntry(
  roleId: ExecutiveRoleId,
): RuntimeModelRegistryEntry {
  const entry =
    DRAFT_EXECUTIVE_AGENT_REGISTRY_ENTRIES.find(
      candidate =>
        candidate.roleId === roleId,
    );

  if (entry === undefined) {
    throw new Error(
      `No draft registry entry exists for ${roleId}.`,
    );
  }

  return entry;
}
