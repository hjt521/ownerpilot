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
export const LASC_CIV_312_TOPOLOGY_PROOF_MODE = 'LOW_LEVEL_EXACT_FROZEN_REF_HIERARCHY' as const;

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

export interface LascCiv312HierarchyNodeEvidence {
  objectReference: string;
  resolvedToDictionary: boolean;
  subtype: string | null;
  parentObjectReference: string | null;
  fieldId: string | null;
  fieldType: string | null;
  fieldTypeProvableReadOnly: boolean;
  childObjectReferences: readonly string[];
}

export interface LascCiv312HierarchyEvidence {
  rawRootObjectReferences: readonly string[];
  nodes: readonly LascCiv312HierarchyNodeEvidence[];
}

export type LascCiv312HierarchyValidation =
  | {
      status: 'VALID';
      rawRootObjectReferences: readonly string[];
      terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
    }
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
      topologyProofMode: typeof LASC_CIV_312_TOPOLOGY_PROOF_MODE;
      sourceSha256BeforeInspection: string;
      sourceSha256AfterInspection: string;
      sourceByteLength: typeof LASC_CIV_312_SOURCE_BYTE_LENGTH;
      pageCount: typeof LASC_CIV_312_EXPECTED_PAGE_COUNT;
      acroFormPresent: true;
      xfaPresent: false;
      rawFieldRootCount: number;
      rawFieldRootObjectReferences: readonly string[];
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
const EXPECTED_TERMINAL_BY_REF = new Map(LASC_CIV_312_TERMINAL_FIELDS.map(field => [field.objectReference, field]));

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

function readName(document: PDFDocument, raw: unknown): { value: string | null; provable: boolean } {
  if (raw === undefined) return { value: null, provable: true };
  const resolved = document.context.lookup(raw as never);
  return resolved instanceof PDFName
    ? { value: resolved.toString(), provable: true }
    : { value: null, provable: false };
}

function readParentReferenceReadOnly(
  node: PDFDict,
): { parentObjectReference: string | null; provable: boolean } {
  const raw = node.get(PDFName.of('Parent'));
  if (raw === undefined) return { parentObjectReference: null, provable: true };
  return raw instanceof PDFRef
    ? { parentObjectReference: raw.toString(), provable: true }
    : { parentObjectReference: null, provable: false };
}

function readInheritedFieldTypeReadOnly(
  document: PDFDocument,
  initialReference: PDFRef,
  initial: PDFDict,
): { fieldType: string | null; provable: boolean } {
  let currentReference = initialReference;
  let current = initial;
  const visited = new Set<string>();
  for (let depth = 0; depth < 128; depth += 1) {
    const currentRef = currentReference.toString();
    if (visited.has(currentRef)) return { fieldType: null, provable: false };
    visited.add(currentRef);

    const directTypeRaw = current.get(PDFName.of('FT'));
    if (directTypeRaw !== undefined) {
      const directType = readName(document, directTypeRaw);
      return directType.provable
        ? { fieldType: directType.value, provable: true }
        : { fieldType: null, provable: false };
    }

    const parentRaw = current.get(PDFName.of('Parent'));
    if (parentRaw === undefined) return { fieldType: null, provable: true };
    if (!(parentRaw instanceof PDFRef)) return { fieldType: null, provable: false };
    const parent = document.context.lookup(parentRaw);
    if (!(parent instanceof PDFDict)) return { fieldType: null, provable: false };
    currentReference = parentRaw;
    current = parent;
  }
  return { fieldType: null, provable: false };
}

function deterministicHierarchyDetail(evidence: LascCiv312HierarchyEvidence): string {
  return `observedRootCount=${evidence.rawRootObjectReferences.length};observedRootRefs=${JSON.stringify([...evidence.rawRootObjectReferences].sort())};observedNodeCount=${evidence.nodes.length}`;
}

export function validateLascCiv312HierarchyEvidence(
  evidence: LascCiv312HierarchyEvidence,
): LascCiv312HierarchyValidation {
  const detail = deterministicHierarchyDetail(evidence);
  if (evidence.rawRootObjectReferences.length === 0) {
    return { status: 'BLOCKED', detail: `Raw /Fields must contain at least one indirect root; ${detail}.` };
  }
  if (new Set(evidence.rawRootObjectReferences).size !== evidence.rawRootObjectReferences.length) {
    return { status: 'BLOCKED', detail: `Raw /Fields contains duplicate root refs; ${detail}.` };
  }

  const nodeByRef = new Map<string, LascCiv312HierarchyNodeEvidence>();
  for (const node of evidence.nodes) {
    if (nodeByRef.has(node.objectReference)) {
      return { status: 'BLOCKED', detail: `Duplicate hierarchy node evidence for ${node.objectReference}; ${detail}.` };
    }
    nodeByRef.set(node.objectReference, node);
  }

  const reached = new Set<string>();
  const active = new Set<string>();
  const emitted = new Set<string>();
  const terminalFields: LascCiv312RuntimeTerminalEvidence[] = [];
  let failure: string | null = null;

  const visit = (objectReference: string, expectedParent: string | null): void => {
    if (failure) return;
    if (active.has(objectReference)) {
      failure = `Cycle detected at ${objectReference}; ${detail}.`;
      return;
    }
    if (reached.has(objectReference)) {
      failure = `Hierarchy ref ${objectReference} is reachable more than once; ${detail}.`;
      return;
    }
    const node = nodeByRef.get(objectReference);
    if (!node || !node.resolvedToDictionary) {
      failure = `Hierarchy ref ${objectReference} did not resolve to a dictionary; ${detail}.`;
      return;
    }
    if (node.parentObjectReference !== expectedParent) {
      failure = `Parent relationship mismatch for ${objectReference}: expected ${expectedParent ?? '<ROOT>'}, observed ${node.parentObjectReference ?? '<ROOT>'}; ${detail}.`;
      return;
    }

    reached.add(objectReference);
    active.add(objectReference);

    const expectedTerminal = EXPECTED_TERMINAL_BY_REF.get(objectReference);
    if (expectedTerminal) {
      if (emitted.has(objectReference)) {
        failure = `Frozen terminal ${objectReference} emitted more than once; ${detail}.`;
        active.delete(objectReference);
        return;
      }
      if (node.fieldId !== expectedTerminal.fieldId) {
        failure = `Frozen terminal identity mismatch at ${objectReference}; ${detail}.`;
        active.delete(objectReference);
        return;
      }
      if (!node.fieldTypeProvableReadOnly || node.fieldType !== expectedTerminal.fieldType) {
        failure = `Frozen terminal /FT mismatch or inheritance not provable at ${objectReference}; ${detail}.`;
        active.delete(objectReference);
        return;
      }
      emitted.add(objectReference);
      terminalFields.push({
        fieldId: expectedTerminal.fieldId,
        fieldType: expectedTerminal.fieldType,
        objectReference,
      });

      for (const childReference of node.childObjectReferences) {
        const child = nodeByRef.get(childReference);
        if (!child || !child.resolvedToDictionary) {
          failure = `Child ${childReference} under frozen terminal ${objectReference} did not resolve; ${detail}.`;
          break;
        }
        if (EXPECTED_TERMINAL_REF_SET.has(childReference) || child.subtype !== '/Widget') {
          failure = `Frozen terminal ${objectReference} contains a non-widget field child ${childReference}; ${detail}.`;
          break;
        }
        visit(childReference, objectReference);
        if (failure) break;
      }
      active.delete(objectReference);
      return;
    }

    if (node.subtype === '/Widget') {
      active.delete(objectReference);
      return;
    }

    if (node.childObjectReferences.length === 0) {
      failure = `Non-frozen reachable leaf ${objectReference} is neither a frozen terminal nor widget annotation; ${detail}.`;
      active.delete(objectReference);
      return;
    }

    for (const childReference of node.childObjectReferences) {
      const child = nodeByRef.get(childReference);
      if (!child || !child.resolvedToDictionary) {
        failure = `Child ${childReference} under structural node ${objectReference} did not resolve; ${detail}.`;
        break;
      }
      visit(childReference, objectReference);
      if (failure) break;
    }
    active.delete(objectReference);
  };

  for (const rootReference of evidence.rawRootObjectReferences) {
    visit(rootReference, null);
    if (failure) return { status: 'BLOCKED', detail: failure };
  }

  if (emitted.size !== LASC_CIV_312_TERMINAL_INPUT_COUNT) {
    const missing = EXPECTED_TERMINAL_REFS.filter(ref => !emitted.has(ref));
    return {
      status: 'BLOCKED',
      detail: `Hierarchy did not prove exactly ${LASC_CIV_312_TERMINAL_INPUT_COUNT} frozen terminals; observed=${emitted.size};missing=${JSON.stringify(missing)}; ${detail}.`,
    };
  }
  if (EXPECTED_TERMINAL_REFS.some(ref => !emitted.has(ref))) {
    return { status: 'BLOCKED', detail: `Frozen terminal ref set incomplete after traversal; ${detail}.` };
  }

  const normalized = LASC_CIV_312_TERMINAL_FIELDS.map(expected => {
    const observed = terminalFields.find(field => field.objectReference === expected.objectReference)!;
    return { fieldId: observed.fieldId, fieldType: observed.fieldType, objectReference: observed.objectReference };
  });
  return {
    status: 'VALID',
    rawRootObjectReferences: [...evidence.rawRootObjectReferences],
    terminalFields: normalized,
  };
}

export const validateLascCiv312RootAnchoredTopologyEvidence = validateLascCiv312HierarchyEvidence;

function buildLascCiv312HierarchyEvidenceReadOnly(
  document: PDFDocument,
  acroForm: PDFDict,
):
  | { status: 'VALID'; evidence: LascCiv312HierarchyEvidence }
  | { status: 'BLOCKED'; detail: string } {
  const fieldsRaw = acroForm.get(PDFName.of('Fields'));
  if (fieldsRaw === undefined) return { status: 'BLOCKED', detail: 'Existing AcroForm has no raw /Fields entry.' };
  const fields = document.context.lookup(fieldsRaw);
  if (!(fields instanceof PDFArray)) return { status: 'BLOCKED', detail: 'Raw AcroForm /Fields did not resolve to a PDF array.' };

  const rawRootObjectReferences: string[] = [];
  const queue: PDFRef[] = [];
  for (let index = 0; index < fields.size(); index += 1) {
    const rawRoot = fields.get(index);
    if (!(rawRoot instanceof PDFRef)) {
      return { status: 'BLOCKED', detail: `Raw /Fields entry ${index} is not an indirect object reference.` };
    }
    rawRootObjectReferences.push(rawRoot.toString());
    queue.push(rawRoot);
  }

  const nodes: LascCiv312HierarchyNodeEvidence[] = [];
  const inspected = new Set<string>();
  while (queue.length > 0) {
    const reference = queue.shift()!;
    const objectReference = reference.toString();
    if (inspected.has(objectReference)) continue;
    inspected.add(objectReference);

    const resolved = document.context.lookup(reference);
    if (!(resolved instanceof PDFDict)) {
      return { status: 'BLOCKED', detail: `Hierarchy ref ${objectReference} did not resolve to a dictionary.` };
    }

    const subtypeRaw = resolved.get(PDFName.of('Subtype'));
    const subtype = readName(document, subtypeRaw);
    if (!subtype.provable) {
      return { status: 'BLOCKED', detail: `Hierarchy ref ${objectReference} has an unprovable /Subtype.` };
    }
    const parent = readParentReferenceReadOnly(resolved);
    if (!parent.provable) {
      return { status: 'BLOCKED', detail: `Hierarchy ref ${objectReference} has a non-indirect /Parent.` };
    }

    const fieldIdRaw = resolved.get(PDFName.of('T'));
    const fieldId = fieldIdRaw === undefined ? null : readText(document.context.lookup(fieldIdRaw));
    if (fieldIdRaw !== undefined && fieldId === null) {
      return { status: 'BLOCKED', detail: `Hierarchy ref ${objectReference} has an unprovable /T identity.` };
    }

    const frozenTerminal = EXPECTED_TERMINAL_REF_SET.has(objectReference);
    const inheritedFieldType = frozenTerminal || subtype.value !== '/Widget'
      ? readInheritedFieldTypeReadOnly(document, reference, resolved)
      : { fieldType: null, provable: true };

    const childObjectReferences: string[] = [];
    if (frozenTerminal || subtype.value !== '/Widget') {
      const kidsRaw = resolved.get(PDFName.of('Kids'));
      if (kidsRaw !== undefined) {
        const kids = document.context.lookup(kidsRaw);
        if (!(kids instanceof PDFArray)) {
          return { status: 'BLOCKED', detail: `Hierarchy ref ${objectReference} has a non-array /Kids entry.` };
        }
        for (let index = 0; index < kids.size(); index += 1) {
          const childRaw = kids.get(index);
          if (!(childRaw instanceof PDFRef)) {
            return { status: 'BLOCKED', detail: `Hierarchy child ${index} under ${objectReference} is not an indirect ref.` };
          }
          childObjectReferences.push(childRaw.toString());
          queue.push(childRaw);
        }
      }
    }

    nodes.push({
      objectReference,
      resolvedToDictionary: true,
      subtype: subtype.value,
      parentObjectReference: parent.parentObjectReference,
      fieldId,
      fieldType: inheritedFieldType.fieldType,
      fieldTypeProvableReadOnly: inheritedFieldType.provable,
      childObjectReferences,
    });
  }

  return {
    status: 'VALID',
    evidence: { rawRootObjectReferences, nodes },
  };
}

export function inspectLascCiv312TerminalFieldsReadOnly(
  document: PDFDocument,
  acroForm: PDFDict,
): {
  rawRootObjectReferences: readonly string[];
  terminalFields: readonly LascCiv312RuntimeTerminalEvidence[];
  topologyProvableReadOnly: boolean;
  diagnostic: string;
} {
  const built = buildLascCiv312HierarchyEvidenceReadOnly(document, acroForm);
  if (built.status === 'BLOCKED') {
    return {
      rawRootObjectReferences: [],
      terminalFields: [],
      topologyProvableReadOnly: false,
      diagnostic: built.detail,
    };
  }
  const validation = validateLascCiv312HierarchyEvidence(built.evidence);
  const diagnostic = deterministicHierarchyDetail(built.evidence);
  return validation.status === 'VALID'
    ? {
        rawRootObjectReferences: validation.rawRootObjectReferences,
        terminalFields: validation.terminalFields,
        topologyProvableReadOnly: true,
        diagnostic,
      }
    : {
        rawRootObjectReferences: built.evidence.rawRootObjectReferences,
        terminalFields: [],
        topologyProvableReadOnly: false,
        diagnostic: `${diagnostic};topologyDetail=${validation.detail}`,
      };
}

function captureInspectionStructuralSnapshot(document: PDFDocument): string {
  return digest('civ312-runtime-structure', {
    indirectObjectCount: document.context.enumerateIndirectObjects().length,
    largestObjectNumber: document.context.largestObjectNumber,
    catalog: document.catalog.toString(),
    indirectObjects: document.context.enumerateIndirectObjects().map(([reference, object]) => ({
      reference: reference.toString(),
      object: object.toString(),
    })),
  });
}

export function classifyLascCiv312PdfLoadFailure(error: unknown): LascCiv312RuntimeCompatibilityBlockerCode {
  const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return name === 'EncryptedPDFError' || /encrypted|password/i.test(message)
    ? 'ENCRYPTED_OR_UNSUPPORTED_SOURCE'
    : 'PDF_LOAD_FAILED';
}

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
    const observed = fields.find(field => field.objectReference === expected.objectReference)!;
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
  const acroFormRaw = document.catalog.get(PDFName.of('AcroForm'));
  const acroFormResolved = acroFormRaw === undefined ? undefined : document.context.lookup(acroFormRaw);
  const existingAcroForm = acroFormResolved instanceof PDFDict ? acroFormResolved : null;
  const xfaPresent = existingAcroForm ? existingAcroForm.has(PDFName.of('XFA')) : null;

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

  const inspectionStructuralSnapshotBefore = captureInspectionStructuralSnapshot(document);
  const inspected = inspectLascCiv312TerminalFieldsReadOnly(document, existingAcroForm);
  const inspectionStructuralSnapshotAfter = captureInspectionStructuralSnapshot(document);
  if (inspectionStructuralSnapshotAfter !== inspectionStructuralSnapshotBefore) {
    return blocked('INSPECTION_MUTATION_OBSERVED', 'Read-only inspection changed the observed PDF structure.');
  }

  const sourceSha256AfterInspection = sha256(sourceBytes);
  if (sourceSha256AfterInspection !== sourceSha256BeforeInspection) {
    return blocked('SOURCE_IDENTITY_CHANGED_AFTER_INSPECTION', 'Source bytes changed during read-only inspection.');
  }

  if (!inspected.topologyProvableReadOnly) {
    return blocked('TOPOLOGY_NOT_PROVABLE_READ_ONLY', `Exact frozen-ref hierarchy was not provable read-only. ${inspected.diagnostic}.`);
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
  const rawFieldRootObjectReferences = [...inspected.rawRootObjectReferences];
  const compatibilitySnapshot = digest('civ312-runtime-compatibility', {
    schemaVersion: LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
    profileSnapshot: LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT,
    sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
    pdfLibVersion: LASC_CIV_312_PDF_LIB_VERSION,
    loadProfile: LASC_CIV_312_PDF_LIB_LOAD_PROFILE,
    topologyProofMode: LASC_CIV_312_TOPOLOGY_PROOF_MODE,
    sourceSha256BeforeInspection,
    sourceSha256AfterInspection,
    sourceByteLength: sourceBytes.byteLength,
    pageCount,
    acroFormPresent: true,
    xfaPresent: false,
    rawFieldRootObjectReferences,
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
    topologyProofMode: LASC_CIV_312_TOPOLOGY_PROOF_MODE,
    sourceSha256BeforeInspection,
    sourceSha256AfterInspection,
    sourceByteLength: LASC_CIV_312_SOURCE_BYTE_LENGTH,
    pageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
    acroFormPresent: true,
    xfaPresent: false,
    rawFieldRootCount: rawFieldRootObjectReferences.length,
    rawFieldRootObjectReferences,
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
