/**
 * Deterministic tests for local single-role execution.
 *
 * These tests use one injected AI SDK mock model and synthetic fixtures only.
 * No provider, credential, network, persistence, Preview gate, application
 * route, customer data, legal data, or Production resource is used.
 */

import { MockLanguageModelV3 } from 'ai/test';

import type {
  ExecutiveAgentRunRequest,
} from '../ai/modelRegistry';

import {
  cloneSyntheticFixture,
  SYNTHETIC_VALID_RUN_REQUEST,
} from './__fixtures__/registryFixtures';

import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from './evaluation/__fixtures__/syntheticEvaluationCases';

import type {
  ModelEvaluationCase,
} from './evaluation/modelEvaluation';

import {
  getDraftExecutiveAgentRegistryEntry,
} from './executiveAgentRegistry';

import {
  buildLocalSingleRoleSystemPrompt,
  executeLocalSingleRole,
  LOCAL_SINGLE_ROLE_PROMPT_VERSION,
  type LocalSingleRoleExecutionOptions,
} from './localSingleRoleExecution';

let passed = 0;
let failed = 0;

function check(
  name: string,
  condition: boolean,
  detail = '',
): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
    return;
  }

  failed += 1;
  console.log(
    `  ✗ ${name}${detail ? ` — ${detail}` : ''}`,
  );
}

function requiredCase(
  caseId: string,
): ModelEvaluationCase {
  const evaluationCase =
    SYNTHETIC_MODEL_EVALUATION_CASES.find(
      candidate => candidate.id === caseId,
    );

  if (evaluationCase === undefined) {
    throw new Error(
      `Missing synthetic case ${caseId}.`,
    );
  }

  return evaluationCase;
}

function mockGeneration(
  evaluationCase: ModelEvaluationCase,
  outputTokens = 200,
) {
  return {
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
            'Prepare a bounded draft-only next step.',
          ],
          dissent: [
            'Material synthetic dissent remains unresolved.',
          ],
          required_human_decisions: [
            'A human must determine final disposition.',
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
            'Synthetic local single-role executive draft.',
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
        total: outputTokens,
        text: outputTokens,
        reasoning: undefined,
      },
    },
    warnings: [],
  };
}

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

function validRequest(
  evaluationCase: ModelEvaluationCase,
): ExecutiveAgentRunRequest {
  const request =
    cloneSyntheticFixture(
      SYNTHETIC_VALID_RUN_REQUEST,
    );

  request.requestedTaskClass =
    evaluationCase.taskClass;
  request.requestedTools = [];

  request.evidenceState =
    evaluationCase.expectedBehavior
      .mustEscalateOnIncompleteEvidence
      ? 'unknown'
      : 'complete';

  request.requestedUsage = {
    inputTokens: 100,
    outputTokens: 200,
    estimatedCostMicros: 1_800,
    estimatedDailyCostMicrosAfterRun:
      1_800,
    elapsedLatencyMs: 250,
    requestedTimeoutMs: 5_000,
  };

  request.auditMetadata.runId =
    `synthetic-local:${evaluationCase.id}`;

  request.auditMetadata.taskClass =
    evaluationCase.taskClass;

  request.auditMetadata
    .effectiveToolPermissions = [];

  request.auditMetadata.toolCalls = [];

  request.auditMetadata.evidenceReferences =
    evaluationCase.expectedBehavior
      .requiredEvidenceReferenceIds;

  request.auditMetadata.unknownsRecorded =
    [];

  request.auditMetadata.outcome =
    request.evidenceState === 'complete'
      ? 'draft_completed'
      : 'escalation_required';

  request.auditMetadata.humanDisposition =
    'pending';

  return request;
}

function optionsFor(
  evaluationCase: ModelEvaluationCase,
  model: MockLanguageModelV3,
): LocalSingleRoleExecutionOptions {
  const request =
    validRequest(evaluationCase);

  return {
    runRequest: request,
    evaluationCase,
    model,
    promptVersion:
      LOCAL_SINGLE_ROLE_PROMPT_VERSION,
    systemPrompt:
      buildLocalSingleRoleSystemPrompt(
        request.registryEntry.roleId,
      ),
    pricing: {
      inputMicrosPerMillionTokens:
        2_000_000,
      outputMicrosPerMillionTokens:
        8_000_000,
    },
    clock: deterministicClock(),
  };
}

async function rejectsBeforeModel(
  name: string,
  options: LocalSingleRoleExecutionOptions,
  model: MockLanguageModelV3,
  expectedMessage: string,
): Promise<void> {
  let rejected = false;

  try {
    await executeLocalSingleRole(options);
  } catch (error) {
    rejected =
      error instanceof Error &&
      error.message.includes(
        expectedMessage,
      );
  }

  check(
    name,
    rejected &&
      model.doGenerateCalls.length === 0,
  );
}

async function main(): Promise<void> {
  console.log(
    '\nLocal single-role execution',
  );

  const evaluationCase =
    requiredCase(
      'synthetic-ceo-unknown-evidence-v1',
    );

  const model =
    new MockLanguageModelV3({
      doGenerate: async () =>
        mockGeneration(evaluationCase),
    });

  const report =
    await executeLocalSingleRole(
      optionsFor(
        evaluationCase,
        model,
      ),
    );

  check(
    'executes exactly one injected model',
    model.doGenerateCalls.length === 1,
  );

  check(
    'uses the validated CEO role and task',
    report.roleId ===
      'executive.ceo' &&
      report.taskClass ===
        evaluationCase.taskClass,
  );

  check(
    'uses only the selected primary slot',
    report.modelSlot === 'primary' &&
      report.modelRun.candidate.slot ===
        'primary',
  );

  check(
    'returns a strict bounded draft for human review',
    report.modelRun.schemaValid &&
      report.modelRun.boundaryValid &&
      report.draftForHumanReview !==
        null,
  );

  check(
    'records incomplete evidence as escalation',
    report.finalAudit.outcome ===
      'escalation_required' &&
      report.finalAudit
        .unknownsRecorded.length > 0,
  );

  check(
    'preserves exact evidence references',
    evaluationCase.expectedBehavior
      .requiredEvidenceReferenceIds
      .every(reference =>
        report.finalAudit
          .evidenceReferences.includes(
            reference,
          ),
      ),
  );

  check(
    'retains human disposition',
    report.humanDecisionRequired &&
      report.finalAudit
        .humanDisposition === 'pending' &&
      !report.automaticApproval &&
      !report.automaticSelection,
  );

  check(
    'performs no tools or persistence',
    !report.toolExecutionPerformed &&
      !report.persistencePerformed &&
      report.finalAudit.toolCalls
        .length === 0,
  );

  check(
    'performs no lookup, fallback, or substitution',
    !report.providerLookupPerformed &&
      !report.fallbackPerformed &&
      !report.substitutionPerformed &&
      report.modelRun
        .noAutomaticFallback &&
      report.modelRun
        .noSilentSubstitution,
  );

  check(
    'performs no Preview or Production activation',
    !report.previewActivationPerformed &&
      !report.productionEligible,
  );

  check(
    'records actual bounded diagnostics',
    report.finalAudit.latencyMs ===
      250 &&
      report.finalAudit
        .inputTokenCount === 100 &&
      report.finalAudit
        .outputTokenCount === 200 &&
      report.finalAudit
        .estimatedCostMicros === 1_800 &&
      report.actualLimitFindings
        .length === 0,
  );

  console.log(
    '\nFail-closed pre-call validation',
  );

  {
    const draftModel =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const draftOptions =
      optionsFor(
        evaluationCase,
        draftModel,
      );

    const draftEntry =
      cloneSyntheticFixture(
        getDraftExecutiveAgentRegistryEntry(
          'executive.ceo',
        ),
      );

    draftOptions.runRequest.registryEntry =
      draftEntry;

    draftOptions.runRequest
      .roleApprovalReference =
      draftEntry.roleApprovalReference;

    draftOptions.runRequest.auditMetadata
      .registryVersion =
      draftEntry.registryVersion;

    draftOptions.runRequest.auditMetadata
      .charterVersion =
      draftEntry.charterVersion;

    draftOptions.runRequest.auditMetadata
      .approvalReference =
      draftEntry.roleApprovalReference;

    draftOptions.runRequest.auditMetadata
      .providerId =
      draftEntry.primaryModel.providerId;

    draftOptions.runRequest.auditMetadata
      .modelId =
      draftEntry.primaryModel.modelId;

    draftOptions.runRequest.auditMetadata
      .pinnedModelVersion =
      draftEntry.primaryModel
        .pinnedModelVersion;

    draftOptions.runRequest.auditMetadata
      .adapterId =
      draftEntry.primaryModel.adapterId;

    await rejectsBeforeModel(
      'rejects the real draft-disabled registry entry',
      draftOptions,
      draftModel,
      'registry_not_preview_approved',
    );
  }

  {
    const toolModel =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const toolOptions =
      optionsFor(
        evaluationCase,
        toolModel,
      );

    toolOptions.runRequest.requestedTools =
      ['repository.read'];

    toolOptions.runRequest.auditMetadata
      .effectiveToolPermissions =
      ['repository.read'];

    await rejectsBeforeModel(
      'rejects tool execution before invocation',
      toolOptions,
      toolModel,
      'does not execute tools',
    );
  }

  {
    const fallbackModel =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(evaluationCase),
      });

    const fallbackOptions =
      optionsFor(
        evaluationCase,
        fallbackModel,
      );

    fallbackOptions.runRequest
      .registryEntry.fallbackModel = {
        providerId:
          'synthetic-provider',
        modelId:
          'synthetic-fallback-model',
        pinnedModelVersion:
          'synthetic-fallback-2026-08-01',
        adapterId:
          'synthetic-adapter',
        enabled: true,
        intendedUse: 'fallback',
      };

    fallbackOptions.runRequest
      .auditMetadata.modelSlot =
      'fallback';

    fallbackOptions.runRequest
      .auditMetadata.providerId =
      'synthetic-provider';

    fallbackOptions.runRequest
      .auditMetadata.modelId =
      'synthetic-fallback-model';

    fallbackOptions.runRequest
      .auditMetadata
      .pinnedModelVersion =
      'synthetic-fallback-2026-08-01';

    fallbackOptions.runRequest
      .auditMetadata.adapterId =
      'synthetic-adapter';

    await rejectsBeforeModel(
      'rejects fallback execution before invocation',
      fallbackOptions,
      fallbackModel,
      'does not permit the fallback slot',
    );
  }

  console.log(
    '\nPost-call limit enforcement',
  );

  {
    const limitModel =
      new MockLanguageModelV3({
        doGenerate: async () =>
          mockGeneration(
            evaluationCase,
            2_500,
          ),
      });

    const limitReport =
      await executeLocalSingleRole(
        optionsFor(
          evaluationCase,
          limitModel,
        ),
      );

    check(
      'blocks an actual output-token overrun',
      limitReport.actualLimitFindings
        .includes(
          'actual_output_token_limit_exceeded',
        ) &&
        limitReport.finalAudit.outcome ===
          'blocked_limit' &&
        limitReport
          .draftForHumanReview === null,
    );

    check(
      'does not retry or fall back after an overrun',
      limitModel.doGenerateCalls.length ===
        1 &&
        !limitReport.fallbackPerformed &&
        !limitReport.substitutionPerformed,
    );
  }

  console.log(
    `\n${'-'.repeat(72)}\n` +
      `  ${passed} passed, ${failed} failed\n` +
      `${'-'.repeat(72)}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
