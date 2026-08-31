import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  type FilingCanonicalFactsProjection,
  type FilingCanonicalFactsSupplementalInput,
} from './filingCanonicalFacts';
import {
  authorizeFilingChoicesForPreparation,
  computeFilingChoiceSummaryId,
  createFilingChoiceSummary,
  FILING_CHOICE_AUTHORIZATION_EFFECTS,
  FILING_CHOICE_AUTHORIZATION_STATEMENT_ID,
  FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION,
  FILING_CHOICE_SUMMARY_SCHEMA_VERSION,
  type FilingChoiceSummary,
  type FilingChoiceSummaryIdentity,
} from './filingPreparationChoiceAuthorization';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import { bindReviewApproval } from './reviewApproval';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
} from './ud100GenerationBinding';
import {
  UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING,
  UD100_PACKET_AWARE_GENERATION_BINDING,
} from './ud100GeneratedDraft';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Choice Ave',
  propertyUnit: 'Unit 4',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = { ...base, ...bindReviewApproval(base, '2026-08-14T12:00:00.000Z') };
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-14T12:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-14T12:01:00.000Z',
    propertyAddress: '100 Choice Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Choice Ave',
    signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};

const confirmation = (id: string) => ({
  confirmationId: id,
  confirmedAtISO: '2026-08-14T12:02:00.000Z',
});
const verification = (id: string) => ({
  verificationId: id,
  verifiedAtISO: '2026-08-14T12:02:00.000Z',
});
const selectedCourt = {
  county: 'Los Angeles',
  streetAddress: '111 N Hill St',
  mailingAddress: '111 N Hill St',
  cityAndZip: 'Los Angeles, CA 90012',
  branchName: 'Stanley Mosk Courthouse',
};
const control = (
  controlId: string,
  resultId: string,
  status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED' = 'CURRENT',
) => ({
  controlId,
  controlVersion: '1.0.0',
  resultId,
  status,
});
const event = (eventType: string, eventId: string) => ({
  sourceId: 'case-lifecycle',
  eventId,
  eventType,
});
const fairRentalValuePositive = {
  fairRentalValue: true,
  fairRentalValuePerDay: '85.50',
  fairRentalValueDamagesFromDate: '2026-08-20',
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
};

function supplemental(
  overrides: Partial<FilingCanonicalFactsSupplementalInput> = {},
): FilingCanonicalFactsSupplementalInput {
  const baseSupplemental: FilingCanonicalFactsSupplementalInput = {
    propertyZip: { state: 'KNOWN', value: '91203' },
    preparation: {
      selectedFilingCourt: {
        state: 'KNOWN',
        value: selectedCourt,
        confirmation: confirmation('court-confirm-1'),
      },
      municipalClassification: {
        state: 'KNOWN',
        value: 'WITHIN_CITY_LIMITS',
        control: control('municipal-classification', 'municipal-city'),
      },
      initialComplaintLifecycle: {
        state: 'KNOWN',
        value: 'INITIAL_PREFILING',
        event: event('INITIAL_COMPLAINT_STATUS', 'prefiling-1'),
      },
      captionRouteControl: {
        state: 'KNOWN',
        value: 'SELF_REPRESENTED_SUPPORTED',
        control: control('caption-route', 'self-represented'),
      },
      captionFormValueControl: {
        state: 'KNOWN',
        value: 'Self-represented',
        control: control('caption-form-value', 'self-represented-form-value'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
      },
      jurisdictionSupportControl: {
        state: 'KNOWN',
        value: 'SUPPORTED_INITIAL_UD100',
        control: control('jurisdiction-support', 'supported'),
      },
      plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
      plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
      plaintiffStandingControl: {
        state: 'KNOWN',
        value: 'SUPPORTED',
        control: control('plaintiff-standing', 'supported'),
        dependencies: [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType],
      },
      dbaUse: { state: 'KNOWN', value: 'NO_DBA' },
      doeElection: {
        state: 'KNOWN',
        value: { include: false },
        confirmation: confirmation('doe-no'),
      },
      filerContact: {
        state: 'KNOWN',
        value: {
          name: 'Synthetic Owner',
          streetAddress: '100 Choice Ave',
          city: 'Glendale',
          state: 'CA',
          zip: '91203',
          telephone: '5555550100',
          email: 'owner@example.test',
          representationStatus: 'SELF_REPRESENTED',
        },
      },
      captionOptionalFieldsControl: {
        state: 'KNOWN',
        value: 'SELF_REP_NO_BAR_FIRM_FAX',
        control: control('caption-optional-fields', 'self-rep-optional'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
      },
      premisesAge: { state: 'KNOWN', value: '1990' },
      tpaClassificationControl: {
        state: 'KNOWN',
        value: 'SUBJECT_AT_FAULT',
        control: control('tpa-classification', 'subject-at-fault'),
      },
      localControl: {
        state: 'KNOWN',
        value: 'NOT_SUBJECT',
        control: control('local-rent-control', 'not-subject'),
      },
      civilClassificationControl: {
        state: 'KNOWN',
        value: 'LIMITED_LE_10000',
        control: control('civil-classification', 'limited-le-10000'),
        dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
      },
      leaseStatus: { state: 'KNOWN', value: 'NO_AGREEMENT', verification: verification('no-agreement') },
      leaseApplicabilityControl: {
        state: 'KNOWN',
        value: 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE',
        control: control('lease-applicability', 'not-applicable-v1.1'),
        dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
      },
      noticeComplaintElection: {
        state: 'KNOWN',
        value: 'PAY_RENT_OR_QUIT_3_DAY',
        confirmation: confirmation('notice-election-pay-rent'),
      },
      noticeElectionConsistencyControl: {
        state: 'KNOWN',
        value: 'CONSISTENT',
        control: control('notice-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.noticeComplaintElection],
      },
      serviceComplaintElection: {
        state: 'KNOWN',
        value: 'PERSONAL_HAND_DELIVERY',
        confirmation: confirmation('service-election-personal'),
      },
      serviceElectionConsistencyControl: {
        state: 'KNOWN',
        value: 'CONSISTENT',
        control: control('service-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
      },
      serviceFacts: {
        state: 'KNOWN',
        value: {
          defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
          serviceDate: '2026-08-14',
          noticeExpirationDate: '2026-08-19',
          serviceMethod: 'PERSONAL_HAND_DELIVERY',
          noticeIncludedForfeiture: true,
        },
        event: event('NOTICE_SERVICE_FACTS', 'service-1'),
      },
      rentDueAtService: { state: 'KNOWN', value: 2450 },
      fixedTermExpirationElection: {
        state: 'KNOWN',
        value: 'DO_NOT_SELECT',
        confirmation: confirmation('fixed-term-no'),
      },
      rentalAssistanceFacts: {
        state: 'KNOWN',
        value: {
          item11aReceived: false,
          item11bReceived: false,
          item11cHas: false,
          item11dHas: false,
        },
      },
      rentalAssistanceControl: {
        state: 'KNOWN',
        value: 'APPLICABLE',
        control: control('rental-assistance', 'applicable'),
        dependencies: [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts],
      },
      otherNoticesFact: { state: 'KNOWN', value: 'NO_OTHER_NOTICES' },
      pastDueRentRelief: {
        state: 'KNOWN',
        value: { selected: true, amount: 2400 },
        confirmation: confirmation('past-due-rent-relief'),
      },
      otherReliefSelections: {
        state: 'KNOWN',
        value: fairRentalValuePositive,
        confirmation: confirmation('other-relief-item14-positive'),
      },
      udaDisclosureControl: {
        state: 'KNOWN',
        value: 'NO_COMPENSATED_ASSISTANT',
        control: control('uda-disclosure', 'no-compensated-assistant'),
      },
    },
  };
  return {
    ...baseSupplemental,
    ...overrides,
    preparation: {
      ...baseSupplemental.preparation,
      ...overrides.preparation,
    },
  };
}

function fixture(input: FilingCanonicalFactsSupplementalInput = supplemental()) {
  const facts = projectFilingCanonicalFacts(persisted, input);
  const binding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  return { facts, binding };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readyBindingFor(facts: FilingCanonicalFactsProjection) {
  const result = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  equal(result.status, 'GENERATION_BINDING_READY', 'mutation fixture remains inside current live D.1 family');
  if (result.status !== 'GENERATION_BINDING_READY') throw new Error(JSON.stringify(result));
  return result;
}

function resealSummary(summary: FilingChoiceSummary): FilingChoiceSummary {
  const candidate = clone(summary) as FilingChoiceSummary;
  const { filingChoiceSummaryId: _old, ...identity } = candidate;
  candidate.filingChoiceSummaryId = computeFilingChoiceSummaryId(identity as FilingChoiceSummaryIdentity);
  return candidate;
}

function authorize(
  facts: FilingCanonicalFactsProjection,
  binding: unknown,
  summary: unknown,
  overrides: Record<string, unknown> = {},
) {
  return authorizeFilingChoicesForPreparation(
    facts,
    binding,
    summary,
    {
      confirmationId: 'owner-choice-confirm-1',
      confirmedAtISO: '2026-08-14T12:03:00.000Z',
      filingChoiceSummaryId: (summary as FilingChoiceSummary).filingChoiceSummaryId,
      ...overrides,
    },
  );
}

const f = fixture();
equal(f.facts.status, 'READY', 'canonical facts fixture is READY');
equal(f.binding.status, 'GENERATION_BINDING_READY', 'current live D.1 binding fixture is READY');
if (f.binding.status !== 'GENERATION_BINDING_READY') throw new Error('live D.1 fixture must be ready');

const first = createFilingChoiceSummary(f.facts, f.binding);
equal(first.status, 'FILING_CHOICE_SUMMARY_READY', 'exact live D.1 facts create one filing-choice summary');
if (first.status !== 'FILING_CHOICE_SUMMARY_READY') throw new Error(JSON.stringify(first));
const second = createFilingChoiceSummary(f.facts, f.binding);
equal(second.status, 'FILING_CHOICE_SUMMARY_READY', 'repeated identical input remains summary-ready');
if (second.status !== 'FILING_CHOICE_SUMMARY_READY') throw new Error(JSON.stringify(second));
equal(
  canonicalizeGenerationIdentity(first.summary),
  canonicalizeGenerationIdentity(second.summary),
  'repeated identical input creates byte/equality-identical canonical summary identity',
);
equal(first.summary.schemaVersion, FILING_CHOICE_SUMMARY_SCHEMA_VERSION, 'summary schema version is explicit');
equal(first.summary.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'summary binds exact current live D.1 map');
equal(first.summary.generatorContractVersion, UD100_GENERATION_BINDING.generatorContractVersion, 'summary binds exact current live D.1 contract');
equal(first.summary.referencedFactSnapshotId, f.binding.referencedFactSnapshotId, 'summary preserves referenced-fact identity');
equal(first.summary.generationInputId, f.binding.generationInputId, 'summary preserves generation-input identity');
equal(first.summary.officialSourceArtifactId, UD100_OFFICIAL_SOURCE_IDENTITY.artifactId, 'summary preserves official source artifact identity');
equal(first.summary.officialSourceSnapshotId, UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId, 'summary preserves official source snapshot identity');
ok(first.summary.fieldWritePlanDigest.startsWith('write-plan:sha256:'), 'summary binds deterministic field-write-plan digest');

const item14 = first.summary.ownerChoices.find(item => item.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections);
ok(item14?.fact.state === 'KNOWN', 'positive Item-14 election is represented as an exact owner choice');
if (item14?.fact.state === 'KNOWN') {
  const value = item14.fact.value as typeof fairRentalValuePositive;
  equal(value.fairRentalValue, true, 'positive Item-14 election is preserved');
  equal(value.fairRentalValuePerDay, '85.50', 'Item-14 exact owner-supplied rate string is preserved without numeric normalization');
  equal(value.fairRentalValueDamagesFromDate, '2026-08-20', 'Item-14 exact owner-supplied damages-from date is preserved');
}
ok(first.summary.ownerChoices.every(item => item.fact.provenance.provenanceClass !== 'GOVERNED_CONTROL_RESULT'), 'owner choices do not silently absorb governed controls');
ok(first.summary.governedControls.length > 0, 'governed controls remain separately identifiable');
ok(first.summary.governedControls.every(item => item.fact.provenance.provenanceClass === 'GOVERNED_CONTROL_RESULT'), 'governed-control section contains governed controls only');

const approvedChoice = authorize(f.facts, f.binding, first.summary);
equal(approvedChoice.status, 'OWNER_CHOICES_AUTHORIZED_FOR_PREPARATION', 'exact owner confirmation authorizes only future preparation use of exact choices');
if (approvedChoice.status !== 'OWNER_CHOICES_AUTHORIZED_FOR_PREPARATION') throw new Error(JSON.stringify(approvedChoice));
equal(approvedChoice.statementId, FILING_CHOICE_AUTHORIZATION_STATEMENT_ID, 'authorization statement identity is fixed');
equal(approvedChoice.statementVersion, FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION, 'authorization statement version is fixed');
ok(approvedChoice.authorizationId.startsWith('filing-choice-authorization:sha256:'), 'authorization identity is deterministic and content-addressed');
equal(approvedChoice.effects.generatedArtifact, 'NO', 'authorization generates no artifact');
equal(approvedChoice.effects.persistence, 'NOT_PERFORMED', 'authorization performs no persistence');
equal(approvedChoice.effects.databaseWrite, 'NO', 'authorization performs no database write');
equal(approvedChoice.effects.checkpoint1Effect, 'NO', 'authorization consumes no checkpoint');
equal(approvedChoice.effects.filing, 'NO', 'authorization performs no filing');
equal(approvedChoice.effects.signing, 'NO', 'authorization performs no signing');
equal(approvedChoice.effects.serviceExecution, 'NO', 'authorization performs no service');
equal(approvedChoice.effects.courtSubmission, 'NO', 'authorization performs no court submission');
equal(canonicalizeGenerationIdentity(approvedChoice.effects), canonicalizeGenerationIdentity(FILING_CHOICE_AUTHORIZATION_EFFECTS), 'success carries the exact held effect matrix');

{
  const result = authorize(f.facts, f.binding, first.summary, { confirmedAtISO: '2026-08-14T12:00:59.000Z' });
  equal(result.status, 'BLOCKED', 'pre-Created-Notice owner confirmation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'CONFIRMATION_PRECEDES_CREATED_NOTICE', 'pre-Notice confirmation block reason is exact');
}
{
  const result = authorize(f.facts, f.binding, first.summary, { confirmationId: '   ' });
  equal(result.status, 'BLOCKED', 'blank confirmationId blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'BLANK_CONFIRMATION_ID', 'blank confirmationId block reason is exact');
}
{
  const result = authorize(f.facts, f.binding, first.summary, { confirmedAtISO: '2026-08-14' });
  equal(result.status, 'BLOCKED', 'malformed timestamp blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'MALFORMED_CONFIRMATION_TIMESTAMP', 'malformed timestamp block reason is exact');
}
{
  const result = authorize(f.facts, f.binding, first.summary, { filingChoiceSummaryId: 'filing-choice-summary:sha256:wrong' });
  equal(result.status, 'BLOCKED', 'wrong summary ID blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_FILING_CHOICE_SUMMARY_ID', 'wrong summary id block reason is exact');
}
{
  const result = authorizeFilingChoicesForPreparation(f.facts, f.binding, first.summary, {
    confirmationId: 'owner-choice-confirm-1',
    confirmedAtISO: '2026-08-14T12:03:00.000Z',
    filingChoiceSummaryId: first.summary.filingChoiceSummaryId,
    attackerExtraKey: true,
  });
  equal(result.status, 'BLOCKED', 'unknown authorization key blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_AUTHORIZATION_SHAPE', 'unknown key fails at exact shape');
}
{
  const result = authorizeFilingChoicesForPreparation(f.facts, f.binding, first.summary, {
    confirmationId: 'owner-choice-confirm-1',
    confirmedAtISO: '2026-08-14T12:03:00.000Z',
  });
  equal(result.status, 'BLOCKED', 'missing authorization key blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_AUTHORIZATION_SHAPE', 'missing key fails at exact shape');
}

function staleSummaryAfterFactMutation(
  ref: string,
  mutate: (fact: any) => void,
  label: string,
): void {
  const facts = clone(f.facts) as any;
  mutate(facts.facts[ref]);
  const binding = readyBindingFor(facts);
  const current = createFilingChoiceSummary(facts, binding);
  equal(current.status, 'FILING_CHOICE_SUMMARY_READY', `${label} produces a new exact current summary`);
  if (current.status !== 'FILING_CHOICE_SUMMARY_READY') throw new Error(label);
  notEqual(current.summary.filingChoiceSummaryId, first.summary.filingChoiceSummaryId, `${label} changes the deterministic summary identity`);
  const result = authorize(facts, binding, first.summary);
  equal(result.status, 'BLOCKED', `${label} invalidates old owner authorization summary`);
  if (result.status === 'BLOCKED') equal(result.blockReason, 'SUMMARY_NOT_CURRENT', `${label} fails closed as stale exact identity`);
}

staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.pastDueRentRelief,
  fact => { fact.value.amount = 2300; },
  'owner-election mutation',
);
staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.otherReliefSelections,
  fact => { fact.value.fairRentalValuePerDay = '90.00'; },
  'fairRentalValue rate mutation',
);
staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.otherReliefSelections,
  fact => { fact.value.fairRentalValueDamagesFromDate = '2026-08-21'; },
  'fairRentalValue damages-from-date mutation',
);
staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.selectedFilingCourt,
  fact => { fact.value.branchName = 'Pasadena Courthouse'; },
  'selected-court mutation',
);
staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.localControl,
  fact => { fact.provenance.governedControl.resultId = 'not-subject-rematerialized'; },
  'governed-control result identity mutation',
);
staleSummaryAfterFactMutation(
  CANONICAL_FILING_FACT_REFS.rentDueAtService,
  fact => { fact.value = 2449; },
  'referenced canonical fact mutation',
);

{
  const binding = clone(f.binding) as any;
  binding.referencedFactSnapshotId = `${binding.referencedFactSnapshotId}-mutated`;
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'referencedFactSnapshotId mutation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'FACTS_BINDING_IDENTITY_MISMATCH', 'fact-snapshot mutation fails exact binding replay');
}
{
  const binding = clone(f.binding) as any;
  binding.generationInputId = `${binding.generationInputId}-mutated`;
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'generationInputId mutation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'FACTS_BINDING_IDENTITY_MISMATCH', 'generation-input mutation fails exact binding replay');
}
{
  const summary = clone(first.summary) as FilingChoiceSummary;
  summary.fieldWritePlanDigest = `${summary.fieldWritePlanDigest}-mutated`;
  const resealed = resealSummary(summary);
  const result = authorize(f.facts, f.binding, resealed);
  equal(result.status, 'BLOCKED', 'fieldWritePlanDigest mutation blocks even after resealing');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'SUMMARY_NOT_CURRENT', 'write-plan mutation is not current live identity');
}
{
  const binding = clone(f.binding) as any;
  binding.generatorContractVersion = 'ud100-field-write-plan-v3';
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'generator contract mutation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_LIVE_D1_FAMILY', 'contract mutation cannot masquerade as live D.1');
}
{
  const binding = clone(f.binding) as any;
  binding.mapSnapshotId = 'map:sha256:0000000000000000000000000000000000000000000000000000000000000000';
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'map mutation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_LIVE_D1_FAMILY', 'map mutation cannot masquerade as live D.1');
}
{
  const summary = clone(first.summary) as FilingChoiceSummary;
  (summary.officialSourceIdentity as any).artifactId = `${summary.officialSourceArtifactId}:attacker`;
  const resealed = resealSummary(summary);
  const result = authorize(f.facts, f.binding, resealed);
  equal(result.status, 'BLOCKED', 'official-source identity mutation blocks after attacker reseal');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'SUMMARY_NOT_CURRENT', 'official-source mutation is not current canonical summary');
}
{
  const facts = clone(f.facts) as any;
  facts.createdNoticeIdentity.generation = `${facts.createdNoticeIdentity.generation}-mutated`;
  const result = createFilingChoiceSummary(facts, f.binding);
  equal(result.status, 'BLOCKED', 'Created Notice identity mutation blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'FACTS_BINDING_IDENTITY_MISMATCH', 'Created Notice mutation cannot reuse old live binding');
}
{
  const binding = clone(f.binding) as any;
  binding.mapSnapshotId = UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapSnapshotId;
  binding.generatorContractVersion = UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.generatorContractVersion;
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'B1 generated-draft family substitution blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_LIVE_D1_FAMILY', 'B1 is not admissible as live choice-summary source');
}
{
  const binding = clone(f.binding) as any;
  binding.mapSnapshotId = UD100_PACKET_AWARE_GENERATION_BINDING.mapSnapshotId;
  binding.generatorContractVersion = UD100_PACKET_AWARE_GENERATION_BINDING.generatorContractVersion;
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'B2 generated-draft family substitution blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_LIVE_D1_FAMILY', 'B2 is not admissible as live choice-summary source');
}
{
  const binding = clone(f.binding) as any;
  binding.mapSnapshotId = 'map:sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  binding.generatorContractVersion = 'unknown-cross-family-v99';
  const result = createFilingChoiceSummary(f.facts, binding);
  equal(result.status, 'BLOCKED', 'unknown/cross-family binding blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'WRONG_LIVE_D1_FAMILY', 'unknown family fails closed');
}
{
  const summary = clone(first.summary) as FilingChoiceSummary;
  const item = summary.ownerChoices.find(entry => entry.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections)!;
  if (item.fact.state !== 'KNOWN') throw new Error('Item-14 owner choice must be known');
  (item.fact.value as any).fairRentalValuePerDay = '86.00';
  const resealed = resealSummary(summary);
  notEqual(resealed.filingChoiceSummaryId, first.summary.filingChoiceSummaryId, 'attacker can recompute an internally consistent outer summary id');
  const result = authorize(f.facts, f.binding, resealed);
  equal(result.status, 'BLOCKED', 'attacker-resealed summary with wrong current canonical identity blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'SUMMARY_NOT_CURRENT', 'resealing cannot create owner authority equivalence');
}
{
  const summary = clone(first.summary) as any;
  summary.attackerExtraKey = true;
  const result = authorize(f.facts, f.binding, summary);
  equal(result.status, 'BLOCKED', 'unknown summary key blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_SUMMARY_SHAPE', 'summary outer shape is exact and fail-closed');
}
{
  const blockedFacts = { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null } as const;
  const result = createFilingChoiceSummary(blockedFacts, f.binding);
  equal(result.status, 'BLOCKED', 'facts not READY block');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'CANONICAL_FACTS_NOT_READY', 'facts READY is mandatory');
}

{
  const source = readFileSync('lib/flow/filingPreparationChoiceAuthorization.ts', 'utf8');
  ok(source.includes('evaluateUd100GenerationBinding('), 'core independently replays canonical current live D.1 binding');
  ok(source.includes('canonicalizeGenerationIdentity'), 'core reuses canonical identity serialization');
  for (const prohibited of [
    'generateUd100GeneratedDraft',
    'generateUd100BootstrapV3CompatibleDraft',
    'generateUd100PacketAwareGeneratedDraft',
    "from 'pdf-lib'",
    'createClient(',
    'supabase',
    'fetch(',
    'Date.now(',
    'Math.random(',
    'writeFileSync',
    'appendFileSync',
    'courtSubmission(',
    'serviceExecution(',
  ]) {
    ok(!source.includes(prohibited), `core excludes prohibited generation/persistence/consequential token: ${prohibited}`);
  }
}

console.log(`filingPreparationChoiceAuthorization.test.ts: ${passed} assertions passed`);
