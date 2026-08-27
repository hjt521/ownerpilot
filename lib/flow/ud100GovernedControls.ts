import {
  CANONICAL_FILING_FACT_REFS,
  type CaptionRouteControl,
  type ComplaintNoticeElection,
  type ComplaintServiceElection,
  type CustomerConfirmedLegalElectionInput,
  type CustomerVerifiedFactInput,
  type FilerContact,
  type GovernedControlInput,
  type GovernedControlProvenance,
  type LeaseApplicability,
  type LeaseStatus,
  type LifecycleEventInput,
  type PlaintiffRelationship,
  type PlaintiffType,
  type SelfRepresentedCaptionFormValue,
  type ServiceFacts,
  type SupplementalFactInput,
} from './filingCanonicalFacts';
import type { NoticeFlowData } from './noticeFlowState';
import {
  CREATED_NOTICE_ARTIFACT_TYPE,
  evaluateCreatedNoticeSemanticProvenance,
  restoreCreatedNoticeArtifact,
} from './createdNoticeArtifact';
import { evaluateStaleness } from './escalation';
import { deriveResolveRecordContext } from './outcomeEvents';

export const UD100_GOVERNED_CONTROL_VERSION = '1.1.0' as const;

export const UD100_GOVERNED_CONTROL_IDS = Object.freeze({
  captionRoute: 'ud100.caption-route',
  captionFormValue: 'ud100.caption-form-value',
  captionOptionalFields: 'ud100.caption-optional-fields',
  leaseApplicability: 'ud100.lease-applicability',
  noticeElectionConsistency: 'ud100.notice-election-consistency',
  serviceElectionConsistency: 'ud100.service-election-consistency',
} as const);

const CAPTION_ROUTE_DEPENDENCIES = [
  CANONICAL_FILING_FACT_REFS.plaintiffRelationship,
  CANONICAL_FILING_FACT_REFS.plaintiffType,
  CANONICAL_FILING_FACT_REFS.filerContact,
  CANONICAL_FILING_FACT_REFS.plaintiffNames,
] as const;

function currentControl<T>(
  controlId: string,
  resultId: string,
  value: T,
  dependencies: readonly (typeof CAPTION_ROUTE_DEPENDENCIES[number] | string)[],
): GovernedControlInput<T> {
  return {
    state: 'KNOWN',
    value,
    control: {
      controlId,
      controlVersion: UD100_GOVERNED_CONTROL_VERSION,
      resultId,
      status: 'CURRENT',
    },
    dependencies: [...dependencies] as any,
  };
}

function unsupportedControl<T>(
  controlId: string,
  resultId: string,
  value: T,
  dependencies: readonly string[],
): GovernedControlInput<T> {
  return {
    state: 'KNOWN',
    value,
    control: {
      controlId,
      controlVersion: UD100_GOVERNED_CONTROL_VERSION,
      resultId,
      status: 'UNSUPPORTED',
    },
    dependencies: [...dependencies] as any,
  };
}

function unresolved<T>(reason: string): GovernedControlInput<T> {
  return { state: 'REQUIRES_CONFIRMATION', reason };
}

function unresolvedLifecycle<T>(reason: string): LifecycleEventInput<T> {
  return { state: 'REQUIRES_CONFIRMATION', reason };
}

function fromFactState<TOut, TIn>(
  input: SupplementalFactInput<TIn> | CustomerConfirmedLegalElectionInput<TIn> | CustomerVerifiedFactInput<TIn> | undefined,
  label: string,
): GovernedControlInput<TOut> | null {
  if (!input || input.state === 'UNANSWERED') return { state: 'UNANSWERED' };
  if (input.state === 'UNKNOWN') return { state: 'UNKNOWN' };
  if (input.state === 'REQUIRES_CONFIRMATION') {
    return { state: 'REQUIRES_CONFIRMATION', reason: input.reason };
  }
  if (input.state === 'CONFLICT') {
    return { state: 'CONFLICT', values: [], reason: input.reason || `${label} is conflicting.` };
  }
  return null;
}

function hasCurrentControl(
  input: GovernedControlInput<unknown>,
  expectedControlId: string,
): input is Extract<GovernedControlInput<unknown>, { state: 'KNOWN' }> & {
  control: GovernedControlProvenance;
} {
  if (input.state !== 'KNOWN' || !input.control) return false;
  return input.control.controlId === expectedControlId
    && input.control.controlVersion === UD100_GOVERNED_CONTROL_VERSION
    && input.control.status === 'CURRENT'
    && input.control.resultId.trim() !== '';
}

function confirmationIsCurrent<T>(
  input: CustomerConfirmedLegalElectionInput<T>,
): input is Extract<CustomerConfirmedLegalElectionInput<T>, { state: 'KNOWN' }> & {
  confirmation: { confirmationId: string; confirmedAtISO: string };
} {
  return input.state === 'KNOWN'
    && !!input.confirmation
    && input.confirmation.confirmationId.trim() !== ''
    && input.confirmation.confirmedAtISO.trim() !== '';
}

function verificationIsCurrent<T>(
  input: CustomerVerifiedFactInput<T>,
): input is Extract<CustomerVerifiedFactInput<T>, { state: 'KNOWN' }> & {
  verification: { verificationId: string; verifiedAtISO: string };
} {
  return input.state === 'KNOWN'
    && !!input.verification
    && input.verification.verificationId.trim() !== ''
    && input.verification.verifiedAtISO.trim() !== '';
}

function nonblank(value: string): boolean {
  return value.trim() !== '';
}

function completeFilerContact(contact: FilerContact): boolean {
  return nonblank(contact.name)
    && nonblank(contact.streetAddress)
    && nonblank(contact.city)
    && nonblank(contact.state)
    && nonblank(contact.zip)
    && nonblank(contact.telephone)
    && nonblank(contact.email)
    && (contact.representationStatus === 'SELF_REPRESENTED'
      || contact.representationStatus === 'OUTSIDE_ATTORNEY');
}

export interface CaptionRouteSupportProducerInput {
  data: NoticeFlowData | null;
  plaintiffRelationship?: SupplementalFactInput<PlaintiffRelationship>;
  plaintiffType?: SupplementalFactInput<PlaintiffType>;
  filerContact?: SupplementalFactInput<FilerContact>;
}

export interface CaptionRouteSupportProducerOutput {
  captionRouteControl: GovernedControlInput<CaptionRouteControl>;
  captionFormValueControl: GovernedControlInput<SelfRepresentedCaptionFormValue>;
}

export function produceCaptionRouteSupport(
  input: CaptionRouteSupportProducerInput,
): CaptionRouteSupportProducerOutput {
  const relationshipUnresolved = fromFactState<CaptionRouteControl, PlaintiffRelationship>(
    input.plaintiffRelationship,
    'Plaintiff relationship',
  );
  if (relationshipUnresolved) {
    return {
      captionRouteControl: relationshipUnresolved,
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }
  const typeUnresolved = fromFactState<CaptionRouteControl, PlaintiffType>(
    input.plaintiffType,
    'Plaintiff type',
  );
  if (typeUnresolved) {
    return {
      captionRouteControl: typeUnresolved,
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }
  const contactUnresolved = fromFactState<CaptionRouteControl, FilerContact>(
    input.filerContact,
    'Filer contact',
  );
  if (contactUnresolved) {
    return {
      captionRouteControl: contactUnresolved,
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }

  const relationship = input.plaintiffRelationship!.state === 'KNOWN'
    ? input.plaintiffRelationship!.value
    : null;
  const plaintiffType = input.plaintiffType!.state === 'KNOWN'
    ? input.plaintiffType!.value
    : null;
  const contact = input.filerContact!.state === 'KNOWN' ? input.filerContact!.value : null;

  if (!contact || !completeFilerContact(contact)) {
    return {
      captionRouteControl: unresolved('Supported self-represented caption route requires complete nonblank filer contact facts.'),
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }

  if (relationship !== 'OWNER') {
    return {
      captionRouteControl: unresolved('Current bounded caption route supports only plaintiff relationship OWNER.'),
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }

  if (plaintiffType !== 'INDIVIDUAL_OVER_18') {
    const entityResult: CaptionRouteControl = 'ENTITY_ROUTE_UNRESOLVED';
    return {
      captionRouteControl: unsupportedControl(
        UD100_GOVERNED_CONTROL_IDS.captionRoute,
        `caption-route:v1:unsupported:${String(plaintiffType)}`,
        entityResult,
        [...CAPTION_ROUTE_DEPENDENCIES],
      ),
      captionFormValueControl: unresolved('Entity or other plaintiff caption expansion is unsupported.'),
    };
  }

  const restored = input.data ? restoreCreatedNoticeArtifact(input.data) : null;
  if (!restored) {
    return {
      captionRouteControl: unresolved('Exact current Created Notice identity is required to bind the sole plaintiff identity.'),
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }

  const landlordIdentity = restored.createData.landlordIdentity;
  if (!landlordIdentity || landlordIdentity.type !== 'individual') {
    return {
      captionRouteControl: unsupportedControl(
        UD100_GOVERNED_CONTROL_IDS.captionRoute,
        `caption-route:v1:${restored.generation}:entity-route-unresolved`,
        'ENTITY_ROUTE_UNRESOLVED',
        [...CAPTION_ROUTE_DEPENDENCIES],
      ),
      captionFormValueControl: unresolved('Entity caption expansion is unsupported.'),
    };
  }

  const frozenNames = landlordIdentity.names.map((name) => name.trim()).filter(Boolean);
  if (frozenNames.length !== 1) {
    return {
      captionRouteControl: unresolved('Current bounded caption route requires exactly one frozen individual plaintiff identity.'),
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }
  if (contact.name.trim() !== frozenNames[0]) {
    return {
      captionRouteControl: {
        state: 'CONFLICT',
        values: [],
        reason: 'Filer contact name does not exactly match the sole frozen plaintiff identity.',
      },
      captionFormValueControl: unresolved('Caption form value cannot be produced from conflicting filer/plaintiff identity.'),
    };
  }

  if (contact.representationStatus === 'OUTSIDE_ATTORNEY') {
    return {
      captionRouteControl: unsupportedControl(
        UD100_GOVERNED_CONTROL_IDS.captionRoute,
        `caption-route:v1:${restored.generation}:outside-attorney`,
        'OUTSIDE_ATTORNEY_UNSUPPORTED',
        [...CAPTION_ROUTE_DEPENDENCIES],
      ),
      captionFormValueControl: unresolved('Outside-attorney caption route is unsupported.'),
    };
  }

  if (contact.representationStatus !== 'SELF_REPRESENTED') {
    return {
      captionRouteControl: unresolved('Representation status is unresolved.'),
      captionFormValueControl: unresolved('Caption form value requires a resolved supported caption route.'),
    };
  }

  const routeResultId = `caption-route:v1:${JSON.stringify({
    generation: restored.generation,
    plaintiffName: frozenNames[0],
    relationship: 'OWNER',
    plaintiffType: 'INDIVIDUAL_OVER_18',
    representationStatus: 'SELF_REPRESENTED',
  })}`;
  const captionRouteControl = currentControl(
    UD100_GOVERNED_CONTROL_IDS.captionRoute,
    routeResultId,
    'SELF_REPRESENTED_SUPPORTED' as const,
    CAPTION_ROUTE_DEPENDENCIES,
  );
  const captionFormValueControl = currentControl(
    UD100_GOVERNED_CONTROL_IDS.captionFormValue,
    `caption-form-value:v1:${routeResultId}`,
    'Self-represented' as const,
    [CANONICAL_FILING_FACT_REFS.captionRouteControl],
  );

  return { captionRouteControl, captionFormValueControl };
}

export function produceCaptionOptionalFieldsControl(
  captionRouteControl: GovernedControlInput<CaptionRouteControl>,
): GovernedControlInput<'SELF_REP_NO_BAR_FIRM_FAX'> {
  if (!hasCurrentControl(captionRouteControl, UD100_GOVERNED_CONTROL_IDS.captionRoute)) {
    return unresolved('Caption optional fields require a versioned CURRENT governed caption route.');
  }
  if (captionRouteControl.value !== 'SELF_REPRESENTED_SUPPORTED') {
    return unresolved('Caption optional fields are unsupported outside the bounded self-represented route.');
  }
  if (!captionRouteControl.control.resultId.startsWith('caption-route:v1:')) {
    return unresolved('Caption route result identity is malformed or spoofed.');
  }
  return currentControl(
    UD100_GOVERNED_CONTROL_IDS.captionOptionalFields,
    `caption-optional-fields:v1:${captionRouteControl.control.resultId}`,
    'SELF_REP_NO_BAR_FIRM_FAX' as const,
    [CANONICAL_FILING_FACT_REFS.captionRouteControl],
  );
}

/**
 * Only an explicitly customer-verified lease classification may resolve lease
 * applicability. Unresolved or unverified state cannot become either positive
 * applicability result.
 */
export function produceLeaseApplicabilityControl(
  leaseStatus: CustomerVerifiedFactInput<LeaseStatus> | undefined,
): GovernedControlInput<LeaseApplicability> {
  const unresolvedInput = fromFactState<LeaseApplicability, LeaseStatus>(leaseStatus, 'Lease status');
  if (unresolvedInput) return unresolvedInput;
  if (!leaseStatus || !verificationIsCurrent(leaseStatus)) {
    return unresolved('Lease applicability requires explicit customer verification provenance for the agreement classification.');
  }
  const value: LeaseApplicability = leaseStatus.value === 'NO_AGREEMENT'
    ? 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE'
    : 'AGREEMENT_FIELDS_APPLICABLE';
  return currentControl(
    UD100_GOVERNED_CONTROL_IDS.leaseApplicability,
    `lease-applicability:v1.1:${leaseStatus.value}:${leaseStatus.verification.verificationId}`,
    value,
    [CANONICAL_FILING_FACT_REFS.leaseStatus],
  );
}

export function produceNoticeElectionConsistencyControl(input: {
  data: NoticeFlowData | null;
  noticeComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintNoticeElection>;
}): GovernedControlInput<'CONSISTENT'> {
  const unresolvedElection = fromFactState<'CONSISTENT', ComplaintNoticeElection>(
    input.noticeComplaintElection,
    'Complaint Notice election',
  );
  if (unresolvedElection) return unresolvedElection;
  if (!input.noticeComplaintElection || !confirmationIsCurrent(input.noticeComplaintElection)) {
    return unresolved('Notice consistency requires a separately captured owner election with affirmative confirmation provenance.');
  }
  if (input.noticeComplaintElection.value !== 'PAY_RENT_OR_QUIT_3_DAY') {
    return unresolved('Complaint Notice election is outside the bounded pay-rent-or-quit profile.');
  }
  if (!input.data?.createdNoticeArtifact) return { state: 'UNANSWERED' };

  const rawSemantic = evaluateCreatedNoticeSemanticProvenance(input.data.createdNoticeArtifact);
  if (rawSemantic.status === 'UNPROVEN_LEGACY') {
    return unresolved('Legacy Created Notice lacks semantic provenance required by D.1.');
  }
  if (rawSemantic.status === 'INVALID') {
    return unresolved(`Created Notice semantic provenance is invalid: ${rawSemantic.reason}`);
  }

  const restored = restoreCreatedNoticeArtifact(input.data);
  if (!restored) return unresolved('Created Notice identity/generation is stale, mismatched, or invalid.');
  const semantic = evaluateCreatedNoticeSemanticProvenance(restored);
  if (semantic.status !== 'PROVEN') {
    return unresolved('Created Notice semantic provenance is not PROVEN after exact restore.');
  }
  if (semantic.semantics.artifactType !== CREATED_NOTICE_ARTIFACT_TYPE) {
    return unresolved('Created Notice artifact type is outside the bounded D.1 Notice profile.');
  }

  return currentControl(
    UD100_GOVERNED_CONTROL_IDS.noticeElectionConsistency,
    `notice-election-consistency:v1:${JSON.stringify({
      generation: restored.generation,
      semanticBindingId: semantic.semanticBindingId,
      election: input.noticeComplaintElection.value,
      confirmationId: input.noticeComplaintElection.confirmation.confirmationId,
    })}`,
    'CONSISTENT' as const,
    [CANONICAL_FILING_FACT_REFS.noticeComplaintElection],
  );
}

export interface ServiceElectionConsistencyProducerOutput {
  serviceFacts: LifecycleEventInput<ServiceFacts>;
  serviceElectionConsistencyControl: GovernedControlInput<'CONSISTENT'>;
}

function blockedService(reason: string): ServiceElectionConsistencyProducerOutput {
  return {
    serviceFacts: unresolvedLifecycle(reason),
    serviceElectionConsistencyControl: unresolved(reason),
  };
}

export function produceServiceElectionConsistency(input: {
  data: NoticeFlowData | null;
  serviceComplaintElection?: CustomerConfirmedLegalElectionInput<ComplaintServiceElection>;
}): ServiceElectionConsistencyProducerOutput {
  const unresolvedElection = fromFactState<'CONSISTENT', ComplaintServiceElection>(
    input.serviceComplaintElection,
    'Complaint service election',
  );
  if (unresolvedElection) {
    return {
      serviceFacts: unresolvedLifecycle('Service facts cannot authorize a missing or unresolved owner service election.'),
      serviceElectionConsistencyControl: unresolvedElection,
    };
  }
  if (!input.serviceComplaintElection || !confirmationIsCurrent(input.serviceComplaintElection)) {
    return blockedService('Service consistency requires a separately captured owner service election with affirmative confirmation provenance.');
  }
  if (input.serviceComplaintElection.value !== 'PERSONAL_HAND_DELIVERY') {
    return blockedService('Complaint service election is outside the bounded personal hand-delivery profile.');
  }
  if (!input.data?.createdNoticeArtifact) return blockedService('Exact Created Notice artifact is required.');

  const rawSemantic = evaluateCreatedNoticeSemanticProvenance(input.data.createdNoticeArtifact);
  if (rawSemantic.status === 'UNPROVEN_LEGACY') {
    return blockedService('Legacy Created Notice cannot supply D.1 service facts or forfeiture-content provenance.');
  }
  if (rawSemantic.status === 'INVALID') {
    return blockedService(`Invalid Created Notice semantic provenance cannot supply D.1 service facts: ${rawSemantic.reason}`);
  }
  if (evaluateStaleness(input.data).stale || input.data.stalenessReason) {
    return blockedService('Stale Created Notice face state cannot supply current D.1 service evidence.');
  }

  const context = deriveResolveRecordContext(input.data);
  if (!context) return blockedService('Exact successful-service runtime handoff is unavailable.');
  if (context.binding.noticeGeneration !== context.artifact.generation) {
    return blockedService('Successful-service Notice generation does not match the exact restored artifact.');
  }

  const successfulAttempts = (input.data.serviceAttempts ?? []).filter((attempt) => attempt.outcome === 'SUCCESS');
  if (
    successfulAttempts.length !== 1
    || !context.successfulAttempt.id
    || context.successfulAttempt.id !== context.binding.successfulServiceAttemptId
  ) {
    return blockedService('Successful-service identity is missing, duplicated, or superseded.');
  }
  if (context.successfulAttempt.method !== 'personal' || !nonblank(context.successfulAttempt.attemptDate)) {
    return blockedService('Exact successful service evidence does not establish PERSONAL_HAND_DELIVERY.');
  }

  const semantic = evaluateCreatedNoticeSemanticProvenance(context.artifact);
  if (semantic.status !== 'PROVEN') {
    return blockedService('Exact service handoff does not retain PROVEN Created Notice semantic provenance.');
  }
  if (semantic.semantics.artifactType !== CREATED_NOTICE_ARTIFACT_TYPE) {
    return blockedService('Successful service is bound to an unsupported Notice artifact type.');
  }

  const serviceFacts: ServiceFacts = {
    defendantNames: [...context.noticeData.tenantNames],
    serviceDate: context.successfulAttempt.attemptDate,
    noticeExpirationDate: context.artifact.dates.compliancePeriodEndDate,
    serviceMethod: 'PERSONAL_HAND_DELIVERY',
    noticeIncludedForfeiture: semantic.semantics.forfeitureElectionContentIncluded,
  };
  const lifecycleEvent = {
    sourceId: 'ownerpilot.service-runtime',
    eventId: context.binding.serviceGeneration,
    eventType: 'SUCCESSFUL_CREATED_NOTICE_SERVICE_FACTS_V1',
  } as const;
  const lifecycleInput: LifecycleEventInput<ServiceFacts> = {
    state: 'KNOWN',
    value: serviceFacts,
    event: lifecycleEvent,
  };
  const consistencyControl = currentControl(
    UD100_GOVERNED_CONTROL_IDS.serviceElectionConsistency,
    `service-election-consistency:v1:${JSON.stringify({
      noticeGeneration: context.binding.noticeGeneration,
      serviceGeneration: context.binding.serviceGeneration,
      successfulServiceAttemptId: context.binding.successfulServiceAttemptId,
      semanticBindingId: semantic.semanticBindingId,
      election: input.serviceComplaintElection.value,
      confirmationId: input.serviceComplaintElection.confirmation.confirmationId,
    })}`,
    'CONSISTENT' as const,
    [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
  );

  return { serviceFacts: lifecycleInput, serviceElectionConsistencyControl: consistencyControl };
}
