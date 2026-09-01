import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
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
  LASC_CIV_312_TOPOLOGY_PROOF_MODE,
  classifyLascCiv312PdfLoadFailure,
  computeLascCiv312RuntimeCompatibilityProfileSnapshot,
  evaluateLascCiv312PreparationRuntimeCompatibility,
  validateLascCiv312HierarchyEvidence,
  validateLascCiv312RuntimeInspectionEvidence,
  type LascCiv312HierarchyEvidence,
  type LascCiv312HierarchyNodeEvidence,
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

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

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

function synthetic18RootHierarchy(): LascCiv312HierarchyEvidence {
  const structuralRefs = ['900 0 R', '901 0 R', '902 0 R', '903 0 R'];
  const nestedTerminalGroups = [
    LASC_CIV_312_TERMINAL_FIELDS.slice(0, 2),
    LASC_CIV_312_TERMINAL_FIELDS.slice(2, 4),
    LASC_CIV_312_TERMINAL_FIELDS.slice(4, 6),
    LASC_CIV_312_TERMINAL_FIELDS.slice(6, 8),
  ];
  const parentByTerminalRef = new Map<string, string>();
  nestedTerminalGroups.forEach((group, index) => {
    group.forEach(field => parentByTerminalRef.set(field.objectReference, structuralRefs[index]));
  });

  const terminalNodes: LascCiv312HierarchyNodeEvidence[] = LASC_CIV_312_TERMINAL_FIELDS.map(field => ({
    objectReference: field.objectReference,
    resolvedToDictionary: true,
    subtype: null,
    parentObjectReference: parentByTerminalRef.get(field.objectReference) ?? null,
    fieldId: field.fieldId,
    fieldType: field.fieldType,
    fieldTypeProvableReadOnly: true,
    childObjectReferences: [],
  }));
  const structuralNodes: LascCiv312HierarchyNodeEvidence[] = structuralRefs.map((objectReference, index) => ({
    objectReference,
    resolvedToDictionary: true,
    subtype: null,
    parentObjectReference: null,
    fieldId: `structural-${index}`,
    fieldType: '/Tx',
    fieldTypeProvableReadOnly: true,
    childObjectReferences: nestedTerminalGroups[index].map(field => field.objectReference),
  }));
  return {
    rawRootObjectReferences: [
      ...structuralRefs,
      ...LASC_CIV_312_TERMINAL_FIELDS.slice(8).map(field => field.objectReference),
    ],
    nodes: [...structuralNodes, ...terminalNodes],
  };
}

function cloneHierarchy(evidence: LascCiv312HierarchyEvidence): {
  rawRootObjectReferences: string[];
  nodes: LascCiv312HierarchyNodeEvidence[];
} {
  return {
    rawRootObjectReferences: [...evidence.rawRootObjectReferences],
    nodes: evidence.nodes.map(node => ({ ...node, childObjectReferences: [...node.childObjectReferences] })),
  };
}

function replaceNode(
  evidence: LascCiv312HierarchyEvidence,
  objectReference: string,
  replacement: Partial<LascCiv312HierarchyNodeEvidence>,
): LascCiv312HierarchyEvidence {
  return {
    rawRootObjectReferences: [...evidence.rawRootObjectReferences],
    nodes: evidence.nodes.map(node => node.objectReference === objectReference
      ? { ...node, ...replacement, childObjectReferences: replacement.childObjectReferences ?? node.childObjectReferences }
      : { ...node, childObjectReferences: [...node.childObjectReferences] }),
  };
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
equal(LASC_CIV_312_TOPOLOGY_PROOF_MODE, 'LOW_LEVEL_EXACT_FROZEN_REF_HIERARCHY', 'low-level exact-ref proof mode explicit');

// Generic semantic validation remains fail closed.
equal(validateLascCiv312RuntimeInspectionEvidence(exactEvidence()).status, 'VALID', 'exact frozen topology validates');
const pageMismatch = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), pageCount: 2 });
equal(pageMismatch.status === 'BLOCKED' ? pageMismatch.blockerCode : '', 'PAGE_COUNT_MISMATCH', 'wrong page count blocks');
const noAcro = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), acroFormPresent: false });
equal(noAcro.status === 'BLOCKED' ? noAcro.blockerCode : '', 'ACROFORM_MISSING', 'missing existing AcroForm blocks');
const withXfa = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), xfaPresent: true });
equal(withXfa.status === 'BLOCKED' ? withXfa.blockerCode : '', 'XFA_PRESENT_REQUIRES_ARCHITECTURE', 'XFA causes architecture stop');
const tooFew = validateLascCiv312RuntimeInspectionEvidence({ ...exactEvidence(), terminalFields: exactEvidence().terminalFields.slice(0, -1) });
equal(tooFew.status === 'BLOCKED' ? tooFew.blockerCode : '', 'TERMINAL_FIELD_COUNT_MISMATCH', 'terminal count mismatch blocks');
const wrongType = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'check box', { fieldType: '/Tx' }));
equal(wrongType.status === 'BLOCKED' ? wrongType.blockerCode : '', 'TERMINAL_FIELD_TYPE_MISMATCH', 'wrong terminal type blocks');
const wrongRef = validateLascCiv312RuntimeInspectionEvidence(replaceField(exactEvidence(), 'Signature', { objectReference: '999 0 R' }));
equal(wrongRef.status === 'BLOCKED' ? wrongRef.blockerCode : '', 'TOPOLOGY_OBJECT_REFERENCE_MISMATCH', 'wrong terminal ref blocks');

// Hierarchy-aware exact-ref traversal: 18 raw roots deterministically resolve to 22 frozen terminals.
const hierarchy = synthetic18RootHierarchy();
equal(hierarchy.rawRootObjectReferences.length, 18, 'synthetic hierarchy has exactly 18 raw roots');
const hierarchyValidation = validateLascCiv312HierarchyEvidence(hierarchy);
equal(hierarchyValidation.status, 'VALID', '18-root hierarchy resolves to exact frozen 22 terminals');
if (hierarchyValidation.status === 'VALID') {
  equal(hierarchyValidation.terminalFields.length, 22, 'nested terminals still yield exactly 22');
  deepEqual(hierarchyValidation.terminalFields.map(field => field.objectReference), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.objectReference), 'terminal refs normalized to frozen order');
}

const structuralRef = '900 0 R';
const structuralFieldLike = replaceNode(hierarchy, structuralRef, { fieldId: 'STRUCTURAL FIELD KEY', fieldType: '/Btn' });
const structuralFieldLikeValidation = validateLascCiv312HierarchyEvidence(structuralFieldLike);
equal(structuralFieldLikeValidation.status, 'VALID', 'non-terminal ancestor field keys do not promote it to terminal');
if (structuralFieldLikeValidation.status === 'VALID') equal(structuralFieldLikeValidation.terminalFields.length, 22, 'structural ancestor never increments terminal count');

const nestedFrozenRef = LASC_CIV_312_TERMINAL_FIELDS[0].objectReference;
ok(!hierarchy.rawRootObjectReferences.includes(nestedFrozenRef), 'chosen frozen terminal is nested rather than top-level');
if (hierarchyValidation.status === 'VALID') ok(hierarchyValidation.terminalFields.some(field => field.objectReference === nestedFrozenRef), 'nested frozen terminal is emitted');

const mergedRef = LASC_CIV_312_TERMINAL_FIELDS[8].objectReference;
const mergedTerminalWidget = replaceNode(hierarchy, mergedRef, { subtype: '/Widget' });
const mergedValidation = validateLascCiv312HierarchyEvidence(mergedTerminalWidget);
equal(mergedValidation.status, 'VALID', 'frozen merged terminal/widget dictionary remains terminal by exact-ref priority');
if (mergedValidation.status === 'VALID') equal(mergedValidation.terminalFields.filter(field => field.objectReference === mergedRef).length, 1, 'merged frozen terminal counted once');

const widgetOwnerRef = LASC_CIV_312_TERMINAL_FIELDS[9].objectReference;
const widgetRef = '990 0 R';
const withWidget = cloneHierarchy(hierarchy);
withWidget.nodes = withWidget.nodes.map(node => node.objectReference === widgetOwnerRef
  ? { ...node, childObjectReferences: [...node.childObjectReferences, widgetRef] }
  : node);
withWidget.nodes.push({
  objectReference: widgetRef,
  resolvedToDictionary: true,
  subtype: '/Widget',
  parentObjectReference: widgetOwnerRef,
  fieldId: 'MISLEADING WIDGET /T',
  fieldType: '/Btn',
  fieldTypeProvableReadOnly: true,
  childObjectReferences: [],
});
const widgetValidation = validateLascCiv312HierarchyEvidence(withWidget);
equal(widgetValidation.status, 'VALID', 'non-frozen widget child remains topology evidence only even with /T and /FT');
if (widgetValidation.status === 'VALID') equal(widgetValidation.terminalFields.length, 22, 'widget child does not increment terminal count');

const missing = cloneHierarchy(hierarchy);
missing.nodes = missing.nodes.map(node => node.objectReference === structuralRef
  ? { ...node, childObjectReferences: node.childObjectReferences.slice(1) }
  : node);
equal(validateLascCiv312HierarchyEvidence(missing).status, 'BLOCKED', 'missing frozen terminal ref blocks');

const duplicateReachability = cloneHierarchy(hierarchy);
duplicateReachability.rawRootObjectReferences.push(nestedFrozenRef);
equal(validateLascCiv312HierarchyEvidence(duplicateReachability).status, 'BLOCKED', 'duplicate frozen terminal reachability blocks');

const ambiguousLeafRef = '991 0 R';
const extraAmbiguous = cloneHierarchy(hierarchy);
extraAmbiguous.nodes = extraAmbiguous.nodes.map(node => node.objectReference === structuralRef
  ? { ...node, childObjectReferences: [...node.childObjectReferences, ambiguousLeafRef] }
  : node);
extraAmbiguous.nodes.push({
  objectReference: ambiguousLeafRef,
  resolvedToDictionary: true,
  subtype: null,
  parentObjectReference: structuralRef,
  fieldId: 'AMBIGUOUS',
  fieldType: '/Tx',
  fieldTypeProvableReadOnly: true,
  childObjectReferences: [],
});
equal(validateLascCiv312HierarchyEvidence(extraAmbiguous).status, 'BLOCKED', 'extra ambiguous reachable leaf blocks');

const wrongParent = replaceNode(hierarchy, nestedFrozenRef, { parentObjectReference: null });
equal(validateLascCiv312HierarchyEvidence(wrongParent).status, 'BLOCKED', 'wrong parent relationship blocks');

const unresolvedChild = cloneHierarchy(hierarchy);
unresolvedChild.nodes = unresolvedChild.nodes.map(node => node.objectReference === structuralRef
  ? { ...node, childObjectReferences: [...node.childObjectReferences, '992 0 R'] }
  : node);
equal(validateLascCiv312HierarchyEvidence(unresolvedChild).status, 'BLOCKED', 'unresolved child ref blocks');

const cycle: LascCiv312HierarchyEvidence = {
  rawRootObjectReferences: ['993 0 R'],
  nodes: [
    {
      objectReference: '993 0 R', resolvedToDictionary: true, subtype: null, parentObjectReference: null,
      fieldId: null, fieldType: null, fieldTypeProvableReadOnly: true, childObjectReferences: ['994 0 R'],
    },
    {
      objectReference: '994 0 R', resolvedToDictionary: true, subtype: null, parentObjectReference: '993 0 R',
      fieldId: null, fieldType: null, fieldTypeProvableReadOnly: true, childObjectReferences: ['993 0 R'],
    },
  ],
};
equal(validateLascCiv312HierarchyEvidence(cycle).status, 'BLOCKED', 'cycle blocks');

// Load-failure classification and prohibited API surface.
equal(classifyLascCiv312PdfLoadFailure(Object.assign(new Error('synthetic encrypted PDF'), { name: 'EncryptedPDFError' })), 'ENCRYPTED_OR_UNSUPPORTED_SOURCE', 'encrypted source classifier frozen');
equal(classifyLascCiv312PdfLoadFailure(new Error('synthetic parser failure')), 'PDF_LOAD_FAILED', 'ordinary load failure classifier frozen');
const implementationSource = readFileSync(join(process.cwd(), 'lib/flow/lascCiv312PreparationRuntimeCompatibility.ts'), 'utf8');
const forbiddenCalls = [
  '.getForm(', '.getAcroForm(', '.getOrCreateAcroForm(', '.getAllFields(', '.getFields(', '.Fields(',
  '.deleteXFA(', '.save(', '.setText(', '.check(', '.uncheck(', '.select(', '.updateFieldAppearances(', '.flatten(',
];
for (const token of forbiddenCalls) equal(implementationSource.includes(token), false, `forbidden source-inspection API absent: ${token}`);
equal(implementationSource.includes('node:child_process'), false, 'no child-process/native tool invocation');
equal(implementationSource.toLowerCase().includes('q' + 'pdf'), false, 'no qpdf invocation or dependency');
equal(implementationSource.includes('console.'), false, 'no implementation diagnostic console output');

// Exact registered source is evaluated through the bounded low-level hierarchy path.
const sourceBytes = new Uint8Array(readFileSync(OFFICIAL_SOURCE_PATH));
equal(sourceBytes.byteLength, 741498, 'registered source byte length exact before evaluator');
const sourceHashBefore = sha256(sourceBytes);
equal(sourceHashBefore, LASC_CIV_312_SOURCE_SHA256, 'registered source hash exact before evaluator');
const exactResult = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes,
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
const sourceHashAfter = sha256(sourceBytes);
equal(sourceHashAfter, sourceHashBefore, 'source bytes unchanged after evaluator');
ok(
  exactResult.status === 'DIRECT_RUNTIME_COMPATIBLE'
    || (exactResult.status === 'BLOCKED_FOR_DIRECT_RUNTIME' && exactResult.blockerCode === 'TOPOLOGY_NOT_PROVABLE_READ_ONLY'),
  'exact source either proves exact-ref compatibility or truthfully fails closed on topology proof',
);
if (exactResult.status === 'DIRECT_RUNTIME_COMPATIBLE') {
  equal(exactResult.topologyProofMode, LASC_CIV_312_TOPOLOGY_PROOF_MODE, 'exact source uses bounded low-level proof mode');
  equal(exactResult.sourceSha256BeforeInspection, LASC_CIV_312_SOURCE_SHA256, 'source SHA before inspection exact');
  equal(exactResult.sourceSha256AfterInspection, LASC_CIV_312_SOURCE_SHA256, 'source SHA after inspection exact');
  equal(exactResult.rawFieldRootCount, 18, 'exact registered source exposes 18 raw /Fields roots');
  equal(exactResult.rawFieldRootObjectReferences.length, 18, 'exact result records all 18 raw root refs');
  equal(exactResult.terminalFieldCount, 22, 'exact source proves 22 frozen terminals');
  equal(exactResult.terminalFields.length, 22, 'exact result contains 22 terminals');
  deepEqual(exactResult.terminalFields.map(field => field.fieldId), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldId), 'exact IDs preserve frozen order');
  deepEqual(exactResult.terminalFields.map(field => field.fieldType), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldType), 'exact /FT values preserve frozen map');
  deepEqual(exactResult.terminalFields.map(field => field.objectReference), LASC_CIV_312_TERMINAL_FIELDS.map(field => field.objectReference), 'exact refs preserve frozen map');
  equal(exactResult.inspectionStructuralSnapshotAfter, exactResult.inspectionStructuralSnapshotBefore, 'inspection structure unchanged');
  equal(exactResult.inspectionMutationObserved, false, 'no inspection mutation observed');
  equal(exactResult.sourceIdentityUnchangedAfterInspection, true, 'source identity unchanged flag exact');
  equal(containsByteCarrier(exactResult), false, 'compatibility result returns no PDF/document bytes');
} else {
  equal(exactResult.blockerCode, 'TOPOLOGY_NOT_PROVABLE_READ_ONLY', 'truthful exact-source blocker remains topology-only');
}

const sameLengthMutation = new Uint8Array(sourceBytes); sameLengthMutation[0] ^= 0x01;
const mutated = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes: sameLengthMutation,
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(mutated.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? mutated.blockerCode : '', 'SOURCE_HASH_MISMATCH', 'one-byte same-length mutation blocks before parse');
const shorter = await evaluateLascCiv312PreparationRuntimeCompatibility({
  sourceBytes: sourceBytes.slice(0, sourceBytes.length - 1),
  sourceIdentity: LASC_CIV_312_RUNTIME_COMPATIBILITY_SOURCE_IDENTITY,
});
equal(shorter.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? shorter.blockerCode : '', 'SOURCE_BYTE_LENGTH_MISMATCH', 'byte-length mismatch blocks before parse');
const malformed = await evaluateLascCiv312PreparationRuntimeCompatibility(null);
equal(malformed.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? malformed.blockerCode : '', 'MALFORMED_RUNTIME_COMPATIBILITY_INPUT', 'malformed input fails closed');

// Authority remains held regardless of compatibility disposition.
deepEqual(exactResult.governance, LASC_CIV_312_RUNTIME_COMPATIBILITY_GOVERNANCE, 'returned governance equals frozen posture');
equal(exactResult.governance.documentGeneration, 'NOT_PERFORMED', 'document generation not performed');
equal(exactResult.governance.pdfMutation, 'NOT_PERFORMED', 'PDF mutation not performed');
equal(exactResult.governance.preparationRuntimeDerivative, 'NOT_CREATED', 'preparation runtime derivative not created');
equal(exactResult.governance.persistence, 'NO', 'persistence no');
equal(exactResult.governance.databaseWrite, 'NO', 'database write no');
equal(exactResult.governance.checkpoint1, 'HELD', 'checkpoint 1 held');
equal(exactResult.governance.filing, 'NO', 'filing no');
equal(exactResult.governance.signing, 'NO', 'signing no');
equal(exactResult.governance.serviceExecution, 'NO', 'service execution no');
equal(exactResult.governance.courtSubmission, 'NO', 'court submission no');
equal(exactResult.governance.stageF, 'HELD', 'Stage F held');
equal(exactResult.governance.newProductionAuthority, 'NO', 'Production authority no');

console.log(`lascCiv312PreparationRuntimeCompatibility: ${passed} assertions passed; exactSource=${exactResult.status}${exactResult.status === 'BLOCKED_FOR_DIRECT_RUNTIME' ? `:${exactResult.blockerCode}` : `;rawRoots=${exactResult.rawFieldRootCount};terminals=${exactResult.terminalFieldCount}`}`);
