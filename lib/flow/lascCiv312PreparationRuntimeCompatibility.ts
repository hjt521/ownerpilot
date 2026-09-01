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

export interface LascCiv312RootWidgetTopologyEvidence {
  resolvedToDictionary: boolean;
  subtype: string | null;
  parentObjectReference: string | null;
  hasFieldId: boolean;
  hasFieldType: boolean;
}

export interface LascCiv312RootFieldTopologyEvidence {
  resolvedToDictionary: boolean;
  fieldTypeProvableReadOnly: boolean;
  fieldId: string | null;
  fieldType: string | null;
  objectReference: string | null;
  children: readonly LascCiv312RootWidgetTopologyEvidence[];
}

export type LascCiv312RootAnchoredTopologyValidation =
  | { status: 'VALID'; terminalFields: readonly LascCiv312RuntimeTerminalEvidence[] }
  | { status: 'BLOCKED'; detail: string };

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
const EXPECTED_TERMINAL_REFS = Object.freeze(LASC_CIV_312_TERMINAL_FIELDS.map(field => field.objectReference));
const EXPECTED_TERMINAL_REF_SET = new Set(EXPECTED_TERMINAL_REFS);

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

function deterministicRootRefDetail(roots: readonly LascCiv312RootFieldTopologyEvidence[]): string {
  const refs = roots.map(root => root.objectReference ?? '<NON_REF_ROOT>');
  const uniqueRefs = new Set(refs);
  return `observedRootCount=${roots.length};observedUniqueRootCount=${uniqueRefs.size};observedRootRefs=${JSON.stringify([...refs].sort())}`;
}

/**
 * Exact-source root anchoring only. This does not discover logical fields from
 * /Kids. The frozen 22 top-level object references are the authority; child
 * objects are widget-topology evidence only.
 */
export function validateLascCiv312RootAnchoredTopologyEvidence(
  roots: readonly LascCiv312RootFieldTopologyEvidence[],
): LascCiv312RootAnchoredTopologyValidation {
  const detail = deterministicRootRefDetail(roots);
  if (roots.length !== LASC_CIV_312_TERMINAL_INPUT_COUNT) {
    return { status: 'BLOCKED', detail: `Raw /Fields root count does not equal the frozen 22-root topology; ${detail}.` };
  }

  const refs = roots.map(root => root.objectReference);
  if (refs.some(ref => ref === null)) {
    return { status: 'BLOCKED', detail: `Every raw /Fields entry must be an indirect object reference; ${detail}.` };
  }
  const concreteRefs = refs as string[];
  const uniqueRefs = new Set(concreteRefs);
  if (uniqueRefs.size !== LASC_CIV_312_TERMINAL_INPUT_COUNT) {
    return { status: 'BLOCKED', detail: `Raw /Fields contains a duplicate top-level object reference; ${detail}.` };
  }
  if (concreteRefs.some(ref => !EXPECTED_TERMINAL_REF_SET.has(ref))
    || EXPECTED_TERMINAL_REFS.some(ref => !uniqueRefs.has(ref))) {
    return { status: 'BLOCKED', detail: `Raw /Fields ref set does not equal the frozen 22-ref topology; ${detail}.` };
  }

  const terminalFields: LascCiv312RuntimeTerminalEvidence[] = [];
  for (const expected of LASC_CIV_312_TERMINAL_FIELDS) {
    const root = roots.find(candidate => candidate.objectReference === expected.objectReference)!;
    if (!root.resolvedToDictionary) {
      return { status: 'BLOCKED', detail: `Frozen root ${expected.objectReference} did not resolve to a dictionary; ${detail}.` };
    }
    if (!root.fieldTypeProvableReadOnly) {
      return { status: 'BLOCKED', detail: `Inherited /FT was not provable read-only for ${expected.objectReference}; ${detail}.` };
    }
    for (const child of root.children) {
      if (!child.resolvedToDictionary) {
        return { status: 'BLOCKED', detail: `A /Kids entry under ${expected.objectReference} did not resolve to a dictionary; ${detail}.` };
      }
      if (child.subtype !== '/Widget') {
        return { status: 'BLOCKED', detail: `A /Kids entry under ${expected.objectReference} was not /Subtype /Widget; ${detail}.` };
      }
      if (child.parentObjectReference !== expected.objectReference) {
        return { status: 'BLOCKED', detail: `A widget /Parent did not bind back to owning frozen root ${expected.objectReference}; ${detail}.` };
      }
      // /T and /FT on a proven widget child are explicitly non-authoritative
      // for logical-field counting. They remain child-widget state only.
      void child.hasFieldId;
      void child.hasFieldType;
    }
    terminalFields.push({
      fieldId: root.fieldId ?? '<UNNAMED_TERMINAL_FIELD>',
      fieldType: root.fieldType,
      objectReference: expected.objectReference,
    });
  }
  return { status: 'VALID', terminalFields };
}

function objectReferenceForReadOnly(document: PDFDocument, value: unknown): string | null {
  if (value instanceof PDFRef) return value.toString();
  if (value instanceof PDFDict) return document.context.getObjectRef(value)?.toString() ?? null;
  return null;
}

function readInheritedFieldTypeReadOnly(
  document: PDFDocument,
  root: PDFDict,
): { fieldType: string | null; provable: boolean } {
  let current = root;
  const visited = new Set<string>();
  for (let depth = 0; depth < 64; depth += 1) {
    const directTypeRaw = current.get(PDFName.of('FT'));
    if (directTypeRaw !== undefined) {
      const directType = document.context.lookup(directTypeRaw);
      return directType instanceof PDFName
        ? { fieldType: directType.toString(), provable: true }
        : { fieldType: null, provable: false };
    }

    const parentRaw = current.get(PDFName.of('Parent'));
    if (parentRaw === undefined) return { fieldType: null, provable: true };
    const parentReference = objectReferenceForReadOnly(document, parentRaw);
    if (!parentReference || visited.has(parentReference)) return { fieldType: null, provable: false };
    visited.add(parentReference);
    const parent = document.context.lookup(parentRaw);
    if (!(parent instanceof PDFDict)) return { fieldType: null, provable: false };
    current = parent;
  }
  return { fieldType: null, provable: false };
}

function inspectRootFieldReadOnly(
  document: PDFDocument,
  rawRoot: unknown,
): LascCiv312RootFieldTopologyEvidence {
  if (!(rawRoot instanceof PDFRef)) {
    return {
      resolvedToDictionary: false,
      fieldTypeProvableReadOnly: false,
      fieldId: null,
      fieldType: null,
      objectReference: null,
      children: [],
    };
  }
  const objectReference = rawRoot.toString();
  const resolved = document.context.lookup(rawRoot);
  if (!(resolved instanceof PDFDict)) {
    return {
      resolvedToDictionary: false,
      fieldTypeProvableReadOnly: false,
      fieldId: null,
      fieldType: null,
      objectReference,
      children: [],
    };
  }

  const fieldId = readText(document.context.lookup(resolved.get(PDFName.of('T'))));
  const inheritedFieldType = readInheritedFieldTypeReadOnly(document, resolved);
  const children: LascCiv312RootWidgetTopologyEvidence[] = [];
  const kidsRaw = resolved.get(PDFName.of('Kids'));
  if (kidsRaw !== undefined) {
    const kids = document.context.lookup(kidsRaw);
    if (!(kids instanceof PDFArray)) {
      children.push({
        resolvedToDictionary: false,
        subtype: null,
        parentObjectReference: null,
        hasFieldId: false,
        hasFieldType: false,
      });
    } else {
      for (let index = 0; index < kids.size(); index += 1) {
        const childRaw = kids.get(index);
        const child = document.context.lookup(childRaw);
        if (!(child instanceof PDFDict)) {
          children.push({
            resolvedToDictionary: false,
            subtype: null,
            parentObjectReference: null,
            hasFieldId: false,
            hasFieldType: false,
          });
          continue;
        }
        const subtypeRaw = child.get(PDFName.of('Subtype'));
        const subtype = subtypeRaw === undefined ? undefined : document.context.lookup(subtypeRaw);
        const parentRaw = child.get(PDFName.of('Parent'));
        children.push({
          resolvedToDictionary: true,
          subtype: subtype instanceof PDFName ? subtype.toString() : null,
          parentObjectReference: parentRaw === undefined ? null : objectReferenceForReadOnly(document, parentRaw),
          hasFieldId: child.has(PDFName.of('T')),
          hasFieldType: child.has(PDFName.of('FT')),
        });
      }
    }
  }

  return {
    resolvedToDictionary: true,
    fieldTypeProvableReadOnly: inheritedFieldType.provable,
    fieldId,
    fieldType: inheritedFieldType.fieldType,
    objectReference,
    children,
  };
}

export function inspectLascCiv312TerminalFieldsReadOnly(
  document: PDFDocument,
  acroForm: NonNullable<ReturnType<PDFDocument['catalog']['getAcroForm']>>,
): {
  terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
  topologyProvableReadOnly: boolean;
  diagnostic: string;
} {
  const fields = acroForm.Fields();
  if (!(fields instanceof PDFArray)) {
    return {
      terminalFields: [],
      topologyProvableReadOnly: false,
      diagnostic: 'fieldsPdfArray=false;observedRootCount=unavailable;observedRootRefs=[]',
    };
  }

  const roots: LascCiv312RootFieldTopologyEvidence[] = [];
  for (let index = 0; index < fields.size(); index += 1) {
    roots.push(inspectRootFieldReadOnly(document, fields.get(index)));
  }
  const validation = validateLascCiv312RootAnchoredTopologyEvidence(roots);
  const diagnostic = `fieldsPdfArray=true;${deterministicRootRefDetail(roots)}`;
  return validation.status === 'VALID'
    ? { terminalFields: validation.terminalFields, topologyProvableReadOnly: true, diagnostic }
    : { terminalFields: [], topologyProvableReadOnly: false, diagnostic: `${diagnostic};topologyDetail=${validation.detail}` };
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
        fieldDictionaries.push({
          ref: ref?.toString() ?? document.context.getObjectRef(resolved)?.toString() ?? null,
          dictionary: resolved.toString(),
        });
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
  const inspected = inspectLascCiv312TerminalFieldsReadOnly(document, existingAcroForm);
  const inspectionStructuralSnapshotAfter = captureInspectionStructuralSnapshot(document, existingAcroForm);
  if (inspectionStructuralSnapshotAfter !== inspectionStructuralSnapshotBefore) {
    return blocked('INSPECTION_MUTATION_OBSERVED', 'Read-only inspection changed the observed PDF structure.');
  }

  const sourceSha256AfterInspection = sha256(sourceBytes);
  if (sourceSha256AfterInspection !== sourceSha256BeforeInspection) {
    return blocked('SOURCE_IDENTITY_CHANGED_AFTER_INSPECTION', 'Source bytes changed during read-only inspection.');
  }

  if (!inspected.topologyProvableReadOnly) {
    return blocked('TOPOLOGY_NOT_PROVABLE_READ_ONLY', `Exact frozen-root topology was not provable read-only. ${inspected.diagnostic}.`);
  }

  const inspectionEvidence: LascCiv312RuntimeInspectionEvidence = {
    pageCount,
    acroFormPresent: true,
    xfaPresent: false,
    terminalFields: inspected.terminalFields,
    topologyProvableReadOnly: true,
  };
  const validation = validateLascCiv312RuntimeInspectionEvidence(inspectionEvidence);
  if (validation.status === 'BLOCKED') {
    return blocked(validation.blockerCode, validation.detail);
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
