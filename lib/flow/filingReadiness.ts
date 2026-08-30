import { californiaEligibilityAddressKey } from '../jurisdiction/californiaEligibility';
import { detectJurisdiction } from '../jurisdiction/detectJurisdiction';
import { restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import type { NoticeFlowData, ServiceAttempt } from './noticeFlowState';
import {
  bindingsEqual,
  deriveCurrentResolveOutcome,
  deriveExactNoticeDemand,
  deriveResolveRecordContext,
  type ResolveOutcomeEvent,
  type ResolveRecordContext,
} from './outcomeEvents';
import type { RestoredResolveOutcome } from './outcomePersistence';
import {
  deriveNonpaymentLifecyclePresentation,
  type NonpaymentLifecyclePresentation,
} from './nonpaymentLifecyclePresentation';
import { supersedeNeedsConfirmation } from './jurisdictionSupersession';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
  type AgreementPacketState,
  type Attachment10cPacketState,
  type FilingPacketCompositionInput,
  type NoticePacketState,
  type ProofOfServicePacketState,
} from './filingCanonicalFacts';
import {
  evaluateUd100Attachment10cReadiness,
  type Ud100Attachment10cReadinessEvidenceInput,
} from './ud100Attachment10cCompositionPlan';

export type FilingReadinessAggregateState =
  | 'Needs information'
  | 'Needs owner review'
  | 'Cannot continue'
  | 'Not yet applicable'
  | 'Ready for packet review';

export type FilingReadinessChecklistStatus =
  | 'Complete'
  | 'Needs information'
  | 'Needs owner review'
  | 'Cannot continue'
  | 'Not yet applicable';

export type FilingReadinessChecklistKey =
  | 'NOTICE_RECORD'
  | 'SERVICE_RECORD'
  | 'POST_SERVICE_OUTCOME'
  | 'CORE_FACTS'
  | 'JURISDICTION_CONTROLS'
  | 'PACKET_COMPOSITION'
  | 'OWNER_REVIEW';

export interface FilingReadinessChecklistItem {
  key: FilingReadinessChecklistKey;
  title: string;
  status: FilingReadinessChecklistStatus;
  whyItMatters: string;
  ownerPilotKnows: string;
  missingOrReview: string | null;
  nextTask: string | null;
}

export interface FilingReadinessNextTask {
  label: string;
  href: '/notice/3-day' | '/notice/3-day/serve' | '/notice/3-day/resolve' | null;
}

export interface FilingReadinessProjection {
  state: FilingReadinessAggregateState;
  summary: string;
  noticeIdentity: string | null;
  nextTask: FilingReadinessNextTask;
  checklist: readonly FilingReadinessChecklistItem[];
  lifecycle: {
    stage: 'Notice' | 'Service' | 'After service';
    status: string;
    detail: string;
  };
  readinessMeaning: string;
  whatOwnerPilotHasNotDone: string;
}

export interface FilingReadinessProjectionInput {
  data: NoticeFlowData | null;
  noticePageIndex: number | null;
  outcome: RestoredResolveOutcome;
  packetComposition?: FilingPacketCompositionInput;
  attachment10cReadinessEvidence?: Ud100Attachment10cReadinessEvidenceInput;
}

interface CoreFactsEvaluation {
  status: 'Complete' | 'Needs information';
  known: string;
  missing: string | null;
}

interface ControlEvaluation {
  status: 'Complete' | 'Needs information' | 'Cannot continue';
  known: string;
  problem: string | null;
}

interface PacketCompositionEvaluation {
  status: 'Complete' | 'Needs information' | 'Cannot continue';
  known: string;
  problem: string | null;
}

const READINESS_MEANING =
  'Ready for packet review means only that the currently governed Stage C prerequisites are satisfied for the separately governed packet-preparation/review step.';

const NOT_DONE =
  'OwnerPilot has not filed, submitted, signed, paid court fees, or obtained court acceptance.';

function clean(value: string | undefined | null): string {
  return value?.trim() ?? '';
}

function noticeIdentity(data: NoticeFlowData | null): string | null {
  if (!data) return null;
  const artifact = restoreCreatedNoticeArtifact(data);
  const face = artifact?.createData ?? data;
  const property = [clean(face.propertyAddress), clean(face.propertyUnit)]
    .filter(Boolean)
    .join(', ');
  const tenants = (face.tenantNames ?? []).map(clean).filter(Boolean).join(', ');
  if (property && tenants) return `${property} · ${tenants}`;
  return property || tenants || null;
}

function lifecycleContext(
  presentation: NonpaymentLifecyclePresentation,
): FilingReadinessProjection['lifecycle'] {
  const stage = presentation.currentStep === 1
    ? 'Notice'
    : presentation.currentStep === 2
      ? 'Service'
      : 'After service';
  return {
    stage,
    status: presentation.status,
    detail: presentation.whatHappened,
  };
}

function landlordIdentityKnown(data: NoticeFlowData): boolean {
  if (data.landlordIdentityConfirmed !== true || !data.landlordIdentity) return false;
  if (data.landlordIdentity.type === 'individual') {
    return data.landlordIdentity.names.some(name => clean(name).length > 0);
  }
  return clean(data.landlordIdentity.entityLegalName).length > 0;
}

function evaluateCoreFacts(data: NoticeFlowData): CoreFactsEvaluation {
  const missing: string[] = [];
  if (!clean(data.propertyAddress)) missing.push('property address');
  if (!clean(data.propertyCounty)) missing.push('property county');
  if (!landlordIdentityKnown(data)) missing.push('landlord / plaintiff identity');
  if (!(data.tenantNames ?? []).some(name => clean(name).length > 0)) {
    missing.push('tenant / defendant name');
  }

  if (missing.length > 0) {
    return {
      status: 'Needs information',
      known: 'OwnerPilot can use only the core party and property facts preserved in the created Notice.',
      missing: `The created Notice is missing: ${missing.join(', ')}.`,
    };
  }

  const landlord = data.landlordIdentity?.type === 'entity'
    ? clean(data.landlordIdentity.entityLegalName)
    : (data.landlordIdentity?.names ?? []).map(clean).filter(Boolean).join(', ');
  return {
    status: 'Complete',
    known: `Property and county are recorded; landlord / plaintiff ${landlord} and ${(data.tenantNames ?? []).map(clean).filter(Boolean).length} tenant / defendant name${(data.tenantNames ?? []).map(clean).filter(Boolean).length === 1 ? '' : 's'} are preserved in the created Notice.`,
    missing: null,
  };
}

function evaluateControlEvidence(data: NoticeFlowData): ControlEvaluation {
  const address = clean(data.propertyAddress);
  if (!address) {
    return {
      status: 'Needs information',
      known: 'Jurisdiction and product controls must stay bound to the property preserved in the created Notice.',
      problem: 'The property address is missing, so the saved control evidence cannot be matched.',
    };
  }

  const california = data.cachedCaliforniaEligibility;
  if (
    !california ||
    california.status !== 'CONFIRMED_CALIFORNIA' ||
    california.source !== 'google_places' ||
    california.addressKey !== californiaEligibilityAddressKey(address)
  ) {
    return {
      status: 'Cannot continue',
      known: 'OwnerPilot requires the existing California eligibility evidence preserved with this Notice.',
      problem: 'The saved California eligibility evidence is unavailable, unresolved, or does not match this property.',
    };
  }

  const jurisdiction = detectJurisdiction({
    address,
    city: clean(data.propertyCity) || undefined,
  });

  if (jurisdiction.decision === 'BLOCK_OVERLAY_CITY') {
    return {
      status: 'Cannot continue',
      known: 'OwnerPilot preserved the existing local-jurisdiction control for this property.',
      problem: 'The existing local-jurisdiction control blocks this property from progressing to packet preparation.',
    };
  }

  if (jurisdiction.decision === 'NEEDS_CONFIRMATION') {
    const supersession = supersedeNeedsConfirmation(address, data.cachedResolverVerdict);
    if (supersession.kind === 'no_verdict') {
      return {
        status: 'Cannot continue',
        known: 'OwnerPilot preserved a local-jurisdiction state that still requires confirmation for this property.',
        problem: 'No current matching resolver evidence clears the existing jurisdiction-confirmation requirement.',
      };
    }
    if (supersession.kind === 'superseded') {
      return {
        status: 'Cannot continue',
        known: 'OwnerPilot preserved the existing local-jurisdiction resolver result for this property.',
        problem: 'The existing jurisdiction result still blocks or requires review before packet preparation can continue.',
      };
    }
  }

  return {
    status: 'Complete',
    known: 'The created Notice preserves matched California eligibility and the existing local-jurisdiction control is positively clear for the same property.',
    problem: null,
  };
}

function evaluatePacketComposition(
  data: NoticeFlowData,
  packetComposition: FilingPacketCompositionInput | undefined,
  attachment10cReadinessEvidence: Ud100Attachment10cReadinessEvidenceInput | undefined,
): PacketCompositionEvaluation {
  const projection = projectFilingCanonicalFacts(data, {
    preparation: { packetComposition },
  });
  if (projection.status !== 'READY') {
    return {
      status: 'Cannot continue',
      known: 'Packet composition must stay bound to the exact current created Notice.',
      problem: 'OwnerPilot cannot validate packet-composition evidence against the exact current Notice.',
    };
  }

  const agreement = readCanonicalFilingFact<AgreementPacketState>(projection, CANONICAL_FILING_FACT_REFS.packetAgreement);
  const notice = readCanonicalFilingFact<NoticePacketState>(projection, CANONICAL_FILING_FACT_REFS.packetNotice);
  const proof = readCanonicalFilingFact<ProofOfServicePacketState>(projection, CANONICAL_FILING_FACT_REFS.packetProofOfService);
  const attachment10c = readCanonicalFilingFact<Attachment10cPacketState>(projection, CANONICAL_FILING_FACT_REFS.packetAttachment10c);
  const facts = [agreement, notice, proof, attachment10c] as const;

  if (facts.some(fact => !fact || fact.state === 'REQUIRES_CONFIRMATION' || fact.state === 'CONFLICT')) {
    return {
      status: 'Cannot continue',
      known: 'OwnerPilot found packet-composition evidence for this Notice.',
      problem: 'Packet-composition evidence is invalid, stale, unsupported, or does not match the exact current Notice.',
    };
  }
  if (facts.some(fact => fact?.state === 'UNANSWERED' || fact?.state === 'UNKNOWN')) {
    return {
      status: 'Needs information',
      known: 'Packet composition is evaluated only from governed evidence for this exact Notice.',
      problem: 'One or more required packet-composition states have not been resolved yet.',
    };
  }
  if (!agreement || !notice || !proof || !attachment10c
    || agreement.state !== 'KNOWN'
    || notice.state !== 'KNOWN'
    || proof.state !== 'KNOWN'
    || attachment10c.state !== 'KNOWN') {
    return {
      status: 'Cannot continue',
      known: 'Packet composition must be deterministically resolved before packet review.',
      problem: 'OwnerPilot cannot safely reduce the packet-composition record.',
    };
  }

  const attachment10cReadiness = attachment10cReadinessEvidence
    ? evaluateUd100Attachment10cReadiness(projection, attachment10cReadinessEvidence)
    : null;

  if (attachment10cReadiness?.status === 'BLOCKED') {
    return {
      status: 'Cannot continue',
      known: 'OwnerPilot evaluated supplied deterministic Attachment 10c composition-readiness evidence for this exact Notice.',
      problem: attachment10cReadiness.reasons.join(' '),
    };
  }

  if (attachment10c.value.kind === 'REQUIRED_BUT_UNSUPPORTED') {
    if (!attachment10cReadiness) {
      return {
        status: 'Cannot continue',
        known: 'An additional attachment is required for this packet state.',
        problem: 'That required attachment composition is not supported in this bounded preparation path.',
      };
    }
    if (attachment10cReadiness.status === 'NEEDS_INFORMATION') {
      return {
        status: 'Needs information',
        known: 'The governed packet state requires Attachment 10c, and OwnerPilot has a bounded deterministic composition-readiness seam for this exact Notice.',
        problem: attachment10cReadiness.reasons.join(' '),
      };
    }
    if (attachment10cReadiness.status !== 'READY') {
      return {
        status: 'Cannot continue',
        known: 'The governed packet state requires Attachment 10c.',
        problem: 'Supplied Attachment 10c evidence did not resolve the required deterministic composition-readiness state.',
      };
    }
  } else if (attachment10c.value.kind === 'NOT_APPLICABLE'
    && attachment10cReadiness
    && attachment10cReadiness.status !== 'NOT_APPLICABLE') {
    return {
      status: 'Cannot continue',
      known: 'The governed packet state says Attachment 10c is not applicable.',
      problem: 'Supplied Attachment 10c composition evidence contradicts the governed not-applicable state.',
    };
  }

  if (agreement.value.kind === 'UNRESOLVED'
    || notice.value.kind === 'REQUIRED_NOTICE_SET_INCOMPLETE'
    || notice.value.kind === 'UNRESOLVED'
    || proof.value.kind === 'UNRESOLVED'
    || attachment10c.value.kind === 'UNRESOLVED') {
    return {
      status: 'Needs information',
      known: 'OwnerPilot preserved the current packet-composition state without inferring a missing attachment or answer.',
      problem: 'One or more packet-composition decisions or evidence states are still unresolved.',
    };
  }

  return {
    status: 'Complete',
    known: attachment10c.value.kind === 'REQUIRED_BUT_UNSUPPORTED'
      ? 'Agreement, Notice, proof-of-service, and Attachment 10c deterministic composition readiness are resolved for packet-composition review only; no Attachment 10c PDF was generated and no filing authority was created.'
      : 'Agreement, Notice, proof-of-service, and additional-attachment composition states are deterministically resolved for this Notice.',
    problem: null,
  };
}

function describeService(attempt: ServiceAttempt): string {
  const date = clean(attempt.attemptDate);
  return date
    ? `Successful service is recorded for this Notice on ${date}.`
    : 'Successful service is recorded for this Notice.';
}

function describeOutcome(event: ResolveOutcomeEvent | null): string {
  if (!event) return 'No safely bound post-service outcome is recorded yet.';
  switch (event.type) {
    case 'FULL_PAYMENT_REPORTED':
      return `Full payment was reported on ${event.payload.paymentReceivedDate}.`;
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return `A payment event dated ${event.payload.eventDate} needs owner review.`;
    case 'NO_RESOLUTION_REPORTED':
      return `No resolution was reported as of ${event.payload.asOfDate}.`;
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return `The owner reported stopping this Notice path on ${event.payload.decisionDate}.`;
    case 'POSSESSION_CHANGE_REPORTED':
      return `A possession change was reported on ${event.payload.reportedOrObservedDate}.`;
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return 'The saved service or outcome facts require owner review.';
  }
}

function item(
  key: FilingReadinessChecklistKey,
  title: string,
  status: FilingReadinessChecklistStatus,
  whyItMatters: string,
  ownerPilotKnows: string,
  missingOrReview: string | null,
  nextTask: string | null,
): FilingReadinessChecklistItem {
  return {
    key,
    title,
    status,
    whyItMatters,
    ownerPilotKnows,
    missingOrReview,
    nextTask,
  };
}

function buildChecklist(input: {
  data: NoticeFlowData | null;
  hasInvalidNoticeState: boolean;
  context: ResolveRecordContext | null;
  outcomeFailure: string | null;
  event: ResolveOutcomeEvent | null;
  readinessReviewAvailable: boolean;
  core: CoreFactsEvaluation | null;
  controls: ControlEvaluation | null;
  packet?: PacketCompositionEvaluation | null;
  ownerReviewProblem: string | null;
}): readonly FilingReadinessChecklistItem[] {
  const artifact = input.data ? restoreCreatedNoticeArtifact(input.data) : null;
  const attempts = input.data?.serviceAttempts ?? [];

  const noticeItem = input.hasInvalidNoticeState
    ? item(
        'NOTICE_RECORD',
        'Notice record',
        'Cannot continue',
        'Packet preparation must stay bound to the exact Notice that was created.',
        'A saved Notice record is present on this browser.',
        'OwnerPilot cannot safely restore the exact created Notice.',
        'Review the Notice before continuing.',
      )
    : artifact
      ? item(
          'NOTICE_RECORD',
          'Notice record',
          'Complete',
          'Packet preparation must stay bound to the exact Notice that was created.',
          `The exact created Notice${noticeIdentity(input.data) ? ` for ${noticeIdentity(input.data)}` : ''} is available on this browser.`,
          null,
          null,
        )
      : item(
          'NOTICE_RECORD',
          'Notice record',
          'Not yet applicable',
          'A created Notice is required before later preparation steps can be reviewed.',
          'No exact created Notice is available yet.',
          'Create and review the Notice first.',
          'Return to the Notice.',
        );

  let serviceItem: FilingReadinessChecklistItem;
  if (!artifact) {
    serviceItem = item(
      'SERVICE_RECORD',
      'Service record',
      'Not yet applicable',
      'Filing preparation cannot use service facts before an exact Notice exists.',
      'Service is not a current Filing Readiness prerequisite yet.',
      null,
      null,
    );
  } else if (input.context) {
    serviceItem = item(
      'SERVICE_RECORD',
      'Service record',
      'Complete',
      'The post-service outcome must be bound to the exact successful service event for this Notice.',
      describeService(input.context.successfulAttempt),
      null,
      null,
    );
  } else if (attempts.length > 0) {
    serviceItem = item(
      'SERVICE_RECORD',
      'Service record',
      'Not yet applicable',
      'A valid successful service event is required before a post-service outcome can support Filing Readiness.',
      `${attempts.length} service attempt${attempts.length === 1 ? '' : 's'} are recorded, but successful service is not safely bound.`,
      'Successful service is not recorded for this Notice.',
      'Record the next actual service attempt on Serve & Track.',
    );
  } else {
    serviceItem = item(
      'SERVICE_RECORD',
      'Service record',
      'Not yet applicable',
      'A valid successful service event is required before a post-service outcome can support Filing Readiness.',
      'No service attempt is recorded for this Notice yet.',
      'Successful service is not recorded.',
      'Record service only when it actually happens.',
    );
  }

  let outcomeItem: FilingReadinessChecklistItem;
  if (!input.context) {
    outcomeItem = item(
      'POST_SERVICE_OUTCOME',
      'What happened after service',
      'Not yet applicable',
      'Resolve & Record has lifecycle authority only after successful service is safely bound.',
      'No post-service outcome is being used for Filing Readiness.',
      null,
      null,
    );
  } else if (input.outcomeFailure) {
    outcomeItem = item(
      'POST_SERVICE_OUTCOME',
      'What happened after service',
      'Cannot continue',
      'The current outcome must match this exact Notice and successful service record.',
      'A saved outcome record exists.',
      input.outcomeFailure,
      'Review the service and outcome records before continuing.',
    );
  } else if (!input.event) {
    outcomeItem = item(
      'POST_SERVICE_OUTCOME',
      'What happened after service',
      'Not yet applicable',
      'A factual post-service outcome is required before Filing Readiness can be evaluated.',
      'Successful service is recorded, but no current outcome is recorded.',
      'Record what actually happened after service.',
      'Use Resolve & Record to record the factual outcome.',
    );
  } else if (
    input.event.type === 'PAYMENT_STATUS_REQUIRES_REVIEW' ||
    input.event.type === 'POSSESSION_CHANGE_REPORTED' ||
    input.event.type === 'SERVICE_OR_OUTCOME_REVIEW'
  ) {
    outcomeItem = item(
      'POST_SERVICE_OUTCOME',
      'What happened after service',
      'Needs owner review',
      'The current post-service facts must be settled before Filing Readiness can progress.',
      describeOutcome(input.event),
      'This outcome requires owner review and does not create filing-preparation progression.',
      'Review the recorded outcome in Resolve & Record.',
    );
  } else {
    outcomeItem = item(
      'POST_SERVICE_OUTCOME',
      'What happened after service',
      'Complete',
      'The current post-service outcome must be safely bound before Filing Readiness can use it.',
      describeOutcome(input.event),
      null,
      null,
    );
  }

  const coreItem = input.readinessReviewAvailable && input.core
    ? item(
        'CORE_FACTS',
        'Core filing-preparation facts',
        input.core.status,
        'Stage C reuses core party and property facts already preserved in the created Notice; it does not ask you to re-enter them per form.',
        input.core.known,
        input.core.missing,
        input.core.status === 'Needs information'
          ? 'Review the saved Notice information before packet preparation can continue.'
          : null,
      )
    : item(
        'CORE_FACTS',
        'Core filing-preparation facts',
        'Not yet applicable',
        'These facts are checked only after the lifecycle reaches the Filing Readiness review seam.',
        'OwnerPilot is not using these facts to advance filing preparation yet.',
        null,
        null,
      );

  const controlItem = input.readinessReviewAvailable && input.controls
    ? item(
        'JURISDICTION_CONTROLS',
        'Existing jurisdiction and control evidence',
        input.controls.status,
        'Stage C may use only jurisdiction and product-control evidence already preserved with the created Notice.',
        input.controls.known,
        input.controls.problem,
        input.controls.status === 'Complete'
          ? null
          : 'Review the Notice and its saved control evidence before packet preparation can continue.',
      )
    : item(
        'JURISDICTION_CONTROLS',
        'Existing jurisdiction and control evidence',
        'Not yet applicable',
        'These controls are checked for Filing Readiness only after the lifecycle reaches this stage.',
        'OwnerPilot is not selecting a filing court or creating a new jurisdiction rule here.',
        null,
        null,
      );

  const packetItem = input.readinessReviewAvailable && input.packet
    ? item(
        'PACKET_COMPOSITION',
        'Packet composition',
        input.packet.status,
        'Packet review may proceed only when governed attachment/evidence states are deterministically resolved for this exact Notice.',
        input.packet.known,
        input.packet.problem,
        input.packet.status === 'Complete'
          ? null
          : 'Resolve the packet-composition evidence before packet review can continue.',
      )
    : item(
        'PACKET_COMPOSITION',
        'Packet composition',
        'Not yet applicable',
        'Packet composition is checked only when the lifecycle reaches the final Filing Readiness review seam.',
        'OwnerPilot is not using attachment-composition evidence to advance the lifecycle yet.',
        null,
        null,
      );

  const ownerReviewItem = input.ownerReviewProblem
    ? item(
        'OWNER_REVIEW',
        'Owner review and conflicts',
        input.readinessReviewAvailable ? 'Cannot continue' : 'Needs owner review',
        'Unresolved review conditions cannot be averaged away or treated as complete.',
        'OwnerPilot has preserved an unresolved review condition.',
        input.ownerReviewProblem,
        'Review the affected Notice, service, or outcome record before continuing.',
      )
    : input.readinessReviewAvailable
      ? item(
          'OWNER_REVIEW',
          'Owner review and conflicts',
          'Complete',
          'Any existing deterministic review or conflict must be cleared before packet preparation can progress.',
          'No unresolved deterministic owner-review condition is present in the current Stage C inputs.',
          null,
          null,
        )
      : item(
          'OWNER_REVIEW',
          'Owner review and conflicts',
          'Not yet applicable',
          'Owner-review conflicts are checked when the lifecycle reaches the Filing Readiness review seam.',
          'No Stage C owner-review conclusion is being made yet.',
          null,
          null,
        );

  return [noticeItem, serviceItem, outcomeItem, coreItem, controlItem, packetItem, ownerReviewItem];
}

function project(
  state: FilingReadinessAggregateState,
  summary: string,
  nextTask: FilingReadinessNextTask,
  checklist: readonly FilingReadinessChecklistItem[],
  lifecycle: NonpaymentLifecyclePresentation,
  identity: string | null,
): FilingReadinessProjection {
  return {
    state,
    summary,
    noticeIdentity: identity,
    nextTask,
    checklist,
    lifecycle: lifecycleContext(lifecycle),
    readinessMeaning: READINESS_MEANING,
    whatOwnerPilotHasNotDone: NOT_DONE,
  };
}

/**
 * Pure deterministic Stage C projection. It consumes the existing Stage B
 * lifecycle and exact browser-local Notice/service/outcome sources. It creates
 * no persistence, form-applicability rule, filing authority, or execution path.
 */
export function deriveFilingReadiness(
  input: FilingReadinessProjectionInput,
): FilingReadinessProjection {
  const lifecycle = deriveNonpaymentLifecyclePresentation({
    surface: 'resolve',
    data: input.data,
    noticePageIndex: input.noticePageIndex,
    outcome: input.outcome,
  });
  const identity = noticeIdentity(input.data);

  if (!input.data) {
    const checklist = buildChecklist({
      data: null,
      hasInvalidNoticeState: false,
      context: null,
      outcomeFailure: null,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Not yet applicable',
      'Filing preparation is not applicable until an exact Notice has been created and the earlier lifecycle steps occur.',
      { label: 'Start with the Notice.', href: '/notice/3-day' },
      checklist,
      lifecycle,
      identity,
    );
  }

  const data = input.data;
  const artifact = restoreCreatedNoticeArtifact(data);
  const hasInvalidNoticeState = !artifact && Boolean(
    data.createdNoticeArtifact ||
    data.productionSnapshot ||
    (data.serviceAttempts ?? []).length > 0 ||
    data.successfulServiceAttemptId,
  );

  if (!artifact) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState,
      context: null,
      outcomeFailure: null,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    if (hasInvalidNoticeState) {
      return project(
        'Cannot continue',
        'OwnerPilot cannot safely restore the exact created Notice needed for Filing Readiness.',
        { label: 'Review the Notice before continuing.', href: '/notice/3-day' },
        checklist,
        lifecycle,
        identity,
      );
    }
    return project(
      'Not yet applicable',
      'The Notice is still being prepared. Filing Readiness does not begin from an in-progress Notice.',
      { label: 'Continue the Notice.', href: '/notice/3-day' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (data.stalenessReason) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context: null,
      outcomeFailure: null,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: 'The saved Notice has a current conflict with the facts used when it was created.',
    });
    return project(
      'Cannot continue',
      'The current Notice record has an unresolved deterministic conflict and cannot safely support Filing Readiness.',
      { label: 'Review the Notice before continuing.', href: '/notice/3-day' },
      checklist,
      lifecycle,
      identity,
    );
  }

  const context = deriveResolveRecordContext(data);
  if (!context) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context: null,
      outcomeFailure: null,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: lifecycle.reviewRequired ? lifecycle.reviewReason : null,
    });
    if (lifecycle.reviewRequired) {
      return project(
        'Cannot continue',
        'The Notice or service record cannot safely support the next lifecycle step.',
        { label: lifecycle.nextTask?.label ?? 'Review the service record.', href: lifecycle.nextTask?.href === '/notice/3-day' ? '/notice/3-day' : '/notice/3-day/serve' },
        checklist,
        lifecycle,
        identity,
      );
    }
    return project(
      'Not yet applicable',
      lifecycle.status === 'Service not completed'
        ? 'Service attempts are recorded, but successful service is not completed. Filing Readiness does not use downstream outcome residue before successful service.'
        : 'Successful service is not recorded yet. Filing Readiness is not applicable before that actual event.',
      { label: lifecycle.nextTask?.label ?? 'Record service only when it happens.', href: '/notice/3-day/serve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  let outcomeFailure: string | null = null;
  let event: ResolveOutcomeEvent | null = null;
  if (input.outcome.status === 'blocked') {
    outcomeFailure = input.outcome.reason === 'binding_mismatch'
      ? 'The saved outcome belongs to a different Notice or service record.'
      : 'The saved outcome history cannot safely be restored.';
  } else if (input.outcome.status === 'ready') {
    if (!bindingsEqual(input.outcome.envelope.binding, context.binding)) {
      outcomeFailure = 'The saved outcome belongs to a different Notice or service record.';
    } else {
      try {
        event = deriveCurrentResolveOutcome(
          input.outcome.envelope.events,
          context.binding,
          deriveExactNoticeDemand(context.artifact),
        );
      } catch {
        outcomeFailure = 'The saved outcome history cannot safely be reduced to the current factual record.';
      }
    }
  }

  if (outcomeFailure) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Cannot continue',
      'The saved post-service outcome cannot safely be matched to this Notice and service record.',
      { label: 'Review the service and outcome records.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (!event) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event: null,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Not yet applicable',
      'Successful service is recorded, but no post-service outcome is recorded yet.',
      { label: 'Record what actually happened after service.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (event.type === 'PAYMENT_STATUS_REQUIRES_REVIEW') {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: 'The recorded payment status requires owner review before another Notice-related preparation step.',
    });
    return project(
      'Needs owner review',
      'The recorded payment status requires your review before Filing Readiness can progress.',
      { label: 'Review the payment status.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (event.type === 'SERVICE_OR_OUTCOME_REVIEW') {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: event.payload.reviewReason,
    });
    return project(
      'Needs owner review',
      'The recorded service or outcome facts require your review before Filing Readiness can progress.',
      { label: 'Review the service / outcome facts.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (event.type === 'POSSESSION_CHANGE_REPORTED') {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: 'The reported possession change requires owner review. OwnerPilot has not inferred legal surrender.',
    });
    return project(
      'Needs owner review',
      'A possession change was reported. Review those facts before any filing-preparation progression; OwnerPilot does not infer legal surrender from the report.',
      { label: 'Review the possession-change record.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (event.type === 'FULL_PAYMENT_REPORTED') {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Not yet applicable',
      'Full payment is reported for this Notice path. Filing Readiness does not automatically progress from that outcome.',
      { label: 'Review the recorded outcome if needed.', href: '/notice/3-day/resolve' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (event.type === 'OWNER_WITHDREW_NOTICE_PATH') {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Not yet applicable',
      'You reported that this Notice path was stopped. Filing Readiness does not progress from the stopped path.',
      { label: 'No Filing Readiness task is available from this stopped Notice path.', href: null },
      checklist,
      lifecycle,
      identity,
    );
  }

  const endpoint = context.artifact.dates.compliancePeriodEndDate;
  if (event.payload.asOfDate < endpoint) {
    const checklist = buildChecklist({
      data,
      hasInvalidNoticeState: false,
      context,
      outcomeFailure: null,
      event,
      readinessReviewAvailable: false,
      core: null,
      controls: null,
      ownerReviewProblem: null,
    });
    return project(
      'Not yet applicable',
      'No resolution is reported, but the existing compliance-period endpoint has not yet been reached in the recorded outcome. Continue monitoring.',
      { label: 'Continue monitoring the actual outcome.', href: null },
      checklist,
      lifecycle,
      identity,
    );
  }

  const frozen = context.artifact.createData;
  const core = evaluateCoreFacts(frozen);
  const controls = evaluateControlEvidence(frozen);
  const packet = evaluatePacketComposition(
    data,
    input.packetComposition,
    input.attachment10cReadinessEvidence,
  );
  const checklist = buildChecklist({
    data,
    hasInvalidNoticeState: false,
    context,
    outcomeFailure: null,
    event,
    readinessReviewAvailable: true,
    core,
    controls,
    packet,
    ownerReviewProblem: null,
  });

  if (controls.status === 'Cannot continue') {
    return project(
      'Cannot continue',
      'The lifecycle has reached Filing Readiness review, but an existing jurisdiction or control prerequisite cannot safely support packet preparation.',
      { label: 'Review the Notice and its saved control evidence.', href: '/notice/3-day' },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (packet.status === 'Cannot continue') {
    return project(
      'Cannot continue',
      'The lifecycle has reached Filing Readiness review, but packet-composition evidence cannot safely support packet review.',
      { label: 'Review the packet-composition evidence before continuing.', href: null },
      checklist,
      lifecycle,
      identity,
    );
  }

  if (core.status === 'Needs information' || controls.status === 'Needs information' || packet.status === 'Needs information') {
    return project(
      'Needs information',
      'The lifecycle has reached Filing Readiness review, but required governed information for packet review is still missing or unresolved.',
      { label: 'Review the saved Notice and packet-composition information.', href: '/notice/3-day' },
      checklist,
      lifecycle,
      identity,
    );
  }

  return project(
    'Ready for packet review',
    'The currently governed Stage C prerequisites and packet-composition states are satisfied for the next separately governed packet-preparation/review step. This is not a filing or legal-sufficiency determination.',
    { label: 'Packet preparation/review is a separately governed next step and is not available from this Stage C surface.', href: null },
    checklist,
    lifecycle,
    identity,
  );
}