export const CAO_WORKBENCH_LABELS = [
  'NONCANONICAL',
  'ADVISORY',
  'DRAFT-ONLY',
  'HUMAN REVIEW REQUIRED',
  'NO IMPLEMENTATION AUTHORITY',
  'NO PRODUCTION AUTHORITY',
] as const;

export const CAO_WORKBENCH_DISPOSITIONS = [
  'acceptable',
  'acceptable_with_revisions',
  'incomplete',
  'architecturally_unsafe',
  'blocked_pending_evidence',
  'requires_founder_decision',
] as const;

export type CaoWorkbenchDisposition =
  (typeof CAO_WORKBENCH_DISPOSITIONS)[number];

export interface CaoEvidenceCitation {
  path: string;
  sourceCommit: string;
  sha256: string;
  immutableReference: string;
}

export interface CaoArchitectureOption {
  name: string;
  description: string;
  tradeoffs: readonly string[];
  securityConsequences: readonly string[];
  authorityConsequences: readonly string[];
}

export interface CaoFileImplementationItem {
  path: string;
  action: 'add' | 'modify' | 'preserve' | 'retire';
  purpose: string;
  dependencies: readonly string[];
}

export interface CaoWorkbenchOutput {
  labels: typeof CAO_WORKBENCH_LABELS;
  disposition: CaoWorkbenchDisposition;
  executiveSummary: string;
  objective: string;
  evidenceReviewed: readonly CaoEvidenceCitation[];
  sourceCommit: string;
  evidenceLimitations: readonly string[];
  currentStateFindings: readonly string[];
  targetStateInterpretation: readonly string[];
  architectureOptions: readonly CaoArchitectureOption[];
  tradeoffs: readonly string[];
  recommendedArchitecture: string;
  recommendationConfidence: 'high' | 'moderate' | 'low' | 'insufficient_evidence';
  confidenceRationale: string;
  securityAndAuthorityBoundaries: readonly string[];
  dependencies: readonly string[];
  fileLevelImplementationMap: readonly CaoFileImplementationItem[];
  testStrategy: readonly string[];
  rolloutPlan: readonly string[];
  rollbackPlan: readonly string[];
  risks: readonly string[];
  unknowns: readonly string[];
  dissentOrCompetingInterpretation: readonly string[];
  founderDecisionsRequired: readonly string[];
  engineeringHandoff: readonly string[];
  autonomousContinuationProhibited: true;
}

export interface CaoWorkbenchValidationResult {
  ok: boolean;
  value: CaoWorkbenchOutput | null;
  issues: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max = 20_000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function boundedStringArray(value: unknown, maxItems = 64): value is readonly string[] {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every(item => boundedString(item, 4_000));
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

const OUTPUT_KEYS = [
  'labels',
  'disposition',
  'executiveSummary',
  'objective',
  'evidenceReviewed',
  'sourceCommit',
  'evidenceLimitations',
  'currentStateFindings',
  'targetStateInterpretation',
  'architectureOptions',
  'tradeoffs',
  'recommendedArchitecture',
  'recommendationConfidence',
  'confidenceRationale',
  'securityAndAuthorityBoundaries',
  'dependencies',
  'fileLevelImplementationMap',
  'testStrategy',
  'rolloutPlan',
  'rollbackPlan',
  'risks',
  'unknowns',
  'dissentOrCompetingInterpretation',
  'founderDecisionsRequired',
  'engineeringHandoff',
  'autonomousContinuationProhibited',
] as const;

function validEvidence(value: unknown): value is CaoEvidenceCitation {
  return isRecord(value) &&
    exactKeys(value, ['path', 'sourceCommit', 'sha256', 'immutableReference']) &&
    boundedString(value.path, 512) &&
    /^[a-f0-9]{40}$/i.test(String(value.sourceCommit)) &&
    /^[a-f0-9]{64}$/i.test(String(value.sha256)) &&
    boundedString(value.immutableReference, 2_048);
}

function validOption(value: unknown): value is CaoArchitectureOption {
  return isRecord(value) &&
    exactKeys(value, ['name', 'description', 'tradeoffs', 'securityConsequences', 'authorityConsequences']) &&
    boundedString(value.name, 256) &&
    boundedString(value.description) &&
    boundedStringArray(value.tradeoffs) &&
    boundedStringArray(value.securityConsequences) &&
    boundedStringArray(value.authorityConsequences);
}

function validFileItem(value: unknown): value is CaoFileImplementationItem {
  return isRecord(value) &&
    exactKeys(value, ['path', 'action', 'purpose', 'dependencies']) &&
    boundedString(value.path, 512) &&
    ['add', 'modify', 'preserve', 'retire'].includes(String(value.action)) &&
    boundedString(value.purpose) &&
    boundedStringArray(value.dependencies);
}

export function validateCaoWorkbenchOutput(input: unknown): CaoWorkbenchValidationResult {
  const issues: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, value: null, issues: ['output:not_object'] };
  }

  if (!exactKeys(input, OUTPUT_KEYS)) issues.push('output:unexpected_or_missing_keys');
  if (JSON.stringify(input.labels) !== JSON.stringify(CAO_WORKBENCH_LABELS)) issues.push('labels:invalid');
  if (!CAO_WORKBENCH_DISPOSITIONS.includes(input.disposition as CaoWorkbenchDisposition)) issues.push('disposition:invalid');

  for (const key of ['executiveSummary', 'objective', 'recommendedArchitecture', 'confidenceRationale'] as const) {
    if (!boundedString(input[key])) issues.push(`${key}:invalid`);
  }

  if (!/^[a-f0-9]{40}$/i.test(String(input.sourceCommit))) issues.push('sourceCommit:invalid');
  if (!['high', 'moderate', 'low', 'insufficient_evidence'].includes(String(input.recommendationConfidence))) issues.push('recommendationConfidence:invalid');
  if (input.autonomousContinuationProhibited !== true) issues.push('autonomousContinuationProhibited:must_be_true');

  const arrays = [
    'evidenceLimitations', 'currentStateFindings', 'targetStateInterpretation', 'tradeoffs',
    'securityAndAuthorityBoundaries', 'dependencies', 'testStrategy', 'rolloutPlan',
    'rollbackPlan', 'risks', 'unknowns', 'dissentOrCompetingInterpretation',
    'founderDecisionsRequired', 'engineeringHandoff',
  ] as const;

  for (const key of arrays) {
    if (!boundedStringArray(input[key])) issues.push(`${key}:invalid`);
  }

  if (!Array.isArray(input.evidenceReviewed) || input.evidenceReviewed.length === 0 || input.evidenceReviewed.length > 16 || !input.evidenceReviewed.every(validEvidence)) {
    issues.push('evidenceReviewed:invalid');
  }

  if (!Array.isArray(input.architectureOptions) || input.architectureOptions.length < 2 || input.architectureOptions.length > 8 || !input.architectureOptions.every(validOption)) {
    issues.push('architectureOptions:invalid');
  }

  if (!Array.isArray(input.fileLevelImplementationMap) || input.fileLevelImplementationMap.length === 0 || input.fileLevelImplementationMap.length > 64 || !input.fileLevelImplementationMap.every(validFileItem)) {
    issues.push('fileLevelImplementationMap:invalid');
  }

  const evidence = Array.isArray(input.evidenceReviewed) ? input.evidenceReviewed : [];
  if (evidence.some(item => isRecord(item) && item.sourceCommit !== input.sourceCommit)) {
    issues.push('evidenceReviewed:source_commit_mismatch');
  }

  if (issues.length > 0) return { ok: false, value: null, issues };
  return { ok: true, value: input as unknown as CaoWorkbenchOutput, issues: [] };
}
