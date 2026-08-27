import assert from 'node:assert/strict';
import {
  createSyntheticQualificationPreview,
  materializeSyntheticQualification,
} from './filingPreparationSyntheticQualification';

const preview = createSyntheticQualificationPreview();
assert.equal(preview.profileVersion, 'bootstrap-v3');
const materialized = await materializeSyntheticQualification({
  authenticatedUserId: '11111111-1111-4111-8111-111111111111',
  reviewApprovalGeneration: preview.reviewApprovalGeneration,
  ceremonyAtISO: '2026-08-24T23:45:00.000Z',
});
assert.equal(materialized.syntheticOnly, true);
assert.equal(materialized.profileVersion, 'bootstrap-v3');
assert.equal(materialized.currentnessMaterialBinding.facts.status, 'READY');
assert.equal(materialized.generatedDraft.artifactClass, 'GENERATED_DRAFT');
console.log('E2D1R1_SYNTHETIC_MATERIALIZATION_SMOKE=PASS');
