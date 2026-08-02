import {
  createHash,
} from 'node:crypto';

import {
  MockLanguageModelV3,
} from 'ai/test';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_APPROVAL_REFERENCE,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
  CAO_PREVIEW_REGISTRY_ENTRY,
  CAO_PREVIEW_REGISTRY_VERSION,
} from './caoPreviewRegistry';

import {
  executeCaoPreview,
} from './caoPreviewExecution';

import {
  EVALUATION_MAX_RETRIES,
} from './evaluation/aiSdkEvaluationRunner';

import {
  evaluateExecutiveAgentsPreviewGate,
  type ExecutiveAgentsPreviewGateAcceptance,
} from './executiveAgentsPreviewGate';

import {
  EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
  type ExecutiveAgentsPreviewRouteRequest,
} from './executiveAgentsPreviewRouteContract';

import type {
  ExecutiveAgentRunRequest,
} from '../ai/modelRegistry';

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

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(value),
  ) as T;
}

function routeRequest():
ExecutiveAgentsPreviewRouteRequest {
  return {
    requestVersion:
      EXECUTIVE_AGENTS_PREVIEW_ROUTE_REQUEST_VERSION,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      'architecture_analysis',
    modelSlot:
      'primary',
    explicitHumanInitiation:
      true,
    approvalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    humanClass:
      'human_engineering_reviewer',
    humanIdentifier:
      'admin@example.invalid',
    runId:
      'synthetic-cao-preview-execution-0001',
    instructions:
      'Analyze the synthetic architecture dependency, preserve dissent, identify unknowns, and prepare only a noncanonical advisory draft.',
    sensitiveContentPresent:
      false,
    evidence: [
      {
        reference:
          'synthetic-execution-evidence-001',
        classification:
          'synthetic',
        content:
          'Synthetic service A depends on synthetic service B, while reviewers disagree about whether to introduce an abstraction boundary now.',
      },
    ],
  };
}

function registryEntryHash():
string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        CAO_PREVIEW_REGISTRY_ENTRY,
      ),
    )
    .digest('hex');
}

function runRequestFor(
  request:
    ExecutiveAgentsPreviewRouteRequest,
): ExecutiveAgentRunRequest {
  return {
    registryEntry:
      CAO_PREVIEW_REGISTRY_ENTRY,
    environment:
      'preview',
    explicitHumanInitiation:
      true,
    roleApprovalReference:
      CAO_PREVIEW_APPROVAL_REFERENCE,
    requestedTaskClass:
      request.taskClass,
    requestedTools: [],
    requestedAuthorityCategories: [
      'advisory_draft',
    ],
    authorityExpansionRequested:
      false,
    disagreementPreservationRequired:
      true,
    uncertaintyPreservationRequired:
      true,
    evidenceState:
      'complete',
    requestedUsage: {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostMicros: 0,
      estimatedDailyCostMicrosAfterRun:
        0,
      elapsedLatencyMs: 0,
      requestedTimeoutMs:
        CAO_PREVIEW_REGISTRY_ENTRY
          .limits.hardTimeoutMs,
    },
    auditMetadata: {
      runId:
        request.runId,
      roleId:
        'executive.chief_architecture_officer',
      registryVersion:
        CAO_PREVIEW_REGISTRY_VERSION,
      charterVersion:
        CAO_PREVIEW_REGISTRY_ENTRY
          .charterVersion,
      registryEntryHash:
        registryEntryHash(),
      environment:
        'preview',
      sourceCommitSha:
        '1111111111111111111111111111111111111111',
      requestedBy:
        'human_engineering_reviewer:admin@example.invalid',
      approvalReference:
        CAO_PREVIEW_APPROVAL_REFERENCE,
      taskClass:
        request.taskClass,
      modelSlot:
        'primary',
      providerId:
        CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      modelId:
        CAO_PREVIEW_PRIMARY_MODEL_ID,
      pinnedModelVersion:
        CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
      adapterId:
        CAO_PREVIEW_ADAPTER_ID,
      reasoningLevel:
        CAO_PREVIEW_REGISTRY_ENTRY
          .reasoningLevel,
      effectiveToolPermissions:
        [],
      toolCalls: [],
      substitutionRequested:
        false,
      substitutionReasonClass:
        null,
      fallbackReasonClass:
        null,
      startedAt:
        '2026-08-02T18:00:00.000Z',
      completedAt:
        null,
      latencyMs: 0,
      inputTokenCount: 0,
      outputTokenCount: 0,
      estimatedCostMicros: 0,
      evidenceReferences:
        request.evidence.map(
          item => item.reference,
        ),
      unknownsRecorded: [],
      disagreements: [],
      outcome:
        'blocked_validation',
      humanDisposition:
        'pending',
    },
  };
}

function gateAcceptanceFor(
  request:
    ExecutiveAgentsPreviewRouteRequest,
): ExecutiveAgentsPreviewGateAcceptance {
  const evaluated =
    evaluateExecutiveAgentsPreviewGate({
      deploymentEnvironment:
        'preview',
      previewEnabledValue:
        'true',
      runRequest:
        runRequestFor(
          request,
        ),
    });

  if (!evaluated.ok) {
    throw new Error(
      `Test gate construction failed: ${evaluated.issues
        .map(issue => issue.code)
        .join(', ')}`,
    );
  }

  return evaluated.value;
}

function mockGeneration(
  output: unknown,
  usage = {
    inputTokens: 500,
    outputTokens: 700,
  },
) {
  return {
    content: [
      {
        type:
          'text' as const,
        text:
          JSON.stringify(output),
      },
    ],
    finishReason: {
      unified:
        'stop' as const,
      raw: undefined,
    },
    usage: {
      inputTokens: {
        total:
          usage.inputTokens,
        noCache:
          usage.inputTokens,
        cacheRead:
          undefined,
        cacheWrite:
          undefined,
      },
      outputTokens: {
        total:
          usage.outputTokens,
        text:
          usage.outputTokens,
        reasoning:
          undefined,
      },
    },
    warnings: [],
  };
}

function validWireOutput(
  request:
    ExecutiveAgentsPreviewRouteRequest,
) {
  return {
    facts: [
      'A synthetic dependency exists between service A and service B.',
    ],
    assumptions: [
      'The dependency remains within the synthetic evaluation boundary.',
    ],
    unknowns: [
      'The future change frequency of the dependency is unknown.',
    ],
    recommendations: [
      'Prepare a bounded advisory comparison for human review.',
    ],
    dissent: [
      'One reviewer favors an abstraction now while another favors deferral.',
    ],
    required_human_decisions: [
      'A human must decide whether the abstraction is warranted.',
    ],
    prohibited_or_unavailable_actions: [
      'repository writes are unavailable',
      'database writes are unavailable',
      'deployment is unavailable',
      'external communication is unavailable',
      'tool execution is unavailable',
      'automatic continuation is unavailable',
      'Production action is unavailable',
    ],
    evidence_references:
      request.evidence.map(
        item => item.reference,
      ),
    escalation_required:
      false,
    draft_artifact:
      'NONCANONICAL ADVISORY DRAFT: preserve both options and require human disposition.',
  };
}

function clock():
() => number {
  const values = [
    1_754_156_400_000,
    1_754_156_401_250,
  ];

  return () =>
    values.shift() ??
    1_754_156_401_250;
}

async function rejects(
  operation:
    () => Promise<unknown>,
  message:
    string,
): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch (error) {
    return (
      error instanceof Error &&
      error.message.includes(
        message,
      )
    );
  }
}

async function main():
Promise<void> {
  console.log(
    '\nInjected CAO Preview execution core',
  );

  const request =
    routeRequest();

  const model =
    new MockLanguageModelV3({
      doGenerate:
        async () =>
          mockGeneration(
            validWireOutput(
              request,
            ),
          ),
    });

  const report =
    await executeCaoPreview({
      gateAcceptance:
        gateAcceptanceFor(
          request,
        ),
      routeRequest:
        request,
      model,
      pricing: {
        inputMicrosPerMillionTokens:
          1_000_000,
        outputMicrosPerMillionTokens:
          2_000_000,
      },
      clock:
        clock(),
    });

  check(
    'executes one exact CAO primary-model invocation',
    report.executionMode ===
      'preview_injected_cao_single_role' &&
      report.preflightValidated &&
      report.routeRequestValidated &&
      report.modelInvocationPerformed &&
      report.roleId ===
        'executive.chief_architecture_officer' &&
      report.modelSlot ===
        'primary' &&
      report.providerId ===
        'openai' &&
      report.modelId ===
        'openai/gpt-5.6-terra' &&
      model.doGenerateCalls.length ===
        1,
    JSON.stringify(report),
  );

  check(
    'passes the exact openai Gateway provider restriction',
    JSON.stringify(
      model.doGenerateCalls[0],
    ).includes(
      '"only":["openai"]',
    ),
    JSON.stringify(
      model.doGenerateCalls[0],
    ),
  );

  check(
    'uses zero automatic retries and the registry output-token bound',
    EVALUATION_MAX_RETRIES === 0 &&
      model.doGenerateCalls[0]
        ?.maxOutputTokens ===
        CAO_PREVIEW_REGISTRY_ENTRY
          .limits.maximumOutputTokens,
    JSON.stringify(
      model.doGenerateCalls[0],
    ),
  );

  check(
    'returns one schema-valid bounded draft for human review',
    report.localExecution
      .modelRun.schemaValid &&
      report.localExecution
        .modelRun.boundaryValid &&
      report.localExecution
        .draftForHumanReview !==
        null &&
      report.localExecution
        .finalAudit.outcome ===
        'draft_completed',
  );

  check(
    'preserves exact evidence reference and material dissent',
    report.localExecution
      .draftForHumanReview
      ?.evidenceReferences
      .includes(
        'synthetic-execution-evidence-001',
      ) === true &&
      (
        report.localExecution
          .draftForHumanReview
          ?.dissent.length ?? 0
      ) > 0,
  );

  check(
    'records bounded diagnostic usage without controlling disposition',
    report.localExecution
      .modelRun.usage.inputTokens ===
        500 &&
      report.localExecution
        .modelRun.usage.outputTokens ===
        700 &&
      report.localExecution
        .modelRun.usage.latencyMs ===
        1_250 &&
      report.localExecution
        .modelRun.usage
        .estimatedCostMicros ===
        1_900 &&
      report.humanReviewRequired &&
      !report.automaticApproval,
  );

  check(
    'retains the full non-autonomous and tool-free posture',
    report.requestedTools.length ===
      0 &&
      report.effectiveTools.length ===
        0 &&
      report.toolCalls.length ===
        0 &&
      !report.providerLookupPerformed &&
      !report.automaticApproval &&
      !report.automaticDispatch &&
      !report.automaticContinuation &&
      !report.fallbackPerformed &&
      !report.substitutionPerformed &&
      !report.persistencePerformed &&
      !report.productionEligible &&
      !report.localExecution
        .toolExecutionPerformed &&
      !report.localExecution
        .persistencePerformed &&
      !report.localExecution
        .fallbackPerformed &&
      !report.localExecution
        .substitutionPerformed &&
      !report.localExecution
        .productionEligible,
  );

  {
    const invalidAcceptance =
      clone(
        gateAcceptanceFor(
          request,
        ),
      ) as
        ExecutiveAgentsPreviewGateAcceptance;

    (
      invalidAcceptance as unknown as {
        automaticContinuationAllowed:
          boolean;
      }
    ).automaticContinuationAllowed =
      true;

    const unusedModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                request,
              ),
            ),
      });

    check(
      'rejects forged gate acceptance before model invocation',
      await rejects(
        () =>
          executeCaoPreview({
            gateAcceptance:
              invalidAcceptance,
            routeRequest:
              request,
            model:
              unusedModel,
            pricing: {
              inputMicrosPerMillionTokens:
                1,
              outputMicrosPerMillionTokens:
                1,
            },
          }),
        'exact accepted Preview gate result',
      ) &&
        unusedModel.doGenerateCalls
          .length === 0,
    );
  }

  {
    const mismatched =
      clone(request);

    mismatched.runId =
      'synthetic-cao-preview-execution-mismatch';

    const unusedModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                mismatched,
              ),
            ),
      });

    check(
      'rejects route and gate run-ID mismatch before model invocation',
      await rejects(
        () =>
          executeCaoPreview({
            gateAcceptance:
              gateAcceptanceFor(
                request,
              ),
            routeRequest:
              mismatched,
            model:
              unusedModel,
            pricing: {
              inputMicrosPerMillionTokens:
                1,
              outputMicrosPerMillionTokens:
                1,
            },
          }),
        'does not match the accepted gate request',
      ) &&
        unusedModel.doGenerateCalls
          .length === 0,
    );
  }

  {
    const mismatched =
      clone(request);

    mismatched.taskClass =
      'evaluation_only';

    const unusedModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                mismatched,
              ),
            ),
      });

    check(
      'rejects route and gate task mismatch before model invocation',
      await rejects(
        () =>
          executeCaoPreview({
            gateAcceptance:
              gateAcceptanceFor(
                request,
              ),
            routeRequest:
              mismatched,
            model:
              unusedModel,
            pricing: {
              inputMicrosPerMillionTokens:
                1,
              outputMicrosPerMillionTokens:
                1,
            },
          }),
        'does not match the accepted gate request',
      ) &&
        unusedModel.doGenerateCalls
          .length === 0,
    );
  }

  {
    const invalid =
      clone(request);

    (
      invalid as unknown as {
        sensitiveContentPresent:
          boolean;
      }
    ).sensitiveContentPresent =
      true;

    const unusedModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                request,
              ),
            ),
      });

    check(
      'rejects sensitive-content request through route preflight',
      await rejects(
        () =>
          executeCaoPreview({
            gateAcceptance:
              gateAcceptanceFor(
                request,
              ),
            routeRequest:
              invalid,
            model:
              unusedModel,
            pricing: {
              inputMicrosPerMillionTokens:
                1,
              outputMicrosPerMillionTokens:
                1,
            },
          }),
        'route preflight failed',
      ) &&
        unusedModel.doGenerateCalls
          .length === 0,
    );
  }

  {
    const invalid =
      clone(request);

    (
      invalid.evidence[0] as {
        classification:
          string;
      }
    ).classification =
      'customer_data';

    const unusedModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                request,
              ),
            ),
      });

    check(
      'rejects unapproved evidence classification before model invocation',
      await rejects(
        () =>
          executeCaoPreview({
            gateAcceptance:
              gateAcceptanceFor(
                request,
              ),
            routeRequest:
              invalid,
            model:
              unusedModel,
            pricing: {
              inputMicrosPerMillionTokens:
                1,
              outputMicrosPerMillionTokens:
                1,
            },
          }),
        'route preflight failed',
      ) &&
        unusedModel.doGenerateCalls
          .length === 0,
    );
  }

  {
    const schemaFailureModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration({
              unexpected:
                'field',
            }),
      });

    const failed =
      await executeCaoPreview({
        gateAcceptance:
          gateAcceptanceFor(
            request,
          ),
        routeRequest:
          request,
        model:
          schemaFailureModel,
        pricing: {
          inputMicrosPerMillionTokens:
            1,
          outputMicrosPerMillionTokens:
            1,
        },
        clock:
          clock(),
      });

    check(
      'schema failure remains sanitized, fail-closed, and unrepaired',
      schemaFailureModel
        .doGenerateCalls.length ===
        1 &&
        failed.localExecution
          .modelRun.outcome ===
          'failed_schema' &&
        failed.localExecution
          .modelRun.schemaValid ===
          false &&
        failed.localExecution
          .draftForHumanReview ===
          null &&
        failed.localExecution
          .modelRun
          .sanitizedFailureDetail ===
          'The model response did not satisfy the strict evaluation-output schema.' &&
        failed.localExecution
          .modelRun.notes.some(
            note =>
              note.includes(
                'No fallback, repair, or substitute model',
              ),
          ),
    );
  }

  {
    const providerFailureModel =
      new MockLanguageModelV3({
        doGenerate:
          async () => {
            throw new Error(
              'sensitive raw provider detail',
            );
          },
      });

    const failed =
      await executeCaoPreview({
        gateAcceptance:
          gateAcceptanceFor(
            request,
          ),
        routeRequest:
          request,
        model:
          providerFailureModel,
        pricing: {
          inputMicrosPerMillionTokens:
            1,
          outputMicrosPerMillionTokens:
            1,
        },
        clock:
          clock(),
      });

    const serialized =
      JSON.stringify(failed);

    check(
      'provider failure exposes only sanitized bounded failure evidence',
      providerFailureModel
        .doGenerateCalls.length ===
        1 &&
        failed.localExecution
          .modelRun.outcome ===
          'failed_provider' &&
        failed.localExecution
          .draftForHumanReview ===
          null &&
        failed.localExecution
          .modelRun
          .sanitizedFailureDetail ===
          'The injected model evaluation failed before producing a validated draft.' &&
        !serialized.includes(
          'sensitive raw provider detail',
        ),
    );
  }

  {
    const limitModel =
      new MockLanguageModelV3({
        doGenerate:
          async () =>
            mockGeneration(
              validWireOutput(
                request,
              ),
              {
                inputTokens:
                  20_000,
                outputTokens:
                  5_000,
              },
            ),
      });

    const limited =
      await executeCaoPreview({
        gateAcceptance:
          gateAcceptanceFor(
            request,
          ),
        routeRequest:
          request,
        model:
          limitModel,
        pricing: {
          inputMicrosPerMillionTokens:
            10_000_000,
          outputMicrosPerMillionTokens:
            20_000_000,
        },
        clock:
          clock(),
      });

    check(
      'actual token or cost limit breach withholds the draft',
      limitModel.doGenerateCalls
        .length === 1 &&
        limited.localExecution
          .actualLimitFindings
          .length > 0 &&
        limited.localExecution
          .draftForHumanReview ===
          null &&
        limited.localExecution
          .finalAudit.outcome ===
          'blocked_limit',
      JSON.stringify(
        limited.localExecution
          .actualLimitFindings,
      ),
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

void main();
