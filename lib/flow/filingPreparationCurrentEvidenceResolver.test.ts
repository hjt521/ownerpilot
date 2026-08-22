import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import type {
  GenerationWritePlanEntry,
  OfficialFormGenerationBindingEvaluation,
} from './officialFormGenerationBinding';
import type { OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeFieldWritePlanDigest,
  computeGeneratedDocumentId,
  computePreparationAuthorizationSnapshotId,
  computePreparationRuntimeManifestId,
  computeQpdfAssetIdentityDigest,
  computeQpdfCommandDigest,
  computeSourceWarningInventoryDigest,
  evaluateOfficialFormGeneratedDraftCurrentness,
  GOVERNED_QPDF_ASSET_IDENTITY,
  QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
  QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
  sha256Bytes,
  type FormPreparationAuthorization,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
  type OfficialFormGeneratedDraftCurrentnessInputs,
  type OfficialGeneratedDraftDefinition,
  type PreparationRuntimeManifest,
} from './officialFormGeneratedDraft';
import {
  resolveFilingPreparationCurrentEvidence,
  type FilingPreparationCurrentEvidenceResolverInput,
  type FilingPreparationCurrentEvidenceSource,
  type FilingPreparationCurrentEvidenceSourceRequest,
  type FilingPreparationCurrentEvidenceSourceResult,
} from './filingPreparationCurrentEvidenceResolver';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RISKPATH_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string): void {
  assert.ok(condition, message);
  passed += 1;
}
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  passed += 1;
}

interface Fixture {
  sourceResult: Extract<FilingPreparationCurrentEvidenceSourceResult, { status: 'AVAILABLE' }>;
}

function fixture(): Fixture {
  const officialSourceBytes = Uint8Array.from([1, 2, 3, 4, 5]);
  const officialSourceSha256 = sha256Bytes(officialSourceBytes);
  const officialSourceIdentity: OfficialSourceIdentity = {
    registryVersion: 1,
    artifactId: `synthetic_authority:TEST-1:2026-01-01:sha256:${officialSourceSha256}`,
    authorityKey: 'synthetic_authority',
    formId: 'TEST-1',
    revisionEffective: '2026-01-01',
    sourceSnapshotId: `sha256:${officialSourceSha256}`,
    repositoryPath: 'synthetic/TEST-1.pdf',
    repositorySha256: officialSourceSha256,
    artifactClass: 'official_blank',
    repositoryStatus: 'present_hash_and_blankness_verified',
  };

  const facts: FilingCanonicalFactsProjection = {
    status: 'READY',
    createdNoticeIdentity: {
      generation: 'created-notice:e23d0a-current-evidence',
      createdAtISO: '2026-08-21T20:00:00.000Z',
    },
    facts: {},
  };

  const preparationAuthorization: FormPreparationAuthorization = {
    authorizationId: 'prep-auth-e23d0a',
    resultId: 'prep-result-e23d0a',
    controlId: 'form-preparation-relevance',
    controlVersion: '1.0.0',
    status: 'CURRENT',
    decision: 'FORM_RELEVANT_FOR_PREPARATION',
    target: {
      artifactId: officialSourceIdentity.artifactId,
      authorityKey: officialSourceIdentity.authorityKey,
      formId: officialSourceIdentity.formId,
      revisionEffective: officialSourceIdentity.revisionEffective,
      sourceSnapshotId: officialSourceIdentity.sourceSnapshotId,
    },
    createdNoticeIdentity: facts.createdNoticeIdentity,
  };

  const preparationDerivativeBytes = Uint8Array.from([10, 20, 30, 40, 50, 60]);
  const preparationDerivativeSha256 = sha256Bytes(preparationDerivativeBytes);
  const warningDigest = computeSourceWarningInventoryDigest([]);
  const preparationManifest: PreparationRuntimeManifest = {
    schemaVersion: 2,
    artifactClass: 'PREPARATION_RUNTIME_DERIVATIVE',
    preparationSourceId: `prep-source:sha256:${preparationDerivativeSha256}`,
    preparationSourcePath: 'synthetic/preparation-runtime.pdf',
    parentOfficialSource: officialSourceIdentity,
    sourceAdmission: {
      policyId: 'qpdf-dual-pass-linearization-isolation-v2',
      status: 'SOURCE_ADMITTED_CLEAN',
      qpdfAsset: GOVERNED_QPDF_ASSET_IDENTITY,
      passA: {
        passId: 'PASS_A_FULL_CHECK',
        command: QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
        commandDigest: computeQpdfCommandDigest(QPDF_SOURCE_ADMISSION_PASS_A_COMMAND),
        exitCode: 0,
        warningCount: 0,
        warningInventoryDigest: warningDigest,
        warningInventory: [],
        errorObserved: false,
        recoveryObserved: false,
        damageWarningObserved: false,
        passwordRecoveryObserved: false,
      },
      passB: {
        passId: 'PASS_B_LINEARIZATION_CHECK',
        command: QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
        commandDigest: computeQpdfCommandDigest(QPDF_SOURCE_ADMISSION_PASS_B_COMMAND),
        exitCode: 0,
        warningCount: 0,
        warningInventoryDigest: warningDigest,
        warningInventory: [],
        errorObserved: false,
        recoveryObserved: false,
        damageWarningObserved: false,
        passwordRecoveryObserved: false,
      },
      recoverySuppressed: true,
      passwordRecoverySuppressed: true,
      warningInventoryEqualityVerified: true,
      warningMultiplicityEqualityVerified: true,
      nonLinearizationWarningObserved: false,
    },
    qpdfNormalization: {
      operation: 'DECRYPT_DISABLE_OBJECT_STREAMS_DETERMINISTIC_ID',
      sourceSha256: officialSourceIdentity.repositorySha256,
      command: ['qpdf', '--deterministic-id', '<OFFICIAL_SOURCE>', '<QPDF_RUNTIME_NORMALIZED_INTERMEDIATE>'],
      intermediateSha256: '1'.repeat(64),
      intermediateByteLength: 100,
      repeatedByteEqual: true,
      qpdfCheck: 'PASS',
      warningCount: 0,
      unencrypted: true,
      nonLinearized: true,
      pageCount: 4,
      xfaPresent: true,
    },
    xfaDisconnection: {
      policyId: 'acroform-fallback-xfa-disconnection-v1',
      state: 'DISCONNECTED_FOR_PREPARATION_RUNTIME',
      pdfLibVersion: '1.17.1',
      pdfLibUpstreamTag: 'v1.17.1',
      updateMetadata: false,
      acroFormAccessor: 'PDFDocument.catalog.getAcroForm',
      acroFormAccessorCreating: false,
      operation: 'DELETE_ACROFORM_XFA_ENTRY',
      xfaPresentOnQpdfIntermediate: true,
      xfaDigest: `xfa:sha256:${'2'.repeat(64)}`,
      xfaCanonicalByteLength: 1000,
      pdfDocumentGetFormUsedDuringTransform: false,
      fieldWritesDuringTransform: 0,
      appearanceUpdatesDuringTransform: false,
      serialization: {
        useObjectStreams: false,
        addDefaultPage: false,
        updateFieldAppearances: false,
      },
      repeatedByteEqual: true,
    },
    preparationDerivative: {
      admission: 'VERIFIED_PREPARATION_FIELD_EQUIVALENT',
      sha256: preparationDerivativeSha256,
      byteLength: preparationDerivativeBytes.byteLength,
      pageCount: 4,
      unencrypted: true,
      nonLinearized: true,
      acroFormPresent: true,
      unflattened: true,
      xfaPresent: false,
      qpdfCheck: 'PASS',
      warningCount: 0,
      governedFieldCount: 186,
      fieldEquivalenceDigest: `field-equivalence:sha256:${'3'.repeat(64)}`,
      semanticDeltaMethod: 'qpdf-direct-object-inventory-v1',
      semanticDelta: 'UNCHANGED',
      semanticDeltaDigest: `semantic-non-xfa:sha256:${'4'.repeat(64)}`,
      printSaveClearPreserved: true,
    },
  };

  const fieldWritePlan: GenerationWritePlanEntry[] = Array.from({ length: 186 }, (_, index) => ({
    action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    fieldId: `FIELD_${String(index + 1).padStart(3, '0')}`,
    sourcePage: (index % 4) + 1,
    fieldType: '/Tx',
    objectReference: `${index + 1} 0 R`,
    reason: 'Synthetic no-write fixture for currentness evaluation.',
  }));
  const binding: Extract<OfficialFormGenerationBindingEvaluation, { status: 'GENERATION_BINDING_READY' }> = {
    status: 'GENERATION_BINDING_READY',
    mapSnapshotId: `map:sha256:${'5'.repeat(64)}`,
    referencedFactSnapshotId: `facts:sha256:${'6'.repeat(64)}`,
    generationInputId: `generation-input:sha256:${'7'.repeat(64)}`,
    generatorContractVersion: 'e23d0a-current-evidence-contract-v1',
    formApplicability: 'NOT_EVALUATED',
    formRequiredness: 'NOT_EVALUATED',
    documentGeneration: 'NOT_PERFORMED',
    pdfMutation: 'NOT_PERFORMED',
    fieldWritePlan,
  };

  const definition: OfficialGeneratedDraftDefinition = {
    generatorImplementationId: 'synthetic-e23d0a-generator',
    generatorImplementationVersion: '1.0.0',
    expectedSourceIdentity: officialSourceIdentity,
    expectedArtifactRole: 'OWNER_GENERATED_PREPARATION',
    expectedPreparationManifestId: computePreparationRuntimeManifestId(preparationManifest),
    expectedMapSnapshotId: binding.mapSnapshotId,
    expectedGeneratorContractVersion: binding.generatorContractVersion,
    expectedPageCount: 4,
    expectedFieldCount: 186,
  };

  const draftBytes = Uint8Array.from([90, 91, 92, 93, 94, 95, 96]);
  const generatedIdentity: GeneratedDraftIdentity = {
    schemaVersion: 1,
    artifactClass: 'GENERATED_DRAFT',
    artifactRole: 'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId: officialSourceIdentity.artifactId,
    officialSourceSnapshotId: officialSourceIdentity.sourceSnapshotId,
    officialSourceSha256: officialSourceIdentity.repositorySha256,
    sourceAdmissionPolicyId: preparationManifest.sourceAdmission.policyId,
    sourceAdmissionStatus: preparationManifest.sourceAdmission.status,
    qpdfAssetIdentityDigest: computeQpdfAssetIdentityDigest(preparationManifest.sourceAdmission.qpdfAsset),
    sourcePassACommandDigest: preparationManifest.sourceAdmission.passA.commandDigest,
    sourcePassAWarningInventoryDigest: preparationManifest.sourceAdmission.passA.warningInventoryDigest,
    sourcePassBCommandDigest: preparationManifest.sourceAdmission.passB.commandDigest,
    sourcePassBWarningInventoryDigest: preparationManifest.sourceAdmission.passB.warningInventoryDigest,
    sourceWarningInventoryDigest: preparationManifest.sourceAdmission.passA.warningInventoryDigest,
    qpdfIntermediateSha256: preparationManifest.qpdfNormalization.intermediateSha256,
    xfaPolicyId: preparationManifest.xfaDisconnection.policyId,
    xfaDigest: preparationManifest.xfaDisconnection.xfaDigest,
    preparationManifestId: definition.expectedPreparationManifestId,
    preparationSourceId: preparationManifest.preparationSourceId,
    preparationDerivativeSha256: preparationManifest.preparationDerivative.sha256,
    preparationFieldEquivalenceDigest: preparationManifest.preparationDerivative.fieldEquivalenceDigest,
    preparationSemanticDeltaDigest: preparationManifest.preparationDerivative.semanticDeltaDigest,
    preparationAuthorizationSnapshotId: computePreparationAuthorizationSnapshotId(preparationAuthorization),
    mapSnapshotId: binding.mapSnapshotId,
    referencedFactSnapshotId: binding.referencedFactSnapshotId,
    generationInputId: binding.generationInputId,
    generatorContractVersion: binding.generatorContractVersion,
    generatorImplementationId: definition.generatorImplementationId,
    generatorImplementationVersion: definition.generatorImplementationVersion,
    fieldWritePlanDigest: computeFieldWritePlanDigest(fieldWritePlan),
    preparedAtISO: '2026-08-21T20:02:00.000Z',
    generatedPdfSha256: sha256Bytes(draftBytes),
    generatedByteLength: draftBytes.byteLength,
  };
  const generatedDraft: GeneratedDraftEvidence = {
    ...generatedIdentity,
    generatedDocumentId: computeGeneratedDocumentId(generatedIdentity),
  };

  const currentnessInputs: OfficialFormGeneratedDraftCurrentnessInputs = {
    definition,
    officialSourceIdentity,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization,
    preparationManifest,
    preparationDerivativeBytes,
    facts,
    evaluateBinding: () => binding,
    draftBytes,
  };

  return {
    sourceResult: {
      status: 'AVAILABLE',
      authenticatedUserId: USER_A,
      riskpathRecordId: RISKPATH_A,
      generatedDraft,
      currentnessInputs,
    },
  };
}

class FakeSource implements FilingPreparationCurrentEvidenceSource {
  calls = 0;
  lastRequest: FilingPreparationCurrentEvidenceSourceRequest | null = null;

  constructor(
    private readonly result: unknown,
    private readonly throwsOnLoad = false,
  ) {}

  async loadCurrentEvidence(
    request: Readonly<FilingPreparationCurrentEvidenceSourceRequest>,
  ): Promise<FilingPreparationCurrentEvidenceSourceResult> {
    this.calls += 1;
    this.lastRequest = { ...request };
    if (this.throwsOnLoad) throw new Error('synthetic source failure');
    return this.result as FilingPreparationCurrentEvidenceSourceResult;
  }
}

function resolverInput(source: FilingPreparationCurrentEvidenceSource): FilingPreparationCurrentEvidenceResolverInput {
  return {
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    source,
  };
}

async function main(): Promise<void> {
  {
    const source = new FakeSource(fixture().sourceResult);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
    } as unknown as FilingPreparationCurrentEvidenceResolverInput);
    equal(result.status, 'BLOCKED', 'caller currentness assertion is rejected');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RESOLVER_INPUT', 'caller currentness fails at resolver input boundary');
    equal(source.calls, 0, 'caller currentness is rejected before source use');
  }

  {
    const source = new FakeSource(fixture().sourceResult);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      currentGeneratedDraft: fixture().sourceResult.generatedDraft,
    } as unknown as FilingPreparationCurrentEvidenceResolverInput);
    equal(result.status, 'BLOCKED', 'caller generated-draft assertion is rejected');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RESOLVER_INPUT', 'caller generated draft fails at resolver input boundary');
    equal(source.calls, 0, 'caller generated draft is rejected before source use');
  }

  {
    const source = new FakeSource(fixture().sourceResult);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      filingPreparationRecord: { fabricated: true },
      ownerReviewEvidence: { fabricated: true },
    } as unknown as FilingPreparationCurrentEvidenceResolverInput);
    equal(result.status, 'BLOCKED', 'caller filing/review assertions are rejected');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RESOLVER_INPUT', 'caller filing/review assertions fail at resolver input boundary');
    equal(source.calls, 0, 'caller filing/review assertions are rejected before source use');
  }

  {
    const source = new FakeSource(fixture().sourceResult);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      authenticatedUserId: 'not-a-uuid',
    });
    equal(result.status, 'BLOCKED', 'malformed authenticated-user UUID fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_AUTHENTICATED_USER_ID', 'malformed authenticated-user UUID has exact blocker');
    equal(source.calls, 0, 'malformed authenticated-user UUID fails before source use');
  }

  {
    const source = new FakeSource(fixture().sourceResult);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      riskpathRecordId: 'not-a-uuid',
    });
    equal(result.status, 'BLOCKED', 'malformed RiskPath UUID fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RISKPATH_RECORD_ID', 'malformed RiskPath UUID has exact blocker');
    equal(source.calls, 0, 'malformed RiskPath UUID fails before source use');
  }

  {
    const source = new FakeSource({ status: 'UNAVAILABLE' });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'unavailable authoritative source fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_UNAVAILABLE', 'unavailable source has exact blocker');
  }

  {
    const source = new FakeSource({ status: 'UNAVAILABLE' }, true);
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'source exception fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_ERROR', 'source exception has exact blocker');
  }

  {
    const source = new FakeSource({ status: 'AVAILABLE', authenticatedUserId: USER_A });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'malformed source result fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_RESULT_INVALID', 'malformed source result has exact blocker');
  }

  {
    const current = fixture().sourceResult;
    const source = new FakeSource({ ...current, authenticatedUserId: USER_B });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'authoritative source user mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_IDENTITY_MISMATCH', 'source user mismatch has exact blocker');
  }

  {
    const current = fixture().sourceResult;
    const source = new FakeSource({ ...current, riskpathRecordId: RISKPATH_B });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'authoritative source RiskPath mismatch fails closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_IDENTITY_MISMATCH', 'source RiskPath mismatch has exact blocker');
  }

  {
    const current = fixture().sourceResult;
    const source = new FakeSource(current);
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'CURRENT_EVIDENCE', 'exact authoritative inputs produce CURRENT_EVIDENCE');
    if (result.status !== 'CURRENT_EVIDENCE') throw new Error('exact fixture must resolve current evidence');
    deepEqual(result.canonicalCurrentness, { status: 'CURRENT', reasons: [] }, 'success carries canonical evaluator CURRENT result');
    deepEqual(result.generatedDraft, current.generatedDraft, 'success returns the exact authoritative generated draft');
    deepEqual(source.lastRequest, { authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }, 'source selection receives only exact server identity context');
  }

  {
    const current = fixture().sourceResult;
    const changedInputs: OfficialFormGeneratedDraftCurrentnessInputs = {
      ...current.currentnessInputs,
      draftBytes: Uint8Array.from([1, 1, 2, 3, 5, 8]),
    };
    const expected = evaluateOfficialFormGeneratedDraftCurrentness(current.generatedDraft, changedInputs);
    equal(expected.status, 'OUT_OF_DATE', 'real canonical evaluator detects material draft-byte change');
    const source = new FakeSource({ ...current, currentnessInputs: changedInputs });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'canonical OUT_OF_DATE cannot be softened');
    if (result.status !== 'BLOCKED') throw new Error('changed bytes must block');
    equal(result.blockReason, 'CURRENT_EVIDENCE_OUT_OF_DATE', 'OUT_OF_DATE has exact resolver blocker');
    deepEqual(result.canonicalCurrentness, expected, 'resolver preserves the real canonical OUT_OF_DATE result');
    if (result.canonicalCurrentness !== 'NOT_EVALUATED') {
      ok(result.canonicalCurrentness.reasons.includes('GENERATED_BYTES_CHANGED'), 'material byte change preserves canonical reason');
    }
  }

  {
    const current = fixture().sourceResult;
    const source = new FakeSource({
      ...current,
      generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
    });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'source-supplied currentness assertion is not accepted as authority');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'SOURCE_RESULT_INVALID', 'source currentness assertion violates exact source contract');
  }

  {
    const current = fixture().sourceResult;
    const malformedInputs = { ...current.currentnessInputs, evaluateBinding: null };
    const source = new FakeSource({ ...current, currentnessInputs: malformedInputs });
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'malformed evaluator inputs fail closed');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENTNESS_EVALUATION_FAILED', 'evaluator exception has exact blocker');
  }

  {
    const current = fixture().sourceResult;
    const source = new FakeSource(current);
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    if (result.status !== 'CURRENT_EVIDENCE') throw new Error('exact fixture must resolve current evidence');
    equal(result.stageF, 'HELD', 'success preserves Stage F hold');
    equal(result.packetComposition, 'NOT_PERFORMED', 'success conveys no packet-composition authority');
    equal(result.signing, 'NOT_PERFORMED', 'success conveys no signing authority');
    equal(result.filing, 'NOT_PERFORMED', 'success conveys no filing authority');
    equal(result.courtSubmission, 'NOT_PERFORMED', 'success conveys no court-submission authority');
    equal(result.service, 'NOT_PERFORMED', 'success conveys no service authority');
    equal(result.legalSufficiency, 'NOT_EVALUATED', 'success makes no legal-sufficiency determination');
    equal(result.autonomousExecution, 'NOT_AUTHORIZED', 'success conveys no autonomous authority');
  }

  {
    const sourceText = readFileSync('lib/flow/filingPreparationCurrentEvidenceResolver.ts', 'utf8');
    ok(
      sourceText.includes('evaluateOfficialFormGeneratedDraftCurrentness('),
      'resolver directly invokes the existing canonical currentness evaluator',
    );
    for (const prohibited of [
      'generatedDraftCurrentness',
      'currentGeneratedDraft',
      'filingPreparationRecord',
      'ownerReviewEvidence',
      '@/lib/supabase',
      'serviceClient',
      '.from(',
      'localStorage',
      'NextRequest',
      'NextResponse',
      'persistFilingPreparationRecord',
      'createFilingPreparationSupabaseStore',
      'setInterval(',
      'setTimeout(',
    ]) {
      ok(!sourceText.includes(prohibited), `resolver source excludes prohibited integration/assertion token: ${prohibited}`);
    }
  }

  console.log(`filingPreparationCurrentEvidenceResolver tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
