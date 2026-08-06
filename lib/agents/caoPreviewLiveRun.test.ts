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
  type CaoPreviewOutputRejectionClass,
  type CaoPreviewOutputRejectionDiagnostic,
  type CaoPreviewProviderFailureDiagnostic,
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
    deploymentEnvironment: 'preview',
    previewEnabledValue: 'true',
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

function report(
  mode:
    | 'valid'
    | 'schema_failure'
    | 'dissent_failure'
    | 'timeout'
    | 'provider_failure'
    | 'authentication'
    | 'rate_limit'
    | 'limit' = 'valid',
): CaoPreviewExecutionReport {
  const draft = {
    facts: ['Synthetic fact.'],
    assumptions: ['Synthetic assumption.'],
    unknowns: [],
    recommendations: [
      'Human review is required.',
    ],
    dissent: [
      'A material alternative remains.',
    ],
    requiredHumanDecisions: [
      'A human must determine disposition.',
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

  const providerFailure =
    mode === 'provider_failure' ||
    mode === 'authentication' ||
    mode === 'rate_limit';

  const valid =
    mode !== 'schema_failure' &&
    mode !== 'timeout' &&
    !providerFailure;

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
      modelRun: {
        outcome:
          mode === 'timeout'
            ? 'failed_timeout'
            : providerFailure
              ? 'failed_provider'
              : mode === 'schema_failure'
                ? 'failed_schema'
                : 'completed',
        schemaValid: valid,
        boundaryValid: valid,
        dissentPreserved:
          mode !== 'dissent_failure',
        noSilentSubstitution: true,
        noAutomaticFallback: true,
        providerErrorClass:
          mode === 'timeout'
            ? 'provider_timeout'
            : mode === 'authentication'
              ? 'provider_authentication'
              : mode === 'rate_limit'
                ? 'provider_rate_limit'
                : mode === 'provider_failure'
                  ? 'provider_upstream_unavailable'
                  : mode === 'schema_failure'
                    ? 'local_output_validation'
                    : null,
      },
      finalAudit: {
        humanDisposition: 'pending',
      },
      actualLimitFindings:
        mode === 'limit'
          ? [
              'actual_per_run_cost_limit_exceeded',
            ]
          : [],
      draftForHumanReview:
        valid ? draft : null,
      toolExecutionPerformed: false,
      persistencePerformed: false,
      fallbackPerformed: false,
      substitutionPerformed: false,
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

async function main(): Promise<void> {
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
      assert.equal(adapterCalls, 0);
      assert.equal(
        response.providerCallPerformed,
        false,
      );
    },
  );

  await check(
    'requires administrator access and explicit human initiation',
    async () => {
      const noAdmin =
        await executeCaoPreviewLiveRun(
          {
            ...dependencies(),
            authenticatedAdmin: false,
          },
          {
            contentType:
              'application/json',
            rawBody: validBody,
          },
        );

      assert.equal(noAdmin.status, 404);

      const noInitiation =
        await executeCaoPreviewLiveRun(
          dependencies(),
          {
            contentType:
              'application/json',
            rawBody: JSON.stringify({
              ...JSON.parse(validBody),
              explicitHumanInitiation:
                false,
            }),
          },
        );

      assert.equal(noInitiation.status, 400);
    },
  );

  await check(
    'requires bounded server-only Gateway configuration',
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
    'invokes one pinned adapter and one execution dependency',
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
              return report();
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
    'withholds invalid schema and missing dissent',
    async () => {
      for (const mode of [
        'schema_failure',
        'dissent_failure',
      ] as const) {
        const response =
          await executeCaoPreviewLiveRun(
            {
              ...dependencies(),
              createGatewayAdapter: () =>
                adapter(),
              executePreview: async () =>
                report(mode),
            },
            {
              contentType:
                'application/json',
              rawBody: validBody,
            },
          );

        assert.equal(response.status, 422);
        assert.equal(response.body.ok, false);
        assert.equal(
          'draft' in response.body,
          false,
        );
      }
    },
  );

  await check(
    'sanitizes timeout and limit failures',
    async () => {
      const timeout =
        await executeCaoPreviewLiveRun(
          {
            ...dependencies(),
            createGatewayAdapter: () =>
              adapter(),
            executePreview: async () =>
              report('timeout'),
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
              report('limit'),
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


  await check(
    'classifies each bounded rejection without exposing it publicly',
    async () => {
      interface MutableReport {
        localExecution: {
          modelRun: {
            outcome: string;
            schemaValid: boolean;
            boundaryValid: boolean;
            dissentPreserved: boolean;
            noSilentSubstitution: boolean;
            noAutomaticFallback: boolean;
            providerErrorClass:
              string | null;
          };
          finalAudit: {
            humanDisposition: string;
          };
          actualLimitFindings: string[];
          draftForHumanReview:
            | null
            | {
                evidenceReferences: string[];
                draftArtifact: string;
              };
          toolExecutionPerformed: boolean;
          persistencePerformed: boolean;
          fallbackPerformed: boolean;
          substitutionPerformed: boolean;
          productionEligible: boolean;
        };
        requestedTools: unknown[];
        effectiveTools: unknown[];
        toolCalls: unknown[];
        automaticApproval: boolean;
        automaticDispatch: boolean;
        automaticContinuation: boolean;
        fallbackPerformed: boolean;
        substitutionPerformed: boolean;
        persistencePerformed: boolean;
        productionEligible: boolean;
      }

      const cases: readonly {
        name: string;
        rejectionClass:
          CaoPreviewOutputRejectionClass;
        expectedError:
          'output_rejected' |
          'limit_exceeded';
        mutate:
          (candidate: MutableReport) => void;
      }[] = [
        {
          name: 'draft missing',
          rejectionClass: 'draft_missing',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .draftForHumanReview = null;
          },
        },
        {
          name: 'run not completed',
          rejectionClass:
            'run_not_completed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.outcome =
              'refused_as_required';
          },
        },
        {
          name: 'schema invalid',
          rejectionClass:
            'schema_invalid',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.schemaValid =
              false;
            candidate.localExecution
              .modelRun.providerErrorClass =
              'local_output_validation';
          },
        },
        {
          name: 'boundary invalid',
          rejectionClass:
            'boundary_invalid',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.boundaryValid =
              false;
          },
        },
        {
          name: 'dissent missing',
          rejectionClass:
            'dissent_not_preserved',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.dissentPreserved =
              false;
          },
        },
        {
          name: 'silent substitution',
          rejectionClass:
            'silent_substitution_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.noSilentSubstitution =
              false;
          },
        },
        {
          name: 'automatic fallback',
          rejectionClass:
            'automatic_fallback_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .modelRun.noAutomaticFallback =
              false;
          },
        },
        {
          name: 'human disposition',
          rejectionClass:
            'human_disposition_invalid',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .finalAudit.humanDisposition =
              'accepted';
          },
        },
        {
          name: 'limit finding',
          rejectionClass:
            'limit_finding_present',
          expectedError: 'limit_exceeded',
          mutate: candidate => {
            candidate.localExecution
              .actualLimitFindings = [
                'synthetic_limit',
              ];
          },
        },
        {
          name: 'tool execution',
          rejectionClass:
            'tool_execution_detected',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .toolExecutionPerformed =
              true;
          },
        },
        {
          name: 'persistence',
          rejectionClass:
            'persistence_detected',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .persistencePerformed =
              true;
          },
        },
        {
          name: 'fallback',
          rejectionClass:
            'fallback_detected',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .fallbackPerformed =
              true;
          },
        },
        {
          name: 'substitution',
          rejectionClass:
            'substitution_detected',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .substitutionPerformed =
              true;
          },
        },
        {
          name: 'Production eligibility',
          rejectionClass:
            'production_eligibility_detected',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.localExecution
              .productionEligible =
              true;
          },
        },
        {
          name: 'automatic approval',
          rejectionClass:
            'report_authority_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.automaticApproval =
              true;
          },
        },
        {
          name: 'automatic dispatch',
          rejectionClass:
            'report_authority_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.automaticDispatch =
              true;
          },
        },
        {
          name: 'automatic continuation',
          rejectionClass:
            'report_authority_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.automaticContinuation =
              true;
          },
        },
        {
          name: 'report tool request',
          rejectionClass:
            'report_authority_invariant_failed',
          expectedError: 'output_rejected',
          mutate: candidate => {
            candidate.requestedTools = [
              'synthetic-tool',
            ];
          },
        },
        {
          name: 'evidence reference missing',
          rejectionClass:
            'evidence_reference_missing',
          expectedError: 'output_rejected',
          mutate: candidate => {
            const draft =
              candidate.localExecution
                .draftForHumanReview;

            assert.notEqual(draft, null);

            if (draft !== null) {
              draft.evidenceReferences =
                [];
            }
          },
        },
      ];

      for (const item of cases) {
        const candidate =
          JSON.parse(
            JSON.stringify(report()),
          ) as MutableReport;

        item.mutate(candidate);

        const diagnostics:
          CaoPreviewOutputRejectionDiagnostic[] =
            [];

        const response =
          await executeCaoPreviewLiveRun(
            {
              ...dependencies(),
              createGatewayAdapter: () =>
                adapter(),
              executePreview: async () =>
                candidate as unknown as
                  CaoPreviewExecutionReport,
              outputRejectionDiagnosticSink:
                diagnostic => {
                  diagnostics.push(
                    diagnostic,
                  );
                },
            },
            {
              contentType:
                'application/json',
              rawBody: validBody,
            },
          );

        assert.deepEqual(
          response.body,
          {
            ok: false,
            error: item.expectedError,
          },
          item.name,
        );
        assert.equal(
          'rejectionClass' in response.body,
          false,
          item.name,
        );
        assert.equal(
          diagnostics.length,
          1,
          item.name,
        );
        assert.equal(
          diagnostics[0]
            ?.rejectionClass,
          item.rejectionClass,
          item.name,
        );
        assert.equal(
          diagnostics[0]
            ?.schemaFailureClass,
          item.rejectionClass ===
            'schema_invalid'
            ? 'local_output_validation'
            : null,
          item.name,
        );

        const serialized =
          JSON.stringify(
            diagnostics[0],
          );

        assert.equal(
          serialized.includes(
            'Synthetic fact.',
          ),
          false,
          item.name,
        );
        assert.equal(
          serialized.includes(
            'Synthetic noncanonical advisory draft.',
          ),
          false,
          item.name,
        );
      }

      const unboundedCandidate =
        JSON.parse(
          JSON.stringify(
            report('schema_failure'),
          ),
        ) as MutableReport;

      unboundedCandidate.localExecution
        .modelRun.providerErrorClass =
        'synthetic-secret-like-raw-detail';

      const boundedDiagnostics:
        CaoPreviewOutputRejectionDiagnostic[] =
          [];

      const boundedResponse =
        await executeCaoPreviewLiveRun(
          {
            ...dependencies(),
            createGatewayAdapter: () =>
              adapter(),
            executePreview: async () =>
              unboundedCandidate as unknown as
                CaoPreviewExecutionReport,
            outputRejectionDiagnosticSink:
              diagnostic => {
                boundedDiagnostics.push(
                  diagnostic,
                );
              },
          },
          {
            contentType:
              'application/json',
            rawBody: validBody,
          },
        );

      assert.deepEqual(
        boundedResponse.body,
        {
          ok: false,
          error: 'output_rejected',
        },
      );
      assert.equal(
        boundedDiagnostics.length,
        1,
      );
      assert.equal(
        boundedDiagnostics[0]
          ?.schemaFailureClass,
        null,
      );
      assert.equal(
        JSON.stringify(
          boundedDiagnostics[0],
        ).includes(
          'synthetic-secret-like-raw-detail',
        ),
        false,
      );
    },
  );

  await check(
    'emits only bounded provider diagnostics while preserving sanitized public errors',
    async () => {
      const cases = [
        {
          mode: 'timeout',
          expectedError:
            'provider_timeout',
          expectedClass:
            'provider_timeout',
        },
        {
          mode: 'authentication',
          expectedError:
            'provider_authentication_failed',
          expectedClass:
            'provider_authentication',
        },
        {
          mode: 'rate_limit',
          expectedError:
            'provider_rate_limited',
          expectedClass:
            'provider_rate_limit',
        },
        {
          mode: 'provider_failure',
          expectedError:
            'provider_failed',
          expectedClass:
            'provider_upstream_unavailable',
        },
      ] as const;

      for (const item of cases) {
        const outputDiagnostics:
          CaoPreviewOutputRejectionDiagnostic[] =
            [];
        const providerDiagnostics:
          CaoPreviewProviderFailureDiagnostic[] =
            [];

        const response =
          await executeCaoPreviewLiveRun(
            {
              ...dependencies(),
              createGatewayAdapter: () =>
                adapter(),
              executePreview: async () =>
                report(item.mode),
              outputRejectionDiagnosticSink:
                diagnostic => {
                  outputDiagnostics.push(
                    diagnostic,
                  );
                },
              providerFailureDiagnosticSink:
                diagnostic => {
                  providerDiagnostics.push(
                    diagnostic,
                  );
                },
            },
            {
              contentType:
                'application/json',
              rawBody: validBody,
            },
          );

        assert.deepEqual(
          response.body,
          {
            ok: false,
            error: item.expectedError,
          },
          item.mode,
        );
        assert.equal(
          outputDiagnostics.length,
          0,
          item.mode,
        );
        assert.equal(
          providerDiagnostics.length,
          1,
          item.mode,
        );
        assert.equal(
          providerDiagnostics[0]
            ?.providerFailureClass,
          item.expectedClass,
          item.mode,
        );

        const serialized =
          JSON.stringify(
            providerDiagnostics[0],
          );

        assert.equal(
          serialized.includes(
            'Synthetic fact.',
          ),
          false,
          item.mode,
        );
        assert.equal(
          serialized.includes(
            'Synthetic noncanonical advisory draft.',
          ),
          false,
          item.mode,
        );
      }
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
}

void main();
