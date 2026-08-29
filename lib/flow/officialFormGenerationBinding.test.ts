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
const electionProvenance: FilingFactProvenance = {
  createdNotice: identity,
  sourcePaths: ['supplemental.preparation.election'],
  provenanceClass: 'CUSTOMER_CONFIRMED_LEGAL_ELECTION',
  dependencies: [],
  legalElectionConfirmation: { confirmationId: 'confirm-1', confirmedAtISO: '2026-08-14T12:01:00.000Z' },
};

const facts: FilingCanonicalFactsProjection = {
  status: 'READY',
  createdNoticeIdentity: identity,
  facts: {
    'property.streetAddress': { state: 'KNOWN', value: '100 Test Ave', provenance: customerProvenance },
    'ud100.control.jurisdictionSupport': { state: 'KNOWN', value: 'SUPPORTED', provenance: controlProvenance },
    'ud100.control.municipalClassification': { state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', provenance: controlProvenance },
    'ud100.election.fixedTermExpiration': { state: 'KNOWN', value: 'DO_NOT_SELECT', provenance: electionProvenance },
    'property.city': { state: 'KNOWN', value: 'Unreferenced City', provenance: customerProvenance },
  },
};

const semantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: 2,
  mapId: 'test-map',
  mapVersion: '2.0.0',
  profileId: 'test-profile',
  generatorContractVersion: 'test-generator-v2',
  sourceIdentity: source,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  fieldRules: [
    {
      disposition: 'WRITE',
      evidence: { fieldId: 'TEST[0]', sourcePage: 1, fieldType: '/Tx', objectReference: '10 0 R', visibleLabelEvidence: 'Test field' },
      writeKind: 'TEXT',
      dependencies: [{ ref: 'property.streetAddress', authorityClass: 'CUSTOMER_CONFIRMED_FACT' }],
      transform: { id: 'TEXT_EXACT_V1', version: '1' },
      unresolvedPolicy: 'BLOCK',
    },
    {
      disposition: 'WRITE',
      evidence: { fieldId: 'TEST[1]', sourcePage: 1, fieldType: '/Btn', objectReference: '11 0 R', visibleLabelEvidence: 'City choice' },
      writeKind: 'CHECKBOX',
      dependencies: [{ ref: 'ud100.control.municipalClassification', authorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED' }],
      transform: {
        id: 'ENUM_CHECKBOX_V1',
        version: '1',
        args: {
          allowedValues: 'WITHIN_CITY_LIMITS|UNINCORPORATED_AREA',
          selectedValue: 'WITHIN_CITY_LIMITS',
        },
      },
      unresolvedPolicy: 'BLOCK',
    },
    {
      disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
      evidence: { fieldId: 'TEST[2]', sourcePage: 1, fieldType: '/Tx', objectReference: '12 0 R', visibleLabelEvidence: 'Deferred field' },
      authorityClass: 'DEFERRED_TO_LATER_STAGE_NOT_WRITABLE_BY_D1',
      reason: 'Deferred test field.',
    },
  ],
  profileRequirements: [
    {
      dependency: { ref: 'ud100.control.jurisdictionSupport', authorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED' },
      allowedValues: ['SUPPORTED'],
      blockerCode: 'UNSUPPORTED',
    },
  ],
  fieldFamilyCoverage: [
    { domainId: 'DOMAIN_2', familyId: 'basic', fieldIds: ['TEST[0]', 'TEST[1]'], resolution: 'FIELD_RULES' },
    { domainId: 'DOMAIN_6', familyId: 'deferred', fieldIds: ['TEST[2]'], resolution: 'FIELD_RULES' },
  ],
};
const definition = { ...semantics, mapSnapshotId: computeGenerationMapSnapshotId(semantics) };

equal(validateGenerationBindingDefinition(definition).status, 'VALID', 'explicit D.1 schema-v2 definition validates');
equal(validateGenerationBindingDefinition(UD100_FIELD_MAP_FOUNDATION).status, 'BLOCKED', 'current Stage D partial foundation is not generation-capable');

const evaluated = evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION');
equal(evaluated.status, 'GENERATION_BINDING_READY', 'exact source/current health and governed inputs produce field-write plan only');
if (evaluated.status !== 'GENERATION_BINDING_READY') throw new Error('fixture must be binding-ready');
equal(evaluated.documentGeneration, 'NOT_PERFORMED', 'generation binding never generates a document');
equal(evaluated.pdfMutation, 'NOT_PERFORMED', 'generation binding never mutates PDF bytes');
equal(evaluated.formApplicability, 'NOT_EVALUATED', 'form applicability remains external');
equal(evaluated.formRequiredness, 'NOT_EVALUATED', 'form requiredness remains external');
ok(evaluated.fieldWritePlan.some(item => item.action === 'WRITE_TEXT'), 'plan contains a positive write');
ok(evaluated.fieldWritePlan.some(item => item.action === 'SET_SELECTED'), 'valid governed enum produces selected representation');
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

const changedTransformSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldRules: semantics.fieldRules.map((rule, index) => index === 0 && rule.disposition === 'WRITE'
    ? { ...rule, transform: { ...rule.transform, version: '2' } }
    : rule),
};
notEqual(computeGenerationMapSnapshotId(changedTransformSemantics), definition.mapSnapshotId, 'encoder/transform version changes map identity');
const changedTransform = { ...changedTransformSemantics, mapSnapshotId: definition.mapSnapshotId };
equal(validateGenerationBindingDefinition(changedTransform).status, 'BLOCKED', 'stale map snapshot blocks changed transform semantics');

const duplicateSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldRules: [semantics.fieldRules[0], semantics.fieldRules[0]],
  fieldFamilyCoverage: [{ domainId: 'DOMAIN_2', familyId: 'duplicate', fieldIds: ['TEST[0]'], resolution: 'FIELD_RULES' }],
};
const duplicate = { ...duplicateSemantics, mapSnapshotId: computeGenerationMapSnapshotId(duplicateSemantics) };
equal(validateGenerationBindingDefinition(duplicate).status, 'BLOCKED', 'duplicate/conflicting writes are impossible');

const uncoveredSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldFamilyCoverage: [{ domainId: 'DOMAIN_2', familyId: 'partial', fieldIds: ['TEST[0]'], resolution: 'FIELD_RULES' }],
};
const uncovered = { ...uncoveredSemantics, mapSnapshotId: computeGenerationMapSnapshotId(uncoveredSemantics) };
equal(validateGenerationBindingDefinition(uncovered).status, 'BLOCKED', 'every executable field must belong to executable family coverage');

const badFamilySemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldFamilyCoverage: [{ domainId: 'DOMAIN_2', familyId: 'bad', fieldIds: ['MISSING'], resolution: 'FIELD_RULES' }],
};
const badFamily = { ...badFamilySemantics, mapSnapshotId: computeGenerationMapSnapshotId(badFamilySemantics) };
equal(validateGenerationBindingDefinition(badFamily).status, 'BLOCKED', 'family metadata cannot claim coverage without an executable field rule');

const referencedA = computeReferencedFactSnapshotId(facts, ['property.streetAddress']);
const changedValueFacts: FilingCanonicalFactsProjection = {
  ...facts,
  facts: { ...facts.facts, 'property.streetAddress': { state: 'KNOWN', value: '101 Test Ave', provenance: customerProvenance } },
};
const referencedB = computeReferencedFactSnapshotId(changedValueFacts, ['property.streetAddress']);
notEqual(referencedA, referencedB, 'referenced fact value changes referenced-fact identity');

const changedProvenanceFacts: FilingCanonicalFactsProjection = {
  ...facts,
  facts: {
    ...facts.facts,
    'property.streetAddress': {
      state: 'KNOWN',
      value: '100 Test Ave',
      provenance: { ...customerProvenance, sourcePaths: ['different.authoritative.path'] },
    },
  },
};
notEqual(referencedA, computeReferencedFactSnapshotId(changedProvenanceFacts, ['property.streetAddress']), 'provenance/source-path change alters identity even when visible value is same');

const unrelatedDrift: FilingCanonicalFactsProjection = {
  ...facts,
  facts: { ...facts.facts, 'property.city': { state: 'KNOWN', value: 'Changed Unreferenced City', provenance: customerProvenance } },
};
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
  equal(result.fieldWritePlan.length, 0, `${unresolvedFact.state} blocker returns zero writes`);
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

const malformedEnumFacts: FilingCanonicalFactsProjection = {
  status: 'READY',
  createdNoticeIdentity: identity,
  facts: {
    ...facts.facts,
    'ud100.control.municipalClassification': {
      state: 'KNOWN',
      value: 'MALFORMED_RUNTIME_VALUE',
      provenance: controlProvenance,
    },
  },
};
const malformedEnum = evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', malformedEnumFacts, 'OWNER_GENERATED_PREPARATION');
equal(malformedEnum.status, 'BLOCKED', 'malformed CURRENT-provenance enum value hard-blocks');
equal(malformedEnum.fieldWritePlan.length, 0, 'malformed enum produces zero checkbox writes rather than false/nonselection');

for (const validChoice of ['WITHIN_CITY_LIMITS', 'UNINCORPORATED_AREA']) {
  const validFacts: FilingCanonicalFactsProjection = {
    status: 'READY',
    createdNoticeIdentity: identity,
    facts: {
      ...facts.facts,
      'ud100.control.municipalClassification': { state: 'KNOWN', value: validChoice, provenance: controlProvenance },
    },
  };
  const result = evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', validFacts, 'OWNER_GENERATED_PREPARATION');
  equal(result.status, 'GENERATION_BINDING_READY', `${validChoice} is inside exact runtime domain`);
}

const invalidDomainSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldRules: semantics.fieldRules.map(rule => rule.evidence.fieldId === 'TEST[1]' && rule.disposition === 'WRITE'
    ? { ...rule, transform: { ...rule.transform, args: { selectedValue: 'WITHIN_CITY_LIMITS' } } }
    : rule),
};
const invalidDomain = { ...invalidDomainSemantics, mapSnapshotId: computeGenerationMapSnapshotId(invalidDomainSemantics) };
equal(validateGenerationBindingDefinition(invalidDomain).status, 'BLOCKED', 'checkbox definition without exact runtime domain is rejected');

const objectEnumBaseRule = semantics.fieldRules[1];
if (objectEnumBaseRule.disposition !== 'WRITE') throw new Error('object enum fixture requires a writable checkbox rule');
const objectEnumRule = {
  ...objectEnumBaseRule,
  writeKind: 'CHECKBOX' as const,
  transform: {
    id: 'OBJECT_ENUM_CHECKBOX_V1' as const,
    version: '1',
    args: {
      property: 'kind',
      allowedValues: 'EXHIBIT_1_ATTACHED|NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT',
      selectedValues: 'EXHIBIT_1_ATTACHED',
    },
  },
};
const objectEnumSemantics: OfficialFormGenerationBindingSemantics = {
  ...semantics,
  fieldRules: [semantics.fieldRules[0], objectEnumRule, semantics.fieldRules[2]],
};
const objectEnumDefinition = { ...objectEnumSemantics, mapSnapshotId: computeGenerationMapSnapshotId(objectEnumSemantics) };
equal(validateGenerationBindingDefinition(objectEnumDefinition).status, 'VALID', 'object-property enum checkbox definition validates with exact bounded domain');
for (const [kind, expectedAction] of [
  ['EXHIBIT_1_ATTACHED', 'SET_SELECTED'],
  ['NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT', 'SET_EXPLICIT_NONSELECTION'],
] as const) {
  const objectFacts: FilingCanonicalFactsProjection = {
    status: 'READY',
    createdNoticeIdentity: identity,
    facts: {
      ...facts.facts,
      'ud100.control.municipalClassification': { state: 'KNOWN', value: { kind }, provenance: controlProvenance },
    },
  };
  const result = evaluateOfficialFormGenerationBinding(objectEnumDefinition, source, 'CURRENT', objectFacts, 'OWNER_GENERATED_PREPARATION');
  equal(result.status, 'GENERATION_BINDING_READY', `${kind} object-property enum resolves`);
  if (result.status === 'GENERATION_BINDING_READY') {
    equal(result.fieldWritePlan.find(item => item.fieldId === 'TEST[1]')?.action, expectedAction, `${kind} maps to exact checkbox action`);
  }
}
for (const malformedValue of [
  null,
  'EXHIBIT_1_ATTACHED',
  {},
  { kind: 'OUTSIDE_DOMAIN' },
] as const) {
  const malformedObjectFacts: FilingCanonicalFactsProjection = {
    status: 'READY',
    createdNoticeIdentity: identity,
    facts: {
      ...facts.facts,
      'ud100.control.municipalClassification': { state: 'KNOWN', value: malformedValue, provenance: controlProvenance },
    },
  };
  const result = evaluateOfficialFormGenerationBinding(objectEnumDefinition, source, 'CURRENT', malformedObjectFacts, 'OWNER_GENERATED_PREPARATION');
  equal(result.status, 'BLOCKED', 'missing/wrong/out-of-domain object property fails closed');
  equal(result.fieldWritePlan.length, 0, 'invalid object-property enum emits zero writes');
}
for (const badArgs of [
  { allowedValues: 'A|B', selectedValues: 'A' },
  { property: 'kind', allowedValues: 'A|A', selectedValues: 'A' },
  { property: 'kind', allowedValues: 'A|B', selectedValues: 'C' },
  { property: 'kind', allowedValues: '', selectedValues: 'A' },
] as const) {
  const badObjectSemantics: OfficialFormGenerationBindingSemantics = {
    ...objectEnumSemantics,
    fieldRules: objectEnumSemantics.fieldRules.map(rule => rule.evidence.fieldId === 'TEST[1]' && rule.disposition === 'WRITE'
      ? { ...rule, transform: { id: 'OBJECT_ENUM_CHECKBOX_V1', version: '1', args: badArgs as Record<string, string> } }
      : rule),
  };
  const badObjectDefinition = { ...badObjectSemantics, mapSnapshotId: computeGenerationMapSnapshotId(badObjectSemantics) };
  equal(validateGenerationBindingDefinition(badObjectDefinition).status, 'BLOCKED', 'malformed object-property enum definition is rejected');
}
const multiDependencyObjectSemantics: OfficialFormGenerationBindingSemantics = {
  ...objectEnumSemantics,
  fieldRules: objectEnumSemantics.fieldRules.map(rule => rule.evidence.fieldId === 'TEST[1]' && rule.disposition === 'WRITE'
    ? { ...rule, dependencies: [...rule.dependencies, { ref: 'property.streetAddress', authorityClass: 'CUSTOMER_CONFIRMED_FACT' as const }] }
    : rule),
};
const multiDependencyObjectDefinition = { ...multiDependencyObjectSemantics, mapSnapshotId: computeGenerationMapSnapshotId(multiDependencyObjectSemantics) };
equal(validateGenerationBindingDefinition(multiDependencyObjectDefinition).status, 'BLOCKED', 'object-property enum requires exactly one dependency');

equal(
  evaluateOfficialFormGenerationBinding(definition, source, 'CURRENT', facts, 'OWNER_GENERATED_PREPARATION', { unsupportedScenarios: ['MODEL_DRAFTED_OPEN_ENDED_ALLEGATION'] }).status,
  'BLOCKED',
  'unsupported scenario hard-blocks rather than falling back',
);

console.log(`officialFormGenerationBinding: ${passed} assertions passed`);