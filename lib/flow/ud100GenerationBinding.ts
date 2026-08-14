import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import { CANONICAL_FILING_FACT_REFS } from './filingCanonicalFacts';
import type { OfficialSourceHealth, OfficialSourceIdentity } from './officialFormFieldMap';
import {
  computeGenerationMapSnapshotId,
  evaluateOfficialFormGenerationBinding,
  type GenerationEvaluationOptions,
  type GenerationFactDependency,
  type GenerationFieldEvidence,
  type GenerationFieldFamilyCoverage,
  type GenerationFieldRule,
  type GenerationInputAuthorityClass,
  type GenerationRuleCondition,
  type OfficialFormGenerationBindingEvaluation,
  type OfficialFormGenerationBindingSemantics,
} from './officialFormGenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

export const UD100_GENERATION_BINDING_MAP_ID = 'ud100-2026-07-01-initial-prefiling-generation-binding' as const;
export const UD100_GENERATION_BINDING_MAP_VERSION = '1.1.0' as const;
export const UD100_GENERATOR_CONTRACT_VERSION = 'ud100-field-write-plan-v2' as const;
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

const D = (
  ref: GenerationFactDependency['ref'],
  authorityClass: GenerationInputAuthorityClass,
): GenerationFactDependency => ({ ref, authorityClass });

const enumArgs = (allowed: readonly string[], selected: readonly string[]) => ({
  allowedValues: allowed.join('|'),
  selectedValues: selected.join('|'),
});

function textRule(
  ev: GenerationFieldEvidence,
  dep: GenerationFactDependency,
  transform: GenerationFieldRule extends infer _T ? any : never = { id: 'TEXT_EXACT_V1', version: '1' },
  condition?: GenerationRuleCondition,
): GenerationFieldRule {
  return {
    disposition: 'WRITE',
    evidence: ev,
    writeKind: 'TEXT',
    dependencies: [dep],
    transform,
    unresolvedPolicy: 'BLOCK',
    ...(condition ? { condition } : {}),
  };
}

function checkboxEnumRule(
  ev: GenerationFieldEvidence,
  dep: GenerationFactDependency,
  allowed: readonly string[],
  selected: readonly string[],
): GenerationFieldRule {
  return {
    disposition: 'WRITE',
    evidence: ev,
    writeKind: 'CHECKBOX',
    dependencies: [dep],
    transform: { id: 'ENUM_SET_CHECKBOX_V1', version: '1', args: enumArgs(allowed, selected) },
    unresolvedPolicy: 'BLOCK',
  };
}

function objectBooleanRule(
  ev: GenerationFieldEvidence,
  dep: GenerationFactDependency,
  property: string,
  selectedValue = true,
): GenerationFieldRule {
  return {
    disposition: 'WRITE',
    evidence: ev,
    writeKind: 'CHECKBOX',
    dependencies: [dep],
    transform: {
      id: 'OBJECT_BOOLEAN_CHECKBOX_V1',
      version: '1',
      args: { property, selectedValue: String(selectedValue) },
    },
    unresolvedPolicy: 'BLOCK',
  };
}

function governedNoWrite(
  ev: GenerationFieldEvidence,
  dep: GenerationFactDependency,
  allowedValues: readonly unknown[],
  reason: string,
  property?: string,
): GenerationFieldRule {
  return {
    disposition: 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    evidence: ev,
    dependency: dep,
    allowedValues,
    reason,
    ...(property ? { property } : {}),
  };
}

function deferred(ev: GenerationFieldEvidence, reason: string): GenerationFieldRule {
  return {
    disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    evidence: ev,
    authorityClass: 'DEFERRED_TO_LATER_STAGE_NOT_WRITABLE_BY_D1',
    reason,
  };
}

function nondata(ev: GenerationFieldEvidence): GenerationFieldRule {
  return {
    disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    evidence: ev,
    authorityClass: 'OFFICIAL_FORM_NONDATA_CONTROL_NOT_WRITABLE',
    reason: 'Official PDF action control is not a customer preparation field and is never mutated by the whitelist generator.',
  };
}

function condition(
  dep: GenerationFactDependency,
  allowedValues: readonly unknown[],
  reason: string,
  property?: string,
): GenerationRuleCondition {
  return {
    dependency: dep,
    allowedValues,
    whenFalse: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
    reason,
    ...(property ? { property } : {}),
  };
}

const CUSTOMER = 'CUSTOMER_CONFIRMED_FACT' as const;
const ELECTION = 'CUSTOMER_CONFIRMED_LEGAL_ELECTION' as const;
const CONTROL = 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED' as const;
const LIFECYCLE = 'LIFECYCLE_OR_EXTERNAL_EVENT_SUPPLIED' as const;

const relationshipDomain = ['OWNER', 'OTHER'] as const;
const plaintiffTypeDomain = ['INDIVIDUAL_OVER_18', 'CORPORATION', 'PARTNERSHIP', 'PUBLIC_AGENCY', 'OTHER'] as const;
const municipalDomain = ['WITHIN_CITY_LIMITS', 'UNINCORPORATED_AREA'] as const;
const civilDomain = ['LIMITED_LE_10000', 'LIMITED_GT_10000', 'UNLIMITED'] as const;
const lifecycleDomain = ['INITIAL_PREFILING', 'PRIOR_COMPLAINT_EXISTS'] as const;
const noticeDomain = [
  'PAY_RENT_OR_QUIT_3_DAY',
  'QUIT_30_DAY',
  'QUIT_60_DAY',
  'QUIT_3_DAY',
  'CARES_30_DAY',
  'PERFORM_COVENANTS_3_DAY',
  'PRIOR_1946_2_C',
  'OTHER',
] as const;
const serviceDomain = [
  'PERSONAL_HAND_DELIVERY',
  'SUBSTITUTED_SERVICE',
  'POST_AND_MAIL',
  'CERTIFIED_OR_REGISTERED_MAIL',
  'COMMERCIAL_LEASE_METHOD',
] as const;
const civilDep = D(CANONICAL_FILING_FACT_REFS.civilClassificationControl, CONTROL);
const municipalDep = D(CANONICAL_FILING_FACT_REFS.municipalClassification, CONTROL);
const lifecycleDep = D(CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle, LIFECYCLE);
const noticeElectionDep = D(CANONICAL_FILING_FACT_REFS.noticeComplaintElection, ELECTION);
const serviceElectionDep = D(CANONICAL_FILING_FACT_REFS.serviceComplaintElection, ELECTION);
const serviceFactsDep = D(CANONICAL_FILING_FACT_REFS.serviceFacts, LIFECYCLE);

const domain1Relationship: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List4[0].Four1[0]', 1, '/Btn', '784 0 R', 'as owner'), D(CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CUSTOMER), relationshipDomain, ['OWNER']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List4[0].Four1[1]', 1, '/Btn', '785 0 R', 'other'), D(CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CUSTOMER), relationshipDomain, ['OTHER']),
  governedNoWrite(
    evidence('UD-100[0].Page1[0].List4[0].FillText120[0]', 1, '/Tx', '786 0 R', '(specify):'),
    D(CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CUSTOMER),
    ['OWNER'],
    'Current bounded profile supports owner relationship; other-relationship detail cannot be silently omitted.',
  ),
];

const domain1Dba: GenerationFieldRule[] = [
  governedNoWrite(
    evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lib[0].FillText4[0]', 1, '/Tx', '803 0 R', '(specify):'),
    D(CANONICAL_FILING_FACT_REFS.dbaUse, CUSTOMER),
    ['NO_DBA'],
    'Explicit customer-confirmed NO_DBA authorizes no DBA detail write.',
  ),
  checkboxEnumRule(
    evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lib[0].CBChoice1_cb[0]', 1, '/Btn', '804 0 R', 'Plaintiff has complied with the fictitious business name laws and is doing business under the fictitious name of'),
    D(CANONICAL_FILING_FACT_REFS.dbaUse, CUSTOMER),
    ['NO_DBA', 'USES_DBA'],
    ['USES_DBA'],
  ),
];

const domain1PlaintiffType: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii5[0].TwoA[0]', 1, '/Btn', '811 0 R', 'a corporation.'), D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), plaintiffTypeDomain, ['CORPORATION']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii4[0].TwoA[0]', 1, '/Btn', '812 0 R', 'a partnership.'), D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), plaintiffTypeDomain, ['PARTNERSHIP']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii3[0].TwoA[0]', 1, '/Btn', '813 0 R', 'other'), D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), plaintiffTypeDomain, ['OTHER']),
  governedNoWrite(
    evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii3[0].FillText3[0]', 1, '/Tx', '814 0 R', '(specify):'),
    D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER),
    ['INDIVIDUAL_OVER_18'],
    'Current supported plaintiff type is explicit individual-over-18; other-type detail remains source-native blank.',
  ),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii2[0].TwoA[0]', 1, '/Btn', '815 0 R', 'a public agency.'), D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), plaintiffTypeDomain, ['PUBLIC_AGENCY']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List2[0].Item2[0].Lia[0].SubLista[0].Lii1[0].TwoA[0]', 1, '/Btn', '816 0 R', 'an individual over the age of 18 years.'), D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), plaintiffTypeDomain, ['INDIVIDUAL_OVER_18']),
];

const partyEvidence = [
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
const domain1Parties: GenerationFieldRule[] = [
  ...partyEvidence.map(item => textRule(item, D(CANONICAL_FILING_FACT_REFS.plaintiffNames, CUSTOMER), { id: 'TEXT_ARRAY_SEMICOLON_V1', version: '1' })),
  ...defendantEvidence.map(item => textRule(item, D(CANONICAL_FILING_FACT_REFS.defendantNames, CUSTOMER), { id: 'TEXT_ARRAY_SEMICOLON_V1', version: '1' })),
];

const domain1Does: GenerationFieldRule[] = [
  objectBooleanRule(
    evidence('UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Does[0]', 1, '/Btn', '838 0 R', 'DOES 1'),
    D(CANONICAL_FILING_FACT_REFS.doeElection, ELECTION),
    'include',
    true,
  ),
  governedNoWrite(
    evidence('UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].FillText140[0]', 1, '/Tx', '839 0 R', 'TO'),
    D(CANONICAL_FILING_FACT_REFS.doeElection, ELECTION),
    [false],
    'Explicit customer-confirmed no-Doe election authorizes no Doe range write.',
    'include',
  ),
];

const courtRules: GenerationFieldRule[] = [
  ['CrtCounty_ft[0]', '840 0 R', 'SUPERIOR COURT OF CALIFORNIA, COUNTY OF', 'county'],
  ['Street_ft[0]', '841 0 R', 'STREET ADDRESS:', 'streetAddress'],
  ['MailingAdd_ft[0]', '842 0 R', 'MAILING ADDRESS:', 'mailingAddress'],
  ['CityZip_ft[0]', '843 0 R', 'CITY AND ZIP CODE:', 'cityAndZip'],
  ['Branch_ft[0]', '844 0 R', 'BRANCH NAME:', 'branchName'],
].map(([leaf, objectReference, label, property]) => textRule(
  evidence(`UD-100[0].Page1[0].P1Caption[0].CourtInfo[0].${leaf}`, 1, '/Tx', objectReference, label),
  D(CANONICAL_FILING_FACT_REFS.selectedFilingCourt, ELECTION),
  { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property } },
));

const domain1CaptionContact: GenerationFieldRule[] = [
  governedNoWrite(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].BarNo_ft[0]', 1, '/Tx', '845 0 R', 'Government-form bar credential field (exact label retained only in pinned official source binary)'), D(CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl, CONTROL), ['SELF_REP_NO_BAR_FIRM_FAX'], 'Current governed self-represented caption route authorizes no bar-number write.'),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyName_ft[0]', 1, '/Tx', '846 0 R', 'NAME:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'name' } }),
  governedNoWrite(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyFirm_ft[0]', 1, '/Tx', '847 0 R', 'FIRM NAME:'), D(CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl, CONTROL), ['SELF_REP_NO_BAR_FIRM_FAX'], 'Current governed self-represented caption route authorizes no firm-name write.'),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyStreet_ft[0]', 1, '/Tx', '848 0 R', 'STREET ADDRESS:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'streetAddress' } }),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyCity_ft[0]', 1, '/Tx', '849 0 R', 'CITY:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'city' } }),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyState_ft[0]', 1, '/Tx', '850 0 R', 'STATE:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'state' } }),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyZip_ft[0]', 1, '/Tx', '851 0 R', 'ZIP CODE:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'zip' } }),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].Phone_ft[0]', 1, '/Tx', '852 0 R', 'TELEPHONE NUMBER:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'telephone' } }),
  governedNoWrite(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].Fax_ft[0]', 1, '/Tx', '853 0 R', 'FAX NUMBER:'), D(CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl, CONTROL), ['SELF_REP_NO_BAR_FIRM_FAX'], 'Current governed self-represented caption route authorizes no fax write.'),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].Email_ft[0]', 1, '/Tx', '854 0 R', 'EMAIL ADDRESS:'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'email' } }),
  textRule(evidence('UD-100[0].Page1[0].P1Caption[0].attyInfo[0].AttyFor_ft[0]', 1, '/Tx', '855 0 R', 'ATTORNEY FOR (name):'), D(CANONICAL_FILING_FACT_REFS.filerContact, CUSTOMER), { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'captionForText' } }),
];

const domain2Premises: GenerationFieldRule[] = [
  textRule(evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lic[0].TextField13[0]', 1, '/Tx', '791 0 R', '(approximate year):'), D(CANONICAL_FILING_FACT_REFS.premisesAge, CUSTOMER)),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii2[0].Four[0]', 1, '/Btn', '795 0 R', 'within the unincorporated area of'), municipalDep, municipalDomain, ['UNINCORPORATED_AREA']),
  textRule(
    evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii2[0].FillText12[0]', 1, '/Tx', '796 0 R', '(name of county):'),
    D(CANONICAL_FILING_FACT_REFS.propertyCounty, CUSTOMER),
    { id: 'TEXT_EXACT_V1', version: '1' },
    condition(municipalDep, ['UNINCORPORATED_AREA'], 'Resolved city-limits classification makes the unincorporated-county detail not applicable.'),
  ),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii1[0].Four[0]', 1, '/Btn', '797 0 R', 'within the city limits of'), municipalDep, municipalDomain, ['WITHIN_CITY_LIMITS']),
  textRule(
    evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lib[0].SubListb[0].Lii1[0].FillText10[0]', 1, '/Tx', '798 0 R', '(name of city):'),
    D(CANONICAL_FILING_FACT_REFS.propertyCity, CUSTOMER),
    { id: 'TEXT_EXACT_V1', version: '1' },
    condition(municipalDep, ['WITHIN_CITY_LIMITS'], 'Resolved unincorporated classification makes the city-limits detail not applicable.'),
  ),
  {
    disposition: 'WRITE',
    evidence: evidence('UD-100[0].Page1[0].List3[0].SubList3[0].Lia[0].FillText6[0]', 1, '/Tx', '799 0 R', 'The venue is the court named above because defendant named above is in possession of the premises located at (street address, apartment number, city, zip code, and county):'),
    writeKind: 'TEXT',
    dependencies: [
      D(CANONICAL_FILING_FACT_REFS.propertyStreetAddress, CUSTOMER),
      D(CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation, CUSTOMER),
      D(CANONICAL_FILING_FACT_REFS.propertyCity, CUSTOMER),
      D(CANONICAL_FILING_FACT_REFS.propertyZip, CUSTOMER),
      D(CANONICAL_FILING_FACT_REFS.propertyCounty, CUSTOMER),
    ],
    transform: { id: 'PREMISES_COMPOSE_V2', version: '2' },
    unresolvedPolicy: 'BLOCK',
  },
  ...courtRules,
];

const domain2Tpa: GenerationFieldRule[] = [
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].TwoAb[0]', 2, '/Btn', '703 0 R', 'The tenancy was terminated for no-fault just cause'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Current governed TPA result is at-fault; no-fault option remains unchecked.'),
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].SubListb[0].Li2[0].TwoA1[0]', 2, '/Btn', '707 0 R', 'provided a direct payment of one month rent'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Relocation-payment branch is not applicable to the current governed at-fault result.'),
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].SubListb[0].Li2[0].FillText208[0]', 2, '/Tx', '708 0 R', 'Dollar Amount'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Relocation amount is not applicable to the current governed at-fault result.'),
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].SubListb[0].Li2[0].FillText110[0]', 2, '/Tx', '709 0 R', 'to (name each defendant and amount given to each):'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Relocation recipient detail is not applicable to the current governed at-fault result.'),
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].SubListb[0].Li1[0].TwoA1[0]', 2, '/Btn', '710 0 R', 'waived the payment of rent for the final month of the tenancy'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Rent-waiver branch is not applicable to the current governed at-fault result.'),
  governedNoWrite(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lib[0].SubListb[0].Li1[0].FillText206[0]', 2, '/Tx', '711 0 R', 'section 1946.2(d)(2), in the amount of Dollar Amount'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Rent-waiver amount is not applicable to the current governed at-fault result.'),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lia[0].TwoAc[0]', 2, '/Btn', '712 0 R', 'The tenancy was terminated for at-fault just cause'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT', 'SUBJECT_NO_FAULT', 'EXEMPT'], ['SUBJECT_AT_FAULT']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List7[0].Item7[0].Lib[0].CBChoice1_cb1[0]', 2, '/Btn', '716 0 R', 'is subject to the Tenant Protection Act of 2019.'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT', 'SUBJECT_NO_FAULT', 'EXEMPT'], ['SUBJECT_AT_FAULT', 'SUBJECT_NO_FAULT']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List7[0].Item7[0].Lia[0].CBChoice1_cb1[0]', 2, '/Btn', '717 0 R', 'is not subject to the Tenant Protection Act of 2019'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT', 'SUBJECT_NO_FAULT', 'EXEMPT'], ['EXEMPT']),
  governedNoWrite(evidence('UD-100[0].Page2[0].List7[0].Item7[0].Lia[0].FillText206[0]', 2, '/Tx', '718 0 R', '(specify):'), D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), ['SUBJECT_AT_FAULT'], 'Current governed TPA result is subject/at-fault, so exemption detail is not applicable.'),
];

const domain2Local: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page4[0].List17[0].Fourteen[0]', 4, '/Btn', '904 0 R', "Defendant's tenancy is subject to the local rent control or eviction control ordinance of"), D(CANONICAL_FILING_FACT_REFS.localControl, CONTROL), ['NOT_SUBJECT', 'SUBJECT'], ['SUBJECT']),
  governedNoWrite(evidence('UD-100[0].Page4[0].List17[0].FillText32[0]', 4, '/Tx', '905 0 R', '(city or county, title of ordinance, and date of passage):'), D(CANONICAL_FILING_FACT_REFS.localControl, CONTROL), ['NOT_SUBJECT'], 'Current governed local-control result is explicit NOT_SUBJECT; ordinance detail remains blank.'),
];

const domain3Civil: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page1[0].CheckAll[0].Action[0]', 1, '/Btn', '819 0 R', 'ACTION IS A LIMITED CIVIL CASE (amount demanded does not exceed $35,000)'), civilDep, civilDomain, ['LIMITED_LE_10000', 'LIMITED_GT_10000']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].CheckAll[0].ActionDemand[0]', 1, '/Btn', '820 0 R', 'does not exceed $10,000'), civilDep, civilDomain, ['LIMITED_LE_10000']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].CheckAll[0].ActionDemand[1]', 1, '/Btn', '821 0 R', 'exceeds $10,000'), civilDep, civilDomain, ['LIMITED_GT_10000']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].CheckAll[0].Action[1]', 1, '/Btn', '822 0 R', 'ACTION IS AN UNLIMITED CIVIL CASE (amount demanded exceeds $35,000)'), civilDep, civilDomain, ['UNLIMITED']),
  ...[
    evidence('UD-100[0].Page1[0].CheckAll[0].ActionIs[0]', 1, '/Btn', '823 0 R', 'ACTION IS RECLASSIFIED by this amended complaint or cross-complaint'),
    evidence('UD-100[0].Page1[0].CheckAll[0].Fromunlawful[0]', 1, '/Btn', '824 0 R', 'from unlawful detainer to general unlimited civil'),
    evidence('UD-100[0].Page1[0].CheckAll[0].Fromunlawful[1]', 1, '/Btn', '825 0 R', 'from unlawful detainer to general limited civil'),
    evidence('UD-100[0].Page1[0].CheckAll[0].FromUnltd[0]', 1, '/Btn', '826 0 R', 'from limited to unlimited.'),
    evidence('UD-100[0].Page1[0].CheckAll[0].FromUnltd[1]', 1, '/Btn', '827 0 R', 'from unlimited to limited.'),
  ].map(ev => governedNoWrite(ev, lifecycleDep, ['INITIAL_PREFILING'], 'Exact lifecycle proves this is an initial pre-filing complaint; reclassification fields are not applicable.')),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].P1Caption[0].FormTitle[0].Complaint[0]', 1, '/Btn', '833 0 R', 'COMPLAINT'), lifecycleDep, lifecycleDomain, ['INITIAL_PREFILING']),
  checkboxEnumRule(evidence('UD-100[0].Page1[0].P1Caption[0].FormTitle[0].Complaint[1]', 1, '/Btn', '834 0 R', 'AMENDED COMPLAINT'), lifecycleDep, lifecycleDomain, ['PRIOR_COMPLAINT_EXISTS']),
  governedNoWrite(evidence('UD-100[0].Page1[0].P1Caption[0].FormTitle[0].AttyFor_ft[0]', 1, '/Tx', '835 0 R', '(Amendment Number):'), lifecycleDep, ['INITIAL_PREFILING'], 'Initial pre-filing lifecycle authorizes no amendment-number write.'),
  ...[
    evidence('UD-100[0].Page1[0].P1Caption[0].CaseNumber[0].CaseNumber_ft[0]', 1, '/Tx', '856 0 R', 'CASE NUMBER:'),
    evidence('UD-100[0].Page2[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 2, '/Tx', '775 0 R', 'CASE NUMBER:'),
    evidence('UD-100[0].Page3[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 3, '/Tx', '667 0 R', 'CASE NUMBER:'),
    evidence('UD-100[0].Page4[0].Header[0].CaseNumber[0].CaseNumber_ft[0]', 4, '/Tx', '909 0 R', 'CASE NUMBER:'),
  ].map(ev => deferred(ev, 'Pre-filing case number is expressly deferred; official blank is preserved until a court-issued event exists.')),
];

const leaseEvidence = [
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SixF[0]', 2, '/Btn', '726 0 R', 'A copy of the written agreement is not attached because'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SubListf[0].Li2[0].SixF124[0]', 2, '/Btn', '730 0 R', 'this action is solely for nonpayment of rent'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lif[0].SubListf[0].Li1[0].SixF123[0]', 2, '/Btn', '731 0 R', 'the written agreement is not in the possession of the landlord'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lid[0].SixD[0]', 2, '/Btn', '734 0 R', 'The agreement was later changed as follows'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lid[0].fl1001\\.29[0]', 2, '/Tx', '735 0 R', '(specify):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lic[0].SixC[0]', 2, '/Btn', '736 0 R', 'The defendants not named in item 6a are'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lic[0].SubListc[0].Li3[0].SixC13[0]', 2, '/Btn', '741 0 R', 'Other'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lic[0].SubListc[0].Li3[0].FillText113[0]', 2, '/Tx', '742 0 R', '(specify):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lic[0].SubListc[0].Li2[0].SixC13[0]', 2, '/Btn', '743 0 R', 'assignees.'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lic[0].SubListc[0].Li1[0].SixC13[0]', 2, '/Btn', '744 0 R', 'subtenants.'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SixB[0]', 2, '/Btn', '745 0 R', 'written'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SixB[1]', 2, '/Btn', '746 0 R', 'oral'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SubListb[0].Li4[0].SixB14[0]', 2, '/Btn', '752 0 R', 'Other'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SubListb[0].Li4[0].FillText113[0]', 2, '/Tx', '753 0 R', '(specify):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SubListb[0].Li3[0].SixB14[0]', 2, '/Btn', '754 0 R', "plaintiff's predecessor in interest."),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SubListb[0].Li2[0].SixB14[0]', 2, '/Btn', '755 0 R', "plaintiff's agent."),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lib[0].SubListb[0].Li1[0].SixB14[0]', 2, '/Btn', '756 0 R', 'plaintiff.'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].DateField12[0]', 2, '/Tx', '757 0 R', 'On or about (date):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].FillText22[0]', 2, '/Tx', '758 0 R', 'defendant (name each):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li3[0].SixA3[0]', 2, '/Btn', '763 0 R', 'first of the month'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li3[0].SixA3[1]', 2, '/Btn', '764 0 R', 'other day'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li3[0].FillText114[0]', 2, '/Tx', '765 0 R', '(specify):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].dollar[0]', 2, '/Tx', '766 0 R', 'agreed to pay rent of Dollar amount'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].SixA2[0]', 2, '/Btn', '767 0 R', 'monthly'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].SixA2[1]', 2, '/Btn', '768 0 R', 'other'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].FillText115[0]', 2, '/Tx', '769 0 R', '(specify frequency):'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li1[0].SixA1[0]', 2, '/Btn', '770 0 R', 'month-to-month tenancy'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li1[0].SixA1[1]', 2, '/Btn', '771 0 R', 'other tenancy'),
  evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li1[0].FillText116[0]', 2, '/Tx', '772 0 R', '(specify):'),
  evidence('UD-100[0].Page4[0].List16[0].Thirteen[0]', 4, '/Btn', '906 0 R', 'A written agreement between the parties provides for attorney fees.'),
] as const;
const domain4Lease: GenerationFieldRule[] = [
  ...leaseEvidence.map(ev => governedNoWrite(
    ev,
    D(CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl, CONTROL),
    ['NO_AGREEMENT_FIELDS_NOT_APPLICABLE'],
    'A current versioned governed lease-field applicability result expressly marks this bounded agreement family not applicable; D.1 preserves official blanks.',
  )),
  deferred(evidence('UD-100[0].Page2[0].List6[0].SubList6[0].Lie[0].SixE[0]', 2, '/Btn', '732 0 R', 'A copy of the written agreement is attached and labeled Exhibit 1.'), 'Agreement attachment state is packet-composition dependent and deferred beyond D.1.'),
];

const domain4Notice: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Seven[0]', 2, '/Btn', '676 0 R', 'Defendant (name each):'), noticeElectionDep, noticeDomain, noticeDomain),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li8[0].SevenA16[0]', 2, '/Btn', '686 0 R', 'Other (specify):'), noticeElectionDep, noticeDomain, ['OTHER']),
  governedNoWrite(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li8[0].fl1001\\.324[0]', 2, '/Tx', '688 0 R', 'specify other'), noticeElectionDep, ['PAY_RENT_OR_QUIT_3_DAY'], 'Current confirmed complaint notice election is not Other.'),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li7[0].SevenA16[0]', 2, '/Btn', '689 0 R', '3-day notice to quit under Civil Code § 1946.2(c)'), noticeElectionDep, noticeDomain, ['PRIOR_1946_2_C']),
  governedNoWrite(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li7[0].DateField15[0]', 2, '/Tx', '690 0 R', '(date):'), noticeElectionDep, ['PAY_RENT_OR_QUIT_3_DAY'], 'Current confirmed complaint notice election does not use prior 1946.2(c) notice-date detail.'),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li6[0].SevenA16[0]', 2, '/Btn', '691 0 R', '3-day notice to perform covenants or quit'), noticeElectionDep, noticeDomain, ['PERFORM_COVENANTS_3_DAY']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li5[0].SevenA16[0]', 2, '/Btn', '692 0 R', '30-day notice to vacate under the federal CARES Act'), noticeElectionDep, noticeDomain, ['CARES_30_DAY']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li4[0].SevenA16[0]', 2, '/Btn', '693 0 R', '3-day notice to quit'), noticeElectionDep, noticeDomain, ['QUIT_3_DAY']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li3[0].SevenA16[0]', 2, '/Btn', '694 0 R', '60-day notice to quit'), noticeElectionDep, noticeDomain, ['QUIT_60_DAY']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li2[0].SevenA16[0]', 2, '/Btn', '695 0 R', '30-day notice to quit'), noticeElectionDep, noticeDomain, ['QUIT_30_DAY']),
  checkboxEnumRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].Li1[0].SevenA16[0]', 2, '/Btn', '696 0 R', '3-day notice to pay rent or quit'), noticeElectionDep, noticeDomain, ['PAY_RENT_OR_QUIT_3_DAY']),
  textRule(evidence('UD-100[0].Page2[0].List9[0].Lia[0].fl1001\\.324[0]', 2, '/Tx', '697 0 R', 'name each'), serviceFactsDep, { id: 'OBJECT_STRING_ARRAY_SEMICOLON_V1', version: '1', args: { property: 'defendantNames' } }),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List13[0].Ten[0]', 3, '/Btn', '605 0 R', 'At the time the 3-day notice to pay rent or quit was served, the amount of rent due was'), noticeElectionDep, noticeDomain, ['PAY_RENT_OR_QUIT_3_DAY']),
  textRule(
    evidence('UD-100[0].Page3[0].List13[0].FillText209[0]', 3, '/Tx', '606 0 R', 'Dollar Amount'),
    D(CANONICAL_FILING_FACT_REFS.rentDueAtService, CUSTOMER),
    { id: 'NUMBER_TEXT_V1', version: '1' },
    condition(noticeElectionDep, ['PAY_RENT_OR_QUIT_3_DAY'], 'Rent-due-at-service amount is not applicable to a different confirmed complaint notice election.'),
  ),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List12[0].Nine[0]', 3, '/Btn', '607 0 R', 'Plaintiff demands possession from each defendant because of expiration of a fixed-term lease.'), D(CANONICAL_FILING_FACT_REFS.fixedTermExpirationElection, ELECTION), ['DO_NOT_SELECT', 'SELECT'], ['SELECT']),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List9[0].Item9[0].Lif[0].SevenF[0]', 3, '/Btn', '659 0 R', 'One or more defendants were served with a prior/different notice/date/manner as stated in Attachment 10c.'), D(CANONICAL_FILING_FACT_REFS.otherNoticesFact, CUSTOMER), ['NO_OTHER_NOTICES', 'HAS_OTHER_NOTICES'], ['HAS_OTHER_NOTICES']),
  deferred(evidence('UD-100[0].Page3[0].List9[0].Item9[0].Lie[0].SevenE[0]', 3, '/Btn', '660 0 R', 'A copy of the notice is attached and labeled Exhibit 2.'), 'Notice attachment state is packet-composition dependent and deferred beyond D.1.'),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List9[0].Item9[0].Lid[0].SevenD[0]', 3, '/Btn', '661 0 R', 'The notice included an election of forfeiture.'), serviceFactsDep, 'noticeIncludedForfeiture', true),
  textRule(evidence('UD-100[0].Page3[0].List9[0].Item9[0].Lib[0].SubListb[0].Li1[0].DateField45[0]', 3, '/Tx', '664 0 R', 'On (date): the period stated in the notice expired at the end of the day.'), serviceFactsDep, { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'noticeExpirationDate' } }),
];

const domain4Service: GenerationFieldRule[] = [
  deferred(evidence('UD-100[0].Page3[0].List10[0].Item10[0].LI4[0].Eightd[0]', 3, '/Btn', '627 0 R', 'Proof of service of the notice in item 9a is attached and labeled Exhibit 3.'), 'Proof-of-service attachment state is packet dependent and deferred beyond D.1.'),
  deferred(evidence('UD-100[0].Page3[0].List10[0].Item10[0].LI3[0].Eightc[0]', 3, '/Btn', '628 0 R', 'Information about service is stated in Attachment 10c.'), 'Attachment 10c composition is deferred beyond D.1.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].LI2[0].Eightb[0]', 3, '/Btn', '629 0 R', '(Name):'), D(CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl, CONTROL), ['NO_AGREEMENT_FIELDS_NOT_APPLICABLE'], 'Current governed no-agreement control makes joint-written-agreement service-name branch not applicable.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].LI2[0].FillText158[0]', 3, '/Tx', '630 0 R', 'enter name'), D(CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl, CONTROL), ['NO_AGREEMENT_FIELDS_NOT_APPLICABLE'], 'Current governed no-agreement control makes joint-written-agreement service-name detail not applicable.'),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].EightA[0]', 3, '/Btn', '631 0 R', 'The notice in item 9a was served on the defendant named in item 9a as follows:'), serviceElectionDep, serviceDomain, serviceDomain),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li5[0].Eighta5[0]', 3, '/Btn', '638 0 R', 'In the manner specified in a written commercial lease'), serviceElectionDep, serviceDomain, ['COMMERCIAL_LEASE_METHOD']),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li4[0].Eighta4[0]', 3, '/Btn', '639 0 R', 'By sending a copy by certified or registered mail'), serviceElectionDep, serviceDomain, ['CERTIFIED_OR_REGISTERED_MAIL']),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].EightA3[0]', 3, '/Btn', '640 0 R', 'By posting a copy on the premises'), serviceElectionDep, serviceDomain, ['POST_AND_MAIL']),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].DateField16[0]', 3, '/Tx', '641 0 R', 'on (date):'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Posting date is not applicable to the confirmed personal-delivery complaint election.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].EightA3B[0]', 3, '/Btn', '642 0 R', 'AND giving a copy to a person found residing at the premises AND mailing a copy'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Posting/substituted subbranch is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].EightA3ab[0]', 3, '/Btn', '643 0 R', "because defendant's residence and usual place of business cannot be ascertained"), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Posting reason subbranch is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].EightA3ab[1]', 3, '/Btn', '644 0 R', 'because no person of suitable age or discretion can be found there.'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Posting reason subbranch is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li3[0].DateField15[0]', 3, '/Tx', '645 0 R', 'on (date):'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Posting-mailing date is not applicable to personal delivery.'),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].EightA12[0]', 3, '/Btn', '646 0 R', 'By leaving a copy with'), serviceElectionDep, serviceDomain, ['SUBSTITUTED_SERVICE']),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].FillText164[0]', 3, '/Tx', '647 0 R', '(name or description):'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Substituted-service recipient is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].DateField14[0]', 3, '/Tx', '648 0 R', 'on (date):'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Substituted-service date is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].EightAdeliver[0]', 3, '/Btn', '649 0 R', 'residence'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Substituted-service location is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].EightAdeliver[1]', 3, '/Btn', '650 0 R', 'business'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Substituted-service location is not applicable to personal delivery.'),
  governedNoWrite(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li2[0].DateField15[0]', 3, '/Tx', '651 0 R', 'on (date):'), serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Substituted-service mailing date is not applicable to personal delivery.'),
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li1[0].EightA12[0]', 3, '/Btn', '652 0 R', 'By personally handing a copy to defendant'), serviceElectionDep, serviceDomain, ['PERSONAL_HAND_DELIVERY']),
  textRule(
    evidence('UD-100[0].Page3[0].List10[0].Item10[0].Lia[0].SubLista[0].Li1[0].DateField21[0]', 3, '/Tx', '653 0 R', 'on (date):'),
    serviceFactsDep,
    { id: 'OBJECT_PROPERTY_TEXT_V1', version: '1', args: { property: 'serviceDate' } },
    condition(serviceElectionDep, ['PERSONAL_HAND_DELIVERY'], 'Personal-delivery date is not applicable to another complaint service election.'),
  ),
];

const domain4RentalAssistance: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page3[0].List11[0].CheckBox110[0]', 3, '/Btn', '608 0 R', 'Statements regarding rental assistance'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceControl, CONTROL), ['APPLICABLE', 'NOT_APPLICABLE'], ['APPLICABLE']),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lid[0].After2[0]', 3, '/Btn', '614 0 R', 'has'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11dHas', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lid[0].After2[1]', 3, '/Btn', '615 0 R', 'does not have'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11dHas', false),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lic[0].Correspond2[0]', 3, '/Btn', '616 0 R', 'has'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11cHas', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lic[0].Correspond2[1]', 3, '/Btn', '617 0 R', 'does not have'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11cHas', false),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lib[0].After[0]', 3, '/Btn', '618 0 R', 'has received'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11bReceived', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lib[0].After[1]', 3, '/Btn', '619 0 R', 'has not received'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11bReceived', false),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lia[0].Correspond[0]', 3, '/Btn', '620 0 R', 'has received'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11aReceived', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List11[0].Item11[0].Lia[0].Correspond[1]', 3, '/Btn', '621 0 R', 'has not received'), D(CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, CUSTOMER), 'item11aReceived', false),
];

const otherReliefDep = D(CANONICAL_FILING_FACT_REFS.otherReliefSelections, ELECTION);
const domain5Relief: GenerationFieldRule[] = [
  objectBooleanRule(evidence('UD-100[0].Page2[0].List8[0].SubList8[0].Lic[0].TwoA[0]', 2, '/Btn', '702 0 R', 'Because defendant failed to vacate, plaintiff is seeking to recover the total amount in 8b as damages in this action.'), otherReliefDep, 'relocationDamages', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List15[0].Twelve[0]', 3, '/Btn', '602 0 R', "Defendant's continued possession is malicious, and plaintiff is entitled to statutory damages"), otherReliefDep, 'statutoryDamages', true),
  objectBooleanRule(evidence('UD-100[0].Page3[0].List14[0].Eleven[0]', 3, '/Btn', '603 0 R', 'The fair rental value of the premises is'), otherReliefDep, 'fairRentalValue', true),
  governedNoWrite(evidence('UD-100[0].Page3[0].List14[0].FillText208[0]', 3, '/Tx', '604 0 R', 'Dollar Amount'), otherReliefDep, [false], 'Explicit owner nonselection of fair-rental-value relief authorizes no amount write.', 'fairRentalValue'),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lii[0].Seventeenh[0]', 4, '/Btn', '893 0 R', 'Other'), otherReliefDep, 'otherRelief', true),
  governedNoWrite(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lii[0].text124[0]', 4, '/Tx', '892 0 R', 'specify'), otherReliefDep, [false], 'Explicit owner nonselection of other relief authorizes no free-text write.', 'otherRelief'),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lih[0].Seventeeng[0]', 4, '/Btn', '894 0 R', 'Statutory damages up to $600 for the conduct alleged in item 15.'), otherReliefDep, 'statutoryDamages', true),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lig[0].Seventeenf[0]', 4, '/Btn', '895 0 R', 'Damages at the rate stated in item 14 from'), otherReliefDep, 'fairRentalValue', true),
  governedNoWrite(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lig[0].DateField51[0]', 4, '/Tx', '896 0 R', 'date:'), otherReliefDep, [false], 'Explicit owner nonselection of fair-rental-value relief authorizes no damages-from date.', 'fairRentalValue'),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lif[0].Seventeenc1[0]', 4, '/Btn', '897 0 R', 'Damages in the amount of waived rent or relocation assistance'), otherReliefDep, 'relocationDamages', true),
  governedNoWrite(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lif[0].FillText37[0]', 4, '/Tx', '898 0 R', 'Dollar Amount'), otherReliefDep, [false], 'Explicit owner nonselection of relocation damages authorizes no amount write.', 'relocationDamages'),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lie[0].Seventeene[0]', 4, '/Btn', '899 0 R', 'Forfeiture of the agreement.'), otherReliefDep, 'forfeiture', true),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lid[0].Seventeend[0]', 4, '/Btn', '900 0 R', 'Reasonable attorney fees.'), otherReliefDep, 'attorneyFees', true),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lic[0].Seventeenc2[0]', 4, '/Btn', '901 0 R', 'Past-due rent of'), D(CANONICAL_FILING_FACT_REFS.pastDueRentRelief, ELECTION), 'selected', true),
  textRule(
    evidence('UD-100[0].Page4[0].List20[0].Item20[0].Lic[0].FillText36[0]', 4, '/Tx', '902 0 R', 'Dollar Amount'),
    D(CANONICAL_FILING_FACT_REFS.pastDueRentRelief, ELECTION),
    { id: 'OBJECT_PROPERTY_NUMBER_TEXT_V1', version: '1', args: { property: 'amount' } },
    condition(D(CANONICAL_FILING_FACT_REFS.pastDueRentRelief, ELECTION), [true], 'Explicit owner nonselection of past-due-rent relief authorizes no amount write.', 'selected'),
  ),
  objectBooleanRule(evidence('UD-100[0].Page4[0].List18[0].Fifteen[0]', 4, '/Btn', '903 0 R', 'Other allegations are stated in Attachment 18.'), otherReliefDep, 'otherAllegations', true),
];

const domain6Deferred: GenerationFieldRule[] = [
  deferred(evidence('UD-100[0].Page4[0].Verification[0].FillText58[0]', 4, '/Tx', '580 0 R', 'Type or Print Name'), 'Verification identity as a signing act is deferred; D.1 cannot sign or verify.'),
  deferred(evidence('UD-100[0].Page4[0].Sign1[0].DateField27[0]', 4, '/Tx', '865 0 R', 'Date:'), 'Signature date is deferred until the owner performs the signing act.'),
  deferred(evidence('UD-100[0].Page4[0].Sign1[0].FillText56[0]', 4, '/Tx', '866 0 R', 'Type or Print Name'), 'Signature identity as a signing act is deferred.'),
  deferred(evidence('UD-100[0].Page4[0].Verification[0].DateField29[0]', 4, '/Tx', '912 0 R', 'Date:'), 'Verification date is deferred until the owner performs the verification act.'),
  deferred(evidence('UD-100[0].Page4[0].List21[0].Eighteen[0]', 4, '/Btn', '882 0 R', 'Pages attached'), 'Attached-page state is packet-composition dependent and deferred.'),
  deferred(evidence('UD-100[0].Page4[0].List21[0].FillText215[0]', 4, '/Tx', '883 0 R', '(specify number of pages):'), 'Attachment count is packet-composition dependent and deferred.'),
];

const udaDep = D(CANONICAL_FILING_FACT_REFS.udaDisclosureControl, CONTROL);
const domain6Uda: GenerationFieldRule[] = [
  checkboxEnumRule(evidence('UD-100[0].Page4[0].List22[0].Nineteendid[0]', 4, '/Btn', '867 0 R', 'did not'), udaDep, ['NO_COMPENSATED_ASSISTANT', 'PAID_ASSISTANCE'], ['NO_COMPENSATED_ASSISTANT']),
  checkboxEnumRule(evidence('UD-100[0].Page4[0].List22[0].Nineteendid[1]', 4, '/Btn', '868 0 R', 'did'), udaDep, ['NO_COMPENSATED_ASSISTANT', 'PAID_ASSISTANCE'], ['PAID_ASSISTANCE']),
  ...[
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lif[0].DateField26[0]', 4, '/Tx', '876 0 R', 'Expires on (date):'),
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lie[0].TextField43[0]', 4, '/Tx', '877 0 R', 'Registration Number:'),
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lid[0].TextField42[0]', 4, '/Tx', '878 0 R', 'County of registration:'),
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lic[0].Phone_ft[0]', 4, '/Tx', '879 0 R', 'Telephone Number:'),
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lib[0].TextField41[0]', 4, '/Tx', '880 0 R', 'Street address, city, and zip code:'),
    evidence('UD-100[0].Page4[0].List22[0].Item22[0].Lia[0].TextField40[0]', 4, '/Tx', '881 0 R', "Assistant's name:"),
  ].map(ev => governedNoWrite(ev, udaDep, ['NO_COMPENSATED_ASSISTANT'], 'Current validated no-compensated-assistant control expressly authorizes no paid UDA/LDA credential write.')),
];

const nondataRules: GenerationFieldRule[] = [
  nondata(evidence('UD-100[0].#pageSet[0].MPLast[0].#area[0].Print[0]', 4, '/Btn', '590 0 R', 'Print')),
  nondata(evidence('UD-100[0].#pageSet[0].MPLast[0].#area[0].Save[0]', 4, '/Btn', '591 0 R', 'Save')),
  nondata(evidence('UD-100[0].#pageSet[0].MPLast[0].#area[0].Reset[0]', 4, '/Btn', '592 0 R', 'Clear')),
];

const groups = [
  ['DOMAIN_1', 'plaintiff-relationship', domain1Relationship],
  ['DOMAIN_1', 'plaintiff-type', domain1PlaintiffType],
  ['DOMAIN_1', 'plaintiff-dba', domain1Dba],
  ['DOMAIN_1', 'party-identities', domain1Parties],
  ['DOMAIN_1', 'doe-election', domain1Does],
  ['DOMAIN_1', 'caption-contact', domain1CaptionContact],
  ['DOMAIN_2', 'premises-court', domain2Premises],
  ['DOMAIN_2', 'tpa-just-cause', domain2Tpa],
  ['DOMAIN_2', 'local-control', domain2Local],
  ['DOMAIN_3', 'civil-lifecycle', domain3Civil],
  ['DOMAIN_4', 'lease-agreement', domain4Lease],
  ['DOMAIN_4', 'notice-election', domain4Notice],
  ['DOMAIN_4', 'service-election', domain4Service],
  ['DOMAIN_4', 'rental-assistance', domain4RentalAssistance],
  ['DOMAIN_5', 'claims-relief', domain5Relief],
  ['DOMAIN_6', 'later-stage', domain6Deferred],
  ['DOMAIN_6', 'uda-disclosure', domain6Uda],
  ['NONDATA', 'official-pdf-action-controls', nondataRules],
] as const;

const fieldRules = groups.flatMap(([, , rules]) => [...rules]);
const fieldFamilyCoverage: GenerationFieldFamilyCoverage[] = groups.map(([domainId, familyId, rules]) => ({
  domainId,
  familyId,
  fieldIds: rules.map(rule => rule.evidence.fieldId),
  resolution: 'FIELD_RULES',
}));

const allOptionalReliefFalse = {
  fairRentalValue: false,
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
} as const;

const semantics: OfficialFormGenerationBindingSemantics = {
  generationSchemaVersion: 2,
  mapId: UD100_GENERATION_BINDING_MAP_ID,
  mapVersion: UD100_GENERATION_BINDING_MAP_VERSION,
  profileId: UD100_GENERATION_PROFILE_ID,
  generatorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
  sourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  fieldRules,
  profileRequirements: [
    { dependency: lifecycleDep, allowedValues: ['INITIAL_PREFILING'], blockerCode: 'AMENDED_OR_PRIOR_COMPLAINT_UNSUPPORTED' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.captionRouteControl, CONTROL), allowedValues: ['SELF_REPRESENTED_SUPPORTED'], blockerCode: 'OUTSIDE_ATTORNEY_OR_UNRESOLVED_CAPTION_ROUTE_UNSUPPORTED' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.jurisdictionSupportControl, CONTROL), allowedValues: ['SUPPORTED_INITIAL_UD100'], blockerCode: 'UNSUPPORTED_JURISDICTION_CONTROL_STATE' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CUSTOMER), allowedValues: ['OWNER'], blockerCode: 'OTHER_PLAINTIFF_RELATIONSHIP_REQUIRES_SEPARATE_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.plaintiffType, CUSTOMER), allowedValues: ['INDIVIDUAL_OVER_18'], blockerCode: 'ENTITY_OR_OTHER_PLAINTIFF_TYPE_REQUIRES_SEPARATE_CAPTION_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.plaintiffStandingControl, CONTROL), allowedValues: ['SUPPORTED'], blockerCode: 'PLAINTIFF_STANDING_CONTROL_UNRESOLVED', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType] },
    { dependency: D(CANONICAL_FILING_FACT_REFS.dbaUse, CUSTOMER), allowedValues: ['NO_DBA'], blockerCode: 'DBA_PATH_REQUIRES_SEPARATE_GOVERNED_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.doeElection, ELECTION), allowedValues: [false], property: 'include', blockerCode: 'DOE_PATH_REQUIRES_EXACT_RANGE_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl, CONTROL), allowedValues: ['SELF_REP_NO_BAR_FIRM_FAX'], blockerCode: 'CAPTION_OPTIONAL_FIELDS_CONTROL_UNRESOLVED', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl] },
    { dependency: D(CANONICAL_FILING_FACT_REFS.tpaClassificationControl, CONTROL), allowedValues: ['SUBJECT_AT_FAULT'], blockerCode: 'TPA_NO_FAULT_OR_EXEMPT_PATH_REQUIRES_SEPARATE_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.localControl, CONTROL), allowedValues: ['NOT_SUBJECT'], blockerCode: 'LOCAL_CONTROL_SUBJECT_PATH_REQUIRES_ORDINANCE_IDENTITY_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.leaseStatus, CUSTOMER), allowedValues: ['NO_AGREEMENT'], blockerCode: 'LEASE_STATUS_CUSTOMER_FACT_REQUIRED' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl, CONTROL), allowedValues: ['NO_AGREEMENT_FIELDS_NOT_APPLICABLE'], blockerCode: 'LEASE_AGREEMENT_FIELDS_REQUIRE_EXACT_CUSTOMER_FACT_BINDING', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus] },
    { dependency: civilDep, allowedValues: civilDomain, blockerCode: 'CIVIL_CLASSIFICATION_CONTROL_UNRESOLVED', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections] },
    { dependency: noticeElectionDep, allowedValues: ['PAY_RENT_OR_QUIT_3_DAY'], blockerCode: 'NOTICE_ELECTION_OUTSIDE_BOUNDED_NONPAYMENT_PROFILE' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.noticeElectionConsistencyControl, CONTROL), allowedValues: ['CONSISTENT'], blockerCode: 'NOTICE_ELECTION_NOT_CONSISTENT_WITH_GOVERNED_NOTICE_FACTS', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.noticeComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts] },
    { dependency: serviceElectionDep, allowedValues: ['PERSONAL_HAND_DELIVERY'], blockerCode: 'SERVICE_ELECTION_OUTSIDE_BOUNDED_PERSONAL_SERVICE_PROFILE' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.serviceElectionConsistencyControl, CONTROL), allowedValues: ['CONSISTENT'], blockerCode: 'SERVICE_ELECTION_NOT_CONSISTENT_WITH_GOVERNED_SERVICE_FACTS', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts] },
    { dependency: D(CANONICAL_FILING_FACT_REFS.rentalAssistanceControl, CONTROL), allowedValues: ['APPLICABLE'], blockerCode: 'RENTAL_ASSISTANCE_CONTROL_UNRESOLVED', requiredProvenanceDependencies: [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts] },
    { dependency: D(CANONICAL_FILING_FACT_REFS.otherNoticesFact, CUSTOMER), allowedValues: ['NO_OTHER_NOTICES'], blockerCode: 'MULTIPLE_NOTICE_PATH_REQUIRES_SEPARATE_BINDING' },
    { dependency: D(CANONICAL_FILING_FACT_REFS.fixedTermExpirationElection, ELECTION), allowedValues: ['DO_NOT_SELECT'], blockerCode: 'FIXED_TERM_EXPIRATION_ALLEGATION_REQUIRES_SEPARATE_BINDING' },
    { dependency: otherReliefDep, allowedValues: [allOptionalReliefFalse], blockerCode: 'SELECTED_OPTIONAL_RELIEF_REQUIRES_EXACT_AMOUNT_TEXT_PREDICATE_BINDING' },
    { dependency: udaDep, allowedValues: ['NO_COMPENSATED_ASSISTANT'], blockerCode: 'PAID_UDA_LDA_PATH_UNSUPPORTED' },
  ],
  fieldFamilyCoverage,
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
