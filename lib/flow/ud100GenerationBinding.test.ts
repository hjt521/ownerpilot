import { strict as assert } from 'node:assert';
import type { CanonicalFilingFactRef, FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  computeReferencedFactSnapshotId,
} from './officialFormGenerationBinding';
import {
  createSyntheticQualificationPreview,
  materializeSyntheticQualification,
} from './filingPreparationSyntheticQualification';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
} from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

const preview = createSyntheticQualificationPreview();
const materialized = await materializeSyntheticQualification({
  authenticatedUserId: '00000000-0000-4000-8000-000000000413',
  reviewApprovalGeneration: preview.reviewApprovalGeneration,
  ceremonyAtISO: '2026-08-27T12:00:00.000Z',
});

const baselineFacts = materialized.currentnessMaterialBinding.facts as FilingCanonicalFactsProjection;
assert.equal(baselineFacts.status, 'READY');
if (baselineFacts.status !== 'READY') throw new Error('diagnostic baseline facts must be READY');

const variantFacts = structuredClone(baselineFacts) as FilingCanonicalFactsProjection;
if (variantFacts.status !== 'READY') throw new Error('diagnostic variant facts must be READY');
const telephoneRef: CanonicalFilingFactRef = 'defendant.0.telephone';
const existingTelephone = variantFacts.facts[telephoneRef];
if (!existingTelephone) throw new Error('diagnostic telephone fact missing');
variantFacts.facts[telephoneRef] = {
  state: 'KNOWN',
  value: '5555559999',
  provenance: existingTelephone.provenance,
};

const baselineResult = evaluateUd100GenerationBinding(
  UD100_OFFICIAL_SOURCE_IDENTITY,
  'CURRENT',
  baselineFacts,
);
const variantResult = evaluateUd100GenerationBinding(
  UD100_OFFICIAL_SOURCE_IDENTITY,
  'CURRENT',
  variantFacts,
);
assert.equal(baselineResult.status, 'GENERATION_BINDING_READY');
assert.equal(variantResult.status, 'GENERATION_BINDING_READY');
if (baselineResult.status !== 'GENERATION_BINDING_READY' || variantResult.status !== 'GENERATION_BINDING_READY') {
  throw new Error('diagnostic binding must resolve');
}

const direct = new Set<CanonicalFilingFactRef>();
for (const requirement of UD100_GENERATION_BINDING.profileRequirements) direct.add(requirement.dependency.ref);
for (const rule of UD100_GENERATION_BINDING.fieldRules) {
  if (rule.disposition === 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE') {
    direct.add(rule.dependency.ref);
    continue;
  }
  if (rule.disposition !== 'WRITE') continue;
  if (rule.condition) direct.add(rule.condition.dependency.ref);
  for (const dependency of rule.dependencies) direct.add(dependency.ref);
}

const changedDirectRefs = [...direct].sort().filter(ref =>
  computeReferencedFactSnapshotId(baselineFacts, [ref]) !== computeReferencedFactSnapshotId(variantFacts, [ref]),
);
const diagnostic = {
  directTelephoneIncluded: direct.has(telephoneRef),
  changedDirectRefs,
  baselineReferencedFactSnapshotId: baselineResult.referencedFactSnapshotId,
  variantReferencedFactSnapshotId: variantResult.referencedFactSnapshotId,
  baselineGenerationInputId: baselineResult.generationInputId,
  variantGenerationInputId: variantResult.generationInputId,
  overallReferencedChanged: baselineResult.referencedFactSnapshotId !== variantResult.referencedFactSnapshotId,
  overallGenerationChanged: baselineResult.generationInputId !== variantResult.generationInputId,
};

throw new Error(`E2_3D1R1_TELEPHONE_IDENTITY_DIAGNOSTIC=${JSON.stringify(diagnostic)}`);
