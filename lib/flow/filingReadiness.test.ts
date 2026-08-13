import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import { deriveFilingReadiness } from './filingReadiness';
import { deriveNonpaymentLifecyclePresentation } from './nonpaymentLifecyclePresentation';
import { createFlowState, type NoticeFlowData, type ServiceAttempt } from './noticeFlowState';
import {
  confirmOutcomeCandidate,
  deriveExactNoticeDemand,
  deriveResolveRecordContext,
  type ResolveHistoryRecord,
  type ResolveOutcomeCandidate,
  type ResolveOutcomeEvent,
} from './outcomeEvents';
import { OUTCOME_VERSION, type RestoredResolveOutcome } from './outcomePersistence';
import { bindReviewApproval } from './reviewApproval';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}

const address = '100 Filing Ave, Glendale, CA 91201';
const addressKey = '100 filing ave, glendale, ca 91201';
const base: NoticeFlowData = {
  ...createFlowState().data,
  dispute: {
    tenantFiledComplaint: 'no',
    tenantWrittenWithholding: 'no',
    tenantBankruptcy: 'no',
  },
  propertyAddress: address,
  propertyCity: 'Glendale',
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
    streetAddress: address,
  },
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  signerName: 'Synthetic Owner',
  signerCapacity: 'owner',
  serviceDate: '2026-08-12',
  cachedCaliforniaEligibility: {
    status: 'CONFIRMED_CALIFORNIA',
    addressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
  cachedResolverVerdict: {
    verdict: 'not_la',
    addressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'live_resolver',
  },
};

const createdAtISO = '2026-08-11T06:01:00.000Z';
function createNotice(overrides: Partial<NoticeFlowData> = {}): NoticeFlowData {
  const source: NoticeFlowData = {
    ...base,
    ...overrides,
    tenantNames: overrides.tenantNames ?? base.tenantNames,
    rentPeriods: overrides.rentPeriods ?? base.rentPeriods,
  };
  const approved: NoticeFlowData = {
    ...source,
    ...bindReviewApproval(source, '2026-08-11T06:00:00.000Z'),
  };
  return {
    ...approved,
    productionSnapshot: {
      ...captureProductionSnapshot(approved),
      producedAtISO: createdAtISO,
    },
    createdNoticeArtifact: captureCreatedNoticeArtifact(approved, createdAtISO, {
      compliancePeriodStartDate: '2026-08-13',
      compliancePeriodEndDate: '2026-08-17',
    }),
  };
}

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

function serve(created: NoticeFlowData): NoticeFlowData {
  return {
    ...created,
    serviceAttempts: [failedAttempt, successfulAttempt],
    successfulServiceAttemptId: 'success-1',
  };
}

function eventFor(
  served: NoticeFlowData,
  id: string,
  candidate: ResolveOutcomeCandidate,
  at: string,
): ResolveOutcomeEvent {
  const context = deriveResolveRecordContext(served);
  if (!context) throw new Error('Stage C fixture requires exact service context.');
  const exactDemand = deriveExactNoticeDemand(context.artifact);
  return {
    ...candidate,
    recordKind: 'OUTCOME',
    id,
    recordedAtISO: at,
    confirmation: confirmOutcomeCandidate(
      context.binding,
      candidate,
      at,
      {
        factualReportConfirmed: true,
        withdrawalPathStopConfirmed:
          candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' ? true : undefined,
      },
      exactDemand,
    ),
  } as ResolveOutcomeEvent;
}

function readyFor(
  served: NoticeFlowData,
  events: readonly ResolveHistoryRecord[],
): RestoredResolveOutcome {
  const context = deriveResolveRecordContext(served);
  if (!context) throw new Error('Stage C fixture requires exact service context.');
  return {
    status: 'ready',
    envelope: {
      v: OUTCOME_VERSION,
      savedAt: '2026-08-18T20:00:00.000Z',
      binding: { ...context.binding },
      events: events.map(record => JSON.parse(JSON.stringify(record)) as ResolveHistoryRecord),
    },
  };
}

const absent: RestoredResolveOutcome = { status: 'absent' };
function project(data: NoticeFlowData | null, outcome: RestoredResolveOutcome = absent) {
  return deriveFilingReadiness({ data, noticePageIndex: data ? 4 : null, outcome });
}

const noNotice = project(null);
equal(noNotice.state, 'Not yet applicable', 'no Notice cannot enter Filing Readiness');
equal(noNotice.nextTask.href, '/notice/3-day', 'no Notice routes to the Notice task');

const draft = project(base);
equal(draft.state, 'Not yet applicable', 'in-progress Notice is not yet applicable');

const created = createNotice();
const invalidCreated = project({
  ...created,
  productionSnapshot: {
    ...created.productionSnapshot!,
    producedAtISO: '2026-08-11T07:00:00.000Z',
  },
});
equal(invalidCreated.state, 'Cannot continue', 'unrestorable exact Notice fails closed');

const prepared = project(created);
equal(prepared.state, 'Not yet applicable', 'created Notice without service is not yet applicable');
equal(prepared.lifecycle.status, 'Service not recorded', 'Stage C consumes Stage B prepared-service state');

const failedOnly: NoticeFlowData = {
  ...created,
  serviceAttempts: [failedAttempt],
  successfulServiceAttemptId: undefined,
};
const failedProjection = project(failedOnly, { status: 'blocked', reason: 'invalid' });
equal(failedProjection.state, 'Not yet applicable', 'failed-only service ignores downstream Resolve residue');
equal(failedProjection.lifecycle.status, 'Service not completed', 'failed-only attempts remain service-not-completed');
ok(
  failedProjection.checklist.find(item => item.key === 'POST_SERVICE_OUTCOME')?.status === 'Not yet applicable',
  'Resolve residue has no Stage C authority before successful service',
);

const served = serve(created);
const waiting = project(served);
equal(waiting.state, 'Not yet applicable', 'successful service without outcome is not yet applicable');
equal(waiting.nextTask.href, '/notice/3-day/resolve', 'missing outcome routes to Resolve & Record');

const full = eventFor(
  served,
  'full',
  {
    type: 'FULL_PAYMENT_REPORTED',
    payload: {
      paymentReceivedDate: '2026-08-16',
      amountReceived: 2500,
      acceptedConfirmed: true,
      fullExactNoticeDemandConfirmed: true,
    },
  },
  '2026-08-16T18:00:00.000Z',
);
equal(project(served, readyFor(served, [full])).state, 'Not yet applicable', 'full payment creates no filing-preparation progression');

const paymentReview = eventFor(
  served,
  'payment-review',
  {
    type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
    payload: {
      subtype: 'PARTIAL_PAYMENT_RECEIVED',
      eventDate: '2026-08-16',
      amount: 500,
      accepted: 'YES',
    },
  },
  '2026-08-16T18:01:00.000Z',
);
equal(project(served, readyFor(served, [paymentReview])).state, 'Needs owner review', 'payment review hard-pauses Stage C');

const withdrawal = eventFor(
  served,
  'withdrawal',
  {
    type: 'OWNER_WITHDREW_NOTICE_PATH',
    payload: { decisionDate: '2026-08-16', withdrawalConfirmed: true },
  },
  '2026-08-16T18:02:00.000Z',
);
const withdrawalProjection = project(served, readyFor(served, [withdrawal]));
equal(withdrawalProjection.state, 'Not yet applicable', 'stopped Notice path creates no progression');
equal(withdrawalProjection.nextTask.href, null, 'stopped path has no fake Filing Readiness CTA');

const possession = eventFor(
  served,
  'possession',
  {
    type: 'POSSESSION_CHANGE_REPORTED',
    payload: {
      reportedOrObservedDate: '2026-08-16',
      observations: ['Tenant reported moving out'],
      keysReturned: 'NOT_SURE',
      physicalPossession: 'NOT_SURE',
    },
  },
  '2026-08-16T18:03:00.000Z',
);
const possessionProjection = project(served, readyFor(served, [possession]));
equal(possessionProjection.state, 'Needs owner review', 'possession change requires owner review');
ok(/does not infer legal surrender/i.test(possessionProjection.summary), 'possession state does not infer legal surrender');

const serviceReview = eventFor(
  served,
  'service-review',
  {
    type: 'SERVICE_OR_OUTCOME_REVIEW',
    payload: {
      reviewReason: 'Synthetic service discrepancy',
      factualNote: 'Owner reports conflicting facts.',
    },
  },
  '2026-08-16T18:04:00.000Z',
);
equal(project(served, readyFor(served, [serviceReview])).state, 'Needs owner review', 'service/outcome review hard-pauses Stage C');

const before = eventFor(
  served,
  'before',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-16' } },
  '2026-08-16T18:05:00.000Z',
);
const beforeProjection = project(served, readyFor(served, [before]));
equal(beforeProjection.state, 'Not yet applicable', 'no resolution before endpoint remains not yet applicable');
equal(beforeProjection.nextTask.href, null, 'before endpoint shows monitoring, not progression');

const after = eventFor(
  served,
  'after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:05:00.000Z',
);
const readyProjection = project(served, readyFor(served, [after]));
equal(readyProjection.state, 'Ready for packet review', 'eligible Stage C inputs produce only Ready for packet review');
ok(readyProjection.state !== ('Ready' as string), 'Stage C never emits a naked Ready aggregate');
equal(readyProjection.nextTask.href, null, 'Ready for packet review has no executable packet-generation CTA');
ok(/not a filing or legal-sufficiency determination/i.test(readyProjection.summary), 'elapsed time plus complete prerequisites still does not imply filing eligibility');
ok(/has not filed, submitted, signed, paid court fees, or obtained court acceptance/i.test(readyProjection.whatOwnerPilotHasNotDone), 'customer boundary explicitly states external actions not taken');

const missingCoreCreated = createNotice({ propertyCounty: undefined });
const missingCoreServed = serve(missingCoreCreated);
const missingCoreAfter = eventFor(
  missingCoreServed,
  'missing-core-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:06:00.000Z',
);
const missingCore = project(missingCoreServed, readyFor(missingCoreServed, [missingCoreAfter]));
equal(missingCore.state, 'Needs information', 'missing deterministically required frozen core fact needs information');
ok(/property county/i.test(missingCore.checklist.find(item => item.key === 'CORE_FACTS')?.missingOrReview ?? ''), 'missing core fact is explained in owner language');

const unresolvedControlCreated = createNotice({
  cachedCaliforniaEligibility: {
    status: 'UNKNOWN',
    addressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
});
const unresolvedControlServed = serve(unresolvedControlCreated);
const unresolvedAfter = eventFor(
  unresolvedControlServed,
  'unresolved-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:07:00.000Z',
);
equal(
  project(unresolvedControlServed, readyFor(unresolvedControlServed, [unresolvedAfter])).state,
  'Cannot continue',
  'unresolved existing jurisdiction/control evidence fails closed',
);

const blockedInvalid = project(served, { status: 'blocked', reason: 'invalid' });
equal(blockedInvalid.state, 'Cannot continue', 'invalid Resolve history after successful service fails closed');
const mismatched = readyFor(served, [after]);
if (mismatched.status !== 'ready') throw new Error('Ready fixture failed.');
mismatched.envelope.binding.noticeGeneration = 'different-notice';
equal(project(served, mismatched).state, 'Cannot continue', 'mismatched Resolve history after successful service fails closed');

const stale = project({ ...served, stalenessReason: 'FACE_FIELD_CHANGED' }, readyFor(served, [after]));
equal(stale.state, 'Cannot continue', 'stale Notice state fails closed');

const directIneligible = deriveFilingReadiness({ data: created, noticePageIndex: 4, outcome: { status: 'blocked', reason: 'invalid' } });
equal(directIneligible.state, 'Not yet applicable', 'direct route navigation cannot let downstream residue outrank incomplete service');

const fullStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [full]) });
equal(fullStageB.nextTask?.href, '/notice/3-day/resolve', 'Stage B full-payment route remains unchanged');
const reviewStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [paymentReview]) });
equal(reviewStageB.nextTask?.href, '/notice/3-day/resolve', 'Stage B payment-review route remains unchanged');
const withdrawalStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [withdrawal]) });
equal(withdrawalStageB.nextTask, null, 'Stage B withdrawal route remains unchanged');
const possessionStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [possession]) });
equal(possessionStageB.nextTask?.href, '/notice/3-day/resolve', 'Stage B possession route remains unchanged');
const serviceReviewStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [serviceReview]) });
equal(serviceReviewStageB.nextTask?.href, '/notice/3-day/resolve', 'Stage B service-review route remains unchanged');
const afterStageB = deriveNonpaymentLifecyclePresentation({ surface: 'resolve', data: served, noticePageIndex: 4, outcome: readyFor(served, [after]) });
equal(afterStageB.nextTask?.href, '/notice/3-day/filing-readiness', 'only accepted no-resolution handoff routes to Filing Readiness');

const source = readFileSync('lib/flow/filingReadiness.ts', 'utf8');
ok(!source.includes('localStorage') && !source.includes('setItem('), 'pure Stage C projection performs no storage writes');
ok(!source.includes('saveDraft(') && !source.includes('saveOutcomeHistory('), 'Stage C projection cannot persist readiness');
ok(!source.toLowerCase().includes('supabase'), 'Stage C adds no database/Supabase dependency');
for (const registryToken of ['UD-100', 'UD-101', 'SUM-130', 'CM-010', 'LACIV109']) {
  ok(!source.includes(registryToken), `registry presence cannot create ${registryToken} applicability`);
}
ok(!source.includes('officialFormRegistry') && !source.includes('official-form'), 'Stage C has no official-form registry dependency');

const componentSource = readFileSync('components/filing-readiness.tsx', 'utf8');
ok(componentSource.includes('loadDraft()'), 'customer surface reads existing Notice persistence');
ok(componentSource.includes('restoreOutcomeHistory('), 'customer surface reads existing Resolve persistence');
ok(!componentSource.includes('saveDraft(') && !componentSource.includes('saveOutcomeHistory('), 'customer surface performs no Notice or Resolve writes');
ok(componentSource.includes('Filing preparation'), 'surface uses Product-authorized Filing preparation hierarchy');
ok(componentSource.includes('Preparation checklist'), 'surface renders a preparation checklist');
ok(componentSource.includes('View lifecycle context'), 'lifecycle context is secondary');

const pageSource = readFileSync('app/notice/3-day/filing-readiness/page.tsx', 'utf8');
ok(pageSource.includes('<FilingReadiness />'), 'dedicated Filing Readiness route renders the Stage C surface');
const optionsSource = readFileSync('app/notice/3-day/options/page.tsx', 'utf8');
ok(!optionsSource.includes('FilingReadiness') && !optionsSource.includes('filing-readiness'), '/notice/3-day/options remains untouched by Stage C');

const allowedStates = new Set([
  'Needs information',
  'Needs owner review',
  'Cannot continue',
  'Not yet applicable',
  'Ready for packet review',
]);
const sampled = [
  noNotice,
  draft,
  invalidCreated,
  prepared,
  failedProjection,
  waiting,
  withdrawalProjection,
  possessionProjection,
  beforeProjection,
  readyProjection,
  missingCore,
  blockedInvalid,
];
ok(sampled.every(result => allowedStates.has(result.state)), 'Stage C aggregate state vocabulary is closed to the five Product states');
ok(sampled.every(result => result.checklist.length === 6), 'Stage C always presents the six-category checklist floor');

console.log(`${passed} Stage C Filing Readiness assertions passed`);
