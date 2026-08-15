import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import type { GenerationWritePlanEntry } from './officialFormGenerationBinding';
import type { OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeFieldWritePlanDigest,
  computeGeneratedDocumentId,
  computePreparationAuthorizationSnapshotId,
  computeQpdfAssetIdentityDigest,
  computeQpdfCommandDigest,
  computePreparationRuntimeManifestId,
  computeSourceWarningInventoryDigest,
  GOVERNED_QPDF_ASSET_IDENTITY,
  QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
  QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
  validateFormPreparationAuthorization,
  validateQpdfSourceAdmission,
  type FormPreparationAuthorization,
  type GeneratedDraftIdentity,
  type PreparationRuntimeManifest,
  type QpdfSourceAdmissionEvidence,
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
  schemaVersion: 2,
  artifactClass: 'PREPARATION_RUNTIME_DERIVATIVE',
  preparationSourceId: `prep-source:sha256:${'c'.repeat(64)}`,
  preparationSourcePath: 'synthetic/prep.pdf',
  parentOfficialSource: source,
  sourceAdmission: {
    policyId: 'qpdf-dual-pass-linearization-isolation-v2',
    status: 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS',
    qpdfAsset: GOVERNED_QPDF_ASSET_IDENTITY,
    passA: {
      passId: 'PASS_A_FULL_CHECK',
      command: QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
      commandDigest: computeQpdfCommandDigest(QPDF_SOURCE_ADMISSION_PASS_A_COMMAND),
      exitCode: 3,
      warningCount: 1,
      warningInventoryDigest: computeSourceWarningInventoryDigest([
        'WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning',
      ]),
      warningInventory: ['WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning'],
      errorObserved: false,
      recoveryObserved: false,
      damageWarningObserved: false,
      passwordRecoveryObserved: false,
    },
    passB: {
      passId: 'PASS_B_LINEARIZATION_CHECK',
      command: QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
      commandDigest: computeQpdfCommandDigest(QPDF_SOURCE_ADMISSION_PASS_B_COMMAND),
      exitCode: 3,
      warningCount: 1,
      warningInventoryDigest: computeSourceWarningInventoryDigest([
        'WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning',
      ]),
      warningInventory: ['WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning'],
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
    admission: 'VERIFIED_PREPARATION_FIELD_EQUIVALENT',
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
  syntheticManifest.sourceAdmission.passA.warningInventoryDigest,
  computeSourceWarningInventoryDigest(syntheticManifest.sourceAdmission.passA.warningInventory),
  'Pass A warning inventory digest uses sorted duplicate-preserving LF serialization',
);
equal(
  validateQpdfSourceAdmission(syntheticManifest.sourceAdmission).status,
  'VALID',
  'isolated-warning 3/3 admission validates with separate Pass A and Pass B evidence',
);

const cleanWarningDigest = computeSourceWarningInventoryDigest([]);
const cleanAdmission: QpdfSourceAdmissionEvidence = {
  ...structuredClone(syntheticManifest.sourceAdmission),
  status: 'SOURCE_ADMITTED_CLEAN',
  passA: {
    ...structuredClone(syntheticManifest.sourceAdmission.passA),
    exitCode: 0,
    warningCount: 0,
    warningInventory: [],
    warningInventoryDigest: cleanWarningDigest,
  },
  passB: {
    ...structuredClone(syntheticManifest.sourceAdmission.passB),
    exitCode: 0,
    warningCount: 0,
    warningInventory: [],
    warningInventoryDigest: cleanWarningDigest,
  },
};
equal(
  validateQpdfSourceAdmission(cleanAdmission).status,
  'VALID',
  'clean 0/0 source admission is a first-class contract state',
);

const duplicatedPassBWarnings = [
  ...syntheticManifest.sourceAdmission.passB.warningInventory,
  syntheticManifest.sourceAdmission.passB.warningInventory[0],
];
const multiplicityMismatch: QpdfSourceAdmissionEvidence = {
  ...structuredClone(syntheticManifest.sourceAdmission),
  passB: {
    ...structuredClone(syntheticManifest.sourceAdmission.passB),
    warningInventory: duplicatedPassBWarnings,
    warningCount: duplicatedPassBWarnings.length,
    warningInventoryDigest: computeSourceWarningInventoryDigest(duplicatedPassBWarnings),
  },
};
equal(
  validateQpdfSourceAdmission(multiplicityMismatch).status,
  'BLOCKED',
  'Pass A/Pass B duplicate multiplicity mismatch fails closed',
);

const exitMismatchWarnings = ['WARNING: <OFFICIAL_SOURCE>: synthetic linearization warning'];
const exitMismatch: QpdfSourceAdmissionEvidence = {
  ...structuredClone(cleanAdmission),
  passB: {
    ...structuredClone(cleanAdmission.passB),
    exitCode: 3,
    warningInventory: exitMismatchWarnings,
    warningCount: exitMismatchWarnings.length,
    warningInventoryDigest: computeSourceWarningInventoryDigest(exitMismatchWarnings),
  },
};
equal(validateQpdfSourceAdmission(exitMismatch).status, 'BLOCKED', 'mixed 0/3 admission fails closed');

const commandMismatchCommand = [
  ...syntheticManifest.sourceAdmission.passA.command,
  '--verbose',
];
const commandMismatch: QpdfSourceAdmissionEvidence = {
  ...structuredClone(syntheticManifest.sourceAdmission),
  passA: {
    ...structuredClone(syntheticManifest.sourceAdmission.passA),
    command: commandMismatchCommand,
    commandDigest: computeQpdfCommandDigest(commandMismatchCommand),
  },
};
equal(
  validateQpdfSourceAdmission(commandMismatch).status,
  'BLOCKED',
  'changed Pass A command fails even when the changed command digest is self-consistent',
);

const errorEvidence = {
  ...structuredClone(syntheticManifest.sourceAdmission),
  passA: {
    ...structuredClone(syntheticManifest.sourceAdmission.passA),
    errorObserved: true,
  },
};
equal(
  validateQpdfSourceAdmission(errorEvidence as unknown as QpdfSourceAdmissionEvidence).status,
  'BLOCKED',
  'Pass A error evidence fails closed',
);

const recoveryEvidence = {
  ...structuredClone(syntheticManifest.sourceAdmission),
  passB: {
    ...structuredClone(syntheticManifest.sourceAdmission.passB),
    recoveryObserved: true,
  },
};
equal(
  validateQpdfSourceAdmission(recoveryEvidence as unknown as QpdfSourceAdmissionEvidence).status,
  'BLOCKED',
  'Pass B recovery evidence fails closed',
);

notEqual(
  computeQpdfAssetIdentityDigest(GOVERNED_QPDF_ASSET_IDENTITY),
  computeQpdfAssetIdentityDigest({
    ...GOVERNED_QPDF_ASSET_IDENTITY,
    executableSha256: '0'.repeat(64),
  }),
  'governed qpdf asset identity participates in its digest',
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
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  officialSourceArtifactId: source.artifactId,
  officialSourceSnapshotId: source.sourceSnapshotId,
  officialSourceSha256: source.repositorySha256,
  sourceAdmissionPolicyId: syntheticManifest.sourceAdmission.policyId,
  sourceAdmissionStatus: syntheticManifest.sourceAdmission.status,
  qpdfAssetIdentityDigest: computeQpdfAssetIdentityDigest(syntheticManifest.sourceAdmission.qpdfAsset),
  sourcePassACommandDigest: syntheticManifest.sourceAdmission.passA.commandDigest,
  sourcePassAWarningInventoryDigest: syntheticManifest.sourceAdmission.passA.warningInventoryDigest,
  sourcePassBCommandDigest: syntheticManifest.sourceAdmission.passB.commandDigest,
  sourcePassBWarningInventoryDigest: syntheticManifest.sourceAdmission.passB.warningInventoryDigest,
  sourceWarningInventoryDigest: syntheticManifest.sourceAdmission.passA.warningInventoryDigest,
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
notEqual(
  generatedId,
  computeGeneratedDocumentId({
    ...generatedIdentity,
    artifactRole: 'OTHER_ROLE' as unknown as 'OWNER_GENERATED_PREPARATION',
  }),
  'OWNER_GENERATED_PREPARATION role participates directly in generatedDocumentId',
);
notEqual(
  generatedId,
  computeGeneratedDocumentId({
    ...generatedIdentity,
    sourcePassBCommandDigest: 'qpdf-command:sha256:' + '0'.repeat(64),
  }),
  'Pass B command provenance participates directly in generatedDocumentId',
);

ok(generatedId.startsWith('generated-document:sha256:'), 'generated-document identity is content addressed');

console.log(`officialFormGeneratedDraft tests passed: ${passed}`);
