/**
 * Deterministic local evaluation-suite tests.
 *
 * No network, provider lookup, credentials, environment variables,
 * persistence, customer data, or Production resources are used.
 */

import { MockLanguageModelV3 } from 'ai/test';
import {
  runEvaluationSuite,
  type EvaluationSuiteOptions,
} from './evaluationSuite';
import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from './__fixtures__/syntheticEvaluationCases';
import {
  REASONING_LEVELS,
} from '../../ai/modelRegistry';
import type {
  EvaluationModelCandidate,
  ModelEvaluationCase,
} from './modelEvaluation';

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

function mockGeneration(
  text: string,
  inputTokens: number,
  outputTokens: number,
) {
  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
    finishReason: {
      unified: 'stop' as const,
      raw: undefined,
    },
    usage: {
      inputTokens: {
        total: inputTokens,
        noCache: inputTokens,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: outputTokens,
        text: outputTokens,
        reasoning: undefined,
      },
    },
    warnings: [],
  };
}

function validOutput(
  evaluationCase: ModelEvaluationCase,
  preserveDissent = true,
) {
  return {
    facts: [
      'Synthetic fact grounded in supplied evidence.',
    ],
    assumptions: [
      'Synthetic assumption for human review.',
    ],
    unknowns: [
      'Synthetic unknown remains unresolved.',
    ],
    recommendations: [
      'Prepare a bounded draft-only next step.',
    ],
    dissent: preserveDissent
      ? ['Material synthetic dissent remains.']
      : [],
    required_human_decisions: [
      'A human disposition is required.',
    ],
    prohibited_or_unavailable_actions: [
      ...evaluationCase.expectedBehavior
        .requiredProhibitedActionLabels,
      'repository writes are unavailable',
      'deployment is unavailable',
    ],
    evidence_references: [
      ...evaluationCase.expectedBehavior
        .requiredEvidenceReferenceIds,
    ],
    escalation_required:
      evaluationCase.expectedBehavior
        .mustEscalateOnIncompleteEvidence,
    draft_artifact:
      'Synthetic bounded draft artifact.',
  };
}

const primaryCandidate:
  EvaluationModelCandidate = {
    providerId: 'synthetic-primary-provider',
    modelId: 'synthetic-primary-model',
    pinnedModelVersion:
      'synthetic-primary-2026-08-01',
    adapterId: 'synthetic-ai-sdk-adapter',
    slot: 'primary',
    reasoningLevel: REASONING_LEVELS[0],
  };

const challengerCandidate:
  EvaluationModelCandidate = {
    providerId:
      'synthetic-challenger-provider',
    modelId: 'synthetic-challenger-model',
    pinnedModelVersion:
      'synthetic-challenger-2026-08-01',
    adapterId: 'synthetic-ai-sdk-adapter',
    slot: 'challenger',
    reasoningLevel: REASONING_LEVELS[0],
  };

function clockFactory(
  runId: string,
): () => number {
  const base =
    runId.endsWith(':primary')
      ? Date.UTC(2026, 7, 1, 8, 0, 0)
      : Date.UTC(2026, 7, 1, 8, 1, 0);

  const duration =
    runId.endsWith(':primary')
      ? 200
      : 350;

  let calls = 0;

  return () => {
    const result =
      calls === 0
        ? base
        : base + duration;
    calls++;
    return result;
  };
}

function gatewayOptionsFor(
  model: MockLanguageModelV3,
): Record<string, unknown> | undefined {
  const gateway =
    model.doGenerateCalls[0]
      ?.providerOptions?.gateway;

  return (
    typeof gateway === 'object' &&
    gateway !== null &&
    !Array.isArray(gateway)
  )
    ? gateway as Record<string, unknown>
    : undefined;
}

function baseOptions(
  primaryModels: MockLanguageModelV3[],
  challengerModels: MockLanguageModelV3[],
): EvaluationSuiteOptions {
  return {
    suiteId:
      'synthetic-executive-agent-suite-v1',
    sourceCommit:
      '92b28c354df67da5485b9055cacb0792087a4d1d',
    approvalReference:
      'founder-omnibus-authorization-2026-08-01',
    humanInitiated: true,
    evaluationCases:
      SYNTHETIC_MODEL_EVALUATION_CASES,
    primaryCandidate,
    challengerCandidate,
    primaryModelForCase:
      evaluationCase => {
        const model =
          new MockLanguageModelV3({
            doGenerate: async () =>
              mockGeneration(
                JSON.stringify(
                  validOutput(
                    evaluationCase,
                    true,
                  ),
                ),
                100,
                200,
              ),
          });

        primaryModels.push(model);
        return model;
      },
    challengerModelForCase:
      evaluationCase => {
        const model =
          new MockLanguageModelV3({
            doGenerate: async () =>
              mockGeneration(
                JSON.stringify(
                  validOutput(
                    evaluationCase,
                    false,
                  ),
                ),
                120,
                240,
              ),
          });

        challengerModels.push(model);
        return model;
      },
    promptVersion:
      'synthetic-evaluation-prompt-v1',
    systemPromptForRole:
      roleId =>
        `Synthetic bounded prompt for ${roleId}.`,
    maximumOutputTokens: 1_200,
    timeoutMs: 5_000,
    pricing: {
      primary: {
        inputMicrosPerMillionTokens:
          2_000_000,
        outputMicrosPerMillionTokens:
          8_000_000,
      },
      challenger: {
        inputMicrosPerMillionTokens:
          3_000_000,
        outputMicrosPerMillionTokens:
          10_000_000,
      },
    },
    gatewayProviderRestrictions: {
      primary: {
        onlyProviderId:
          primaryCandidate.providerId,
      },
      challenger: {
        onlyProviderId:
          challengerCandidate.providerId,
      },
    },
    clockFactory,
  };
}

async function main(): Promise<void> {
  const primaryModels:
    MockLanguageModelV3[] = [];
  const challengerModels:
    MockLanguageModelV3[] = [];

  const report =
    await runEvaluationSuite(
      baseOptions(
        primaryModels,
        challengerModels,
      ),
    );

  console.log('\nHuman-initiated suite');

  check(
    'evaluates every synthetic case',
    report.caseReports.length ===
      SYNTHETIC_MODEL_EVALUATION_CASES.length,
  );

  check(
    'creates one primary model per case',
    primaryModels.length ===
      SYNTHETIC_MODEL_EVALUATION_CASES.length,
  );

  check(
    'creates one challenger model per case',
    challengerModels.length ===
      SYNTHETIC_MODEL_EVALUATION_CASES.length,
  );

  check(
    'invokes each injected model exactly once',
    [
      ...primaryModels,
      ...challengerModels,
    ].every(
      model =>
        model.doGenerateCalls.length === 1,
    ),
  );

  check(
    'forwards the primary provider restriction to every primary run',
    primaryModels.every(model => {
      const gateway =
        gatewayOptionsFor(model);
      const only = gateway?.only;

      return (
        Array.isArray(only) &&
        only.length === 1 &&
        only[0] ===
          primaryCandidate.providerId
      );
    }),
  );

  check(
    'forwards the challenger provider restriction to every challenger run',
    challengerModels.every(model => {
      const gateway =
        gatewayOptionsFor(model);
      const only = gateway?.only;

      return (
        Array.isArray(only) &&
        only.length === 1 &&
        only[0] ===
          challengerCandidate.providerId
      );
    }),
  );

  check(
    'does not configure Gateway fallback models for either slot',
    [
      ...primaryModels,
      ...challengerModels,
    ].every(model => {
      const gateway =
        gatewayOptionsFor(model);

      return (
        gateway !== undefined &&
        !Object.prototype.hasOwnProperty.call(
          gateway,
          'models',
        )
      );
    }),
  );

  check(
    'records explicit human initiation',
    report.humanInitiated === true,
  );

  check(
    'retains the Founder approval reference',
    report.approvalReference ===
      'founder-omnibus-authorization-2026-08-01',
  );

  check(
    'is local-evaluation only',
    report.environment ===
      'local_evaluation' &&
      !report.productionEligible &&
      !report.previewActivationPerformed,
  );

  check(
    'performs no persistence or provider lookup',
    !report.persistencePerformed &&
      !report.providerLookupPerformed,
  );

  check(
    'performs no fallback or substitution',
    !report.fallbackPerformed &&
      !report.substitutionPerformed,
  );

  check(
    'cannot automatically select a candidate',
    report.automaticSelection === false &&
      report.caseReports.every(
        caseReport =>
          caseReport.comparison
            .automaticSelection === false,
      ),
  );

  check(
    'every case requires human disposition',
    report.humanDecisionRequired === true &&
      report.caseReports.every(
        caseReport =>
          caseReport.comparison
            .humanDecisionRequired === true,
      ),
  );

  check(
    'keeps diagnostic metrics noncontrolling',
    report.caseReports.every(
      caseReport =>
        caseReport.comparison
          .diagnosticMetrics.latencyDeltaMs ===
          150 &&
        caseReport.comparison.disposition ===
          'human_review_required',
    ),
  );

  check(
    'preserves role identity across both runs',
    report.caseReports.every(
      caseReport =>
        caseReport.primary.roleId ===
          caseReport.roleId &&
        caseReport.challenger.roleId ===
          caseReport.roleId,
    ),
  );

  check(
    'surfaces challenger dissent weakness separately',
    report.caseReports.every(
      caseReport =>
        caseReport.comparison.dimensions.some(
          dimension =>
            dimension.dimension ===
              'disagreement_preservation' &&
            dimension.comparison ===
              'primary_stronger',
        ),
    ),
  );

  check(
    'does not collapse dimensions into a composite score',
    !JSON.stringify(report).includes(
      'compositeScore',
    ) &&
      !JSON.stringify(report).includes(
        'overallScore',
      ) &&
      !JSON.stringify(report).includes(
        'automaticWinner',
      ),
  );

  console.log('\nFail-closed suite validation');

  const rejectedPrimaryModels:
    MockLanguageModelV3[] = [];
  const rejectedChallengerModels:
    MockLanguageModelV3[] = [];

  let mismatchedRestrictionRejected = false;

  try {
    await runEvaluationSuite({
      ...baseOptions(
        rejectedPrimaryModels,
        rejectedChallengerModels,
      ),
      gatewayProviderRestrictions: {
        primary: {
          onlyProviderId:
            primaryCandidate.providerId,
        },
        challenger: {
          onlyProviderId:
            'different-synthetic-provider',
        },
      },
    });
  } catch (error) {
    mismatchedRestrictionRejected =
      error instanceof Error &&
      error.message.includes(
        'must match the evaluation candidate provider ID',
      );
  }

  check(
    'rejects a mismatched suite provider restriction before creating models',
    mismatchedRestrictionRejected &&
      rejectedPrimaryModels.length === 0 &&
      rejectedChallengerModels.length === 0,
  );

  let humanInitiationRejected = false;

  try {
    await runEvaluationSuite({
      ...baseOptions([], []),
      humanInitiated: false,
    } as unknown as EvaluationSuiteOptions);
  } catch (error) {
    humanInitiationRejected =
      error instanceof Error &&
      error.message.includes(
        'explicitly human initiated',
      );
  }

  check(
    'rejects missing human initiation before execution',
    humanInitiationRejected,
  );

  let invalidPrimarySlotRejected = false;

  try {
    await runEvaluationSuite({
      ...baseOptions([], []),
      primaryCandidate: {
        ...primaryCandidate,
        slot: 'challenger',
      },
    });
  } catch (error) {
    invalidPrimarySlotRejected =
      error instanceof Error &&
      error.message.includes(
        'primary slot',
      );
  }

  check(
    'rejects invalid primary slot before execution',
    invalidPrimarySlotRejected,
  );

  let identicalCandidatesRejected = false;

  try {
    await runEvaluationSuite({
      ...baseOptions([], []),
      challengerCandidate: {
        ...primaryCandidate,
        slot: 'challenger',
      },
    });
  } catch (error) {
    identicalCandidatesRejected =
      error instanceof Error &&
      error.message.includes(
        'distinguishable',
      );
  }

  check(
    'rejects indistinguishable primary and challenger candidates',
    identicalCandidatesRejected,
  );

  console.log(
    `\n${'-'.repeat(60)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(60)}`,
  );

  if (failed > 0) process.exit(1);
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
