import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import {
  LASC_CIV_312_PDF_LIB_LOAD_PROFILE,
  LASC_CIV_312_PDF_LIB_VERSION,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION,
  LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
  LASC_CIV_312_SOURCE_BYTE_LENGTH,
  classifyLascCiv312PdfLoadFailure,
  computeLascCiv312RuntimeCompatibilityProfileSnapshot,
  evaluateLascCiv312PreparationRuntimeCompatibility,
  inspectLascCiv312TerminalFieldsReadOnly,
  validateLascCiv312RootAnchoredTopologyEvidence,
  validateLascCiv312RuntimeInspectionEvidence,
  type LascCiv312RootFieldTopologyEvidence,
  type LascCiv312RuntimeInspectionEvidence,
  type LascCiv312RuntimeTerminalEvidence,
} from './lascCiv312PreparationRuntimeCompatibility';

let passed = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const deepEqual = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); passed += 1; };

const OFFICIAL_SOURCE_PATH = join(
  process.cwd(),
  'docs/legal/official-forms/los-angeles/superior-court/CIV312/2025-10/CIV312.pdf',
);

function exactEvidence(): LascCiv312RuntimeInspectionEvidence {
  return {
    pageCount: 1,
    acroFormPresent: true,
    xfaPresent: false,
    terminalFields: LASC_CIV_312_TERMINAL_FIELDS.map(field => ({
      fieldId: field.fieldId,
      fieldType: field.fieldType,
      objectReference: field.objectReference,
    })),
    topologyProvableReadOnly: true,
  };
}

function replaceField(
  evidence: LascCiv312RuntimeInspectionEvidence,
  fieldId: string,
  replacement: Partial<LascCiv312RuntimeTerminalEvidence>,
): LascCiv312RuntimeInspectionEvidence {
  return {
    ...evidence,
    terminalFields: evidence.terminalFields.map(field => field.fieldId === fieldId ? { ...field, ...replacement } : field),
  };
}

function exactRootTopology(): LascCiv312RootFieldTopologyEvidence[] {
  return LASC_CIV_312_TERMINAL_FIELDS.map(field => ({
    resolvedToDictionary: true,
    fieldTypeProvableReadOnly: true,
    fieldId: field.fieldId,
    fieldType: field.fieldType,
    objectReference: field.objectReference,
    children: [],
  }));
}

function replaceRoot(
  roots: readonly LascCiv312RootFieldTopologyEvidence[],
  objectReference: string,
  replacement: Partial<LascCiv312RootFieldTopologyEvidence>,
): LascCiv312RootFieldTopologyEvidence[] {
  return roots.map(root => root.objectReference === objectReference ? { ...root, ...replacement } : root);
}

function containsByteCarrier(value: unknown, seen = new Set<unknown>()): boolean {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return true;
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsByteCarrier(item, seen));
  return Object.values(value as Record<string, unknown>).some(item => containsByteCarrier(item, seen));
}

// Frozen contract / source identity.
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SCHEMA_VERSION, '2026-09-01.r1', 'schema version frozen');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_ID, 'lasc-civ312-preparation-runtime-compatibility-v1', 'profile id frozen');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_VERSION, '2026-09-01.r1', 'profile version frozen');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT, 'sha256:31184c662ccc00e0d4f65aada6b89bd29d6ff48d1e05592f97adb007c8c88337', 'profile snapshot frozen');
equal(computeLascCiv312RuntimeCompatibilityProfileSnapshot(), LASC_CIV_312_RUNTIME_COMPATIBILITY_PROFILE_SNAPSHOT, 'profile snapshot deterministic');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.formId, LASC_CIV_312_FORM_ID, 'form id bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.formRevision, LASC_CIV_312_FORM_REVISION, 'form revision bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.sourceSha256, LASC_CIV_312_SOURCE_SHA256, 'source hash bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.sourceByteLength, 741498, 'source byte length bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.expectedPageCount, LASC_CIV_312_EXPECTED_PAGE_COUNT, 'one page bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.expectedTerminalFieldCount, LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT, '22 terminals bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.fieldMapId, LASC_CIV_312_FIELD_MAP_ID, 'field map id bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.fieldMapVersion, LASC_CIV_312_FIELD_MAP_VERSION, 'field map version bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.fieldMapSnapshot, LASC_CIV_312_FIELD_MAP_SNAPSHOT, 'field map snapshot bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generationBindingProfileId, LASC_CIV_312_GENERATION_BINDING_PROFILE_ID, 'binding id bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generationBindingProfileVersion, LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION, 'binding version bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generationBindingProfileSnapshot, LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT, 'binding snapshot bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generatedDraftAdmissionSchemaVersion, OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION, 'admission schema bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generatedDraftAdmissionProfileId, LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID, 'admission profile id bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generatedDraftAdmissionProfileVersion, LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION, 'admission profile version bound');
equal(LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY.generatedDraftAdmissionProfileSnapshot, LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT, 'admission profile snapshot bound');
equal(LASC_CIV_312_SOURCE_BYTE_LENGTH, 741498, 'source byte length constant frozen');
equal(LASC_CIV_312_TERMINAL_INPUT_COUNT, 22, 'field-map terminal count remains 22');
equal(LASC_CIV_312_PDF_LIB_VERSION, '1.17.1', 'pdf-lib runtime pinned');
deepEqual(LASC_CIV_312_PDF_LIB_LOAD_PROFILE, { updateMetadata: false, ignoreEncryption: false }, 'load profile has no metadata update or encryption bypass');

// Generic semantic validation remains fail closed.
equal(validateLascCiv312RuntimeInspectionEvidence(exactEvidence()).status, 'VALID', 'exact frozen topology validates');
const pageMismatch = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), pageCount: 2 });
equal(pageMismatch.status === 'BLOCKED' ? pageMismatch.blockerCode : '', 'PAGE_COUNT_MISMATCH', 'wrong page count blocks');
const noAcro = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), acroFormPresent: false });
equal(noAcro.status === 'BLOCKED' ? noAcro.blockerCode : '', 'ACROFORM_MISSING', 'missing existing AcroForm blocks');
const withXfa = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), xfaPresent: true });
equal(withXfa.status === 'BLOCKED' ? withXfa.blockerCode : '', 'XFA_PRESENT_REQUIRES_ARCHITECTURE', 'XFA causes architecture stop');
const unknownXfa = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), xfaPresent: null });
equal(unknownXfa.status === 'BLOCKED' ? unknownXfa.blockerCode : '', 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', 'unproven XFA state fails closed');
const tooFew = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), terminalFields: exactEvidence().terminalFields.slice(0, -1) });
equal(tooFew.status === 'BLOCKED' ? tooFew.blockerCode : '', 'TERMINAL_FIELD_COUNT_MISMATCH', 'terminal count mismatch blocks');
const duplicateFields = [...exactEvidence().terminalFields]; duplicateFields[21] = duplicateFields[0];
const duplicate = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), terminalFields: duplicateFields });
equal(duplicate.status === 'BLOCKED' ? duplicate.blockerCode : '', 'DUPLICATE_TERMINAL_FIELD', 'duplicate terminal identity blocks');
const unexpectedFields = [...exactEvidence().terminalFields]; unexpectedFields[21] = { ...unexpectedFields[21], fieldId: 'UNEXPECTED SYNTHETIC FIELD' };
const unexpected = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), terminalFields: unexpectedFields });
equal(unexpected.status, 'BLOCKED', 'unexpected field blocks');
const omittedFields = exactEvidence().terminalFields.filter(field => field.fieldId !== 'Signature');
const omitted = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), terminalFields: omittedFields });
equal(omitted.status, 'BLOCKED', 'omitted expected field blocks');
const wrongName = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'Signature', { fieldId: 'Wrong Signature' }));
equal(wrongName.status, 'BLOCKED', 'root /T mismatch blocks');
const wrongType = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'check box', { fieldType: '/Tx' }));
equal(wrongType.status === 'BLOCKED' ? wrongType.blockerCode : '', 'TERMINAL_FIELD_TYPE_MISMATCH', 'root /FT mismatch blocks');
const noRef = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'Signature', { objectReference: null }));
equal(noRef.status === 'BLOCKED' ? noRef.blockerCode : '', 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', 'missing object reference fails closed');
const topologyUnprovable = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), topologyProvableReadOnly: false });
equal(topologyUnprovable.status === 'BLOCKED' ? topologyUnprovable.blockerCode : '', 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', 'unprovable topology fails closed');
const wrongRef = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'Signature', { objectReference: '999 0 R' }));
equal(wrongRef.status === 'BLOCKED' ? wrongRef.blockerCode : '', 'TOPOLOGY_OBJECT_REFERENCE_MISMATCH', 'root object-reference mismatch blocks');

// Exact-root topology admission: no heuristic field discovery from /Kids.
const exactRoots = exactRootTopology();
const exactRootValidation = validateLascCiv312RootAnchoredTopologyEvidence(exactRoots);
equal(exactRootValidation.status, 'VALID', 'exact 22 frozen root refs admit root-anchored topology');
if (exactRootValidation.status === 'VALID') equal(exactRootValidation.terminalFields.length, 22, 'exact root set yields 22 logical terminals');

const missingRoot = validateLascCiv312RootAnchoredTopologyEvidence(exactRoots.slice(0, -1));
equal(missingRoot.status, 'BLOCKED', 'missing top-level frozen ref blocks without filtering');
const extraRoot = validateLascCiv312RootAnchoredTopologyEvidence([
  ...exactRoots,
  { ...exactRoots[0], objectReference: '999 0 R' },
]);
equal(extraRoot.status, 'BLOCKED', 'extra top-level ref blocks without filtering');
const duplicateRoots = [...exactRoots]; duplicateRoots[21] = { ...duplicateRoots[0] };
equal(validateLascCiv312RootAnchoredTopologyEvidence(duplicateRoots).status, 'BLOCKED', 'duplicate top-level ref blocks without deduplication');
const wrongRootRef = replaceRoot(exactRoots, '142 0 R', { objectReference: '999 0 R' });
equal(validateLascCiv312RootAnchoredTopologyEvidence(wrongRootRef).status, 'BLOCKED', 'wrong top-level ref set blocks without name filtering');
const nonRefRoot = replaceRoot(exactRoots, '142 0 R', { objectReference: null });
equal(validateLascCiv312RootAnchoredTopologyEvidence(nonRefRoot).status, 'BLOCKED', 'non-reference raw root blocks');

const owningRef = '120 0 R';
const validWidgetChild = {
  resolvedToDictionary: true,
  subtype: '/Widget',
  parentObjectReference: owningRef,
  hasFieldId: false,
  hasFieldType: false,
} as const;
const rootWithWidget = replaceRoot(exactRoots, owningRef, { children: [validWidgetChild] });
const widgetValidation = validateLascCiv312RootAnchoredTopologyEvidence(rootWithWidget);
equal(widgetValidation.status, 'VALID', 'frozen terminal root plus widget kid remains one logical field');
if (widgetValidation.status === 'VALID') equal(widgetValidation.terminalFields.length, 22, 'widget kid does not increment logical-field count');

const widgetWithFieldKeys = replaceRoot(exactRoots, owningRef, {
  children: [{ ...validWidgetChild, hasFieldId: true, hasFieldType: true }],
});
const widgetFieldKeysValidation = validateLascCiv312RootAnchoredTopologyEvidence(widgetWithFieldKeys);
equal(widgetFieldKeysValidation.status, 'VALID', 'widget /T and /FT remain widget state and do not create another logical field');
if (widgetFieldKeysValidation.status === 'VALID') equal(widgetFieldKeysValidation.terminalFields.length, 22, 'field-related widget keys still preserve 22 logical roots');

const badWidgetParent = replaceRoot(exactRoots, owningRef, {
  children: [{ ...validWidgetChild, parentObjectReference: '121 0 R' }],
});
equal(validateLascCiv312RootAnchoredTopologyEvidence(badWidgetParent).status, 'BLOCKED', 'widget /Parent mismatch fails closed');
const unresolvedWidget = replaceRoot(exactRoots, owningRef, {
  children: [{ ...validWidgetChild, resolvedToDictionary: false }],
});
equal(validateLascCiv312RootAnchoredTopologyEvidence(unresolvedWidget).status, 'BLOCKED', 'unresolved /Kids child fails closed');
const nonWidgetChild = replaceRoot(exactRoots, owningRef, {
  children: [{ ...validWidgetChild, subtype: '/Tx' }],
});
equal(validateLascCiv312RootAnchoredTopologyEvidence(nonWidgetChild).status, 'BLOCKED', 'non-widget child under frozen terminal root fails closed');
const unprovableInheritedType = replaceRoot(exactRoots, owningRef, { fieldTypeProvableReadOnly: false });
equal(validateLascCiv312RootAnchoredTopologyEvidence(unprovableInheritedType).status, 'BLOCKED', 'unprovable inherited /FT fails closed');

// Raw /Fields absence/non-array must stop without creating a normalized array.
const inertDocument = {} as Parameters<typeof inspectLascCiv312TerminalFieldsReadOnly>[0];
const noFieldsAcro = { Fields: () => undefined } as unknown as Parameters<typeof inspectLascCiv312TerminalFieldsReadOnly>[1];
const noFieldsInspection = inspectLascCiv312TerminalFieldsReadOnly(inertDocument, noFieldsAcro);
equal(noFieldsInspection.topologyProvableReadOnly, false, 'missing raw /Fields fails closed without creation');
const nonArrayFieldsAcro = { Fields: () => ({}) } as unknown as Parameters<typeof inspectLascCiv312TerminalFieldsReadOnly>[1];
const nonArrayInspection = inspectLascCiv312TerminalFieldsReadOnly(inertDocument, nonArrayFieldsAcro);
equal(nonArrayInspection.topologyProvableReadOnly, false, 'non-array raw /Fields fails closed without creation');

// Load-failure classification and forbidden API surface.
equal(classifyLascCiv312PdfLoadFailure(Object.assign(new Error('synthetic encrypted PDF'), { name: 'EncryptedPDFError' })), 'ENCRYPTED_OR_UNSUPPORTED_SOURCE', 'encrypted source classifier frozen');
equal(classifyLascCiv312PdfLoadFailure(new Error('synthetic parser failure')), 'PDF_LOAD_FAILED', 'ordinary load failure classifier frozen');

const implementationPath = join(process.cwd(), 'lib/flow/lascCiv312PreparationRuntimeCompatibility.ts');
const implementationSource = readFileSync(implementationPath, 'utf8');
const forbiddenCalls = [
  '.getForm(',
  '.getOrCreateAcroForm(',
  '.getAllFields(',
  '.getFields(',
  '.deleteXFA(',
  '.save(',
  '.setText(',
  '.check(',
  '.uncheck(',
  '.select(',
  '.updateFieldAppearances(',
  '.flatten(',
];
for (const token of forbiddenCalls) equal(implementationSource.includes(token), false, `forbidden source-inspection API absent: ${token}`);
equal(implementationSource.includes('node:child_process'), false, 'no child-process/native tool invocation');
equal(implementationSource.toLowerCase().includes('q' + 'pdf'), false, 'no qpdf invocation or dependency');
equal(implementationSource.includes('console.'), false, 'temporary diagnostic console output removed from implementation');

// Exact registered source under pinned runtime is dispositive.
const sourceBytes = new Uint8Array(readFileSync(OFFICIAL_SOURCE_PATH));
equal(sourceBytes.byteLength, 741498, 'registered source byte length exact before evaluator');
const exactResult = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes,
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(exactResult.status, 'DIRECT_RUNTIME_COMPATIBLE', 'exact registered CIV 312 is direct-runtime compatible');
if (exactResult.status !== 'DIRECT_RUNTIME_COMPATIBLE') throw new Error(`${exactResult.blockerCode}:${exactResult.detail}`);
equal(exactResult.sourceSha256BeforeInspection, LASC_CIV_312_SOURCE_SHA256, 'source SHA before inspection exact');
equal(exactResult.sourceSha256AfterInspection, LASC_CIV_312_SOURCE_SHA256, 'source SHA after inspection exact');
equal(exactResult.sourceSha256AfterInspection, exactResult.sourceSha256BeforeInspection, 'source identity unchanged after inspection');
equal(exactResult.sourceByteLength, 741498, 'returned source byte length exact');
equal(exactResult.pageCount, 1, 'pinned pdf-lib observes one page');
equal(exactResult.acroFormPresent, true, 'pinned pdf-lib observes existing AcroForm');
equal(exactResult.xfaPresent, false, 'pinned pdf-lib observes XFA absent');
equal(exactResult.terminalFieldCount, 22, 'pinned pdf-lib observes 22 frozen logical roots');
equal(exactResult.terminalFields.length, 22, 'returned inventory has exactly 22 terminals');
equal(new Set(exactResult.terminalFields.map(field => field.fieldId)).size, 22, 'returned terminal IDs unique');
deepEqual(exactResult.terminalFields.map(field => field.fieldId), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldId), 'returned field IDs preserve frozen map order');
deepEqual(exactResult.terminalFields.map(field => field.fieldType), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldType), 'all Tx/Btn types match frozen map');
deepEqual(exactResult.terminalFields.map(field => field.objectReference), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.objectReference), 'all object refs match frozen root topology');
equal(exactResult.topologyProvableReadOnly, true, 'root/widget topology proven read-only');
equal(exactResult.inspectionStructuralSnapshotAfter, exactResult.inspectionStructuralSnapshotBefore, 'inspection structural snapshot unchanged');
equal(exactResult.inspectionMutationObserved, false, 'no inspection mutation observed');
equal(exactResult.sourceIdentityUnchangedAfterInspection, true, 'source identity unchanged flag exact');
equal(containsByteCarrier(exactResult), false, 'compatibility result returns no PDF/document bytes');

const repeatedResult = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes: new Uint8Array(sourceBytes),
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(repeatedResult.status, 'DIRECT_RUNTIME_COMPATIBLE', 'repeat exact-source evaluation also compatible');
if (repeatedResult.status === 'DIRECT_RUNTIME_COMPATIBLE') {
  equal(repeatedResult.compatibilitySnapshot, exactResult.compatibilitySnapshot, 'compatibility snapshot deterministic across repeated evaluation');
  equal(repeatedResult.inspectionStructuralSnapshotBefore, exactResult.inspectionStructuralSnapshotBefore, 'structural evidence deterministic across repeated evaluation');
}

const sameLengthMutation = new Uint8Array(sourceBytes); sameLengthMutation[0] ^= 0x01;
const mutated = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes: sameLengthMutation,
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(mutated.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? mutated.blockerCode : '', 'SOURCE_HASH_MISMATCH', 'one-byte same-length mutation blocks on hash before parse');
const shorter = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes: sourceBytes.slice(0, sourceBytes.length - 1),
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(shorter.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? shorter.blockerCode : '', 'SOURCE_BYTE_LENGTH_MISMATCH', 'byte-length mismatch blocks before parse');
const malformed = await evaluateLascCiv312PreparationRuntimeCompatibility(null);
equal(malformed.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? malformed.blockerCode : '', 'MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'malformed input fails closed');
const wrongIdentity = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes,
  sourceIdentity: { ...LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY, formRevision: 'synthetic-other' },
});
equal(wrongIdentity.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? wrongIdentity.blockerCode : '', 'MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'non-frozen source identity blocks');

// Authority remains held even when compatibility is proven.
equal(exactResult.governance.formApplicability, 'NOT_EVALUATED', 'form applicability not evaluated');
equal(exactResult.governance.formRequiredness, 'NOT_EVALUATED', 'form requiredness not evaluated');
equal(exactResult.governance.legalSufficiency, 'NOT_DETERMINED', 'legal sufficiency not determined');
equal(exactResult.governance.documentGeneration, 'NOT_PERFORMED', 'document generation not performed');
equal(exactResult.governance.pdfMutation, 'NOT_PERFORMED', 'PDF mutation not performed');
equal(exactResult.governance.preparationRuntimeDerivative, 'NOT_CREATED', 'preparation runtime derivative not created');
equal(exactResult.governance.sourceMutation, 'NO', 'source mutation no');
equal(exactResult.governance.persistence, 'NO', 'persistence no');
equal(exactResult.governance.databaseWrite, 'NO', 'database write no');
equal(exactResult.governance.preparationCheckpointWrite, 'NO', 'preparation checkpoint write no');
equal(exactResult.governance.ownerReviewCheckpointWrite, 'NO', 'owner review checkpoint write no');
equal(exactResult.governance.checkpoint1, 'HELD', 'checkpoint 1 held');
equal(exactResult.governance.filing, 'NO', 'filing no');
equal(exactResult.governance.signing, 'NO', 'signing no');
equal(exactResult.governance.serviceExecution, 'NO', 'service execution no');
equal(exactResult.governance.courtSubmission, 'NO', 'court submission no');
equal(exactResult.governance.stageF, 'HELD', 'Stage F held');
equal(exactResult.governance.newProductionAuthority, 'NO', 'Production authority no');
deepEqual(exactResult.governance, LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE, 'returned governance equals frozen posture');

console.log(`lascCiv312PreparationRuntimeCompatibility: ${passed} assertions passed`);
