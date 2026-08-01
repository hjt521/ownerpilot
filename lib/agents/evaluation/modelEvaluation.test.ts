/**
 * Deterministic tests for provider-neutral executive-agent evaluation.
 *
 * No network, provider, credential, environment variable, persistence,
 * customer data, or Production resource is used.
 */

import {
  MODEL_EVALUATION_DIMENSIONS,
  REQUIRED_OUTPUT_SECTIONS,
  compareModelEvaluationRuns,
  validateEvaluationModelCandidate,
  validateModelEvaluationCase,
  type EvaluationModelCandidate,
  type ModelEvaluationRunEvidence,
  type QualitativeFinding,
} from './modelEvaluation';
import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
  SYNTHETIC_MODEL_EVALUATION_CASE_IDS,
} from './__fixtures__/syntheticEvaluationCases';
import { REASONING_LEVELS } from '../../ai/modelRegistry';

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function issueCodes(
  result: ReturnType<typeof validateModelEvaluationCase>,
): readonly string[] {
  return result.ok
    ? []
    : result.issues.map(issue => issue.code);
}

const primaryCandidate: EvaluationModelCandidate = {
  providerId: 'synthetic-provider-primary',
  modelId: 'synthetic-model-primary',
  pinnedModelVersion: 'synthetic-version-2026-08-01-a',
  adapterId: 'synthetic-adapter',
  slot: 'primary',
  reasoningLevel: REASONING_LEVELS[0],
};

const challengerCandidate: EvaluationModelCandidate = {
  providerId: 'synthetic-provider-challenger',
  modelId: 'synthetic-model-challenger',
  pinnedModelVersion: 'synthetic-version-2026-08-01-b',
  adapterId: 'synthetic-adapter',
  slot: 'challenger',
  reasoningLevel: REASONING_LEVELS[0],
};

function buildRun(
  overrides: Partial<ModelEvaluationRunEvidence> & {
    candidate: EvaluationModelCandidate;
    runId: string;
  },
  findings: Partial<
    Record<
      (typeof MODEL_EVALUATION_DIMENSIONS)[number],
      QualitativeFinding
    >
  > = {},
): ModelEvaluationRunEvidence {
  const {
    runId,
    candidate,
    ...runOverrides
  } = overrides;

  return {
    runId,
    caseId: 'synthetic-cao-architecture-dissent-v1',
    roleId: 'executive.chief_architecture_officer',
    taskClass: 'architecture_analysis',
    candidate,
    promptVersion: 'synthetic-prompt-v1',
    startedAt: '2026-08-01T07:00:00.000Z',
    completedAt: '2026-08-01T07:00:01.000Z',
    outcome: 'completed',
    output: {
      facts: ['Synthetic fact.'],
      assumptions: ['Synthetic assumption.'],
      unknowns: ['Synthetic unknown.'],
      recommendations: ['Synthetic draft recommendation.'],
      dissent: ['Synthetic dissent preserved.'],
      requiredHumanDecisions: ['Founder decision required.'],
      prohibitedOrUnavailableActions: [
        'Repository write unavailable.',
      ],
      evidenceReferences: [
        'synthetic-architecture-option-a',
        'synthetic-architecture-option-b',
      ],
      escalationRequired: true,
      draftArtifact: 'Synthetic draft artifact.',
    },
    usage: {
      latencyMs: 1_000,
      inputTokens: 100,
      outputTokens: 200,
      estimatedCostMicros: 500,
    },
    dimensions: MODEL_EVALUATION_DIMENSIONS.map(
      dimension => ({
        dimension,
        finding: findings[dimension] ?? 'acceptable',
        rationale: `Synthetic observation for ${dimension}.`,
        evidenceReferences: [
          'synthetic-architecture-option-a',
        ],
      }),
    ),
    schemaValid: true,
    boundaryValid: true,
    refusalCorrect: true,
    dissentPreserved: true,
    uncertaintyPreserved: true,
    noSilentSubstitution: true,
    noAutomaticFallback: true,
    providerErrorClass: null,
    sanitizedFailureDetail: null,
    notes: [],
    ...runOverrides,
  };
}

function main(): void {
  console.log('\nEvaluation candidate validation');

  const validCandidate =
    validateEvaluationModelCandidate(primaryCandidate);

  check(
    'accepts a bounded synthetic pinned candidate',
    validCandidate.ok,
  );

  const movingAlias = validateEvaluationModelCandidate({
    ...primaryCandidate,
    pinnedModelVersion: 'model-latest',
  });

  check(
    'rejects a moving model alias',
    !movingAlias.ok &&
      movingAlias.issues.some(
        issue => issue.code === 'moving_model_alias',
      ),
  );

  const fallbackSlot = validateEvaluationModelCandidate({
    ...primaryCandidate,
    slot: 'fallback',
  });

  check(
    'evaluation comparison rejects fallback as a candidate slot',
    !fallbackSlot.ok &&
      fallbackSlot.issues.some(
        issue => issue.code === 'invalid_candidate_slot',
      ),
  );

  const blankProvider = validateEvaluationModelCandidate({
    ...primaryCandidate,
    providerId: '',
  });

  check(
    'rejects a missing provider identifier',
    !blankProvider.ok &&
      blankProvider.issues.some(
        issue =>
          issue.path === 'candidate.providerId' &&
          issue.code === 'missing_value',
      ),
  );

  console.log('\nSynthetic evaluation-case validation');

  check(
    'contains four synthetic role-boundary cases',
    SYNTHETIC_MODEL_EVALUATION_CASES.length === 4,
  );

  check(
    'synthetic case IDs are unique',
    new Set(SYNTHETIC_MODEL_EVALUATION_CASE_IDS).size ===
      SYNTHETIC_MODEL_EVALUATION_CASE_IDS.length,
  );

  for (const evaluationCase of
    SYNTHETIC_MODEL_EVALUATION_CASES) {
    const result =
      validateModelEvaluationCase(evaluationCase);

    check(
      `accepts ${evaluationCase.id}`,
      result.ok,
    );
  }

  check(
    'all required output sections are represented',
    SYNTHETIC_MODEL_EVALUATION_CASES.every(
      evaluationCase =>
        REQUIRED_OUTPUT_SECTIONS.every(section =>
          evaluationCase.requiredOutputSections.includes(
            section,
          ),
        ),
    ),
  );

  const baseCase =
    SYNTHETIC_MODEL_EVALUATION_CASES[0];

  const unknownRole = clone(
    baseCase,
  ) as unknown as Record<string, unknown>;

  unknownRole.roleId = 'executive.unauthorized_role';

  const unknownRoleResult =
    validateModelEvaluationCase(unknownRole);

  check(
    'rejects an unauthorized role',
    issueCodes(unknownRoleResult).includes(
      'unknown_role',
    ),
  );

  const unknownTask = clone(
    baseCase,
  ) as unknown as Record<string, unknown>;

  unknownTask.taskClass = 'unauthorized_task';

  const unknownTaskResult =
    validateModelEvaluationCase(unknownTask);

  check(
    'rejects an unknown task class',
    issueCodes(unknownTaskResult).includes(
      'unknown_task',
    ),
  );

  const roleTaskMismatch = clone(
    baseCase,
  ) as unknown as Record<string, unknown>;

  roleTaskMismatch.roleId = 'executive.ceo';
  roleTaskMismatch.taskClass = 'architecture_analysis';

  const roleTaskMismatchResult =
    validateModelEvaluationCase(roleTaskMismatch);

  check(
    'rejects a valid task that is not allowed for the role',
    issueCodes(roleTaskMismatchResult).includes(
      'task_not_allowed_for_role',
    ),
  );

  const missingEvidence = clone(
    baseCase,
  ) as unknown as Record<string, unknown>;

  missingEvidence.evidence = [];

  const missingEvidenceResult =
    validateModelEvaluationCase(missingEvidence);

  check(
    'rejects an evaluation case without evidence',
    issueCodes(missingEvidenceResult).includes(
      'missing_evidence',
    ),
  );

  const missingSection = clone(
    baseCase,
  ) as unknown as Record<string, unknown>;

  missingSection.requiredOutputSections =
    REQUIRED_OUTPUT_SECTIONS.filter(
      section => section !== 'dissent',
    );

  const missingSectionResult =
    validateModelEvaluationCase(missingSection);

  check(
    'rejects an evaluation case missing dissent output',
    issueCodes(missingSectionResult).includes(
      'missing_output_section',
    ),
  );

  console.log('\nQualitative model comparison');

  const primary = buildRun(
    {
      runId: 'synthetic-primary-run',
      candidate: primaryCandidate,
    },
    {
      structured_output: 'strong',
      instruction_following: 'acceptable',
      disagreement_preservation: 'strong',
    },
  );

  const challenger = buildRun(
    {
      runId: 'synthetic-challenger-run',
      candidate: challengerCandidate,
      usage: {
        latencyMs: 1_400,
        inputTokens: 110,
        outputTokens: 240,
        estimatedCostMicros: 700,
      },
    },
    {
      structured_output: 'acceptable',
      instruction_following: 'strong',
      disagreement_preservation: 'acceptable',
    },
  );

  const comparison =
    compareModelEvaluationRuns(primary, challenger);

  check(
    'comparison always requires human disposition',
    comparison.humanDecisionRequired === true &&
      comparison.disposition ===
        'human_review_required',
  );

  check(
    'comparison cannot automatically select a model',
    comparison.automaticSelection === false,
  );

  check(
    'qualitative dimensions remain separate',
    comparison.dimensions.length ===
      MODEL_EVALUATION_DIMENSIONS.length,
  );

  check(
    'primary may be stronger on one dimension',
    comparison.dimensions.some(
      dimension =>
        dimension.dimension ===
          'structured_output' &&
        dimension.comparison ===
          'primary_stronger',
    ),
  );

  check(
    'challenger may be stronger on another dimension',
    comparison.dimensions.some(
      dimension =>
        dimension.dimension ===
          'instruction_following' &&
        dimension.comparison ===
          'challenger_stronger',
    ),
  );

  check(
    'diagnostic latency delta is retained without controlling disposition',
    comparison.diagnosticMetrics.latencyDeltaMs ===
      400 &&
      comparison.automaticSelection === false,
  );

  check(
    'diagnostic cost delta is retained without producing a winner',
    comparison.diagnosticMetrics
      .estimatedCostDeltaMicros === 200 &&
      comparison.disposition ===
        'human_review_required',
  );

  check(
    'healthy comparison has no blocking finding',
    comparison.blockingFindings.length === 0,
  );

  const failedPrimary = buildRun(
    {
      runId: 'synthetic-primary-failed-run',
      candidate: primaryCandidate,
      schemaValid: false,
      boundaryValid: false,
      noSilentSubstitution: false,
      noAutomaticFallback: false,
      outcome: 'failed_schema',
    },
  );

  const failedComparison =
    compareModelEvaluationRuns(
      failedPrimary,
      challenger,
    );

  check(
    'schema failure is a blocking finding',
    failedComparison.blockingFindings.includes(
      'primary:structured_output_invalid',
    ),
  );

  check(
    'authority-boundary failure is a blocking finding',
    failedComparison.blockingFindings.includes(
      'primary:authority_boundary_failure',
    ),
  );

  check(
    'silent substitution is a blocking finding',
    failedComparison.blockingFindings.includes(
      'primary:silent_substitution_detected',
    ),
  );

  check(
    'automatic fallback is a blocking finding',
    failedComparison.blockingFindings.includes(
      'primary:automatic_fallback_detected',
    ),
  );

  let mismatchedCaseRejected = false;

  try {
    compareModelEvaluationRuns(
      primary,
      {
        ...challenger,
        caseId: 'different-case',
      },
    );
  } catch (error) {
    mismatchedCaseRejected =
      error instanceof Error &&
      error.message.includes(
        'matching case IDs',
      );
  }

  check(
    'comparison rejects mismatched evaluation cases',
    mismatchedCaseRejected,
  );

  let reversedSlotsRejected = false;

  try {
    compareModelEvaluationRuns(
      {
        ...primary,
        candidate: challengerCandidate,
      },
      challenger,
    );
  } catch (error) {
    reversedSlotsRejected =
      error instanceof Error &&
      error.message.includes(
        'primary slot',
      );
  }

  check(
    'comparison rejects an invalid primary slot',
    reversedSlotsRejected,
  );

  const productionDataTerms = JSON.stringify(
    SYNTHETIC_MODEL_EVALUATION_CASES,
  ).toLowerCase();

  check(
    'fixtures contain no customer or tenant records',
    !productionDataTerms.includes(
      'customer_record',
    ) &&
      !productionDataTerms.includes(
        'tenant_record',
      ),
  );

  console.log(
    `\n${'-'.repeat(56)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(56)}`,
  );

  if (failed > 0) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
