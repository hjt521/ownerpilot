import { strict as assert } from 'node:assert';
import { captureCreatedNoticeArtifact, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';

let passed = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}

const source: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Canonical Ave',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant'],
  rentPeriods: [
    { periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 1000 },
    { periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 1500 },
  ],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = {
  ...source,
  ...bindReviewApproval(source, '2026-08-13T18:00:00.000Z'),
};
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-13T18:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-14',
  compliancePeriodEndDate: '2026-08-18',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-13T18:01:00.000Z',
    propertyAddress: '100 Canonical Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant'],
    totalAmount: 2500,
    rentPeriods: [
      { start: '2026-07-01', end: '2026-07-31', amount: 1000 },
      { start: '2026-08-01', end: '2026-08-31', amount: 1500 },
    ],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Canonical Ave',
    signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};

const restored = restoreCreatedNoticeArtifact(persisted);
ok(restored !== null, 'fixture passes the authoritative Created Notice restore boundary');
if (!restored) throw new Error('fixture must restore');
equal(restored.generation, artifact.generation, 'authoritative restore preserves exact generation');
equal(restored.createdAtISO, artifact.createdAtISO, 'authoritative restore preserves exact produced timestamp');

const projection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'UNANSWERED' }],
});
equal(projection.status, 'READY', 'exact Created Notice artifact projects canonical filing facts');
if (projection.status !== 'READY') throw new Error('fixture projection must be ready');

equal(projection.createdNoticeIdentity.generation, artifact.generation, 'projection preserves exact Created Notice generation');
equal(projection.createdNoticeIdentity.createdAtISO, artifact.createdAtISO, 'projection preserves exact Created Notice createdAtISO');

const plaintiff = readCanonicalFilingFact<readonly string[]>(projection, CANONICAL_FILING_FACT_REFS.plaintiffNames);
equal(plaintiff?.state, 'KNOWN', 'plaintiff names derive from frozen landlord identity');
if (plaintiff?.state !== 'KNOWN') throw new Error('plaintiff fixture must be known');
equal(plaintiff.value[0], 'Synthetic Owner', 'derived plaintiff name preserves frozen value');
equal(plaintiff.provenance.provenanceClass, 'DETERMINISTIC_DERIVATION', 'derived plaintiff fact is explicitly classified');
ok(plaintiff.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.landlordIdentity), 'derived plaintiff fact retains dependency fact ref');
equal(plaintiff.provenance.createdNotice.generation, artifact.generation, 'derived fact remains bound to Created Notice identity');

const property = readCanonicalFilingFact<string>(projection, CANONICAL_FILING_FACT_REFS.propertyStreetAddress);
equal(property?.state, 'KNOWN', 'property street is a direct frozen fact');
if (property?.state !== 'KNOWN') throw new Error('property fixture must be known');
equal(property.value, '100 Canonical Ave', 'direct fact preserves exact frozen value');
equal(property.provenance.provenanceClass, 'FROZEN_CUSTOMER_CONFIRMED', 'direct frozen fact provenance is explicit');

const total = readCanonicalFilingFact<number>(projection, CANONICAL_FILING_FACT_REFS.rentDemandTotal);
equal(total?.state, 'KNOWN', 'rent demand total is deterministically derived');
if (total?.state !== 'KNOWN') throw new Error('total fixture must be known');
equal(total.value, 2500, 'derived rent total uses exact frozen rent-period amounts');
ok(total.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.rentPeriods), 'derived total retains rent-period dependency');

const unit = readCanonicalFilingFact<string>(projection, CANONICAL_FILING_FACT_REFS.propertyUnit);
equal(unit?.state, 'UNANSWERED', 'missing canonical key is explicit UNANSWERED rather than a blank value');

const unansweredPhone = readCanonicalFilingFact<string>(projection, 'defendant.0.telephone');
equal(unansweredPhone?.state, 'UNANSWERED', 'future phone input preserves UNANSWERED');
const unknownProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'UNKNOWN' }],
});
equal(readCanonicalFilingFact(unknownProjection, 'defendant.0.telephone')?.state, 'UNKNOWN', 'affirmatively UNKNOWN remains distinct from UNANSWERED');

const confirmationProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'REQUIRES_CONFIRMATION', reason: 'Confirm supplemental source.' }],
});
equal(readCanonicalFilingFact(confirmationProjection, 'defendant.0.telephone')?.state, 'REQUIRES_CONFIRMATION', 'REQUIRES_CONFIRMATION does not auto-clear');

const confirmedProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'KNOWN', value: 'confirmed-value' }],
});
const confirmedPhone = readCanonicalFilingFact<string>(confirmedProjection, 'defendant.0.telephone');
equal(confirmedPhone?.state, 'KNOWN', 'an explicit confirmed supplemental input can resolve the confirmation state');
if (confirmedPhone?.state === 'KNOWN') {
  equal(confirmedPhone.value, 'confirmed-value', 'confirmed supplemental value is preserved without blank coercion');
  equal(confirmedPhone.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', 'supplemental confirmation provenance stays distinct from frozen Notice provenance class');
}

const conflictProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'CONFLICT', values: ['conflict-a', 'conflict-b'], reason: 'Conflicting supplemental evidence.' }],
});
const conflict = readCanonicalFilingFact<string>(conflictProjection, 'defendant.0.telephone');
equal(conflict?.state, 'CONFLICT', 'conflicting fact state is preserved rather than choosing a value');
if (conflict?.state !== 'CONFLICT') throw new Error('conflict fixture must remain conflicting');
equal(conflict.values.length, 2, 'conflict retains both candidate values for audit');

const absent = projectFilingCanonicalFacts(null);
equal(absent.status, 'BLOCKED', 'no exact Created Notice artifact fails closed');
if (absent.status !== 'BLOCKED') throw new Error('absent fixture must block');
equal(absent.reason, 'EXACT_CREATED_NOTICE_REQUIRED', 'missing artifact cannot fall back to mutable draft values');
equal(absent.facts, null, 'missing artifact exposes no guessed canonical facts');

const missingEnvelope = projectFilingCanonicalFacts({
  ...persisted,
  createdNoticeArtifact: undefined,
});
equal(missingEnvelope.status, 'BLOCKED', 'missing persisted Created Notice envelope fails closed');
if (missingEnvelope.status !== 'BLOCKED') throw new Error('missing envelope fixture must block');
equal(missingEnvelope.reason, 'EXACT_CREATED_NOTICE_REQUIRED', 'missing envelope cannot fall back to mutable draft state');

const missingSnapshot = projectFilingCanonicalFacts({
  ...persisted,
  productionSnapshot: undefined,
});
equal(missingSnapshot.status, 'BLOCKED', 'missing ProductionSnapshot fails authoritative restoration');
if (missingSnapshot.status !== 'BLOCKED') throw new Error('missing snapshot fixture must block');
equal(missingSnapshot.reason, 'INVALID_CREATED_NOTICE_IDENTITY', 'missing ProductionSnapshot cannot become canonical');

const mismatchedSnapshot = projectFilingCanonicalFacts({
  ...persisted,
  productionSnapshot: {
    ...persisted.productionSnapshot!,
    producedAtISO: '2026-08-13T18:02:00.000Z',
  },
});
equal(mismatchedSnapshot.status, 'BLOCKED', 'mismatched ProductionSnapshot timestamp fails authoritative restoration');
if (mismatchedSnapshot.status !== 'BLOCKED') throw new Error('mismatched snapshot fixture must block');
equal(mismatchedSnapshot.reason, 'INVALID_CREATED_NOTICE_IDENTITY', 'snapshot mismatch cannot become canonical');

const mutableDraftProjection = projectFilingCanonicalFacts({
  ...persisted,
  propertyAddress: '999 Mutable Draft Ave',
  tenantNames: ['Mutable Draft Tenant'],
});
equal(mutableDraftProjection.status, 'READY', 'later mutable draft drift does not replace the restored artifact');
const restoredProperty = readCanonicalFilingFact<string>(
  mutableDraftProjection,
  CANONICAL_FILING_FACT_REFS.propertyStreetAddress,
);
equal(restoredProperty?.state, 'KNOWN', 'restored frozen property remains known after mutable draft drift');
if (restoredProperty?.state !== 'KNOWN') throw new Error('restored property must remain known');
equal(restoredProperty.value, '100 Canonical Ave', 'projection consumes restored artifact facts, never mutable draft fallback');

const tampered = projectFilingCanonicalFacts({
  ...persisted,
  createdNoticeArtifact: { ...artifact, generation: 'tampered-generation' },
});
equal(tampered.status, 'BLOCKED', 'mismatched Created Notice generation fails closed');
if (tampered.status !== 'BLOCKED') throw new Error('tampered fixture must block');
equal(tampered.reason, 'INVALID_CREATED_NOTICE_IDENTITY', 'failed restoration is not accepted as canonical');

console.log(`filingCanonicalFacts: ${passed} assertions passed`);
