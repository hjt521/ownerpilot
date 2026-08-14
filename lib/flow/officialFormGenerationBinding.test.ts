import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection, FilingFactProvenance } from './filingCanonicalFacts';
import {
  computeGenerationInputId,
  computeGenerationMapSnapshotId,
  computeReferencedFactSnapshotId,
  evaluateOfficialFormGenerationBinding,
  validateGenerationBindingDefinition,
  type OfficialFormGenerationBindingSemantics,
} from './officialFormGenerationBinding';
import type { OfficialSourceIdentity } from './officialFormFieldMap';
import { UD100_FIELD_MAP_FOUNDATION } from './ud100FieldMapFoundation';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const sha = 'a'.repeat(64);
const source: OfficialSourceIdentity = {
  registryVersion: 1,
  artifactId: `authority:TEST-100:2026-07-01:sha256:${sha}`,
  authorityKey: 'authority',
  formId: 'TEST-100',
  revisionEffective: '2026-07-01',
  sourceSnapshotId: `sha256:${sha}`,
  repositoryPath: 'forms/TEST-100.pdf',
  repositorySha256: sha,
  artifactClass: 'official_blank',
  repositoryStatus: 'present_hash_and_blankness_verified',
};

const identity = { generation: 'g-1', createdAtISO: '2026-08-14T12:00:00.000Z' };
const customerProvenance: FilingFactProvenance = {
  createdNotice: identity,
  sourcePaths: ['createData.propertyAddress'],
  provenanceClass: 'FROZEN_CUSTOMER_CONFIRMED',
  dependencies: [],
};
const controlProvenance: FilingFactProvenance = {
  createdNotice: identity,
  sourcePaths: ['supplemental.preparation.control'],
  provenanceClass: 'GOVERNED_CONTROL_RESULT',
  dependencies: [],
  governedControl: { controlId: 'test-control', controlVersion: '1', resultId: 'r1', status: 'CURRENT' },
};

const facts: FilingCanonicalFactsProjection = {
  status: 'READY',
  createdNoticeIdentity: identity,
  facts: {
    'property.streetAddress': { state: 'KNOWN', value: '100 Test Ave', provenance: customerProvenance },
    'ud100.control.jurisdictionSupport': { state: 'KNOWN', value: 'SUPPORTED', provenance: controlProvenance },
    'property.city': { state: 'KNOWN', value: 'Unreferenced City', provenance: customerProvenance },
  },
};

const semantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: 1,
  mapId: 'test-map',
  mapVersion: '1.0.0',
  profileId: 'test-profile',
  generatorContractVersion: 'test-generator-v1',
  sourceIdentity: source,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  fieldRules: [
    {
      disposition: 'WRITE',
      evidence: { fieldId: 'TEST[0]', sourcePage: 1, fieldType: '/Tx', objectReference: '10 0 R', visibleLabelEvidence: 'Test field' },
      writeKind: 'TEXT',
      inputAuthorityClass: 'CUSTOMER_CONFIRMED_FACT',
      dependencies: [{ ref: 'property.streetAddress', requirement: 'REQUIRED' }],
      transform: { id: 'TEXT_EXACT_V1', version: '1' },
      unresolvedPolicy: 'BLOCK',
    },
    {
      disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
      evidence: { fieldId: 'TEST[1]', sourcePage: 1, fieldType: '/Tx', objectReference: '11 0 R', visibleLabelEvidence: 'Deferred field' },
      authorityClass: 'DEFERRED_TO_LATER_STAGE_NOT_WRITABLE_BY_D1',
      reason: 'Deferred test field.',
    },
  ],
  profileRequirements: [
    {
      ref: 'ud100.control.jurisdictionSupport',
      inputAuthorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED',
      allowedValues: ['SUPPORTED'],
      blockerCode: 'UNSUPPORTED',
    },
  ],
  matrixDomainCoverage: ['DOMAIN_1'],
};
const definition = { ...semantics, mapSnapshotId: computeGenerationMapSnapshotId(semantics) };

equal(validateGenerationBindingDefinition(definition).status, 'VALID', 'explicit D.1 definition validates');
equal(validateGenerationBindingDefinition(UD100_FIELD_MAP_FOUNDATION).status, 'BLOCKED', 'current Stage D partial foundation is not generation-capable');

const evaluated = evaluateOfficialFormGenerationBinding(
  definition, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION',
);
equal(evaluated.status, 'GENERATION_BINDING_READY', 'exact source/current health and governed inputs produce field-write plan only');
if (evaluated.status !== 'GENERATION_BINDING_READY') throw new Error('fixture must be binding-ready');
equal(evaluated.documentGeneration, 'NOT_PERFORMED', 'generation binding never generates a document');
equal(evaluated.pdfMutation, 'NOT_PERFORMED', 'generation binding never mutates PDF bytes');
equal(evaluated.formApplicability, 'NOT_EVALUATED', 'form applicability remains external');
equal(evaluated.formRequiredness, 'NOT_EVALUATED', 'form requiredness remains external');
ok(evaluated.fieldWritePlan.some(item => item.action === 'WRITE_TEXT'), 'plan contains a positive write');
ok(evaluated.fieldWritePlan.some(item => item.action === 'PRESERVE_OFFICIAL_BLANK_NO_WRITE'), 'plan distinguishes explicit deferred no-write');

for (const health of [undefined, 'STALE', 'CHANGED', 'UNAVAILABLE', 'UNRESOLVED'] as const) {
  equal(
    evaluateOfficialFormGenerationBinding(definition, source, health, facts, 'OWNER_GENERATED_PREPARATION').status,
    'BLOCKED',
    `${health ?? 'missing'} source health blocks generation binding`,
  );
}
const wrongSource = { ...source, repositoryPath: 'other.pdf' };
equal(evaluateOfficialFormGenerationBinding(definition, wrongSource, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION').status, 'BLOCKED', 'wrong exact source identity blocks');
equal(evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', facts, 'COURT_ISSUED_OR_RETURNED_INTAKE').status, 'BLOCKED', 'artifact role mismatch blocks');

const changedTransform = {
  ...definition,
  fieldRules: definition.fieldRules.map((rule, index) => index === 0 && rule.disposition === 'WRITE'
    ? { ...rule, transform: { ...rule.transform, version: '2' } }
    : rule),
};
equal(validateGenerationBindingDefinition(changedTransform).status, 'BLOCKED', 'same map id with changed encoder/transform semantics rejects stale map snapshot');
const changedSemantics = { ...semantics, fieldRules: changedTransform.fieldRules };
notEqual(computeGenerationMapSnapshotId(changedSemantics), definition.mapSnapshotId, 'encoder/transform version changes map identity');

const duplicateSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldRules: [semantics.fieldRules[0], semantics.fieldRules[0]],
};
const duplicate = { ...duplicateSemantics, mapSnapshotId: computeGenerationMapSnapshotId(duplicateSemantics) };
equal(validateGenerationBindingDefinition(duplicate).status, 'BLOCKED', 'duplicate/conflicting writes are impossible');

const referencedA = computeReferencedFactSnapshotId(facts, ['property.streetAddress']);
const changedValueFacts: FilingCanonicalFactsProjection = facts.status === 'READY' ? {
  ...facts,
  facts: { ...facts.facts, 'property.streetAddress': { state: 'KNOWN', value: '101 Test Ave', provenance: customerProvenance } },
} : facts;
const referencedB = computeReferencedFactSnapshotId(changedValueFacts, ['property.streetAddress']);
notEqual(referencedA, referencedB, 'referenced fact value changes referenced-fact identity');

const changedProvenanceFacts: FilingCanonicalFactsProjection = facts.status === 'READY' ? {
  ...facts,
  facts: {
    ...facts.facts,
    'property.streetAddress': {
      state: 'KNOWN',
      value: '100 Test Ave',
      provenance: { ...customerProvenance, sourcePaths: ['different.authoritative.path'] },
    },
  },
} : facts;
notEqual(referencedA, computeReferencedFactSnapshotId(changedProvenanceFacts, ['property.streetAddress']), 'provenance/source-path change alters identity even when visible value is same');

const unrelatedDrift: FilingCanonicalFactsProjection = facts.status === 'READY' ? {
  ...facts,
  facts: { ...facts.facts, 'property.city': { state: 'KNOWN', value: 'Changed Unreferenced City', provenance: customerProvenance } },
} : facts;
equal(referencedA, computeReferencedFactSnapshotId(unrelatedDrift, ['property.streetAddress']), 'unreferenced fact drift does not create false staleness');

const generationA = computeGenerationInputId({
  sourceSnapshotId: source.sourceSnapshotId,
  mapSnapshotId: definition.mapSnapshotId,
  referencedFactSnapshotId: referencedA,
  generatorContractVersion: semantics.generatorContractVersion,
});
const generationB = computeGenerationInputId({
  sourceSnapshotId: source.sourceSnapshotId,
  mapSnapshotId: definition.mapSnapshotId,
  referencedFactSnapshotId: referencedB,
  generatorContractVersion: semantics.generatorContractVersion,
});
notEqual(generationA, generationB, 'referenced fact identity change changes generation-input identity');

for (const unresolvedFact of [
  { state: 'UNANSWERED', provenance: customerProvenance },
  { state: 'UNKNOWN', provenance: customerProvenance },
  { state: 'REQUIRES_CONFIRMATION', reason: 'confirm', provenance: customerProvenance },
  { state: 'CONFLICT', values: ['A', 'B'], reason: 'conflict', provenance: customerProvenance },
] as const) {
  const unresolvedFacts: FilingCanonicalFactsProjection = {
    status: 'READY',
    createdNoticeIdentity: identity,
    facts: { ...facts.facts, 'property.streetAddress': unresolvedFact },
  };
  const result = evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', unresolvedFacts, 'OWNER_GENERATED_PREPARATION');
  equal(result.status, 'BLOCKED', `${unresolvedFact.state} never becomes blank/no/omission`);
}

const staleControlFacts: FilingCanonicalFactsProjection = {
  status: 'READY',
  createdNoticeIdentity: identity,
  facts: {
    ...facts.facts,
    'ud100.control.jurisdictionSupport': {
      state: 'KNOWN',
      value: 'SUPPORTED',
      provenance: { ...controlProvenance, governedControl: { ...controlProvenance.governedControl!, status: 'STALE' } },
    },
  },
};
equal(evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', staleControlFacts, 'OWNER_GENERATED_PREPARATION').status, 'BLOCKED', 'stale governed-control provenance blocks');

equal(
  evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION', { unsupportedScenarios: ['MODEL_DRAFTED_OPEN_ENDED_ALLEGATION'] }).status,
  'BLOCKED',
  'unsupported scenario hard-blocks rather than falling back',
);

console.log(`officialFormGenerationBinding: ${passed} assertions passed`);
