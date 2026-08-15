import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import type { GenerationWritePlanEntry } from './officialFormGenerationBinding';
import type { OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeFieldWritePlanDigest,
  computeGeneratedDocumentId,
  computePreparationAuthorizationSnapshotId,
  computePreparationRuntimeManifestId,
  computeSourceWarningInventoryDigest,
  validateFormPreparationAuthorization,
  type FormPreparationAuthorization,
  type GeneratedDraftIdentity,
  type PreparationRuntimeManifest,
} from './officialFormGeneratedDraft';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const source: OfficialSourceIdentity = {
  registryVersion: 1,
  artifactId: `synthetic_authority:TEST-1:2026-01-01:sha256:${'a'.repeat(64)}`,
  authorityKey: 'synthetic_authority',
  formId: 'TEST-1',
  revisionEffective: '2026-01-01',
  sourceSnapshotId: `sha256:${'a'.repeat(64)}`,
  repositoryPath: 'synthetic/TEST-1.pdf',
  repositorySha256: 'a'.repeat(64),
  artifactClass: 'official_blank',
  repositoryStatus: 'present_hash_and_blankness_verified',
};

const facts: FilingCanonicalFactsProjection = {
  status: 'READY',
  createdNoticeIdentity: {
    generation: 'created-notice:test-generation',
    createdAtISO: '2026-08-15T01:00:00.000Z',
  },
  facts: {},
};

const authorization: FormPreparationAuthorization = {
  authorizationId: 'prep-auth-1',
  resultId: 'prep-result-1',
  controlId: 'form-preparation-relevance',
  controlVersion: '1.0.0',
  status: 'CURRENT',
  decision: 'FORM_RELEVANT_FOR_PREPARATION',
  target: {
    artifactId: source.artifactId,
    authorityKey: source.authorityKey,
    formId: source.formId,
    revisionEffective: source.revisionEffective,
    sourceSnapshotId: source.sourceSnapshotId,
  },
  createdNoticeIdentity: facts.createdNoticeIdentity,
};

const validAuthorization = validateFormPreparationAuthorization(authorization, source, facts);
equal(validAuthorization.status, 'VALID', 'CURRENT exact form/source/Created Notice authorization validates');
if (validAuthorization.status !== 'VALID') throw new Error('synthetic authorization should validate');
equal(validAuthorization.snapshotId, computePreparationAuthorizationSnapshotId(authorization), 'authorization snapshot is deterministic');

const changedAuthorization = { ...authorization, resultId: 'prep-result-2' };
notEqual(
  computePreparationAuthorizationSnapshotId(changedAuthorization),
  validAuthorization.snapshotId,
  'authorization/result identity participates in authorization snapshot',
);

equal(
  validateFormPreparationAuthorization({ ...authorization, status: 'STALE' }, source, facts).status,
  'BLOCKED',
  'stale authorization blocks',
);
equal(
  validateFormPreparationAuthorization({ ...authorization, decision: 'FORM_NOT_RELEVANT_FOR_PREPARATION' }, source, facts).status,
  'BLOCKED',
  'non-relevance decision blocks',
);
equal(
  validateFormPreparationAuthorization({
    ...authorization,
    target: { ...authorization.target, formId: 'OTHER' },
  }, source, facts).status,
  'BLOCKED',
  'wrong form target blocks',
);
equal(
  validateFormPreparationAuthorization({
    ...authorization,
    target: { ...authorization.target, sourceSnapshotId: `sha256:${'b'.repeat(64)}` },
  }, source, facts).status,
  'BLOCKED',
  'wrong source snapshot blocks',
);
equal(
  validateFormPreparationAuthorization({
    ...authorization,
    createdNoticeIdentity: { ...authorization.createdNoticeIdentity, generation: 'other-generation' },
  }, source, facts).status,
  'BLOCKED',
  'wrong Created Notice context blocks',
);
equal(
  validateFormPreparationAuthorization(undefined, source, facts).status,
  'BLOCKED',
  'missing authorization blocks',
);

const syntheticManifest: PreparationRuntimeManifest = {
  schemaVersion: 1,
  artifactClass: 'PREPARATION_RUNTIME_DERIVATIVE',
  preparationSourceId: `prep-source:sha256:${'c'.repeat(64)}`,
  preparationSourcePath: 'synthetic/prep.pdf',
  parentOfficialSource: source,
  sourceAdmission: {
    policyId: 'qpdf-dual-pass-linearization-isolation-v2',
    status: 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS',
    qpdfVersion: '12.3.2',
    qpdfDistributionSha256: 'd'.repeat(64),
    qpdfExecutableSha256: 'e'.repeat(64),
    fullCheckExit: 3,
    linearizationCheckExit: 3,
    warningCount: 1,
    warningInventoryDigest: computeSourceWarningInventoryDigest(['WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning']),
    warningInventory: ['WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning'],
    recoverySuppressed: true,
    passwordRecoverySuppressed: true,
    linearizationWarningIsolationVerified: true,
    nonLinearizationWarningObserved: false,
    recoveryObserved: false,
    damageWarningObserved: false,
  },
  qpdfNormalization: {
    operation: 'DECRYPT_DISABLE_OBJECT_STREAMS_DETERMINISTIC_ID',
    sourceSha256: source.repositorySha256,
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
    sha256: 'c'.repeat(64),
    byteLength: 123,
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

const manifestId = computePreparationRuntimeManifestId(syntheticManifest);
equal(manifestId, computePreparationRuntimeManifestId(structuredClone(syntheticManifest)), 'manifest identity is deterministic');
equal(
  syntheticManifest.sourceAdmission.warningInventoryDigest,
  computeSourceWarningInventoryDigest(syntheticManifest.sourceAdmission.warningInventory),
  'source warning inventory digest uses sorted duplicate-preserving LF serialization',
);
notEqual(
  manifestId,
  computePreparationRuntimeManifestId({
    ...syntheticManifest,
    preparationDerivative: { ...syntheticManifest.preparationDerivative, byteLength: 124 },
  }),
  'derivative identity drift changes manifest identity',
);
notEqual(
  manifestId,
  computePreparationRuntimeManifestId({
    ...syntheticManifest,
    xfaDisconnection: { ...syntheticManifest.xfaDisconnection, xfaDigest: `xfa:sha256:${'5'.repeat(64)}` },
  }),
  'XFA-content drift changes manifest identity',
);

const plan: GenerationWritePlanEntry[] = [
  {
    action: 'WRITE_TEXT',
    fieldId: 'A',
    value: 'value',
    sourcePage: 1,
    fieldType: '/Tx',
    objectReference: '1 0 R',
    transform: { id: 'TEXT_EXACT_V1', version: '1' },
    dependencies: ['property.city'],
  },
  {
    action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    fieldId: 'B',
    sourcePage: 1,
    fieldType: '/Btn',
    objectReference: '2 0 R',
    reason: 'deferred',
  },
];
const writePlanId = computeFieldWritePlanDigest(plan);
equal(writePlanId, computeFieldWritePlanDigest(structuredClone(plan)), 'write-plan digest is deterministic');
notEqual(
  writePlanId,
  computeFieldWritePlanDigest([{ ...plan[0], value: 'changed' } as GenerationWritePlanEntry, plan[1]]),
  'material write-plan value drift changes write-plan digest',
);

const generatedIdentity: GeneratedDraftIdentity = {
  schemaVersion: 1,
  artifactClass: 'GENERATED_DRAFT',
  officialSourceArtifactId: source.artifactId,
  officialSourceSnapshotId: source.sourceSnapshotId,
  officialSourceSha256: source.repositorySha256,
  sourceAdmissionPolicyId: syntheticManifest.sourceAdmission.policyId,
  sourceWarningInventoryDigest: syntheticManifest.sourceAdmission.warningInventoryDigest,
  qpdfIntermediateSha256: syntheticManifest.qpdfNormalization.intermediateSha256,
  xfaPolicyId: syntheticManifest.xfaDisconnection.policyId,
  xfaDigest: syntheticManifest.xfaDisconnection.xfaDigest,
  preparationManifestId: manifestId,
  preparationSourceId: syntheticManifest.preparationSourceId,
  preparationDerivativeSha256: syntheticManifest.preparationDerivative.sha256,
  preparationFieldEquivalenceDigest: syntheticManifest.preparationDerivative.fieldEquivalenceDigest,
  preparationSemanticDeltaDigest: syntheticManifest.preparationDerivative.semanticDeltaDigest,
  preparationAuthorizationSnapshotId: validAuthorization.snapshotId,
  mapSnapshotId: `map:sha256:${'6'.repeat(64)}`,
  referencedFactSnapshotId: `facts:sha256:${'7'.repeat(64)}`,
  generationInputId: `generation-input:sha256:${'8'.repeat(64)}`,
  generatorContractVersion: 'synthetic-contract-v1',
  generatorImplementationId: 'synthetic-generator',
  generatorImplementationVersion: '1.0.0',
  fieldWritePlanDigest: writePlanId,
  preparedAtISO: '2026-08-15T01:02:03.000Z',
  generatedPdfSha256: '9'.repeat(64),
  generatedByteLength: 1000,
};
const generatedId = computeGeneratedDocumentId(generatedIdentity);
equal(generatedId, computeGeneratedDocumentId(structuredClone(generatedIdentity)), 'generated-document identity is deterministic');
notEqual(
  generatedId,
  computeGeneratedDocumentId({ ...generatedIdentity, preparedAtISO: '2026-08-15T01:02:04.000Z' }),
  'caller-supplied preparedAtISO participates in generated-document identity',
);
notEqual(
  generatedId,
  computeGeneratedDocumentId({ ...generatedIdentity, qpdfIntermediateSha256: '0'.repeat(64) }),
  'qpdf intermediate identity participates in generated-document identity',
);
notEqual(
  generatedId,
  computeGeneratedDocumentId({ ...generatedIdentity, preparationAuthorizationSnapshotId: 'changed' }),
  'preparation-relevance authorization participates in generated-document identity',
);

ok(generatedId.startsWith('generated-document:sha256:'), 'generated-document identity is content addressed');

console.log(`officialFormGeneratedDraft tests passed: ${passed}`);
