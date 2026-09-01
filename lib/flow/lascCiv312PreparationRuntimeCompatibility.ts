import { createHash } from 'node:crypto';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFString,
} from 'pdf-lib';
import {
  LASC_CIV_312_FIELD_MAP_ID,
  LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  LASC_CIV_312_FIELD_MAP_VERSION,
  LASC_CIV_312_FORM_ID,
  LASC_CIV_312_FORM_REVISION,
  LASC_CIV_312_SOURCE_SHA256,
  LASC_CIV_312_TERMINAL_FIELDS,
  LASC_CIV_312_TERMINAL_INPUT_COUNT,
  type LascCiv312FieldType,
} from './lascCiv312FieldMapFoundation';
import {
  LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
} from './lascCiv312GenerationBinding';
import { OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION } from './officialFormGeneratedDraftAdmission';
import {
  LASC_CIV_312_EXPECTED_PAGE_COUNT,
  LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
  LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID,
  LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT,
  LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION,
} from './lascCiv312GeneratedDraftAdmission';

export const LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION = '2026-09-01.r1' as const;
export const LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID = 'lasc-civ312-preparation-runtime-compatibility-v1' as const;
export const LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION = '2026-09-01.r1' as const;
export const LASC_CIV_312_SOURCE_BYTE_LENGTH = 741498 as const;
export const LASC_CIV_312_PDF_LIB_VERSION = '1.17.1' as const;

export const LASC_CIV_312_PDF_LIB_LOAD_PROFILE = Object.freeze({
  updateMetadata: false,
  ignoreEncryption: false,
} as const);

export const LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE = Object.freeze({
  formApplicability: 'NOT_EVALUATED',
  formRequiredness: 'NOT_EVALUATED',
  legalSufficiency: 'NOT_DETERMINED',
  documentGeneration: 'NOT_PERFORMED',
  pdfMutation: 'NOT_PERFORMED',
  preparationRuntimeDerivative: 'NOT_CREATED',
  sourceMutation: 'NO',
  persistence: 'NO',
  databaseWrite: 'NO',
  preparationCheckpointWrite: 'NO',
  ownerReviewCheckpointWrite: 'NO',
  checkpoint1: 'HELD',
  filing: 'NO',
  signing: 'NO',
  serviceExecution: 'NO',
  courtSubmission: 'NO',
  stageF: 'HELD',
  newProductionAuthority: 'NO',
} as const);

export const LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY = Object.freeze({
  formId: LASC_CIV_312_FORM_ID,
  formRevision: LASC_CIV_312_FORM_REVISION,
  sourceSha256: LASC_CIV_312_SOURCE_SHA256,
  sourceByteLength: LASC_CIV_312_SOURCE_BYTE_LENGTH,
  expectedPageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
  expectedTerminalFieldCount: LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
  fieldMapId: LASC_CIV_312_FIELD_MAP_ID,
  fieldMapVersion: LASC_CIV_312_FIELD_MAP_VERSION,
  fieldMapSnapshot: LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  generationBindingProfileId: LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
  generationBindingProfileVersion: LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
  generationBindingProfileSnapshot: LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
  generatedDraftAdmissionSchemaVersion: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
  generatedDraftAdmissionProfileId: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID,
  generatedDraftAdmissionProfileVersion: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION,
  generatedDraftAdmissionProfileSnapshot: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT,
} as const);

export type LascCiv312RuntimeCompatibilitySourceIdentity = typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY;

export interface LascCiv312RuntimeCompatibilityInput {
  sourceBytes: Uint8Array;
  sourceIdentity: LascCiv312RuntimeCompatibilitySourceIdentity;
}

export interface LascCiv312RuntimeTerminalEvidence {
  fieldId: string;
  fieldType: string | null;
  objectReference: string | null;
}

export interface LascCiv312RuntimeInspectionEvidence {
  pageCount: number;
  acroFormPresent: boolean;
  xfaPresent: boolean | null;
  terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
  topologyProvableReadOnly: boolean;
}

export type LascCiv312RuntimeCompatibilityBlockerCode =
  | 'SOURCE_HASH_MISMATCH'
  | 'SOURCE_BYTE_LENGTH_MISMATCH'
  | 'PDF_LOAD_FAILED'
  | 'ENCRYPTED_OR_UNSUPPORTED_SOURCE'
  | 'PAGE_COUNT_MISMATCH'
  | 'ACROFORM_MISSING'
  | 'XFA_PRESENT_REQUIRES_ARCHITECTURE'
  | 'TERMINAL_FIELD_COUNT_MISMATCH'
  | 'DUPLICATE_TERMINAL_FIELD'
  | 'MISSING_TERMINAL_FIELD'
  | 'UNEXPECTED_TERMINAL_FIELD'
  | 'TERMINAL_FIELD_TYPE_MISMATCH'
  | 'TOPOLOGY_OBJECT_REFERENCE_MISMATCH'
  | 'TOPOLOGY_NOT_PROVABLE_READ_ONLY'
  | 'INSPECTION_MUTATION_OBSERVED'
  | 'SOURCE_IDENTITY_CHANGED_AFTER_INSPECTION'
  | 'MALFORMED_RUNTIME_COMPATIBILITY_INPUT';

export type LascCiv312RuntimeInspectionValidation =
  | { status: 'VALID' }
  | { status: 'BLOCKED'; blockerCode: LascCiv312RuntimeCompatibilityBlockerCode; detail: string };

export type LascCiv312PreparationRuntimeCompatibilityResult =
  | {
      status: 'DIRECT_RUNTIME_COMPATIBLE';
      schemaVersion: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION;
      profileId: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID;
      profileVersion: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION;
      profileSnapshot: string;
      sourceIdentity: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY;
      pdfLibVersion: typeof LASC_CIV_312_PDF_LIB_VERSION;
      loadProfile: typeof LASC_CIV_312_PDF_LIB_LOAD_PROFILE;
      sourceSha256BeforeInspection: string;
      sourceSha256AfterInspection: string;
      sourceByteLength: typeof LASC_CIV_312_SOURCE_BYTE_LENGTH;
      pageCount: typeof LASC_CIV_312_EXPECTED_PAGE_COUNT;
      acroFormPresent: true;
      xfaPresent: false;
      terminalFieldCount: typeof LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT;
      terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
      topologyProvableReadOnly: true;
      inspectionStructuralSnapshotBefore: string;
      inspectionStructuralSnapshotAfter: string;
      sourceIdentityUnchangedAfterInspection: true;
      inspectionMutationObserved: false;
      compatibilitySnapshot: string;
      governance: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE;
    }
  | {
      status: 'BLOCKED_FOR_DIRECT_RUNTIME';
      blockerCode: LascCiv312RuntimeCompatibilityBlockerCode;
      detail: string;
      schemaVersion: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION;
      profileId: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID;
      profileVersion: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION;
      profileSnapshot: string;
      governance: typeof LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE;
    };

const EXPECTED_IDENTITY_KEYS = Object.keys(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY).sort();

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function digest(prefix: string, value: unknown): string {
  return `${prefix}:sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function canonicalProfileSnapshotInput() {
  return {
    schemaVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
    profileId: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID,
    profileVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION,
    sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
    pdfLibVersion: LASC_CIV_312_PDF_LIB_VERSION,
    loadProfile: LASC_CIV_312_PDF_LIB_LOAD_PROFILE,
    expectedTerminalTopology: LASC_CIV_312_TERMINAL_FIELDS.map(field => ({
      fieldId: field.fieldId,
      fieldType: field.fieldType,
      objectReference: field.objectReference,
    })),
    governance: LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE,
  };
}

export function computeLascCiv312RuntimeCompatibilityProfileSnapshot(): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalProfileSnapshotInput())).digest('hex')}`;
}

export const LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT = 'sha256:31184c662ccc00e0d4f65aada6b89bd29d6ff48d1e05592f97adb007c8c88337' as const;

function blocked(
  blockerCode: LascCiv312RuntimeCompatibilityBlockerCode,
  detail: string,
): LascCiv312PreparationRuntimeCompatibilityResult {
  return {
    status: 'BLOCKED_FOR_DIRECT_RUNTIME',
    blockerCode,
    detail,
    schemaVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
    profileId: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID,
    profileVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION,
    profileSnapshot: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT,
    governance: LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE,
  };
}

function exactSourceIdentity(value: unknown): value is LascCiv312RuntimeCompatibilitySourceIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const suppliedKeys = Object.keys(record).sort();
  if (suppliedKeys.length !== EXPECTED_IDENTITY_KEYS.length
    || suppliedKeys.some((key, index) => key !== EXPECTED_IDENTITY_KEYS[index])) return false;
  return EXPECTED_IDENTITY_KEYS.every(key => record[key] === (LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY as unknown as Record<string, unknown>)[key]);
}

function readText(value: unknown): string | null {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return null;
}

interface WalkState {
  terminalFields: LascCiv312RuntimeTerminalEvidence[];
  topologyProvableReadOnly: boolean;
  visitedRefs: Set<string>;
}

function inspectFieldEntry(
  document: PDFDocument,
  entry: unknown,
  parentName: string,
  inheritedFieldType: string | null,
  state: WalkState,
): void {
  let objectReference: string | null = null;
  let dict: PDFDict | null = null;

  if (entry instanceof PDFRef) {
    objectReference = entry.toString();
    if (state.visitedRefs.has(objectReference)) {
      state.terminalFields.push({ fieldId: parentName || '<CYCLIC_FIELD>', fieldType: inheritedFieldType, objectReference });
      return;
    }
    state.visitedRefs.add(objectReference);
    const resolved = document.context.lookup(entry);
    if (resolved instanceof PDFDict) dict = resolved;
    else {
      state.topologyProvableReadOnly = false;
      return;
    }
  } else if (entry instanceof PDFDict) {
    dict = entry;
    objectReference = document.context.getObjectRef(entry)?.toString() ?? null;
    if (!objectReference) state.topologyProvableReadOnly = false;
  } else {
    state.topologyProvableReadOnly = false;
    return;
  }

  const partialName = readText(document.context.lookup(dict.get(PDFName.of('T'))));
  const fieldId = partialName ? (parentName ? `${parentName}.${partialName}` : partialName) : parentName;
  const directType = document.context.lookup(dict.get(PDFName.of('FT')));
  const fieldType = directType instanceof PDFName ? directType.toString() : inheritedFieldType;
  const kidsObject = document.context.lookup(dict.get(PDFName.of('Kids')));
  const childFields: unknown[] = [];

  if (kidsObject instanceof PDFArray) {
    for (let index = 0; index < kidsObject.size(); index += 1) {
      const childEntry = kidsObject.get(index);
      const childResolved = document.context.lookup(childEntry);
      if (!(childResolved instanceof PDFDict)) {
        state.topologyProvableReadOnly = false;
        continue;
      }
      const subtype = document.context.lookup(childResolved.get(PDFName.of('Subtype')));
      const childHasFieldIdentity = childResolved.has(PDFName.of('T'))
        || childResolved.has(PDFName.of('FT'))
        || childResolved.has(PDFName.of('Kids'));
      if (!(subtype instanceof PDFName && subtype.toString() === '/Widget' && !childHasFieldIdentity)) {
        childFields.push(childEntry);
      }
    }
  }

  if (childFields.length > 0) {
    for (const child of childFields) inspectFieldEntry(document, child, fieldId, fieldType, state);
    return;
  }

  state.terminalFields.push({
    fieldId: fieldId || '<UNNAMED_TERMINAL_FIELD>',
    fieldType,
    objectReference,
  });
}

function inspectTerminalFieldsReadOnly(document: PDFDocument, acroForm: NonNullable<ReturnType<PDFDocument['catalog']['getAcroForm']>>): {
  terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
  topologyProvableReadOnly: boolean;
  diagnostic: string;
} {
  const fields = acroForm.Fields();
  if (!(fields instanceof PDFArray)) {
    return {
      terminalFields: [],
      topologyProvableReadOnly: false,
      diagnostic: 'fieldsPdfArray=false;topLevelFieldCount=unavailable;firstEntryPdfRef=false;firstEntryPdfDict=false;firstResolvedPdfDict=false',
    };
  }
  const firstEntry = fields.size() > 0 ? fields.get(0) : undefined;
  const firstResolved = firstEntry === undefined ? undefined : document.context.lookup(firstEntry);
  const diagnostic = `fieldsPdfArray=true;topLevelFieldCount=${fields.size()};firstEntryPdfRef=${firstEntry instanceof PDFRef};firstEntryPdfDict=${firstEntry instanceof PDFDict};firstResolvedPdfDict=${firstResolved instanceof PDFDict}`;
  const state: WalkState = { terminalFields: [], topologyProvableReadOnly: true, visitedRefs: new Set<string>() };
  for (let index = 0; index < fields.size(); index += 1) {
    inspectFieldEntry(document, fields.get(index), '', null, state);
  }
  return { terminalFields: state.terminalFields, topologyProvableReadOnly: state.topologyProvableReadOnly, diagnostic };
}

function captureInspectionStructuralSnapshot(
  document: PDFDocument,
  acroForm: NonNullable<ReturnType<PDFDocument['catalog']['getAcroForm']>>,
): string {
  const fields = acroForm.Fields();
  const fieldDictionaries: Array<{ ref: string | null; dictionary: string }> = [];
  if (fields instanceof PDFArray) {
    for (let index = 0; index < fields.size(); index += 1) {
      const raw = fields.get(index);
      const ref = raw instanceof PDFRef ? raw : null;
      const resolved = document.context.lookup(raw);
      if (resolved instanceof PDFDict) {
        fieldDictionaries.push({ ref: ref?.toString() ?? document.context.getObjectRef(resolved)?.toString() ?? null, dictionary: resolved.toString() });
      }
    }
  }
  return digest('civ312-runtime-structure', {
    indirectObjectCount: document.context.enumerateIndirectObjects().length,
    largestObjectNumber: document.context.largestObjectNumber,
    catalog: document.catalog.toString(),
    acroForm: acroForm.dict.toString(),
    fields: fields?.toString() ?? null,
    fieldDictionaries,
  });
}

export function classifyLascCiv312PdfLoadFailure(error: unknown): LascCiv312RuntimeCompatibilityBlockerCode {
  const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return name === 'EncryptedPDFError' || /encrypted|password/i.test(message)
    ? 'ENCRYPTED_OR_UNSUPPORTED_SOURCE'
    : 'PDF_LOAD_FAILED';
}

/**
 * Validates read-only inspection evidence only. This function cannot grant
 * direct-runtime compatibility; only evaluateLascCiv312PreparationRuntimeCompatibility
 * can issue DIRECT_RUNTIME_COMPATIBLE after inspecting the exact frozen bytes.
 */
export function validateLascCiv312RuntimeInspectionEvidence(
  evidence: LascCiv312RuntimeInspectionEvidence,
): LascCiv312RuntimeInspectionValidation {
  if (!Number.isInteger(evidence.pageCount) || evidence.pageCount !== LASC_CIV_312_EXPECTED_PAGE_COUNT) {
    return { status: 'BLOCKED', blockerCode: 'PAGE_COUNT_MISMATCH', detail: 'Exact CIV 312 source must contain one page.' };
  }
  if (evidence.acroFormPresent !== true) {
    return { status: 'BLOCKED', blockerCode: 'ACROFORM_MISSING', detail: 'Existing AcroForm is required; creation is prohibited.' };
  }
  if (evidence.xfaPresent === true) {
    return { status: 'BLOCKED', blockerCode: 'XFA_PRESENT_REQUIRES_ARCHITECTURE', detail: 'XFA is present; no deletion or preparation transform is authorized.' };
  }
  if (evidence.xfaPresent !== false) {
    return { status: 'BLOCKED', blockerCode: 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', detail: 'XFA state was not deterministically proven read-only.' };
  }
  if (!Array.isArray(evidence.terminalFields) || evidence.terminalFields.length !== LASC_CIV_312_TERMINAL_INPUT_COUNT) {
    return { status: 'BLOCKED', blockerCode: 'TERMINAL_FIELD_COUNT_MISMATCH', detail: `Expected exactly ${LASC_CIV_312_TERMINAL_INPUT_COUNT} terminal fields.` };
  }

  const ids = evidence.terminalFields.map(field => field.fieldId);
  if (new Set(ids).size !== ids.length) {
    return { status: 'BLOCKED', blockerCode: 'DUPLICATE_TERMINAL_FIELD', detail: 'Duplicate terminal field identity observed.' };
  }

  const expectedById = new Map(LASC_CIV_312_TERMINAL_FIELDS.map(field => [field.fieldId, field]));
  for (const field of evidence.terminalFields) {
    if (!expectedById.has(field.fieldId)) {
      return { status: 'BLOCKED', blockerCode: 'UNEXPECTED_TERMINAL_FIELD', detail: `Unexpected terminal field: ${field.fieldId}.` };
    }
  }
  for (const expected of LASC_CIV_312_TERMINAL_FIELDS) {
    const observed = evidence.terminalFields.find(field => field.fieldId === expected.fieldId);
    if (!observed) {
      return { status: 'BLOCKED', blockerCode: 'MISSING_TERMINAL_FIELD', detail: `Missing terminal field: ${expected.fieldId}.` };
    }
    if (observed.fieldType !== expected.fieldType) {
      return { status: 'BLOCKED', blockerCode: 'TERMINAL_FIELD_TYPE_MISMATCH', detail: `Field type mismatch: ${expected.fieldId}.` };
    }
  }

  if (!evidence.topologyProvableReadOnly || evidence.terminalFields.some(field => !field.objectReference)) {
    return { status: 'BLOCKED', blockerCode: 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', detail: 'Exact indirect-object topology was not provable through read-only inspection.' };
  }
  for (const expected of LASC_CIV_312_TERMINAL_FIELDS) {
    const observed = evidence.terminalFields.find(field => field.fieldId === expected.fieldId)!;
    if (observed.objectReference !== expected.objectReference) {
      return { status: 'BLOCKED', blockerCode: 'TOPOLOGY_OBJECT_REFERENCE_MISMATCH', detail: `Object-reference mismatch: ${expected.fieldId}.` };
    }
  }
  return { status: 'VALID' };
}

function normalizedTerminalEvidence(fields: readonly LascCiv312RuntimeTerminalEvidence[]): readonly LascCiv312RuntimeTerminalEvidence[] {
  return LASC_CIV_312_TERMINAL_FIELDS.map(expected => {
    const observed = fields.find(field => field.fieldId === expected.fieldId)!;
    return { fieldId: observed.fieldId, fieldType: observed.fieldType, objectReference: observed.objectReference };
  });
}

export async function evaluateLascCiv312PreparationRuntimeCompatibility(
  input: unknown,
): Promise<LascCiv312PreparationRuntimeCompatibilityResult> {
  if (computeLascCiv312RuntimeCompatibilityProfileSnapshot() !== LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT) {
    return blocked('MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'Frozen runtime-compatibility profile snapshot mismatch.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'Runtime-compatibility input must be an object.');
  }
  const candidate = input as Partial<LascCiv312RuntimeCompatibilityInput>;
  if (!(candidate.sourceBytes instanceof Uint8Array) || !exactSourceIdentity(candidate.sourceIdentity)) {
    return blocked('MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'Exact source bytes and frozen CIV 312 source identity are required.');
  }
  const sourceBytes = candidate.sourceBytes;
  if (sourceBytes.byteLength !== LASC_CIV_312_SOURCE_BYTE_LENGTH) {
    return blocked('SOURCE_BYTE_LENGTH_MISMATCH', `Source byte length ${sourceBytes.byteLength} does not match ${LASC_CIV_312_SOURCE_BYTE_LENGTH}.`);
  }
  const sourceSha256BeforeInspection = sha256(sourceBytes);
  if (sourceSha256BeforeInspection !== LASC_CIV_312_SOURCE_SHA256) {
    return blocked('SOURCE_HASH_MISMATCH', 'Source SHA-256 does not match the frozen CIV 312 source identity.');
  }

  let document: PDFDocument;
  try {
    document = await PDFDocument.load(sourceBytes, LASC_CIV_312_PDF_LIB_LOAD_PROFILE);
  } catch (error) {
    const blockerCode = classifyLascCiv312PdfLoadFailure(error);
    return blocked(blockerCode, blockerCode === 'ENCRYPTED_OR_UNSUPPORTED_SOURCE'
      ? 'Pinned pdf-lib rejected the source as encrypted or unsupported without an encryption bypass.'
      : 'Pinned pdf-lib could not load the exact source using the governed read-only load profile.');
  }
  if (document.isEncrypted) {
    return blocked('ENCRYPTED_OR_UNSUPPORTED_SOURCE', 'Encrypted source is not admissible for direct runtime inspection.');
  }

  const pageCount = document.getPageCount();
  const existingAcroForm = document.catalog.getAcroForm();
  const acroFormPresent = existingAcroForm !== undefined;
  const xfaPresent = existingAcroForm ? existingAcroForm.dict.has(PDFName.of('XFA')) : null;

  if (pageCount !== LASC_CIV_312_EXPECTED_PAGE_COUNT) {
    return blocked('PAGE_COUNT_MISMATCH', `Exact CIV 312 source must contain ${LASC_CIV_312_EXPECTED_PAGE_COUNT} page.`);
  }
  if (!existingAcroForm) {
    return blocked('ACROFORM_MISSING', 'Existing AcroForm is required; creation is prohibited.');
  }
  if (xfaPresent === true) {
    return blocked('XFA_PRESENT_REQUIRES_ARCHITECTURE', 'XFA is present; no deletion or preparation transform is authorized.');
  }
  if (xfaPresent !== false) {
    return blocked('TOPOLOGY_NOT_PROVABLE_READ_ONLY', 'XFA state was not deterministically proven read-only.');
  }

  const sourceAfterPreflight = sha256(sourceBytes);
  if (sourceAfterPreflight !== sourceSha256BeforeInspection) {
    return blocked('SOURCE_IDENTITY_CHANGED_AFTER_INSPECTION', 'Source bytes changed during read-only load/preflight.');
  }

  const inspectionStructuralSnapshotBefore = captureInspectionStructuralSnapshot(document, existingAcroForm);
  const inspected = inspectTerminalFieldsReadOnly(document, existingAcroForm);
  const inspectionStructuralSnapshotAfter = captureInspectionStructuralSnapshot(document, existingAcroForm);
  if (inspectionStructuralSnapshotAfter !== inspectionStructuralSnapshotBefore) {
    return blocked('INSPECTION_MUTATION_OBSERVED', 'Read-only inspection changed the observed PDF structure.');
  }

  const sourceSha256AfterInspection = sha256(sourceBytes);
  if (sourceSha256AfterInspection !== sourceSha256BeforeInspection) {
    return blocked('SOURCE_IDENTITY_CHANGED_AFTER_INSPECTION', 'Source bytes changed during read-only inspection.');
  }

  const inspectionEvidence: LascCiv312RuntimeInspectionEvidence = {
    pageCount,
    acroFormPresent: true,
    xfaPresent: false,
    terminalFields: inspected.terminalFields,
    topologyProvableReadOnly: inspected.topologyProvableReadOnly,
  };
  const validation = validateLascCiv312RuntimeInspectionEvidence(inspectionEvidence);
  if (validation.status === 'BLOCKED') {
    return blocked(
      validation.blockerCode,
      `${validation.detail} Observed terminal fields=${inspected.terminalFields.length}; topologyProvableReadOnly=${inspected.topologyProvableReadOnly}; ${inspected.diagnostic}.`,
    );
  }

  const terminalFields = normalizedTerminalEvidence(inspected.terminalFields);
  const compatibilitySnapshot = digest('civ312-runtime-compatibility', {
    schemaVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
    profileSnapshot: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT,
    sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
    pdfLibVersion: LASC_CIV_312_PDF_LIB_VERSION,
    loadProfile: LASC_CIV_312_PDF_LIB_LOAD_PROFILE,
    sourceSha256BeforeInspection,
    sourceSha256AfterInspection,
    sourceByteLength: sourceBytes.byteLength,
    pageCount,
    acroFormPresent: true,
    xfaPresent: false,
    terminalFields,
    topologyProvableReadOnly: true,
    inspectionStructuralSnapshotBefore,
    inspectionStructuralSnapshotAfter,
    sourceIdentityUnchangedAfterInspection: true,
    inspectionMutationObserved: false,
    governance: LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE,
  });

  return {
    status: 'DIRECT_RUNTIME_COMPATIBLE',
    schemaVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
    profileId: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID,
    profileVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION,
    profileSnapshot: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT,
    sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
    pdfLibVersion: LASC_CIV_312_PDF_LIB_VERSION,
    loadProfile: LASC_CIV_312_PDF_LIB_LOAD_PROFILE,
    sourceSha256BeforeInspection,
    sourceSha256AfterInspection,
    sourceByteLength: LASC_CIV_312_SOURCE_BYTE_LENGTH,
    pageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
    acroFormPresent: true,
    xfaPresent: false,
    terminalFieldCount: LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
    terminalFields,
    topologyProvableReadOnly: true,
    inspectionStructuralSnapshotBefore,
    inspectionStructuralSnapshotAfter,
    sourceIdentityUnchangedAfterInspection: true,
    inspectionMutationObserved: false,
    compatibilitySnapshot,
    governance: LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE,
  };
}
