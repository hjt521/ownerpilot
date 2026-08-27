import { strict as assert } from 'node:assert';
import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  createSyntheticQualificationPreview,
  materializeSyntheticQualification,
} from './filingPreparationSyntheticQualification';
import { evaluateUd100GenerationBinding } from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

function diagnostic(code: number, label: string, detail: unknown): never {
  for (let index = 0; index < code; index += 1) {
    console.log(`::error title=E2D1R1_DIAGNOSTIC::${label}:${index + 1}/${code}`);
  }
  throw detail instanceof Error ? detail : new Error(`${label}: ${String(detail)}`);
}

let preview: ReturnType<typeof createSyntheticQualificationPreview>;
try {
  preview = createSyntheticQualificationPreview();
} catch (error) {
  diagnostic(2, 'PREVIEW_FAILED', error);
}

let materialized: Awaited<ReturnType<typeof materializeSyntheticQualification>>;
try {
  materialized = await materializeSyntheticQualification({
    authenticatedUserId: '00000000-0000-4000-8000-000000000413',
    reviewApprovalGeneration: preview.reviewApprovalGeneration,
    ceremonyAtISO: '2026-08-27T12:00:00.000Z',
  });
} catch (error) {
  diagnostic(3, 'MATERIALIZATION_FAILED', error);
}

const baselineFacts = materialized.currentnessMaterialBinding.facts as FilingCanonicalFactsProjection;
if (baselineFacts.status !== 'READY') {
  diagnostic(4, 'BASELINE_FACTS_NOT_READY', new Error(`baseline facts are ${baselineFacts.status}`));
}
const identicalClone = structuredClone(baselineFacts) as FilingCanonicalFactsProjection;

const baseline = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', baselineFacts);
if (baseline.status !== 'GENERATION_BINDING_READY') {
  diagnostic(5, 'BASELINE_BINDING_FAILED', new Error(`${baseline.blockReason}: ${baseline.detail}`));
}
const cloneResult = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', identicalClone);
if (cloneResult.status !== 'GENERATION_BINDING_READY') {
  diagnostic(6, 'CLONE_BINDING_FAILED', new Error(`${cloneResult.blockReason}: ${cloneResult.detail}`));
}

if (cloneResult.mapSnapshotId !== baseline.mapSnapshotId) {
  diagnostic(7, 'MAP_IDENTITY_MISMATCH', new Error('identical clone changed map snapshot'));
}
if (cloneResult.referencedFactSnapshotId !== baseline.referencedFactSnapshotId) {
  diagnostic(8, 'REFERENCED_FACT_IDENTITY_MISMATCH', new Error('identical clone changed referenced fact snapshot'));
}
if (cloneResult.generationInputId !== baseline.generationInputId) {
  diagnostic(9, 'GENERATION_IDENTITY_MISMATCH', new Error('identical clone changed generation input identity'));
}
try {
  assert.deepEqual(cloneResult.fieldWritePlan, baseline.fieldWritePlan);
} catch (error) {
  diagnostic(10, 'WRITE_PLAN_MISMATCH', error);
}

console.log('E2D1R1_IDENTICAL_CLONE_IDENTITY=PASS');
