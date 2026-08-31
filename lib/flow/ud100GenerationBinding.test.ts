import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
  type FilingCanonicalFactsSupplementalInput,
  type PropertyUnitRepresentation,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { validateGenerationBindingDefinition } from './officialFormGenerationBinding';
import { UD100_FIELD_MAP_FOUNDATION, UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
  UD100_GENERATION_BINDING_MAP_ID,
  UD100_GENERATION_BINDING_MAP_VERSION,
  UD100_GENERATION_PROFILE_ID,
  UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS,
} from './ud100GenerationBinding';
import {
  evaluateUd100BootstrapV3CompatibilityBinding,
  evaluateUd100PacketAwareGenerationBinding,
  UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING,
  UD100_PACKET_AWARE_GENERATION_BINDING,
  UD100_PACKET_AWARE_GENERATION_BINDING_MAP_VERSION,
  UD100_PACKET_AWARE_GENERATION_PROFILE_ID,
  UD100_PACKET_AWARE_GENERATOR_CONTRACT_VERSION,
} from './ud100GeneratedDraft';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Binding Ave',
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
    propertyAddress: '100 Binding Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Binding Ave',
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

const allOptionalReliefFalse = {
  fairRentalValue: false,
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
};
const fairRentalValuePositive = {
  ...allOptionalReliefFalse,
  fairRentalValue: true,
  fairRentalValuePerDay: '85.50',
  fairRentalValueDamagesFromDate: '2026-08-20',
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
          streetAddress: '100 Binding Ave',
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
        value: allOptionalReliefFalse,
        confirmation: confirmation('other-relief-none'),
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

function evaluate(
  input: FilingCanonicalFactsSupplementalInput = supplemental(),
  data: NoticeFlowData = persisted,
) {
  const facts = projectFilingCanonicalFacts(data, input);
  return {
    facts,
    result: evaluateUd100GenerationBinding(
      UD100_OFFICIAL_SOURCE_IDENTITY,
      'CURRENT',
      facts,
    ),
  };
}

const ready = evaluate();
equal(ready.facts.status, 'READY', 'exact restored Created Notice plus complete governed six-domain inputs project');
equal(ready.result.status, 'GENERATION_BINDING_READY', 'complete bounded initial pre-filing profile produces deterministic field-write plan only');
if (ready.result.status !== 'GENERATION_BINDING_READY') {
  throw new Error(`ready fixture must resolve: ${JSON.stringify(ready.result)}`);
}
equal(ready.result.documentGeneration, 'NOT_PERFORMED', 'GENERATION_BINDING_READY does not generate a document');
equal(ready.result.pdfMutation, 'NOT_PERFORMED', 'GENERATION_BINDING_READY does not mutate PDF bytes');
equal(ready.result.formApplicability, 'NOT_EVALUATED', 'D.1 does not decide applicability');
equal(ready.result.formRequiredness, 'NOT_EVALUATED', 'D.1 does not decide requiredness');
equal(UD100_GENERATION_BINDING.mapId, UD100_GENERATION_BINDING_MAP_ID, 'map id is explicit');
equal(UD100_GENERATION_BINDING.mapId, 'ud100-2026-07-01-initial-prefiling-generation-binding', 'post-R2E statutory-damages binding preserves exact map id');
equal(UD100_GENERATION_BINDING.mapVersion, '1.6.0', 'post-R2E statutory-damages binding advances exact live D.1 map version to 1.6.0');
equal(UD100_GENERATION_BINDING.mapVersion, UD100_GENERATION_BINDING_MAP_VERSION, 'post-R2E map-version export matches definition');
equal(UD100_GENERATION_BINDING.generatorContractVersion, 'ud100-field-write-plan-v6', 'post-R2E statutory-damages binding advances live generator contract to v6');
equal(UD100_GENERATION_BINDING.profileId, UD100_GENERATION_PROFILE_ID, 'bounded initial pre-filing profile remains explicit');
equal(UD100_GENERATION_BINDING.profileId, 'ud100-initial-prefiling-owner-preparation-v1', 'post-R2E statutory-damages binding preserves exact profile id');
ok(UD100_GENERATION_BINDING.mapSnapshotId.startsWith('map:sha256:'), 'map snapshot is content-addressed');
equal(validateGenerationBindingDefinition(UD100_FIELD_MAP_FOUNDATION).status, 'BLOCKED', 'six-field Stage D foundation remains not generation-capable');
equal(validateGenerationBindingDefinition(UD100_GENERATION_BINDING).status, 'VALID', 'post-R2E D.1 definition independently validates');

equal(UD100_GENERATION_BINDING.fieldRules.length, 186, 'all 186 exact-binary widgets receive executable classification');
const fieldIds = new Set(UD100_GENERATION_BINDING.fieldRules.map(rule => rule.evidence.fieldId));
const objectRefs = new Set(UD100_GENERATION_BINDING.fieldRules.map(rule => rule.evidence.objectReference));
equal(fieldIds.size, 186, 'all classified widget field IDs are unique');
equal(objectRefs.size, 186, 'all exact PDF object references are unique');
const coveredFieldIds = new Set(UD100_GENERATION_BINDING.fieldFamilyCoverage.flatMap(family => family.fieldIds));
equal(coveredFieldIds.size, 186, 'field-family coverage executablely covers every classified widget');
for (const domain of ['DOMAIN_1', 'DOMAIN_2', 'DOMAIN_3', 'DOMAIN_4', 'DOMAIN_5', 'DOMAIN_6']) {
  ok(UD100_GENERATION_BINDING.fieldFamilyCoverage.some(family => family.domainId === domain), `${domain} has executable family coverage`);
}
for (const rule of UD100_GENERATION_BINDING.fieldRules) {
  ok(rule.evidence.fieldId.startsWith('UD-100[0].'), `${rule.evidence.objectReference} carries exact UD-100 field identity`);
  ok(rule.evidence.sourcePage >= 1 && rule.evidence.sourcePage <= 4, `${rule.evidence.objectReference} carries exact page evidence`);
  ok(rule.evidence.fieldType === '/Tx' || rule.evidence.fieldType === '/Btn', `${rule.evidence.objectReference} carries exact field type`);
  ok(/^\d+ 0 R$/.test(rule.evidence.objectReference), `${rule.evidence.fieldId} carries exact indirect-object evidence`);
  ok(rule.evidence.visibleLabelEvidence.trim().length > 0, `${rule.evidence.objectReference} carries visible/alternate label evidence`);
}

const uniquePlanFields = new Set(ready.result.fieldWritePlan.map(item => item.fieldId));
equal(uniquePlanFields.size, ready.result.fieldWritePlan.length, 'successful whitelist contains no duplicate/conflicting actions');
equal(ready.result.fieldWritePlan.length, 186, 'successful bounded profile explicitly classifies every widget as write or authorized no-write');
for (const [objectReference, action] of [
  ['603 0 R', 'SET_EXPLICIT_NONSELECTION'],
  ['604 0 R', 'PRESERVE_OFFICIAL_BLANK_NO_WRITE'],
  ['895 0 R', 'SET_EXPLICIT_NONSELECTION'],
  ['896 0 R', 'PRESERVE_OFFICIAL_BLANK_NO_WRITE'],
] as const) {
  equal(ready.result.fieldWritePlan.find(item => item.objectReference === objectReference)?.action, action, `negative Item-14 route preserves exact ${objectReference} action`);
}
equal(ready.result.fieldWritePlan.find(item => item.objectReference === '602 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'confirmed statutoryDamages=false explicitly nonselects exact Item 15 checkbox');
equal(ready.result.fieldWritePlan.find(item => item.objectReference === '894 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'confirmed statutoryDamages=false explicitly nonselects exact Item 17g checkbox');
for (const objectReference of ['602 0 R', '894 0 R'] as const) {
  const statutoryRule = UD100_GENERATION_BINDING.fieldRules.find(rule => rule.evidence.objectReference === objectReference);
  ok(
    statutoryRule?.disposition === 'WRITE'
      && statutoryRule.dependencies.length === 1
      && statutoryRule.dependencies[0]?.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections
      && statutoryRule.dependencies[0]?.authorityClass === 'CUSTOMER_CONFIRMED_LEGAL_ELECTION',
    `${objectReference} statutory-damages rule depends only on the customer-confirmed legal election`,
  );
  ok(
    statutoryRule?.disposition !== 'WRITE'
      || !statutoryRule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.serviceFacts || dep.ref === CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle),
    `${objectReference} excludes notice/service and complaint-lifecycle inference authority`,
  );
}

const attorneyFor = ready.result.fieldWritePlan.find(item => item.objectReference === '855 0 R');
equal(attorneyFor?.action, 'WRITE_TEXT', 'ATTORNEY FOR is an explicit controlled write in the supported route');
if (attorneyFor?.action === 'WRITE_TEXT') {
  equal(attorneyFor.value, 'Self-represented', 'ATTORNEY FOR exact value comes from governed caption form value');
}
const attorneyForRule = UD100_GENERATION_BINDING.fieldRules.find(rule => rule.evidence.objectReference === '855 0 R');
ok(
  attorneyForRule?.disposition === 'WRITE'
    && attorneyForRule.dependencies[0]?.ref === CANONICAL_FILING_FACT_REFS.captionFormValueControl
    && attorneyForRule.dependencies[0]?.authorityClass === 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED',
  'ATTORNEY FOR rule is CONTROL-derived rather than filer-contact customer text',
);

const premises = ready.result.fieldWritePlan.find(item => item.objectReference === '799 0 R');
equal(premises?.action, 'WRITE_TEXT', 'premises field is a deterministic positive write');
if (premises?.action === 'WRITE_TEXT') {
  equal(premises.value, '100 Binding Ave, Unit 4, Glendale, 91203, Los Angeles', 'premises uses exact governed components only');
}
const courtCounty = ready.result.fieldWritePlan.find(item => item.objectReference === '840 0 R');
if (courtCounty?.action === 'WRITE_TEXT') equal(courtCounty.value, 'Los Angeles', 'selected court county comes from confirmed selectedFilingCourt');
const propertyCounty = ready.result.fieldWritePlan.find(item => item.objectReference === '796 0 R');
equal(propertyCounty?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'city-limits control makes unincorporated county subfield explicit no-write');

const cityCheckbox = ready.result.fieldWritePlan.find(item => item.objectReference === '797 0 R');
const unincorporatedCheckbox = ready.result.fieldWritePlan.find(item => item.objectReference === '795 0 R');
equal(cityCheckbox?.action, 'SET_SELECTED', 'valid city-limits control selects city checkbox');
equal(unincorporatedCheckbox?.action, 'SET_EXPLICIT_NONSELECTION', 'valid mutually exclusive control explicitly nonselects unincorporated checkbox');

const noticePayRent = ready.result.fieldWritePlan.find(item => item.objectReference === '696 0 R');
equal(noticePayRent?.action, 'SET_SELECTED', 'customer-confirmed complaint notice election selects pay-rent-or-quit');
const forfeitureIncluded = ready.result.fieldWritePlan.find(item => item.objectReference === '661 0 R');
equal(forfeitureIncluded?.action, 'SET_SELECTED', 'PROVEN Notice-content fact selects the exact forfeiture-included checkbox');
const complaintForfeiture = ready.result.fieldWritePlan.find(item => item.objectReference === '899 0 R');
equal(complaintForfeiture?.action, 'SET_EXPLICIT_NONSELECTION', 'Notice history indicating forfeiture cannot convert explicit owner complaint forfeiture=false into true');
const complaintForfeitureRule = UD100_GENERATION_BINDING.fieldRules.find(rule => rule.evidence.objectReference === '899 0 R');
ok(
  complaintForfeitureRule?.disposition === 'WRITE'
    && complaintForfeitureRule.dependencies.length === 1
    && complaintForfeitureRule.dependencies[0]?.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections
    && complaintForfeitureRule.dependencies[0]?.authorityClass === 'CUSTOMER_CONFIRMED_LEGAL_ELECTION',
  'complaint forfeiture checkbox is bound only to the customer-confirmed otherReliefSelections election',
);
ok(
  complaintForfeitureRule?.disposition !== 'WRITE'
    || !complaintForfeitureRule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.serviceFacts),
  'Notice/service history is not complaint forfeiture election authority',
);
const noticeForfeitureRule = UD100_GENERATION_BINDING.fieldRules.find(rule => rule.evidence.objectReference === '661 0 R');
ok(
  noticeForfeitureRule?.disposition === 'WRITE'
    && noticeForfeitureRule.dependencies.length === 1
    && noticeForfeitureRule.dependencies[0]?.ref === CANONICAL_FILING_FACT_REFS.serviceFacts,
  'Notice forfeiture history remains separately bound to serviceFacts only',
);
const servicePersonal = ready.result.fieldWritePlan.find(item => item.objectReference === '652 0 R');
equal(servicePersonal?.action, 'SET_SELECTED', 'customer-confirmed complaint service election selects personal hand delivery');
const serviceDate = ready.result.fieldWritePlan.find(item => item.objectReference === '653 0 R');
if (serviceDate?.action === 'WRITE_TEXT') equal(serviceDate.value, '2026-08-14', 'service date comes from authoritative lifecycle event facts');
const noticeExpirationDate = ready.result.fieldWritePlan.find(item => item.objectReference === '664 0 R');
if (noticeExpirationDate?.action === 'WRITE_TEXT') equal(noticeExpirationDate.value, '2026-08-19', 'notice-expiration date is separately supplied lifecycle evidence and is not inferred from service date');
const rentAtService = ready.result.fieldWritePlan.find(item => item.objectReference === '606 0 R');
if (rentAtService?.action === 'WRITE_TEXT') equal(rentAtService.value, '2450', 'rent due at service comes from explicit customer fact, not Notice demand');

const pastDueRent = ready.result.fieldWritePlan.find(item => item.objectReference === '902 0 R');
if (pastDueRent?.action === 'WRITE_TEXT') {
  equal(pastDueRent.value, '2400', 'complaint past-due-rent amount comes from explicit owner relief election');
  notEqual(pastDueRent.value, '2500', 'Notice demand is not silently substituted into complaint relief');
}

const agreedRentField = 'UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].dollar[0]';
const agreedRent = ready.result.fieldWritePlan.find(item => item.fieldId === agreedRentField);
equal(agreedRent?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'verified NO_AGREEMENT keeps agreed-rent source blank without Notice-demand substitution');
ok(UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS.some(item => 'fieldId' in item && item.fieldId === agreedRentField && item.prohibitedSourceRef === CANONICAL_FILING_FACT_REFS.rentDemandTotal), 'agreed-rent Notice-demand prohibition remains explicit');
ok(!UD100_GENERATION_BINDING.fieldRules.some(rule => rule.disposition === 'WRITE' && rule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.rentDemandTotal)), 'Notice demand is not reused by any writable complaint field');

const agreementInput = supplemental({
  preparation: {
    leaseStatus: { state: 'KNOWN', value: 'OTHER', verification: verification('lease-other') },
    agreementTermDescription: { state: 'KNOWN', value: 'ONE-YEAR CONTRACT', verification: verification('agreement-term') },
    agreementRentAmount: { state: 'KNOWN', value: 2500, verification: verification('agreement-rent') },
    agreementRentFrequency: { state: 'KNOWN', value: 'MONTHLY', verification: verification('agreement-frequency') },
    agreementRentDue: { state: 'KNOWN', value: 'FIRST_DAY_OF_MONTH', verification: verification('agreement-due') },
    agreementForm: { state: 'KNOWN', value: 'WRITTEN', verification: verification('agreement-form') },
    agreementParty: { state: 'KNOWN', value: 'PLAINTIFF', verification: verification('agreement-party') },
    agreementDate: { state: 'UNKNOWN' },
    leaseApplicabilityControl: {
      state: 'KNOWN',
      value: 'AGREEMENT_FIELDS_APPLICABLE',
      control: control('lease-applicability', 'agreement-applicable-v1.1'),
      dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
    },
  },
});
const agreement = evaluate(agreementInput);
equal(agreement.result.status, 'GENERATION_BINDING_READY', 'verified one-year agreement enters agreement-applicable binding');
if (agreement.result.status !== 'GENERATION_BINDING_READY') throw new Error(`agreement fixture must resolve: ${JSON.stringify(agreement.result)}`);
const planAt = (objectReference: string) => agreement.result.status === 'GENERATION_BINDING_READY'
  ? agreement.result.fieldWritePlan.find(item => item.objectReference === objectReference)
  : undefined;
equal(planAt('771 0 R')?.action, 'SET_SELECTED', 'OTHER tenancy selects exact Item 6 other-tenancy checkbox');
const tenancyDetail = planAt('772 0 R');
equal(tenancyDetail?.action, 'WRITE_TEXT', 'OTHER tenancy writes exact Item 6 term description');
if (tenancyDetail?.action === 'WRITE_TEXT') equal(tenancyDetail.value, 'ONE-YEAR CONTRACT', 'Item 6 term detail is exact Founder-supplied value');
const defendants = planAt('758 0 R');
equal(defendants?.action, 'WRITE_TEXT', 'Item 6 defendant family is written from canonical identities');
if (defendants?.action === 'WRITE_TEXT') equal(defendants.value, 'Synthetic Tenant One; Synthetic Tenant Two', 'Item 6 defendant order matches canonical defendant order');
const agreementRentPlan = planAt('766 0 R');
equal(agreementRentPlan?.action, 'WRITE_TEXT', 'agreement-applicable profile writes exact Item 6 agreed rent');
if (agreementRentPlan?.action === 'WRITE_TEXT') equal(agreementRentPlan.value, '2500', 'Item 6 agreed rent is exact verified agreement rent');
equal(planAt('767 0 R')?.action, 'SET_SELECTED', 'monthly agreement selects monthly frequency');
equal(planAt('763 0 R')?.action, 'SET_SELECTED', 'first-day agreement selects first of month');
equal(planAt('745 0 R')?.action, 'SET_SELECTED', 'written agreement selects written form');
equal(planAt('756 0 R')?.action, 'SET_SELECTED', 'plaintiff agreement party selects plaintiff');
equal(planAt('757 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'unresolved agreement date is never fabricated or derived');
equal(planAt('603 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'Item 14 fair-rental-value remains explicitly unselected');
equal(planAt('604 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'Item 14 daily amount remains blank and is not derived');
const agreedRentRule = UD100_GENERATION_BINDING.fieldRules.find(rule => rule.evidence.objectReference === '766 0 R');
ok(
  agreedRentRule?.disposition === 'WRITE'
    && agreedRentRule.dependencies[0]?.ref === CANONICAL_FILING_FACT_REFS.agreementRentAmount,
  'Item 6 agreed-rent binding depends only on canonical agreementRentAmount',
);
ok(
  agreedRentRule?.disposition !== 'WRITE'
    || !agreedRentRule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.rentDemandTotal || dep.ref === CANONICAL_FILING_FACT_REFS.rentDueAtService),
  'Item 6 agreed-rent binding excludes Notice demand and rent-at-service semantic substitutes even when values overlap',
);

const agreementRentChanged = evaluate(supplemental({
  preparation: {
    ...agreementInput.preparation,
    agreementRentAmount: { state: 'KNOWN', value: 2600, verification: verification('agreement-rent-2600') },
  },
})).result;
if (agreementRentChanged.status !== 'GENERATION_BINDING_READY') throw new Error('changed agreement rent fixture must resolve');
notEqual(agreementRentChanged.generationInputId, agreement.result.generationInputId, 'material agreement-rent change changes generation identity');
const changedAgreementRentPlan = agreementRentChanged.fieldWritePlan.find(item => item.objectReference === '766 0 R');
if (changedAgreementRentPlan?.action === 'WRITE_TEXT') equal(changedAgreementRentPlan.value, '2600', 'material agreement-rent change changes exact Item 6 output');

const excludedTelephone = evaluate(supplemental({ defendantTelephones: [{ state: 'KNOWN', value: '5555559999' }] })).result;
if (excludedTelephone.status !== 'GENERATION_BINDING_READY') throw new Error('excluded telephone fixture must resolve');
equal(excludedTelephone.generationInputId, ready.result.generationInputId, 'unreferenced excluded fact does not create false generation diff');

const unverifiedAgreement = evaluate(supplemental({
  preparation: {
    leaseStatus: { state: 'KNOWN', value: 'OTHER' },
    leaseApplicabilityControl: {
      state: 'KNOWN',
      value: 'AGREEMENT_FIELDS_APPLICABLE',
      control: control('lease-applicability', 'forged-agreement-applicable'),
      dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
    },
  },
})).result;
equal(unverifiedAgreement.status, 'BLOCKED', 'known agreement classification without customer verification cannot drive Item 6');
equal(unverifiedAgreement.fieldWritePlan.length, 0, 'unverified agreement produces zero writes');
const unresolvedLease = evaluate(supplemental({ preparation: { leaseStatus: { state: 'UNKNOWN' } } })).result;
equal(unresolvedLease.status, 'BLOCKED', 'UNKNOWN lease status is not silently converted to NO_AGREEMENT');
equal(unresolvedLease.fieldWritePlan.length, 0, 'unresolved lease status produces zero writes');

const spoofedCaptionText = supplemental({
  preparation: {
    filerContact: {
      state: 'KNOWN',
      value: {
        ...(supplemental().preparation!.filerContact as any).value,
        captionForText: 'Customer supplied counsel role',
      },
    } as any,
  },
});
const spoofedCaptionResult = evaluate(spoofedCaptionText).result;
if (spoofedCaptionResult.status !== 'GENERATION_BINDING_READY') throw new Error('caption spoof fixture must otherwise resolve');
const spoofedAttorneyFor = spoofedCaptionResult.fieldWritePlan.find(item => item.objectReference === '855 0 R');
if (spoofedAttorneyFor?.action === 'WRITE_TEXT') {
  equal(spoofedAttorneyFor.value, 'Self-represented', 'customer captionForText cannot affect ATTORNEY FOR');
  notEqual(spoofedAttorneyFor.value, 'Customer supplied counsel role', 'customer caption free text is not a form-facing authority source');
}

const missingCaptionFormValue = evaluate(supplemental({
  preparation: {
    captionFormValueControl: { state: 'UNANSWERED' },
  },
})).result;
equal(missingCaptionFormValue.status, 'BLOCKED', 'missing governed caption form value fails closed');
equal(missingCaptionFormValue.fieldWritePlan.length, 0, 'missing caption form value yields zero writes');

const staleCaptionFormValue = evaluate(supplemental({
  preparation: {
    captionFormValueControl: {
      state: 'KNOWN',
      value: 'Self-represented',
      control: control('caption-form-value', 'stale-self-represented', 'STALE'),
      dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
    },
  },
})).result;
equal(staleCaptionFormValue.status, 'BLOCKED', 'stale governed caption form value fails closed');

const detachedCaptionFormValue = evaluate(supplemental({
  preparation: {
    captionFormValueControl: {
      state: 'KNOWN',
      value: 'Self-represented',
      control: control('caption-form-value', 'detached-self-represented'),
      dependencies: [],
    },
  },
})).result;
equal(detachedCaptionFormValue.status, 'BLOCKED', 'caption form value without governed caption-route dependency fails closed');

const noUnitBase: NoticeFlowData = { ...base, propertyUnit: undefined };
const noUnitApproved: NoticeFlowData = { ...noUnitBase, ...bindReviewApproval(noUnitBase, '2026-08-14T12:10:00.000Z') };
const noUnitArtifact = captureCreatedNoticeArtifact(noUnitApproved, '2026-08-14T12:11:00.000Z', {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const noUnitPersisted: NoticeFlowData = {
  ...noUnitApproved,
  productionSnapshot: { ...persisted.productionSnapshot!, producedAtISO: '2026-08-14T12:11:00.000Z' },
  createdNoticeArtifact: noUnitArtifact,
};
const noUnitCurrentOtherReliefSelections = {
  state: 'KNOWN' as const,
  value: allOptionalReliefFalse,
  confirmation: {
    confirmationId: 'other-relief-none-no-unit',
    confirmedAtISO: '2026-08-14T12:12:00.000Z',
  },
};

const unansweredUnit = evaluate(supplemental({
  preparation: { otherReliefSelections: noUnitCurrentOtherReliefSelections },
}), noUnitPersisted);
equal(unansweredUnit.result.status, 'BLOCKED', 'UNANSWERED property unit blocks rather than authorizing omission');
equal(unansweredUnit.result.fieldWritePlan.length, 0, 'UNANSWERED unit blocker returns zero writes');

const explicitNoUnit = evaluate(
  supplemental({
    propertyUnitConfirmation: { state: 'KNOWN', value: 'NO_UNIT' },
    preparation: { otherReliefSelections: noUnitCurrentOtherReliefSelections },
  }),
  noUnitPersisted,
);
equal(explicitNoUnit.result.status, 'GENERATION_BINDING_READY', 'identity-bearing explicit NO_UNIT can resolve premises composition');
if (explicitNoUnit.result.status === 'GENERATION_BINDING_READY') {
  const noUnitPremises = explicitNoUnit.result.fieldWritePlan.find(item => item.objectReference === '799 0 R');
  if (noUnitPremises?.action === 'WRITE_TEXT') {
    equal(noUnitPremises.value, '100 Binding Ave, Glendale, 91203, Los Angeles', 'explicit NO_UNIT changes only deterministic punctuation/composition');
  }
}
const noUnitFact = readCanonicalFilingFact<PropertyUnitRepresentation>(
  explicitNoUnit.facts,
  CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation,
);
if (noUnitFact?.state === 'KNOWN') {
  equal(noUnitFact.value.kind, 'NO_UNIT', 'explicit no-unit remains distinct in fact snapshot');
  equal(noUnitFact.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', 'explicit no-unit has identity-bearing customer provenance');
}

for (const propertyUnitConfirmation of [
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'confirm unit' } as const,
  { state: 'CONFLICT', values: ['NO_UNIT'] as const, reason: 'unit conflict' } as const,
]) {
  const result = evaluate(supplemental({
    propertyUnitConfirmation,
    preparation: { otherReliefSelections: noUnitCurrentOtherReliefSelections },
  }), noUnitPersisted).result;
  equal(result.status, 'BLOCKED', `${propertyUnitConfirmation.state} unit state cannot authorize omission`);
  equal(result.fieldWritePlan.length, 0, `${propertyUnitConfirmation.state} unit state yields zero writes`);
}

const malformedMunicipal = evaluate(supplemental({
  preparation: {
    municipalClassification: {
      state: 'KNOWN',
      value: 'MALFORMED_RUNTIME_VALUE' as any,
      control: control('municipal-classification', 'malformed-but-current'),
    },
  },
})).result;
equal(malformedMunicipal.status, 'BLOCKED', 'malformed CURRENT municipal value hard-blocks');
equal(malformedMunicipal.fieldWritePlan.length, 0, 'malformed enum value produces zero checkbox writes');

const unincorporated = evaluate(supplemental({
  preparation: {
    municipalClassification: {
      state: 'KNOWN',
      value: 'UNINCORPORATED_AREA',
      control: control('municipal-classification', 'unincorporated'),
    },
  },
})).result;
equal(unincorporated.status, 'GENERATION_BINDING_READY', 'second exact municipal choice is valid');
if (unincorporated.status === 'GENERATION_BINDING_READY') {
  equal(unincorporated.fieldWritePlan.find(item => item.objectReference === '795 0 R')?.action, 'SET_SELECTED', 'unincorporated choice selects only its checkbox');
  equal(unincorporated.fieldWritePlan.find(item => item.objectReference === '797 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'unincorporated choice nonselects city checkbox');
  equal(unincorporated.fieldWritePlan.find(item => item.objectReference === '796 0 R')?.action, 'WRITE_TEXT', 'unincorporated choice writes county detail');
  equal(unincorporated.fieldWritePlan.find(item => item.objectReference === '798 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'unincorporated choice preserves city detail blank');
}

const lifecycleOnlyService = evaluate(supplemental({
  preparation: {
    serviceComplaintElection: { state: 'UNANSWERED' },
  },
})).result;
equal(lifecycleOnlyService.status, 'BLOCKED', 'authoritative service facts cannot choose complaint-side service legal election');
equal(lifecycleOnlyService.fieldWritePlan.length, 0, 'missing owner service election yields zero writes');

const unconfirmedServiceElection = evaluate(supplemental({
  preparation: {
    serviceComplaintElection: { state: 'KNOWN', value: 'PERSONAL_HAND_DELIVERY' },
  },
})).result;
equal(unconfirmedServiceElection.status, 'BLOCKED', 'KNOWN service election without affirmative customer confirmation provenance blocks');

const unconfirmedNoticeElection = evaluate(supplemental({
  preparation: {
    noticeComplaintElection: { state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY' },
  },
})).result;
equal(unconfirmedNoticeElection.status, 'BLOCKED', 'Notice artifact/lifecycle cannot substitute for affirmative complaint notice election confirmation');

const detachedNoticeConsistency = evaluate(supplemental({
  preparation: {
    noticeElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('notice-election-consistency', 'detached-current'),
      dependencies: [],
    },
  },
})).result;
equal(detachedNoticeConsistency.status, 'BLOCKED', 'CURRENT Notice-consistency token without separate election dependency blocks');

const inconsistentServiceControl = evaluate(supplemental({
  preparation: {
    serviceElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('service-election-consistency', 'stale', 'STALE'),
    },
  },
})).result;
equal(inconsistentServiceControl.status, 'BLOCKED', 'service-election consistency requires explicit versioned CURRENT control provenance');

const detachedServiceConsistency = evaluate(supplemental({
  preparation: {
    serviceElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('service-election-consistency', 'detached-current'),
      dependencies: [],
    },
  },
})).result;
equal(detachedServiceConsistency.status, 'BLOCKED', 'CURRENT service-consistency token without the governed service/election provenance dependencies blocks');
equal(detachedServiceConsistency.fieldWritePlan.length, 0, 'detached service-consistency provenance produces zero writes');

const detachedCivilControl = evaluate(supplemental({
  preparation: {
    civilClassificationControl: {
      state: 'KNOWN',
      value: 'LIMITED_LE_10000',
      control: control('civil-classification', 'detached-current'),
      dependencies: [],
    },
  },
})).result;
equal(detachedCivilControl.status, 'BLOCKED', 'CURRENT civil-classification token without complaint-relief provenance dependencies blocks');
equal(detachedCivilControl.fieldWritePlan.length, 0, 'detached civil-classification provenance produces zero writes');

const malformedCivil = evaluate(supplemental({
  preparation: {
    civilClassificationControl: {
      state: 'KNOWN',
      value: 'WRONG_CLASSIFICATION' as any,
      control: control('civil-classification', 'wrong-current'),
      dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
    },
  },
})).result;
equal(malformedCivil.status, 'BLOCKED', 'malformed CURRENT civil classification blocks exact checkbox domain');
equal(malformedCivil.fieldWritePlan.length, 0, 'malformed civil classification returns zero writes');

const staleTpa = evaluate(supplemental({
  preparation: {
    tpaClassificationControl: {
      state: 'KNOWN',
      value: 'SUBJECT_AT_FAULT',
      control: control('tpa-classification', 'stale', 'STALE'),
    },
  },
})).result;
equal(staleTpa.status, 'BLOCKED', 'deterministic TPA family requires versioned CURRENT provenance');

const noPastDueRelief = evaluate(supplemental({
  preparation: {
    pastDueRentRelief: {
      state: 'KNOWN',
      value: { selected: false },
      confirmation: confirmation('past-due-no'),
    },
  },
})).result;
equal(noPastDueRelief.status, 'GENERATION_BINDING_READY', 'explicit owner nonselection of past-due-rent relief is governed');
if (noPastDueRelief.status === 'GENERATION_BINDING_READY') {
  equal(noPastDueRelief.fieldWritePlan.find(item => item.objectReference === '901 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'explicit no relief becomes explicit checkbox nonselection');
  equal(noPastDueRelief.fieldWritePlan.find(item => item.objectReference === '902 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'explicit no relief authorizes no amount write');
}

const selectedPastDueWithoutAmount = evaluate(supplemental({
  preparation: {
    pastDueRentRelief: {
      state: 'KNOWN',
      value: { selected: true },
      confirmation: confirmation('past-due-missing-amount'),
    },
  },
})).result;
equal(selectedPastDueWithoutAmount.status, 'BLOCKED', 'selected complaint relief requires every selected amount prerequisite');
equal(selectedPastDueWithoutAmount.fieldWritePlan.length, 0, 'missing selected relief amount yields zero writes');

const fairRentalPositive = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: fairRentalValuePositive,
      confirmation: { confirmationId: 'fair-rental-positive', confirmedAtISO: '2026-08-14T12:03:00.000Z' },
    },
  },
})).result;
equal(fairRentalPositive.status, 'GENERATION_BINDING_READY', 'exact current owner Item-14 election with exact rate/date is admitted');
if (fairRentalPositive.status !== 'GENERATION_BINDING_READY') throw new Error(`fair-rental positive fixture must resolve: ${JSON.stringify(fairRentalPositive)}`);
const fairRentalPlan = (objectReference: string) => fairRentalPositive.fieldWritePlan.find(item => item.objectReference === objectReference);
equal(fairRentalPlan('603 0 R')?.action, 'SET_SELECTED', 'positive Item 14 selects 603');
equal(fairRentalPlan('895 0 R')?.action, 'SET_SELECTED', 'positive Item 17f selects 895');
const fairRentalRate = fairRentalPlan('604 0 R');
equal(fairRentalRate?.action, 'WRITE_TEXT', 'positive Item 14 writes exact per-day rate');
if (fairRentalRate?.action === 'WRITE_TEXT') equal(fairRentalRate.value, '85.50', 'per-day rate preserves exact owner-supplied decimal text');
const fairRentalDate = fairRentalPlan('896 0 R');
equal(fairRentalDate?.action, 'WRITE_TEXT', 'positive Item 17f writes exact damages-from date');
if (fairRentalDate?.action === 'WRITE_TEXT') equal(fairRentalDate.value, '2026-08-20', 'damages-from date preserves exact owner-supplied YYYY-MM-DD');
for (const objectReference of ['604 0 R', '896 0 R']) {
  const rule = UD100_GENERATION_BINDING.fieldRules.find(item => item.evidence.objectReference === objectReference);
  ok(rule?.disposition === 'WRITE' && rule.dependencies.length === 1 && rule.dependencies[0].ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections, `${objectReference} depends only on exact otherReliefSelections election`);
  ok(rule?.disposition !== 'WRITE' || (rule.condition?.dependency.ref === CANONICAL_FILING_FACT_REFS.otherReliefSelections && rule.condition.property === 'fairRentalValue'), `${objectReference} is conditioned only on fairRentalValue from the same election`);
}
notEqual(fairRentalPositive.generationInputId, ready.result.generationInputId, 'positive Item-14 election changes generation identity');

const fairRentalRateChanged = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...fairRentalValuePositive, fairRentalValuePerDay: '86' },
      confirmation: { confirmationId: 'fair-rental-rate-changed', confirmedAtISO: '2026-08-14T12:03:00.000Z' },
    },
  },
})).result;
if (fairRentalRateChanged.status !== 'GENERATION_BINDING_READY') throw new Error('changed fair-rental rate fixture must resolve');
notEqual(fairRentalRateChanged.generationInputId, fairRentalPositive.generationInputId, 'exact per-day rate change changes generation identity');
const changedRatePlan = fairRentalRateChanged.fieldWritePlan.find(item => item.objectReference === '604 0 R');
if (changedRatePlan?.action === 'WRITE_TEXT') equal(changedRatePlan.value, '86', 'changed exact per-day rate changes only authorized output value');

const fairRentalDateChanged = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...fairRentalValuePositive, fairRentalValueDamagesFromDate: '2026-08-21' },
      confirmation: { confirmationId: 'fair-rental-date-changed', confirmedAtISO: '2026-08-14T12:03:00.000Z' },
    },
  },
})).result;
if (fairRentalDateChanged.status !== 'GENERATION_BINDING_READY') throw new Error('changed fair-rental date fixture must resolve');
notEqual(fairRentalDateChanged.generationInputId, fairRentalPositive.generationInputId, 'exact damages-from date change changes generation identity');

const fairRentalNegativeWithDetails = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, fairRentalValuePerDay: '85.50', fairRentalValueDamagesFromDate: '2026-08-20' } as any,
      confirmation: confirmation('fair-rental-negative-contradiction'),
    },
  },
})).result;
equal(fairRentalNegativeWithDetails.status, 'BLOCKED', 'fairRentalValue=false with supplied rate/date is contradictory and blocks');
equal(fairRentalNegativeWithDetails.fieldWritePlan.length, 0, 'contradictory negative route produces zero writes');

for (const value of [
  { ...fairRentalValuePositive, fairRentalValuePerDay: undefined },
  { ...fairRentalValuePositive, fairRentalValueDamagesFromDate: undefined },
] as any[]) {
  const result = evaluate(supplemental({ preparation: { otherReliefSelections: { state: 'KNOWN', value, confirmation: confirmation('fair-rental-missing-detail') } } })).result;
  equal(result.status, 'BLOCKED', 'positive fair-rental election missing either exact detail blocks');
}
for (const badRate of ['$85', '85.', '85.500', '1e2', '-1', '+85', ' 85', '85 ', '1,000', '', NaN, Infinity, { value: '85' }, ['85']] as any[]) {
  const result = evaluate(supplemental({
    preparation: {
      otherReliefSelections: {
        state: 'KNOWN',
        value: { ...fairRentalValuePositive, fairRentalValuePerDay: badRate } as any,
        confirmation: confirmation('fair-rental-bad-rate'),
      },
    },
  })).result;
  equal(result.status, 'BLOCKED', `malformed fair-rental rate ${JSON.stringify(badRate)} blocks`);
}
for (const badDate of ['2026-02-30', '2026-2-20', '08/20/2026', '2026-08-20T00:00:00.000Z', ' 2026-08-20', '2026-08-20 ', '', '2026-13-01']) {
  const result = evaluate(supplemental({
    preparation: {
      otherReliefSelections: {
        state: 'KNOWN',
        value: { ...fairRentalValuePositive, fairRentalValueDamagesFromDate: badDate },
        confirmation: confirmation('fair-rental-bad-date'),
      },
    },
  })).result;
  equal(result.status, 'BLOCKED', `malformed fair-rental date ${JSON.stringify(badDate)} blocks`);
}
for (const malformedValue of [
  { ...allOptionalReliefFalse, unexpectedKey: true },
  { fairRentalValue: false, statutoryDamages: false, relocationDamages: false, forfeiture: false, attorneyFees: false, otherRelief: false },
  { ...allOptionalReliefFalse, statutoryDamages: 'false' },
] as any[]) {
  const result = evaluate(supplemental({ preparation: { otherReliefSelections: { state: 'KNOWN', value: malformedValue, confirmation: confirmation('fair-rental-bad-shape') } } })).result;
  equal(result.status, 'BLOCKED', 'unknown key, missing required boolean, or nonboolean election flag blocks');
}
const missingFairRentalConfirmation = evaluate(supplemental({
  preparation: {
    otherReliefSelections: { state: 'KNOWN', value: fairRentalValuePositive },
  },
})).result;
equal(missingFairRentalConfirmation.status, 'BLOCKED', 'missing Item-14 legal-election confirmation blocks');
const malformedFairRentalConfirmation = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: fairRentalValuePositive,
      confirmation: { confirmationId: '', confirmedAtISO: 'not-a-timestamp' },
    },
  },
})).result;
equal(malformedFairRentalConfirmation.status, 'BLOCKED', 'malformed Item-14 legal-election confirmation blocks');
const preNoticeFairRentalConfirmation = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: fairRentalValuePositive,
      confirmation: { confirmationId: 'pre-notice', confirmedAtISO: '2026-08-14T12:00:00.000Z' },
    },
  },
})).result;
equal(preNoticeFairRentalConfirmation.status, 'BLOCKED', 'pre-Created-Notice Item-14 confirmation is not current and blocks');

const statutoryDamagesPositive = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, statutoryDamages: true },
      confirmation: confirmation('statutory-damages-positive'),
    },
  },
})).result;
equal(statutoryDamagesPositive.status, 'GENERATION_BINDING_READY', 'exact confirmed owner statutoryDamages=true election is admitted without entitlement inference');
if (statutoryDamagesPositive.status !== 'GENERATION_BINDING_READY') throw new Error(`statutory-damages positive fixture must resolve: ${JSON.stringify(statutoryDamagesPositive)}`);
equal(statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === '602 0 R')?.action, 'SET_SELECTED', 'owner statutoryDamages=true selects exact Item 15 checkbox');
equal(statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === '894 0 R')?.action, 'SET_SELECTED', 'owner statutoryDamages=true selects exact Item 17g checkbox');
for (const objectReference of ['702 0 R','603 0 R','893 0 R','895 0 R','897 0 R','899 0 R','900 0 R','903 0 R'] as const) {
  equal(statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === objectReference)?.action, 'SET_EXPLICIT_NONSELECTION', `statutory-damages election does not select unrelated optional-relief checkbox ${objectReference}`);
}
for (const objectReference of ['604 0 R','892 0 R','896 0 R','898 0 R'] as const) {
  equal(statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === objectReference)?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', `statutory-damages election generates no unrelated relief amount/text at ${objectReference}`);
}
equal(statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === '901 0 R')?.action, 'SET_SELECTED', 'statutory-damages election does not alter existing past-due-rent selection');
const statutoryPastDueAmount = statutoryDamagesPositive.fieldWritePlan.find(item => item.objectReference === '902 0 R');
equal(statutoryPastDueAmount?.action, 'WRITE_TEXT', 'statutory-damages election does not alter existing past-due-rent amount action');
if (statutoryPastDueAmount?.action === 'WRITE_TEXT') equal(statutoryPastDueAmount.value, '2400', 'statutory-damages election does not calculate or alter past-due-rent amount');
ok(!statutoryDamagesPositive.fieldWritePlan.some(item => (item.objectReference === '602 0 R' || item.objectReference === '894 0 R') && item.action === 'WRITE_TEXT'), 'source-native statutory-damages labels, including printed up-to-$600 text, create no generated dollar amount');
notEqual(statutoryDamagesPositive.generationInputId, ready.result.generationInputId, 'material statutory-damages owner election changes generation identity');
equal(statutoryDamagesPositive.documentGeneration, 'NOT_PERFORMED', 'statutory-damages binding does not generate a document');
equal(statutoryDamagesPositive.pdfMutation, 'NOT_PERFORMED', 'statutory-damages binding does not mutate PDF bytes');

const serviceHistoryChangedStatutoryFalse = evaluate(supplemental({
  preparation: {
    serviceFacts: {
      state: 'KNOWN',
      value: {
        defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
        serviceDate: '2026-08-14',
        noticeExpirationDate: '2026-08-19',
        serviceMethod: 'PERSONAL_HAND_DELIVERY',
        noticeIncludedForfeiture: false,
      },
      event: event('NOTICE_SERVICE_FACTS', 'service-history-changed-stat-false'),
    },
    serviceElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('service-election-consistency', 'consistent-stat-false-history'),
      dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
    },
    otherReliefSelections: {
      state: 'KNOWN',
      value: allOptionalReliefFalse,
      confirmation: confirmation('statutory-damages-false-history-changed'),
    },
  },
})).result;
equal(serviceHistoryChangedStatutoryFalse.status, 'GENERATION_BINDING_READY', 'notice/service history changes cannot create a statutory-damages complaint election from owner false');
if (serviceHistoryChangedStatutoryFalse.status !== 'GENERATION_BINDING_READY') throw new Error(`statutory false/history fixture must resolve: ${JSON.stringify(serviceHistoryChangedStatutoryFalse)}`);
equal(serviceHistoryChangedStatutoryFalse.fieldWritePlan.find(item => item.objectReference === '602 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'service history cannot select Item 15 when owner statutoryDamages=false');
equal(serviceHistoryChangedStatutoryFalse.fieldWritePlan.find(item => item.objectReference === '894 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'service history cannot select Item 17g when owner statutoryDamages=false');

const serviceHistoryChangedStatutoryTrue = evaluate(supplemental({
  preparation: {
    serviceFacts: {
      state: 'KNOWN',
      value: {
        defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
        serviceDate: '2026-08-14',
        noticeExpirationDate: '2026-08-19',
        serviceMethod: 'PERSONAL_HAND_DELIVERY',
        noticeIncludedForfeiture: false,
      },
      event: event('NOTICE_SERVICE_FACTS', 'service-history-changed-stat-true'),
    },
    serviceElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('service-election-consistency', 'consistent-stat-true-history'),
      dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
    },
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, statutoryDamages: true },
      confirmation: confirmation('statutory-damages-true-history-changed'),
    },
  },
})).result;
equal(serviceHistoryChangedStatutoryTrue.status, 'GENERATION_BINDING_READY', 'notice/service history changes cannot veto confirmed owner statutoryDamages=true');
if (serviceHistoryChangedStatutoryTrue.status !== 'GENERATION_BINDING_READY') throw new Error(`statutory true/history fixture must resolve: ${JSON.stringify(serviceHistoryChangedStatutoryTrue)}`);
equal(serviceHistoryChangedStatutoryTrue.fieldWritePlan.find(item => item.objectReference === '602 0 R')?.action, 'SET_SELECTED', 'owner election still selects Item 15 after unrelated service-history change');
equal(serviceHistoryChangedStatutoryTrue.fieldWritePlan.find(item => item.objectReference === '894 0 R')?.action, 'SET_SELECTED', 'owner election still selects Item 17g after unrelated service-history change');

const unconfirmedStatutoryDamages = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, statutoryDamages: true },
    },
  },
})).result;
equal(unconfirmedStatutoryDamages.status, 'BLOCKED', 'KNOWN statutoryDamages=true without customer legal-election confirmation fails closed');
equal(unconfirmedStatutoryDamages.fieldWritePlan.length, 0, 'unconfirmed statutory-damages election produces zero writes');
const unresolvedStatutoryDamages = evaluate(supplemental({
  preparation: {
    otherReliefSelections: { state: 'REQUIRES_CONFIRMATION', reason: 'confirm statutory-damages owner election' },
  },
})).result;
equal(unresolvedStatutoryDamages.status, 'BLOCKED', 'unresolved statutory-damages owner election fails closed');
equal(unresolvedStatutoryDamages.fieldWritePlan.length, 0, 'unresolved statutory-damages election produces zero writes');

for (const heldRelief of ['relocationDamages','attorneyFees','otherRelief','otherAllegations'] as const) {
  const result = evaluate(supplemental({
    preparation: {
      otherReliefSelections: {
        state: 'KNOWN',
        value: { ...allOptionalReliefFalse, [heldRelief]: true },
        confirmation: confirmation(`held-${heldRelief}`),
      },
    },
  })).result;
  equal(result.status, 'BLOCKED', `${heldRelief} remains held under property-level profile ceiling`);
}

const forfeiturePositive = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, forfeiture: true },
      confirmation: confirmation('forfeiture-positive'),
    },
  },
})).result;
equal(forfeiturePositive.status, 'GENERATION_BINDING_READY', 'exact confirmed owner forfeiture=true election is admitted');
if (forfeiturePositive.status !== 'GENERATION_BINDING_READY') throw new Error(`forfeiture positive fixture must resolve: ${JSON.stringify(forfeiturePositive)}`);
equal(forfeiturePositive.fieldWritePlan.find(item => item.objectReference === '899 0 R')?.action, 'SET_SELECTED', 'owner forfeiture=true selects only exact complaint forfeiture checkbox');
for (const objectReference of ['893 0 R','894 0 R','897 0 R','900 0 R','903 0 R'] as const) {
  equal(forfeiturePositive.fieldWritePlan.find(item => item.objectReference === objectReference)?.action, 'SET_EXPLICIT_NONSELECTION', `forfeiture election does not select unrelated optional-relief checkbox ${objectReference}`);
}
equal(forfeiturePositive.documentGeneration, 'NOT_PERFORMED', 'forfeiture binding does not generate a document');
equal(forfeiturePositive.pdfMutation, 'NOT_PERFORMED', 'forfeiture binding does not mutate PDF bytes');

const noticeFalseOwnerForfeitureTrue = evaluate(supplemental({
  preparation: {
    serviceFacts: {
      state: 'KNOWN',
      value: {
        defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
        serviceDate: '2026-08-14',
        noticeExpirationDate: '2026-08-19',
        serviceMethod: 'PERSONAL_HAND_DELIVERY',
        noticeIncludedForfeiture: false,
      },
      event: event('NOTICE_SERVICE_FACTS', 'service-no-forfeiture'),
    },
    serviceElectionConsistencyControl: {
      state: 'KNOWN',
      value: 'CONSISTENT',
      control: control('service-election-consistency', 'consistent-no-notice-forfeiture'),
      dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
    },
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, forfeiture: true },
      confirmation: confirmation('forfeiture-positive-notice-false'),
    },
  },
})).result;
equal(noticeFalseOwnerForfeitureTrue.status, 'GENERATION_BINDING_READY', 'Notice history without forfeiture cannot veto confirmed owner complaint forfeiture=true');
if (noticeFalseOwnerForfeitureTrue.status !== 'GENERATION_BINDING_READY') throw new Error(`notice-false owner-forfeiture fixture must resolve: ${JSON.stringify(noticeFalseOwnerForfeitureTrue)}`);
equal(noticeFalseOwnerForfeitureTrue.fieldWritePlan.find(item => item.objectReference === '661 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'Notice-history checkbox remains false when notice did not include forfeiture');
equal(noticeFalseOwnerForfeitureTrue.fieldWritePlan.find(item => item.objectReference === '899 0 R')?.action, 'SET_SELECTED', 'separate confirmed owner complaint election independently selects forfeiture checkbox');

const unconfirmedForfeiture = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, forfeiture: true },
    },
  },
})).result;
equal(unconfirmedForfeiture.status, 'BLOCKED', 'KNOWN forfeiture=true without customer legal-election confirmation fails closed');
equal(unconfirmedForfeiture.fieldWritePlan.length, 0, 'unconfirmed forfeiture election produces zero writes');

const selectedFairRentalUnsupported = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, fairRentalValue: true },
      confirmation: confirmation('fair-rental-selected-without-details'),
    },
  },
})).result;
equal(selectedFairRentalUnsupported.status, 'BLOCKED', 'selected fair-rental relief without exact rate/date blocks rather than leaving fields blank');
equal(selectedFairRentalUnsupported.fieldWritePlan.length, 0, 'incomplete selected fair-rental relief returns zero writes');

const missingReliefReview = evaluate(supplemental({
  preparation: {
    otherReliefSelections: { state: 'UNANSWERED' },
  },
})).result;
equal(missingReliefReview.status, 'BLOCKED', 'unreviewed optional relief cannot silently become unchecked');

const changedZip = evaluate(supplemental({ propertyZip: { state: 'KNOWN', value: '91204' } })).result;
if (changedZip.status !== 'GENERATION_BINDING_READY') throw new Error('changed ZIP fixture must resolve');
notEqual(changedZip.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'referenced ZIP value changes fact snapshot identity');
notEqual(changedZip.generationInputId, ready.result.generationInputId, 'referenced ZIP value changes generation-input identity');

const changedElectionConfirmation = evaluate(supplemental({
  preparation: {
    noticeComplaintElection: {
      state: 'KNOWN',
      value: 'PAY_RENT_OR_QUIT_3_DAY',
      confirmation: confirmation('notice-election-confirmation-2'),
    },
  },
})).result;
if (changedElectionConfirmation.status !== 'GENERATION_BINDING_READY') throw new Error('changed confirmation fixture must resolve');
notEqual(changedElectionConfirmation.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'customer legal-election confirmation identity changes referenced fact snapshot');

const changedControlIdentity = evaluate(supplemental({
  preparation: {
    civilClassificationControl: {
      state: 'KNOWN',
      value: 'LIMITED_LE_10000',
      control: control('civil-classification', 'limited-new-evidence'),
      dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
    },
  },
})).result;
if (changedControlIdentity.status !== 'GENERATION_BINDING_READY') throw new Error('changed control fixture must resolve');
notEqual(changedControlIdentity.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'control result identity changes referenced fact snapshot');

const outsideAttorney = evaluate(supplemental({
  preparation: {
    captionRouteControl: {
      state: 'KNOWN',
      value: 'OUTSIDE_ATTORNEY_UNSUPPORTED',
      control: control('caption-route', 'outside-attorney'),
    },
  },
})).result;
equal(outsideAttorney.status, 'BLOCKED', 'outside-attorney caption route hard-blocks current profile');

const priorComplaint = evaluate(supplemental({
  preparation: {
    initialComplaintLifecycle: {
      state: 'KNOWN',
      value: 'PRIOR_COMPLAINT_EXISTS',
      event: event('INITIAL_COMPLAINT_STATUS', 'prior-complaint'),
    },
  },
})).result;
equal(priorComplaint.status, 'BLOCKED', 'amended/prior-complaint path hard-blocks current initial profile');

const unsupportedJurisdiction = evaluate(supplemental({
  preparation: {
    jurisdictionSupportControl: {
      state: 'KNOWN',
      value: 'UNSUPPORTED',
      control: control('jurisdiction-support', 'unsupported'),
    },
  },
})).result;
equal(unsupportedJurisdiction.status, 'BLOCKED', 'unsupported jurisdiction/control state hard-blocks');

const paidUda = evaluate(supplemental({
  preparation: {
    udaDisclosureControl: {
      state: 'KNOWN',
      value: 'PAID_ASSISTANCE' as any,
      control: control('uda-disclosure', 'paid'),
    },
  },
})).result;
equal(paidUda.status, 'BLOCKED', 'paid UDA/LDA path remains unsupported before activation');

for (const scenario of ['MODEL_DRAFTED_OPEN_ENDED_ALLEGATION', 'PAID_COMPLIANCE_PATH_BEFORE_ACTIVATION']) {
  const facts = projectFilingCanonicalFacts(persisted, supplemental());
  const result = evaluateUd100GenerationBinding(
    UD100_OFFICIAL_SOURCE_IDENTITY,
    'CURRENT',
    facts,
    { unsupportedScenarios: [scenario] },
  );
  equal(result.status, 'BLOCKED', `${scenario} hard-blocks with no fallback/default`);
  equal(result.fieldWritePlan.length, 0, `${scenario} returns zero writes`);
}

for (const health of [undefined, 'STALE', 'CHANGED', 'UNAVAILABLE', 'UNRESOLVED'] as const) {
  equal(
    evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, health, ready.facts).status,
    'BLOCKED',
    `${health ?? 'missing'} exact-source health blocks`,
  );
}
const wrongBytes = {
  ...UD100_OFFICIAL_SOURCE_IDENTITY,
  repositorySha256: '0'.repeat(64),
  sourceSnapshotId: `sha256:${'0'.repeat(64)}`,
  artifactId: `ca_judicial_council:UD-100:2026-07-01:sha256:${'0'.repeat(64)}`,
};
equal(evaluateUd100GenerationBinding(wrongBytes, 'CURRENT', ready.facts).status, 'BLOCKED', 'same revision with different exact bytes blocks');

const sourceText = readFileSync(new URL('./ud100GenerationBinding.ts', import.meta.url), 'utf8');
ok(!/captionForText/.test(sourceText), 'official-form binding contains no customer caption free-text transform');
ok(!/pdf-lib|writeFile|appendFile|fetch\(|XMLHttpRequest|supabase|database|localStorage|sessionStorage|FormData|model\.generate|signDocument|fileDocument|serveDocument/.test(sourceText), 'D.1 profile has no PDF mutation, network, persistence, provider/model, signing, filing, or service execution path');

function packetControl(value: any, resultId: string, dependencies: readonly string[] = []): any {
  return {
    state: 'KNOWN',
    value,
    control: {
      controlId: 'ud100.packet-composition',
      controlVersion: '1.0.0',
      resultId,
      status: 'CURRENT',
    },
    dependencies: [...dependencies],
  };
}
function packetArtifact(artifactRole: string, artifactId: string, hex: string): any {
  return {
    artifactId,
    artifactRole,
    sha256: hex.repeat(64),
    byteLength: 2048,
    createdNotice: {
      generation: artifact.generation,
      createdAtISO: artifact.createdAtISO,
    },
  };
}
function packetComposition(overrides: Record<string, unknown> = {}): any {
  return {
    agreement: packetControl(
      { kind: 'NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT' },
      'agreement-not-applicable',
      [CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl],
    ),
    notice: packetControl({
      kind: 'EXHIBIT_2_ATTACHED',
      requiredNoticeCount: 1,
      artifacts: [packetArtifact('EXHIBIT_2_NOTICE', 'notice-artifact-a', 'a')],
    }, 'notice-exhibit-2'),
    proofOfService: packetControl({ kind: 'NOT_ATTACHED' }, 'proof-not-attached'),
    attachment10c: packetControl({ kind: 'NOT_APPLICABLE' }, 'attachment10c-not-applicable'),
    ...overrides,
  };
}
function withPacket(
  input: FilingCanonicalFactsSupplementalInput,
  packet: any,
): FilingCanonicalFactsSupplementalInput {
  return {
    ...input,
    preparation: {
      ...input.preparation,
      packetComposition: packet,
    },
  };
}
function evaluatePacket(
  input: FilingCanonicalFactsSupplementalInput = withPacket(supplemental(), packetComposition()),
) {
  const facts = projectFilingCanonicalFacts(persisted, input);
  return {
    facts,
    result: evaluateUd100PacketAwareGenerationBinding(
      UD100_OFFICIAL_SOURCE_IDENTITY,
      'CURRENT',
      facts,
    ),
  };
}
function packetPlanAction(result: ReturnType<typeof evaluatePacket>['result'], objectReference: string) {
  return result.status === 'GENERATION_BINDING_READY'
    ? result.fieldWritePlan.find(item => item.objectReference === objectReference)?.action
    : undefined;
}

// B2 identity/versioning and frozen B1 compatibility invariants.
equal(validateGenerationBindingDefinition(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING).status, 'VALID', 'frozen B1 compatibility definition independently validates');
equal(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapSnapshotId, 'map:sha256:50bd844d22bfd419ecea4131e17b9e5d681edbc2f7726881a4cc55bc06db287d', 'bootstrap-v3 compatibility binding preserves exact released B1 map snapshot');
equal(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapVersion, '1.3.0', 'bootstrap-v3 compatibility map version remains B1 1.3.0');
equal(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.generatorContractVersion, 'ud100-field-write-plan-v3', 'bootstrap-v3 compatibility generator contract remains B1 v3');
equal(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.profileId, UD100_GENERATION_BINDING.profileId, 'bootstrap-v3 compatibility profile identity remains exact B1 profile');
notEqual(UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'live post-R2E map is decoupled from frozen B1 compatibility');
const b1Baseline = evaluateUd100BootstrapV3CompatibilityBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', ready.facts);
equal(b1Baseline.status, 'GENERATION_BINDING_READY', 'frozen B1 evaluator still admits exact released baseline');
if (b1Baseline.status !== 'GENERATION_BINDING_READY') throw new Error('frozen B1 baseline must remain ready');
equal(b1Baseline.referencedFactSnapshotId, 'facts:sha256:4eb3d2c5ce8b0f5ea383121589d40c00d48fdfbbd18257daacdc4d1e0496d3af', 'frozen B1 referenced-fact snapshot remains exact released baseline');
equal(b1Baseline.generationInputId, 'generation-input:sha256:1590fa08d313e2367e2e50d39d471e2badd32b6cfaf5ce77030a7926bd3dff20', 'frozen B1 generation-input identity remains exact released baseline');
equal(JSON.stringify(b1Baseline.fieldWritePlan), JSON.stringify(ready.result.fieldWritePlan), 'negative baseline live post-R2E binding and frozen B1 preserve byte-for-byte JSON-equivalent field plan');
const b1PositiveBlock = evaluateUd100BootstrapV3CompatibilityBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', projectFilingCanonicalFacts(persisted, supplemental({ preparation: { otherReliefSelections: { state: 'KNOWN', value: fairRentalValuePositive, confirmation: confirmation('b1-positive-block') } } })));
equal(b1PositiveBlock.status, 'BLOCKED', 'frozen B1 compatibility evaluator does not consume R2-D Item-14 positive election');
equal(b1PositiveBlock.fieldWritePlan.length, 0, 'frozen B1 positive Item-14 scenario yields zero writes');

equal(validateGenerationBindingDefinition(UD100_PACKET_AWARE_GENERATION_BINDING).status, 'VALID', 'packet-aware D.1 definition independently validates');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.mapVersion, '1.4.0', 'packet-aware B2 map version remains 1.4.0');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.mapVersion, UD100_PACKET_AWARE_GENERATION_BINDING_MAP_VERSION, 'packet-aware map version export matches binding');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.generatorContractVersion, 'ud100-field-write-plan-v4', 'packet-aware B2 generator contract remains v4');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.generatorContractVersion, UD100_PACKET_AWARE_GENERATOR_CONTRACT_VERSION, 'packet-aware generator contract export matches binding');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.profileId, 'ud100-initial-prefiling-owner-preparation-v2', 'packet-aware B2 profile identity remains v2');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.profileId, UD100_PACKET_AWARE_GENERATION_PROFILE_ID, 'packet-aware profile export matches binding');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.mapSnapshotId, 'map:sha256:715355e568143d4edc5edff7624b80128639c5195959bd984b828f685fde0223', 'packet-aware B2 map snapshot remains exact released baseline');
notEqual(UD100_PACKET_AWARE_GENERATION_BINDING.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'packet-aware compatibility remains distinct from live post-R2E map');
equal(UD100_PACKET_AWARE_GENERATION_BINDING.fieldRules.length, 186, 'packet-aware binding preserves exact 186-field classification count');
equal(new Set(UD100_PACKET_AWARE_GENERATION_BINDING.fieldRules.map(rule => rule.evidence.fieldId)).size, 186, 'packet-aware field IDs remain unique');
equal(new Set(UD100_PACKET_AWARE_GENERATION_BINDING.fieldRules.map(rule => rule.evidence.objectReference)).size, 186, 'packet-aware object references remain unique');

const packetDefault = evaluatePacket();
equal(packetDefault.facts.status, 'READY', 'exact B1 packet inputs project into canonical D.1 facts');
equal(packetDefault.result.status, 'GENERATION_BINDING_READY', 'resolved packet-aware current profile admits deterministic write plan');
if (packetDefault.result.status !== 'GENERATION_BINDING_READY') throw new Error(`packet default must resolve: ${JSON.stringify(packetDefault.result)}`);
equal(packetDefault.result.fieldWritePlan.length, 186, 'packet-aware write plan still classifies exactly 186 fields');
equal(packetDefault.result.formApplicability, 'NOT_EVALUATED', 'packet binding does not determine form applicability');
equal(packetDefault.result.formRequiredness, 'NOT_EVALUATED', 'packet binding does not determine form requiredness or legal sufficiency');

const packetRefs = new Set(['732 0 R','726 0 R','730 0 R','731 0 R','660 0 R','627 0 R','628 0 R']);
const legacyNonPacketPlan = b1Baseline.fieldWritePlan.filter(item => !packetRefs.has(item.objectReference));
const currentNonPacketPlan = packetDefault.result.fieldWritePlan.filter(item => !packetRefs.has(item.objectReference));
equal(JSON.stringify(currentNonPacketPlan), JSON.stringify(legacyNonPacketPlan), 'same facts preserve every non-packet frozen-B1 field-write action exactly in B2');
equal(packetDefault.result.fieldWritePlan.find(item => item.objectReference === '712 0 R')?.action, b1Baseline.fieldWritePlan.find(item => item.objectReference === '712 0 R')?.action, 'TPA semantics remain unchanged by packet binding');

const packetPositive = evaluatePacket(withPacket(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: fairRentalValuePositive,
      confirmation: confirmation('packet-positive-block'),
    },
  },
}), packetComposition()));
equal(packetPositive.result.status, 'BLOCKED', 'existing B2 packet-aware evaluator does not consume R2-D Item-14 positive election');
equal(packetPositive.result.fieldWritePlan.length, 0, 'B2 positive Item-14 scenario yields zero writes');

// D. Agreement NOT_APPLICABLE path keeps all 6e/6f fields source-native blank and preserves dependency provenance.
for (const objectReference of ['732 0 R','726 0 R','730 0 R','731 0 R']) {
  equal(packetPlanAction(packetDefault.result, objectReference), 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', `${objectReference} remains official blank for exact no-agreement packet state`);
}
const packetAgreementFact = readCanonicalFilingFact<any>(packetDefault.facts, CANONICAL_FILING_FACT_REFS.packetAgreement);
equal(packetAgreementFact?.state, 'KNOWN', 'packet agreement fact is exact governed KNOWN input');
if (packetAgreementFact?.state === 'KNOWN') {
  ok(packetAgreementFact.provenance.dependencies.includes(CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl), 'no-agreement packet state remains provenance-bound to lease applicability control');
}

function agreementPacket(kind: string): any {
  if (kind === 'EXHIBIT_1_ATTACHED') {
    return packetControl({
      kind,
      artifacts: [packetArtifact('EXHIBIT_1_AGREEMENT', 'agreement-artifact-a', '1')],
    }, 'agreement-exhibit-1');
  }
  return packetControl({ kind }, `agreement-${kind}`);
}
function evaluateAgreementPacket(kind: string) {
  return evaluatePacket(withPacket(agreementInput, packetComposition({ agreement: agreementPacket(kind) })));
}

// A. Exhibit 1 attached.
const exhibit1 = evaluateAgreementPacket('EXHIBIT_1_ATTACHED');
equal(exhibit1.result.status, 'GENERATION_BINDING_READY', 'Exhibit 1 agreement packet is admitted');
equal(packetPlanAction(exhibit1.result, '732 0 R'), 'SET_SELECTED', '6e selects for Exhibit 1 attached');
equal(packetPlanAction(exhibit1.result, '726 0 R'), 'SET_EXPLICIT_NONSELECTION', '6f parent explicitly nonselects for Exhibit 1 attached');
equal(packetPlanAction(exhibit1.result, '730 0 R'), 'SET_EXPLICIT_NONSELECTION', '6f solely-nonpayment explicitly nonselects for Exhibit 1 attached');
equal(packetPlanAction(exhibit1.result, '731 0 R'), 'SET_EXPLICIT_NONSELECTION', '6f possession reason explicitly nonselects for Exhibit 1 attached');

// B. Landlord lacks possession.
const lacksPossession = evaluateAgreementPacket('NOT_ATTACHED_LANDLORD_LACKS_POSSESSION');
equal(lacksPossession.result.status, 'GENERATION_BINDING_READY', 'approved lacks-possession agreement exception is admitted');
equal(packetPlanAction(lacksPossession.result, '732 0 R'), 'SET_EXPLICIT_NONSELECTION', '6e explicitly nonselects for lacks-possession exception');
equal(packetPlanAction(lacksPossession.result, '726 0 R'), 'SET_SELECTED', '6f parent selects for lacks-possession exception');
equal(packetPlanAction(lacksPossession.result, '731 0 R'), 'SET_SELECTED', '6f lacks-possession reason selects exactly');
equal(packetPlanAction(lacksPossession.result, '730 0 R'), 'SET_EXPLICIT_NONSELECTION', '6f solely-nonpayment reason explicitly nonselects for lacks-possession exception');

// C. Solely nonpayment.
const solelyNonpayment = evaluateAgreementPacket('NOT_ATTACHED_SOLELY_NONPAYMENT');
equal(solelyNonpayment.result.status, 'GENERATION_BINDING_READY', 'approved solely-nonpayment agreement exception is admitted');
equal(packetPlanAction(solelyNonpayment.result, '732 0 R'), 'SET_EXPLICIT_NONSELECTION', '6e explicitly nonselects for solely-nonpayment exception');
equal(packetPlanAction(solelyNonpayment.result, '726 0 R'), 'SET_SELECTED', '6f parent selects for solely-nonpayment exception');
equal(packetPlanAction(solelyNonpayment.result, '730 0 R'), 'SET_SELECTED', '6f solely-nonpayment reason selects exactly');
equal(packetPlanAction(solelyNonpayment.result, '731 0 R'), 'SET_EXPLICIT_NONSELECTION', '6f lacks-possession reason explicitly nonselects for solely-nonpayment exception');

// E/F/G. Notice packet exact one/two bindings and fail-closed incomplete/unresolved states.
const twoNotice = evaluatePacket(withPacket(supplemental(), packetComposition({
  notice: packetControl({
    kind: 'EXHIBIT_2_ATTACHED',
    requiredNoticeCount: 2,
    artifacts: [
      packetArtifact('EXHIBIT_2_NOTICE', 'notice-artifact-one', '2'),
      packetArtifact('EXHIBIT_2_NOTICE', 'notice-artifact-two', '3'),
    ],
  }, 'notice-two-exact'),
})));
equal(twoNotice.result.status, 'GENERATION_BINDING_READY', 'two exact distinct Notice bindings are admitted');
equal(packetPlanAction(packetDefault.result, '660 0 R'), 'SET_SELECTED', '9e selects for one exact Exhibit 2 Notice binding');
equal(packetPlanAction(twoNotice.result, '660 0 R'), 'SET_SELECTED', '9e selects for two exact Exhibit 2 Notice bindings');
for (const kind of ['REQUIRED_NOTICE_SET_INCOMPLETE','UNRESOLVED']) {
  const result = evaluatePacket(withPacket(supplemental(), packetComposition({ notice: packetControl({ kind }, `notice-${kind}`) })));
  equal(result.result.status, 'BLOCKED', `${kind} Notice packet state blocks D.1`);
  equal(result.result.fieldWritePlan.length, 0, `${kind} Notice packet state produces zero writes`);
}

// H/I/J. Proof-of-service packet semantics.
const proofAttached = evaluatePacket(withPacket(supplemental(), packetComposition({
  proofOfService: packetControl({
    kind: 'EXHIBIT_3_ATTACHED',
    artifact: packetArtifact('EXHIBIT_3_PROOF_OF_SERVICE', 'proof-artifact-a', '4'),
  }, 'proof-exhibit-3'),
})));
equal(proofAttached.result.status, 'GENERATION_BINDING_READY', 'exact Exhibit 3 proof binding is admitted');
equal(packetPlanAction(proofAttached.result, '627 0 R'), 'SET_SELECTED', '10d selects for exact Exhibit 3 proof binding');
equal(packetPlanAction(packetDefault.result, '627 0 R'), 'SET_EXPLICIT_NONSELECTION', '10d explicitly nonselects when proof packet is NOT_ATTACHED');
const proofUnresolved = evaluatePacket(withPacket(supplemental(), packetComposition({ proofOfService: packetControl({ kind: 'UNRESOLVED' }, 'proof-unresolved') })));
equal(proofUnresolved.result.status, 'BLOCKED', 'unresolved proof packet blocks D.1');
equal(proofUnresolved.result.fieldWritePlan.length, 0, 'unresolved proof packet produces zero writes');

// K/L. Attachment 10c remains a governed no-write and must be exactly NOT_APPLICABLE.
equal(packetPlanAction(packetDefault.result, '628 0 R'), 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', '10c stays official blank/no-write for exact NOT_APPLICABLE state');
for (const kind of ['REQUIRED_BUT_UNSUPPORTED','UNRESOLVED']) {
  const result = evaluatePacket(withPacket(supplemental(), packetComposition({ attachment10c: packetControl({ kind }, `10c-${kind}`) })));
  equal(result.result.status, 'BLOCKED', `${kind} Attachment 10c state blocks D.1`);
  equal(result.result.fieldWritePlan.length, 0, `${kind} Attachment 10c state produces zero writes`);
}

// Missing packet inputs fail closed; they do not default to blank/nonselection.
const missingPacketFacts = projectFilingCanonicalFacts(persisted, supplemental());
const missingPacketResult = evaluateUd100PacketAwareGenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', missingPacketFacts);
equal(missingPacketResult.status, 'BLOCKED', 'packet-aware D.1 fails closed when packet composition is absent');
equal(missingPacketResult.fieldWritePlan.length, 0, 'missing packet composition produces zero writes');

// Nested governed artifact identity is part of the referenced fact snapshot and generation identity.
const noticeIdentityA = evaluatePacket(withPacket(supplemental(), packetComposition({
  notice: packetControl({
    kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1,
    artifacts: [packetArtifact('EXHIBIT_2_NOTICE', 'notice-identity-a', '5')],
  }, 'notice-identity-a'),
})));
const noticeIdentityB = evaluatePacket(withPacket(supplemental(), packetComposition({
  notice: packetControl({
    kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1,
    artifacts: [packetArtifact('EXHIBIT_2_NOTICE', 'notice-identity-b', '6')],
  }, 'notice-identity-b'),
})));
if (noticeIdentityA.result.status !== 'GENERATION_BINDING_READY' || noticeIdentityB.result.status !== 'GENERATION_BINDING_READY') {
  throw new Error('packet artifact identity fixtures must both resolve');
}
notEqual(noticeIdentityA.result.referencedFactSnapshotId, noticeIdentityB.result.referencedFactSnapshotId, 'nested packet artifact identity changes referenced fact snapshot');
notEqual(noticeIdentityA.result.generationInputId, noticeIdentityB.result.generationInputId, 'nested packet artifact identity changes generation input identity');
ok(!JSON.stringify(noticeIdentityA.result.fieldWritePlan).includes('notice-identity-a'), 'packet artifact ID is never rendered into a form field');
ok(!JSON.stringify(noticeIdentityA.result.fieldWritePlan).includes('EXHIBIT_2_NOTICE'), 'packet artifact role metadata is never rendered into a form field');

console.log(`UD100_MAP_SNAPSHOT=${UD100_GENERATION_BINDING.mapSnapshotId}`);
console.log(`UD100_BOOTSTRAP_V3_COMPATIBILITY_MAP_SNAPSHOT=${UD100_BOOTSTRAP_V3_COMPATIBILITY_BINDING.mapSnapshotId}`);
console.log(`UD100_PACKET_AWARE_MAP_SNAPSHOT=${UD100_PACKET_AWARE_GENERATION_BINDING.mapSnapshotId}`);
console.log(`UD100_REFERENCED_FACT_SNAPSHOT=${ready.result.referencedFactSnapshotId}`);
console.log(`UD100_GENERATION_INPUT=${ready.result.generationInputId}`);
console.log(`UD100_FIELD_RULE_COUNT=${UD100_GENERATION_BINDING.fieldRules.length}`);
console.log(`UD100_FAMILY_COUNT=${UD100_GENERATION_BINDING.fieldFamilyCoverage.length}`);
console.log(`ud100GenerationBinding: ${passed} assertions passed`);
