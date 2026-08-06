/**
 * Deterministic tests for the injected AI SDK evaluation runner.
 *
 * No network, credential, provider lookup, Gateway lookup, environment
 * variable, persistence, customer data, or Production resource is used.
 */

import { MockLanguageModelV3 } from 'ai/test';
import {
  EVALUATION_MAX_RETRIES,
  EvaluationOutputError,
  parseExecutiveAgentDraftOutput,
  runInjectedModelEvaluation,
  type InjectedEvaluationRunOptions,
} from './aiSdkEvaluationRunner';
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
  inputTokens = 100,
  outputTokens = 200,
  finishReason:
    | 'stop'
    | 'length' = 'stop',
) {
  return {
    content: [
      {
        type: 'text' as const,
        text,
      },
    ],
    finishReason: {
      unified: finishReason,
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
) {
  return {
    facts: [
      'Synthetic fact grounded in the supplied fixture.',
    ],
    assumptions: [
      'Synthetic assumption requiring human review.',
    ],
    unknowns: [
      'Synthetic timing evidence remains incomplete.',
    ],
    recommendations: [
      'Prepare a draft-only bounded next step.',
    ],
    dissent: [
      'Option B remains materially disputed.',
    ],
    required_human_decisions: [
      'A human must decide whether to proceed.',
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
      'Synthetic executive-agent draft artifact.',
  };
}

const primaryCandidate:
  EvaluationModelCandidate = {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model',
    pinnedModelVersion:
      'synthetic-version-2026-08-01',
    adapterId: 'synthetic-ai-sdk-adapter',
    slot: 'primary',
    reasoningLevel: REASONING_LEVELS[0],
  };

function clockSequence(
  ...values: number[]
): () => number {
  let index = 0;

  return () => {
    const value =
      values[Math.min(index, values.length - 1)];
    index++;
    return value;
  };
}

function optionsFor(
  evaluationCase: ModelEvaluationCase,
  model: MockLanguageModelV3,
): InjectedEvaluationRunOptions {
  return {
    runId: `run-${evaluationCase.id}`,
    evaluationCase,
    candidate: primaryCandidate,
    model,
    promptVersion: 'synthetic-prompt-v1',
    systemPrompt:
      'Synthetic executive-agent evaluation prompt.',
    maximumOutputTokens: 1_200,
    timeoutMs: 5_000,
    pricing: {
      inputMicrosPerMillionTokens: 2_000_000,
      outputMicrosPerMillionTokens: 8_000_000,
    },
    clock: clockSequence(
      Date.UTC(2026, 7, 1, 8, 0, 0),
      Date.UTC(2026, 7, 1, 8, 0, 0, 250),
    ),
  };
}

async function main(): Promise<void> {
  console.log('\nStrict output parser');

  const firstCase =
    SYNTHETIC_MODEL_EVALUATION_CASES[0];

  const parsed =
    parseExecutiveAgentDraftOutput(
      JSON.stringify(validOutput(firstCase)),
    );

  check(
    'accepts the exact bounded output schema',
    parsed.facts.length === 1 &&
      parsed.dissent.length === 1 &&
      parsed.escalationRequired,
  );

  let invalidJsonRejected = false;

  try {
    parseExecutiveAgentDraftOutput(
      'not-json',
    );
  } catch (error) {
    invalidJsonRejected =
      error instanceof EvaluationOutputError &&
      error.message.includes('not valid JSON');
  }

  check(
    'rejects non-JSON output',
    invalidJsonRejected,
  );

  let unknownFieldRejected = false;

  try {
    parseExecutiveAgentDraftOutput(
      JSON.stringify({
        ...validOutput(firstCase),
        unauthorized_field: true,
      }),
    );
  } catch (error) {
    unknownFieldRejected =
      error instanceof EvaluationOutputError &&
      error.message.includes(
        'required schema',
      );
  }

  check(
    'rejects unknown output fields',
    unknownFieldRejected,
  );

  let malformedArrayRejected = false;

  try {
    parseExecutiveAgentDraftOutput(
      JSON.stringify({
        ...validOutput(firstCase),
        facts: 'not-an-array',
      }),
    );
  } catch (error) {
    malformedArrayRejected =
      error instanceof EvaluationOutputError &&
      error.message.includes(
        'facts must be an array',
      );
  }

  check(
    'rejects malformed output sections',
    malformedArrayRejected,
  );

  console.log('\nInjected AI SDK execution');

  const validModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(firstCase),
          ),
        ),
    });

  const validRun =
    await runInjectedModelEvaluation(
      optionsFor(firstCase, validModel),
    );

  check(
    'completes one injected model run',
    validRun.outcome === 'completed' &&
      validRun.schemaValid &&
      validRun.output !== null,
  );

  check(
    'calls exactly one model',
    validModel.doGenerateCalls.length === 1,
  );

  const validCall =
    validModel.doGenerateCalls[0];

  const serializedValidCall =
    JSON.stringify(validCall);

  check(
    'forwards a strict native structured-output schema',
    serializedValidCall.includes(
      '"additionalProperties":false',
    ) &&
      serializedValidCall.includes(
        '"draft_artifact"',
      ) &&
      serializedValidCall.includes(
        '"required_human_decisions"',
      ),
  );

  check(
    'schema requires dissent and exact server-controlled boundary values',
    serializedValidCall.includes(
      '"dissent":{"type":"array","minItems":1',
    ) &&
      firstCase.expectedBehavior
        .requiredEvidenceReferenceIds
        .every(reference =>
          serializedValidCall.includes(
            JSON.stringify(reference),
          ),
        ) &&
      firstCase.expectedBehavior
        .requiredProhibitedActionLabels
        .every(label =>
          serializedValidCall.includes(
            JSON.stringify(label),
          ),
        ),
  );

  check(
    'configures zero automatic retries',
    EVALUATION_MAX_RETRIES === 0,
  );

  check(
    'applies the bounded output-token limit',
    validCall.maxOutputTokens === 1_200,
  );

  check(
    'uses deterministic temperature',
    validCall.temperature === 0,
  );

  const restrictedModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(firstCase),
          ),
        ),
    });

  const restrictedRun =
    await runInjectedModelEvaluation({
      ...optionsFor(
        firstCase,
        restrictedModel,
      ),
      gatewayProviderRestriction: {
        onlyProviderId:
          primaryCandidate.providerId,
      },
    });

  const restrictedCall =
    restrictedModel.doGenerateCalls[0];

  const gatewayOptions =
    restrictedCall.providerOptions
      ?.gateway as
        | Record<string, unknown>
        | undefined;

  const gatewayOnly =
    gatewayOptions?.only;

  check(
    'forwards exactly one matching Gateway provider restriction',
    restrictedRun.outcome === 'completed' &&
      Array.isArray(gatewayOnly) &&
      gatewayOnly.length === 1 &&
      gatewayOnly[0] ===
        primaryCandidate.providerId,
  );

  check(
    'does not configure a Gateway fallback model array',
    gatewayOptions !== undefined &&
      !Object.prototype.hasOwnProperty.call(
        gatewayOptions,
        'models',
      ),
  );

  const mismatchedProviderModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(firstCase),
          ),
        ),
    });

  let mismatchedProviderRejected = false;

  try {
    await runInjectedModelEvaluation({
      ...optionsFor(
        firstCase,
        mismatchedProviderModel,
      ),
      gatewayProviderRestriction: {
        onlyProviderId:
          'different-synthetic-provider',
      },
    });
  } catch (error) {
    mismatchedProviderRejected =
      error instanceof Error &&
      error.message.includes(
        'must match the evaluation candidate provider ID',
      );
  }

  check(
    'rejects a mismatched Gateway provider restriction before invocation',
    mismatchedProviderRejected &&
      mismatchedProviderModel
        .doGenerateCalls.length === 0,
  );

  let emptyProviderRejected = false;

  try {
    await runInjectedModelEvaluation({
      ...optionsFor(firstCase, restrictedModel),
      gatewayProviderRestriction: {
        onlyProviderId: '   ',
      },
    });
  } catch (error) {
    emptyProviderRejected =
      error instanceof Error &&
      error.message.includes(
        'nonempty bounded string',
      );
  }

  check(
    'rejects an empty Gateway provider restriction',
    emptyProviderRejected,
  );

  const serializedPrompt =
    JSON.stringify(validCall.prompt);

  check(
    'prompt includes the approved role',
    serializedPrompt.includes(
      firstCase.roleId,
    ),
  );

  check(
    'prompt includes required evidence references',
    firstCase.expectedBehavior
      .requiredEvidenceReferenceIds
      .every(reference =>
        serializedPrompt.includes(reference),
      ),
  );

  check(
    'prompt requires exact unannotated evidence-reference IDs',
    serializedPrompt.includes(
      'copyEachRequiredIdVerbatim',
    ) &&
      serializedPrompt.includes(
        'oneIdPerArrayItem',
      ) &&
      serializedPrompt.includes(
        'appendNothingToIds',
      ) &&
      serializedPrompt.includes(
        'descriptionsOrAnnotationsProhibited',
      ) &&
      serializedPrompt.includes(
        'additionalCommentaryInArrayProhibited',
      ),
  );

  check(
    'prompt explicitly prohibits automatic selection',
    serializedPrompt.includes(
      'automaticSelectionProhibited',
    ),
  );

  check(
    'records diagnostic latency',
    validRun.usage.latencyMs === 250,
  );

  check(
    'normalizes input and output usage',
    validRun.usage.inputTokens === 100 &&
      validRun.usage.outputTokens === 200,
  );

  check(
    'calculates diagnostic estimated cost',
    validRun.usage.estimatedCostMicros ===
      1_800,
  );

  check(
    'never records substitution or fallback',
    validRun.noSilentSubstitution &&
      validRun.noAutomaticFallback,
  );

  check(
    'preserves dissent and uncertainty',
    validRun.dissentPreserved &&
      validRun.uncertaintyPreserved,
  );

  check(
    'retains separate qualitative dimensions',
    validRun.dimensions.length === 8 &&
      validRun.dimensions.some(
        dimension =>
          dimension.dimension ===
            'evidence_grounding' &&
          dimension.finding ===
            'acceptable',
      ),
  );

  console.log('\nRequired refusal behavior');

  const refusalCase =
    SYNTHETIC_MODEL_EVALUATION_CASES[2];

  const refusalModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(refusalCase),
          ),
        ),
    });

  const refusalRun =
    await runInjectedModelEvaluation(
      optionsFor(
        refusalCase,
        refusalModel,
      ),
    );

  check(
    'records required refusal as a valid outcome',
    refusalRun.outcome ===
      'refused_as_required',
  );

  check(
    'preserves prohibited action labels',
    refusalRun.refusalCorrect &&
      refusalRun.boundaryValid,
  );

  const incompleteRefusal =
    validOutput(refusalCase);

  incompleteRefusal
    .prohibited_or_unavailable_actions = [
      'Only one unrelated action is unavailable.',
    ];

  const boundaryFailureModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(incompleteRefusal),
        ),
    });

  const boundaryFailure =
    await runInjectedModelEvaluation(
      optionsFor(
        refusalCase,
        boundaryFailureModel,
      ),
    );

  check(
    'fails the boundary when prohibited actions are omitted',
    !boundaryFailure.refusalCorrect &&
      !boundaryFailure.boundaryValid,
  );

  check(
    'does not silently convert a failed refusal into approval',
    boundaryFailure.outcome === 'completed' &&
      boundaryFailure.dimensions.some(
        dimension =>
          dimension.dimension ===
            'refusal_behavior' &&
          dimension.finding === 'failed',
      ),
  );

  console.log('\nFail-closed output and provider behavior');

  const invalidSchemaModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify({
            facts: [],
          }),
        ),
    });

  const invalidSchemaRun =
    await runInjectedModelEvaluation(
      optionsFor(
        firstCase,
        invalidSchemaModel,
      ),
    );

  check(
    'fails closed on invalid structured output',
    invalidSchemaRun.outcome ===
      'failed_schema' &&
      invalidSchemaRun.output === null &&
      !invalidSchemaRun.schemaValid,
  );

  check(
    'classifies local schema validation',
    invalidSchemaRun.providerErrorClass ===
      'local_output_validation',
  );

  check(
    'preserves usage on native schema failure',
    invalidSchemaRun.usage.inputTokens === 100 &&
      invalidSchemaRun.usage.outputTokens === 200 &&
      invalidSchemaRun.usage.estimatedCostMicros ===
        1_800,
  );

  check(
    'does not invoke a repair or fallback model',
    invalidSchemaModel.doGenerateCalls.length ===
      1 &&
      invalidSchemaRun.noAutomaticFallback,
  );

  const fencedOutputModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          '```json\n' +
            JSON.stringify(
              validOutput(firstCase),
            ) +
            '\n```',
        ),
    });

  const fencedOutputRun =
    await runInjectedModelEvaluation(
      optionsFor(
        firstCase,
        fencedOutputModel,
      ),
    );

  check(
    'fails closed on markdown-wrapped JSON without repair',
    fencedOutputRun.outcome ===
      'failed_schema' &&
      fencedOutputRun.output === null &&
      fencedOutputModel.doGenerateCalls.length ===
        1,
  );

  check(
    'classifies native JSON parsing without exposing generated text',
    fencedOutputRun.providerErrorClass ===
      'native_json_parse' &&
      fencedOutputRun
        .sanitizedFailureDetail !== null &&
      !fencedOutputRun
        .sanitizedFailureDetail
        .includes('```json'),
  );

  const truncatedOutputModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          '{',
          100,
          200,
          'length',
        ),
    });

  const truncatedOutputRun =
    await runInjectedModelEvaluation(
      optionsFor(
        firstCase,
        truncatedOutputModel,
      ),
    );

  check(
    'classifies local output truncation without exposing generated text',
    truncatedOutputRun.outcome ===
      'failed_schema' &&
      truncatedOutputRun.providerErrorClass ===
        'local_output_truncated' &&
      truncatedOutputRun.output === null &&
      truncatedOutputRun
        .sanitizedFailureDetail !== null &&
      !truncatedOutputRun
        .sanitizedFailureDetail
        .includes('{') &&
      truncatedOutputModel.doGenerateCalls.length ===
        1,
  );

  const providerFailureModel =
    new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error(
          'synthetic provider secret-like detail',
        );
      },
    });

  const providerFailureRun =
    await runInjectedModelEvaluation(
      optionsFor(
        firstCase,
        providerFailureModel,
      ),
    );

  check(
    'classifies injected model failure',
    providerFailureRun.outcome ===
      'failed_provider' &&
      providerFailureRun.output === null,
  );

  check(
    'does not expose raw provider error text',
    providerFailureRun
      .sanitizedFailureDetail !== null &&
      !providerFailureRun
        .sanitizedFailureDetail
        .includes('secret-like detail'),
  );

  check(
    'does not retry provider failure',
    providerFailureModel
      .doGenerateCalls.length === 1,
  );

  const timeoutModel =
    new MockLanguageModelV3({
      doGenerate: async () => {
        const timeoutError =
          new Error('synthetic timeout');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      },
    });

  const timeoutRun =
    await runInjectedModelEvaluation(
      optionsFor(
        firstCase,
        timeoutModel,
      ),
    );

  check(
    'classifies timeout without fallback',
    timeoutRun.outcome ===
      'failed_timeout' &&
      timeoutRun.providerErrorClass ===
        'timeout' &&
      timeoutRun.noAutomaticFallback,
  );

  console.log('\nPre-call validation');

  const invalidCandidateModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(firstCase),
          ),
        ),
    });

  let movingAliasRejected = false;

  try {
    await runInjectedModelEvaluation({
      ...optionsFor(
        firstCase,
        invalidCandidateModel,
      ),
      candidate: {
        ...primaryCandidate,
        pinnedModelVersion:
          'synthetic-model-latest',
      },
    });
  } catch (error) {
    movingAliasRejected =
      error instanceof Error &&
      error.message.includes(
        'moving_model_alias',
      );
  }

  check(
    'rejects moving aliases before model invocation',
    movingAliasRejected &&
      invalidCandidateModel
        .doGenerateCalls.length === 0,
  );

  const invalidTaskModel =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(
          JSON.stringify(
            validOutput(firstCase),
          ),
        ),
    });

  let roleTaskMismatchRejected = false;

  try {
    await runInjectedModelEvaluation({
      ...optionsFor(
        firstCase,
        invalidTaskModel,
      ),
      evaluationCase: {
        ...firstCase,
        roleId: 'executive.ceo',
      },
    });
  } catch (error) {
    roleTaskMismatchRejected =
      error instanceof Error &&
      error.message.includes(
        'task_not_allowed_for_role',
      );
  }

  check(
    'rejects role-task mismatch before invocation',
    roleTaskMismatchRejected &&
      invalidTaskModel
        .doGenerateCalls.length === 0,
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
