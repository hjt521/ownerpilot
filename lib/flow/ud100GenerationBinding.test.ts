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
      leaseStatus: { state: 'KNOWN', value: 'NO_AGREEMENT' },
      leaseApplicabilityControl: {
        state: 'KNOWN',
        value: 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE',
        control: control('lease-applicability', 'not-applicable'),
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
equal(UD100_GENERATION_BINDING.mapVersion, UD100_GENERATION_BINDING_MAP_VERSION, 'remediation changes explicit map version');
equal(UD100_GENERATION_BINDING.profileId, UD100_GENERATION_PROFILE_ID, 'bounded initial pre-filing profile remains explicit');
ok(UD100_GENERATION_BINDING.mapSnapshotId.startsWith('map:sha256:'), 'map snapshot is content-addressed');
equal(validateGenerationBindingDefinition(UD100_FIELD_MAP_FOUNDATION).status, 'BLOCKED', 'six-field Stage D foundation remains not generation-capable');
equal(validateGenerationBindingDefinition(UD100_GENERATION_BINDING).status, 'VALID', 'remediated D.1 definition independently validates');

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
equal(agreedRent?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'current no-agreement governed control leaves agreed-rent source blank without Notice-demand substitution');
ok(UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS.some(item => 'fieldId' in item && item.fieldId === agreedRentField && item.prohibitedSourceRef === CANONICAL_FILING_FACT_REFS.rentDemandTotal), 'agreed-rent Notice-demand prohibition remains explicit');
ok(!UD100_GENERATION_BINDING.fieldRules.some(rule => rule.disposition === 'WRITE' && rule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.rentDemandTotal)), 'Notice demand is not reused by any writable complaint field');

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

const unansweredUnit = evaluate(supplemental(), noUnitPersisted);
equal(unansweredUnit.result.status, 'BLOCKED', 'UNANSWERED property unit blocks rather than authorizing omission');
equal(unansweredUnit.result.fieldWritePlan.length, 0, 'UNANSWERED unit blocker returns zero writes');

const explicitNoUnit = evaluate(
  supplemental({ propertyUnitConfirmation: { state: 'KNOWN', value: 'NO_UNIT' } }),
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
  const result = evaluate(supplemental({ propertyUnitConfirmation }), noUnitPersisted).result;
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

const selectedFairRentalUnsupported = evaluate(supplemental({
  preparation: {
    otherReliefSelections: {
      state: 'KNOWN',
      value: { ...allOptionalReliefFalse, fairRentalValue: true },
      confirmation: confirmation('fair-rental-selected'),
    },
  },
})).result;
equal(selectedFairRentalUnsupported.status, 'BLOCKED', 'selected optional relief outside current exact amount/text binding hard-blocks rather than leaving fields blank');
equal(selectedFairRentalUnsupported.fieldWritePlan.length, 0, 'unsupported selected relief returns zero writes');

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

console.log(`UD100_MAP_SNAPSHOT=${UD100_GENERATION_BINDING.mapSnapshotId}`);
console.log(`UD100_REFERENCED_FACT_SNAPSHOT=${ready.result.referencedFactSnapshotId}`);
console.log(`UD100_GENERATION_INPUT=${ready.result.generationInputId}`);
console.log(`UD100_FIELD_RULE_COUNT=${UD100_GENERATION_BINDING.fieldRules.length}`);
console.log(`UD100_FAMILY_COUNT=${UD100_GENERATION_BINDING.fieldFamilyCoverage.length}`);
console.log(`ud100GenerationBinding: ${passed} assertions passed`);
