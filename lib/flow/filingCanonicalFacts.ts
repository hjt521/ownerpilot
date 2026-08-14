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
  | { state: 'KNOWN'; value: T; control?: GovernedControlProvenance }
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

export interface FilingCanonicalFactsSupplementalInput {
  defendantTelephones?: readonly SupplementalFactInput<string>[];
  propertyZip?: SupplementalFactInput<string>;
  preparation?: {
    selectedFilingCourt?: CustomerConfirmedLegalElectionInput<SelectedFilingCourt>;
    municipalClassification?: GovernedControlInput<MunicipalClassification>;
    initialComplaintLifecycle?: LifecycleEventInput<InitialComplaintLifecycle>;
    captionRouteControl?: GovernedControlInput<CaptionRouteControl>;
    jurisdictionSupportControl?: GovernedControlInput<JurisdictionSupportControl>;
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

function supplementalString(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: SupplementalFactInput<string> | undefined,
): FilingFactState<string> {
  const p = provenance(identity, [sourcePath], 'SUPPLEMENTAL_CUSTOMER_INPUT');
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') {
    return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  }
  if (input.state === 'CONFLICT') {
    return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  }
  if (input.value.trim() === '') {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `A confirmed supplemental value at ${sourcePath} cannot be blank.`,
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function supplementalTelephone(
  identity: CreatedNoticeFactIdentity,
  index: number,
  input: SupplementalFactInput<string> | undefined,
): FilingFactState<string> {
  return supplementalString(identity, `supplemental.defendantTelephones[${index}]`, input);
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
    [],
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
  facts[CANONICAL_FILING_FACT_REFS.propertyStreetAddress] = directString(
    identity,
    'createData.propertyAddress',
    createData.propertyAddress,
  );
  facts[CANONICAL_FILING_FACT_REFS.propertyUnit] = directString(
    identity,
    'createData.propertyUnit',
    createData.propertyUnit,
  );
  facts[CANONICAL_FILING_FACT_REFS.propertyCity] = directString(
    identity,
    'createData.propertyCity',
    createData.propertyCity,
  );
  facts[CANONICAL_FILING_FACT_REFS.propertyCounty] = directString(
    identity,
    'createData.propertyCounty',
    createData.propertyCounty,
  );
  facts[CANONICAL_FILING_FACT_REFS.propertyZip] = supplementalString(
    identity,
    'supplemental.propertyZip',
    supplemental.propertyZip,
  );
  facts[CANONICAL_FILING_FACT_REFS.rentPeriods] = periods;
  facts[CANONICAL_FILING_FACT_REFS.rentDemandTotal] = rentDemandTotal(identity, periods);

  const preparation = supplemental.preparation;
  facts[CANONICAL_FILING_FACT_REFS.selectedFilingCourt] = electionState(
    identity,
    'supplemental.preparation.selectedFilingCourt',
    preparation?.selectedFilingCourt,
  );
  facts[CANONICAL_FILING_FACT_REFS.municipalClassification] = controlState(
    identity,
    'supplemental.preparation.municipalClassification',
    preparation?.municipalClassification,
  );
  facts[CANONICAL_FILING_FACT_REFS.initialComplaintLifecycle] = lifecycleState(
    identity,
    'supplemental.preparation.initialComplaintLifecycle',
    preparation?.initialComplaintLifecycle,
  );
  facts[CANONICAL_FILING_FACT_REFS.captionRouteControl] = controlState(
    identity,
    'supplemental.preparation.captionRouteControl',
    preparation?.captionRouteControl,
  );
  facts[CANONICAL_FILING_FACT_REFS.jurisdictionSupportControl] = controlState(
    identity,
    'supplemental.preparation.jurisdictionSupportControl',
    preparation?.jurisdictionSupportControl,
  );

  const telephoneCount = Math.max(createData.tenantNames.length, supplemental.defendantTelephones?.length ?? 0);
  for (let index = 0; index < telephoneCount; index += 1) {
    facts[`defendant.${index}.telephone`] = supplementalTelephone(
      identity,
      index,
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
