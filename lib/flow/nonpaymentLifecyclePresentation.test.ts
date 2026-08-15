import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData, type ServiceAttempt } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import {
  appendResolveHistoryRecord,
  confirmOutcomeCandidate,
  createRecordedInErrorCorrection,
  deriveExactNoticeDemand,
  deriveResolveRecordContext,
  type ResolveHistoryRecord,
  type ResolveOutcomeCandidate,
  type ResolveOutcomeEvent,
} from './outcomeEvents';
import { OUTCOME_VERSION, type RestoredResolveOutcome } from './outcomePersistence';
import {
  deriveNonpaymentLifecyclePresentation,
  type NonpaymentLifecyclePresentation,
} from './nonpaymentLifecyclePresentation';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Lifecycle Ave, Los Angeles, CA 90001',
  propertyUnit: '4',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant'],
  rentPeriods: [
    { periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 1000 },
    { periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 1500 },
  ],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
  landlordContact: {
    phone: '2135551212',
    streetAddress: '100 Lifecycle Ave, Los Angeles, CA 90001',
  },
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  signerName: 'Synthetic Owner',
  signerCapacity: 'owner',
  serviceDate: '2026-08-12',
};

const approved: NoticeFlowData = {
  ...base,
  ...bindReviewApproval(base, '2026-08-11T06:00:00.000Z'),
};
const createdAtISO = '2026-08-11T06:01:00.000Z';
const productionSnapshot = {
  ...captureProductionSnapshot(approved),
  producedAtISO: createdAtISO,
};
const createdNoticeArtifact = captureCreatedNoticeArtifact(approved, createdAtISO, {
  compliancePeriodStartDate: '2026-08-13',
  compliancePeriodEndDate: '2026-08-17',
});
const created: NoticeFlowData = {
  ...approved,
  productionSnapshot,
  createdNoticeArtifact,
};

const failedAttempt: ServiceAttempt = {
  id: 'failed-1',
  attemptDate: '2026-08-13',
  method: 'personal',
  outcome: 'FAILED',
  notes: 'Synthetic failed attempt.',
  server: {
    name: 'Server One',
    address: '200 Server St',
    age18Plus: true,
    partyToNotice: false,
  },
};

const successfulAttempt: ServiceAttempt = {
  id: 'success-1',
  attemptDate: '2026-08-14',
  method: 'personal',
  outcome: 'SUCCESS',
  server: {
    name: 'Server One',
    address: '200 Server St',
    age18Plus: true,
    partyToNotice: false,
  },
};

const served: NoticeFlowData = {
  ...created,
  serviceAttempts: [failedAttempt, successfulAttempt],
  successfulServiceAttemptId: 'success-1',
};

const context = deriveResolveRecordContext(served);
if (!context) throw new Error('Lifecycle fixture requires exact successful service context.');
const resolveBinding = context.binding;
const exactDemand = deriveExactNoticeDemand(context.artifact);

function confirmedEvent(
  id: string,
  candidate: ResolveOutcomeCandidate,
  at: string,
): ResolveOutcomeEvent {
  const confirmation = confirmOutcomeCandidate(
    resolveBinding,
    candidate,
    at,
    {
      factualReportConfirmed: true,
      withdrawalPathStopConfirmed:
        candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' ? true : undefined,
    },
    exactDemand,
  );
  return {
    ...candidate,
    recordKind: 'OUTCOME',
    id,
    recordedAtISO: at,
    confirmation,
  } as ResolveOutcomeEvent;
}

function ready(events: readonly ResolveHistoryRecord[]): RestoredResolveOutcome {
  return {
    status: 'ready',
    envelope: {
      v: OUTCOME_VERSION,
      savedAt: '2026-08-16T20:00:00.000Z',
      binding: { ...resolveBinding },
      events: events.map(
        item => JSON.parse(JSON.stringify(item)) as ResolveHistoryRecord,
      ),
    },
  };
}

const absent: RestoredResolveOutcome = { status: 'absent' };

function project(
  data: NoticeFlowData | null,
  outcome: RestoredResolveOutcome = absent,
  noticePageIndex: number | null = 0,
  surface: 'notice' | 'serve' | 'resolve' = 'notice',
): NonpaymentLifecyclePresentation {
  return deriveNonpaymentLifecyclePresentation({
    data,
    outcome,
    noticePageIndex,
    surface,
  });
}

const noDraftNotice = project(null, absent, null, 'notice');
equal(noDraftNotice.status, 'Notice in progress', 'empty Notice surface does not invent a created Notice');
equal(noDraftNotice.currentStep, 1, 'empty Notice remains on Notice step');
equal(noDraftNotice.nextTask?.href, '/notice/3-day', 'empty Notice links to existing Notice route');
ok(/not created/i.test(noDraftNotice.whatHappened), 'empty Notice says no Notice is created');

const noDraftServe = project(null, absent, null, 'serve');
equal(noDraftServe.status, 'Needs review', 'Serve without exact Notice fails closed');
equal(noDraftServe.reviewRequired, true, 'Serve without exact Notice requires review');
equal(noDraftServe.nextTask?.href, '/notice/3-day', 'Serve empty-state returns to Notice route');

const inProgress = project(base, absent, 2, 'notice');
equal(inProgress.status, 'Notice in progress', 'draft projects Notice in progress');
equal(inProgress.nextTask?.label, 'Continue the Notice', 'draft exposes one Notice continuation task');
ok(/has not created/i.test(inProgress.whatOwnerPilotHasNotDone), 'draft boundary preserves not-created state');

const review = project(approved, absent, 4, 'notice');
equal(review.status, 'Ready for your review', 'review page projects owner review state');
equal(review.reviewRequired, true, 'review page requires owner review');
equal(review.nextTask?.label, 'Review & Confirm', 'review page has one Review & Confirm task');
equal(
  review.whatOwnerPilotRecorded,
  'OwnerPilot has saved the current Notice draft on this browser; no created Notice exists yet.',
  'review state does not imply created Notice',
);

const prepared = project(created, absent, 4, 'serve');
equal(prepared.status, 'Service not recorded', 'created Notice without attempts remains at the Service not recorded lifecycle level');
equal(prepared.currentStep, 2, 'prepared Notice moves to Service presentation step');
equal(prepared.nextTask?.href, '/notice/3-day/serve', 'prepared Notice links to existing Serve route');
ok(!/service recorded/i.test(prepared.status), 'prepared never derives service recorded');

const zeroAttemptsWithResolveResidue = project(
  created,
  { status: 'blocked', reason: 'invalid' },
  4,
  'resolve',
);
equal(zeroAttemptsWithResolveResidue.status, 'Service not recorded', 'zero service attempts ignore downstream Resolve residue');
equal(zeroAttemptsWithResolveResidue.currentStep, 2, 'zero service attempts stay at Service before Resolve');
equal(zeroAttemptsWithResolveResidue.reviewRequired, false, 'downstream Resolve residue cannot review-gate zero-attempt service state');

const failedOnly: NoticeFlowData = {
  ...created,
  serviceAttempts: [failedAttempt],
  successfulServiceAttemptId: undefined,
};
const failedProjection = project(failedOnly, absent, 4, 'serve');
equal(failedProjection.status, 'Service not completed', 'failed attempt never derives service recorded');
equal(failedProjection.nextTask?.label, 'Record the next actual attempt', 'failed attempt offers one next actual-attempt task');
ok(/none is the successful service event/i.test(failedProjection.whatOwnerPilotRecorded), 'failed attempt stays factual history only');

const failedWithResolveResidue = project(
  failedOnly,
  { status: 'blocked', reason: 'binding_mismatch' },
  4,
  'resolve',
);
equal(failedWithResolveResidue.status, 'Service not completed', 'failed-only service ignores downstream Resolve residue');
equal(failedWithResolveResidue.currentStep, 2, 'failed-only service stays at Service before Resolve');
equal(failedWithResolveResidue.reviewRequired, false, 'downstream Resolve residue cannot review-gate failed-only service state');

const waiting = project(served, absent, 4, 'resolve');
equal(waiting.status, 'Waiting for an outcome', 'successful service alone does not invent an outcome');
equal(waiting.currentStep, 3, 'successful service makes Outcome current presentation step');
equal(waiting.nextTask?.href, '/notice/3-day/resolve', 'successful service links to Resolve route');
equal(waiting.nextTask?.label, 'Record what happened after service', 'successful service gets factual outcome task');
ok(/not recorded a post-service outcome/i.test(waiting.whatOwnerPilotHasNotDone), 'successful service says no outcome is recorded');

const fullCandidate = {
  type: 'FULL_PAYMENT_REPORTED',
  payload: {
    paymentReceivedDate: '2026-08-16',
    amountReceived: 2500,
    acceptedConfirmed: true,
    fullExactNoticeDemandConfirmed: true,
  },
} satisfies ResolveOutcomeCandidate;
const fullEvent = confirmedEvent('event-full', fullCandidate, '2026-08-16T18:00:00.000Z');
const fullProjection = project(served, ready([fullEvent]), 4, 'resolve');
equal(fullProjection.status, 'Resolution reported', 'full-payment factual outcome maps to Resolution reported');
equal(fullProjection.reviewRequired, false, 'full-payment outcome does not invent review');
ok(/has not determined the legal effect/i.test(fullProjection.whatOwnerPilotHasNotDone), 'payment presentation preserves legal-effect boundary');
ok(/filed anything/i.test(fullProjection.whatOwnerPilotHasNotDone), 'factual outcome does not derive filing');

const failedWithReadyResolveResidue = project(failedOnly, ready([fullEvent]), 4, 'resolve');
equal(failedWithReadyResolveResidue.status, 'Service not completed', 'ready Resolve history cannot outrank failed-only Service state');
const zeroAttemptsWithReadyResolveResidue = project(created, ready([fullEvent]), 4, 'resolve');
equal(zeroAttemptsWithReadyResolveResidue.status, 'Service not recorded', 'ready Resolve history cannot outrank zero-attempt Service state');
ok(
  failedWithReadyResolveResidue.milestones.find(item => item.key === 'OUTCOME')?.state === 'pending' &&
    zeroAttemptsWithReadyResolveResidue.milestones.find(item => item.key === 'OUTCOME')?.state === 'pending',
  'Resolve state cannot become lifecycle authority before successful service',
);

const paymentReviewCandidate = {
  type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
  payload: {
    subtype: 'PARTIAL_PAYMENT_RECEIVED',
    eventDate: '2026-08-16',
    amount: 500,
    accepted: 'YES',
  },
} satisfies ResolveOutcomeCandidate;
const paymentReviewEvent = confirmedEvent(
  'event-payment-review',
  paymentReviewCandidate,
  '2026-08-16T18:01:00.000Z',
);
const paymentReviewProjection = project(served, ready([paymentReviewEvent]), 4, 'resolve');
equal(paymentReviewProjection.status, 'Payment needs review', 'payment review outcome remains review-required');
equal(paymentReviewProjection.reviewRequired, true, 'payment review cannot be projected as cleared');
equal(paymentReviewProjection.nextTask?.href, '/notice/3-day/resolve', 'payment review uses existing Resolve seam');

const noResolutionBefore = confirmedEvent(
  'event-no-resolution-before',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-16' } },
  '2026-08-16T18:02:00.000Z',
);
const noResolutionBeforeProjection = project(served, ready([noResolutionBefore]), 4, 'resolve');
equal(noResolutionBeforeProjection.status, 'No resolution reported', 'no-resolution remains factual');
equal(noResolutionBeforeProjection.nextTask?.label, 'Continue monitoring', 'before deterministic end date task is monitoring');
equal(noResolutionBeforeProjection.nextTask?.href, null, 'monitoring does not invent an executable route');

const noResolutionAfter = confirmedEvent(
  'event-no-resolution-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:02:00.000Z',
);
const noResolutionAfterProjection = project(served, ready([noResolutionAfter]), 4, 'resolve');
equal(noResolutionAfterProjection.nextTask?.label, 'Review available next options', 'after deterministic timing existing options seam is shown');
equal(noResolutionAfterProjection.nextTask?.href, '/notice/3-day/filing-readiness', 'next-options routes only to the bounded Filing Readiness surface');
ok(!/you may file|eligible to file/i.test(JSON.stringify(noResolutionAfterProjection)), 'Stage B handoff does not infer filing eligibility from elapsed time');

const withdrawalEvent = confirmedEvent(
  'event-withdrawal',
  {
    type: 'OWNER_WITHDREW_NOTICE_PATH',
    payload: { decisionDate: '2026-08-16', withdrawalConfirmed: true },
  },
  '2026-08-16T18:03:00.000Z',
);
const withdrawalProjection = project(served, ready([withdrawalEvent]), 4, 'resolve');
equal(withdrawalProjection.status, 'Notice path stopped', 'owner withdrawal stops current Notice path');
equal(withdrawalProjection.nextTask, null, 'withdrawal has no ordinary continuation CTA');

const possessionEvent = confirmedEvent(
  'event-possession',
  {
    type: 'POSSESSION_CHANGE_REPORTED',
    payload: {
      reportedOrObservedDate: '2026-08-16',
      observations: ['Tenant said they moved out'],
      keysReturned: 'NOT_SURE',
      physicalPossession: 'NO',
    },
  },
  '2026-08-16T18:04:00.000Z',
);
const possessionProjection = project(served, ready([possessionEvent]), 4, 'resolve');
equal(possessionProjection.status, 'Possession change reported', 'possession facts remain reported facts');
ok(/has not determined legal surrender/i.test(possessionProjection.whatOwnerPilotHasNotDone), 'possession boundary preserves no legal surrender inference');

const serviceReviewEvent = confirmedEvent(
  'event-service-review',
  {
    type: 'SERVICE_OR_OUTCOME_REVIEW',
    payload: {
      reviewReason: 'Synthetic service discrepancy',
      factualNote: 'Owner reports conflicting service facts.',
    },
  },
  '2026-08-16T18:05:00.000Z',
);
const serviceReviewProjection = project(served, ready([serviceReviewEvent]), 4, 'resolve');
equal(serviceReviewProjection.status, 'Service or outcome needs review', 'service/outcome review remains review-required');
equal(serviceReviewProjection.reviewRequired, true, 'service/outcome review cannot project progression');

const blockedInvalid = project(served, { status: 'blocked', reason: 'invalid' }, 4, 'resolve');
equal(blockedInvalid.status, 'Needs review', 'successful service plus invalid Resolve persistence fails closed');
equal(blockedInvalid.nextTask?.href, '/notice/3-day/serve', 'invalid Resolve state routes only to safe service seam');

const blockedMismatch = project(served, { status: 'blocked', reason: 'binding_mismatch' }, 4, 'resolve');
equal(blockedMismatch.status, 'Needs review', 'successful service plus mismatched Resolve persistence fails closed');
ok(/different Notice or service record/i.test(blockedMismatch.reviewReason ?? ''), 'binding mismatch gets plain review reason');

const manuallyMismatchedReady = ready([fullEvent]);
if (manuallyMismatchedReady.status !== 'ready') throw new Error('Ready fixture failed.');
manuallyMismatchedReady.envelope.binding.noticeGeneration = 'different-notice';
equal(project(served, manuallyMismatchedReady, 4, 'resolve').status, 'Needs review', 'successful service plus ready binding mismatch fails closed');

const invalidCreated: NoticeFlowData = {
  ...created,
  productionSnapshot: {
    ...productionSnapshot,
    producedAtISO: '2026-08-11T07:00:00.000Z',
  },
};
equal(project(invalidCreated, absent, 4, 'serve').status, 'Needs review', 'invalid exact Created Notice restoration fails closed');

const replacementEvent = confirmedEvent(
  'event-replacement',
  {
    ...paymentReviewCandidate,
    correctionOfEventId: 'event-full',
  },
  '2026-08-16T18:06:00.000Z',
);
let correctionHistory: ResolveHistoryRecord[] = appendResolveHistoryRecord(
  [],
  fullEvent,
  resolveBinding,
  exactDemand,
);
correctionHistory = appendResolveHistoryRecord(
  correctionHistory,
  replacementEvent,
  resolveBinding,
  exactDemand,
);
equal(project(served, ready(correctionHistory), 4, 'resolve').status, 'Payment needs review', 'projection uses current effective correction outcome');

const recordedInError = createRecordedInErrorCorrection({
  id: 'event-error',
  targetEventId: 'event-replacement',
  recordedAtISO: '2026-08-16T18:07:00.000Z',
  confirmedAtISO: '2026-08-16T18:07:00.000Z',
  binding: resolveBinding,
  recordedInErrorConfirmed: true,
});
correctionHistory = appendResolveHistoryRecord(
  correctionHistory,
  recordedInError,
  resolveBinding,
  exactDemand,
);
equal(project(served, ready(correctionHistory), 4, 'resolve').status, 'Resolution reported', 'recorded-in-error restores predecessor via existing reducer semantics');

const projections = [
  noDraftNotice,
  noDraftServe,
  inProgress,
  review,
  prepared,
  zeroAttemptsWithResolveResidue,
  failedProjection,
  failedWithResolveResidue,
  failedWithReadyResolveResidue,
  zeroAttemptsWithReadyResolveResidue,
  waiting,
  fullProjection,
  paymentReviewProjection,
  noResolutionBeforeProjection,
  noResolutionAfterProjection,
  withdrawalProjection,
  possessionProjection,
  serviceReviewProjection,
  blockedInvalid,
  blockedMismatch,
];
const allowedRoutes = new Set<string | null>([
  '/notice/3-day',
  '/notice/3-day/serve',
  '/notice/3-day/resolve',
  '/notice/3-day/options',
  '/notice/3-day/filing-readiness',
  null,
]);
ok(projections.every(item => allowedRoutes.has(item.nextTask?.href ?? null)), 'projection links only existing authorized routes');
ok(projections.every(item => item.milestones.length === 3), 'history stays compact Notice-Service-Outcome');
for (const item of projections) {
  const firstIncompleteIndex = item.milestones.findIndex(
    (milestone) => milestone.state !== 'complete',
  );
  equal(
    item.currentStep,
    firstIncompleteIndex === -1 ? 3 : firstIncompleteIndex + 1,
    'existing lifecycle currentStep agrees with the first incomplete governed milestone',
  );
}
ok(
  fullProjection.milestones.every((milestone) => milestone.state === 'complete'),
  'resolved outcome preserves the existing all-three-milestones-complete state',
);
ok(projections.every(item => item.nextTask === null || typeof item.nextTask.label === 'string'), 'projection exposes at most one next task object');
ok(projections.every(item => !/(^|\s)(filed|court accepted|court-issued)(\s|$)/i.test(item.status)), 'no status invents filed/court-accepted/court-issued completion');

const sourceDataBefore = JSON.stringify(served);
const sourceOutcome = ready(correctionHistory);
const sourceOutcomeBefore = JSON.stringify(sourceOutcome);
deriveNonpaymentLifecyclePresentation({
  surface: 'resolve',
  data: served,
  noticePageIndex: 4,
  outcome: sourceOutcome,
});
equal(JSON.stringify(served), sourceDataBefore, 'projection cannot mutate Notice/service source authority');
equal(JSON.stringify(sourceOutcome), sourceOutcomeBefore, 'projection cannot mutate Resolve source authority');

const projectionSource = readFileSync('lib/flow/nonpaymentLifecyclePresentation.ts', 'utf8');
ok(!projectionSource.includes('localStorage'), 'pure projection does not read browser storage directly');
ok(!projectionSource.includes('setItem('), 'pure projection performs no storage write');
ok(!projectionSource.includes('saveDraft('), 'pure projection cannot persist lifecycle status');
ok(!projectionSource.includes('saveOutcomeHistory('), 'pure projection cannot rewrite Resolve history');
ok(!projectionSource.includes('supabase'), 'pure projection adds no database/Supabase dependency');
ok(
  projectionSource.indexOf("serviceContext.display.kind !== 'recorded'") < projectionSource.indexOf("input.outcome.status === 'blocked'"),
  'projection enforces Service lifecycle dependency before inspecting Resolve state',
);

const componentSource = readFileSync('components/nonpayment-lifecycle-summary.tsx', 'utf8');
ok(componentSource.includes('loadDraft()'), 'summary reads existing Notice draft source');
ok(componentSource.includes('restoreOutcomeHistory('), 'summary reads existing Resolve persistence source');
ok(!componentSource.includes('saveDraft(') && !componentSource.includes('saveOutcomeHistory('), 'summary performs no Notice or Resolve writes');
ok(!componentSource.includes('localStorage.setItem'), 'summary creates no lifecycle storage envelope');
ok(
  componentSource.includes(
    "const PRODUCT_STAGE_LABELS = [\n  'Notice',\n  'Unlawful Detainer',\n  'Service & Possession',\n] as const;",
  ),
  'compact bar uses exactly the locked three Product stage labels in order',
);
ok(
  componentSource.includes(
    "presentation.milestones.findIndex(\n    (milestone) => milestone.state !== 'complete',\n  )",
  ),
  'compact bar derives current presentation from the first incomplete existing milestone',
);
ok(
  componentSource.includes("const allComplete = firstIncompleteMilestoneIndex === -1;"),
  'compact bar handles the existing all-complete milestone state explicitly',
);
ok(
  componentSource.includes("? 'All stages complete'"),
  'all-complete presentation does not invent a fourth lifecycle stage',
);
ok(
  componentSource.includes("aria-current={displayState === 'current' ? 'step' : undefined}"),
  'current Product stage exposes semantic aria-current treatment',
);
ok(
  componentSource.includes("? '✓'") &&
    componentSource.includes("? '▶'") &&
    componentSource.includes(": '○'"),
  'completed/current/upcoming stages are distinguished with non-color markers',
);
ok(componentSource.includes('<span className="font-semibold">Current:</span>'), 'compact bar exposes an explicit textual Current marker');
ok(
  componentSource.includes('flex flex-col gap-1.5 sm:flex-row'),
  'compact bar uses stacked mobile and horizontal desktop responsive presentation',
);
ok(componentSource.includes('Details <span aria-hidden="true">⌄</span>'), 'full lifecycle explanation is secondary behind compact Details disclosure');
ok(componentSource.includes('Lifecycle history'), 'expanded details retain governed lifecycle history');
ok(componentSource.includes('What happened'), 'expanded details retain what happened');
ok(componentSource.includes('What OwnerPilot recorded'), 'expanded details retain what OwnerPilot recorded');
ok(componentSource.includes('What OwnerPilot has not done'), 'expanded details retain truthful boundary copy');
ok(componentSource.includes('Review needed'), 'expanded details retain review-needed reason treatment');
ok(!componentSource.includes('Step {presentation.currentStep} of 3'), 'compact bar removes the competing lifecycle numeric counter');
ok(!componentSource.includes('Current stage · {lifecycleStageLabel}'), 'compact bar removes the old repeated stage/status rows');
ok(!componentSource.includes('rounded-xl border border-rule bg-white p-5 shadow-sm sm:p-6'), 'compact bar removes the oversized lifecycle card shell');
ok(!componentSource.includes('LIFECYCLE_STAGE_LABELS'), 'component does not introduce a second lifecycle-stage state mapping');
ok(componentSource.includes('{presentation.status}'), 'displayed status remains sourced from existing rule-derived presentation state');
ok(componentSource.includes('!nextTaskIsCurrentSurface'), 'summary suppresses same-surface next-task navigation');
ok(componentSource.includes('SURFACE_HREFS[surface]'), 'same-surface suppression compares against the active task surface');

const noticePage = readFileSync('app/notice/3-day/page.tsx', 'utf8');
const servePage = readFileSync('app/notice/3-day/serve/page.tsx', 'utf8');
const resolvePage = readFileSync('app/notice/3-day/resolve/page.tsx', 'utf8');
ok(noticePage.includes('<NonpaymentLifecycleSummary surface="notice" />'), 'Notice surface uses reusable lifecycle summary');
ok(servePage.includes('<NonpaymentLifecycleSummary surface="serve" />'), 'Serve surface uses reusable lifecycle summary');
ok(resolvePage.includes('<NonpaymentLifecycleSummary surface="resolve" />'), 'Resolve surface uses reusable lifecycle summary');

console.log(`${passed} Stage B nonpayment lifecycle presentation assertions passed`);