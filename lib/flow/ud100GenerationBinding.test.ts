import { strict as assert } from 'node:assert';
import {
  CANONICAL_FILING_FACT_REFS,
  type CanonicalFilingFactRef,
  type FilingCanonicalFactsProjection,
} from './filingCanonicalFacts';
import { computeReferencedFactSnapshotId } from './officialFormGenerationBinding';
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
if (baselineFacts.status !== 'READY') throw new Error('baseline facts must be READY');
const variantFacts = structuredClone(baselineFacts) as FilingCanonicalFactsProjection;
if (variantFacts.status !== 'READY') throw new Error('variant facts must be READY');
const telephoneRef: CanonicalFilingFactRef = 'defendant.0.telephone';
const existing = variantFacts.facts[telephoneRef];
if (!existing) throw new Error('telephone fact missing');
variantFacts.facts[telephoneRef] = { state: 'KNOWN', value: '5555559999', provenance: existing.provenance };

const baseline = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', baselineFacts);
const variant = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', variantFacts);
assert.equal(baseline.status, 'GENERATION_BINDING_READY');
assert.equal(variant.status, 'GENERATION_BINDING_READY');
if (baseline.status !== 'GENERATION_BINDING_READY' || variant.status !== 'GENERATION_BINDING_READY') throw new Error('binding must resolve');

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
if (changedDirectRefs.length === 0) {
  for (let i = 0; i < 61; i += 1) console.log(`::error file=lib/flow/ud100GenerationBinding.test.ts,line=1,col=1::E2D1R1_NO_CHANGED_DIRECT_REF_${i}`);
  throw new Error('E2D1R1 diagnostic: overall identity changed but no direct-ref closure changed');
}
const fixedRefs = Object.values(CANONICAL_FILING_FACT_REFS).sort();
const firstChanged = changedDirectRefs[0];
const fixedIndex = fixedRefs.indexOf(firstChanged as (typeof fixedRefs)[number]);
const code = fixedIndex >= 0 ? fixedIndex + 1 : 60;
for (let i = 0; i < code; i += 1) {
  console.log(`::error file=lib/flow/ud100GenerationBinding.test.ts,line=1,col=1::E2D1R1_CHANGED_DIRECT_REF_CODE_${i}`);
}
throw new Error(`E2D1R1 diagnostic changed direct ref count ${changedDirectRefs.length}`);
