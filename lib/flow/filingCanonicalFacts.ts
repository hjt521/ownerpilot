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
  captionFormValueControl: 'ud100.control.captionFormValue',
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
  agreementTermDescription: 'ud100.fact.agreementTermDescription',
  agreementRentAmount: 'ud100.fact.agreementRentAmount',
  agreementRentFrequency: 'ud100.fact.agreementRentFrequency',
  agreementRentFrequencyOther: 'ud100.fact.agreementRentFrequencyOther',
  agreementRentDue: 'ud100.fact.agreementRentDue',
  agreementRentDueOtherDay: 'ud100.fact.agreementRentDueOtherDay',
  agreementForm: 'ud100.fact.agreementForm',
  agreementParty: 'ud100.fact.agreementParty',
  agreementPartyOther: 'ud100.fact.agreementPartyOther',
  agreementDate: 'ud100.fact.agreementDate',
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

  packetAgreement: 'ud100.packet.agreement',
  packetNotice: 'ud100.packet.notice',
  packetProofOfService: 'ud100.packet.proofOfService',
  packetAttachment10c: 'ud100.packet.attachment10c',
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

export interface CustomerFactVerificationProvenance {
  verificationId: string;
  verifiedAtISO: string;
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
  customerVerification?: CustomerFactVerificationProvenance;
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

/**
 * Factual customer verification is intentionally separate from legal-election
 * confirmation. Agreement facts use this input so legal-election provenance can
 * never be substituted merely because the values happen to match.
 */
export type CustomerVerifiedFactInput<T> =
  | { state: 'KNOWN'; value: T; verification?: CustomerFactVerificationProvenance }
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
export type SelfRepresentedCaptionFormValue = 'Self-represented';
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
export type RepresentationStatus = 'SELF_REPRESENTED' | 'OUTSIDE_ATTORNEY';

export interface FilerContact {
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  telephone: string;
  email: string;
  representationStatus?: RepresentationStatus;
  [legacyInputKey: string]: unknown;
}

export type TpaClassification = 'SUBJECT_AT_FAULT';
export type CivilClassification = 'LIMITED_LE_10000' | 'LIMITED_GT_10000' | 'UNLIMITED';
export type LeaseStatus = 'NO_AGREEMENT' | 'MONTH_TO_MONTH' | 'FIXED_TERM' | 'OTHER';
export type AgreementRentFrequency = 'MONTHLY' | 'OTHER';
export type AgreementRentDue = 'FIRST_DAY_OF_MONTH' | 'OTHER_DAY';
export type AgreementForm = 'WRITTEN' | 'ORAL';
export type AgreementParty = 'PLAINTIFF' | 'PLAINTIFF_AGENT' | 'PLAINTIFF_PREDECESSOR' | 'OTHER';
export type LeaseApplicability =
  | 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE'
  | 'AGREEMENT_FIELDS_APPLICABLE';
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
  fairRentalValuePerDay?: string;
  fairRentalValueDamagesFromDate?: string;
  statutoryDamages: boolean;
  relocationDamages: boolean;
  forfeiture: boolean;
  attorneyFees: boolean;
  otherRelief: boolean;
  otherAllegations: boolean;
}

export type PacketArtifactRole =
  | 'EXHIBIT_1_AGREEMENT'
  | 'EXHIBIT_2_NOTICE'
  | 'EXHIBIT_3_PROOF_OF_SERVICE';

export interface PacketArtifactBinding {
  artifactId: string;
  artifactRole: PacketArtifactRole;
  sha256: string;
  byteLength: number;
  createdNotice: CreatedNoticeFactIdentity;
}

export type AgreementPacketState =
  | { kind: 'EXHIBIT_1_ATTACHED'; artifacts: readonly PacketArtifactBinding[] }
  | { kind: 'NOT_ATTACHED_LANDLORD_LACKS_POSSESSION' }
  | { kind: 'NOT_ATTACHED_SOLELY_NONPAYMENT' }
  | { kind: 'UNRESOLVED' }
  | { kind: 'NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT' };

export type NoticePacketState =
  | { kind: 'EXHIBIT_2_ATTACHED'; requiredNoticeCount: 1 | 2; artifacts: readonly PacketArtifactBinding[] }
  | { kind: 'REQUIRED_NOTICE_SET_INCOMPLETE' }
  | { kind: 'UNRESOLVED' };

export type ProofOfServicePacketState =
  | { kind: 'EXHIBIT_3_ATTACHED'; artifact: PacketArtifactBinding }
  | { kind: 'NOT_ATTACHED' }
  | { kind: 'UNRESOLVED' };

export type Attachment10cPacketState =
  | { kind: 'NOT_APPLICABLE' }
  | { kind: 'REQUIRED_BUT_UNSUPPORTED' }
  | { kind: 'UNRESOLVED' };

export interface FilingPacketCompositionInput {
  agreement?: GovernedControlInput<AgreementPacketState>;
  notice?: GovernedControlInput<NoticePacketState>;
  proofOfService?: GovernedControlInput<ProofOfServicePacketState>;
  attachment10c?: GovernedControlInput<Attachment10cPacketState>;
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
    captionFormValueControl?: GovernedControlInput<SelfRepresentedCaptionFormValue>;
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

    leaseStatus?: CustomerVerifiedFactInput<LeaseStatus>;
    agreementTermDescription?: CustomerVerifiedFactInput<string>;
    agreementRentAmount?: CustomerVerifiedFactInput<number>;
    agreementRentFrequency?: CustomerVerifiedFactInput<AgreementRentFrequency>;
    agreementRentFrequencyOther?: CustomerVerifiedFactInput<string>;
    agreementRentDue?: CustomerVerifiedFactInput<AgreementRentDue>;
    agreementRentDueOtherDay?: CustomerVerifiedFactInput<string>;
    agreementForm?: CustomerVerifiedFactInput<AgreementForm>;
    agreementParty?: CustomerVerifiedFactInput<AgreementParty>;
    agreementPartyOther?: CustomerVerifiedFactInput<string>;
    agreementDate?: CustomerVerifiedFactInput<string>;
    leaseApplicabilityControl?: GovernedControlInput<LeaseApplicability>;

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
    packetComposition?: FilingPacketCompositionInput;
  };
}

export type FilingCanonicalFactRecord = Record<string, FilingFactState<unknown>>;

export type FilingCanonicalFactsProjection =
  | { status: 'READY'; createdNoticeIdentity: CreatedNoticeFactIdentity; facts: FilingCanonicalFactRecord }
  | { status: 'BLOCKED'; reason: 'EXACT_CREATED_NOTICE_REQUIRED' | 'INVALID_CREATED_NOTICE_IDENTITY'; facts: null };

type ProvenanceAdditions = Pick<
  FilingFactProvenance,
  'legalElectionConfirmation' | 'customerVerification' | 'governedControl' | 'lifecycleEvent'
>;

function provenance(
  identity: CreatedNoticeFactIdentity,
  sourcePaths: readonly string[],
  provenanceClass: FilingFactProvenanceClass,
  dependencies: readonly CanonicalFilingFactRef[] = [],
  additions: ProvenanceAdditions = {},
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
  if (!value.every(isComplete)) return {
    state: 'REQUIRES_CONFIRMATION',
    reason: `Frozen value at ${sourcePath} contains an incomplete member.`,
    provenance: p,
  };
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
    if (landlordIdentity.state === 'CONFLICT') return { state: 'CONFLICT', values: [], reason: landlordIdentity.reason, provenance: p };
    if (landlordIdentity.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: landlordIdentity.reason, provenance: p };
    return { state: landlordIdentity.state, provenance: p };
  }
  if (landlordIdentity.value.type === 'entity') {
    const name = landlordIdentity.value.entityLegalName;
    return name.trim() === '' ? { state: 'UNANSWERED', provenance: p } : { state: 'KNOWN', value: [name], provenance: p };
  }
  if (landlordIdentity.value.names.length === 0) return { state: 'UNANSWERED', provenance: p };
  if (landlordIdentity.value.names.some(name => name.trim() === '')) return {
    state: 'REQUIRES_CONFIRMATION',
    reason: 'Frozen landlord identity contains an incomplete individual name.',
    provenance: p,
  };
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
    if (rentPeriods.state === 'CONFLICT') return { state: 'CONFLICT', values: [], reason: rentPeriods.reason, provenance: p };
    if (rentPeriods.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: rentPeriods.reason, provenance: p };
    return { state: rentPeriods.state, provenance: p };
  }
  const amounts = rentPeriods.value.map(period => period.amount);
  if (amounts.some(amount => !Number.isFinite(amount))) return {
    state: 'REQUIRES_CONFIRMATION',
    reason: 'Frozen rent-period amount is not a finite number.',
    provenance: p,
  };
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
  if (typeof input.value === 'string' && input.value.trim() === '') return {
    state: 'REQUIRES_CONFIRMATION',
    reason: `A confirmed supplemental value at ${sourcePath} cannot be blank.`,
    provenance: p,
  };
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function customerVerifiedState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: CustomerVerifiedFactInput<T> | undefined,
): FilingFactState<T> {
  const suppliedVerification = input?.state === 'KNOWN' ? input.verification : undefined;
  const verification = suppliedVerification
    && typeof suppliedVerification.verificationId === 'string'
    && suppliedVerification.verificationId.trim() !== ''
    && typeof suppliedVerification.verifiedAtISO === 'string'
    && suppliedVerification.verifiedAtISO.trim() !== ''
    ? suppliedVerification
    : undefined;
  const p = provenance(
    identity,
    [sourcePath],
    'SUPPLEMENTAL_CUSTOMER_INPUT',
    [],
    verification ? { customerVerification: verification } : {},
  );
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  if (!verification) return {
    state: 'REQUIRES_CONFIRMATION',
    reason: `Agreement fact at ${sourcePath} requires explicit customer verification provenance.`,
    provenance: p,
  };
  if (typeof input.value === 'string' && input.value.trim() === '') return {
    state: 'REQUIRES_CONFIRMATION',
    reason: `A verified agreement value at ${sourcePath} cannot be blank.`,
    provenance: p,
  };
  if (typeof input.value === 'number' && !Number.isFinite(input.value)) return {
    state: 'REQUIRES_CONFIRMATION',
    reason: `A verified agreement number at ${sourcePath} must be finite.`,
    provenance: p,
  };
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function electionState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: CustomerConfirmedLegalElectionInput<T> | undefined,
): FilingFactState<T> {
  const p = provenance(identity, [sourcePath], 'CUSTOMER_CONFIRMED_LEGAL_ELECTION', [], {
    legalElectionConfirmation: input?.state === 'KNOWN' ? input.confirmation : undefined,
  });
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
  const p = provenance(identity, [sourcePath], 'LIFECYCLE_EXTERNAL_EVENT', [], {
    lifecycleEvent: input?.state === 'KNOWN' ? input.event : undefined,
  });
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
  if (frozenUnit.state === 'KNOWN') return {
    state: 'KNOWN',
    value: { kind: 'UNIT', value: frozenUnit.value },
    provenance: provenance(
      identity,
      ['createData.propertyUnit'],
      'DETERMINISTIC_DERIVATION',
      [CANONICAL_FILING_FACT_REFS.propertyUnit],
    ),
  };
  const p = provenance(identity, ['supplemental.propertyUnitConfirmation'], 'SUPPLEMENTAL_CUSTOMER_INPUT');
  if (!explicitNoUnit || explicitNoUnit.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (explicitNoUnit.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (explicitNoUnit.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: explicitNoUnit.reason, provenance: p };
  if (explicitNoUnit.state === 'CONFLICT') return { state: 'CONFLICT', values: [], reason: explicitNoUnit.reason, provenance: p };
  if (explicitNoUnit.value !== 'NO_UNIT') return {
    state: 'REQUIRES_CONFIRMATION',
    reason: 'Explicit property-unit confirmation is outside the governed NO_UNIT domain.',
    provenance: p,
  };
  return { state: 'KNOWN', value: { kind: 'NO_UNIT' }, provenance: p };
}

const LOWER_HEX_SHA256 = /^[0-9a-f]{64}$/;
const FAIR_RENTAL_VALUE_PER_DAY = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIXED_CANONICAL_REFS = new Set<string>(Object.values(CANONICAL_FILING_FACT_REFS));

function isExactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validExactTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validGregorianDate(value: unknown): value is string {
  if (typeof value !== 'string' || !STRICT_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function validOtherReliefSelections(value: unknown): value is OtherReliefSelections {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const required = [
    'fairRentalValue',
    'statutoryDamages',
    'relocationDamages',
    'forfeiture',
    'attorneyFees',
    'otherRelief',
    'otherAllegations',
  ] as const;
  const optional = ['fairRentalValuePerDay', 'fairRentalValueDamagesFromDate'] as const;
  const allowed = new Set<string>([...required, ...optional]);
  if (Object.keys(candidate).some(key => !allowed.has(key))) return false;
  if (required.some(key => typeof candidate[key] !== 'boolean')) return false;
  if ('fairRentalValuePerDay' in candidate && typeof candidate.fairRentalValuePerDay !== 'string') return false;
  if ('fairRentalValueDamagesFromDate' in candidate && typeof candidate.fairRentalValueDamagesFromDate !== 'string') return false;
  if (candidate.fairRentalValue === false) {
    return !('fairRentalValuePerDay' in candidate) && !('fairRentalValueDamagesFromDate' in candidate);
  }
  return typeof candidate.fairRentalValuePerDay === 'string'
    && FAIR_RENTAL_VALUE_PER_DAY.test(candidate.fairRentalValuePerDay)
    && validGregorianDate(candidate.fairRentalValueDamagesFromDate);
}

function otherReliefSelectionsState(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: CustomerConfirmedLegalElectionInput<OtherReliefSelections> | undefined,
): FilingFactState<OtherReliefSelections> {
  const suppliedConfirmation = input?.state === 'KNOWN' ? input.confirmation : undefined;
  const p = provenance(identity, [sourcePath], 'CUSTOMER_CONFIRMED_LEGAL_ELECTION', [], {
    legalElectionConfirmation: suppliedConfirmation,
  });
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  if (!suppliedConfirmation
    || typeof suppliedConfirmation.confirmationId !== 'string'
    || suppliedConfirmation.confirmationId.trim() === ''
    || !validExactTimestamp(suppliedConfirmation.confirmedAtISO)
    || !validExactTimestamp(identity.createdAtISO)
    || Date.parse(suppliedConfirmation.confirmedAtISO) < Date.parse(identity.createdAtISO)) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `Fair-rental-value election at ${sourcePath} requires exact current post-Notice legal-election confirmation.`,
      provenance: p,
    };
  }
  if (!validOtherReliefSelections(input.value)) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `Fair-rental-value election at ${sourcePath} has malformed, contradictory, or unauthorized runtime shape.`,
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: input.value, provenance: p };
}

function validPacketControl(
  input: GovernedControlInput<unknown> & { state: 'KNOWN' },
): boolean {
  const control = input.control;
  if (!control
    || control.status !== 'CURRENT'
    || typeof control.controlId !== 'string' || control.controlId.trim() === ''
    || typeof control.controlVersion !== 'string' || control.controlVersion.trim() === ''
    || typeof control.resultId !== 'string' || control.resultId.trim() === '') return false;
  if (!Array.isArray(input.dependencies)) return false;
  if (new Set(input.dependencies).size !== input.dependencies.length) return false;
  return input.dependencies.every(ref =>
    typeof ref === 'string'
    && (FIXED_CANONICAL_REFS.has(ref) || /^defendant\.\d+\.telephone$/.test(ref))
  );
}

function validArtifactBinding(
  value: unknown,
  expectedRole: PacketArtifactRole,
  identity: CreatedNoticeFactIdentity,
): value is PacketArtifactBinding {
  if (!isExactObject(value, ['artifactId', 'artifactRole', 'sha256', 'byteLength', 'createdNotice'])) return false;
  const candidate = value as unknown as PacketArtifactBinding;
  return typeof candidate.artifactId === 'string'
    && candidate.artifactId.trim() !== ''
    && candidate.artifactRole === expectedRole
    && typeof candidate.sha256 === 'string'
    && LOWER_HEX_SHA256.test(candidate.sha256)
    && Number.isInteger(candidate.byteLength)
    && candidate.byteLength > 0
    && isExactObject(candidate.createdNotice, ['generation', 'createdAtISO'])
    && candidate.createdNotice.generation === identity.generation
    && candidate.createdNotice.createdAtISO === identity.createdAtISO;
}

function uniqueArtifactBindings(bindings: readonly PacketArtifactBinding[]): boolean {
  return new Set(bindings.map(binding => binding.artifactId)).size === bindings.length
    && new Set(bindings.map(binding => binding.sha256)).size === bindings.length;
}

function validAgreementPacketState(
  value: unknown,
  identity: CreatedNoticeFactIdentity,
  dependencies: readonly CanonicalFilingFactRef[],
): value is AgreementPacketState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'EXHIBIT_1_ATTACHED') {
    if (!isExactObject(value, ['kind', 'artifacts'])) return false;
    const artifacts = (value as unknown as { artifacts: unknown }).artifacts;
    return Array.isArray(artifacts)
      && artifacts.length > 0
      && artifacts.every(artifact => validArtifactBinding(artifact, 'EXHIBIT_1_AGREEMENT', identity))
      && uniqueArtifactBindings(artifacts as readonly PacketArtifactBinding[]);
  }
  if (kind === 'NOT_ATTACHED_LANDLORD_LACKS_POSSESSION'
    || kind === 'NOT_ATTACHED_SOLELY_NONPAYMENT'
    || kind === 'UNRESOLVED') return isExactObject(value, ['kind']);
  if (kind === 'NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT') {
    return isExactObject(value, ['kind'])
      && dependencies.length === 1
      && dependencies[0] === CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl;
  }
  return false;
}

function validNoticePacketState(
  value: unknown,
  identity: CreatedNoticeFactIdentity,
): value is NoticePacketState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'EXHIBIT_2_ATTACHED') {
    if (!isExactObject(value, ['kind', 'requiredNoticeCount', 'artifacts'])) return false;
    const candidate = value as unknown as { requiredNoticeCount: unknown; artifacts: unknown };
    if (candidate.requiredNoticeCount !== 1 && candidate.requiredNoticeCount !== 2) return false;
    if (!Array.isArray(candidate.artifacts) || candidate.artifacts.length !== candidate.requiredNoticeCount) return false;
    const artifacts = candidate.artifacts;
    return artifacts.every(artifact => validArtifactBinding(artifact, 'EXHIBIT_2_NOTICE', identity))
      && uniqueArtifactBindings(artifacts as readonly PacketArtifactBinding[]);
  }
  return (kind === 'REQUIRED_NOTICE_SET_INCOMPLETE' || kind === 'UNRESOLVED')
    && isExactObject(value, ['kind']);
}

function validProofPacketState(
  value: unknown,
  identity: CreatedNoticeFactIdentity,
): value is ProofOfServicePacketState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'EXHIBIT_3_ATTACHED') {
    return isExactObject(value, ['kind', 'artifact'])
      && validArtifactBinding((value as unknown as { artifact: unknown }).artifact, 'EXHIBIT_3_PROOF_OF_SERVICE', identity);
  }
  return (kind === 'NOT_ATTACHED' || kind === 'UNRESOLVED') && isExactObject(value, ['kind']);
}

function validAttachment10cPacketState(value: unknown): value is Attachment10cPacketState {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !isExactObject(value, ['kind'])) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === 'NOT_APPLICABLE' || kind === 'REQUIRED_BUT_UNSUPPORTED' || kind === 'UNRESOLVED';
}

function packetControlState<T>(
  identity: CreatedNoticeFactIdentity,
  sourcePath: string,
  input: GovernedControlInput<T> | undefined,
  validate: (value: unknown, dependencies: readonly CanonicalFilingFactRef[]) => boolean,
): FilingFactState<T> {
  const dependencies = input?.state === 'KNOWN' && Array.isArray(input.dependencies)
    ? [...input.dependencies]
    : [];
  const control = input?.state === 'KNOWN' ? input.control : undefined;
  const p = provenance(
    identity,
    [sourcePath],
    'GOVERNED_CONTROL_RESULT',
    dependencies,
    control ? { governedControl: control } : {},
  );
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED', provenance: p };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN', provenance: p };
  if (input.state === 'REQUIRES_CONFIRMATION') return { state: 'REQUIRES_CONFIRMATION', reason: input.reason, provenance: p };
  if (input.state === 'CONFLICT') return { state: 'CONFLICT', values: [...input.values], reason: input.reason, provenance: p };
  if (!validPacketControl(input as GovernedControlInput<unknown> & { state: 'KNOWN' })
    || !validate(input.value, dependencies)) {
    return {
      state: 'REQUIRES_CONFIRMATION',
      reason: `Packet-composition control at ${sourcePath} is invalid, stale, unsupported, or not exactly bound to the current Created Notice.`,
      provenance: p,
    };
  }
  return { state: 'KNOWN', value: input.value, provenance: p };
}

export function projectFilingCanonicalFacts(
  data: NoticeFlowData | null,
  supplemental: FilingCanonicalFactsSupplementalInput = {},
): FilingCanonicalFactsProjection {
  if (!data?.createdNoticeArtifact) return { status: 'BLOCKED', reason: 'EXACT_CREATED_NOTICE_REQUIRED', facts: null };
  const createdNotice = restoreCreatedNoticeArtifact(data);
  if (!createdNotice) return { status: 'BLOCKED', reason: 'INVALID_CREATED_NOTICE_IDENTITY', facts: null };

  const createData = createdNotice.createData;
  const identity = { generation: createdNotice.generation, createdAtISO: createdNotice.createdAtISO };
  const facts: FilingCanonicalFactRecord = {};
  const landlord = createData.landlordIdentity
    ? ({ state: 'KNOWN', value: createData.landlordIdentity, provenance: provenance(identity, ['createData.landlordIdentity'], 'FROZEN_CUSTOMER_CONFIRMED') } satisfies FilingFactState<LandlordIdentity>)
    : ({ state: 'UNANSWERED', provenance: provenance(identity, ['createData.landlordIdentity'], 'FROZEN_CUSTOMER_CONFIRMED') } satisfies FilingFactState<LandlordIdentity>);
  const periods = directArray(
    identity,
    'createData.rentPeriods',
    createData.rentPeriods,
    period => Number.isFinite(period.amount) && period.periodStartDate.trim() !== '' && period.periodEndDate.trim() !== '',
  ) as FilingFactState<readonly RentPeriod[]>;

  facts[CANONICAL_FILING_FACT_REFS.landlordIdentity] = landlord;
  facts[CANONICAL_FILING_FACT_REFS.plaintiffNames] = plaintiffNames(identity, landlord);
  facts[CANONICAL_FILING_FACT_REFS.defendantNames] = directArray(identity, 'createData.tenantNames', createData.tenantNames, name => name.trim() !== '');
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
  facts[CANONICAL_FILING_FACT_REFS.captionFormValueControl] = controlState(identity, 'supplemental.preparation.captionFormValueControl', preparation?.captionFormValueControl);
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
  ];
  for (const [ref, path, input] of supplementalFacts) facts[ref] = supplementalState(identity, path, input);

  const agreementFacts: readonly [FixedCanonicalFilingFactRef, string, CustomerVerifiedFactInput<unknown> | undefined][] = [
    [CANONICAL_FILING_FACT_REFS.leaseStatus, 'supplemental.preparation.leaseStatus', preparation?.leaseStatus],
    [CANONICAL_FILING_FACT_REFS.agreementTermDescription, 'supplemental.preparation.agreementTermDescription', preparation?.agreementTermDescription],
    [CANONICAL_FILING_FACT_REFS.agreementRentAmount, 'supplemental.preparation.agreementRentAmount', preparation?.agreementRentAmount],
    [CANONICAL_FILING_FACT_REFS.agreementRentFrequency, 'supplemental.preparation.agreementRentFrequency', preparation?.agreementRentFrequency],
    [CANONICAL_FILING_FACT_REFS.agreementRentFrequencyOther, 'supplemental.preparation.agreementRentFrequencyOther', preparation?.agreementRentFrequencyOther],
    [CANONICAL_FILING_FACT_REFS.agreementRentDue, 'supplemental.preparation.agreementRentDue', preparation?.agreementRentDue],
    [CANONICAL_FILING_FACT_REFS.agreementRentDueOtherDay, 'supplemental.preparation.agreementRentDueOtherDay', preparation?.agreementRentDueOtherDay],
    [CANONICAL_FILING_FACT_REFS.agreementForm, 'supplemental.preparation.agreementForm', preparation?.agreementForm],
    [CANONICAL_FILING_FACT_REFS.agreementParty, 'supplemental.preparation.agreementParty', preparation?.agreementParty],
    [CANONICAL_FILING_FACT_REFS.agreementPartyOther, 'supplemental.preparation.agreementPartyOther', preparation?.agreementPartyOther],
    [CANONICAL_FILING_FACT_REFS.agreementDate, 'supplemental.preparation.agreementDate', preparation?.agreementDate],
  ];
  for (const [ref, path, input] of agreementFacts) facts[ref] = customerVerifiedState(identity, path, input);

  const electionFacts: readonly [FixedCanonicalFilingFactRef, string, CustomerConfirmedLegalElectionInput<unknown> | undefined][] = [
    [CANONICAL_FILING_FACT_REFS.doeElection, 'supplemental.preparation.doeElection', preparation?.doeElection],
    [CANONICAL_FILING_FACT_REFS.noticeComplaintElection, 'supplemental.preparation.noticeComplaintElection', preparation?.noticeComplaintElection],
    [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, 'supplemental.preparation.serviceComplaintElection', preparation?.serviceComplaintElection],
    [CANONICAL_FILING_FACT_REFS.fixedTermExpirationElection, 'supplemental.preparation.fixedTermExpirationElection', preparation?.fixedTermExpirationElection],
    [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, 'supplemental.preparation.pastDueRentRelief', preparation?.pastDueRentRelief],
  ];
  for (const [ref, path, input] of electionFacts) facts[ref] = electionState(identity, path, input);
  facts[CANONICAL_FILING_FACT_REFS.otherReliefSelections] = otherReliefSelectionsState(
    identity,
    'supplemental.preparation.otherReliefSelections',
    preparation?.otherReliefSelections,
  );

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
  for (const [ref, path, input] of controlFacts) facts[ref] = controlState(identity, path, input);

  facts[CANONICAL_FILING_FACT_REFS.serviceFacts] = lifecycleState(identity, 'supplemental.preparation.serviceFacts', preparation?.serviceFacts);

  const packet = preparation?.packetComposition;
  facts[CANONICAL_FILING_FACT_REFS.packetAgreement] = packetControlState(
    identity,
    'supplemental.preparation.packetComposition.agreement',
    packet?.agreement,
    (value, dependencies) => validAgreementPacketState(value, identity, dependencies),
  );
  facts[CANONICAL_FILING_FACT_REFS.packetNotice] = packetControlState(
    identity,
    'supplemental.preparation.packetComposition.notice',
    packet?.notice,
    value => validNoticePacketState(value, identity),
  );
  facts[CANONICAL_FILING_FACT_REFS.packetProofOfService] = packetControlState(
    identity,
    'supplemental.preparation.packetComposition.proofOfService',
    packet?.proofOfService,
    value => validProofPacketState(value, identity),
  );
  facts[CANONICAL_FILING_FACT_REFS.packetAttachment10c] = packetControlState(
    identity,
    'supplemental.preparation.packetComposition.attachment10c',
    packet?.attachment10c,
    value => validAttachment10cPacketState(value),
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
