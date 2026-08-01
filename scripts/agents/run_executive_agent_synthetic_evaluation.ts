/**
 * Local deterministic executive-agent evaluation command.
 *
 * Usage:
 *   npx tsx scripts/agents/run_executive_agent_synthetic_evaluation.ts
 *
 * The command prints a bounded JSON report to stdout. It uses synthetic
 * fixtures and injected AI SDK mock models only. It performs no provider
 * lookup, network call, persistence, Preview activation, or Production action.
 */

import { MockLanguageModelV3 } from 'ai/test';
import {
  runEvaluationSuite,
} from '../../lib/agents/evaluation/evaluationSuite';
import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from '../../lib/agents/evaluation/__fixtures__/syntheticEvaluationCases';
import {
  REASONING_LEVELS,
} from '../../lib/ai/modelRegistry';
import type {
  ModelEvaluationCase,
} from '../../lib/agents/evaluation/modelEvaluation';

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

function outputFor(
  evaluationCase: ModelEvaluationCase,
  preserveDissent: boolean,
) {
  return {
    facts: [
      'Synthetic fact grounded in the supplied fixture.',
    ],
    assumptions: [
      'Synthetic assumption requiring human review.',
    ],
    unknowns: [
      'Synthetic evidence remains incomplete.',
    ],
    recommendations: [
      'Prepare a bounded draft-only next step.',
    ],
    dissent: preserveDissent
      ? ['Material synthetic dissent remains unresolved.']
      : [],
    required_human_decisions: [
      'A human must determine the final disposition.',
    ],
    prohibited_or_unavailable_actions: [
      ...evaluationCase.expectedBehavior
        .requiredProhibitedActionLabels,
      'repository writes are unavailable',
      'deployment is unavailable',
      'external communication is unavailable',
    ],
    evidence_references: [
      ...evaluationCase.expectedBehavior
        .requiredEvidenceReferenceIds,
    ],
    escalation_required:
      evaluationCase.expectedBehavior
        .mustEscalateOnIncompleteEvidence,
    draft_artifact:
      'Synthetic executive-agent evaluation draft.',
  };
}

function deterministicClock(
  runId: string,
): () => number {
  const slotOffset =
    runId.endsWith(':primary')
      ? 0
      : 60_000;

  const start =
    Date.UTC(2026, 7, 1, 8, 0, 0) +
    slotOffset;

  const duration =
    runId.endsWith(':primary')
      ? 200
      : 350;

  let calls = 0;

  return () => {
    const value =
      calls === 0
        ? start
        : start + duration;
    calls++;
    return value;
  };
}

async function main(): Promise<void> {
  const report =
    await runEvaluationSuite({
      suiteId:
        'synthetic-executive-agent-suite-v1',
      sourceCommit:
        '92b28c354df67da5485b9055cacb0792087a4d1d',
      approvalReference:
        'founder-omnibus-authorization-2026-08-01',
      humanInitiated: true,
      evaluationCases:
        SYNTHETIC_MODEL_EVALUATION_CASES,
      primaryCandidate: {
        providerId:
          'synthetic-primary-provider',
        modelId:
          'synthetic-primary-model',
        pinnedModelVersion:
          'synthetic-primary-2026-08-01',
        adapterId:
          'synthetic-ai-sdk-adapter',
        slot: 'primary',
        reasoningLevel:
          REASONING_LEVELS[0],
      },
      challengerCandidate: {
        providerId:
          'synthetic-challenger-provider',
        modelId:
          'synthetic-challenger-model',
        pinnedModelVersion:
          'synthetic-challenger-2026-08-01',
        adapterId:
          'synthetic-ai-sdk-adapter',
        slot: 'challenger',
        reasoningLevel:
          REASONING_LEVELS[0],
      },
      primaryModelForCase:
        evaluationCase =>
          new MockLanguageModelV3({
            doGenerate: async () =>
              mockGeneration(
                JSON.stringify(
                  outputFor(
                    evaluationCase,
                    true,
                  ),
                ),
                100,
                200,
              ),
          }),
      challengerModelForCase:
        evaluationCase =>
          new MockLanguageModelV3({
            doGenerate: async () =>
              mockGeneration(
                JSON.stringify(
                  outputFor(
                    evaluationCase,
                    false,
                  ),
                ),
                120,
                240,
              ),
          }),
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
      clockFactory: deterministicClock,
    });

  process.stdout.write(
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
