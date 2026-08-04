import {
  strict as assert,
} from 'node:assert';

import type {
  LanguageModel,
} from 'ai';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_APPROVAL_REFERENCE,
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

import type {
  CaoRepositoryEvidencePacket,
} from './caoRepositoryEvidence';

import {
  CAO_PREVIEW_WORKBENCH_REQUEST_VERSION,
  executeCaoPreviewWorkbench,
} from './caoPreviewWorkbench';

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

const sourceCommit =
  'b4d183573352a3fed2c072dab9fffbfaf3c21eab';

const validBody = JSON.stringify({
  requestVersion:
    CAO_PREVIEW_WORKBENCH_REQUEST_VERSION,
  taskClass: 'architecture_analysis',
  runId: 'cao-workbench-test-001',
  objective:
    'Analyze the bounded enterprise workforce architecture evidence.',
  evidenceScopeId:
    'enterprise_workforce_recovery',
  sourceCommit,
  constraints: [
    'No role activation.',
  ],
  knownDecisions: [
    'Founder authority remains controlling.',
  ],
  unresolvedQuestions: [
    'What is the smallest safe operator boundary?',
  ],
  founderApprovalReference:
    CAO_PREVIEW_APPROVAL_REFERENCE,
  requestedOutputType:
    'architecture_recommendation',
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
      '2026-08-04T23:45:00.000Z',
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

function evidencePacket(
  unavailableEvidence = false,
): CaoRepositoryEvidencePacket {
  return {
    version: 'cao-repository-evidence-v1',
    scopeId:
      'enterprise_workforce_recovery',
    repository: 'hjt521/ownerpilot',
    sourceCommit,
    collectedAt:
      '2026-08-04T23:45:00.000Z',
    fileCount: 2,
    totalIncludedBytes: 74,
    truncated: false,
    unavailableEvidence,
    files: [
      {
        repository: 'hjt521/ownerpilot',
        sourceCommit,
        path:
          'docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md',
        immutableReference:
          `https://github.com/hjt521/ownerpilot/blob/${sourceCommit}/docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md`,
        classification:
          'noncanonical_source_recovery',
        availability: 'available',
        sha256: '1'.repeat(64),
        originalBytes: 37,
        includedBytes: 37,
        truncated: false,
        content:
          'Synthetic workforce index evidence.',
      },
      {
        repository: 'hjt521/ownerpilot',
        sourceCommit,
        path:
          'lib/agents/caoPreviewRegistry.ts',
        immutableReference:
          `https://github.com/hjt521/ownerpilot/blob/${sourceCommit}/lib/agents/caoPreviewRegistry.ts`,
        classification:
          'approved_non_sensitive_repository_derived',
        availability:
          unavailableEvidence
            ? 'unavailable'
            : 'available',
        sha256:
          unavailableEvidence
            ? null
            : '2'.repeat(64),
        originalBytes:
          unavailableEvidence
            ? null
            : 37,
        includedBytes:
          unavailableEvidence
            ? 0
            : 37,
        truncated: false,
        content:
          unavailableEvidence
            ? null
            : 'Synthetic registry implementation evidence.',
      },
    ],
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
  evidenceReference: string,
): CaoPreviewExecutionReport {
  const draft = {
    facts: [
      'Two approved repository files were reviewed.',
    ],
    assumptions: [
      'The recovery package remains noncanonical.',
    ],
    unknowns: [
      'Future operator authority is unresolved.',
    ],
    recommendations: [
      'Retain human authorization boundaries.',
    ],
    dissent: [
      'A narrower non-agent capability may be safer.',
    ],
    requiredHumanDecisions: [
      'Founder must decide whether to charter an operator.',
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
      evidenceReference,
    ],
    escalationRequired: false,
    draftArtifact:
      '1. Status and authority labels\n2. Executive summary\n22. Explicit prohibition on autonomous continuation',
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
      modelRun: {
        outcome: 'completed',
        schemaValid: true,
        boundaryValid: true,
        dissentPreserved: true,
        noSilentSubstitution: true,
        noAutomaticFallback: true,
        providerErrorClass: null,
      },
      finalAudit: {
        humanDisposition: 'pending',
      },
      actualLimitFindings: [],
      draftForHumanReview: draft,
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
  console.log('\nRestricted CAO Preview workbench');

  await check(
    'rejects malformed assignments before evidence collection',
    async () => {
      let collectionCalls = 0;
      const result = await executeCaoPreviewWorkbench(
        {
          ...dependencies(),
          collectEvidence: async () => {
            collectionCalls += 1;
            return evidencePacket();
          },
        },
        {
          contentType: 'application/json',
          rawBody: JSON.stringify({
            ...JSON.parse(validBody),
            founderApprovalReference: 'stale',
          }),
        },
      );

      assert.equal(result.status, 400);
      assert.equal(collectionCalls, 0);
    },
  );

  await check(
    'surfaces source-commit mismatch from the approved collector',
    async () => {
      const result = await executeCaoPreviewWorkbench(
        {
          ...dependencies(),
          collectEvidence: async input => {
            if (input.sourceCommit !== sourceCommit) {
              throw new Error('source_commit_mismatch');
            }
            return evidencePacket();
          },
        },
        {
          contentType: 'application/json',
          rawBody: JSON.stringify({
            ...JSON.parse(validBody),
            sourceCommit: 'f'.repeat(40),
          }),
        },
      );

      assert.deepEqual(result.body, {
        ok: false,
        error: 'evidence_rejected',
        cause: 'source_commit_mismatch',
      });
    },
  );

  await check(
    'fails closed when approved evidence is unavailable',
    async () => {
      const result = await executeCaoPreviewWorkbench(
        {
          ...dependencies(),
          collectEvidence: async () =>
            evidencePacket(true),
        },
        {
          contentType: 'application/json',
          rawBody: validBody,
        },
      );

      assert.deepEqual(result.body, {
        ok: false,
        error: 'evidence_unavailable',
      });
    },
  );

  await check(
    'executes one pinned run and returns a content-free evidence manifest',
    async () => {
      let adapterCalls = 0;
      let executionCalls = 0;
      const reference =
        `repository-scope:enterprise_workforce_recovery@${sourceCommit}`;

      const result = await executeCaoPreviewWorkbench(
        {
          ...dependencies(),
          collectEvidence: async () =>
            evidencePacket(),
          createGatewayAdapter: () => {
            adapterCalls += 1;
            return adapter();
          },
          executePreview: async options => {
            executionCalls += 1;
            assert.equal(
              options.routeRequest.evidence.length,
              1,
            );
            assert.equal(
              options.routeRequest.evidence[0].reference,
              reference,
            );
            assert.match(
              options.routeRequest.evidence[0].content,
              /ENTERPRISE_AI_WORKFORCE_INDEX/,
            );
            assert.match(
              options.routeRequest.instructions,
              /File-level implementation map/,
            );
            return report(reference);
          },
        },
        {
          contentType: 'application/json',
          rawBody: validBody,
        },
      );

      assert.equal(result.status, 200);
      assert.equal(adapterCalls, 1);
      assert.equal(executionCalls, 1);
      assert.equal(result.body.ok, true);

      if (!result.body.ok || !('evidencePacket' in result.body)) {
        throw new Error('expected workbench success');
      }

      assert.equal(result.body.evidencePacket.fileCount, 2);
      assert.equal(
        'content' in result.body.evidencePacket.files[0],
        false,
      );
      assert.equal(result.body.persistencePerformed, false);
      assert.equal(result.body.repositoryWritePerformed, false);
      assert.equal(result.body.deploymentPerformed, false);
      assert.equal(result.body.automaticContinuation, false);
    },
  );

  await check(
    'preserves exact Preview-only gate and performs no provider call in Production',
    async () => {
      let adapterCalls = 0;
      const result = await executeCaoPreviewWorkbench(
        {
          ...dependencies(),
          deploymentEnvironment: 'production',
          collectEvidence: async () =>
            evidencePacket(),
          createGatewayAdapter: () => {
            adapterCalls += 1;
            return adapter();
          },
        },
        {
          contentType: 'application/json',
          rawBody: validBody,
        },
      );

      assert.equal(result.status, 404);
      assert.equal(adapterCalls, 0);
    },
  );

  console.log(`\n  ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
