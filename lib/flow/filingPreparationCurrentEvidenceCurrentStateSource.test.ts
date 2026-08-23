import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  resolveFilingPreparationCurrentEvidence,
  type FilingPreparationCurrentEvidenceResolverInput,
} from './filingPreparationCurrentEvidenceResolver';
import {
  createFilingPreparationCurrentEvidenceCurrentStateSource,
  type FilingPreparationCurrentnessMaterial,
  type FilingPreparationCurrentnessMaterialLoader,
  type FilingPreparationCurrentnessMaterialRequest,
  type FilingPreparationCurrentStateLatestReader,
} from './filingPreparationCurrentEvidenceCurrentStateSource';
import {
  createFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
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
  GOVERNED_QPDF_ASSET_IDENTITY,
  QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
  QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
  sha256Bytes,
  type FormPreparationAuthorization,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
  type OfficialGeneratedDraftDefinition,
  type PreparationRuntimeManifest,
} from './officialFormGeneratedDraft';

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
  state: FilingPreparationCurrentState;
  generatedDraft: GeneratedDraftEvidence;
  draftBytes: Uint8Array;
  material: FilingPreparationCurrentnessMaterial;
}

function snapshotFromDraft(draft: GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return {
    officialSourceArtifactId: draft.officialSourceArtifactId,
    officialSourceSnapshotId: draft.officialSourceSnapshotId,
    officialSourceSha256: draft.officialSourceSha256,
    sourceAdmissionPolicyId: draft.sourceAdmissionPolicyId,
    sourceAdmissionStatus: draft.sourceAdmissionStatus,
    qpdfAssetIdentityDigest: draft.qpdfAssetIdentityDigest,
    sourcePassACommandDigest: draft.sourcePassACommandDigest,
    sourcePassAWarningInventoryDigest: draft.sourcePassAWarningInventoryDigest,
    sourcePassBCommandDigest: draft.sourcePassBCommandDigest,
    sourcePassBWarningInventoryDigest: draft.sourcePassBWarningInventoryDigest,
    sourceWarningInventoryDigest: draft.sourceWarningInventoryDigest,
    qpdfIntermediateSha256: draft.qpdfIntermediateSha256,
    xfaPolicyId: draft.xfaPolicyId,
    xfaDigest: draft.xfaDigest,
    preparationManifestId: draft.preparationManifestId,
    preparationSourceId: draft.preparationSourceId,
    preparationDerivativeSha256: draft.preparationDerivativeSha256,
    preparationFieldEquivalenceDigest: draft.preparationFieldEquivalenceDigest,
    preparationSemanticDeltaDigest: draft.preparationSemanticDeltaDigest,
    preparationAuthorizationSnapshotId: draft.preparationAuthorizationSnapshotId,
    mapSnapshotId: draft.mapSnapshotId,
    referencedFactSnapshotId: draft.referencedFactSnapshotId,
    generationInputId: draft.generationInputId,
    generatorContractVersion: draft.generatorContractVersion,
    generatorImplementationId: draft.generatorImplementationId,
    generatorImplementationVersion: draft.generatorImplementationVersion,
    fieldWritePlanDigest: draft.fieldWritePlanDigest,
  };
}

function fixture(
  authenticatedUserId = USER_A,
  riskpathRecordId = RISKPATH_A,
  revision = 3,
): Fixture {
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
      generation: 'created-notice:e23d0b4-current-evidence',
      createdAtISO: '2026-08-22T20:00:00.000Z',
    },
    facts: {},
  };

  const preparationAuthorization: FormPreparationAuthorization = {
    authorizationId: 'prep-auth-e23d0b4',
    resultId: 'prep-result-e23d0b4',
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
    reason: 'Synthetic no-write fixture for D0B4 currentness.',
  }));
  const binding: Extract<OfficialFormGenerationBindingEvaluation, { status: 'GENERATION_BINDING_READY' }> = {
    status: 'GENERATION_BINDING_READY',
    mapSnapshotId: `map:sha256:${'5'.repeat(64)}`,
    referencedFactSnapshotId: `facts:sha256:${'6'.repeat(64)}`,
    generationInputId: `generation-input:sha256:${'7'.repeat(64)}`,
    generatorContractVersion: 'e23d0b4-current-evidence-contract-v1',
    formApplicability: 'NOT_EVALUATED',
    formRequiredness: 'NOT_EVALUATED',
    documentGeneration: 'NOT_PERFORMED',
    pdfMutation: 'NOT_PERFORMED',
    fieldWritePlan,
  };

  const definition: OfficialGeneratedDraftDefinition = {
    generatorImplementationId: 'synthetic-e23d0b4-generator',
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
    preparedAtISO: '2026-08-22T20:02:00.000Z',
    generatedPdfSha256: sha256Bytes(draftBytes),
    generatedByteLength: draftBytes.byteLength,
  };
  const generatedDraft: GeneratedDraftEvidence = {
    ...generatedIdentity,
    generatedDocumentId: computeGeneratedDocumentId(generatedIdentity),
  };

  const built = createFilingPreparationCurrentState({
    authenticatedUserId,
    riskpathRecordId,
    revision,
    preparationSnapshot: snapshotFromDraft(generatedDraft),
    generatedDraftBinding: { revision, generatedDraft },
    generatedDraftBytes: draftBytes,
    ownerReviewBinding: null,
  });
  if (built.status !== 'CURRENT_STATE_REVISION') {
    throw new Error(`synthetic current state blocked: ${built.blockReason}`);
  }

  return {
    state: built.currentState,
    generatedDraft,
    draftBytes,
    material: {
      definition,
      officialSourceIdentity,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization,
      preparationManifest,
      preparationDerivativeBytes,
      facts,
      evaluateBinding: () => binding,
    },
  };
}

function preparationOnlyState(base: Fixture): FilingPreparationCurrentState {
  const built = createFilingPreparationCurrentState({
    authenticatedUserId: base.state.authenticatedUserId,
    riskpathRecordId: base.state.riskpathRecordId,
    revision: base.state.revision + 1,
    preparationSnapshot: snapshotFromDraft(base.generatedDraft),
    generatedDraftBinding: null,
    generatedDraftBytes: null,
    ownerReviewBinding: null,
  });
  if (built.status !== 'CURRENT_STATE_REVISION') throw new Error('preparation-only fixture blocked');
  return built.currentState;
}

class FakeReader implements FilingPreparationCurrentStateLatestReader {
  reads = 0;
  writeCalls = 0;
  historicalReads = 0;
  lastRiskPath: string | null = null;

  constructor(
    public latest: unknown,
    private readonly throwsOnRead = false,
  ) {}

  async readLatest(riskpathRecordId: string): Promise<unknown> {
    this.reads += 1;
    this.lastRiskPath = riskpathRecordId;
    if (this.throwsOnRead) throw new Error('synthetic latest-read failure');
    return this.latest;
  }

  async appendNext(): Promise<never> {
    this.writeCalls += 1;
    throw new Error('write method must never be called');
  }

  async appendNextIfCurrent(): Promise<never> {
    this.writeCalls += 1;
    throw new Error('guarded write method must never be called');
  }

  async readHistorical(): Promise<never> {
    this.historicalReads += 1;
    throw new Error('historical fallback must never be called');
  }
}

class FakeMaterialLoader implements FilingPreparationCurrentnessMaterialLoader {
  calls = 0;
  lastRequest: FilingPreparationCurrentnessMaterialRequest | null = null;

  constructor(
    public result: unknown,
    private readonly throwsOnLoad = false,
  ) {}

  async loadCurrentnessMaterial(
    request: Readonly<FilingPreparationCurrentnessMaterialRequest>,
  ): Promise<unknown> {
    this.calls += 1;
    this.lastRequest = structuredClone(request);
    if (this.throwsOnLoad) throw new Error('synthetic material failure');
    return this.result;
  }
}

function available(material: FilingPreparationCurrentnessMaterial): unknown {
  return { status: 'AVAILABLE', material };
}

function resolverInput(source: ReturnType<typeof createFilingPreparationCurrentEvidenceCurrentStateSource>): FilingPreparationCurrentEvidenceResolverInput {
  return {
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    source,
  };
}

async function main(): Promise<void> {
  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(base.material));
    createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    equal(reader.reads, 0, 'construction performs zero current-state reads');
    equal(loader.calls, 0, 'construction performs zero material loads');
    equal(reader.writeCalls, 0, 'construction performs zero writes');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    const result = await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A });
    equal(result.status, 'AVAILABLE', 'exact valid request returns raw AVAILABLE evidence');
    equal(reader.reads, 1, 'exact request performs exactly one authoritative latest read');
    equal(reader.lastRiskPath, RISKPATH_A, 'latest read is selected only by requested RiskPath');
    equal(loader.calls, 1, 'eligible latest state performs exactly one material load');
    equal(reader.writeCalls, 0, 'exact request performs zero writes');
    equal(reader.historicalReads, 0, 'exact request performs no historical reads');
    if (result.status !== 'AVAILABLE') throw new Error('exact source fixture must be available');
    deepEqual(result.generatedDraft, base.generatedDraft, 'AVAILABLE returns exact generated-draft evidence from latest revision');
    deepEqual(Array.from(result.currentnessInputs.draftBytes), Array.from(base.state.generatedDraftBytes ?? []), 'draft bytes are byte-identical to exact latest revision');
    ok(result.currentnessInputs.draftBytes !== base.state.generatedDraftBytes, 'draft bytes are defensively copied from durable latest state');
    if (loader.lastRequest === null) throw new Error('material request missing');
    equal(loader.lastRequest.revision, base.state.revision, 'material request is derived from exact latest revision');
    equal(loader.lastRequest.filingPreparationCurrentStateId, base.state.filingPreparationCurrentStateId, 'material request binds exact latest current-state identity');
    deepEqual(loader.lastRequest.generatedDraft, base.generatedDraft, 'material request binds exact current generated draft');
    ok(!Object.prototype.hasOwnProperty.call(loader.lastRequest, 'draftBytes'), 'material loader request receives no draft-byte override surface');
    ok(!Object.prototype.hasOwnProperty.call(loader.lastRequest, 'currentness'), 'material loader request receives no currentness verdict surface');
  }

  {
    const base = fixture();
    const reader = new FakeReader(null);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    deepEqual(await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }), { status: 'UNAVAILABLE' }, 'no latest revision returns exact UNAVAILABLE');
    equal(reader.reads, 1, 'absent latest state is read once');
    equal(loader.calls, 0, 'absent latest state never loads material');
  }

  {
    const base = fixture();
    const reader = new FakeReader(preparationOnlyState(base));
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    deepEqual(await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }), { status: 'UNAVAILABLE' }, 'latest revision without generated draft is unavailable');
    equal(loader.calls, 0, 'latest revision without generated draft never loads material');
  }

  {
    const base = fixture();
    const noBytes = { ...base.state, generatedDraftBytes: null };
    const reader = new FakeReader(noBytes);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    deepEqual(await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }), { status: 'UNAVAILABLE' }, 'latest revision without exact generated bytes is unavailable');
    equal(loader.calls, 0, 'latest revision without generated bytes never loads material');
  }

  {
    const base = fixture();
    const malformed = { ...base.state, stageF: 'RELEASED' };
    const reader = new FakeReader(malformed);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /validation failed closed: BOUNDARY_INVARIANT_MISMATCH/,
      'noncanonical substituted current state fails through existing validator',
    );
    passed += 1;
    equal(loader.calls, 0, 'noncanonical current state fails before material load');
  }

  {
    const mismatched = fixture(USER_B, RISKPATH_A);
    const reader = new FakeReader(mismatched.state);
    const loader = new FakeMaterialLoader(available(mismatched.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /identity does not match/,
      'authenticated-user mismatch fails closed',
    );
    passed += 1;
    equal(loader.calls, 0, 'user mismatch fails before material load');
  }

  {
    const mismatched = fixture(USER_A, RISKPATH_B);
    const reader = new FakeReader(mismatched.state);
    const loader = new FakeMaterialLoader(available(mismatched.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /identity does not match/,
      'RiskPath mismatch fails closed',
    );
    passed += 1;
    equal(loader.calls, 0, 'RiskPath mismatch fails before material load');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    const result = await resolveFilingPreparationCurrentEvidence({
      ...resolverInput(source),
      revision: base.state.revision,
      filingPreparationCurrentStateId: base.state.filingPreparationCurrentStateId,
      generatedDraft: base.generatedDraft,
      draftBytes: base.draftBytes,
      currentness: { status: 'CURRENT', reasons: [] },
      material: base.material,
    } as unknown as FilingPreparationCurrentEvidenceResolverInput);
    equal(result.status, 'BLOCKED', 'D0A request rejects caller revision/draft/bytes/currentness/material injection');
    if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_RESOLVER_INPUT', 'caller injection has exact D0A blocker');
    equal(reader.reads, 0, 'caller injection is rejected before current-state source is invoked');
    equal(loader.calls, 0, 'caller injection is rejected before material loader is invoked');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader({ status: 'UNAVAILABLE' });
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    deepEqual(await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }), { status: 'UNAVAILABLE' }, 'material unavailability maps to exact source UNAVAILABLE');
    equal(reader.reads, 1, 'material unavailable path performs one latest read');
    equal(loader.calls, 1, 'material unavailable path performs one material load');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(base.material), true);
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /synthetic material failure/,
      'material-loader exception fails closed',
    );
    passed += 1;
    equal(reader.reads, 1, 'material exception path does not retry latest read');
    equal(loader.calls, 1, 'material exception path does not retry loader');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const malformedMaterial = { ...base.material, draftBytes: Uint8Array.from([1, 2, 3]) };
    const loader = new FakeMaterialLoader({ status: 'AVAILABLE', material: malformedMaterial });
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /invalid shape/,
      'material result with loader-supplied draft bytes fails closed',
    );
    passed += 1;
    equal(reader.reads, 1, 'malformed material path performs only one latest read');
    equal(loader.calls, 1, 'malformed material path performs only one loader call');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state, true);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    await assert.rejects(
      source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }),
      /synthetic latest-read failure/,
      'latest-read failure fails closed without repair',
    );
    passed += 1;
    equal(reader.reads, 1, 'latest-read failure is not automatically retried');
    equal(loader.calls, 0, 'latest-read failure never invokes material loader');
    equal(reader.writeCalls, 0, 'read failure performs zero writes');
  }

  {
    const base = fixture();
    const unusableLatest = preparationOnlyState(base);
    const reader = new FakeReader(unusableLatest);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    deepEqual(await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A }), { status: 'UNAVAILABLE' }, 'unusable latest state remains unavailable despite valid historical fixture');
    equal(reader.reads, 1, 'unusable latest state is read once');
    equal(reader.historicalReads, 0, 'source never falls back to a historical revision');
    equal(loader.calls, 0, 'historical material is never loaded as fallback');
  }

  {
    const base = fixture();
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(base.material));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'CURRENT_EVIDENCE', 'exact unchanged latest state and raw material resolve canonical CURRENT_EVIDENCE');
    if (result.status !== 'CURRENT_EVIDENCE') throw new Error('exact D0B4 fixture must resolve current evidence');
    deepEqual(result.canonicalCurrentness, { status: 'CURRENT', reasons: [] }, 'D0A remains sole owner of exact CURRENT verdict');
    equal(result.stageF, 'HELD', 'resolver success preserves Stage F hold');
    equal(result.packetComposition, 'NOT_PERFORMED', 'resolver success conveys no packet authority');
    equal(result.signing, 'NOT_PERFORMED', 'resolver success conveys no signing authority');
    equal(result.filing, 'NOT_PERFORMED', 'resolver success conveys no filing authority');
    equal(result.courtSubmission, 'NOT_PERFORMED', 'resolver success conveys no court-submission authority');
    equal(result.service, 'NOT_PERFORMED', 'resolver success conveys no service authority');
    equal(result.legalSufficiency, 'NOT_EVALUATED', 'resolver success makes no legal-sufficiency determination');
    equal(result.autonomousExecution, 'NOT_AUTHORIZED', 'resolver success conveys no autonomous authority');
  }

  {
    const base = fixture();
    const driftedMaterial: FilingPreparationCurrentnessMaterial = {
      ...base.material,
      officialSourceHealth: 'STALE',
    };
    const reader = new FakeReader(base.state);
    const loader = new FakeMaterialLoader(available(driftedMaterial));
    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(reader, loader);
    const raw = await source.loadCurrentEvidence({ authenticatedUserId: USER_A, riskpathRecordId: RISKPATH_A });
    equal(raw.status, 'AVAILABLE', 'D0B4 preserves raw drift instead of deciding currentness');
    const result = await resolveFilingPreparationCurrentEvidence(resolverInput(source));
    equal(result.status, 'BLOCKED', 'genuine raw material drift becomes canonical OUT_OF_DATE at D0A');
    if (result.status !== 'BLOCKED') throw new Error('stale source health must block through canonical evaluator');
    equal(result.blockReason, 'CURRENT_EVIDENCE_OUT_OF_DATE', 'drift has exact D0A OUT_OF_DATE blocker');
    ok(result.canonicalCurrentness !== 'NOT_EVALUATED' && result.canonicalCurrentness.status === 'OUT_OF_DATE', 'canonical evaluator reports OUT_OF_DATE rather than D0B4 softening drift');
    equal(reader.writeCalls, 0, 'drift path performs zero writes or repair');
  }

  {
    const sourceText = readFileSync('lib/flow/filingPreparationCurrentEvidenceCurrentStateSource.ts', 'utf8');
    for (const prohibited of [
      'appendNext',
      'appendNextIfCurrent',
      '.from(',
      'createClient(',
      'process.env',
      'service_role',
      'service-role',
      'Supabase',
      'evaluateOfficialFormGeneratedDraftCurrentness',
      'NextRequest',
      'NextResponse',
      'route.ts',
      'setInterval(',
      'setTimeout(',
      'localStorage',
    ]) {
      ok(!sourceText.includes(prohibited), `D0B4 adapter source excludes prohibited write/direct-access/policy/runtime token: ${prohibited}`);
    }
    ok(sourceText.includes('readLatest('), 'D0B4 adapter source uses only the accepted latest-state read seam');
    ok(sourceText.includes('validateFilingPreparationCurrentState('), 'D0B4 adapter reuses the existing canonical current-state validator');
  }

  console.log(`filingPreparationCurrentEvidenceCurrentStateSource tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
