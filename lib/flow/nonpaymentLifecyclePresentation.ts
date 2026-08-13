import type { NoticeFlowData, ServiceAttempt } from './noticeFlowState';
import { restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import { restoreServiceTaskContext } from './serviceTaskPresentation';
import {
  bindingsEqual,
  deriveCurrentResolveOutcome,
  deriveExactNoticeDemand,
  deriveResolveRecordContext,
  nextTaskForOutcome,
  type ResolveOutcomeEvent,
} from './outcomeEvents';
import type { RestoredResolveOutcome } from './outcomePersistence';

export type NonpaymentLifecycleSurface = 'notice' | 'serve' | 'resolve';
export type NonpaymentLifecycleStage =
  | 'NOTICE_IN_PROGRESS'
  | 'NOTICE_REVIEW'
  | 'NOTICE_PREPARED'
  | 'SERVICE_IN_PROGRESS'
  | 'WAITING_FOR_OUTCOME'
  | 'OUTCOME_RECORDED'
  | 'NOTICE_PATH_STOPPED'
  | 'REVIEW_REQUIRED';

export type NonpaymentMilestoneState = 'complete' | 'current' | 'pending' | 'review';

export interface NonpaymentLifecycleNextTask {
  label: string;
  href: '/notice/3-day' | '/notice/3-day/serve' | '/notice/3-day/resolve' | '/notice/3-day/options' | null;
}

export interface NonpaymentLifecycleMilestone {
  key: 'NOTICE' | 'SERVICE' | 'OUTCOME';
  label: string;
  state: NonpaymentMilestoneState;
  detail: string;
}

export interface NonpaymentLifecyclePresentation {
  stage: NonpaymentLifecycleStage;
  currentStep: 1 | 2 | 3;
  status: string;
  noticeIdentity: string | null;
  whatHappened: string;
  whatOwnerPilotRecorded: string;
  reviewRequired: boolean;
  reviewReason: string | null;
  nextTask: NonpaymentLifecycleNextTask | null;
  whatOwnerPilotHasNotDone: string;
  milestones: readonly NonpaymentLifecycleMilestone[];
}

export interface NonpaymentLifecyclePresentationInput {
  surface: NonpaymentLifecycleSurface;
  data: NoticeFlowData | null;
  noticePageIndex: number | null;
  outcome: RestoredResolveOutcome;
}

const NOTICE_REVIEW_PAGE_INDEX = 4;

const SERVICE_METHOD_LABELS: Record<ServiceAttempt['method'], string> = {
  personal: 'personal service',
  substituted: 'substituted service',
  post_and_mail: 'posting and mailing',
};

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function identityFor(data: NoticeFlowData | null): string | null {
  if (!data) return null;
  const artifact = restoreCreatedNoticeArtifact(data);
  const face = artifact?.createData ?? data;
  const address = [face.propertyAddress?.trim(), face.propertyUnit?.trim()]
    .filter(Boolean)
    .join(', ');
  const tenants = (face.tenantNames ?? []).map(item => item.trim()).filter(Boolean).join(', ');
  if (address && tenants) return `${address} · ${tenants}`;
  return address || tenants || null;
}

function baseMilestones(input: {
  notice: NonpaymentMilestoneState;
  noticeDetail: string;
  service: NonpaymentMilestoneState;
  serviceDetail: string;
  outcome: NonpaymentMilestoneState;
  outcomeDetail: string;
}): readonly NonpaymentLifecycleMilestone[] {
  return [
    { key: 'NOTICE', label: 'Notice', state: input.notice, detail: input.noticeDetail },
    { key: 'SERVICE', label: 'Service', state: input.service, detail: input.serviceDetail },
    { key: 'OUTCOME', label: 'Outcome', state: input.outcome, detail: input.outcomeDetail },
  ];
}

function noDraftPresentation(surface: NonpaymentLifecycleSurface): NonpaymentLifecyclePresentation {
  if (surface === 'notice') {
    return {
      stage: 'NOTICE_IN_PROGRESS',
      currentStep: 1,
      status: 'Notice in progress',
      noticeIdentity: null,
      whatHappened: 'You have not created a Notice yet.',
      whatOwnerPilotRecorded: 'No created Notice is recorded on this browser yet.',
      reviewRequired: false,
      reviewReason: null,
      nextTask: { label: 'Start the Notice', href: '/notice/3-day' },
      whatOwnerPilotHasNotDone: 'OwnerPilot has not created, served, sent, or filed a Notice.',
      milestones: baseMilestones({
        notice: 'current', noticeDetail: 'Not created yet',
        service: 'pending', serviceDetail: 'Not available until a Notice is created',
        outcome: 'pending', outcomeDetail: 'Not available until service is recorded',
      }),
    };
  }

  return {
    stage: 'REVIEW_REQUIRED',
    currentStep: 1,
    status: 'Needs review',
    noticeIdentity: null,
    whatHappened: 'OwnerPilot cannot find the created Notice needed for this task on this browser.',
    whatOwnerPilotRecorded: 'No exact created Notice is available to support service or outcome status.',
    reviewRequired: true,
    reviewReason: 'Return to the Notice before continuing this task.',
    nextTask: { label: 'Return to the Notice', href: '/notice/3-day' },
    whatOwnerPilotHasNotDone: 'OwnerPilot has not treated service or a post-service outcome as complete.',
    milestones: baseMilestones({
      notice: 'review', noticeDetail: 'Created Notice not available',
      service: 'pending', serviceDetail: 'Not safely available',
      outcome: 'pending', outcomeDetail: 'Not safely available',
    }),
  };
}

function invalidCreatedState(identity: string | null): NonpaymentLifecyclePresentation {
  return {
    stage: 'REVIEW_REQUIRED',
    currentStep: 1,
    status: 'Needs review',
    noticeIdentity: identity,
    whatHappened: 'The saved Notice information cannot safely support the next lifecycle task.',
    whatOwnerPilotRecorded: 'OwnerPilot cannot restore the exact created Notice needed for service or outcome status.',
    reviewRequired: true,
    reviewReason: 'Review the Notice before continuing.',
    nextTask: { label: 'Review the Notice', href: '/notice/3-day' },
    whatOwnerPilotHasNotDone: 'OwnerPilot has not treated service, an outcome, or filing as complete from this state.',
    milestones: baseMilestones({
      notice: 'review', noticeDetail: 'Created Notice needs review',
      service: 'pending', serviceDetail: 'Not safely available',
      outcome: 'pending', outcomeDetail: 'Not safely available',
    }),
  };
}

function outcomeReviewPresentation(
  identity: string | null,
  reason: string,
): NonpaymentLifecyclePresentation {
  return {
    stage: 'REVIEW_REQUIRED',
    currentStep: 3,
    status: 'Needs review',
    noticeIdentity: identity,
    whatHappened: 'The saved outcome history cannot safely be matched to this Notice and service record.',
    whatOwnerPilotRecorded: 'OwnerPilot has not accepted the saved outcome history as the current outcome for this Notice.',
    reviewRequired: true,
    reviewReason: reason,
    nextTask: { label: 'Review the service record', href: '/notice/3-day/serve' },
    whatOwnerPilotHasNotDone: 'OwnerPilot has not advanced this Notice, determined legal effect, or filed anything from the unmatched history.',
    milestones: baseMilestones({
      notice: 'complete', noticeDetail: 'Notice created',
      service: 'complete', serviceDetail: 'Service recorded',
      outcome: 'review', outcomeDetail: 'Saved outcome history needs review',
    }),
  };
}

function serviceRecordedDescription(attempt: ServiceAttempt): string {
  const method = SERVICE_METHOD_LABELS[attempt.method];
  const date = formatDate(attempt.attemptDate);
  if (attempt.method !== 'personal' && attempt.mailingDate) {
    return `Service was recorded as ${method}: attempt ${date}, mailing completed ${formatDate(attempt.mailingDate)}.`;
  }
  return `Service was recorded as ${method} on ${date}.`;
}

function presentationForOutcome(
  identity: string | null,
  event: ResolveOutcomeEvent,
  compliancePeriodEndDate: string,
): NonpaymentLifecyclePresentation {
  const commonMilestone = (state: NonpaymentMilestoneState, detail: string) => baseMilestones({
    notice: 'complete', noticeDetail: 'Notice created',
    service: 'complete', serviceDetail: 'Service recorded',
    outcome: state, outcomeDetail: detail,
  });

  switch (event.type) {
    case 'FULL_PAYMENT_REPORTED':
      return {
        stage: 'OUTCOME_RECORDED', currentStep: 3, status: 'Resolution reported', noticeIdentity: identity,
        whatHappened: `You reported full payment on ${formatDate(event.payload.paymentReceivedDate)}.`,
        whatOwnerPilotRecorded: 'A factual full-payment outcome is recorded for this Notice.',
        reviewRequired: false, reviewReason: null,
        nextTask: { label: 'Review the recorded outcome', href: '/notice/3-day/resolve' },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not determined the legal effect of the reported payment or filed anything.',
        milestones: commonMilestone('complete', 'Resolution reported'),
      };
    case 'PAYMENT_STATUS_REQUIRES_REVIEW':
      return {
        stage: 'REVIEW_REQUIRED', currentStep: 3, status: 'Payment needs review', noticeIdentity: identity,
        whatHappened: `You reported a payment event dated ${formatDate(event.payload.eventDate)} that needs review.`,
        whatOwnerPilotRecorded: 'A payment-status review outcome is recorded for this Notice.',
        reviewRequired: true,
        reviewReason: 'Review the payment status before another Notice-related step.',
        nextTask: { label: 'Review payment status', href: '/notice/3-day/resolve' },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not resolved the payment question, advanced this Notice automatically, or filed anything.',
        milestones: commonMilestone('review', 'Payment needs review'),
      };
    case 'NO_RESOLUTION_REPORTED': {
      const next = nextTaskForOutcome(event, compliancePeriodEndDate);
      return {
        stage: 'OUTCOME_RECORDED', currentStep: 3, status: 'No resolution reported', noticeIdentity: identity,
        whatHappened: `You reported no resolution as of ${formatDate(event.payload.asOfDate)}.`,
        whatOwnerPilotRecorded: 'A factual no-resolution outcome is recorded for this Notice.',
        reviewRequired: false, reviewReason: null,
        nextTask: next === 'Review available next options'
          ? { label: next, href: '/notice/3-day/options' }
          : { label: 'Continue monitoring', href: null },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not filed anything or treated this factual outcome as court action.',
        milestones: commonMilestone('complete', 'No resolution reported'),
      };
    }
    case 'OWNER_WITHDREW_NOTICE_PATH':
      return {
        stage: 'NOTICE_PATH_STOPPED', currentStep: 3, status: 'Notice path stopped', noticeIdentity: identity,
        whatHappened: `You reported that you stopped this Notice path on ${formatDate(event.payload.decisionDate)}.`,
        whatOwnerPilotRecorded: 'The owner-reported path-stop outcome is recorded; earlier Notice and service history remain history.',
        reviewRequired: false, reviewReason: null, nextTask: null,
        whatOwnerPilotHasNotDone: 'OwnerPilot has not taken any external action from this stopped Notice path.',
        milestones: commonMilestone('complete', 'Notice path stopped by owner report'),
      };
    case 'POSSESSION_CHANGE_REPORTED':
      return {
        stage: 'OUTCOME_RECORDED', currentStep: 3, status: 'Possession change reported', noticeIdentity: identity,
        whatHappened: `You reported possession-related facts dated ${formatDate(event.payload.reportedOrObservedDate)}.`,
        whatOwnerPilotRecorded: 'A factual possession-change outcome is recorded for this Notice.',
        reviewRequired: false, reviewReason: null,
        nextTask: { label: 'Review the possession-change record', href: '/notice/3-day/resolve' },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not determined legal surrender or the legal effect of possession.',
        milestones: commonMilestone('complete', 'Possession change reported'),
      };
    case 'SERVICE_OR_OUTCOME_REVIEW':
      return {
        stage: 'REVIEW_REQUIRED', currentStep: 3, status: 'Service or outcome needs review', noticeIdentity: identity,
        whatHappened: 'You reported service or outcome facts that need review.',
        whatOwnerPilotRecorded: 'A factual service/outcome review record is recorded for this Notice.',
        reviewRequired: true,
        reviewReason: event.payload.reviewReason,
        nextTask: { label: 'Review the service / outcome facts', href: '/notice/3-day/resolve' },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not determined service sufficiency, legal effect, or any external next step from these facts.',
        milestones: commonMilestone('review', 'Service or outcome needs review'),
      };
  }
}

/**
 * Pure deterministic Stage B projection. It reads only the supplied authoritative
 * state and returns customer presentation. It writes nothing and grants no new
 * lifecycle, legal, filing, or execution authority.
 */
export function deriveNonpaymentLifecyclePresentation(
  input: NonpaymentLifecyclePresentationInput,
): NonpaymentLifecyclePresentation {
  if (!input.data) return noDraftPresentation(input.surface);

  const data = input.data;
  const identity = identityFor(data);
  const artifact = restoreCreatedNoticeArtifact(data);
  const attempts = data.serviceAttempts ?? [];
  const hasArtifactSignals = Boolean(data.createdNoticeArtifact || data.productionSnapshot);

  if (!artifact) {
    if (hasArtifactSignals || attempts.length > 0 || data.successfulServiceAttemptId) {
      return invalidCreatedState(identity);
    }
    const review = (input.noticePageIndex ?? -1) >= NOTICE_REVIEW_PAGE_INDEX;
    return {
      stage: review ? 'NOTICE_REVIEW' : 'NOTICE_IN_PROGRESS',
      currentStep: 1,
      status: review ? 'Ready for your review' : 'Notice in progress',
      noticeIdentity: identity,
      whatHappened: review
        ? 'The Notice details are ready for your Review & Confirm step.'
        : 'You are still preparing the Notice.',
      whatOwnerPilotRecorded: 'OwnerPilot has saved the current Notice draft on this browser; no created Notice exists yet.',
      reviewRequired: review,
      reviewReason: review ? 'Review and confirm the Notice before creating it.' : null,
      nextTask: { label: review ? 'Review & Confirm' : 'Continue the Notice', href: '/notice/3-day' },
      whatOwnerPilotHasNotDone: 'OwnerPilot has not created, served, sent, or filed this Notice.',
      milestones: baseMilestones({
        notice: 'current', noticeDetail: review ? 'Ready for owner review' : 'In progress',
        service: 'pending', serviceDetail: 'Not available until the Notice is created',
        outcome: 'pending', outcomeDetail: 'Not available until service is recorded',
      }),
    };
  }

  const serviceContext = restoreServiceTaskContext(data);
  if (!serviceContext) return invalidCreatedState(identity);

  // Lifecycle dependency is fail-closed and ordered. Resolve state has no
  // presentation authority until canonical successful service is restored.
  if (serviceContext.display.kind !== 'recorded') {
    if (serviceContext.display.kind === 'in_progress') {
      const latest = attempts[attempts.length - 1];
      return {
        stage: 'SERVICE_IN_PROGRESS', currentStep: 2, status: 'Service not completed', noticeIdentity: identity,
        whatHappened: `A service attempt was recorded${latest?.attemptDate ? ` on ${formatDate(latest.attemptDate)}` : ''}, but successful service is not recorded.`,
        whatOwnerPilotRecorded: `${attempts.length} factual service attempt${attempts.length === 1 ? '' : 's'} recorded; none is the successful service event for this Notice.`,
        reviewRequired: false, reviewReason: null,
        nextTask: { label: 'Record the next actual attempt', href: '/notice/3-day/serve' },
        whatOwnerPilotHasNotDone: 'OwnerPilot has not treated a failed attempt as service, recorded an outcome, or filed anything.',
        milestones: baseMilestones({
          notice: 'complete', noticeDetail: 'Notice created',
          service: 'current', serviceDetail: 'Attempt recorded · service not completed',
          outcome: 'pending', outcomeDetail: 'Not available until service is recorded',
        }),
      };
    }

    return {
      stage: 'NOTICE_PREPARED', currentStep: 2, status: 'Service not recorded', noticeIdentity: identity,
      whatHappened: 'The exact Notice was created; no actual service attempt is recorded yet.',
      whatOwnerPilotRecorded: 'The created Notice is available on this browser. Service is not recorded.',
      reviewRequired: false, reviewReason: null,
      nextTask: { label: 'Record service when it happens', href: '/notice/3-day/serve' },
      whatOwnerPilotHasNotDone: 'OwnerPilot has not served, sent, or filed this Notice.',
      milestones: baseMilestones({
        notice: 'complete', noticeDetail: 'Notice created',
        service: 'current', serviceDetail: 'Service not recorded',
        outcome: 'pending', outcomeDetail: 'Not available until service is recorded',
      }),
    };
  }

  const resolveContext = deriveResolveRecordContext(data);
  if (!resolveContext) {
    return {
      ...invalidCreatedState(identity),
      currentStep: 2,
      whatHappened: 'The recorded service information cannot safely be matched to the exact created Notice.',
      whatOwnerPilotRecorded: 'OwnerPilot has not accepted service as a safe basis for a post-service outcome.',
      reviewReason: 'Review the service record before continuing.',
      nextTask: { label: 'Review the service record', href: '/notice/3-day/serve' },
      milestones: baseMilestones({
        notice: 'complete', noticeDetail: 'Notice created',
        service: 'review', serviceDetail: 'Service record needs review',
        outcome: 'pending', outcomeDetail: 'Not safely available',
      }),
    };
  }

  const successDescription = serviceRecordedDescription(resolveContext.successfulAttempt);

  if (input.outcome.status === 'blocked') {
    return outcomeReviewPresentation(
      identity,
      input.outcome.reason === 'binding_mismatch'
        ? 'The saved outcome belongs to a different Notice or service record.'
        : 'The saved outcome history is incomplete or invalid.',
    );
  }

  if (input.outcome.status === 'ready') {
    if (!bindingsEqual(input.outcome.envelope.binding, resolveContext.binding)) {
      return outcomeReviewPresentation(identity, 'The saved outcome belongs to a different Notice or service record.');
    }
    try {
      const exactDemand = deriveExactNoticeDemand(resolveContext.artifact);
      const current = deriveCurrentResolveOutcome(
        input.outcome.envelope.events,
        resolveContext.binding,
        exactDemand,
      );
      if (current) {
        return presentationForOutcome(
          identity,
          current,
          resolveContext.artifact.dates.compliancePeriodEndDate,
        );
      }
    } catch {
      return outcomeReviewPresentation(identity, 'The saved outcome history cannot safely be reduced to a current factual record.');
    }
  }

  return {
    stage: 'WAITING_FOR_OUTCOME', currentStep: 3, status: 'Waiting for an outcome', noticeIdentity: identity,
    whatHappened: `${successDescription} No post-service outcome is recorded yet.`,
    whatOwnerPilotRecorded: 'A successful service event is recorded for this exact Notice.',
    reviewRequired: false, reviewReason: null,
    nextTask: { label: 'Record what happened after service', href: '/notice/3-day/resolve' },
    whatOwnerPilotHasNotDone: 'OwnerPilot has not recorded a post-service outcome, determined its legal effect, or filed anything.',
    milestones: baseMilestones({
      notice: 'complete', noticeDetail: 'Notice created',
      service: 'complete', serviceDetail: 'Service recorded',
      outcome: 'current', outcomeDetail: 'Waiting for a factual outcome',
    }),
  };
}