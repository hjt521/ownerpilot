/**
 * Restricted Chief Architecture Officer Preview registry entry.
 *
 * This entry is executable only after the separate fail-closed Preview gate
 * accepts a human-initiated request. It grants no Production eligibility,
 * persistence, tool use, fallback, provider substitution, automatic
 * continuation, or consequential authority.
 */

import {
  PROHIBITED_TOOL_PERMISSIONS,
  type RuntimeModelRegistryEntry,
} from '../ai/modelRegistry';

import {
  EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE,
} from './executiveAgentRegistry';

export const CAO_PREVIEW_REGISTRY_VERSION =
  'executive-agent-cao-preview-registry-v1' as const;

export const CAO_PREVIEW_APPROVAL_REFERENCE =
  'founder-omnibus-preview-integration-2026-08-02' as const;

export const CAO_PREVIEW_PRIMARY_PROVIDER_ID =
  'openai' as const;

export const CAO_PREVIEW_PRIMARY_MODEL_ID =
  'openai/gpt-5.6-terra' as const;

export const CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION =
  'openai/gpt-5.6-terra' as const;

export const CAO_PREVIEW_ADAPTER_ID =
  'vercel-ai-gateway-v1' as const;

export const CAO_PREVIEW_CHALLENGER_PROVIDER_ID =
  'anthropic' as const;

export const CAO_PREVIEW_CHALLENGER_MODEL_ID =
  'anthropic/claude-sonnet-5' as const;

export const CAO_PREVIEW_ALLOWED_TASK_CLASSES = [
  'architecture_analysis',
  'evaluation_only',
] as const;

export const CAO_PREVIEW_REGISTRY_ENTRY = {
  roleId:
    'executive.chief_architecture_officer',
  registryVersion:
    CAO_PREVIEW_REGISTRY_VERSION,
  charterVersion:
    EXECUTIVE_AGENT_CHARTER_VERSION_BY_ROLE[
      'executive.chief_architecture_officer'
    ],
  status: 'preview_approved',
  primaryModel: {
    providerId:
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    adapterId:
      CAO_PREVIEW_ADAPTER_ID,
    enabled: true,
    intendedUse: 'primary',
  },
  challengerModel: {
    providerId:
      CAO_PREVIEW_CHALLENGER_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_CHALLENGER_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_CHALLENGER_MODEL_ID,
    adapterId:
      CAO_PREVIEW_ADAPTER_ID,
    enabled: false,
    intendedUse: 'challenger',
  },
  fallbackModel: null,
  allowedTaskClasses:
    CAO_PREVIEW_ALLOWED_TASK_CLASSES,
  toolPermissions: {
    defaultEffect: 'deny',
    allowed: [],
    prohibited:
      PROHIBITED_TOOL_PERMISSIONS,
    approvalRequired: [],
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
    CAO_PREVIEW_APPROVAL_REFERENCE,
} as const satisfies RuntimeModelRegistryEntry;

export function getCaoPreviewRegistryEntry():
RuntimeModelRegistryEntry {
  return CAO_PREVIEW_REGISTRY_ENTRY;
}
