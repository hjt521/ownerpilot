import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection, FilingFactProvenance } from './filingCanonicalFacts';
import {
  evaluateOfficialFormFieldMap,
  type OfficialFormFieldMapDefinition,
  type OfficialSourceIdentity,
  validateOfficialSourceHealth,
  validateOfficialSourceIdentity,
} from './officialFormFieldMap';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const sha = 'a'.repeat(64);
const source: OfficialSourceIdentity = {
  registryVersion: 1,
  artifactId: `authority:TEST-100:2026-07-01:sha256:${sha}`,
  authorityKey: 'authority', formId: 'TEST-100', revisionEffective: '2026-07-01',
  sourceSnapshotId: `sha256:${sha}`, repositoryPath: 'forms/TEST-100.pdf', repositorySha256: sha,
  artifactClass: 'official_blank', repositoryStatus: 'present_hash_and_blankness_verified',
};
const map: OfficialFormFieldMapDefinition = {
  mapId: 'test', status: 'PARTIAL FOUNDATION ONLY / NOT GENERATION READY', sourceIdentity: source,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  bindings: [{ fieldId: 'TEST[0]', visibleLabelEvidence: 'Label', sourcePage: 1, canonicalFactRef: 'property.streetAddress', mappingClass: 'DIRECT_FROZEN_FACT' }],
};
const provenance: FilingFactProvenance = {
  createdNotice: { generation: 'g', createdAtISO: '2026-08-13T18:01:00.000Z' },
  sourcePaths: ['createData.propertyAddress'], provenanceClass: 'FROZEN_CUSTOMER_CONFIRMED', dependencies: [],
};
const facts: FilingCanonicalFactsProjection = {
  status: 'READY', createdNoticeIdentity: provenance.createdNotice,
  facts: { 'property.streetAddress': { state: 'KNOWN', value: '100 Test Ave', provenance } },
};

equal(validateOfficialSourceIdentity(source, source).status, 'VALID', 'exact immutable identity validates');
ok(!Object.prototype.hasOwnProperty.call(source, 'sourceHealth'), 'source health is structurally absent from immutable identity');
equal(validateOfficialSourceHealth('CURRENT').status, 'VALID', 'separately supplied CURRENT health validates');
for (const health of ['STALE', 'CHANGED', 'UNAVAILABLE', 'UNRESOLVED'] as const) {
  equal(validateOfficialSourceHealth(health).status, 'BLOCKED', `${health} health fails closed separately from identity`);
}
equal(validateOfficialSourceHealth(undefined).status, 'BLOCKED', 'missing health does not default to CURRENT');

for (const supplied of [
  { ...source, registryVersion: 2 },
  { ...source, authorityKey: 'other' },
  { ...source, formId: 'OTHER' },
  { ...source, revisionEffective: '2026-01-01' },
  { ...source, sourceSnapshotId: `sha256:${'b'.repeat(64)}` },
  { ...source, repositoryPath: 'other.pdf' },
  { ...source, repositorySha256: 'b'.repeat(64) },
  { ...source, artifactClass: 'other' },
  { ...source, repositoryStatus: 'other' },
]) equal(validateOfficialSourceIdentity(source, supplied).status, 'BLOCKED', 'identity mutation fails closed');

const differentBytes: OfficialSourceIdentity = {
  ...source, repositorySha256: 'b'.repeat(64), sourceSnapshotId: `sha256:${'b'.repeat(64)}`,
  artifactId: `authority:TEST-100:2026-07-01:sha256:${'b'.repeat(64)}`,
};
equal(validateOfficialSourceIdentity(source, differentBytes).status, 'BLOCKED', 'same revision different bytes fails closed');
const duplicate = { ...map, bindings: [map.bindings[0], map.bindings[0]] };
equal(validateOfficialSourceIdentity(source, source, duplicate.bindings).status, 'BLOCKED', 'duplicate field binding fails closed');

const immutableIdentityBeforeHealthChecks = JSON.stringify(source);
const resolved = evaluateOfficialFormFieldMap(map, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION');
equal(resolved.status, 'RESOLVED_MAPPING', 'known fact creates only a mapping candidate');
equal(resolved.formApplicability, 'NOT_EVALUATED', 'mapping does not select form applicability');
equal(resolved.formRequiredness, 'NOT_EVALUATED', 'mapping does not select form requiredness');
equal(resolved.fieldPopulation, 'NOT_PERFORMED', 'mapping does not populate a field');
equal(resolved.documentGeneration, 'NOT_PERFORMED', 'mapping does not generate a document');

for (const health of ['STALE', 'CHANGED', 'UNAVAILABLE', 'UNRESOLVED'] as const) {
  equal(
    evaluateOfficialFormFieldMap(map, source, health, facts, 'OWNER_GENERATED_PREPARATION').status,
    'BLOCKED',
    `${health} source health blocks mapping`,
  );
  equal(JSON.stringify(source), immutableIdentityBeforeHealthChecks, `${health} does not mutate immutable source identity`);
}
equal(
  evaluateOfficialFormFieldMap(map, source, undefined, facts, 'OWNER_GENERATED_PREPARATION').status,
  'BLOCKED',
  'missing source health fails closed rather than defaulting CURRENT',
);

const needsConfirmation: FilingCanonicalFactsProjection = {
  ...facts, facts: { 'property.streetAddress': { state: 'REQUIRES_CONFIRMATION', reason: 'confirm', provenance } },
};
equal(evaluateOfficialFormFieldMap(map, source, 'CURRENT', needsConfirmation, 'OWNER_GENERATED_PREPARATION').status, 'UNRESOLVED_MAPPING', 'confirmation state cannot auto-clear');
const conflict: FilingCanonicalFactsProjection = {
  ...facts, facts: { 'property.streetAddress': { state: 'CONFLICT', values: ['A', 'B'], reason: 'conflict', provenance } },
};
equal(evaluateOfficialFormFieldMap(map, source, 'CURRENT', conflict, 'OWNER_GENERATED_PREPARATION').status, 'UNRESOLVED_MAPPING', 'conflict cannot auto-resolve');
const missingMap = { ...map, bindings: [{ ...map.bindings[0], canonicalFactRef: 'property.city' as const }] };
const missing = evaluateOfficialFormFieldMap(missingMap, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION');
equal(missing.status, 'UNRESOLVED_MAPPING', 'missing canonical key is unresolved rather than blank');
const blockedFacts: FilingCanonicalFactsProjection = { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null };
equal(evaluateOfficialFormFieldMap(map, source, 'CURRENT', blockedFacts, 'OWNER_GENERATED_PREPARATION').status, 'BLOCKED', 'missing exact facts blocks mapping');
equal(evaluateOfficialFormFieldMap(map, source, 'CURRENT', facts, 'COURT_ISSUED_OR_RETURNED_INTAKE').status, 'BLOCKED', 'artifact roles cannot cross');

console.log(`officialFormFieldMap: ${passed} assertions passed`);
