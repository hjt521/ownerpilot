import type {
  CreatedNoticeArtifactEnvelope,
  LandlordIdentity,
  RentPeriod,
} from './noticeFlowState';
import {
  freezeReviewCreateInput,
  hasCurrentReviewApproval,
  reviewApprovalGeneration,
} from './reviewApproval';

export const CANONICAL_FILING_FACT_REFS = {
  landlordIdentity: 'landlord.identity',
  plaintiffNames: 'plaintiff.names',
  defendantNames: 'defendant.names',
  propertyStreetAddress: 'property.streetAddress',
  propertyUnit: 'property.unit',
  propertyCity: 'property.city',
  propertyCounty: 'property.county',
  rentPeriods: 'notice.rentPeriods',
  rentDemandTotal: 'notice.rentDemandTotal',
} as const;

export type FixedCanonicalFilingFactRef =
  (typeof CANONICAL_FILING_FACT_REFS)[keyof typeof CANONICAL_FILING_FACT_REFS];
export type DefendantTelephoneFactRef = `defendant.${number}.telephone`;
export type CanonicalFilingFactRef = FixedCanonicalFilingFactRef | DefendantTelephoneFactRef;

export type FilingFactProvenanceClass =
  | 'FROZEN_CUSTOMER_CONFIRMED'
  | 'DETERMINISTIC_DERIVATION'
  | 'SUPPLEMENTAL_CUSTOMER_INPUT';

export interface CreatedNoticeFactIdentity {
  generation: string;
  createdAtISO: string;
}

export interface FilingFactProvenance {
  createdNotice: CreatedNoticeFactIdentity;
  sourcePaths: readonly string[];
  provenanceClass: FilingFactProvenanceClass;
  dependencies: readonly CanonicalFilingFactRef[];
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

export interface FilingCanonicalFactsSupplementalInput {
  defendantTelephones?: readonly SupplementalFactInput<string>[];
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
): FilingFactProvenance {
  return { createdNotice: identity, sourcePaths, provenanceClass, dependencies };
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

function supplementalTelephone(
  identity: CreatedNoticeFactIdentity,
  index: number,
  input: SupplementalFactInput<string> | undefined,
): FilingFactState<string> {
  const p = provenance(
    identity,
    [`supplemental.defendantTelephones[${index}]`],
    'SUPPLEMENTAL_CUSTOMER_INPUT',
  );
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
      reason: 'A confirmed telephone value cannot be blank.',
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: input.value, provenance: p };
}

export function projectFilingCanonicalFacts(
  createdNotice: CreatedNoticeArtifactEnvelope | null,
  supplemental: FilingCanonicalFactsSupplementalInput = {},
): FilingCanonicalFactsProjection {
  if (!createdNotice) return { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null };
  if (
    typeof createdNotice.generation !== 'string' || createdNotice.generation === '' ||
    typeof createdNotice.createdAtISO !== 'string' || createdNotice.createdAtISO === '' ||
    !createdNotice.createData
  ) {
    return { status: 'BLOCKED', reason: 'INVALID_CREATED_NOTICE_IDENTITY', facts: null };
  }

  const createData = freezeReviewCreateInput(createdNotice.createData);
  if (
    !hasCurrentReviewApproval(createData) ||
    createData.reviewApprovalGeneration !== createdNotice.generation ||
    reviewApprovalGeneration(createData) !== createdNotice.generation
  ) {
    return { status: 'BLOCKED', reason: 'INVALID_CREATED_NOTICE_IDENTITY', facts: null };
  }

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
    name => name.trim() !== '',
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
  facts[CANONICAL_FILING_FACT_REFS.rentPeriods] = periods;
  facts[CANONICAL_FILING_FACT_REFS.rentDemandTotal] = rentDemandTotal(identity, periods);

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
