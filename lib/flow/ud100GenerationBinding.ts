import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import { CANONICAL_FILING_FACT_REFS } from './filingCanonicalFacts';
import type { OfficialSourceHealth, OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeGenerationMapSnapshotId,
  evaluateOfficialFormGenerationBinding,
  type GenerationEvaluationOptions,
  type GenerationFieldEvidence,
  type GenerationFieldRule,
  type OfficialFormGenerationBindingEvaluation,
  type OfficialFormGenerationBindingSemantics,
} from './officialFormGenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export const UD100_GENERATION_BINDING_MAP_ID = 'ud100-2026-07-01-initial-prefiling-generation-binding' as const;
export const UD100_GENERATION_BINDING_MAP_VERSION = '1.0.0' as const;
export const UD100_GENERATOR_CONTRACT_VERSION = 'ud100-field-write-plan-v1' as const;
export const UD100_GENERATION_PROFILE_ID = 'ud100-initial-prefiling-owner-preparation-v1' as const;

function evidence(
  fieldId: string,
  sourcePage: number,
  fieldType: '/Tx' | '/Btn',
  objectReference: string,
  visibleLabelEvidence: string,
): GenerationFieldEvidence {
  return { fieldId, sourcePage, fieldType, objectReference, visibleLabelEvidence };
}

const plaintiffEvidence = [
  evidence('UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1_ft[0]', 1, '/Tx', '836 0 R', 'PLAINTIFF:'),
  evidence('UD-100[0].Page1[0].List1[0].FillText1[0]', 1, '/Tx', '817 0 R', 'PLAINTIFF (name each):'),
  evidence('UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party1_ft[0]', 2, '/Tx', '776 0 R', 'PLAINTIFF:'),
  evidence('UD-100[0].Page3[0].Header[0].TitlePartyName[0].Party1_ft[0]', 3, '/Tx', '668 0 R', 'PLAINTIFF:'),
  evidence('UD-100[0].Page4[0].Header[0].TitlePartyName[0].Party1_ft[0]', 4, '/Tx', '910 0 R', 'PLAINTIFF:'),
] as const;

const defendantEvidence = [
  evidence('UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2_ft[0]', 1, '/Tx', '837 0 R', 'DEFENDANT:'),
  evidence('UD-100[0].Page1[0].List1[0].FillText2[0]', 1, '/Tx', '818 0 R', 'alleges causes of action against DEFENDANT (name each):'),
  evidence('UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party2_ft[0]', 2, '/Tx', '777 0 R', 'DEFENDANT:'),
  evidence('UD-100[0].Page3[0].Header[0].TitlePartyName[0].Party2_ft[0]', 3, '/Tx', '669 0 R', 'DEFENDANT:'),
  evidence('UD-100[0].Page4[0].Header[0].TitlePartyName[0].Party2_ft[0]', 4, '/Tx', '911 0 R', 'DEFENDANT:'),
] as const;

const partyRules: GenerationFieldRule[] = [
  ...plaintiffEvidence.map(item => ({
    disposition: 'WRITE' as const,
    evidence: item,
    writeKind: 'TEXT' as const,
    inputAuthorityClass: 'CUSTOMER_CONFIRMED_FACT' as const,
    dependencies: [{ ref: CANONICAL_FILING_FACT_REFS.plaintiffNames, requirement: 'REQUIRED' as const }],
    transform: { id: 'TEXT_ARRAY_SEMICOLON_V1' as const, version: '1' },
    unresolvedPolicy: 'BLOCK' as const,
  })),
  ...defendantEvidence.map(item => ({
    disposition: 'WRITE' as const,
    evidence: item,
    writeKind: 'TEXT' as const,
    inputAuthorityClass: 'CUSTOMER_CONFIRMED_FACT' as const,
    dependencies: [{ ref: CANONICAL_FILING_FACT_REFS.defendantNames, requirement: 'REQUIRED' as const }],
    transform: { id: 'TEXT_ARRAY_SEMICOLON_V1' as const, version: '1' },
    unresolvedPolicy: 'BLOCK' as const,
  })),
];

const premisesRule: GenerationFieldRule = {
  disposition: 'WRITE',
  evidence: evidence(
    'UD-100[0].Page1[0].List3[0].SubList3[0].Lia[0].FillText6[0]',
    1,
    '/Tx',
    '799 0 R',
    'The venue is the court named above because defendant named above is in possession of the premises located at (street address, apartment number, city, zip code, and county):',
  ),
  writeKind: 'TEXT',
  inputAuthorityClass: 'CUSTOMER_CONFIRMED_FACT',
  dependencies: [
    { ref: CANONICAL_FILING_FACT_REFS.propertyStreetAddress, requirement: 'REQUIRED' },
    { ref: CANONICAL_FILING_FACT_REFS.propertyUnit, requirement: 'OPTIONAL_UNANSWERED_OMITS' },
    { ref: CANONICAL_FILING_FACT_REFS.propertyCity, requirement: 'REQUIRED' },
    { ref: CANONICAL_FILING_FACT_REFS.propertyZip, requirement: 'REQUIRED' },
    { ref: CANONICAL_FILING_FACT_REFS.propertyCounty, requirement: 'REQUIRED' },
  ],
  transform: { id: 'PREMISES_COMPOSE_V1', version: '1' },
  unresolvedPolicy: 'BLOCK',
};

const courtRules: GenerationFieldRule[] = [
  ['CrtCounty_ft[0]', '840 0 R', 'SUPERIOR COURT OF CALIFORNIA, COUNTY OF', 'county'],
  ['Street_ft[0]', '841 0 R', 'STREET ADDRESS:', 'streetAddress'],
  ['MailingAdd_ft[0]', '842 0 R', 'MAILING ADDRESS:', 'mailingAddress'],
  ['CityZip_ft[0]', '843 0 R', 'CITY AND ZIP CODE:', 'cityAndZip'],
  ['Branch_ft[0]', '844 0 R', 'BRANCH NAME:', 'branchName'],
].map(([leaf, objectReference, label, property]) => ({
  disposition: 'WRITE' as const,
  evidence: evidence(`UD-100[0].Page1[0].P1Caption[0].CourtInfo[0].${leaf}`, 1, '/Tx', objectReference, label),
  writeKind: 'TEXT' as const,
  inputAuthorityClass: 'CUSTOMER_CONFIRMED_LEGAL_ELECTION' as const,
  dependencies: [{ ref: CANONICAL_FILING_FACT_REFS.selectedFilingCourt, requirement: 'REQUIRED' as const }],
  transform: { id: 'OBJECT_PROPERTY_TEXT_V1' as const, version: '1', args: { property } },
  unresolvedPolicy: 'BLOCK' as const,
}));

const municipalRules: GenerationFieldRule[] = [
  {
    fieldId: 'UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii2[0].Four[0]',
    objectReference: '795 0 R',
    label: 'within the unincorporated area of',
    selectedValue: 'UNINCORPORATED_AREA',
  },
  {
    fieldId: 'UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii1[0].Four[0]',
    objectReference: '797 0 R',
    label: 'within the city limits of',
    selectedValue: 'WITHIN_CITY_LIMITS',
  },
].map(item => ({
  disposition: 'WRITE' as const,
  evidence: evidence(item.fieldId, 1, '/Btn', item.objectReference, item.label),
  writeKind: 'CHECKBOX' as const,
  inputAuthorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED' as const,
  dependencies: [{ ref: CANONICAL_FILING_FACT_REFS.municipalClassification, requirement: 'REQUIRED' as const }],
  transform: { id: 'ENUM_CHECKBOX_V1' as const, version: '1', args: { selectedValue: item.selectedValue } },
  unresolvedPolicy: 'BLOCK' as const,
}));

const complaintLifecycleRules: GenerationFieldRule[] = [
  {
    fieldId: 'UD-100[0].Page1[0].P1Caption[0].FormTitle[0].Complaint[0]',
    objectReference: '833 0 R',
    label: 'COMPLAINT',
    selectedValue: 'INITIAL_PREFILING',
  },
  {
    fieldId: 'UD-100[0].Page1[0].P1Caption[0].FormTitle[0].Complaint[1]',
    objectReference: '834 0 R',
    label: 'AMENDED COMPLAINT',
    selectedValue: 'PRIOR_COMPLAINT_EXISTS',
  },
].map(item => ({
  disposition: 'WRITE' as const,
  evidence: evidence(item.fieldId, 1, '/Btn', item.objectReference, item.label),
  writeKind: 'CHECKBOX' as const,
  inputAuthorityClass: 'LIFECYCLE_OR_EXTERNAL_EVENT_SUPPLIED' as const,
  dependencies: [{ ref: CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle, requirement: 'REQUIRED' as const }],
  transform: { id: 'ENUM_CHECKBOX_V1' as const, version: '1', args: { selectedValue: item.selectedValue } },
  unresolvedPolicy: 'BLOCK' as const,
}));

const deferredRules: GenerationFieldRule[] = [
  evidence('UD-100[0].Page1[0].P1Caption[0].CaseNumber[0].CaseNumber_ft[0]', 1, '/Tx', '856 0 R', 'CASE NUMBER:'),
  evidence('UD-100[0].Page2[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 2, '/Tx', '775 0 R', 'CASE NUMBER:'),
  evidence('UD-100[0].Page3[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 3, '/Tx', '667 0 R', 'CASE NUMBER:'),
  evidence('UD-100[0].Page4[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 4, '/Tx', '909 0 R', 'CASE NUMBER:'),
  evidence('UD-100[0].Page4[0].Verification[0].FillText58[0]', 4, '/Tx', '580 0 R', 'Type or Print Name'),
  evidence('UD-100[0].Page4[0].Sign1[0].DateField27[0]', 4, '/Tx', '865 0 R', 'Date:'),
  evidence('UD-100[0].Page4[0].Sign1[0].FillText56[0]', 4, '/Tx', '866 0 R', 'Type or Print Name'),
  evidence('UD-100[0].Page4[0].Verification[0].DateField29[0]', 4, '/Tx', '912 0 R', 'Date:'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lie[0].SixE[0]', 2, '/Btn', '732 0 R', 'A copy of the written agreement, including any addenda or attachments that form the basis of this complaint, is attached and labeled Exhibit 1.'),
  evidence('UD-100[0].Page3[0].List9[0].Item9[0].Lie[0].SevenE[0]', 3, '/Btn', '660 0 R', 'A copy of the notice is attached and labeled Exhibit 2.'),
  evidence('UD-100[0].Page4[0].List21[0].Eighteen[0]', 4, '/Btn', '882 0 R', 'Pages attached'),
  evidence('UD-100[0].Page4[0].List21[0].FillText215[0]', 4, '/Tx', '883 0 R', '(specify number of pages):'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lif[0].DateField26[0]', 4, '/Tx', '876 0 R', 'Expires on (date):'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lie[0].TextField43[0]', 4, '/Tx', '877 0 R', 'Registration Number:'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lid[0].TextField42[0]', 4, '/Tx', '878 0 R', 'County of registration:'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lic[0].Phone_ft[0]', 4, '/Tx', '879 0 R', 'Telephone Number:'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lib[0].TextField41[0]', 4, '/Tx', '880 0 R', 'Street address, city, and zip code:'),
  evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lia[0].TextField40[0]', 4, '/Tx', '881 0 R', "Assistant's name:"),
].map(item => ({
  disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE' as const,
  evidence: item,
  authorityClass: 'DEFERRED_TO_LATER_STAGE_NOT_WRITABLE_BY_D1' as const,
  reason: 'Current D.1 initial pre-filing profile expressly preserves the official blank; later lifecycle/signing/packet/compliance authority owns this field.',
}));

const semantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: 1,
  mapId: UD100_GENERATION_BINDING_MAP_ID,
  mapVersion: UD100_GENERATION_BINDING_MAP_VERSION,
  profileId: UD100_GENERATION_PROFILE_ID,
  generatorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
  sourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  fieldRules: [
    ...partyRules,
    premisesRule,
    ...courtRules,
    ...municipalRules,
    ...complaintLifecycleRules,
    ...deferredRules,
  ],
  profileRequirements: [
    {
      ref: CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle,
      inputAuthorityClass: 'LIFECYCLE_OR_EXTERNAL_EVENT_SUPPLIED',
      allowedValues: ['INITIAL_PREFILING'],
      blockerCode: 'AMENDED_OR_PRIOR_COMPLAINT_UNSUPPORTED',
    },
    {
      ref: CANONICAL_FILING_FACT_REFS.captionRouteControl,
      inputAuthorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED',
      allowedValues: ['SELF_REPRESENTED_SUPPORTED'],
      blockerCode: 'OUTSIDE_ATTORNEY_OR_UNRESOLVED_CAPTION_ROUTE_UNSUPPORTED',
    },
    {
      ref: CANONICAL_FILING_FACT_REFS.jurisdictionSupportControl,
      inputAuthorityClass: 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED',
      allowedValues: ['SUPPORTED_INITIAL_UD100'],
      blockerCode: 'UNSUPPORTED_JURISDICTION_CONTROL_STATE',
    },
  ],
  matrixDomainCoverage: [
    '5294987307:DOMAIN_1',
    '5294987307:DOMAIN_2',
    '5294987307:DOMAIN_3',
    '5294987307:DOMAIN_4',
    '5294987307:DOMAIN_5',
    '5294987307:DOMAIN_6',
  ],
};

export const UD100_GENERATION_BINDING = Object.freeze({
  ...semantics,
  mapSnapshotId: computeGenerationMapSnapshotId(semantics),
});

export const UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS = Object.freeze([
  {
    fieldId: 'UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].dollar[0]',
    sourcePage: 2,
    fieldType: '/Tx' as const,
    objectReference: '766 0 R',
    visibleLabelEvidence: 'agreed to pay rent of Dollar amount',
    prohibitedSourceRef: CANONICAL_FILING_FACT_REFS.rentDemandTotal,
    reason: 'Notice demand is not the underlying agreed rent.',
  },
  {
    semanticTarget: 'COMPLAINT_DEMAND_OR_CIVIL_CLASSIFICATION',
    prohibitedSourceRef: CANONICAL_FILING_FACT_REFS.rentDemandTotal,
    reason: 'Notice demand is not complaint demand or limited/unlimited classification input by label similarity.',
  },
  {
    semanticTarget: 'FAIR_RENTAL_VALUE_OR_DAMAGES',
    prohibitedSourceRef: CANONICAL_FILING_FACT_REFS.rentDemandTotal,
    reason: 'Notice demand is not fair rental value or damages.',
  },
  {
    semanticTarget: 'RENT_DUE_AT_SERVICE',
    prohibitedSourceRef: CANONICAL_FILING_FACT_REFS.rentDemandTotal,
    reason: 'Notice demand is not automatically rent actually due at service time.',
  },
] as const);

export function evaluateUd100GenerationBinding(
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
  options: GenerationEvaluationOptions = {},
): OfficialFormGenerationBindingEvaluation {
  return evaluateOfficialFormGenerationBinding(
    UD100_GENERATION_BINDING,
    suppliedSourceIdentity,
    suppliedSourceHealth,
    facts,
    'OWNER_GENERATED_PREPARATION',
    options,
  );
}
