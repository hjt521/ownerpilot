/**
 * Deterministic tests for the bounded live-provider evaluation command seam.
 *
 * No network, real credential, environment-variable lookup, provider discovery,
 * persistence, Preview activation, Production action, or fallback is used.
 */

import { MockLanguageModelV3 } from 'ai/test';
import {
  executeLiveProviderEvaluation,
  type LiveProviderEvaluationCommandDependencies,
} from './liveProviderEvaluationCommand';
import {
  parseLiveProviderEvaluationArguments,
  type LiveProviderEvaluationCommandConfig,
} from './liveProviderEvaluationConfig';
import {
  SYNTHETIC_MODEL_EVALUATION_CASES,
} from './__fixtures__/syntheticEvaluationCases';
import type {
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
      'Synthetic evidence remains incomplete.',
    ],
    recommendations: [
      'Prepare a bounded draft-only next step.',
    ],
    dissent: [
      'Material synthetic dissent remains unresolved.',
    ],
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
      'Synthetic live-provider evaluation draft.',
  };
}

const evaluationCase =
  SYNTHETIC_MODEL_EVALUATION_CASES[0];

function validConfig():
  LiveProviderEvaluationCommandConfig {
  return parseLiveProviderEvaluationArguments([
    '--confirm-live-provider-evaluation',
    '--suite-id',
    'live-provider-command-test-v1',
    '--source-commit',
    '29725db919dac324914cfb7c272cc46ffc28e505',
    '--approval-reference',
    'founder-omnibus-authorization-2026-08-01',
    '--gateway-api-key-file',
    '/tmp/ownerpilot-test-gateway-key',
    '--case-id',
    evaluationCase.id,
    '--maximum-output-tokens',
    '1200',
    '--timeout-ms',
    '5000',
    '--primary-provider-id',
    'provider-primary',
    '--primary-model-id',
    'provider-primary/model-2026-08-01',
    '--primary-pinned-model-version',
    'provider-primary/model-2026-08-01',
    '--primary-reasoning-level',
    'standard',
    '--primary-input-micros-per-million-tokens',
    '2000000',
    '--primary-output-micros-per-million-tokens',
    '8000000',
    '--challenger-provider-id',
    'provider-challenger',
    '--challenger-model-id',
    'provider-challenger/model-2026-08-01',
    '--challenger-pinned-model-version',
    'provider-challenger/model-2026-08-01',
    '--challenger-reasoning-level',
    'standard',
    '--challenger-input-micros-per-million-tokens',
    '3000000',
    '--challenger-output-micros-per-million-tokens',
    '10000000',
  ]);
}

interface DependencyObservations {
  repositoryInspections: number;
  credentialInspections: number;
  credentialReads: number;
  modelFactoryCreations: number;
  receivedApiKey: string | null;
  modelIds: string[];
  models: MockLanguageModelV3[];
}

function dependenciesFor(
  observations: DependencyObservations,
  overrides: Partial<
    LiveProviderEvaluationCommandDependencies
  > = {},
): LiveProviderEvaluationCommandDependencies {
  return {
    inspectRepository: () => {
      observations.repositoryInspections++;

      return {
        repositoryRootRealPath:
          '/work/ownerpilot',
        headCommit:
          '29725db919dac324914cfb7c272cc46ffc28e505',
        workingTreeStatus: '',
      };
    },
    inspectCredentialFile: () => {
      observations.credentialInspections++;

      return {
        realPath:
          '/tmp/ownerpilot-test-gateway-key',
        isRegularFile: true,
        sizeBytes: 25,
        mode: 0o100600,
      };
    },
    readCredentialFile: () => {
      observations.credentialReads++;
      return 'synthetic-secret-token\n';
    },
    createGatewayModelFactory:
      apiKey => {
        observations.modelFactoryCreations++;
        observations.receivedApiKey = apiKey;

        return modelId => {
          observations.modelIds.push(modelId);

          const model =
            new MockLanguageModelV3({
              doGenerate: async () =>
                mockGeneration(
                  JSON.stringify(
                    validOutput(evaluationCase),
                  ),
                ),
            });

          observations.models.push(model);
          return model;
        };
      },
    ...overrides,
  };
}

function observations():
  DependencyObservations {
  return {
    repositoryInspections: 0,
    credentialInspections: 0,
    credentialReads: 0,
    modelFactoryCreations: 0,
    receivedApiKey: null,
    modelIds: [],
    models: [],
  };
}

async function rejection(
  config: LiveProviderEvaluationCommandConfig,
  dependencies:
    LiveProviderEvaluationCommandDependencies,
  expectedMessage: string,
): Promise<boolean> {
  try {
    await executeLiveProviderEvaluation(
      config,
      dependencies,
    );
    return false;
  } catch (error) {
    return (
      error instanceof Error &&
      error.message.includes(expectedMessage)
    );
  }
}

async function main(): Promise<void> {
  console.log('\nBounded live-provider command');

  const successObservations = observations();
  const config = validConfig();

  const report =
    await executeLiveProviderEvaluation(
      config,
      dependenciesFor(
        successObservations,
      ),
    );

  check(
    'evaluates only the explicitly selected synthetic case',
    report.caseReports.length === 1 &&
      report.caseReports[0].caseId ===
        evaluationCase.id,
  );

  check(
    'creates exactly one explicit primary and challenger model',
    successObservations.modelFactoryCreations === 1 &&
      successObservations.modelIds.length === 2 &&
      successObservations.modelIds[0] ===
        config.primaryCandidate.modelId &&
      successObservations.modelIds[1] ===
        config.challengerCandidate.modelId,
  );

  check(
    'trims the credential before creating the Gateway model factory',
    successObservations.receivedApiKey ===
      'synthetic-secret-token',
  );

  check(
    'invokes each injected model exactly once',
    successObservations.models.length === 2 &&
      successObservations.models.every(
        model =>
          model.doGenerateCalls.length === 1,
      ),
  );

  check(
    'retains the local-only human-decision report posture',
    report.environment ===
      'local_evaluation' &&
      report.humanInitiated &&
      !report.automaticSelection &&
      report.humanDecisionRequired &&
      !report.productionEligible &&
      !report.previewActivationPerformed &&
      !report.persistencePerformed &&
      !report.fallbackPerformed &&
      !report.substitutionPerformed,
  );

  check(
    'does not place the credential in the report',
    !JSON.stringify(report).includes(
      'synthetic-secret-token',
    ),
  );

  console.log('\nFail-closed preflight');


  const confirmationObservations =
    observations();
  const confirmationRejected =
    await rejection(
      {
        ...config,
        humanConfirmed: false,
      } as unknown as LiveProviderEvaluationCommandConfig,
      dependenciesFor(
        confirmationObservations,
      ),
      'explicitly human confirmed',
    );

  check(
    'rejects a missing human confirmation before repository inspection',
    confirmationRejected &&
      confirmationObservations
        .repositoryInspections === 0 &&
      confirmationObservations
        .credentialInspections === 0,
  );

  const commitObservations = observations();
  const commitRejected =
    await rejection(
      config,
      dependenciesFor(
        commitObservations,
        {
          inspectRepository: () => {
            commitObservations
              .repositoryInspections++;

            return {
              repositoryRootRealPath:
                '/work/ownerpilot',
              headCommit:
                '0000000000000000000000000000000000000000',
              workingTreeStatus: '',
            };
          },
        },
      ),
      'does not match --source-commit',
    );

  check(
    'rejects a source-commit mismatch before credential access',
    commitRejected &&
      commitObservations.credentialInspections ===
        0 &&
      commitObservations.credentialReads === 0 &&
      commitObservations.modelFactoryCreations ===
        0,
  );

  const dirtyObservations = observations();
  const dirtyRejected =
    await rejection(
      config,
      dependenciesFor(
        dirtyObservations,
        {
          inspectRepository: () => {
            dirtyObservations
              .repositoryInspections++;

            return {
              repositoryRootRealPath:
                '/work/ownerpilot',
              headCommit: config.sourceCommit,
              workingTreeStatus:
                ' M synthetic-file.ts',
            };
          },
        },
      ),
      'requires a clean working tree',
    );

  check(
    'rejects a dirty tree before credential access',
    dirtyRejected &&
      dirtyObservations.credentialInspections ===
        0 &&
      dirtyObservations.credentialReads === 0,
  );

  const insideObservations = observations();
  const insideRejected =
    await rejection(
      {
        ...config,
        gatewayApiKeyFile:
          '/work/ownerpilot/.gateway-key',
      },
      dependenciesFor(
        insideObservations,
        {
          inspectCredentialFile: () => {
            insideObservations
              .credentialInspections++;

            return {
              realPath:
                '/work/ownerpilot/.gateway-key',
              isRegularFile: true,
              sizeBytes: 25,
              mode: 0o100600,
            };
          },
        },
      ),
      'outside the repository',
    );

  check(
    'rejects a credential resolving inside the repository before reading it',
    insideRejected &&
      insideObservations.credentialReads === 0 &&
      insideObservations.modelFactoryCreations ===
        0,
  );

  const modeObservations = observations();
  const modeRejected =
    await rejection(
      config,
      dependenciesFor(
        modeObservations,
        {
          inspectCredentialFile: () => {
            modeObservations
              .credentialInspections++;

            return {
              realPath:
                '/tmp/ownerpilot-test-gateway-key',
              isRegularFile: true,
              sizeBytes: 25,
              mode: 0o100644,
            };
          },
        },
      ),
      'must not grant group or other permissions',
    );

  check(
    'rejects an insecure credential-file mode before reading it',
    modeRejected &&
      modeObservations.credentialReads === 0,
  );

  const typeObservations = observations();
  const typeRejected =
    await rejection(
      config,
      dependenciesFor(
        typeObservations,
        {
          inspectCredentialFile: () => {
            typeObservations
              .credentialInspections++;

            return {
              realPath:
                '/tmp/ownerpilot-test-gateway-key',
              isRegularFile: false,
              sizeBytes: 25,
              mode: 0o100600,
            };
          },
        },
      ),
      'regular file',
    );

  check(
    'rejects a non-file credential path',
    typeRejected &&
      typeObservations.credentialReads === 0,
  );

  const whitespaceObservations =
    observations();
  const whitespaceRejected =
    await rejection(
      config,
      dependenciesFor(
        whitespaceObservations,
        {
          readCredentialFile: () => {
            whitespaceObservations
              .credentialReads++;

            return 'invalid token with spaces';
          },
        },
      ),
      'one nonempty bounded token',
    );

  check(
    'rejects a credential containing whitespace before model creation',
    whitespaceRejected &&
      whitespaceObservations
        .modelFactoryCreations === 0,
  );

  console.log(
    '\n------------------------------------------------------------',
  );
  console.log(
    `  ${passed} passed, ${failed} failed`,
  );
  console.log(
    '------------------------------------------------------------\n',
  );

  if (failed > 0) {
    process.exit(1);
  }
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
