import type { FilingCanonicalFactsProjection } from './filingCanonicalFacts';
import {
  evaluateOfficialFormFieldMap,
  type OfficialFormFieldMapDefinition,
  type OfficialFormFieldMapEvaluation,
  type OfficialSourceHealth,
  type OfficialSourceIdentity,
} from './officialFormFieldMap';

export const UD100_FIELD_MAP_FOUNDATION_STATUS = 'PARTIAL FOUNDATION ONLY / NOT GENERATION READY' as const;
export const UD100_SOURCE_SHA256 = '1dbc18fb4639fb2939a2df60a6401941b058296a7f521bd56b62cc0d08610496' as const;

export const UD100_OFFICIAL_SOURCE_IDENTITY: OfficialSourceIdentity = {
  registryVersion: 1,
  artifactId: 'ca_judicial_council:UD-100:2026-07-01:sha256:1dbc18fb4639fb2939a2df60a6401941b058296a7f521bd56b62cc0d08610496',
  authorityKey: 'ca_judicial_council',
  formId: 'UD-100',
  revisionEffective: '2026-07-01',
  sourceSnapshotId: 'sha256:1dbc18fb4639fb2939a2df60a6401941b058296a7f521bd56b62cc0d08610496',
  repositoryPath: 'docs/legal/official-forms/california/judicial-council/UD-100/2026-07-01/UD-100.pdf',
  repositorySha256: UD100_SOURCE_SHA256,
  artifactClass: 'official_blank',
  repositoryStatus: 'present_hash_and_blankness_verified',
};

export interface Ud100AcroFormFieldEvidence {
  fieldId: string;
  alternateName: string;
  mappingName: string;
  fieldType: '/Tx';
  sourcePage: 1 | 2;
  objectReference: string;
}

export const UD100_ACROFORM_EVIDENCE = [
  { fieldId: 'UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1_ft[0]', alternateName: 'PLAINTIFF:', mappingName: 'PLAINTIFF:', fieldType: '/Tx', sourcePage: 1, objectReference: '836 0 R' },
  { fieldId: 'UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2_ft[0]', alternateName: 'DEFENDANT:', mappingName: 'DEFENDANT:', fieldType: '/Tx', sourcePage: 1, objectReference: '837 0 R' },
  { fieldId: 'UD-100[0].Page1[0].List1[0].FillText1[0]', alternateName: 'PLAINTIFF (name each):', mappingName: 'PLAINTIFF (name each):', fieldType: '/Tx', sourcePage: 1, objectReference: '817 0 R' },
  { fieldId: 'UD-100[0].Page1[0].List1[0].FillText2[0]', alternateName: 'alleges causes of action against DEFENDANT (name each):', mappingName: 'alleges causes of action against DEFENDANT (name each):', fieldType: '/Tx', sourcePage: 1, objectReference: '818 0 R' },
  { fieldId: 'UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party1_ft[0]', alternateName: 'PLAINTIFF:', mappingName: 'PLAINTIFF:', fieldType: '/Tx', sourcePage: 2, objectReference: '776 0 R' },
  { fieldId: 'UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party2_ft[0]', alternateName: 'DEFENDANT:', mappingName: 'DEFENDANT:', fieldType: '/Tx', sourcePage: 2, objectReference: '777 0 R' },
] as const satisfies readonly Ud100AcroFormFieldEvidence[];

export const UD100_FIELD_MAP_FOUNDATION: OfficialFormFieldMapDefinition = {
  mapId: 'ud100-2026-07-01-partial-foundation-v1',
  status: UD100_FIELD_MAP_FOUNDATION_STATUS,
  sourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  artifactRole: 'OWNER_GENERATED_PREPARATION',
  bindings: [
    { fieldId: UD100_ACROFORM_EVIDENCE[0].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[0].alternateName, sourcePage: 1, canonicalFactRef: 'plaintiff.names', mappingClass: 'DETERMINISTIC_DERIVATION' },
    { fieldId: UD100_ACROFORM_EVIDENCE[1].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[1].alternateName, sourcePage: 1, canonicalFactRef: 'defendant.names', mappingClass: 'DIRECT_FROZEN_FACT' },
    { fieldId: UD100_ACROFORM_EVIDENCE[2].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[2].alternateName, sourcePage: 1, canonicalFactRef: 'plaintiff.names', mappingClass: 'DETERMINISTIC_DERIVATION' },
    { fieldId: UD100_ACROFORM_EVIDENCE[3].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[3].alternateName, sourcePage: 1, canonicalFactRef: 'defendant.names', mappingClass: 'DIRECT_FROZEN_FACT' },
    { fieldId: UD100_ACROFORM_EVIDENCE[4].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[4].alternateName, sourcePage: 2, canonicalFactRef: 'plaintiff.names', mappingClass: 'DETERMINISTIC_DERIVATION' },
    { fieldId: UD100_ACROFORM_EVIDENCE[5].fieldId, visibleLabelEvidence: UD100_ACROFORM_EVIDENCE[5].alternateName, sourcePage: 2, canonicalFactRef: 'defendant.names', mappingClass: 'DIRECT_FROZEN_FACT' },
  ],
};

export function evaluateUd100FieldMapFoundation(
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
): OfficialFormFieldMapEvaluation {
  return evaluateOfficialFormFieldMap(
    UD100_FIELD_MAP_FOUNDATION,
    suppliedSourceIdentity,
    suppliedSourceHealth,
    facts,
    'OWNER_GENERATED_PREPARATION',
  );
}
