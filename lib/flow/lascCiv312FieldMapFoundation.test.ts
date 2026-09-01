import { strict as assert } from 'node:assert';
import {
  LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  LASC_CIV_312_FIELD_MAP_ID,
  LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  LASC_CIV_312_FIELD_MAP_VERSION,
  LASC_CIV_312_FORM_ID,
  LASC_CIV_312_FORM_REVISION,
  LASC_CIV_312_SOURCE_SHA256,
  LASC_CIV_312_TERMINAL_FIELDS,
  LASC_CIV_312_TERMINAL_INPUT_COUNT,
  computeLascCiv312FieldMapSnapshot,
  validateLascCiv312SourceTopology,
} from './lascCiv312FieldMapFoundation';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const deepEqual = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const exactExpectedTopology = [
  ['COURTHOUSE ADDRESS', '/Tx', 1, '120 0 R'],
  ['PLAINTIFFS', '/Tx', 1, '121 0 R'],
  ['DEFENDANTS', '/Tx', 1, '122 0 R'],
  ['CASE NUMBER', '/Tx', 1, '123 0 R'],
  ['Date', '/Tx', 1, '140 0 R'],
  ['Defendant Name 1', '/Tx', 1, '124 0 R'],
  ['Defendant Name 2', '/Tx', 1, '126 0 R'],
  ['Defendant Name 3', '/Tx', 1, '128 0 R'],
  ['Defendant Name 4', '/Tx', 1, '130 0 R'],
  ['Defendant Name 5', '/Tx', 1, '132 0 R'],
  ['Cellular Telephone 1', '/Tx', 1, '125 0 R'],
  ['Cellular Telephone 2', '/Tx', 1, '127 0 R'],
  ['Cellular Telephone 3', '/Tx', 1, '129 0 R'],
  ['Cellular Telephone 4', '/Tx', 1, '131 0 R'],
  ['Cellular Telephone 5', '/Tx', 1, '133 0 R'],
  ['check box', '/Btn', 1, '134 0 R'],
  ['Plaintiff Name 1', '/Tx', 1, '136 0 R'],
  ['Plaintiff Name 2', '/Tx', 1, '138 0 R'],
  ['Cellular Telephone 6', '/Tx', 1, '137 0 R'],
  ['Cellular Telephone 7', '/Tx', 1, '139 0 R'],
  ['Print Name', '/Tx', 1, '141 0 R'],
  ['Signature', '/Tx', 1, '142 0 R'],
] as const;

equal(LASC_CIV_312_FORM_ID, 'LASC-CIV-312', 'exact form id is frozen');
equal(LASC_CIV_312_FORM_REVISION, '2025-10', 'exact source revision is frozen');
equal(LASC_CIV_312_SOURCE_SHA256, 'f27059765f500b0b62b00b0a382641c80763673233fecd0d4d4a740852c9ae1f', 'exact source hash is frozen');
equal(LASC_CIV_312_TERMINAL_INPUT_COUNT, 22, 'exact terminal-input count is frozen');
equal(LASC_CIV_312_TERMINAL_FIELDS.length, 22, 'all 22 terminal inputs are explicitly classified');
equal(LASC_CIV_312_FIELD_MAP_ID, 'lasc-civ312-field-map-foundation-v1', 'field-map id is deterministic');
equal(LASC_CIV_312_FIELD_MAP_VERSION, '2026-08-31.r1', 'field-map version is deterministic');
equal(LASC_CIV_312_FIELD_MAP_SNAPSHOT, 'sha256:3b578aab3837a2c2968059524db1c4f4923d4829984478cb2ce0117b3e4797b9', 'field-map snapshot is frozen');
equal(computeLascCiv312FieldMapSnapshot(), LASC_CIV_312_FIELD_MAP_SNAPSHOT, 'field-map snapshot is deterministic');
ok(/^sha256:[0-9a-f]{64}$/.test(LASC_CIV_312_FIELD_MAP_SNAPSHOT), 'field-map snapshot is content-addressed');

deepEqual(
  LASC_CIV_312_TERMINAL_FIELDS.map(field => [field.fieldId, field.fieldType, field.sourcePage, field.objectReference]),
  exactExpectedTopology,
  'exact authenticated terminal field/object identities remain frozen',
);
equal(LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.fieldType === '/Tx').length, 21, 'authenticated topology has 21 text inputs');
equal(LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.fieldType === '/Btn').length, 1, 'authenticated topology has one button input');
equal(new Set(LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldId)).size, 22, 'terminal field ids are unique');
equal(LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.classification === 'WRITABLE').length, 12, 'exactly twelve destinations are writable in this profile');
equal(LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.classification === 'PROTECTED_NO_WRITE').length, 10, 'exactly ten destinations are protected/no-write');
equal(
  new Set(LASC_CIV_312_TERMINAL_FIELDS.filter(field => field.classification === 'WRITABLE').map(field => field.fieldId)).size,
  12,
  'all writable destinations are unique',
);
ok(LASC_CIV_312_TERMINAL_FIELDS.every(field => field.classification === 'WRITABLE' || field.classification === 'PROTECTED_NO_WRITE'), 'no terminal input is unclassified');

for (const fieldId of ['CASE NUMBER', 'Date', 'Print Name', 'Signature', 'COURTHOUSE ADDRESS', 'PLAINTIFFS', 'DEFENDANTS', 'check box', 'Cellular Telephone 6', 'Cellular Telephone 7']) {
  equal(
    LASC_CIV_312_TERMINAL_FIELDS.find(field => field.fieldId === fieldId)?.classification,
    'PROTECTED_NO_WRITE',
    `${fieldId} remains protected/no-write`,
  );
}

equal(validateLascCiv312SourceTopology(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY).status, 'VALID', 'exact source topology validates');

equal(validateLascCiv312SourceTopology({ ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, formId: 'OTHER' }).status, 'BLOCKED', 'form id mismatch fails closed');
equal(validateLascCiv312SourceTopology({ ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, revision: 'OTHER' }).status, 'BLOCKED', 'source revision mismatch fails closed');
equal(validateLascCiv312SourceTopology({ ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, sourceSha256: '0'.repeat(64) }).status, 'BLOCKED', 'source hash mismatch fails closed');

equal(validateLascCiv312SourceTopology({
  ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  terminalFields: LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY.terminalFields.slice(1),
}).status, 'BLOCKED', 'missing field fails closed');

const duplicateFieldTopology = {
  ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  terminalFields: [
    ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY.terminalFields.slice(0, -1),
    LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY.terminalFields[0],
  ],
};
equal(validateLascCiv312SourceTopology(duplicateFieldTopology).status, 'BLOCKED', 'duplicate field fails closed');

const unexpectedFieldTopology = {
  ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  terminalFields: LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY.terminalFields.map((field, index) =>
    index === 0 ? { ...field, fieldId: 'UNEXPECTED' } : field),
};
equal(validateLascCiv312SourceTopology(unexpectedFieldTopology).status, 'BLOCKED', 'unexpected field fails closed');

const objectDriftTopology = {
  ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  terminalFields: LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY.terminalFields.map((field, index) =>
    index === 0 ? { ...field, objectReference: '999 0 R' } : field),
};
equal(validateLascCiv312SourceTopology(objectDriftTopology).status, 'BLOCKED', 'object-reference topology drift fails closed');
notEqual(JSON.stringify(objectDriftTopology), JSON.stringify(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY), 'adversarial topology really differs from authenticated source');

console.log(`lascCiv312FieldMapFoundation: ${passed} assertions passed`);
