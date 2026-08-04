import { strict as assert } from 'node:assert';

import type { LanguageModel } from 'ai';

import {
  CAO_PREVIEW_ADAPTER_ID,
  CAO_PREVIEW_PRIMARY_MODEL_ID,
  CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
  CAO_PREVIEW_PRIMARY_PROVIDER_ID,
} from './caoPreviewRegistry';

import type {
  CaoRepositoryEvidencePacket,
} from './caoRepositoryEvidence';

import {
  executeCaoPreviewWorkbench,
} from './caoPreviewWorkbench';

const sourceCommit =
  'b4d183573352a3fed2c072dab9fffbfaf3c21eab';

function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    requestVersion: 'cao-preview-workbench-request-v1',
    taskClass: 'architecture_analysis',
    runId: 'synthetic-cao-workbench-001',
    objective: 'Analyze the enterprise workforce recovery package.',
    evidenceScopeId: 'enterprise_workforce_recovery',
    sourceCommit,
    constraints: ['No implementation.', 'No Production action.'],
    knownDecisions: ['PR #338 remains Draft.'],
    unresolvedQuestions: ['When should the Repository Developer Operator begin?'],
    founderApprovalReference: 'founder-omnibus-preview-integration-2026-08-02',
    requestedOutputType: 'architecture_recommendation',
    explicitHumanInitiation: true,
    sensitiveContentPresent: false,
    ...overrides,
  });
}

function packet(unavailableEvidence = false): CaoRepositoryEvidencePacket {
  return {
    version: 'cao-repository-evidence-v1',
    scopeId: 'enterprise_workforce_recovery',
    repository: 'hjt521/ownerpilot',
    sourceCommit,
    collectedAt: '2026-08-04T23:50:00.000Z',
    fileCount: 2,
    totalIncludedBytes: 64,
    truncated: false,
    unavailableEvidence,
    files: [
      {
        repository: 'hjt521/ownerpilot',
        sourceCommit,
        path: 'docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md',
        immutableReference: `https://github.com/hjt521/ownerpilot/blob/${sourceCommit}/docs/agents/ENTERPRISE_AI_WORKFORCE_INDEX.md`,
        classification: 'noncanonical_source_recovery',
        availability: 'available',
        sha256: 'a'.repeat(64),
        originalBytes: 32,
        includedBytes: 32,
        truncated: false,
        content: 'NONCANONICAL enterprise workforce index.',
      },
      {
        repository: 'hjt521/ownerpilot',
        sourceCommit,
        path: 'lib/agents/caoPreviewRegistry.ts',
        immutableReference: `https://github.com/hjt521/ownerpilot/blob/${sourceCommit}/lib/agents/caoPreviewRegistry.ts`,
        classification: 'approved_non_sensitive_repository_derived',
        availability: unavailableEvidence ? 'unavailable' : 'available',
        sha256: unavailableEvidence ? null : 'b'.repeat(64),
        originalBytes: unavailableEvidence ? null : 32,
        includedBytes: unavailableEvidence ? 0 : 32,
        truncated: false,
        content: unavailableEvidence ? null : 'Pinned CAO Preview registry.',
      },
    ],
  };
}

function dependencies(unavailableEvidence = false) {
  return {
    deploymentEnvironment: 'preview',
    previewEnabledValue: 'true',
    routeSecret: 'synthetic-route-secret-123',
    sourceCommitSha: 'c'.repeat(40),
    nowIso: '2026-08-04T23:50:00.000Z',
    authenticatedAdmin: true,
    authenticatedHumanIdentifier: 'admin@example.test',
    gatewayApiKey: 'synthetic-gateway-key',
    inputMicrosPerMillionTokens: '1000000',
    outputMicrosPerMillionTokens: '2000000',
    collectEvidence: async () => packet(unavailableEvidence),
    createGatewayAdapter: () => ({
      adapterVersion: 'cao-preview-gateway-adapter-v1',
      adapterId: CAO_PREVIEW_ADAPTER_ID,
      providerId: CAO_PREVIEW_PRIMARY_PROVIDER_ID,
      modelId: CAO_PREVIEW_PRIMARY_MODEL_ID,
      pinnedModelVersion: CAO_PREVIEW_PRIMARY_PINNED_MODEL_VERSION,
      modelSlot: 'primary' as const,
      model: { specificationVersion: 'v3' } as unknown as LanguageModel,
      providerCallPerformed: false,
      requestedTools: [] as const,
      effectiveTools: [] as const,
      toolCalls: [] as const,
      fallbackAllowed: false as const,
      substitutionAllowed: false as const,
      automaticContinuationAllowed: false as const,
      persistenceAllowed: false as const,
      productionEligible: false as const,
    }),
    executePreview: async () => ({
      gate: { accepted: true } as never,
      routePreflight: { status: 200 } as never,
      requestedTools: [] as const,
      effectiveTools: [] as const,
      toolCalls: [] as const,
      automaticApproval: false as const,
      automaticDispatch: false as const,
      automaticContinuation: false as const,
      fallbackPerformed: false as const,
      substitutionPerformed: false as const,
      persistencePerformed: false as const,
      productionEligible: false as const,
      localExecution: {
        modelRun: {
          outcome: 'completed',
          schemaValid: true,
          boundaryValid: true,
          dissentPreserved: true,
          noSilentSubstitution: true,
          noAutomaticFallback: true,
        },
        draftForHumanReview: {
          facts: ['Repository evidence was reviewed.'],
          assumptions: [],
          unknowns: ['PR #338 remains noncanonical.'],
          recommendations: ['Complete CAO before any operator role.'],
          dissent: ['An operator-first sequence is a competing interpretation.'],
          requiredHumanDecisions: ['Founder acceptance is required.'],
          prohibitedOrUnavailableActions: ['No autonomous continuation.'],
          evidenceReferences: [
            `repository-scope:enterprise_workforce_recovery@${sourceCommit}`,
          ],
          escalationRequired: true,
          draftArtifact: 'NONCANONICAL architecture report.',
        },
        finalAudit: { humanDisposition: 'pending' },
        actualLimitFindings: [],
        toolExecutionPerformed: false,
        persistencePerformed: false,
        fallbackPerformed: false,
        substitutionPerformed: false,
        productionEligible: false,
      },
    } as never),
  };
}

{
  const result = await executeCaoPreviewWorkbench(
    dependencies(),
    { contentType: 'application/json', rawBody: body() },
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  if (result.body.ok && 'workbenchVersion' in result.body) {
    assert.equal(result.body.evidencePacket.files.length, 2);
    assert.equal('content' in result.body.evidencePacket.files[0], false);
    assert.equal(result.body.persistencePerformed, false);
    assert.equal(result.body.repositoryWritePerformed, false);
    assert.equal(result.body.deploymentPerformed, false);
    assert.equal(result.body.automaticContinuation, false);
  }
}

{
  const result = await executeCaoPreviewWorkbench(
    dependencies(),
    { contentType: 'application/json', rawBody: body({ sourceCommit: 'f'.repeat(40) }) },
  );
  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    ok: false,
    error: 'evidence_rejected',
    cause: 'source_commit_mismatch',
  });
}

{
  const result = await executeCaoPreviewWorkbench(
    dependencies(true),
    { contentType: 'application/json', rawBody: body() },
  );
  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    ok: false,
    error: 'evidence_unavailable',
  });
}

{
  const result = await executeCaoPreviewWorkbench(
    dependencies(),
    { contentType: 'application/json', rawBody: body({ arbitraryPath: '.env.production' }) },
  );
  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: 'invalid_request',
  });
}

console.log('caoPreviewWorkbench tests passed');
