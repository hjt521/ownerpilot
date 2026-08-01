/**
 * Deterministic synthetic local single-role execution command.
 *
 * Uses one injected AI SDK mock model and synthetic fixtures only.
 * Performs no provider lookup, credential read, network call, persistence,
 * tool execution, Preview activation, application route, or Production action.
 */

import { MockLanguageModelV3 } from 'ai/test';

import {
  cloneSyntheticFixture,
  SYNTHETIC_VALID_RUN_REQUEST,
} from '../../lib/agents/__fixtures__/registryFixtures';

import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from '../../lib/agents/evaluation/__fixtures__/syntheticEvaluationCases';

import {
  buildLocalSingleRoleSystemPrompt,
  executeLocalSingleRole,
  LOCAL_SINGLE_ROLE_PROMPT_VERSION,
} from '../../lib/agents/localSingleRoleExecution';

function requiredEvaluationCase() {
  const evaluationCase =
    SYNTHETIC_MODEL_EVALUATION_CASES.find(
      candidate =>
        candidate.id ===
        'synthetic-ceo-unknown-evidence-v1',
    );

  if (evaluationCase === undefined) {
    throw new Error(
      'Required synthetic execution case is missing.',
    );
  }

  return evaluationCase;
}

const evaluationCase =
  requiredEvaluationCase();

const runRequest =
  cloneSyntheticFixture(
    SYNTHETIC_VALID_RUN_REQUEST,
  );

runRequest.requestedTaskClass =
  evaluationCase.taskClass;

runRequest.requestedTools = [];
runRequest.evidenceState = 'unknown';

runRequest.requestedUsage = {
  inputTokens: 100,
  outputTokens: 200,
  estimatedCostMicros: 1_800,
  estimatedDailyCostMicrosAfterRun:
    1_800,
  elapsedLatencyMs: 250,
  requestedTimeoutMs: 5_000,
};

runRequest.auditMetadata.runId =
  'synthetic-local-single-role-v1';

runRequest.auditMetadata.taskClass =
  evaluationCase.taskClass;

runRequest.auditMetadata
  .effectiveToolPermissions = [];

runRequest.auditMetadata.toolCalls = [];

runRequest.auditMetadata
  .evidenceReferences =
  evaluationCase.expectedBehavior
    .requiredEvidenceReferenceIds;

runRequest.auditMetadata
  .unknownsRecorded = [];

runRequest.auditMetadata.outcome =
  'escalation_required';

runRequest.auditMetadata
  .humanDisposition = 'pending';

const model =
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
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
              'Prepare a bounded decision-memo draft for human review.',
            ],
            dissent: [
              'Material synthetic dissent remains unresolved.',
            ],
            required_human_decisions: [
              'A human must determine final disposition.',
            ],
            prohibited_or_unavailable_actions: [
              ...evaluationCase
                .expectedBehavior
                .requiredProhibitedActionLabels,
              'repository writes are unavailable',
              'deployment is unavailable',
              'external communication is unavailable',
            ],
            evidence_references: [
              ...evaluationCase
                .expectedBehavior
                .requiredEvidenceReferenceIds,
            ],
            escalation_required: true,
            draft_artifact:
              'Synthetic local single-role CEO decision-memo draft.',
          }),
        },
      ],
      finishReason: {
        unified: 'stop' as const,
        raw: undefined,
      },
      usage: {
        inputTokens: {
          total: 100,
          noCache: 100,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 200,
          text: 200,
          reasoning: undefined,
        },
      },
      warnings: [],
    }),
  });

function deterministicClock(): () => number {
  const values = [
    Date.UTC(2026, 7, 1, 21, 0, 0),
    Date.UTC(2026, 7, 1, 21, 0, 0, 250),
  ];

  let index = 0;

  return () => {
    const value =
      values[
        Math.min(
          index,
          values.length - 1,
        )
      ];

    index += 1;
    return value;
  };
}

async function main(): Promise<void> {
  const report =
    await executeLocalSingleRole({
      runRequest,
      evaluationCase,
      model,
      promptVersion:
        LOCAL_SINGLE_ROLE_PROMPT_VERSION,
      systemPrompt:
        buildLocalSingleRoleSystemPrompt(
          runRequest.registryEntry.roleId,
        ),
      pricing: {
        inputMicrosPerMillionTokens:
          2_000_000,
        outputMicrosPerMillionTokens:
          8_000_000,
      },
      clock: deterministicClock(),
    });

  process.stdout.write(
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
