import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  createSyntheticQualificationPreview,
  materializeSyntheticQualification,
} from './filingPreparationSyntheticQualification';
import { evaluateUd100GenerationBinding } from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

const preview = createSyntheticQualificationPreview();
const materialized = await materializeSyntheticQualification({
  authenticatedUserId: '00000000-0000-4000-8000-000000000413',
  reviewApprovalGeneration: preview.reviewApprovalGeneration,
  ceremonyAtISO: '2026-08-27T12:00:00.000Z',
});
const baselineFacts = materialized.currentnessMaterialBinding.facts as FilingCanonicalFactsProjection;
assert.equal(baselineFacts.status, 'READY');
if (baselineFacts.status !== 'READY') throw new Error('baseline facts must be READY');

const variantFacts = structuredClone(baselineFacts) as FilingCanonicalFactsProjection;
if (variantFacts.status !== 'READY') throw new Error('variant facts must be READY');
const ref = 'defendant.0.telephone';
const existing = variantFacts.facts[ref];
if (!existing) throw new Error('telephone fact missing');
variantFacts.facts[ref] = {
  state: 'KNOWN',
  value: '5555559999',
  provenance: existing.provenance,
};

const baseline = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', baselineFacts);
const variant = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', variantFacts);
assert.equal(baseline.status, 'GENERATION_BINDING_READY');
assert.equal(variant.status, 'GENERATION_BINDING_READY');
if (baseline.status !== 'GENERATION_BINDING_READY' || variant.status !== 'GENERATION_BINDING_READY') {
  throw new Error('binding must resolve');
}
assert.equal(
  variant.referencedFactSnapshotId,
  baseline.referencedFactSnapshotId,
  'BINARY_DIAGNOSTIC_MATERIALIZED_TELEPHONE_REFERENCED_ID_MUST_NOT_CHANGE',
);
assert.equal(
  variant.generationInputId,
  baseline.generationInputId,
  'BINARY_DIAGNOSTIC_MATERIALIZED_TELEPHONE_GENERATION_ID_MUST_NOT_CHANGE',
);
console.log('BINARY_DIAGNOSTIC_MATERIALIZED_TELEPHONE=PASS');
