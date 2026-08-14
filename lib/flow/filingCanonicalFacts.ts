import type {
  LandlordIdentity,
  NoticeFlowData,
  RentPeriod,
} from './noticeFlowState';
import { restoreCreatedNoticeArtifact } from './createdNoticeArtifact';

export const CANONICAL_FILING_FACT_REFS = {
  landlordIdentity: 'landlord.identity',
  plaintiffNames: 'plaintiff.names',
  defendantNames: 'defendant.names',
  propertyStreetAddress: 'property.streetAddress',
  propertyUnit: 'property.unit',
  propertyUnitRepresentation: 'property.unitRepresentation',
  propertyCity: 'property.city',
  propertyCounty: 'property.county',
  propertyZip: 'property.zip',
  rentPeriods: 'notice.rentPeriods',
  rentDemandTotal: 'notice.rentDemandTotal',
  selectedFilingCourt: 'ud100.selectedFilingCourt',
  municipalClassification: 'ud100.control.municipalClassification',
  initialComplaintLifecycle: 'ud100.lifecycle.initialComplaint',
  captionRouteControl: 'ud100.control.captionRoute',
  jurisdictionSupportControl: 'ud100.control.jurisdictionSupport',

  plaintiffRelationship: 'ud100.fact.plaintiffRelationship',
  plaintiffType: 'ud100.fact.plaintiffType',
  plaintiffStandingControl: 'ud100.control.plaintiffStanding',
  dbaUse: 'ud100.fact.dbaUse',
  doeElection: 'ud100.election.doeDefendants',
  filerContact: 'ud100.fact.filerContact',
  captionOptionalFieldsControl: 'ud100.control.captionOptionalFields',

  premisesAge: 'ud100.fact.premisesAge',
  tpaClassificationControl: 'ud100.control.tpaClassification',
  localControl: 'ud100.control.localRentEviction',

  civilClassificationControl: 'ud100.control.civilClassification',
  leaseStatus: 'ud100.fact.leaseStatus',
  leaseApplicabilityControl: 'ud100.control.leaseApplicability',

  noticeComplaintElection: 'ud100.election.noticeComplaint',
  noticeElectionConsistencyControl: 'ud100.control.noticeElectionConsistency',
  serviceComplaintElection: 'ud100.election.serviceComplaint',
  serviceElectionConsistencyControl: 'ud100.control.serviceElectionConsistency',
  serviceFacts: 'ud100.lifecycle.serviceFacts',
  rentDueAtService: 'ud100.fact.rentDueAtService',
  fixedTermExpirationElection: 'ud100.election.fixedTermExpiration',
  rentalAssistanceFacts: 'ud100.fact.rentalAssistance',
  rentalAssistanceControl: 'ud100.control.rentalAssistance',
  otherNoticesFact: 'ud100.fact.otherNotices',

  pastDueRentRelief: 'ud100.election.pastDueRentRelief',
  otherReliefSelections: 'ud100.election.otherReliefSelections',

  udaDisclosureControl: 'ud100.control.udaDisclosure',
} as const;

export type FixedCanonicalFilingFactRef =
  (typeof CANONICAL_FILING_FACT_REFS)[keyof typeof CANONICAL_FILING_FACT_REFS];
export type DefendantTelephoneFactRef = `defendant.${number}.telephone`;
export type CanonicalFilingFactRef = FixedCanonicalFilingFactRef | DefendantTelephoneFactRef;

export type FilingFactProvenanceClass =
  | 'FROZEN_CUSTOMER_CONFIRMED'
  | 'DETERMINISTIC_DERIVATION'
  | 'SUPPLEMENTAL_CUSTOMER_INPUT'
  | 'CUSTOMER_CONFIRMED_LEGAL_ELECTION'
  | 'GOVERNED_CONTROL_RESULT'
  | 'LIFECYCLE_EXTERNAL_EVENT';

export interface CreatedNoticeFactIdentity {
  generation: string;
  createdAtISO: string;
}

export interface LegalElectionConfirmationProvenance {
  confirmationId: string;
  confirmedAtISO: string;
}

export interface GovernedControlProvenance {
  controlId: string;
  controlVersion: string;
  resultId: string;
  status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED';
}

export interface LifecycleEventProvenance {
  sourceId: string;
  eventId: string;
  eventType: string;
}

export interface FilingFactProvenance {
  createdNotice: CreatedNoticeFactIdentity;
  sourcePaths: readonly string[];
  provenanceClass: FilingFactProvenanceClass;
  dependencies: readonly CanonicalFilingFactRef[];
  legalElectionConfirmation?: LegalElectionConfirmationProvenance;
  governedControl?: GovernedControlProvenance;
  lifecycleEvent?: LifecycleEventProvenance;
}

export type FilingFactState<T> =
  | { state: 'KNOWN'; value: T; provenance: FilingFactProvenance }
  | { state: 'UNANSWERED'; provenance: FilingFactProvenance }
  | { state: 'UNKNOWN'; provenance: FilingFactProvenance }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string; provenance: FilingFactProvenance }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string; provenance: FilingFactProvenance };

export type SupplementalFactInput<T> =
  | { state: 'KNOWN'; value: T }
  | { state: 'UNANSWERED' }
  | { state: 'UNKNOWN' }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string };

export type CustomerConfirmedLegalElectionInput<T> =
  | { state: 'KNOWN'; value: T; confirmation?: LegalElectionConfirmationProvenance }
  | { state: 'UNANSWERED' }
  | { state: 'UNKNOWN' }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string };

export type GovernedControlInput<T> =
  | { state: 'KNOWN'; value: T; control?: GovernedControlProvenance; dependencies?: readonly CanonicalFilingFactRef[] }
  | { state: 'UNANSWERED' }
  | { state: 'UNKNOWN' }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string };

export type LifecycleEventInput<T> =
  | { state: 'KNOWN'; value: T; event?: LifecycleEventProvenance }
  | { state: 'UNANSWERED' }
  | { state: 'UNKNOWN' }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string }
  | { state: 'CONFLICT'; values: readonly T[]; reason: string };

export interface SelectedFilingCourt {
  county: string;
  streetAddress: string;
  mailingAddress: string;
  cityAndZip: string;
  branchName: string;
}

export type MunicipalClassification = 'WITHIN_CITY_LIMITS' | 'UNINCORPORATED_AREA';
export type InitialComplaintLifecycle = 'INITIAL_PREFILING' | 'PRIOR_COMPLAINT_EXISTS';
export type CaptionRouteControl =
  | 'SELF_REPRESENTED_SUPPORTED'
  | 'OUTSIDE_ATTORNEY_UNSUPPORTED'
  | 'ENTITY_ROUTE_UNRESOLVED';
export type JurisdictionSupportControl = 'SUPPORTED_INITIAL_UD100' | 'UNSUPPORTED';

export type PropertyUnitRepresentation =
  | { kind: 'UNIT'; value: string }
  | { kind: 'NO_UNIT' };

export type PlaintiffRelationship = 'OWNER' | 'OTHER';
export type PlaintiffType =
  | 'INDIVIDUAL_OVER_18'
  | 'CORPORATION'
  | 'PARTNERSHIP'
  | 'PUBLIC_AGENCY'
  | 'OTHER';
export type DbaUse = 'NO_DBA' | 'USES_DBA';
export type DoeElection =
  | { include: false }
  | { include: true; rangeText: string };

export interface FilerContact {
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  telephone: string;
  email: string;
  captionForText: string;
}

export type TpaClassification = 'SUBJECT_AT_FAULT';
export type CivilClassification = 'LIMITED_LE_10000' | 'LIMITED_GT_10000' | 'UNLIMITED';
export type ComplaintNoticeElection = 'PAY_RENT_OR_QUIT_3_DAY';
export type ComplaintServiceElection = 'PERSONAL_HAND_DELIVERY';

export interface ServiceFacts {
  defendantNames: readonly string[];
  serviceDate: string;
  noticeExpirationDate: string;
  serviceMethod: 'PERSONAL_HAND_DELIVERY';
  noticeIncludedForfeiture: boolean;
}

export interface RentalAssistanceFacts {
  item11aReceived: boolean;
  item11bReceived: boolean;
  item11cHas: boolean;
  item11dHas: boolean;
}

export interface PastDueRentRelief {
  selected: boolean;
  amount?: number;
}

export interface OtherReliefSelections {
  fairRentalValue: boolean;
  statutoryDamages: boolean;
  relocationDamages: boolean;
  forfeiture: boolean;
  attorneyFees: boolean;
  otherRelief: boolean;
  otherAllegations: boolean;
}

export interface FilingCanonicalFactsSupplementalInput {
  defendantTelephones?: readonly SupplementalFactInput<string>[];
  propertyZip?: SupplementalFactInput<string>;
  propertyUnitConfirmation?: SupplementalFactInput<'NO_UNIT'>;
  preparation?: {
    selectedFilingCourt?: CustomerConfirmedLegalElectionInput<SelectedFilingCourt>;
    municipalClassification?: GovernedControlInput<MunicipalClassification>;
    initialComplaintLifecycle?: LifecycleEventInput<InitialComplaintLifecycle>;
    captionRouteControl?: GovernedControlInput<CaptionRouteControl>;
    jurisdictionSupportControl?: GovernedControlInput<JurisdictionSupportControl>;

    plaintiffRelationship?: SupplementalFactInput<PlaintiffRelationship>;
    plaintiffType?: SupplementalFactInput<PlaintiffType>;
    plaintiffStandingControl?: GovernedControlInput<'SUPPORTED'>;
    dbaUse?: SupplementalFactInput<DbaUse>;
    doeElection?: CustomerConfirmedLegalElectionInput<DoeElection>;
    filerContact?: SupplementalFactInput<FilerContact>;
    captionOptionalFieldsControl?: GovernedControlInput<'SELF_REP_NO_BAR_FIRM_FAX'>;

    premisesAge?: SupplementalFactInput<string>;
    tpaClassificationControl?: GovernedControlInput<TpaClassification>;
    localControl?: GovernedControlInput<'NOT_SUBJECT'>;
    civilClassificationControl?: GovernedControlInput<CivilClassification>;
    leaseStatus?: SupplementalFactInput<'NO_AGREEMENT'>;
    leaseApplicabilityControl?: GovernedControlInput<'NO_AGREEMENT_FIELDS_NOT_APPLICABLE'>;

    noticeComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintNoticeElection>;
    noticeElectionConsistencyControl?: GovernedControlInput<'CONSISTENT'>;
    serviceComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintServiceElection>;
    serviceElectionConsistencyControl?: GovernedControlInput<'CONSISTENT'>;
    serviceFacts?: LifecycleEventInput<ServiceFacts>;
    rentDueAtService?: SupplementalFactInput<number>;
    fixedTermExpirationElection?: CustomerConfirmedLegalElectionInput<'DO_NOT_SELECT'>;
    rentalAssistanceFacts?: SupplementalFactInput<RentalAssistanceFacts>;
    rentalAssistanceControl?: GovernedControlInput<'APPLICABLE'>;
    otherNoticesFact?: SupplementalFactInput<'NO_OTHER_NOTICES'>;
    pastDueRentRelief?: CustomerConfirmedLegalElectionInput<PastDueRentRelief>;
    otherReliefSelections?: CustomerConfirmedLegalElectionInput<OtherReliefSelections>;

    udaDisclosureControl?: GovernedControlInput<'NO_COMPENSATED_ASSISTANT'>;
  };
}

export type FilingCanonicalFactRecord = Record<string, FilingFactState<unknown>>;

export type FilingCanonicalFactsProjection =
  | {
      status: 'READY';
      createdNoticeIdentity: CreatedNoticeFactIdentity;
      facts: FilingCanonicalFactRecord;
    }
  | {
      status: 'BLOCKED';
      reason: 'EXACT_CREATED_NOTICE_REQUIRED' | 'INVALID_CREATED_NOTICE_IDENTITY';
      facts: null;
    };

function provenance(
  identity: CreatedNoticeFactIdentity,
  sourcePaths: readonly string[],
  provenanceClass: FilingFactProvenanceClass,
  dependencies: readonly CanonicalFilingFactRef[] = [],
  additions: Pick<
    FilingFactProvenance,
    'legalElectionConfirmation' | 'governedControl' | 'lifecycleEvent'
  > = {},
): FilingFactProvenance {
  return { createdNotice: identity, sourcePaths, provenanceClass, dependencies, ...additions };
}

function directString(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  value: string | undefined,
): FilingFactState<string> {
  const p = provenance(identity, [sourcePath], 'FROZEN_CUSTOMER_CONFIRMED');
  if (typeof value !== 'string' || value.trim() === '') return { state: 'UNANSWERED', provenance: p };
  return { state: 'KNOWN', value, provenance: p };
}

function directArray<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  value: readonly T[],
  isComplete: (item: T) => boolean,
): FilingFactState<readonly T[]> {
  const p = provenance(identity, [sourcePath], 'FROZEN_CUSTOMER_CONFIRMED');
  if (value.length === 0) return { state: 'UNANSWERED', provenance: p };
  if (!value.every(isComplete)) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `Frozen value at ${sourcePath} contains an incomplete member.`,
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: [...value], provenance: p };
}

function plaintiffNames(
  identity: CreatedNoticeFactIdentity,
  landlordIdentity: FilingFactState<LandlordIdentity>,
): FilingFactState<readonly string[]> {
  const p = provenance(
    identity,
    ['createData.landlordIdentity'],
    'DETERMINISTIC_DERIVATION',
    [CANONICAL_FILING_FACT_REFS.landlordIdentity],
  );
  if (landlordIdentity.state !== 'KNOWN') {
    return landlordIdentity.state === 'CONFLICT'
      ? { state: 'CONFLICT', values: [], reason: landlordIdentity.reason, provenance: p }
      : landlordIdentity.state === 'REQUIRES_CONFIRMATION'
        ? { state: 'REQUIRES_CONFIRMATION', reason: landlordIdentity.reason, provenance: p }
        : { state: landlordIdentity.state, provenance: p };
  }
  if (landlordIdentity.value.type === 'entity') {
    const name = landlordIdentity.value.entityLegalName;
    if (name.trim() === '') return { state: 'UNANSWERED', provenance: p };
    return { state: 'KNOWN', value: [name], provenance: p };
  }
  if (landlordIdentity.value.names.length === 0) return { state: 'UNANSWERED', provenance: p };
  if (landlordIdentity.value.names.some(name => name.trim() === '')) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: 'Frozen landlord identity contains an incomplete individual name.',
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: [...landlordIdentity.value.names], provenance: p };
}

function rentDemandTotal(
  identity: CreatedNoticeFactIdentity,
  rentPeriods: FilingFactState<readonly RentPeriod[]>,
): FilingFactState<number> {
  const p = provenance(
    identity,
    ['createData.rentPeriods[*].amount'],
    'DETERMINISTIC_DERIVATION',
    [CANONICAL_FILING_FACT_REFS.rentPeriods],
  );
  if (rentPeriods.state !== 'KNOWN') {
    return rentPeriods.state === 'CONFLICT'
      ? { state: 'CONFLICT', values: [], reason: rentPeriods.reason, provenance: p }
      : rentPeriods.state === 'REQUIRES_CONFIRMATION'
        ? { state: 'REQUIRES_CONFIRMATION', reason: rentPeriods.reason, provenance: p }
        : { state: rentPeriods.state, provenance: p };
  }
  const amounts = rentPeriods.value.map(period => period.amount);
  if (amounts.some(amount => !Number.isFinite(amount))) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: 'Frozen rent-period amount is not a finite number.',
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: amounts.reduce((sum, amount) => sum + amount, 0), provenance: p };
}

function supplementalState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: SupplementalFactInput<T> | undefined,
): FilingFactState<T> {
  const p = provenance(identity, [sourcePath], 'SUPPLEMENTAL_CUSTOMER_INPUT');
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  if (typeof input.value === 'string' && input.value.trim() === '') {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `A confirmed supplemental value at ${sourcePath} cannot be blank.`,
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function electionState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: CustomerConfirmedLegalElectionInput<T> | undefined,
): FilingFactState<T> {
  const p = provenance(
    identity,
    [sourcePath],
    'CUSTOMER_CONFIRMED_LEGAL_ELECTION',
    [],
    { legalElectionConfirmation: input?.state === 'KNOWN' ? input.confirmation : undefined },
  );
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function controlState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: GovernedControlInput<T> | undefined,
): FilingFactState<T> {
  const p = provenance(
    identity,
    [sourcePath],
    'GOVERNED_CONTROL_RESULT',
    input?.state === 'KNOWN' ? (input.dependencies ?? []) : [],
    { governedControl: input?.state === 'KNOWN' ? input.control : undefined },
  );
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function lifecycleState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: LifecycleEventInput<T> | undefined,
): FilingFactState<T> {
  const p = provenance(
    identity,
    [sourcePath],
    'LIFECYCLE_EXTERNAL_EVENT',
    [],
    { lifecycleEvent: input?.state === 'KNOWN' ? input.event : undefined },
  );
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function unitRepresentation(
  identity: CreatedNoticeFactIdentity,
  frozenUnit: FilingFactState<string>,
  explicitNoUnit: SupplementalFactInput<'NO_UNIT'> | undefined,
): FilingFactState<PropertyUnitRepresentation> {
  if (frozenUnit.state === 'KNOWN') {
    return {
      state: 'KNOWN',
      value: { kind: 'UNIT', value: frozenUnit.value },
      provenance: provenance(
        identity,
        ['createData.propertyUnit'],
        'DETERMINISTIC_DERIVATION',
        [CANONICAL_FILING_FACT_REFS.propertyUnit],
      ),
    };
  }
  const p = provenance(identity, ['supplemental.propertyUnitConfirmation'], 'SUPPLEMENTAL_CUSTOMER_INPUT');
  if (!explicitNoUnit || explicitNoUnit.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (explicitNoUnit.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (explicitNoUnit.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: explicitNoUnit.reason, provenance: p };
  if (explicitNoUnit.state === 'CONFLICT') return { state: 'CONFLICT', values: [], reason: explicitNoUnit.reason, provenance: p };
  if (explicitNoUnit.value !== 'NO_UNIT') {
    return { state: 'REQUIRES_CONFIRMATION', reason: 'Explicit property-unit confirmation is outside the governed NO_UNIT domain.', provenance: p };
  }
  return { state: 'KNOWN', value: { kind: 'NO_UNIT' }, provenance: p };
}

export function projectFilingCanonicalFacts(
  data: NoticeFlowData | null,
  supplemental: FilingCanonicalFactsSupplementalInput = {},
): FilingCanonicalFactsProjection {
  if (!data?.createdNoticeArtifact) {
    return { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null };
  }

  const createdNotice = restoreCreatedNoticeArtifact(data);
  if (!createdNotice) {
    return { status: 'BLOCKED', reason: 'INVALID_CREATED_NOTICE_IDENTITY', facts: null };
  }

  const createData = createdNotice.createData;
  const identity = {
    generation: createdNotice.generation,
    createdAtISO: createdNotice.createdAtISO,
  };
  const facts: FilingCanonicalFactRecord = {};

  const landlord = createData.landlordIdentity
    ? ({
        state: 'KNOWN',
        value: createData.landlordIdentity,
        provenance: provenance(identity, ['createData.landlordIdentity'], 'FROZEN_CUSTOMER_CONFIRMED'),
      } satisfies FilingFactState<LandlordIdentity>)
    : ({
        state: 'UNANSWERED',
        provenance: provenance(identity, ['createData.landlordIdentity'], 'FROZEN_CUSTOMER_CONFIRMED'),
      } satisfies FilingFactState<LandlordIdentity>);
  const periods = directArray(
    identity,
    'createData.rentPeriods',
    createData.rentPeriods,
    period => Number.isFinite(period.amount) && period.periodStartDate.trim() !== '' && period.periodEndDate.trim() !== '',
  ) as FilingFactState<readonly RentPeriod[]>;

  facts[CANONICAL_FILING_FACT_REFS.landlordIdentity] = landlord;
  facts[CANONICAL_FILING_FACT_REFS.plaintiffNames] = plaintiffNames(identity, landlord);
  facts[CANONICAL_FILING_FACT_REFS.defendantNames] = directArray(
    identity,
    'createData.tenantNames',
    createData.tenantNames,
    (name: string) => name.trim() !== '',
  );
  facts[CANONICAL_FILING_FACT_REFS.propertyStreetAddress] = directString(identity, 'createData.propertyAddress', createData.propertyAddress);
  const frozenUnit = directString(identity, 'createData.propertyUnit', createData.propertyUnit);
  facts[CANONICAL_FILING_FACT_REFS.propertyUnit] = frozenUnit;
  facts[CANONICAL_FILING_FACT_REFS.propertyUnitRepresentation] = unitRepresentation(identity, frozenUnit, supplemental.propertyUnitConfirmation);
  facts[CANONICAL_FILING_FACT_REFS.propertyCity] = directString(identity, 'createData.propertyCity', createData.propertyCity);
  facts[CANONICAL_FILING_FACT_REFS.propertyCounty] = directString(identity, 'createData.propertyCounty', createData.propertyCounty);
  facts[CANONICAL_FILING_FACT_REFS.propertyZip] = supplementalState(identity, 'supplemental.propertyZip', supplemental.propertyZip);
  facts[CANONICAL_FILING_FACT_REFS.rentPeriods] = periods;
  facts[CANONICAL_FILING_FACT_REFS.rentDemandTotal] = rentDemandTotal(identity, periods);

  const preparation = supplemental.preparation;
  facts[CANONICAL_FILING_FACT_REFS.selectedFilingCourt] = electionState(identity, 'supplemental.preparation.selectedFilingCourt', preparation?.selectedFilingCourt);
  facts[CANONICAL_FILING_FACT_REFS.municipalClassification] = controlState(identity, 'supplemental.preparation.municipalClassification', preparation?.municipalClassification);
  facts[CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle] = lifecycleState(identity, 'supplemental.preparation.initialComplaintLifecycle', preparation?.initialComplaintLifecycle);
  facts[CANONICAL_FILING_FACT_REFS.captionRouteControl] = controlState(identity, 'supplemental.preparation.captionRouteControl', preparation?.captionRouteControl);
  facts[CANONICAL_FILING_FACT_REFS.jurisdictionSupportControl] = controlState(identity, 'supplemental.preparation.jurisdictionSupportControl', preparation?.jurisdictionSupportControl);

  const supplementalFacts: readonly [FixedCanonicalFilingFactRef, string, SupplementalFactInput<unknown> | undefined][] = [
    [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, 'supplemental.preparation.plaintiffRelationship', preparation?.plaintiffRelationship],
    [CANONICAL_FILING_FACT_REFS.plaintiffType, 'supplemental.preparation.plaintiffType', preparation?.plaintiffType],
    [CANONICAL_FILING_FACT_REFS.dbaUse, 'supplemental.preparation.dbaUse', preparation?.dbaUse],
    [CANONICAL_FILING_FACT_REFS.filerContact, 'supplemental.preparation.filerContact', preparation?.filerContact],
    [CANONICAL_FILING_FACT_REFS.premisesAge, 'supplemental.preparation.premisesAge', preparation?.premisesAge],
    [CANONICAL_FILING_FACT_REFS.rentDueAtService, 'supplemental.preparation.rentDueAtService', preparation?.rentDueAtService],
    [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts, 'supplemental.preparation.rentalAssistanceFacts', preparation?.rentalAssistanceFacts],
    [CANONICAL_FILING_FACT_REFS.otherNoticesFact, 'supplemental.preparation.otherNoticesFact', preparation?.otherNoticesFact],
    [CANONICAL_FILING_FACT_REFS.leaseStatus, 'supplemental.preparation.leaseStatus', preparation?.leaseStatus],
  ];
  for (const [ref, path, input] of supplementalFacts) {
    facts[ref] = supplementalState(identity, path, input);
  }

  const electionFacts: readonly [FixedCanonicalFilingFactRef, string, CustomerConfirmedLegalElectionInput<unknown> | undefined][] = [
    [CANONICAL_FILING_FACT_REFS.doeElection, 'supplemental.preparation.doeElection', preparation?.doeElection],
    [CANONICAL_FILING_FACT_REFS.noticeComplaintElection, 'supplemental.preparation.noticeComplaintElection', preparation?.noticeComplaintElection],
    [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, 'supplemental.preparation.serviceComplaintElection', preparation?.serviceComplaintElection],
    [CANONICAL_FILING_FACT_REFS.fixedTermExpirationElection, 'supplemental.preparation.fixedTermExpirationElection', preparation?.fixedTermExpirationElection],
    [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, 'supplemental.preparation.pastDueRentRelief', preparation?.pastDueRentRelief],
    [CANONICAL_FILING_FACT_REFS.otherReliefSelections, 'supplemental.preparation.otherReliefSelections', preparation?.otherReliefSelections],
  ];
  for (const [ref, path, input] of electionFacts) {
    facts[ref] = electionState(identity, path, input);
  }

  const controlFacts: readonly [FixedCanonicalFilingFactRef, string, GovernedControlInput<unknown> | undefined][] = [
    [CANONICAL_FILING_FACT_REFS.plaintiffStandingControl, 'supplemental.preparation.plaintiffStandingControl', preparation?.plaintiffStandingControl],
    [CANONICAL_FILING_FACT_REFS.captionOptionalFieldsControl, 'supplemental.preparation.captionOptionalFieldsControl', preparation?.captionOptionalFieldsControl],
    [CANONICAL_FILING_FACT_REFS.tpaClassificationControl, 'supplemental.preparation.tpaClassificationControl', preparation?.tpaClassificationControl],
    [CANONICAL_FILING_FACT_REFS.localControl, 'supplemental.preparation.localControl', preparation?.localControl],
    [CANONICAL_FILING_FACT_REFS.civilClassificationControl, 'supplemental.preparation.civilClassificationControl', preparation?.civilClassificationControl],
    [CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl, 'supplemental.preparation.leaseApplicabilityControl', preparation?.leaseApplicabilityControl],
    [CANONICAL_FILING_FACT_REFS.noticeElectionConsistencyControl, 'supplemental.preparation.noticeElectionConsistencyControl', preparation?.noticeElectionConsistencyControl],
    [CANONICAL_FILING_FACT_REFS.serviceElectionConsistencyControl, 'supplemental.preparation.serviceElectionConsistencyControl', preparation?.serviceElectionConsistencyControl],
    [CANONICAL_FILING_FACT_REFS.rentalAssistanceControl, 'supplemental.preparation.rentalAssistanceControl', preparation?.rentalAssistanceControl],
    [CANONICAL_FILING_FACT_REFS.udaDisclosureControl, 'supplemental.preparation.udaDisclosureControl', preparation?.udaDisclosureControl],
  ];
  for (const [ref, path, input] of controlFacts) {
    facts[ref] = controlState(identity, path, input);
  }

  facts[CANONICAL_FILING_FACT_REFS.serviceFacts] = lifecycleState(
    identity,
    'supplemental.preparation.serviceFacts',
    preparation?.serviceFacts,
  );

  const telephoneCount = Math.max(createData.tenantNames.length, supplemental.defendantTelephones?.length ?? 0);
  for (let index = 0; index < telephoneCount; index += 1) {
    facts[`defendant.${index}.telephone`] = supplementalState(
      identity,
      `supplemental.defendantTelephones[${index}]`,
      supplemental.defendantTelephones?.[index],
    );
  }

  return { status: 'READY', createdNoticeIdentity: identity, facts };
}

export function readCanonicalFilingFact<T = unknown>(
  projection: FilingCanonicalFactsProjection,
  ref: CanonicalFilingFactRef,
): FilingFactState<T> | null {
  if (projection.status !== 'READY') return null;
  return (projection.facts[ref] as FilingFactState<T> | undefined) ?? null;
}
