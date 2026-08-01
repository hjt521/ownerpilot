/**
 * Provider-neutral executive-agent evaluation contracts.
 *
 * This module supports synthetic and approved evidence-based comparison.
 * It does not select a provider, configure an executable registry entry,
 * call a model, read environment variables, persist data, or activate an agent.
 *
 * Numeric measurements are diagnostic only. No composite score, model vote,
 * or automatic winner controls a material recommendation.
 */

import {
  REASONING_LEVELS,
  type ExecutiveRoleId,
  type ReasoningLevel,
  type TaskClass,
  isExecutiveRoleId,
  isTaskAllowedForRole,
  isTaskClass,
} from '../../ai/modelRegistry';

export const MODEL_EVALUATION_DIMENSIONS = [
  'structured_output',
  'instruction_following',
  'reasoning_quality',
  'evidence_grounding',
  'disagreement_preservation',
  'uncertainty_preservation',
  'refusal_behavior',
  'failure_handling',
] as const;

export type ModelEvaluationDimension =
  (typeof MODEL_EVALUATION_DIMENSIONS)[number];

export const QUALITATIVE_FINDINGS = [
  'strong',
  'acceptable',
  'weak',
  'failed',
  'not_observed',
] as const;

export type QualitativeFinding =
  (typeof QUALITATIVE_FINDINGS)[number];

export const EVALUATION_RUN_OUTCOMES = [
  'completed',
  'refused_as_required',
  'blocked_boundary',
  'failed_schema',
  'failed_provider',
  'failed_timeout',
  'failed_limit',
] as const;

export type EvaluationRunOutcome =
  (typeof EVALUATION_RUN_OUTCOMES)[number];

export const EVALUATION_CANDIDATE_SLOTS = [
  'primary',
  'challenger',
] as const;

export type EvaluationCandidateSlot =
  (typeof EVALUATION_CANDIDATE_SLOTS)[number];

export const EVALUATION_EVIDENCE_SOURCE_KINDS = [
  'repository',
  'approved_document',
  'synthetic_fixture',
  'sanitized_preview_log',
] as const;

export type EvaluationEvidenceSourceKind =
  (typeof EVALUATION_EVIDENCE_SOURCE_KINDS)[number];

export const REQUIRED_OUTPUT_SECTIONS = [
  'facts',
  'assumptions',
  'unknowns',
  'recommendations',
  'dissent',
  'required_human_decisions',
  'prohibited_or_unavailable_actions',
  'evidence_references',
] as const;

export type RequiredOutputSection =
  (typeof REQUIRED_OUTPUT_SECTIONS)[number];

export interface EvaluationModelCandidate {
  providerId: string;
  modelId: string;
  pinnedModelVersion: string;
  adapterId: string;
  slot: EvaluationCandidateSlot;
  reasoningLevel: ReasoningLevel;
}

export interface EvaluationEvidenceReference {
  id: string;
  sourceKind: EvaluationEvidenceSourceKind;
  locator: string;
  description: string;
}

export interface EvaluationExpectedBehavior {
  mustRefuseProhibitedAction: boolean;
  mustEscalateOnIncompleteEvidence: boolean;
  mustPreserveDissent: boolean;
  requiredEvidenceReferenceIds: readonly string[];
  requiredProhibitedActionLabels: readonly string[];
}

export interface ModelEvaluationCase {
  id: string;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  title: string;
  humanRequest: string;
  evidence: readonly EvaluationEvidenceReference[];
  requiredOutputSections: readonly RequiredOutputSection[];
  prohibitedActions: readonly string[];
  expectedBehavior: EvaluationExpectedBehavior;
}

export interface ExecutiveAgentDraftOutput {
  facts: readonly string[];
  assumptions: readonly string[];
  unknowns: readonly string[];
  recommendations: readonly string[];
  dissent: readonly string[];
  requiredHumanDecisions: readonly string[];
  prohibitedOrUnavailableActions: readonly string[];
  evidenceReferences: readonly string[];
  escalationRequired: boolean;
  draftArtifact: string;
}

export interface EvaluationUsage {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
}

export interface DimensionObservation {
  dimension: ModelEvaluationDimension;
  finding: QualitativeFinding;
  rationale: string;
  evidenceReferences: readonly string[];
}

export interface ModelEvaluationRunEvidence {
  runId: string;
  caseId: string;
  roleId: ExecutiveRoleId;
  taskClass: TaskClass;
  candidate: EvaluationModelCandidate;
  promptVersion: string;
  startedAt: string;
  completedAt: string;
  outcome: EvaluationRunOutcome;
  output: ExecutiveAgentDraftOutput | null;
  usage: EvaluationUsage;
  dimensions: readonly DimensionObservation[];
  schemaValid: boolean;
  boundaryValid: boolean;
  refusalCorrect: boolean;
  dissentPreserved: boolean;
  uncertaintyPreserved: boolean;
  noSilentSubstitution: boolean;
  noAutomaticFallback: boolean;
  providerErrorClass: string | null;
  sanitizedFailureDetail: string | null;
  notes: readonly string[];
}

export const DIMENSION_COMPARISONS = [
  'primary_stronger',
  'challenger_stronger',
  'equivalent',
  'inconclusive',
] as const;

export type DimensionComparison =
  (typeof DIMENSION_COMPARISONS)[number];

export interface DimensionComparisonRecord {
  dimension: ModelEvaluationDimension;
  primaryFinding: QualitativeFinding;
  challengerFinding: QualitativeFinding;
  comparison: DimensionComparison;
  rationale: string;
}

export interface DiagnosticMetricComparison {
  primaryLatencyMs: number;
  challengerLatencyMs: number;
  latencyDeltaMs: number;
  primaryInputTokens: number;
  challengerInputTokens: number;
  inputTokenDelta: number;
  primaryOutputTokens: number;
  challengerOutputTokens: number;
  outputTokenDelta: number;
  primaryEstimatedCostMicros: number;
  challengerEstimatedCostMicros: number;
  estimatedCostDeltaMicros: number;
}

export interface ModelEvaluationComparison {
  caseId: string;
  primaryRunId: string;
  challengerRunId: string;
  dimensions: readonly DimensionComparisonRecord[];
  diagnosticMetrics: DiagnosticMetricComparison;
  blockingFindings: readonly string[];
  humanDecisionRequired: true;
  automaticSelection: false;
  disposition: 'human_review_required';
}

export interface ModelEvaluationValidationIssue {
  path: string;
  code:
    | 'invalid_type'
    | 'missing_value'
    | 'unknown_role'
    | 'unknown_task'
    | 'task_not_allowed_for_role'
    | 'moving_model_alias'
    | 'invalid_candidate_slot'
    | 'invalid_reasoning_level'
    | 'missing_evidence'
    | 'missing_output_section'
    | 'invalid_comparison';
  message: string;
}

export type ModelEvaluationValidationResult<T> =
  | {
      ok: true;
      value: T;
      issues: readonly [];
    }
  | {
      ok: false;
      value: null;
      issues: readonly ModelEvaluationValidationIssue[];
    };

const MOVING_ALIAS_PATTERN =
  /(?:^|[/:@._-])(latest|current|stable|default|rolling|canary|nightly|head)(?:$|[/:@._-])/i;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonemptyBoundedString(
  value: unknown,
  maximumLength = 2_000,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function includesLiteral(
  values: readonly string[],
  candidate: unknown,
): candidate is string {
  return (
    typeof candidate === 'string' &&
    values.includes(candidate)
  );
}

function issue(
  issues: ModelEvaluationValidationIssue[],
  path: string,
  code: ModelEvaluationValidationIssue['code'],
  message: string,
): void {
  issues.push({
    path,
    code,
    message,
  });
}

export function isModelEvaluationDimension(
  candidate: string,
): candidate is ModelEvaluationDimension {
  return MODEL_EVALUATION_DIMENSIONS.includes(
    candidate as ModelEvaluationDimension,
  );
}

export function isQualitativeFinding(
  candidate: string,
): candidate is QualitativeFinding {
  return QUALITATIVE_FINDINGS.includes(
    candidate as QualitativeFinding,
  );
}

export function validateEvaluationModelCandidate(
  input: unknown,
): ModelEvaluationValidationResult<EvaluationModelCandidate> {
  const issues: ModelEvaluationValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [
        {
          path: 'candidate',
          code: 'invalid_type',
          message: 'Expected a model-candidate object.',
        },
      ],
    };
  }

  for (const key of [
    'providerId',
    'modelId',
    'pinnedModelVersion',
    'adapterId',
  ] as const) {
    if (!isNonemptyBoundedString(input[key], 256)) {
      issue(
        issues,
        `candidate.${key}`,
        'missing_value',
        `${key} must be a nonempty bounded string.`,
      );
    }
  }

  if (
    typeof input.pinnedModelVersion === 'string' &&
    MOVING_ALIAS_PATTERN.test(input.pinnedModelVersion)
  ) {
    issue(
      issues,
      'candidate.pinnedModelVersion',
      'moving_model_alias',
      'The model version must be pinned and cannot use a moving alias.',
    );
  }

  if (
    !includesLiteral(
      EVALUATION_CANDIDATE_SLOTS,
      input.slot,
    )
  ) {
    issue(
      issues,
      'candidate.slot',
      'invalid_candidate_slot',
      'Evaluation candidates must be primary or challenger.',
    );
  }

  if (!includesLiteral(REASONING_LEVELS, input.reasoningLevel)) {
    issue(
      issues,
      'candidate.reasoningLevel',
      'invalid_reasoning_level',
      'Unknown reasoning level.',
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value: input as unknown as EvaluationModelCandidate,
    issues: [],
  };
}

export function validateModelEvaluationCase(
  input: unknown,
): ModelEvaluationValidationResult<ModelEvaluationCase> {
  const issues: ModelEvaluationValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      value: null,
      issues: [
        {
          path: 'evaluationCase',
          code: 'invalid_type',
          message: 'Expected an evaluation-case object.',
        },
      ],
    };
  }

  if (!isNonemptyBoundedString(input.id, 256)) {
    issue(
      issues,
      'evaluationCase.id',
      'missing_value',
      'Evaluation case ID is required.',
    );
  }

  let roleId: ExecutiveRoleId | null = null;

  if (
    typeof input.roleId !== 'string' ||
    !isExecutiveRoleId(input.roleId)
  ) {
    issue(
      issues,
      'evaluationCase.roleId',
      'unknown_role',
      'Only approved executive roles are eligible.',
    );
  } else {
    roleId = input.roleId;
  }

  let taskClass: TaskClass | null = null;

  if (
    typeof input.taskClass !== 'string' ||
    !isTaskClass(input.taskClass)
  ) {
    issue(
      issues,
      'evaluationCase.taskClass',
      'unknown_task',
      'Unknown task classes are denied.',
    );
  } else {
    taskClass = input.taskClass;
  }

  if (
    roleId !== null &&
    taskClass !== null &&
    !isTaskAllowedForRole(roleId, taskClass)
  ) {
    issue(
      issues,
      'evaluationCase.taskClass',
      'task_not_allowed_for_role',
      `Task ${taskClass} is not allowed for ${roleId}.`,
    );
  }

  for (const key of [
    'title',
    'humanRequest',
  ] as const) {
    if (!isNonemptyBoundedString(input[key])) {
      issue(
        issues,
        `evaluationCase.${key}`,
        'missing_value',
        `${key} is required.`,
      );
    }
  }

  if (
    !Array.isArray(input.evidence) ||
    input.evidence.length === 0
  ) {
    issue(
      issues,
      'evaluationCase.evidence',
      'missing_evidence',
      'At least one approved or synthetic evidence reference is required.',
    );
  }

  if (!Array.isArray(input.requiredOutputSections)) {
    issue(
      issues,
      'evaluationCase.requiredOutputSections',
      'invalid_type',
      'Expected required output sections.',
    );
  } else {
    for (const section of REQUIRED_OUTPUT_SECTIONS) {
      if (!input.requiredOutputSections.includes(section)) {
        issue(
          issues,
          'evaluationCase.requiredOutputSections',
          'missing_output_section',
          `Required output section is missing: ${section}.`,
        );
      }
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      value: null,
      issues,
    };
  }

  return {
    ok: true,
    value: input as unknown as ModelEvaluationCase,
    issues: [],
  };
}

export function assertValidModelEvaluationCase(
  input: unknown,
): ModelEvaluationCase {
  const result = validateModelEvaluationCase(input);

  if (!result.ok) {
    throw new Error(
      `Invalid model evaluation case: ${result.issues
        .map(item => `${item.path}:${item.code}`)
        .join(', ')}`,
    );
  }

  return result.value;
}

function compareFinding(
  primary: QualitativeFinding,
  challenger: QualitativeFinding,
): DimensionComparison {
  if (primary === challenger) {
    return primary === 'not_observed'
      ? 'inconclusive'
      : 'equivalent';
  }

  if (
    primary === 'not_observed' ||
    challenger === 'not_observed'
  ) {
    return 'inconclusive';
  }

  if (primary === 'failed') {
    return 'challenger_stronger';
  }

  if (challenger === 'failed') {
    return 'primary_stronger';
  }

  if (primary === 'strong') {
    return 'primary_stronger';
  }

  if (challenger === 'strong') {
    return 'challenger_stronger';
  }

  if (
    primary === 'acceptable' &&
    challenger === 'weak'
  ) {
    return 'primary_stronger';
  }

  if (
    challenger === 'acceptable' &&
    primary === 'weak'
  ) {
    return 'challenger_stronger';
  }

  return 'inconclusive';
}

function findingForDimension(
  run: ModelEvaluationRunEvidence,
  dimension: ModelEvaluationDimension,
): QualitativeFinding {
  const observation = run.dimensions.find(
    item => item.dimension === dimension,
  );

  return observation?.finding ?? 'not_observed';
}

function blockingFindings(
  run: ModelEvaluationRunEvidence,
  label: 'primary' | 'challenger',
): string[] {
  const findings: string[] = [];

  if (!run.schemaValid) {
    findings.push(`${label}:structured_output_invalid`);
  }

  if (!run.boundaryValid) {
    findings.push(`${label}:authority_boundary_failure`);
  }

  if (!run.noSilentSubstitution) {
    findings.push(`${label}:silent_substitution_detected`);
  }

  if (!run.noAutomaticFallback) {
    findings.push(`${label}:automatic_fallback_detected`);
  }

  if (
    run.outcome !== 'completed' &&
    run.outcome !== 'refused_as_required'
  ) {
    findings.push(`${label}:outcome:${run.outcome}`);
  }

  return findings;
}

export function compareModelEvaluationRuns(
  primary: ModelEvaluationRunEvidence,
  challenger: ModelEvaluationRunEvidence,
): ModelEvaluationComparison {
  if (primary.caseId !== challenger.caseId) {
    throw new Error(
      'Model evaluation comparison requires matching case IDs.',
    );
  }

  if (primary.candidate.slot !== 'primary') {
    throw new Error(
      'Primary evaluation evidence must use the primary slot.',
    );
  }

  if (challenger.candidate.slot !== 'challenger') {
    throw new Error(
      'Challenger evaluation evidence must use the challenger slot.',
    );
  }

  const dimensions =
    MODEL_EVALUATION_DIMENSIONS.map(dimension => {
      const primaryFinding =
        findingForDimension(primary, dimension);
      const challengerFinding =
        findingForDimension(challenger, dimension);
      const comparison = compareFinding(
        primaryFinding,
        challengerFinding,
      );

      return {
        dimension,
        primaryFinding,
        challengerFinding,
        comparison,
        rationale:
          comparison === 'inconclusive'
            ? 'Evidence is incomplete or not directly comparable.'
            : `Qualitative comparison: ${comparison}.`,
      } satisfies DimensionComparisonRecord;
    });

  return {
    caseId: primary.caseId,
    primaryRunId: primary.runId,
    challengerRunId: challenger.runId,
    dimensions,
    diagnosticMetrics: {
      primaryLatencyMs: primary.usage.latencyMs,
      challengerLatencyMs: challenger.usage.latencyMs,
      latencyDeltaMs:
        challenger.usage.latencyMs -
        primary.usage.latencyMs,
      primaryInputTokens: primary.usage.inputTokens,
      challengerInputTokens:
        challenger.usage.inputTokens,
      inputTokenDelta:
        challenger.usage.inputTokens -
        primary.usage.inputTokens,
      primaryOutputTokens: primary.usage.outputTokens,
      challengerOutputTokens:
        challenger.usage.outputTokens,
      outputTokenDelta:
        challenger.usage.outputTokens -
        primary.usage.outputTokens,
      primaryEstimatedCostMicros:
        primary.usage.estimatedCostMicros,
      challengerEstimatedCostMicros:
        challenger.usage.estimatedCostMicros,
      estimatedCostDeltaMicros:
        challenger.usage.estimatedCostMicros -
        primary.usage.estimatedCostMicros,
    },
    blockingFindings: [
      ...blockingFindings(primary, 'primary'),
      ...blockingFindings(challenger, 'challenger'),
    ],
    humanDecisionRequired: true,
    automaticSelection: false,
    disposition: 'human_review_required',
  };
}
