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
const identicalClone = structuredClone(baselineFacts) as FilingCanonicalFactsProjection;

const baseline = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', baselineFacts);
const cloneResult = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', identicalClone);
assert.equal(baseline.status, 'GENERATION_BINDING_READY');
assert.equal(cloneResult.status, 'GENERATION_BINDING_READY');
if (baseline.status !== 'GENERATION_BINDING_READY' || cloneResult.status !== 'GENERATION_BINDING_READY') {
  throw new Error('binding must resolve');
}
assert.equal(cloneResult.mapSnapshotId, baseline.mapSnapshotId, 'identical clone preserves map snapshot');
assert.equal(cloneResult.referencedFactSnapshotId, baseline.referencedFactSnapshotId, 'identical clone preserves referenced fact identity');
assert.equal(cloneResult.generationInputId, baseline.generationInputId, 'identical clone preserves generation identity');
assert.deepEqual(cloneResult.fieldWritePlan, baseline.fieldWritePlan, 'identical clone preserves deterministic write plan');
console.log('E2D1R1_IDENTICAL_CLONE_IDENTITY=PASS');
