import { strict as assert } from 'node:assert';
import { captureCreatedNoticeArtifact, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
  type PropertyUnitRepresentation,
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
ok(restored !== null, 'fixture passes authoritative Created Notice restore boundary');
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

const property = readCanonicalFilingFact<string>(projection, CANONICAL_FILING_FACT_REFS.propertyStreetAddress);
equal(property?.state, 'KNOWN', 'property street is a direct frozen fact');
if (property?.state !== 'KNOWN') throw new Error('property fixture must be known');
equal(property.value, '100 Canonical Ave', 'direct fact preserves exact frozen value');

const total = readCanonicalFilingFact<number>(projection, CANONICAL_FILING_FACT_REFS.rentDemandTotal);
equal(total?.state, 'KNOWN', 'rent demand total is deterministically derived');
if (total?.state !== 'KNOWN') throw new Error('total fixture must be known');
equal(total.value, 2500, 'derived rent total uses exact frozen rent-period amounts');
ok(total.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.rentPeriods), 'derived total retains rent-period dependency');

const unit = readCanonicalFilingFact<string>(projection, CANONICAL_FILING_FACT_REFS.propertyUnit);
equal(unit?.state, 'UNANSWERED', 'missing Created Notice unit remains explicit UNANSWERED');
const unitRepresentation = readCanonicalFilingFact<PropertyUnitRepresentation>(
  projection,
  CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation,
);
equal(unitRepresentation?.state, 'UNANSWERED', 'missing unit does not become an omission-capable representation');

const explicitNoUnitProjection = projectFilingCanonicalFacts(persisted, {
  propertyUnitConfirmation: { state: 'KNOWN', value: 'NO_UNIT' },
});
const explicitNoUnit = readCanonicalFilingFact<PropertyUnitRepresentation>(
  explicitNoUnitProjection,
  CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation,
);
equal(explicitNoUnit?.state, 'KNOWN', 'explicit customer NO_UNIT resolves a distinct identity-bearing representation');
if (explicitNoUnit?.state !== 'KNOWN') throw new Error('explicit no-unit fixture must be known');
equal(explicitNoUnit.value.kind, 'NO_UNIT', 'explicit no-unit representation is semantically distinct from UNANSWERED');
equal(explicitNoUnit.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', 'explicit no-unit keeps customer-input provenance');
equal(explicitNoUnit.provenance.sourcePaths[0], 'supplemental.propertyUnitConfirmation', 'explicit no-unit source path is exact');

for (const input of [
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'confirm unit status' } as const,
  { state: 'CONFLICT', values: ['NO_UNIT'] as const, reason: 'conflict unit status' } as const,
]) {
  const p = projectFilingCanonicalFacts(persisted, { propertyUnitConfirmation: input });
  equal(
    readCanonicalFilingFact<PropertyUnitRepresentation>(p, CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation)?.state,
    input.state,
    `${input.state} no-unit input remains unresolved and cannot become omission`,
  );
}

const withUnitSource: NoticeFlowData = { ...source, propertyUnit: 'Unit 2' };
const withUnitApproved: NoticeFlowData = { ...withUnitSource, ...bindReviewApproval(withUnitSource, '2026-08-13T19:00:00.000Z') };
const withUnitArtifact = captureCreatedNoticeArtifact(withUnitApproved, '2026-08-13T19:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-14',
  compliancePeriodEndDate: '2026-08-18',
});
const withUnitPersisted: NoticeFlowData = {
  ...withUnitApproved,
  productionSnapshot: { ...persisted.productionSnapshot!, producedAtISO: '2026-08-13T19:01:00.000Z' },
  createdNoticeArtifact: withUnitArtifact,
};
const withUnitProjection = projectFilingCanonicalFacts(withUnitPersisted);
const withUnitRepresentation = readCanonicalFilingFact<PropertyUnitRepresentation>(
  withUnitProjection,
  CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation,
);
equal(withUnitRepresentation?.state, 'KNOWN', 'frozen Created Notice unit deterministically creates a UNIT representation');
if (withUnitRepresentation?.state === 'KNOWN') {
  equal(withUnitRepresentation.value.kind, 'UNIT', 'frozen unit representation retains UNIT identity');
  if (withUnitRepresentation.value.kind === 'UNIT') equal(withUnitRepresentation.value.value, 'Unit 2', 'frozen unit value is preserved');
  equal(withUnitRepresentation.provenance.provenanceClass, 'DETERMINISTIC_DERIVATION', 'frozen unit representation is an explicit derivation');
  ok(withUnitRepresentation.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.propertyUnit), 'unit representation keeps exact dependency');
}

const unansweredPhone = readCanonicalFilingFact<string>(projection, 'defendant.0.telephone');
equal(unansweredPhone?.state, 'UNANSWERED', 'future phone input preserves UNANSWERED');
const unknownProjection = projectFilingCanonicalFacts(persisted, { defendantTelephones: [{ state: 'UNKNOWN' }] });
equal(readCanonicalFilingFact(unknownProjection, 'defendant.0.telephone')?.state, 'UNKNOWN', 'affirmatively UNKNOWN remains distinct from UNANSWERED');

const confirmationProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'REQUIRES_CONFIRMATION', reason: 'Confirm supplemental source.' }],
});
equal(readCanonicalFilingFact(confirmationProjection, 'defendant.0.telephone')?.state, 'REQUIRES_CONFIRMATION', 'REQUIRES_CONFIRMATION does not auto-clear');

const confirmedProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'KNOWN', value: 'confirmed-value' }],
});
const confirmedPhone = readCanonicalFilingFact<string>(confirmedProjection, 'defendant.0.telephone');
equal(confirmedPhone?.state, 'KNOWN', 'explicit confirmed supplemental input resolves the fact');
if (confirmedPhone?.state === 'KNOWN') {
  equal(confirmedPhone.value, 'confirmed-value', 'confirmed supplemental value is preserved');
  equal(confirmedPhone.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', 'supplemental provenance stays distinct');
}

const conflictProjection = projectFilingCanonicalFacts(persisted, {
  defendantTelephones: [{ state: 'CONFLICT', values: ['conflict-a', 'conflict-b'], reason: 'Conflicting supplemental evidence.' }],
});
const conflict = readCanonicalFilingFact<string>(conflictProjection, 'defendant.0.telephone');
equal(conflict?.state, 'CONFLICT', 'conflicting fact state is preserved');
if (conflict?.state === 'CONFLICT') equal(conflict.values.length, 2, 'conflict retains both candidate values');

const verification = { verificationId: 'agreement-verification-1', verifiedAtISO: '2026-08-14T12:00:00.000Z' };
const agreementProjection = projectFilingCanonicalFacts(persisted, {
  preparation: {
    leaseStatus: { state: 'KNOWN', value: 'OTHER', verification },
    agreementTermDescription: { state: 'KNOWN', value: 'ONE-YEAR CONTRACT', verification },
    agreementRentAmount: { state: 'KNOWN', value: 2500, verification },
    agreementRentFrequency: { state: 'KNOWN', value: 'MONTHLY', verification },
    agreementRentDue: { state: 'KNOWN', value: 'FIRST_DAY_OF_MONTH', verification },
    agreementForm: { state: 'KNOWN', value: 'WRITTEN', verification },
    agreementParty: { state: 'KNOWN', value: 'PLAINTIFF', verification },
    agreementDate: { state: 'UNKNOWN' },
  },
});
for (const ref of [
  CANONICAL_FILING_FACT_REFS.leaseStatus,
  CANONICAL_FILING_FACT_REFS.agreementTermDescription,
  CANONICAL_FILING_FACT_REFS.agreementRentAmount,
  CANONICAL_FILING_FACT_REFS.agreementRentFrequency,
  CANONICAL_FILING_FACT_REFS.agreementRentDue,
  CANONICAL_FILING_FACT_REFS.agreementForm,
  CANONICAL_FILING_FACT_REFS.agreementParty,
] as const) {
  const fact = readCanonicalFilingFact(agreementProjection, ref);
  equal(fact?.state, 'KNOWN', `${ref} admits only as a verified known agreement fact`);
  if (fact?.state === 'KNOWN') {
    equal(fact.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', `${ref} retains customer-fact provenance`);
    equal(fact.provenance.customerVerification?.verificationId, verification.verificationId, `${ref} retains explicit verification identity`);
    equal(fact.provenance.legalElectionConfirmation, undefined, `${ref} does not reuse legal-election provenance`);
  }
}
const agreementRent = readCanonicalFilingFact<number>(agreementProjection, CANONICAL_FILING_FACT_REFS.agreementRentAmount);
equal(agreementRent?.state, 'KNOWN', 'verified agreement rent is known');
if (agreementRent?.state === 'KNOWN') {
  equal(agreementRent.value, 2500, 'verified agreement rent preserves exact $2,500 value');
  equal(total.value, agreementRent.value, 'equal numeric value is allowed without merging semantic source identity');
  ok(agreementRent.provenance.sourcePaths[0] !== total.provenance.sourcePaths[0], 'agreement rent source path remains distinct from Notice demand total source');
  ok(!agreementRent.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.rentDemandTotal), 'agreement rent never depends on rentDemandTotal');
}
equal(
  readCanonicalFilingFact(agreementProjection, CANONICAL_FILING_FACT_REFS.agreementDate)?.state,
  'UNKNOWN',
  'explicitly unresolved agreement date remains UNKNOWN and is not fabricated',
);

const unverifiedAgreementProjection = projectFilingCanonicalFacts(persisted, {
  preparation: {
    leaseStatus: { state: 'KNOWN', value: 'OTHER' },
    agreementRentAmount: { state: 'KNOWN', value: 2500 },
  },
});
equal(
  readCanonicalFilingFact(unverifiedAgreementProjection, CANONICAL_FILING_FACT_REFS.leaseStatus)?.state,
  'REQUIRES_CONFIRMATION',
  'KNOWN agreement classification without customer verification cannot become canonical known',
);
equal(
  readCanonicalFilingFact(unverifiedAgreementProjection, CANONICAL_FILING_FACT_REFS.agreementRentAmount)?.state,
  'REQUIRES_CONFIRMATION',
  'KNOWN agreement rent without customer verification cannot become canonical known',
);
for (const unresolvedState of [
  { state: 'UNANSWERED' } as const,
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'verify agreement' } as const,
]) {
  const unresolvedProjection = projectFilingCanonicalFacts(persisted, { preparation: { leaseStatus: unresolvedState } });
  equal(
    readCanonicalFilingFact(unresolvedProjection, CANONICAL_FILING_FACT_REFS.leaseStatus)?.state,
    unresolvedState.state,
    `${unresolvedState.state} agreement status is not silently converted to NO_AGREEMENT`,
  );
}

const confirmation = { confirmationId: 'election-1', confirmedAtISO: '2026-08-14T12:00:00.000Z' };
const electionProjection = projectFilingCanonicalFacts(persisted, {
  preparation: {
    doeElection: { state: 'KNOWN', value: { include: false }, confirmation },
  },
});
const doe = readCanonicalFilingFact(electionProjection, CANONICAL_FILING_FACT_REFS.doeElection);
equal(doe?.state, 'KNOWN', 'customer legal election can be projected without deciding it');
if (doe?.state === 'KNOWN') {
  equal(doe.provenance.provenanceClass, 'CUSTOMER_CONFIRMED_LEGAL_ELECTION', 'legal election provenance is distinct');
  equal(doe.provenance.legalElectionConfirmation?.confirmationId, 'election-1', 'legal-election confirmation identity is retained');
}

const governed = { controlId: 'test-control', controlVersion: '1.0.0', resultId: 'result-1', status: 'CURRENT' as const };
const controlProjection = projectFilingCanonicalFacts(persisted, {
  preparation: {
    civilClassificationControl: { state: 'KNOWN', value: 'LIMITED_LE_10000', control: governed },
  },
});
const civil = readCanonicalFilingFact(controlProjection, CANONICAL_FILING_FACT_REFS.civilClassificationControl);
if (civil?.state === 'KNOWN') {
  equal(civil.provenance.provenanceClass, 'GOVERNED_CONTROL_RESULT', 'control result provenance is distinct');
  equal(civil.provenance.governedControl?.controlVersion, '1.0.0', 'versioned CURRENT control identity is retained');
}

const absent = projectFilingCanonicalFacts(null);
equal(absent.status, 'BLOCKED', 'no exact Created Notice artifact fails closed');
if (absent.status === 'BLOCKED') equal(absent.reason, 'EXACT_CREATED_NOTICE_REQUIRED', 'missing artifact cannot fall back to mutable draft');

const missingSnapshot = projectFilingCanonicalFacts({ ...persisted, productionSnapshot: undefined });
equal(missingSnapshot.status, 'BLOCKED', 'missing ProductionSnapshot fails authoritative restoration');
if (missingSnapshot.status === 'BLOCKED') equal(missingSnapshot.reason, 'INVALID_CREATED_NOTICE_IDENTITY', 'missing snapshot cannot become canonical');

const mutableDraftProjection = projectFilingCanonicalFacts({
  ...persisted,
  propertyAddress: '999 Mutable Draft Ave',
  tenantNames: ['Mutable Draft Tenant'],
});
equal(mutableDraftProjection.status, 'READY', 'later mutable draft drift does not replace restored artifact');
const restoredProperty = readCanonicalFilingFact<string>(mutableDraftProjection, CANONICAL_FILING_FACT_REFS.propertyStreetAddress);
if (restoredProperty?.state === 'KNOWN') equal(restoredProperty.value, '100 Canonical Ave', 'projection consumes restored artifact facts only');

const tampered = projectFilingCanonicalFacts({
  ...persisted,
  createdNoticeArtifact: { ...artifact, generation: 'tampered-generation' },
});
equal(tampered.status, 'BLOCKED', 'mismatched Created Notice generation fails closed');

console.log(`filingCanonicalFacts: ${passed} assertions passed`);
