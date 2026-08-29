import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { captureCreatedNoticeArtifact, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import { deriveFilingReadiness } from './filingReadiness';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
  type AgreementPacketState,
  type Attachment10cPacketState,
  type CanonicalFilingFactRef,
  type FilingPacketCompositionInput,
  type GovernedControlInput,
  type NoticePacketState,
  type PacketArtifactBinding,
  type PacketArtifactRole,
  type ProofOfServicePacketState,
} from './filingCanonicalFacts';
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
const laAddress = '100 Review Ave, Los Angeles, CA 90001';
const laAddressKey = '100 review ave, los angeles, ca 90001';
const santaMonicaAddress = '100 Overlay Ave, Santa Monica, CA 90401';
const santaMonicaAddressKey = '100 overlay ave, santa monica, ca 90401';
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

function currentControl<T>(
  value: T,
  resultId: string,
  dependencies: readonly CanonicalFilingFactRef[] = [],
): GovernedControlInput<T> {
  return {
    state: 'KNOWN',
    value,
    control: {
      controlId: 'ud100.packet-composition',
      controlVersion: '1.0.0',
      resultId,
      status: 'CURRENT',
    },
    dependencies,
  };
}

function packetArtifact(
  data: NoticeFlowData,
  artifactRole: PacketArtifactRole,
  artifactId: string,
  hex = 'a',
): PacketArtifactBinding {
  const artifact = restoreCreatedNoticeArtifact(data);
  if (!artifact) throw new Error('Packet fixture requires exact Created Notice identity.');
  return {
    artifactId,
    artifactRole,
    sha256: hex.repeat(64),
    byteLength: 2048,
    createdNotice: {
      generation: artifact.generation,
      createdAtISO: artifact.createdAtISO,
    },
  };
}

function resolvedPacketComposition(data: NoticeFlowData): FilingPacketCompositionInput {
  return {
    agreement: currentControl<AgreementPacketState>(
      { kind: 'NOT_ATTACHED_SOLELY_NONPAYMENT' },
      'agreement-nonpayment',
    ),
    notice: currentControl<NoticePacketState>(
      {
        kind: 'EXHIBIT_2_ATTACHED',
        requiredNoticeCount: 1,
        artifacts: [packetArtifact(data, 'EXHIBIT_2_NOTICE', 'synthetic-notice-1', 'b')],
      },
      'notice-one-complete',
    ),
    proofOfService: currentControl<ProofOfServicePacketState>(
      { kind: 'NOT_ATTACHED' },
      'proof-not-attached',
    ),
    attachment10c: currentControl<Attachment10cPacketState>(
      { kind: 'NOT_APPLICABLE' },
      '10c-not-applicable',
    ),
  };
}

const absent: RestoredResolveOutcome = { status: 'absent' };
function project(data: NoticeFlowData | null, outcome: RestoredResolveOutcome = absent) {
  const packetComposition = data && restoreCreatedNoticeArtifact(data)
    ? resolvedPacketComposition(data)
    : undefined;
  return deriveFilingReadiness({
    data,
    noticePageIndex: data ? 4 : null,
    outcome,
    packetComposition,
  });
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
equal(readyProjection.state, 'Ready for packet review', 'eligible Stage C inputs plus resolved packet composition produce only Ready for packet review');
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

const hardBlockCreated = createNotice({
  propertyAddress: santaMonicaAddress,
  propertyCity: 'Santa Monica',
  cachedCaliforniaEligibility: {
    status: 'CONFIRMED_CALIFORNIA',
    addressKey: santaMonicaAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
  cachedResolverVerdict: {
    verdict: 'not_la',
    addressKey: santaMonicaAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'live_resolver',
  },
});
const hardBlockServed = serve(hardBlockCreated);
const hardBlockAfter = eventFor(
  hardBlockServed,
  'hard-block-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:08:00.000Z',
);
const hardBlockProjection = project(hardBlockServed, readyFor(hardBlockServed, [hardBlockAfter]));
equal(hardBlockProjection.state, 'Cannot continue', 'hard-block overlay city cannot enter packet review');
ok(
  hardBlockProjection.checklist.find(item => item.key === 'JURISDICTION_CONTROLS')?.status === 'Cannot continue',
  'hard-block overlay remains a Stage C control blocker even if resolver residue says not_la',
);

const missingResolverCreated = createNotice({
  propertyAddress: laAddress,
  propertyCity: 'Los Angeles',
  cachedCaliforniaEligibility: {
    status: 'CONFIRMED_CALIFORNIA',
    addressKey: laAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
  cachedResolverVerdict: undefined,
});
const missingResolverServed = serve(missingResolverCreated);
const missingResolverAfter = eventFor(
  missingResolverServed,
  'missing-resolver-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:09:00.000Z',
);
const missingResolverProjection = project(
  missingResolverServed,
  readyFor(missingResolverServed, [missingResolverAfter]),
);
equal(missingResolverProjection.state, 'Cannot continue', 'NEEDS_CONFIRMATION remains standing without resolver evidence');
ok(
  /no current matching resolver evidence/i.test(
    missingResolverProjection.checklist.find(item => item.key === 'JURISDICTION_CONTROLS')?.missingOrReview ?? '',
  ),
  'missing resolver evidence is surfaced as an unresolved existing control',
);

const staleResolverCreated = createNotice({
  propertyAddress: laAddress,
  propertyCity: 'Los Angeles',
  cachedCaliforniaEligibility: {
    status: 'CONFIRMED_CALIFORNIA',
    addressKey: laAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
  cachedResolverVerdict: {
    verdict: 'not_la',
    addressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'live_resolver',
  },
});
const staleResolverServed = serve(staleResolverCreated);
const staleResolverAfter = eventFor(
  staleResolverServed,
  'stale-resolver-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:10:00.000Z',
);
const staleResolverProjection = project(
  staleResolverServed,
  readyFor(staleResolverServed, [staleResolverAfter]),
);
equal(staleResolverProjection.state, 'Cannot continue', 'stale or mismatched resolver evidence cannot clear NEEDS_CONFIRMATION');

const clearingResolverCreated = createNotice({
  propertyAddress: laAddress,
  propertyCity: 'Los Angeles',
  cachedCaliforniaEligibility: {
    status: 'CONFIRMED_CALIFORNIA',
    addressKey: laAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'google_places',
  },
  cachedResolverVerdict: {
    verdict: 'not_la',
    addressKey: laAddressKey,
    resolvedAt: '2026-08-11T05:00:00.000Z',
    source: 'live_resolver',
  },
});
const clearingResolverServed = serve(clearingResolverCreated);
const clearingResolverAfter = eventFor(
  clearingResolverServed,
  'clearing-resolver-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:11:00.000Z',
);
const clearingResolverProjection = project(
  clearingResolverServed,
  readyFor(clearingResolverServed, [clearingResolverAfter]),
);
equal(clearingResolverProjection.state, 'Ready for packet review', 'current matching not_la resolver verdict clears existing NEEDS_CONFIRMATION with packet composition resolved');

const cleanNoResolverCreated = createNotice({ cachedResolverVerdict: undefined });
const cleanNoResolverServed = serve(cleanNoResolverCreated);
const cleanNoResolverAfter = eventFor(
  cleanNoResolverServed,
  'clean-no-resolver-after',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-18' } },
  '2026-08-18T18:12:00.000Z',
);
equal(
  project(cleanNoResolverServed, readyFor(cleanNoResolverServed, [cleanNoResolverAfter])).state,
  'Ready for packet review',
  'clean NO_KNOWN_OVERLAY path does not invent a resolver prerequisite when packet composition is resolved',
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

function finalPacketProjection(packetComposition?: FilingPacketCompositionInput) {
  return deriveFilingReadiness({
    data: served,
    noticePageIndex: 4,
    outcome: readyFor(served, [after]),
    packetComposition,
  });
}

const omittedPacketFacts = projectFilingCanonicalFacts(created);
equal(omittedPacketFacts.status, 'READY', 'B1 packet facts extend canonical projection without blocking unrelated projection');
for (const ref of [
  CANONICAL_FILING_FACT_REFS.packetAgreement,
  CANONICAL_FILING_FACT_REFS.packetNotice,
  CANONICAL_FILING_FACT_REFS.packetProofOfService,
  CANONICAL_FILING_FACT_REFS.packetAttachment10c,
] as const) {
  equal(readCanonicalFilingFact(omittedPacketFacts, ref)?.state, 'UNANSWERED', `${ref} omission remains explicit UNANSWERED`);
}
const resolvedPacketFacts = projectFilingCanonicalFacts(created, {
  preparation: { packetComposition: resolvedPacketComposition(created) },
});
for (const ref of [
  CANONICAL_FILING_FACT_REFS.packetAgreement,
  CANONICAL_FILING_FACT_REFS.packetNotice,
  CANONICAL_FILING_FACT_REFS.packetProofOfService,
  CANONICAL_FILING_FACT_REFS.packetAttachment10c,
] as const) {
  const fact = readCanonicalFilingFact(resolvedPacketFacts, ref);
  equal(fact?.state, 'KNOWN', `${ref} becomes KNOWN only from exact governed packet input`);
  if (fact?.state === 'KNOWN') {
    equal(fact.provenance.governedControl?.status, 'CURRENT', `${ref} preserves exact CURRENT governed-control provenance`);
  }
}

equal(finalPacketProjection().state, 'Needs information', 'omitted packet composition cannot produce Ready for packet review');

for (const [key, value] of [
  ['agreement', { kind: 'UNRESOLVED' }],
  ['notice', { kind: 'UNRESOLVED' }],
  ['proofOfService', { kind: 'UNRESOLVED' }],
  ['attachment10c', { kind: 'UNRESOLVED' }],
] as const) {
  const packet = resolvedPacketComposition(served);
  (packet as Record<string, unknown>)[key] = currentControl(value, `unresolved-${key}`);
  equal(finalPacketProjection(packet).state, 'Needs information', `${key} UNRESOLVED blocks packet-review readiness`);
}

const staleControlPacket = resolvedPacketComposition(served);
staleControlPacket.notice = {
  ...(staleControlPacket.notice as Extract<GovernedControlInput<NoticePacketState>, { state: 'KNOWN' }>),
  control: { controlId: 'ud100.packet-composition', controlVersion: '1.0.0', resultId: 'stale-notice', status: 'STALE' },
};
equal(finalPacketProjection(staleControlPacket).state, 'Cannot continue', 'stale packet control authority fails closed');
const missingControlPacket = resolvedPacketComposition(served);
missingControlPacket.notice = {
  state: 'KNOWN',
  value: (missingControlPacket.notice as Extract<GovernedControlInput<NoticePacketState>, { state: 'KNOWN' }>).value,
  dependencies: [],
};
equal(finalPacketProjection(missingControlPacket).state, 'Cannot continue', 'missing packet control authority fails closed');
const missingDependenciesPacket = resolvedPacketComposition(served);
missingDependenciesPacket.notice = {
  state: 'KNOWN',
  value: (missingDependenciesPacket.notice as Extract<GovernedControlInput<NoticePacketState>, { state: 'KNOWN' }>).value,
  control: { controlId: 'ud100.packet-composition', controlVersion: '1.0.0', resultId: 'missing-deps', status: 'CURRENT' },
};
equal(finalPacketProjection(missingDependenciesPacket).state, 'Cannot continue', 'missing exact dependency vector fails closed');

const wrongGenerationPacket = resolvedPacketComposition(served);
const wrongGenerationArtifact = packetArtifact(served, 'EXHIBIT_2_NOTICE', 'wrong-generation', 'c');
wrongGenerationArtifact.createdNotice = { ...wrongGenerationArtifact.createdNotice, generation: 'different-generation' };
wrongGenerationPacket.notice = currentControl<NoticePacketState>({ kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1, artifacts: [wrongGenerationArtifact] }, 'wrong-generation');
equal(finalPacketProjection(wrongGenerationPacket).state, 'Cannot continue', 'artifact bound to wrong CreatedNotice generation fails closed');

const wrongCreatedAtPacket = resolvedPacketComposition(served);
const wrongCreatedAtArtifact = packetArtifact(served, 'EXHIBIT_2_NOTICE', 'wrong-created-at', 'c');
wrongCreatedAtArtifact.createdNotice = { ...wrongCreatedAtArtifact.createdNotice, createdAtISO: '2026-08-11T06:02:00.000Z' };
wrongCreatedAtPacket.notice = currentControl<NoticePacketState>({ kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1, artifacts: [wrongCreatedAtArtifact] }, 'wrong-created-at');
equal(finalPacketProjection(wrongCreatedAtPacket).state, 'Cannot continue', 'artifact bound to wrong CreatedNotice createdAtISO fails closed');

const malformedShaPacket = resolvedPacketComposition(served);
const malformedShaArtifact = packetArtifact(served, 'EXHIBIT_2_NOTICE', 'bad-sha', 'd');
malformedShaArtifact.sha256 = 'ABC123';
malformedShaPacket.notice = currentControl<NoticePacketState>({ kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1, artifacts: [malformedShaArtifact] }, 'bad-sha');
equal(finalPacketProjection(malformedShaPacket).state, 'Cannot continue', 'malformed artifact sha256 fails closed');

const zeroLengthPacket = resolvedPacketComposition(served);
const zeroLengthArtifact = packetArtifact(served, 'EXHIBIT_2_NOTICE', 'zero-length', 'd');
zeroLengthArtifact.byteLength = 0;
zeroLengthPacket.notice = currentControl<NoticePacketState>({ kind: 'EXHIBIT_2_ATTACHED', requiredNoticeCount: 1, artifacts: [zeroLengthArtifact] }, 'zero-length');
equal(finalPacketProjection(zeroLengthPacket).state, 'Cannot continue', 'zero artifact byteLength fails closed');

const wrongRolePacket = resolvedPacketComposition(served);
wrongRolePacket.notice = currentControl<NoticePacketState>({
  kind: 'EXHIBIT_2_ATTACHED',
  requiredNoticeCount: 1,
  artifacts: [packetArtifact(served, 'EXHIBIT_1_AGREEMENT', 'wrong-role', 'd')],
}, 'wrong-role');
equal(finalPacketProjection(wrongRolePacket).state, 'Cannot continue', 'wrong packet artifact role fails closed');

const exhibit1Packet = resolvedPacketComposition(served);
exhibit1Packet.agreement = currentControl<AgreementPacketState>({
  kind: 'EXHIBIT_1_ATTACHED',
  artifacts: [packetArtifact(served, 'EXHIBIT_1_AGREEMENT', 'synthetic-agreement-1', '1')],
}, 'exhibit-1-attached');
equal(finalPacketProjection(exhibit1Packet).state, 'Ready for packet review', 'exact Exhibit 1 attachment can satisfy agreement packet state');

for (const kind of ['NOT_ATTACHED_LANDLORD_LACKS_POSSESSION', 'NOT_ATTACHED_SOLELY_NONPAYMENT'] as const) {
  const packet = resolvedPacketComposition(served);
  packet.agreement = currentControl<AgreementPacketState>({ kind }, `agreement-${kind}`);
  equal(finalPacketProjection(packet).state, 'Ready for packet review', `${kind} resolves agreement packet without fabricated artifact`);
}

const freeFormAgreementPacket = resolvedPacketComposition(served);
freeFormAgreementPacket.agreement = currentControl(
  { kind: 'NOT_ATTACHED_OTHER_REASON', reason: 'Synthetic free-form reason' } as unknown as AgreementPacketState,
  'free-form-agreement',
);
equal(finalPacketProjection(freeFormAgreementPacket).state, 'Cannot continue', 'unrecognized/free-form agreement nonattachment reason is rejected');

const noAgreementMissingDependency = resolvedPacketComposition(served);
noAgreementMissingDependency.agreement = currentControl<AgreementPacketState>({ kind: 'NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT' }, 'not-applicable-missing-dep');
equal(finalPacketProjection(noAgreementMissingDependency).state, 'Cannot continue', 'agreement nonapplicability cannot be inferred without lease-applicability dependency');
const noAgreementExactDependency = resolvedPacketComposition(served);
noAgreementExactDependency.agreement = currentControl<AgreementPacketState>(
  { kind: 'NOT_APPLICABLE_ORAL_OR_NO_AGREEMENT' },
  'not-applicable-exact-dep',
  [CANONICAL_FILING_FACT_REFS.leaseApplicabilityControl],
);
equal(finalPacketProjection(noAgreementExactDependency).state, 'Ready for packet review', 'agreement nonapplicability passes with exact lease-applicability dependency');

equal(finalPacketProjection(resolvedPacketComposition(served)).state, 'Ready for packet review', 'one required exact Notice artifact passes');
const twoNoticePacket = resolvedPacketComposition(served);
twoNoticePacket.notice = currentControl<NoticePacketState>({
  kind: 'EXHIBIT_2_ATTACHED',
  requiredNoticeCount: 2,
  artifacts: [
    packetArtifact(served, 'EXHIBIT_2_NOTICE', 'synthetic-notice-a', '2'),
    packetArtifact(served, 'EXHIBIT_2_NOTICE', 'synthetic-notice-b', '3'),
  ],
}, 'notice-two-complete');
equal(finalPacketProjection(twoNoticePacket).state, 'Ready for packet review', 'two required distinct exact Notice artifacts pass');
const incompleteCountPacket = resolvedPacketComposition(served);
incompleteCountPacket.notice = currentControl<NoticePacketState>({
  kind: 'EXHIBIT_2_ATTACHED',
  requiredNoticeCount: 2,
  artifacts: [packetArtifact(served, 'EXHIBIT_2_NOTICE', 'only-one-notice', '2')],
}, 'notice-two-incomplete');
equal(finalPacketProjection(incompleteCountPacket).state, 'Cannot continue', 'required notice count two with one binding fails closed');
const duplicateNoticePacket = resolvedPacketComposition(served);
const duplicateNoticeArtifact = packetArtifact(served, 'EXHIBIT_2_NOTICE', 'duplicate-notice', '4');
duplicateNoticePacket.notice = currentControl<NoticePacketState>({
  kind: 'EXHIBIT_2_ATTACHED',
  requiredNoticeCount: 2,
  artifacts: [duplicateNoticeArtifact, { ...duplicateNoticeArtifact }],
}, 'notice-duplicate');
equal(finalPacketProjection(duplicateNoticePacket).state, 'Cannot continue', 'duplicate Notice artifact identity cannot satisfy count two');

const exhibit3Packet = resolvedPacketComposition(served);
exhibit3Packet.proofOfService = currentControl<ProofOfServicePacketState>({
  kind: 'EXHIBIT_3_ATTACHED',
  artifact: packetArtifact(served, 'EXHIBIT_3_PROOF_OF_SERVICE', 'synthetic-proof-1', '5'),
}, 'proof-attached');
equal(finalPacketProjection(exhibit3Packet).state, 'Ready for packet review', 'exact Exhibit 3 attachment passes packet composition');
equal(finalPacketProjection(resolvedPacketComposition(served)).state, 'Ready for packet review', 'proof NOT_ATTACHED may pass evidence availability while existing service controls remain independently satisfied');
const unresolvedProofPacket = resolvedPacketComposition(served);
unresolvedProofPacket.proofOfService = currentControl<ProofOfServicePacketState>({ kind: 'UNRESOLVED' }, 'proof-unresolved');
equal(finalPacketProjection(unresolvedProofPacket).state, 'Needs information', 'unresolved proof-of-service packet state blocks Ready');

const unsupported10cPacket = resolvedPacketComposition(served);
unsupported10cPacket.attachment10c = currentControl<Attachment10cPacketState>({ kind: 'REQUIRED_BUT_UNSUPPORTED' }, '10c-required-unsupported');
equal(finalPacketProjection(unsupported10cPacket).state, 'Cannot continue', 'required-but-unsupported 10c fails closed');
const unresolved10cPacket = resolvedPacketComposition(served);
unresolved10cPacket.attachment10c = currentControl<Attachment10cPacketState>({ kind: 'UNRESOLVED' }, '10c-unresolved');
equal(finalPacketProjection(unresolved10cPacket).state, 'Needs information', 'unresolved 10c blocks Ready without fabrication');

const preSeamInvalidPacket = resolvedPacketComposition(served);
preSeamInvalidPacket.attachment10c = currentControl<Attachment10cPacketState>({ kind: 'REQUIRED_BUT_UNSUPPORTED' }, 'pre-seam-unsupported');
const preSeamProjection = deriveFilingReadiness({
  data: served,
  noticePageIndex: 4,
  outcome: absent,
  packetComposition: preSeamInvalidPacket,
});
equal(preSeamProjection.state, 'Not yet applicable', 'packet composition cannot outrank missing post-service outcome');
equal(preSeamProjection.checklist.find(item => item.key === 'PACKET_COMPOSITION')?.status, 'Not yet applicable', 'packet composition is explicitly not yet applicable before final seam');

equal(finalPacketProjection(resolvedPacketComposition(served)).state, 'Ready for packet review', 'fully resolved packet composition plus existing Stage C prerequisites reaches exact Ready for packet review');

const source = readFileSync('lib/flow/filingReadiness.ts', 'utf8');
ok(!source.includes('localStorage') && !source.includes('setItem('), 'pure Stage C projection performs no storage writes');
ok(!source.includes('saveDraft(') && !source.includes('saveOutcomeHistory('), 'Stage C projection cannot persist readiness');
ok(!source.toLowerCase().includes('supabase'), 'Stage C adds no database/Supabase dependency');
ok(source.includes('detectJurisdiction('), 'Stage C reuses the existing jurisdiction detector rather than creating a new rule');
ok(source.includes('supersedeNeedsConfirmation('), 'Stage C reuses existing NEEDS_CONFIRMATION supersession semantics');
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

const d1Source = readFileSync('lib/flow/ud100GenerationBinding.ts', 'utf8');
ok(!d1Source.includes('ud100.packet.'), 'B1 packet refs remain unreferenced by untouched D.1 generation binding');
const generatedDraftSource = readFileSync('lib/flow/ud100GeneratedDraft.ts', 'utf8');
ok(!generatedDraftSource.includes('ud100.packet.'), 'B1 packet refs remain unreferenced by untouched generated-draft implementation');

const thisTestSource = readFileSync('lib/flow/filingReadiness.test.ts', 'utf8');
ok(thisTestSource.includes('Synthetic Tenant') && thisTestSource.includes('Synthetic Owner'), 'B1 adversarial fixtures remain explicitly synthetic');
const literalArtifactIdentityPattern = /(?:['"`][0-9a-f]{64}['"`]|\bgeneratedDocumentId\s*[:=]\s*['"`][^'"`\r\n]+['"`])/;
ok(!literalArtifactIdentityPattern.test(thisTestSource), 'B1 adversarial fixtures contain no literal retained-artifact identity');

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
  hardBlockProjection,
  missingResolverProjection,
  staleResolverProjection,
  clearingResolverProjection,
  blockedInvalid,
  finalPacketProjection(),
  finalPacketProjection(resolvedPacketComposition(served)),
];
ok(sampled.every(result => allowedStates.has(result.state)), 'Stage C aggregate state vocabulary is closed to the five Product states');
ok(sampled.every(result => result.checklist.length === 7), 'Stage C always presents the seven-category checklist including packet composition');

console.log(`${passed} Stage C Filing Readiness assertions passed`);