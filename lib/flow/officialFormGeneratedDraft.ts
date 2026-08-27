import { createHash } from 'node:crypto';
import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFField,
  PDFName,
  PDFTextField,
  StandardFonts,
} from 'pdf-lib';
import type { CreatedNoticeFactIdentity, FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  canonicalizeGenerationIdentity,
  type GenerationWritePlanEntry,
  type OfficialFormGenerationBindingEvaluation,
} from './officialFormGenerationBinding';
import {
  type OfficialSourceHealth,
  type OfficialSourceIdentity,
  validateOfficialSourceHealth,
  validateOfficialSourceIdentity,
} from './officialFormFieldMap';

export const OFFICIAL_FORM_GENERATED_DRAFT_SCHEMA_VERSION = 1 as const;

export interface FormPreparationAuthorization {
  authorizationId: string;
  resultId: string;
  controlId: string;
  controlVersion: string;
  status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED';
  decision: 'FORM_RELEVANT_FOR_PREPARATION' | 'FORM_NOT_RELEVANT_FOR_PREPARATION';
  target: {
    artifactId: string;
    authorityKey: string;
    formId: string;
    revisionEffective: string;
    sourceSnapshotId: string;
  };
  createdNoticeIdentity: CreatedNoticeFactIdentity;
}

export type QpdfSourceAdmissionStatus =
  | 'SOURCE_ADMITTED_CLEAN'
  | 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS';

export type QpdfSourceAdmissionPassId =
  | 'PASS_A_FULL_CHECK'
  | 'PASS_B_LINEARIZATION_CHECK';

export interface QpdfAssetIdentity {
  version: '12.3.2';
  distributionAsset: 'qpdf-12.3.2-bin-linux-x86_64.zip';
  platform: 'linux-x86_64';
  distributionSha256: string;
  executableSha256: string;
}

export interface QpdfSourceAdmissionPassEvidence {
  passId: QpdfSourceAdmissionPassId;
  command: readonly string[];
  commandDigest: string;
  exitCode: 0 | 3;
  warningCount: number;
  warningInventoryDigest: string;
  warningInventory: readonly string[];
  errorObserved: false;
  recoveryObserved: false;
  damageWarningObserved: false;
  passwordRecoveryObserved: false;
}

export interface QpdfSourceAdmissionEvidence {
  policyId: 'qpdf-dual-pass-linearization-isolation-v2';
  status: QpdfSourceAdmissionStatus;
  qpdfAsset: QpdfAssetIdentity;
  passA: QpdfSourceAdmissionPassEvidence;
  passB: QpdfSourceAdmissionPassEvidence;
  recoverySuppressed: true;
  passwordRecoverySuppressed: true;
  warningInventoryEqualityVerified: true;
  warningMultiplicityEqualityVerified: true;
  nonLinearizationWarningObserved: false;
}

export interface PreparationRuntimeManifest {
  schemaVersion: 2;
  artifactClass: 'PREPARATION_RUNTIME_DERIVATIVE';
  preparationSourceId: string;
  preparationSourcePath: string;
  parentOfficialSource: OfficialSourceIdentity;
  sourceAdmission: QpdfSourceAdmissionEvidence;
  qpdfNormalization: {
    operation: 'DECRYPT_DISABLE_OBJECT_STREAMS_DETERMINISTIC_ID';
    sourceSha256: string;
    command: readonly string[];
    intermediateSha256: string;
    intermediateByteLength: number;
    repeatedByteEqual: true;
    qpdfCheck: 'PASS';
    warningCount: 0;
    unencrypted: true;
    nonLinearized: true;
    pageCount: 4;
    xfaPresent: true;
  };
  xfaDisconnection: {
    policyId: 'acroform-fallback-xfa-disconnection-v1';
    state: 'DISCONNECTED_FOR_PREPARATION_RUNTIME';
    pdfLibVersion: '1.17.1';
    pdfLibUpstreamTag: 'v1.17.1';
    updateMetadata: false;
    acroFormAccessor: 'PDFDocument.catalog.getAcroForm';
    acroFormAccessorCreating: false;
    operation: 'DELETE_ACROFORM_XFA_ENTRY';
    xfaPresentOnQpdfIntermediate: true;
    xfaDigest: string;
    xfaCanonicalByteLength: number;
    pdfDocumentGetFormUsedDuringTransform: false;
    fieldWritesDuringTransform: 0;
    appearanceUpdatesDuringTransform: false;
    serialization: {
      useObjectStreams: false;
      addDefaultPage: false;
      updateFieldAppearances: false;
    };
    repeatedByteEqual: true;
  };
  preparationDerivative: {
    admission: 'VERIFIED_PREPARATION_FIELD_EQUIVALENT';
    sha256: string;
    byteLength: number;
    pageCount: 4;
    unencrypted: true;
    nonLinearized: true;
    acroFormPresent: true;
    unflattened: true;
    xfaPresent: false;
    qpdfCheck: 'PASS';
    warningCount: 0;
    governedFieldCount: 186;
    fieldEquivalenceDigest: string;
    semanticDeltaMethod: 'qpdf-direct-object-inventory-v1';
    semanticDelta: 'UNCHANGED';
    semanticDeltaDigest: string;
    printSaveClearPreserved: true;
  };
}

export interface GeneratedTextAppearancePolicy {
  colorSpace: 'DeviceRGB';
  rgb: readonly [number, number, number];
}

export interface OfficialGeneratedDraftDefinition {
  generatorImplementationId: string;
  generatorImplementationVersion: string;
  expectedSourceIdentity: OfficialSourceIdentity;
  expectedArtifactRole: 'OWNER_GENERATED_PREPARATION';
  expectedPreparationManifestId: string;
  expectedMapSnapshotId: string;
  expectedGeneratorContractVersion: string;
  expectedPageCount: 4;
  expectedFieldCount: 186;
  generatedTextAppearance?: GeneratedTextAppearancePolicy;
}

export type GeneratedDraftBlockReason =
  | 'INVALID_PREPARED_AT'
  | 'SOURCE_VALIDATION_FAILED'
  | 'OFFICIAL_SOURCE_BYTES_MISMATCH'
  | 'PREPARATION_AUTHORIZATION_INVALID'
  | 'PREPARATION_MANIFEST_INVALID'
  | 'PREPARATION_DERIVATIVE_MISMATCH'
  | 'GENERATION_BINDING_BLOCKED'
  | 'GENERATION_BINDING_IDENTITY_MISMATCH'
  | 'PREPARATION_DERIVATIVE_INVALID'
  | 'FIELD_INVENTORY_MISMATCH'
  | 'FIELD_TYPE_MISMATCH'
  | 'UNSUPPORTED_CONTROL_SUBTYPE'
  | 'UNSUPPORTED_GLYPH'
  | 'INVALID_TEXT_FIELD'
  | 'PDF_MUTATION_FAILED'
  | 'GENERATED_VERIFICATION_FAILED';

export interface GeneratedDraftIdentity {
  schemaVersion: typeof OFFICIAL_FORM_GENERATED_DRAFT_SCHEMA_VERSION;
  artifactClass: 'GENERATED_DRAFT';
  artifactRole: 'OWNER_GENERATED_PREPARATION';
  officialSourceArtifactId: string;
  officialSourceSnapshotId: string;
  officialSourceSha256: string;
  sourceAdmissionPolicyId: string;
  sourceAdmissionStatus: QpdfSourceAdmissionStatus;
  qpdfAssetIdentityDigest: string;
  sourcePassACommandDigest: string;
  sourcePassAWarningInventoryDigest: string;
  sourcePassBCommandDigest: string;
  sourcePassBWarningInventoryDigest: string;
  sourceWarningInventoryDigest: string;
  qpdfIntermediateSha256: string;
  xfaPolicyId: string;
  xfaDigest: string;
  preparationManifestId: string;
  preparationSourceId: string;
  preparationDerivativeSha256: string;
  preparationFieldEquivalenceDigest: string;
  preparationSemanticDeltaDigest: string;
  preparationAuthorizationSnapshotId: string;
  mapSnapshotId: string;
  referencedFactSnapshotId: string;
  generationInputId: string;
  generatorContractVersion: string;
  generatorImplementationId: string;
  generatorImplementationVersion: string;
  fieldWritePlanDigest: string;
  preparedAtISO: string;
  generatedPdfSha256: string;
  generatedByteLength: number;
}

export interface GeneratedDraftEvidence extends GeneratedDraftIdentity {
  generatedDocumentId: string;
}

export type OfficialFormGeneratedDraftResult =
  | {
      status: 'BLOCKED';
      blockReason: GeneratedDraftBlockReason;
      detail: string;
      bytes: null;
      evidence: null;
      ownerReview: 'NOT_PERFORMED';
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
    }
  | {
      status: 'GENERATED_DRAFT';
      bytes: Uint8Array;
      evidence: GeneratedDraftEvidence;
      ownerReview: 'NOT_PERFORMED';
      signing: 'NOT_PERFORMED';
      filing: 'NOT_PERFORMED';
    };

export type GeneratedDraftCurrentness =
  | { status: 'CURRENT'; reasons: readonly [] }
  | { status: 'OUT_OF_DATE'; reasons: readonly string[] };

export interface OfficialFormGeneratedDraftInputs {
  definition: OfficialGeneratedDraftDefinition;
  officialSourceIdentity: OfficialSourceIdentity;
  officialSourceHealth: OfficialSourceHealth | null | undefined;
  officialSourceBytes: Uint8Array;
  preparationAuthorization: FormPreparationAuthorization | null | undefined;
  preparationManifest: PreparationRuntimeManifest;
  preparationDerivativeBytes: Uint8Array;
  facts: FilingCanonicalFactsProjection;
  preparedAtISO: string;
  evaluateBinding: () => OfficialFormGenerationBindingEvaluation;
}

export interface OfficialFormGeneratedDraftCurrentnessInputs
  extends Omit<OfficialFormGeneratedDraftInputs, 'preparedAtISO'> {
  draftBytes: Uint8Array;
}

type SupportedFieldKind = 'TEXT' | 'CHECKBOX' | 'BUTTON';

interface FieldSnapshot {
  kind: SupportedFieldKind;
  flags: number;
  fullFieldDictionary: string;
  fullWidgetDictionaries: readonly string[];
  immutableWidgetSemantics: string;
  textValue?: string | null;
  textMaxLength?: number | null;
  textAlignment?: number;
  textRich?: boolean;
  checked?: boolean;
  checkboxValue?: string | null;
  checkboxOnValue?: string | null;
}

function digest(prefix: string, value: unknown): string {
  return `${prefix}:sha256:${createHash('sha256').update(canonicalizeGenerationIdentity(value)).digest('hex')}`;
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function computeSourceWarningInventoryDigest(warnings: readonly string[]): string {
  const canonical = warnings.length === 0 ? '' : `${[...warnings].sort().join('\n')}\n`;
  return `source-warning-inventory:sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

export const QPDF_SOURCE_ADMISSION_PASS_A_COMMAND = Object.freeze([
  'qpdf',
  '--password=',
  '--suppress-password-recovery',
  '--suppress-recovery',
  '--check',
  '<OFFICIAL_SOURCE>',
] as const);

export const QPDF_SOURCE_ADMISSION_PASS_B_COMMAND = Object.freeze([
  'qpdf',
  '--password=',
  '--suppress-password-recovery',
  '--suppress-recovery',
  '--check-linearization',
  '<OFFICIAL_SOURCE>',
] as const);

export const GOVERNED_QPDF_ASSET_IDENTITY: QpdfAssetIdentity = Object.freeze({
  version: '12.3.2',
  distributionAsset: 'qpdf-12.3.2-bin-linux-x86_64.zip',
  platform: 'linux-x86_64',
  distributionSha256: '44f2c53bf784c0143128d80d2b9946e9793962c5bb403b75c0024cb4d8e346b9',
  executableSha256: 'bfc1708204fd1ae0c7b49e7cda737e35e89e509286974d1729366f1a58d697b3',
});

export function computeQpdfCommandDigest(command: readonly string[]): string {
  return digest('qpdf-command', command);
}

export function computeQpdfAssetIdentityDigest(asset: QpdfAssetIdentity): string {
  return digest('qpdf-asset', asset);
}

function qpdfAdmissionBlocked(detail: string): { status: 'BLOCKED'; detail: string } {
  return { status: 'BLOCKED', detail };
}

function hasProhibitedQpdfAdmissionSignal(warning: string): boolean {
  return /ERROR:|file is damaged|attempting to reconstruct cross-reference table|reconstruct(?:ing|ed|ion)?[^\n]*cross-reference|\brecover(?:y|ed|ing)?\b|password recovery|error encountered while checking linearization data:/i.test(warning);
}

function validateQpdfAdmissionPass(
  pass: QpdfSourceAdmissionPassEvidence,
  expectedPassId: QpdfSourceAdmissionPassId,
  expectedCommand: readonly string[],
):
  | { status: 'VALID' }
  | { status: 'BLOCKED'; detail: string } {
  if (pass.passId !== expectedPassId) {
    return qpdfAdmissionBlocked(`${expectedPassId} identity mismatch.`);
  }
  if (!Array.isArray(pass.command)
    || canonicalizeGenerationIdentity(pass.command) !== canonicalizeGenerationIdentity(expectedCommand)
    || pass.commandDigest !== computeQpdfCommandDigest(expectedCommand)) {
    return qpdfAdmissionBlocked(`${expectedPassId} command identity/digest mismatch.`);
  }
  if (pass.exitCode !== 0 && pass.exitCode !== 3) {
    return qpdfAdmissionBlocked(`${expectedPassId} exit ${String(pass.exitCode)} is not admissible.`);
  }
  if (!Array.isArray(pass.warningInventory)
    || pass.warningInventory.some(item => typeof item !== 'string')) {
    return qpdfAdmissionBlocked(`${expectedPassId} warning inventory is malformed.`);
  }
  const canonicalWarnings = [...pass.warningInventory].sort();
  if (canonicalizeGenerationIdentity(pass.warningInventory)
    !== canonicalizeGenerationIdentity(canonicalWarnings)) {
    return qpdfAdmissionBlocked(`${expectedPassId} warning inventory is not canonical sorted duplicate-preserving evidence.`);
  }
  if (pass.warningCount !== pass.warningInventory.length
    || pass.warningInventoryDigest !== computeSourceWarningInventoryDigest(pass.warningInventory)) {
    return qpdfAdmissionBlocked(`${expectedPassId} warning count/digest does not match its complete inventory.`);
  }
  if (pass.warningInventory.some(item => !item.startsWith('WARNING: <OFFICIAL_SOURCE>:'))) {
    return qpdfAdmissionBlocked(`${expectedPassId} contains an unnormalized or ambiguous warning source prefix.`);
  }
  if (pass.warningInventory.some(hasProhibitedQpdfAdmissionSignal)
    || pass.errorObserved
    || pass.recoveryObserved
    || pass.damageWarningObserved
    || pass.passwordRecoveryObserved) {
    return qpdfAdmissionBlocked(`${expectedPassId} contains error/recovery/damage/password-recovery evidence.`);
  }
  if (pass.exitCode === 0 && pass.warningCount !== 0) {
    return qpdfAdmissionBlocked(`${expectedPassId} clean exit 0 must have zero warnings.`);
  }
  if (pass.exitCode === 3 && pass.warningCount === 0) {
    return qpdfAdmissionBlocked(`${expectedPassId} warning exit 3 must retain a nonempty warning inventory.`);
  }
  return { status: 'VALID' };
}

export function validateQpdfSourceAdmission(
  admission: QpdfSourceAdmissionEvidence,
):
  | { status: 'VALID' }
  | { status: 'BLOCKED'; detail: string } {
  if (admission.policyId !== 'qpdf-dual-pass-linearization-isolation-v2') {
    return qpdfAdmissionBlocked('Source-admission policy identity mismatch.');
  }
  if (canonicalizeGenerationIdentity(admission.qpdfAsset)
    !== canonicalizeGenerationIdentity(GOVERNED_QPDF_ASSET_IDENTITY)) {
    return qpdfAdmissionBlocked('Governed qpdf asset identity mismatch.');
  }
  if (!admission.recoverySuppressed
    || !admission.passwordRecoverySuppressed
    || !admission.warningInventoryEqualityVerified
    || !admission.warningMultiplicityEqualityVerified
    || admission.nonLinearizationWarningObserved) {
    return qpdfAdmissionBlocked('Source-admission suppression/equality/isolation posture is invalid.');
  }
  const passA = validateQpdfAdmissionPass(
    admission.passA,
    'PASS_A_FULL_CHECK',
    QPDF_SOURCE_ADMISSION_PASS_A_COMMAND,
  );
  if (passA.status === 'BLOCKED') return passA;
  const passB = validateQpdfAdmissionPass(
    admission.passB,
    'PASS_B_LINEARIZATION_CHECK',
    QPDF_SOURCE_ADMISSION_PASS_B_COMMAND,
  );
  if (passB.status === 'BLOCKED') return passB;
  if (admission.passA.exitCode !== admission.passB.exitCode) {
    return qpdfAdmissionBlocked('Pass A and Pass B exits differ; only 0/0 or 3/3 is admissible.');
  }
  if (admission.passA.warningCount !== admission.passB.warningCount
    || admission.passA.warningInventoryDigest !== admission.passB.warningInventoryDigest
    || canonicalizeGenerationIdentity(admission.passA.warningInventory)
      !== canonicalizeGenerationIdentity(admission.passB.warningInventory)) {
    return qpdfAdmissionBlocked('Pass A and Pass B warning inventories differ in content or multiplicity.');
  }
  if (admission.passA.exitCode === 0) {
    if (admission.status !== 'SOURCE_ADMITTED_CLEAN'
      || admission.passA.warningCount !== 0
      || admission.passB.warningCount !== 0) {
      return qpdfAdmissionBlocked('Clean source admission must be exact 0/0 with two empty warning inventories.');
    }
  } else if (admission.status !== 'SOURCE_ADMITTED_WITH_ISOLATED_LINEARIZATION_WARNINGS'
    || admission.passA.warningCount === 0
    || admission.passB.warningCount === 0) {
    return qpdfAdmissionBlocked('Isolated-warning source admission must be exact 3/3 with equal nonempty warning inventories.');
  }
  return { status: 'VALID' };
}

export function computePreparationRuntimeManifestId(manifest: PreparationRuntimeManifest): string {
  return digest('preparation-manifest', manifest);
}

export function computePreparationAuthorizationSnapshotId(
  authorization: FormPreparationAuthorization,
): string {
  return digest('preparation-authorization', authorization);
}

export function computeFieldWritePlanDigest(plan: readonly GenerationWritePlanEntry[]): string {
  return digest('write-plan', plan);
}

export function computeGeneratedDocumentId(identity: GeneratedDraftIdentity): string {
  return digest('generated-document', identity);
}

function blocked(blockReason: GeneratedDraftBlockReason, detail: string): OfficialFormGeneratedDraftResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    bytes: null,
    evidence: null,
    ownerReview: 'NOT_PERFORMED',
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
  };
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function sameCreatedNotice(a: CreatedNoticeFactIdentity, b: CreatedNoticeFactIdentity): boolean {
  return a.generation === b.generation && a.createdAtISO === b.createdAtISO;
}

function validPreparedAtISO(value: string): boolean {
  if (!nonempty(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function validateFormPreparationAuthorization(
  authorization: FormPreparationAuthorization | null | undefined,
  expectedSourceIdentity: OfficialSourceIdentity,
  facts: FilingCanonicalFactsProjection,
):
  | { status: 'VALID'; snapshotId: string }
  | { status: 'BLOCKED'; detail: string } {
  if (!authorization) return { status: 'BLOCKED', detail: 'Preparation-relevance authorization is missing.' };
  for (const [name, value] of [
    ['authorizationId', authorization.authorizationId],
    ['resultId', authorization.resultId],
    ['controlId', authorization.controlId],
    ['controlVersion', authorization.controlVersion],
  ] as const) {
    if (!nonempty(value)) return { status: 'BLOCKED', detail: `${name} must be nonempty.` };
  }
  if (authorization.status !== 'CURRENT') {
    return { status: 'BLOCKED', detail: `Preparation authorization must be CURRENT; got ${authorization.status}.` };
  }
  if (authorization.decision !== 'FORM_RELEVANT_FOR_PREPARATION') {
    return { status: 'BLOCKED', detail: `Preparation authorization decision is ${authorization.decision}.` };
  }
  const expectedTarget = {
    artifactId: expectedSourceIdentity.artifactId,
    authorityKey: expectedSourceIdentity.authorityKey,
    formId: expectedSourceIdentity.formId,
    revisionEffective: expectedSourceIdentity.revisionEffective,
    sourceSnapshotId: expectedSourceIdentity.sourceSnapshotId,
  };
  if (canonicalizeGenerationIdentity(authorization.target) !== canonicalizeGenerationIdentity(expectedTarget)) {
    return { status: 'BLOCKED', detail: 'Preparation authorization target does not match the exact official form/source identity.' };
  }
  if (facts.status !== 'READY') {
    return { status: 'BLOCKED', detail: 'Exact Created Notice facts are unavailable for preparation-authorization binding.' };
  }
  if (!sameCreatedNotice(authorization.createdNoticeIdentity, facts.createdNoticeIdentity)) {
    return { status: 'BLOCKED', detail: 'Preparation authorization is bound to a different Created Notice context.' };
  }
  return { status: 'VALID', snapshotId: computePreparationAuthorizationSnapshotId(authorization) };
}

export function validatePreparationRuntimeManifest(
  manifest: PreparationRuntimeManifest,
  definition: OfficialGeneratedDraftDefinition,
  preparationDerivativeBytes: Uint8Array,
):
  | { status: 'VALID'; manifestId: string }
  | { status: 'BLOCKED'; detail: string } {
  if (manifest.schemaVersion !== 2 || manifest.artifactClass !== 'PREPARATION_RUNTIME_DERIVATIVE') {
    return { status: 'BLOCKED', detail: 'Preparation-runtime manifest schema/artifact class is unsupported.' };
  }
  const manifestId = computePreparationRuntimeManifestId(manifest);
  if (manifestId !== definition.expectedPreparationManifestId) {
    return { status: 'BLOCKED', detail: `Preparation-runtime manifest identity mismatch: ${manifestId}.` };
  }
  if (canonicalizeGenerationIdentity(manifest.parentOfficialSource)
    !== canonicalizeGenerationIdentity(definition.expectedSourceIdentity)) {
    return { status: 'BLOCKED', detail: 'Preparation-runtime manifest parent source identity mismatch.' };
  }
  const sourceAdmission = validateQpdfSourceAdmission(manifest.sourceAdmission);
  if (sourceAdmission.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      detail: `Preparation-runtime manifest source-admission evidence is invalid: ${sourceAdmission.detail}`,
    };
  }
  if (manifest.qpdfNormalization.sourceSha256 !== definition.expectedSourceIdentity.repositorySha256
    || !/^[a-f0-9]{64}$/.test(manifest.qpdfNormalization.intermediateSha256)
    || manifest.qpdfNormalization.intermediateByteLength <= 0
    || !manifest.qpdfNormalization.repeatedByteEqual
    || manifest.qpdfNormalization.qpdfCheck !== 'PASS'
    || manifest.qpdfNormalization.warningCount !== 0
    || !manifest.qpdfNormalization.unencrypted
    || !manifest.qpdfNormalization.nonLinearized
    || manifest.qpdfNormalization.pageCount !== definition.expectedPageCount
    || !manifest.qpdfNormalization.xfaPresent) {
    return { status: 'BLOCKED', detail: 'qpdf normalized intermediate evidence is invalid.' };
  }
  if (manifest.xfaDisconnection.policyId !== 'acroform-fallback-xfa-disconnection-v1'
    || manifest.xfaDisconnection.state !== 'DISCONNECTED_FOR_PREPARATION_RUNTIME'
    || manifest.xfaDisconnection.pdfLibVersion !== '1.17.1'
    || manifest.xfaDisconnection.updateMetadata !== false
    || manifest.xfaDisconnection.acroFormAccessor !== 'PDFDocument.catalog.getAcroForm'
    || manifest.xfaDisconnection.acroFormAccessorCreating !== false
    || manifest.xfaDisconnection.operation !== 'DELETE_ACROFORM_XFA_ENTRY'
    || !manifest.xfaDisconnection.xfaPresentOnQpdfIntermediate
    || !/^xfa:sha256:[a-f0-9]{64}$/.test(manifest.xfaDisconnection.xfaDigest)
    || manifest.xfaDisconnection.xfaCanonicalByteLength <= 0
    || manifest.xfaDisconnection.pdfDocumentGetFormUsedDuringTransform
    || manifest.xfaDisconnection.fieldWritesDuringTransform !== 0
    || manifest.xfaDisconnection.appearanceUpdatesDuringTransform
    || manifest.xfaDisconnection.serialization.useObjectStreams
    || manifest.xfaDisconnection.serialization.addDefaultPage
    || manifest.xfaDisconnection.serialization.updateFieldAppearances
    || !manifest.xfaDisconnection.repeatedByteEqual) {
    return { status: 'BLOCKED', detail: 'Explicit XFA-disconnection evidence is invalid.' };
  }
  const derivative = manifest.preparationDerivative;
  const actualSha = sha256Bytes(preparationDerivativeBytes);
  if (manifest.preparationSourceId !== `prep-source:sha256:${derivative.sha256}`
    || derivative.admission !== 'VERIFIED_PREPARATION_FIELD_EQUIVALENT'
    || !/^[a-f0-9]{64}$/.test(derivative.sha256)
    || derivative.sha256 !== actualSha
    || derivative.byteLength !== preparationDerivativeBytes.byteLength
    || derivative.pageCount !== definition.expectedPageCount
    || !derivative.unencrypted
    || !derivative.nonLinearized
    || !derivative.acroFormPresent
    || !derivative.unflattened
    || derivative.xfaPresent
    || derivative.qpdfCheck !== 'PASS'
    || derivative.warningCount !== 0
    || derivative.governedFieldCount !== definition.expectedFieldCount
    || !nonempty(derivative.fieldEquivalenceDigest)
    || derivative.semanticDeltaMethod !== 'qpdf-direct-object-inventory-v1'
    || derivative.semanticDelta !== 'UNCHANGED'
    || !nonempty(derivative.semanticDeltaDigest)
    || !derivative.printSaveClearPreserved) {
    return { status: 'BLOCKED', detail: 'Final preparation-runtime derivative identity/admission evidence is invalid.' };
  }
  return { status: 'VALID', manifestId };
}

function objectString(value: { toString(): string } | undefined): string | null {
  return value ? value.toString() : null;
}

function supportedKind(field: PDFField): SupportedFieldKind | null {
  if (field instanceof PDFTextField) return 'TEXT';
  if (field instanceof PDFCheckBox) return 'CHECKBOX';
  if (field instanceof PDFButton) return 'BUTTON';
  return null;
}

function widgetImmutableSemantics(field: PDFField): string {
  const keys = ['Subtype', 'Rect', 'F', 'A', 'AA', 'MK', 'BS', 'Border', 'H'] as const;
  const widgets = field.acroField.getWidgets().map(widget => {
    const record: Record<string, string | null> = {};
    for (const key of keys) record[key] = objectString(widget.dict.get(PDFName.of(key)));
    return record;
  });
  return canonicalizeGenerationIdentity(widgets);
}

function snapshotField(field: PDFField): FieldSnapshot {
  const kind = supportedKind(field);
  if (!kind) throw new Error(`Unsupported runtime field class for ${field.getName()}.`);
  const common = {
    kind,
    flags: field.acroField.getFlags(),
    fullFieldDictionary: field.acroField.dict.toString(),
    fullWidgetDictionaries: field.acroField.getWidgets().map(widget => widget.dict.toString()),
    immutableWidgetSemantics: widgetImmutableSemantics(field),
  };
  if (field instanceof PDFTextField) {
    return {
      ...common,
      kind: 'TEXT',
      textValue: field.getText() ?? null,
      textMaxLength: field.getMaxLength() ?? null,
      textAlignment: field.getAlignment(),
      textRich: field.isRichFormatted(),
    };
  }
  if (field instanceof PDFCheckBox) {
    return {
      ...common,
      kind: 'CHECKBOX',
      checked: field.isChecked(),
      checkboxValue: objectString(field.acroField.getValue()),
      checkboxOnValue: objectString(field.acroField.getOnValue()),
    };
  }
  return common;
}

function fieldMap(fields: readonly PDFField[]): Map<string, PDFField> {
  const map = new Map<string, PDFField>();
  for (const field of fields) {
    const name = field.getName();
    if (!name || map.has(name)) throw new Error(`Duplicate or blank runtime field identity: ${name || 'MISSING'}.`);
    map.set(name, field);
  }
  return map;
}

async function loadAdmittedForm(
  bytes: Uint8Array,
  expectedPageCount: number,
  expectedFieldCount: number,
):
  Promise<
    | { status: 'VALID'; document: PDFDocument; fields: Map<string, PDFField> }
    | { status: 'BLOCKED'; reason: GeneratedDraftBlockReason; detail: string }
  > {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: `Preparation derivative did not load normally: ${String(error)}.` };
  }
  if (document.getPageCount() !== expectedPageCount) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: `Preparation derivative page count is ${document.getPageCount()}; expected ${expectedPageCount}.` };
  }
  const existingAcroForm = document.catalog.getAcroForm();
  if (!existingAcroForm) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: 'Existing AcroForm is required; creation is prohibited.' };
  }
  if (existingAcroForm.dict.has(PDFName.of('XFA'))) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: '/XFA is present on the preparation derivative; stop before writes.' };
  }
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  let fields: PDFField[];
  try {
    fields = document.getForm().getFields();
  } finally {
    console.warn = originalWarn;
  }
  if (warnings.some(item => item.includes('Removing XFA form data'))) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: 'pdf-lib attempted XFA removal; stop before writes.' };
  }
  if (warnings.length > 0) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: `Unexpected pdf-lib form warning: ${warnings.join(' | ')}.` };
  }
  if (fields.length !== expectedFieldCount) {
    return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: `Runtime field count is ${fields.length}; expected ${expectedFieldCount}.` };
  }
  try {
    return { status: 'VALID', document, fields: fieldMap(fields) };
  } catch (error) {
    return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: String(error) };
  }
}

function preflightPlan(
  plan: readonly GenerationWritePlanEntry[],
  fields: Map<string, PDFField>,
  expectedFieldCount: number,
):
  | { status: 'VALID'; before: Map<string, FieldSnapshot> }
  | { status: 'BLOCKED'; reason: GeneratedDraftBlockReason; detail: string } {
  if (plan.length !== expectedFieldCount) {
    return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: `Write plan has ${plan.length} entries; expected ${expectedFieldCount}.` };
  }
  const names = new Set<string>();
  const before = new Map<string, FieldSnapshot>();
  try {
    for (const entry of plan) {
      if (names.has(entry.fieldId)) {
        return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: `Write plan duplicates ${entry.fieldId}.` };
      }
      names.add(entry.fieldId);
      const field = fields.get(entry.fieldId);
      if (!field) {
        return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: `Exact field ${entry.fieldId} is missing; no fallback is permitted.` };
      }
      const kind = supportedKind(field);
      if (!kind) {
        return { status: 'BLOCKED', reason: 'UNSUPPORTED_CONTROL_SUBTYPE', detail: `Unsupported runtime field subtype at ${entry.fieldId}.` };
      }
      if (entry.fieldType === '/Tx' && kind !== 'TEXT') {
        return { status: 'BLOCKED', reason: 'FIELD_TYPE_MISMATCH', detail: `${entry.fieldId} is ${kind}, expected /Tx.` };
      }
      if (entry.fieldType === '/Btn' && kind !== 'CHECKBOX' && kind !== 'BUTTON') {
        return { status: 'BLOCKED', reason: 'FIELD_TYPE_MISMATCH', detail: `${entry.fieldId} is ${kind}, expected /Btn.` };
      }
      if ((entry.action === 'SET_SELECTED' || entry.action === 'SET_EXPLICIT_NONSELECTION') && kind !== 'CHECKBOX') {
        return { status: 'BLOCKED', reason: 'UNSUPPORTED_CONTROL_SUBTYPE', detail: `${entry.fieldId} requires checkbox semantics but runtime subtype is ${kind}.` };
      }
      if (entry.action === 'WRITE_TEXT') {
        if (!(field instanceof PDFTextField)) {
          return { status: 'BLOCKED', reason: 'FIELD_TYPE_MISMATCH', detail: `${entry.fieldId} is not an exact PDFTextField.` };
        }
        if (field.isRichFormatted()) {
          return { status: 'BLOCKED', reason: 'INVALID_TEXT_FIELD', detail: `${entry.fieldId} is rich formatted; conversion is not authorized.` };
        }
        const maxLength = field.getMaxLength();
        if (maxLength !== undefined && entry.value.length > maxLength) {
          return { status: 'BLOCKED', reason: 'INVALID_TEXT_FIELD', detail: `${entry.fieldId} exceeds MaxLen ${maxLength}.` };
        }
      }
      if (entry.action === 'SET_SELECTED' && field instanceof PDFCheckBox && !field.acroField.getOnValue()) {
        return { status: 'BLOCKED', reason: 'UNSUPPORTED_CONTROL_SUBTYPE', detail: `${entry.fieldId} has no explicit checkbox on-state.` };
      }
      before.set(entry.fieldId, snapshotField(field));
    }
  } catch (error) {
    return { status: 'BLOCKED', reason: 'PREPARATION_DERIVATIVE_INVALID', detail: `Preflight snapshot failed: ${String(error)}.` };
  }
  if (names.size !== fields.size) {
    return { status: 'BLOCKED', reason: 'FIELD_INVENTORY_MISMATCH', detail: 'Write plan does not classify every runtime field.' };
  }
  return { status: 'VALID', before };
}

async function preflightHelvetica(plan: readonly GenerationWritePlanEntry[]):
  Promise<{ status: 'VALID' } | { status: 'BLOCKED'; detail: string }> {
  const preflight = await PDFDocument.create({ updateMetadata: false });
  const font = await preflight.embedFont(StandardFonts.Helvetica);
  for (const entry of plan) {
    if (entry.action !== 'WRITE_TEXT') continue;
    try {
      font.encodeText(entry.value);
    } catch (error) {
      return { status: 'BLOCKED', detail: `${entry.fieldId} contains unsupported Helvetica/WinAnsi glyphs: ${String(error)}.` };
    }
  }
  return { status: 'VALID' };
}

function sameSnapshotInvariant(before: FieldSnapshot, after: FieldSnapshot): boolean {
  return before.kind === after.kind
    && before.flags === after.flags
    && before.immutableWidgetSemantics === after.immutableWidgetSemantics
    && before.textMaxLength === after.textMaxLength
    && before.textAlignment === after.textAlignment
    && before.textRich === after.textRich
    && before.checkboxOnValue === after.checkboxOnValue;
}

function appearanceOperator(policy: GeneratedTextAppearancePolicy): string {
  const [r, g, b] = policy.rgb;
  if (policy.colorSpace !== 'DeviceRGB'
    || ![r, g, b].every(component => Number.isFinite(component) && component >= 0 && component <= 1)) {
    throw new Error('Generated text appearance must be a finite DeviceRGB triplet in the inclusive [0,1] range.');
  }
  return `${r} ${g} ${b} rg`;
}

function applyGeneratedTextAppearance(
  field: PDFTextField,
  policy: GeneratedTextAppearancePolicy | undefined,
): void {
  if (!policy) return;
  const operator = appearanceOperator(policy);
  field.acroField.setDefaultAppearance(operator);
  for (const widget of field.acroField.getWidgets()) widget.setDefaultAppearance(operator);
}

function verifyGeneratedTextAppearance(
  field: PDFTextField,
  policy: GeneratedTextAppearancePolicy | undefined,
): boolean {
  if (!policy) return true;
  const operator = appearanceOperator(policy);
  if (!(field.acroField.getDefaultAppearance() ?? '').includes(operator)) return false;
  return field.acroField.getWidgets().every(widget => (widget.getDefaultAppearance() ?? '').includes(operator));
}

function verifyPlanAfterReopen(
  plan: readonly GenerationWritePlanEntry[],
  before: Map<string, FieldSnapshot>,
  fields: Map<string, PDFField>,
  generatedTextAppearance: GeneratedTextAppearancePolicy | undefined,
):
  | { status: 'VALID' }
  | { status: 'BLOCKED'; detail: string } {
  try {
    for (const entry of plan) {
      const field = fields.get(entry.fieldId);
      const initial = before.get(entry.fieldId);
      if (!field || !initial) return { status: 'BLOCKED', detail: `${entry.fieldId} is missing after serialization.` };
      const after = snapshotField(field);
      if (!sameSnapshotInvariant(initial, after)) {
        return { status: 'BLOCKED', detail: `${entry.fieldId} changed field/widget semantics outside the authorized value/appearance mutation.` };
      }
      if (entry.action === 'WRITE_TEXT') {
        if (!(field instanceof PDFTextField) || (field.getText() ?? null) !== entry.value) {
          return { status: 'BLOCKED', detail: `${entry.fieldId} text did not reopen with the exact governed value.` };
        }
        if (!verifyGeneratedTextAppearance(field, generatedTextAppearance)) {
          return { status: 'BLOCKED', detail: `${entry.fieldId} did not reopen with the definition-scoped generated text appearance.` };
        }
      } else if (entry.action === 'SET_SELECTED') {
        if (!(field instanceof PDFCheckBox) || !field.isChecked()) {
          return { status: 'BLOCKED', detail: `${entry.fieldId} did not reopen selected.` };
        }
      } else if (entry.action === 'SET_EXPLICIT_NONSELECTION') {
        if (!(field instanceof PDFCheckBox) || field.isChecked()) {
          return { status: 'BLOCKED', detail: `${entry.fieldId} did not reopen explicitly nonselected.` };
        }
      } else if (
        initial.fullFieldDictionary !== after.fullFieldDictionary
        || canonicalizeGenerationIdentity(initial.fullWidgetDictionaries)
          !== canonicalizeGenerationIdentity(after.fullWidgetDictionaries)
      ) {
        return { status: 'BLOCKED', detail: `${entry.fieldId} no-write field changed from its admitted derivative state.` };
      }
    }
  } catch (error) {
    return { status: 'BLOCKED', detail: `Generated verification failed: ${String(error)}.` };
  }
  return { status: 'VALID' };
}

function validateStaticInputs(
  inputs: Omit<OfficialFormGeneratedDraftInputs, 'preparedAtISO'>,
):
  | {
      status: 'VALID';
      manifestId: string;
      authorizationSnapshotId: string;
      binding: Extract<OfficialFormGenerationBindingEvaluation, { status: 'GENERATION_BINDING_READY' }>;
    }
  | { status: 'BLOCKED'; reason: GeneratedDraftBlockReason; detail: string } {
  const identity = validateOfficialSourceIdentity(inputs.definition.expectedSourceIdentity, inputs.officialSourceIdentity);
  const health = validateOfficialSourceHealth(inputs.officialSourceHealth);
  const sourceValidation = identity.status === 'VALID' ? health : identity;
  if (sourceValidation.status !== 'VALID') {
    return { status: 'BLOCKED', reason: 'SOURCE_VALIDATION_FAILED', detail: sourceValidation.detail };
  }
  if (sha256Bytes(inputs.officialSourceBytes) !== inputs.definition.expectedSourceIdentity.repositorySha256) {
    return { status: 'BLOCKED', reason: 'OFFICIAL_SOURCE_BYTES_MISMATCH', detail: 'Exact official-source bytes do not match the registered SHA-256.' };
  }
  const authorization = validateFormPreparationAuthorization(
    inputs.preparationAuthorization,
    inputs.definition.expectedSourceIdentity,
    inputs.facts,
  );
  if (authorization.status === 'BLOCKED') {
    return { status: 'BLOCKED', reason: 'PREPARATION_AUTHORIZATION_INVALID', detail: authorization.detail };
  }
  const manifest = validatePreparationRuntimeManifest(
    inputs.preparationManifest,
    inputs.definition,
    inputs.preparationDerivativeBytes,
  );
  if (manifest.status === 'BLOCKED') {
    const bytesMismatch = inputs.preparationManifest.preparationDerivative?.sha256 !== sha256Bytes(inputs.preparationDerivativeBytes)
      || inputs.preparationManifest.preparationDerivative?.byteLength !== inputs.preparationDerivativeBytes.byteLength;
    return {
      status: 'BLOCKED',
      reason: bytesMismatch ? 'PREPARATION_DERIVATIVE_MISMATCH' : 'PREPARATION_MANIFEST_INVALID',
      detail: manifest.detail,
    };
  }
  if (inputs.definition.expectedArtifactRole !== 'OWNER_GENERATED_PREPARATION') {
    return {
      status: 'BLOCKED',
      reason: 'GENERATION_BINDING_IDENTITY_MISMATCH',
      detail: 'Generated-draft definition must preserve D.1 OWNER_GENERATED_PREPARATION artifact role.',
    };
  }
  const binding = inputs.evaluateBinding();
  if (binding.status !== 'GENERATION_BINDING_READY') {
    return { status: 'BLOCKED', reason: 'GENERATION_BINDING_BLOCKED', detail: `${binding.blockReason}: ${binding.detail}` };
  }
  if (binding.mapSnapshotId !== inputs.definition.expectedMapSnapshotId
    || binding.generatorContractVersion !== inputs.definition.expectedGeneratorContractVersion) {
    return {
      status: 'BLOCKED',
      reason: 'GENERATION_BINDING_IDENTITY_MISMATCH',
      detail: 'Fresh D.1 generation binding does not match the expected map snapshot/generator contract.',
    };
  }
  if (binding.fieldWritePlan.length !== inputs.preparationManifest.preparationDerivative.governedFieldCount) {
    return {
      status: 'BLOCKED',
      reason: 'GENERATION_BINDING_IDENTITY_MISMATCH',
      detail: 'Fresh D.1 field-write-plan count does not match admitted derivative governance.',
    };
  }
  return {
    status: 'VALID',
    manifestId: manifest.manifestId,
    authorizationSnapshotId: authorization.snapshotId,
    binding,
  };
}

export async function generateOfficialFormGeneratedDraft(
  inputs: OfficialFormGeneratedDraftInputs,
): Promise<OfficialFormGeneratedDraftResult> {
  if (!validPreparedAtISO(inputs.preparedAtISO)) {
    return blocked('INVALID_PREPARED_AT', 'preparedAtISO must be an exact caller-supplied UTC ISO timestamp.');
  }
  const staticValidation = validateStaticInputs(inputs);
  if (staticValidation.status === 'BLOCKED') {
    return blocked(staticValidation.reason, staticValidation.detail);
  }

  const loaded = await loadAdmittedForm(
    inputs.preparationDerivativeBytes,
    inputs.definition.expectedPageCount,
    inputs.definition.expectedFieldCount,
  );
  if (loaded.status === 'BLOCKED') return blocked(loaded.reason, loaded.detail);

  const plan = staticValidation.binding.fieldWritePlan;
  const preflight = preflightPlan(plan, loaded.fields, inputs.definition.expectedFieldCount);
  if (preflight.status === 'BLOCKED') return blocked(preflight.reason, preflight.detail);

  const glyphs = await preflightHelvetica(plan);
  if (glyphs.status === 'BLOCKED') return blocked('UNSUPPORTED_GLYPH', glyphs.detail);

  let generatedBytes: Uint8Array;
  try {
    const targetFont = plan.some(entry => entry.action === 'WRITE_TEXT')
      ? await loaded.document.embedFont(StandardFonts.Helvetica)
      : null;

    for (const entry of plan) {
      const field = loaded.fields.get(entry.fieldId)!;
      if (entry.action === 'WRITE_TEXT') {
        const textField = field as PDFTextField;
        textField.setText(entry.value);
        applyGeneratedTextAppearance(textField, inputs.definition.generatedTextAppearance);
        textField.updateAppearances(targetFont!);
      } else if (entry.action === 'SET_SELECTED') {
        const checkbox = field as PDFCheckBox;
        checkbox.check();
        checkbox.updateAppearances();
      } else if (entry.action === 'SET_EXPLICIT_NONSELECTION') {
        const checkbox = field as PDFCheckBox;
        checkbox.uncheck();
        checkbox.updateAppearances();
      }
    }

    generatedBytes = await loaded.document.save({
      useObjectStreams: false,
      addDefaultPage: false,
      updateFieldAppearances: false,
    });
  } catch (error) {
    return blocked('PDF_MUTATION_FAILED', `Authorized PDF mutation failed: ${String(error)}.`);
  }

  const reopened = await loadAdmittedForm(
    generatedBytes,
    inputs.definition.expectedPageCount,
    inputs.definition.expectedFieldCount,
  );
  if (reopened.status === 'BLOCKED') {
    return blocked('GENERATED_VERIFICATION_FAILED', reopened.detail);
  }
  const verification = verifyPlanAfterReopen(
    plan,
    preflight.before,
    reopened.fields,
    inputs.definition.generatedTextAppearance,
  );
  if (verification.status === 'BLOCKED') {
    return blocked('GENERATED_VERIFICATION_FAILED', verification.detail);
  }

  const generatedPdfSha256 = sha256Bytes(generatedBytes);
  const fieldWritePlanDigest = computeFieldWritePlanDigest(plan);
  const manifest = inputs.preparationManifest;
  const identity: GeneratedDraftIdentity = {
    schemaVersion: OFFICIAL_FORM_GENERATED_DRAFT_SCHEMA_VERSION,
    artifactClass: 'GENERATED_DRAFT',
    artifactRole: inputs.definition.expectedArtifactRole,
    officialSourceArtifactId: inputs.definition.expectedSourceIdentity.artifactId,
    officialSourceSnapshotId: inputs.definition.expectedSourceIdentity.sourceSnapshotId,
    officialSourceSha256: inputs.definition.expectedSourceIdentity.repositorySha256,
    sourceAdmissionPolicyId: manifest.sourceAdmission.policyId,
    sourceAdmissionStatus: manifest.sourceAdmission.status,
    qpdfAssetIdentityDigest: computeQpdfAssetIdentityDigest(manifest.sourceAdmission.qpdfAsset),
    sourcePassACommandDigest: manifest.sourceAdmission.passA.commandDigest,
    sourcePassAWarningInventoryDigest: manifest.sourceAdmission.passA.warningInventoryDigest,
    sourcePassBCommandDigest: manifest.sourceAdmission.passB.commandDigest,
    sourcePassBWarningInventoryDigest: manifest.sourceAdmission.passB.warningInventoryDigest,
    sourceWarningInventoryDigest: manifest.sourceAdmission.passA.warningInventoryDigest,
    qpdfIntermediateSha256: manifest.qpdfNormalization.intermediateSha256,
    xfaPolicyId: manifest.xfaDisconnection.policyId,
    xfaDigest: manifest.xfaDisconnection.xfaDigest,
    preparationManifestId: staticValidation.manifestId,
    preparationSourceId: manifest.preparationSourceId,
    preparationDerivativeSha256: manifest.preparationDerivative.sha256,
    preparationFieldEquivalenceDigest: manifest.preparationDerivative.fieldEquivalenceDigest,
    preparationSemanticDeltaDigest: manifest.preparationDerivative.semanticDeltaDigest,
    preparationAuthorizationSnapshotId: staticValidation.authorizationSnapshotId,
    mapSnapshotId: staticValidation.binding.mapSnapshotId,
    referencedFactSnapshotId: staticValidation.binding.referencedFactSnapshotId,
    generationInputId: staticValidation.binding.generationInputId,
    generatorContractVersion: staticValidation.binding.generatorContractVersion,
    generatorImplementationId: inputs.definition.generatorImplementationId,
    generatorImplementationVersion: inputs.definition.generatorImplementationVersion,
    fieldWritePlanDigest,
    preparedAtISO: inputs.preparedAtISO,
    generatedPdfSha256,
    generatedByteLength: generatedBytes.byteLength,
  };
  const evidence: GeneratedDraftEvidence = {
    ...identity,
    generatedDocumentId: computeGeneratedDocumentId(identity),
  };
  return {
    status: 'GENERATED_DRAFT',
    bytes: generatedBytes,
    evidence,
    ownerReview: 'NOT_PERFORMED',
    signing: 'NOT_PERFORMED',
    filing: 'NOT_PERFORMED',
  };
}

export function evaluateOfficialFormGeneratedDraftCurrentness(
  draft: GeneratedDraftEvidence,
  inputs: OfficialFormGeneratedDraftCurrentnessInputs,
): GeneratedDraftCurrentness {
  const reasons: string[] = [];
  const { generatedDocumentId, ...draftIdentity } = draft;
  if (computeGeneratedDocumentId(draftIdentity) !== generatedDocumentId) {
    reasons.push('GENERATED_DOCUMENT_ID_CHANGED');
  }
  if (sha256Bytes(inputs.draftBytes) !== draft.generatedPdfSha256
    || inputs.draftBytes.byteLength !== draft.generatedByteLength) {
    reasons.push('GENERATED_BYTES_CHANGED');
  }
  const staticValidation = validateStaticInputs(inputs);
  if (staticValidation.status === 'BLOCKED') {
    reasons.push(`CURRENT_INPUT_BLOCKED:${staticValidation.reason}`);
    return { status: 'OUT_OF_DATE', reasons };
  }
  const manifest = inputs.preparationManifest;
  const comparisons: readonly [string, unknown, unknown][] = [
    ['ARTIFACT_ROLE', draft.artifactRole, inputs.definition.expectedArtifactRole],
    ['OFFICIAL_SOURCE_ARTIFACT', draft.officialSourceArtifactId, inputs.definition.expectedSourceIdentity.artifactId],
    ['OFFICIAL_SOURCE_SNAPSHOT', draft.officialSourceSnapshotId, inputs.definition.expectedSourceIdentity.sourceSnapshotId],
    ['OFFICIAL_SOURCE_SHA', draft.officialSourceSha256, inputs.definition.expectedSourceIdentity.repositorySha256],
    ['SOURCE_ADMISSION_POLICY', draft.sourceAdmissionPolicyId, manifest.sourceAdmission.policyId],
    ['SOURCE_ADMISSION_STATUS', draft.sourceAdmissionStatus, manifest.sourceAdmission.status],
    ['QPDF_ASSET_IDENTITY', draft.qpdfAssetIdentityDigest, computeQpdfAssetIdentityDigest(manifest.sourceAdmission.qpdfAsset)],
    ['SOURCE_PASS_A_COMMAND', draft.sourcePassACommandDigest, manifest.sourceAdmission.passA.commandDigest],
    ['SOURCE_PASS_A_WARNING_INVENTORY', draft.sourcePassAWarningInventoryDigest, manifest.sourceAdmission.passA.warningInventoryDigest],
    ['SOURCE_PASS_B_COMMAND', draft.sourcePassBCommandDigest, manifest.sourceAdmission.passB.commandDigest],
    ['SOURCE_PASS_B_WARNING_INVENTORY', draft.sourcePassBWarningInventoryDigest, manifest.sourceAdmission.passB.warningInventoryDigest],
    ['SOURCE_WARNING_INVENTORY', draft.sourceWarningInventoryDigest, manifest.sourceAdmission.passA.warningInventoryDigest],
    ['QPDF_INTERMEDIATE', draft.qpdfIntermediateSha256, manifest.qpdfNormalization.intermediateSha256],
    ['XFA_POLICY', draft.xfaPolicyId, manifest.xfaDisconnection.policyId],
    ['XFA_DIGEST', draft.xfaDigest, manifest.xfaDisconnection.xfaDigest],
    ['PREPARATION_MANIFEST', draft.preparationManifestId, staticValidation.manifestId],
    ['PREPARATION_SOURCE', draft.preparationSourceId, manifest.preparationSourceId],
    ['PREPARATION_DERIVATIVE_SHA', draft.preparationDerivativeSha256, manifest.preparationDerivative.sha256],
    ['PREPARATION_FIELD_EQUIVALENCE', draft.preparationFieldEquivalenceDigest, manifest.preparationDerivative.fieldEquivalenceDigest],
    ['PREPARATION_SEMANTIC_DELTA', draft.preparationSemanticDeltaDigest, manifest.preparationDerivative.semanticDeltaDigest],
    ['PREPARATION_AUTHORIZATION', draft.preparationAuthorizationSnapshotId, staticValidation.authorizationSnapshotId],
    ['MAP_SNAPSHOT', draft.mapSnapshotId, staticValidation.binding.mapSnapshotId],
    ['REFERENCED_FACT_SNAPSHOT', draft.referencedFactSnapshotId, staticValidation.binding.referencedFactSnapshotId],
    ['GENERATION_INPUT', draft.generationInputId, staticValidation.binding.generationInputId],
    ['GENERATOR_CONTRACT', draft.generatorContractVersion, staticValidation.binding.generatorContractVersion],
    ['GENERATOR_IMPLEMENTATION_ID', draft.generatorImplementationId, inputs.definition.generatorImplementationId],
    ['GENERATOR_IMPLEMENTATION_VERSION', draft.generatorImplementationVersion, inputs.definition.generatorImplementationVersion],
    ['WRITE_PLAN', draft.fieldWritePlanDigest, computeFieldWritePlanDigest(staticValidation.binding.fieldWritePlan)],
  ];
  for (const [reason, historical, current] of comparisons) {
    if (canonicalizeGenerationIdentity(historical) !== canonicalizeGenerationIdentity(current)) reasons.push(`${reason}_CHANGED`);
  }
  return reasons.length === 0 ? { status: 'CURRENT', reasons: [] } : { status: 'OUT_OF_DATE', reasons };
}
