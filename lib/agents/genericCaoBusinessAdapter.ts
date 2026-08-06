/**
 * Business-neutral context boundary for specializing the Generic CAO.
 *
 * This module defines types and closed vocabularies only. It performs no
 * loading, parsing, compilation, generation, activation, model construction,
 * evidence retrieval, authorization, persistence, or execution.
 *
 * Supplied permissions and eligibility declarations are reference-only. Each
 * must trace to separately established governing authorization. The adapter
 * cannot create, expand, infer, or approve authority.
 */

import type {
  GenericCaoGoverningReference,
} from './genericCaoContract';

export const GENERIC_CAO_BUSINESS_ADAPTER_VERSION =
  'generic-cao-business-adapter-v1' as const;

export const GENERIC_CAO_BUSINESS_CONTEXT_CATEGORIES = [
  'enterprise_identity',
  'executive_identity',
  'governing_references',
  'role_charter',
  'task_classes',
  'approved_evidence_scope',
  'vocabulary',
  'business_capabilities',
  'legal_restrictions',
  'jurisdictional_restrictions',
  'model_requirements',
  'environment_eligibility',
  'audit_requirements',
  'human_approval_requirements',
] as const;

export type GenericCaoBusinessContextCategory =
  (typeof GENERIC_CAO_BUSINESS_CONTEXT_CATEGORIES)[number];

export interface GenericCaoRoleCharterReference {
  charterId: string;
  charterVersion: string;
  governingReferenceIds: readonly string[];
  mandate: readonly string[];
  permittedOutputKinds: readonly string[];
  escalationConditions: readonly string[];
}

export interface GenericCaoAuthorizedTaskClassReference {
  taskClass: string;
  authoritySourceReferences: readonly string[];
  advisoryOnly: true;
  grantedByAdapter: false;
}

export interface GenericCaoEvidenceScopeReference {
  scopeId: string;
  sourceKinds: readonly string[];
  sourceReferences: readonly string[];
  classificationRequirements: readonly string[];
  integrityRequirements: readonly string[];
  unavailableEvidencePolicy:
    | 'reject'
    | 'escalate'
    | 'reject_or_escalate';
  authoritySourceReferences: readonly string[];
}

export interface GenericCaoVocabularyEntry {
  conceptId: string;
  preferredLabel: string;
  alternateLabels: readonly string[];
  prohibitedLabels: readonly string[];
}

export interface GenericCaoBusinessCapabilityReference {
  capabilityId: string;
  description: string;
  permittedAdvisoryUses: readonly string[];
  prohibitedUses: readonly string[];
  authoritySourceReferences: readonly string[];
  grantedByAdapter: false;
}

export interface GenericCaoRestrictionReference {
  restrictionId: string;
  category:
    | 'business'
    | 'legal'
    | 'jurisdictional'
    | 'operational'
    | 'governance';
  description: string;
  prohibitedActionClasses: readonly string[];
  escalationConditions: readonly string[];
  governingReferenceIds: readonly string[];
}

export interface GenericCaoModelRequirementReference {
  requirementId: string;
  eligibleModelIdentifiers: readonly string[];
  pinnedVersionRequired: boolean;
  substitutionPolicyReference: string | null;
  fallbackPolicyReference: string | null;
  reasoningRequirements: readonly string[];
  authoritySourceReferences: readonly string[];
  credentialsIncluded: false;
  transportConfigurationIncluded: false;
}

export interface GenericCaoEnvironmentEligibilityReference {
  environmentId: string;
  eligible: boolean;
  conditions: readonly string[];
  authoritySourceReferences: readonly string[];
  activatedByAdapter: false;
}

export interface GenericCaoAuditRequirements {
  requiredFields: readonly string[];
  requiredTraceabilityReferences: readonly string[];
  prohibitedContent: readonly string[];
  retentionPolicyReference: string | null;
}

export interface GenericCaoHumanApprovalRequirements {
  explicitHumanInitiationRequired: boolean;
  approvalRoleReferences: readonly string[];
  allowedDispositionClasses: readonly string[];
  noApprovalBySilence: boolean;
  authoritySourceReferences: readonly string[];
}

export interface GenericCaoBusinessAdapterContract {
  adapterVersion:
    typeof GENERIC_CAO_BUSINESS_ADAPTER_VERSION;
  enterpriseIdentity: string;
  executiveIdentity: string;
  governingReferences:
    readonly GenericCaoGoverningReference[];
  roleCharter:
    GenericCaoRoleCharterReference;
  taskClasses:
    readonly GenericCaoAuthorizedTaskClassReference[];
  approvedEvidenceScopes:
    readonly GenericCaoEvidenceScopeReference[];
  vocabulary:
    readonly GenericCaoVocabularyEntry[];
  businessCapabilities:
    readonly GenericCaoBusinessCapabilityReference[];
  restrictions:
    readonly GenericCaoRestrictionReference[];
  modelRequirements:
    readonly GenericCaoModelRequirementReference[];
  environmentEligibility:
    readonly GenericCaoEnvironmentEligibilityReference[];
  auditRequirements:
    GenericCaoAuditRequirements;
  humanApprovalRequirements:
    GenericCaoHumanApprovalRequirements;
  authoritySourceReferences: readonly string[];
  authorityGrantingMode: 'reference_only';
  adapterGrantsAuthority: false;
  runtimeConstructionAllowed: false;
  automaticActivationAllowed: false;
}
