/**
 * Explicit evaluation-governance snapshot for Conversational Intelligence v2A.
 * Production persona/refusal-bank text is intentionally not imported here.
 */

import {
  CONVERSATIONAL_TASK_CLASSES,
  EVALUATION_ENVIRONMENT_ELIGIBILITY,
  MODEL_ASSIGNMENT_ROLES,
  PRODUCT_TASK_CLASS_IDS,
  RETRIEVAL_MODES,
  type EvaluationGovernanceSnapshot,
  type GovernanceSourceRef,
  type ModelAssignment,
  type ValidationResult,
} from './contracts';

export const CONVERSATIONAL_EVAL_GOVERNANCE_VERSION =
  'conversational-intelligence-v2a-governance-v2' as const;

function nonemptyBounded(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function createEvaluationGovernanceSnapshot(
  sourceRefs: readonly GovernanceSourceRef[],
): EvaluationGovernanceSnapshot {
  if (sourceRefs.length === 0) throw new Error('Evaluation governance requires explicit source references.');
  const ids = new Set<string>();
  for (const ref of sourceRefs) {
    if (!nonemptyBounded(ref.id, 128) || !nonemptyBounded(ref.locator, 512)) {
      throw new Error('Evaluation governance source references must be bounded and nonempty.');
    }
    if (ids.has(ref.id)) throw new Error(`Duplicate governance source reference: ${ref.id}`);
    ids.add(ref.id);
  }
  return {
    snapshotVersion: CONVERSATIONAL_EVAL_GOVERNANCE_VERSION,
    sourceRefs: [...sourceRefs],
    deterministicControlsAuthoritative: true,
    evidenceIsAuthority: false,
    modelDecisionAuthority: 'NONE',
    executionAuthority: 'NONE',
    fallbackPolicy: 'NONE',
    productionPersonaImported: false,
  };
}

export function validateModelAssignment(assignment: unknown): ValidationResult<ModelAssignment> {
  const issues: string[] = [];
  if (typeof assignment !== 'object' || assignment === null || Array.isArray(assignment)) {
    return { ok: false, value: null, issues: ['assignment must be an object'] };
  }
  const value = assignment as Record<string, unknown>;
  const expectedKeys = [
    'role', 'provider', 'model', 'taskClass', 'productTaskClassId', 'retrievalMode',
    'environmentEligibility', 'tools', 'fallback', 'authority',
  ];
  const unknownKeys = Object.keys(value).filter(key => !expectedKeys.includes(key));
  if (unknownKeys.length > 0) issues.push(`unknown assignment field(s): ${unknownKeys.join(', ')}`);
  if (!MODEL_ASSIGNMENT_ROLES.includes(value.role as never)) issues.push('assignment.role is invalid');
  if (!nonemptyBounded(value.provider, 256)) issues.push('assignment.provider is required');
  if (!nonemptyBounded(value.model, 256)) issues.push('assignment.model is required');
  if (!CONVERSATIONAL_TASK_CLASSES.includes(value.taskClass as never)) issues.push('assignment.taskClass is invalid');
  if (!PRODUCT_TASK_CLASS_IDS.includes(value.productTaskClassId as never)) issues.push('assignment.productTaskClassId is invalid');
  if (!RETRIEVAL_MODES.includes(value.retrievalMode as never)) issues.push('assignment.retrievalMode is invalid');
  if (!EVALUATION_ENVIRONMENT_ELIGIBILITY.includes(value.environmentEligibility as never)) issues.push('assignment.environmentEligibility must be LOCAL_SYNTHETIC_ONLY');
  if (!Array.isArray(value.tools) || value.tools.length !== 0) issues.push('v2A assignment.tools must be empty');
  if (value.fallback !== 'NONE') issues.push('v2A assignment.fallback must be NONE');
  if (value.authority !== 'NONE') issues.push('v2A assignment.authority must be NONE');
  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: assignment as ModelAssignment, issues: [] };
}
