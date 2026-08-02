import {
  strict as assert,
} from 'node:assert';

import type {
  LanguageModel,
} from 'ai';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
} from './caoPreviewRegistry';

import type {
  CaoPreviewExecutionReport,
} from './caoPreviewExecution';

import {
  CAO_PREVIEW_GATEWAY_ADAPTER_VERSION,
  type CaoPreviewGatewayAdapter,
} from './caoPreviewGatewayAdapter';

import {
  executeCaoPreviewLiveRun,
} from './caoPreviewLiveRun';

let passed = 0;
let failed = 0;

async function check(
  name: string,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
  }
}

const validBody = JSON.stringify({
  requestVersion:
    'executive-agents-preview-ui-request-v1',
  taskClass:
    'architecture_analysis',
  runId:
    'synthetic-cao-live-001',
  instructions:
    'Analyze the bounded synthetic architecture evidence.',
  evidenceReference:
    'synthetic-evidence-001',
  evidenceClassification:
    'synthetic',
  evidenceContent:
    'Synthetic service A depends on synthetic service B.',
  explicitHumanInitiation: true,
  sensitiveContentPresent: false,
});

function dependencies() {
  return {
    deploymentEnvironment:
      'preview',
    previewEnabledValue:
      'true',
    routeSecret:
      'synthetic-route-secret-123',
    sourceCommitSha:
      'a'.repeat(40),
    nowIso:
      '2026-08-02T20:00:00.000Z',
    authenticatedAdmin: true,
    authenticatedHumanIdentifier:
      'admin@example.test',
    gatewayApiKey:
      'synthetic-gateway-key',
    inputMicrosPerMillionTokens:
      '1000000',
    outputMicrosPerMillionTokens:
      '2000000',
  };
}

function adapter():
CaoPreviewGatewayAdapter {
  return {
    adapterVersion:
      CAO_PREVIEW_GATEWAY_ADAPTER_VERSION,
    adapterId:
      CAO_PREVIEW_ADAPTER_ID,
    providerId:
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    modelSlot: 'primary',
    model: {
      specificationVersion: 'v3',
    } as unknown as LanguageModel,
    providerCallPerformed: false,
    requestedTools: [],
    effectiveTools: [],
    toolCalls: [],
    fallbackAllowed: false,
    substitutionAllowed: false,
    automaticContinuationAllowed: false,
    persistenceAllowed: false,
    productionEligible: false,
  };
}

function executionReport(
  overrides?: {
    schemaValid?: boolean;
    boundaryValid?: boolean;
    dissentPreserved?: boolean;
    draftPresent?: boolean;
    providerOutcome?:
      | 'completed'
      | 'failed_provider'
      | 'failed_timeout';
    providerErrorClass?: string | null;
    limitFindings?: readonly string[];
  },
): CaoPreviewExecutionReport {
  const draft = {
    facts: [
      'Synthetic fact.',
    ],
    assumptions: [
      'Synthetic assumption.',
    ],
    unknowns: [],
    recommendations: [
      'Human should review the synthetic dependency.',
    ],
    dissent: [
      'A material alternative is to defer the dependency.',
    ],
    requiredHumanDecisions: [
      'A human must decide whether to proceed.',
    ],
    prohibitedOrUnavailableActions: [
      'repository writes are unavailable',
      'database writes are unavailable',
      'deployment is unavailable',
      'external communication is unavailable',
      'tool execution is unavailable',
      'automatic continuation is unavailable',
      'Production action is unavailable',
    ],
    evidenceReferences: [
      'synthetic-evidence-001',
    ],
    escalationRequired: false,
    draftArtifact:
      'Synthetic noncanonical advisory draft.',
  };

  return {
    executionVersion:
      'cao-preview-execution-v1',
    executionMode:
      'preview_injected_cao_single_role',
    preflightValidated: true,
    routeRequestValidated: true,
    modelInvocationPerformed: true,
    providerLookupPerformed: false,
    roleId:
      'executive.chief_architecture_officer',
    taskClass:
      'architecture_analysis',
    modelSlot: 'primary',
    providerId:
      CAO_PREVIEW_PRIMARY_PROVIDER_ID,
    modelId:
      CAO_PREVIEW_PRIMARY_MODEL_ID,
    pinnedModelVersion:
      CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
    labels: [
      'NONCANONICAL',
      'ADVISORY',
      'DRAFT-ONLY',
      'HUMAN REVIEW REQUIRED',
      'NO IMPLEMENTATION AUTHORITY',
      'NO PRODUCTION AUTHORITY',
    ],
    localExecution: {
      executionMode:
        'local_injected_single_role',
      runRequestValidated: true,
      roleId:
        'executive.chief_architecture_officer',
      taskClass:
        'architecture_analysis',
      modelSlot: 'primary',
      modelRun: {
        runId:
          'synthetic-cao-live-001',
        caseId:
          'cao-preview-synthetic-cao-live-001',
        roleId:
          'executive.chief_architecture_officer',
        taskClass:
          'architecture_analysis',
        candidate: {
          providerId:
            CAO_PREVIEW_PRIMARY_PROVIDER_ID,
          modelId:
            CAO_PREVIEW_PRIMARY_MODEL_ID,
          pinnedModelVersion:
            CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
          adapterId:
            CAO_PREVIEW_ADAPTER_ID,
          slot: 'primary',
          reasoningLevel: 'standard',
        },
        promptVersion:
          'executive-agent-local-single-role-v1',
        startedAt:
          '2026-08-02T20:00:00.000Z',
        completedAt:
          '2026-08-02T20:00:01.000Z',
        outcome:
          overrides?.providerOutcome ??
          'completed',
        output:
          overrides?.draftPresent === false
            ? null
            : draft,
        usage: {
          latencyMs: 1000,
          inputTokens: 100,
          outputTokens: 200,
          estimatedCostMicros: 500,
        },
        dimensions: [],
        schemaValid:
          overrides?.schemaValid ?? true,
        boundaryValid:
          overrides?.boundaryValid ?? true,
        refusalCorrect: true,
        dissentPreserved:
          overrides?.dissentPreserved ?? true,
        uncertaintyPreserved: true,
        noSilentSubstitution: true,
        noAutomaticFallback: true,
        providerErrorClass:
          overrides?.providerErrorClass ?? null,
        sanitizedFailureDetail: null,
        notes: [],
      },
      finalAudit: {
        runId:
          'synthetic-cao-live-001',
        roleId:
          'executive.chief_architecture_officer',
        registryVersion:
          'executive-agent-cao-preview-registry-v1',
        charterVersion:
          'executive-agent-charter-v1',
        registryEntryHash:
          'a'.repeat(64),
        environment: 'preview',
        sourceCommitSha:
          'a'.repeat(40),
        requestedBy:
          'human_engineering_reviewer:admin@example.test',
        approvalReference:
          'founder-omnibus-preview-integration-2026-08-02',
        taskClass:
          'architecture_analysis',
        modelSlot: 'primary',
        providerId:
          CAO_PREVIEW_PRIMARY_PROVIDER_ID,
        modelId:
          CAO_PREVIEW_PRIMARY_MODEL_ID,
        pinnedModelVersion:
          CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
        adapterId:
          CAO_PREVIEW_ADAPTER_ID,
        reasoningLevel: 'standard',
        effectiveToolPermissions: [],
        toolCalls: [],
        substitutionRequested: false,
        substitutionReasonClass: null,
        fallbackReasonClass: null,
        startedAt:
          '2026-08-02T20:00:00.000Z',
        completedAt:
          '2026-08-02T20:00:01.000Z',
        latencyMs: 1000,
        inputTokenCount: 100,
        outputTokenCount: 200,
        estimatedCostMicros: 500,
        evidenceReferences: [
          'synthetic-evidence-001',
        ],
        unknownsRecorded: [],
        disagreements: [
          'A material alternative is preserved.',
        ],
        outcome: 'draft_completed',
        humanDisposition: 'pending',
      },
      actualDailyCostMicrosAfterRun: 500,
      actualLimitFindings:
        overrides?.limitFindings ?? [],
      draftForHumanReview:
        overrides?.draftPresent === false
          ? null
          : draft,
      humanDecisionRequired: true,
      automaticApproval: false,
      automaticSelection: false,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      providerLookupPerformed: false,
      fallbackPerformed: false,
      substitutionPerformed: false,
      previewActivationPerformed: false,
      productionEligible: false,
    },
    requestedTools: [],
    effectiveTools: [],
    toolCalls: [],
    humanReviewRequired: true,
    automaticApproval: false,
    automaticDispatch: false,
    automaticContinuation: false,
    fallbackPerformed: false,
    substitutionPerformed: false,
    persistencePerformed: false,
    productionEligible: false,
  } as unknown as CaoPreviewExecutionReport;
}

console.log(
  '\nRestricted CAO Preview live run',
);

await check(
  'is completely ineffective in Production',
  async () => {
    let adapterCalls = 0;

    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          deploymentEnvironment:
            'production',
          createGatewayAdapter: () => {
            adapterCalls += 1;
            return adapter();
          },
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(response.status, 404);
    assert.equal(response.body.ok, false);
    assert.equal(adapterCalls, 0);
    assert.equal(
      response.providerCallPerformed,
      false,
    );
  },
);

await check(
  'rejects a missing administrator before adapter construction',
  async () => {
    let adapterCalls = 0;

    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          authenticatedAdmin: false,
          createGatewayAdapter: () => {
            adapterCalls += 1;
            return adapter();
          },
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(response.status, 404);
    assert.equal(adapterCalls, 0);
  },
);

await check(
  'requires exact explicit human initiation',
  async () => {
    const body = JSON.stringify({
      ...JSON.parse(validBody),
      explicitHumanInitiation: false,
    });

    const response =
      await executeCaoPreviewLiveRun(
        dependencies(),
        {
          contentType:
            'application/json',
          rawBody: body,
        },
      );

    assert.equal(response.status, 400);
    assert.deepEqual(
      response.body,
      {
        ok: false,
        error: 'invalid_request',
      },
    );
  },
);

await check(
  'requires the bounded Gateway credential and deterministic pricing',
  async () => {
    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          gatewayApiKey: '',
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(response.status, 503);
    assert.deepEqual(
      response.body,
      {
        ok: false,
        error: 'gateway_unavailable',
      },
    );
  },
);

await check(
  'invokes exactly one pinned adapter and one execution dependency',
  async () => {
    let adapterCalls = 0;
    let executionCalls = 0;

    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          createGatewayAdapter: options => {
            adapterCalls += 1;
            assert.equal(
              options.apiKey,
              'synthetic-gateway-key',
            );
            return adapter();
          },
          executePreview: async options => {
            executionCalls += 1;
            assert.equal(
              options.gateAcceptance.modelSlot,
              'primary',
            );
            assert.equal(
              options.routeRequest.roleId,
              'executive.chief_architecture_officer',
            );
            assert.deepEqual(
              options.gateAcceptance
                .requestedTools,
              [],
            );
            return executionReport();
          },
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(adapterCalls, 1);
    assert.equal(executionCalls, 1);
    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);

    if (response.body.ok) {
      assert.equal(
        response.body.repairAttemptMaximum,
        0,
      );
      assert.equal(
        response.body.humanDisposition,
        'pending',
      );
      assert.deepEqual(
        response.body.toolCalls,
        [],
      );
      assert.equal(
        response.body.productionEligible,
        false,
      );
    }
  },
);

await check(
  'withholds malformed or boundary-invalid output',
  async () => {
    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          createGatewayAdapter: () =>
            adapter(),
          executePreview: async () =>
            executionReport({
              schemaValid: false,
              draftPresent: false,
            }),
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(response.status, 422);
    assert.deepEqual(
      response.body,
      {
        ok: false,
        error: 'output_rejected',
      },
    );
    assert.equal(
      'draft' in response.body,
      false,
    );
  },
);

await check(
  'rejects missing material dissent',
  async () => {
    const response =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          createGatewayAdapter: () =>
            adapter(),
          executePreview: async () =>
            executionReport({
              dissentPreserved: false,
            }),
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.equal(response.status, 422);
    assert.equal(response.body.ok, false);
  },
);

await check(
  'sanitizes provider timeout and limit failures',
  async () => {
    const timeout =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          createGatewayAdapter: () =>
            adapter(),
          executePreview: async () =>
            executionReport({
              providerOutcome:
                'failed_timeout',
              draftPresent: false,
            }),
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.deepEqual(
      timeout.body,
      {
        ok: false,
        error: 'provider_timeout',
      },
    );

    const limited =
      await executeCaoPreviewLiveRun(
        {
          ...dependencies(),
          createGatewayAdapter: () =>
            adapter(),
          executePreview: async () =>
            executionReport({
              limitFindings: [
                'actual_per_run_cost_limit_exceeded',
              ],
            }),
        },
        {
          contentType:
            'application/json',
          rawBody: validBody,
        },
      );

    assert.deepEqual(
      limited.body,
      {
        ok: false,
        error: 'limit_exceeded',
      },
    );
  },
);

console.log(
  `\n${'-'.repeat(72)}\n` +
  `  ${passed} passed, ${failed} failed\n` +
  `${'-'.repeat(72)}`,
);

if (failed > 0) {
  process.exit(1);
}
