import { createHash } from 'node:crypto';

export const LASC_CIV_312_FORM_ID = 'LASC-CIV-312' as const;
export const LASC_CIV_312_FORM_REVISION = '2025-10' as const;
export const LASC_CIV_312_SOURCE_SHA256 = 'f27059765f500b0b62b00b0a382641c80763673233fecd0d4d4a740852c9ae1f' as const;
export const LASC_CIV_312_TERMINAL_INPUT_COUNT = 22 as const;
export const LASC_CIV_312_FIELD_MAP_ID = 'lasc-civ312-field-map-foundation-v1' as const;
export const LASC_CIV_312_FIELD_MAP_VERSION = '2026-08-31.r1' as const;

export type LascCiv312FieldType = '/Tx' | '/Btn';
export type LascCiv312FieldClassification = 'WRITABLE' | 'PROTECTED_NO_WRITE';
export type LascCiv312WritableSource =
  | { kind: 'DEFENDANT_NAME_INDEX'; index: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'DEFENDANT_PHONE_INDEX'; index: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'PLAINTIFF_NAME_INDEX'; index: 0 | 1 };

export interface LascCiv312TerminalFieldEvidence {
  fieldId: string;
  fieldType: LascCiv312FieldType;
  sourcePage: 1;
  objectReference: string;
  classification: LascCiv312FieldClassification;
  writableSource?: LascCiv312WritableSource;
  noWriteReason?: string;
}

const protectedField = (
  fieldId: string,
  fieldType: LascCiv312FieldType,
  objectReference: string,
  noWriteReason: string,
): LascCiv312TerminalFieldEvidence => ({
  fieldId,
  fieldType,
  sourcePage: 1,
  objectReference,
  classification: 'PROTECTED_NO_WRITE',
  noWriteReason,
});

const writableField = (
  fieldId: string,
  objectReference: string,
  writableSource: LascCiv312WritableSource,
): LascCiv312TerminalFieldEvidence => ({
  fieldId,
  fieldType: '/Tx',
  sourcePage: 1,
  objectReference,
  classification: 'WRITABLE',
  writableSource,
});

/**
 * Exact terminal-field evidence from the authenticated 2025-10 LASC CIV 312
 * source bytes. Object references are part of the frozen topology identity.
 * No visual-label inference is used here.
 */
export const LASC_CIV_312_TERMINAL_FIELDS: readonly LascCiv312TerminalFieldEvidence[] = [
  protectedField('COURTHOUSE ADDRESS', '/Tx', '120 0 R', 'Venue/courthouse resolution remains separately governed for this slice.'),
  protectedField('PLAINTIFFS', '/Tx', '121 0 R', 'Aggregate caption serialization is not authorized by this slice.'),
  protectedField('DEFENDANTS', '/Tx', '122 0 R', 'Aggregate caption serialization is not authorized by this slice.'),
  protectedField('CASE NUMBER', '/Tx', '123 0 R', 'Pre-filing case number is court-use only and remains blank.'),
  protectedField('Date', '/Tx', '140 0 R', 'Signature-date authority is not granted.'),
  writableField('Defendant Name 1', '124 0 R', { kind: 'DEFENDANT_NAME_INDEX', index: 0 }),
  writableField('Defendant Name 2', '126 0 R', { kind: 'DEFENDANT_NAME_INDEX', index: 1 }),
  writableField('Defendant Name 3', '128 0 R', { kind: 'DEFENDANT_NAME_INDEX', index: 2 }),
  writableField('Defendant Name 4', '130 0 R', { kind: 'DEFENDANT_NAME_INDEX', index: 3 }),
  writableField('Defendant Name 5', '132 0 R', { kind: 'DEFENDANT_NAME_INDEX', index: 4 }),
  writableField('Cellular Telephone 1', '125 0 R', { kind: 'DEFENDANT_PHONE_INDEX', index: 0 }),
  writableField('Cellular Telephone 2', '127 0 R', { kind: 'DEFENDANT_PHONE_INDEX', index: 1 }),
  writableField('Cellular Telephone 3', '129 0 R', { kind: 'DEFENDANT_PHONE_INDEX', index: 2 }),
  writableField('Cellular Telephone 4', '131 0 R', { kind: 'DEFENDANT_PHONE_INDEX', index: 3 }),
  writableField('Cellular Telephone 5', '133 0 R', { kind: 'DEFENDANT_PHONE_INDEX', index: 4 }),
  protectedField('check box', '/Btn', '134 0 R', 'Aggregate unknown-number semantics are not governed; no write is permitted.'),
  writableField('Plaintiff Name 1', '136 0 R', { kind: 'PLAINTIFF_NAME_INDEX', index: 0 }),
  writableField('Plaintiff Name 2', '138 0 R', { kind: 'PLAINTIFF_NAME_INDEX', index: 1 }),
  protectedField('Cellular Telephone 6', '/Tx', '137 0 R', 'No explicitly governed canonical plaintiff-cellular fact exists.'),
  protectedField('Cellular Telephone 7', '/Tx', '139 0 R', 'No explicitly governed canonical plaintiff-cellular fact exists.'),
  protectedField('Print Name', '/Tx', '141 0 R', 'Signing identity/print-name write is not authorized.'),
  protectedField('Signature', '/Tx', '142 0 R', 'Signing authority is not granted.'),
] as const;

export interface LascCiv312SourceTopology {
  formId: string;
  revision: string;
  sourceSha256: string;
  terminalFields: readonly Pick<LascCiv312TerminalFieldEvidence, 'fieldId' | 'fieldType' | 'sourcePage' | 'objectReference'>[];
}

export const LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY: LascCiv312SourceTopology = {
  formId: LASC_CIV_312_FORM_ID,
  revision: LASC_CIV_312_FORM_REVISION,
  sourceSha256: LASC_CIV_312_SOURCE_SHA256,
  terminalFields: LASC_CIV_312_TERMINAL_FIELDS.map(({ fieldId, fieldType, sourcePage, objectReference }) => ({
    fieldId,
    fieldType,
    sourcePage,
    objectReference,
  })),
};

function canonicalFieldMapSnapshotInput() {
  return {
    fieldMapId: LASC_CIV_312_FIELD_MAP_ID,
    fieldMapVersion: LASC_CIV_312_FIELD_MAP_VERSION,
    formId: LASC_CIV_312_FORM_ID,
    revision: LASC_CIV_312_FORM_REVISION,
    sourceSha256: LASC_CIV_312_SOURCE_SHA256,
    terminalInputCount: LASC_CIV_312_TERMINAL_INPUT_COUNT,
    terminalFields: LASC_CIV_312_TERMINAL_FIELDS,
  };
}

export function computeLascCiv312FieldMapSnapshot(): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalFieldMapSnapshotInput())).digest('hex')}`;
}

export const LASC_CIV_312_FIELD_MAP_SNAPSHOT =
  'sha256:3b578aab3837a2c2968059524db1c4f4923d4829984478cb2ce0117b3e4797b9' as const;

export type LascCiv312TopologyValidation =
  | { status: 'VALID'; fieldMapSnapshot: string }
  | { status: 'BLOCKED'; reason: string };

export function validateLascCiv312SourceTopology(source: LascCiv312SourceTopology): LascCiv312TopologyValidation {
  if (computeLascCiv312FieldMapSnapshot() !== LASC_CIV_312_FIELD_MAP_SNAPSHOT) {
    return { status: 'BLOCKED', reason: 'MAP_SNAPSHOT_MISMATCH' };
  }
  if (source.formId !== LASC_CIV_312_FORM_ID) return { status: 'BLOCKED', reason: 'FORM_ID_MISMATCH' };
  if (source.revision !== LASC_CIV_312_FORM_REVISION) return { status: 'BLOCKED', reason: 'SOURCE_REVISION_MISMATCH' };
  if (source.sourceSha256 !== LASC_CIV_312_SOURCE_SHA256) return { status: 'BLOCKED', reason: 'SOURCE_HASH_MISMATCH' };
  if (source.terminalFields.length !== LASC_CIV_312_TERMINAL_INPUT_COUNT) return { status: 'BLOCKED', reason: 'TERMINAL_INPUT_COUNT_MISMATCH' };

  const suppliedIds = source.terminalFields.map(field => field.fieldId);
  if (new Set(suppliedIds).size !== suppliedIds.length) return { status: 'BLOCKED', reason: 'DUPLICATE_FIELD' };

  const expectedIds = new Set(LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldId));
  if (suppliedIds.some(fieldId => !expectedIds.has(fieldId))) return { status: 'BLOCKED', reason: 'UNEXPECTED_FIELD' };

  for (const expected of LASC_CIV_312_TERMINAL_FIELDS) {
    const supplied = source.terminalFields.find(field => field.fieldId === expected.fieldId);
    if (!supplied) return { status: 'BLOCKED', reason: `MISSING_FIELD:${expected.fieldId}` };
    if (supplied.fieldType !== expected.fieldType
      || supplied.sourcePage !== expected.sourcePage
      || supplied.objectReference !== expected.objectReference) {
      return { status: 'BLOCKED', reason: `TOPOLOGY_DRIFT:${expected.fieldId}` };
    }
  }

  const writable = LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.classification === 'WRITABLE');
  if (new Set(writable.map(field => field.fieldId)).size !== writable.length) return { status: 'BLOCKED', reason: 'DUPLICATE_WRITABLE_DESTINATION' };
  if (LASC_CIV_312_TERMINAL_FIELDS.some(field => field.classification !== 'WRITABLE' && field.classification !== 'PROTECTED_NO_WRITE')) {
    return { status: 'BLOCKED', reason: 'UNCLASSIFIED_FIELD' };
  }
  return { status: 'VALID', fieldMapSnapshot: LASC_CIV_312_FIELD_MAP_SNAPSHOT };
}
