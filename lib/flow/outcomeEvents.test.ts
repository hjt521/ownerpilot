import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData, type ServiceAttempt } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import {
  RESOLVE_OUTCOME_DEFINITIONS,
  appendResolveHistoryRecord,
  classifyFullPaymentAmount,
  confirmOutcomeCandidate,
  createRecordedInErrorCorrection,
  deriveCurrentResolveOutcome,
  deriveExactNoticeDemand,
  deriveResolveOperationalStatus,
  deriveResolveRecordContext,
  deriveServiceGeneration,
  describeOutcomeCandidate,
  nextTaskForOutcome,
  outcomeConfirmationGeneration,
  reduceEffectiveOutcomeHistory,
  validateOutcomeCandidate,
  validateOutcomeConfirmation,
  type ResolveHistoryRecord,
  type ResolveOutcomeCandidate,
  type ResolveOutcomeEvent,
} from './outcomeEvents';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function throws(fn: () => unknown, pattern: RegExp, message: string) {
  assert.throws(fn, pattern, message);
  passed += 1;
}

const authorizedIds = [
  'FULL_PAYMENT_REPORTED',
  'PAYMENT_STATUS_REQUIRES_REVIEW',
  'NO_RESOLUTION_REPORTED',
  'OWNER_WITHDREW_NOTICE_PATH',
  'POSSESSION_CHANGE_REPORTED',
  'SERVICE_OR_OUTCOME_REVIEW',
];
assert.deepEqual(RESOLVE_OUTCOME_DEFINITIONS.map((item) => item.id), authorizedIds);
passed += 1;
equal(RESOLVE_OUTCOME_DEFINITIONS.length, 6, 'exactly six authorized factual outcomes exist');
ok(authorizedIds.includes('NO_RESOLUTION_REPORTED'), 'NO_RESOLUTION_REPORTED exists');
ok(!RESOLVE_OUTCOME_DEFINITIONS.some((item) => /ATTORNEY|COUNSEL/i.test(`${item.id} ${item.label}`)), 'no attorney or counsel category exists');

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Exact Ave, Los Angeles, CA 90001',
  propertyUnit: '4',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Exact Tenant'],
  rentPeriods: [
    { periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 1000 },
    { periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 1500 },
  ],
  landlordIdentity: { type: 'individual', names: ['Exact Owner'] },
  landlordIdentityConfirmed: true,
  landlordContact: { phone: '2135551212', streetAddress: '100 Exact Ave, Los Angeles, CA 90001' },
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  signerName: 'Exact Owner',
  signerCapacity: 'owner',
  serviceDate: '2026-08-12',
};
const approved: NoticeFlowData = { ...base, ...bindReviewApproval(base, '2026-08-11T06:00:00.000Z') };
const createdAtISO = '2026-08-11T06:01:00.000Z';
const productionSnapshot = { ...captureProductionSnapshot(approved), producedAtISO: createdAtISO };
const createdNoticeArtifact = captureCreatedNoticeArtifact(approved, createdAtISO, {
  compliancePeriodStartDate: '2026-08-13',
  compliancePeriodEndDate: '2026-08-17',
});
const created: NoticeFlowData = { ...approved, productionSnapshot, createdNoticeArtifact };

const successful: ServiceAttempt = {
  id: 'success-1',
  attemptDate: '2026-08-14',
  method: 'personal',
  outcome: 'SUCCESS',
  server: { name: 'Server One', address: '200 Server St', age18Plus: true, partyToNotice: false },
};
const served: NoticeFlowData = { ...created, serviceAttempts: [successful], successfulServiceAttemptId: 'success-1' };
const context = deriveResolveRecordContext(served);
ok(context !== null, 'exact successful service unlocks Resolve & Record context');
if (!context) throw new Error('fixture failed');
const resolveBinding = context.binding;

equal(context.binding.noticeGeneration, createdNoticeArtifact.generation, 'binding uses exact created Notice generation');
equal(context.binding.successfulServiceAttemptId, 'success-1', 'binding uses exact successful service id');
equal(
  context.binding.serviceGeneration,
  deriveServiceGeneration({ noticeGeneration: createdNoticeArtifact.generation, successfulServiceAttemptId: 'success-1', serviceAttempts: [successful] }),
  'service generation is deterministic',
);

const exactDemand = deriveExactNoticeDemand(context.artifact);
equal(exactDemand, 2500, 'exact demanded amount sums only CreatedNoticeArtifactEnvelope.createData.rentPeriods');
const mutableRentChanged: NoticeFlowData = { ...served, rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 9999 }] };
const changedContext = deriveResolveRecordContext(mutableRentChanged);
equal(changedContext ? deriveExactNoticeDemand(changedContext.artifact) : -1, 2500, 'later mutable rent cannot change exact created-Notice demand');

equal(classifyFullPaymentAmount(2500, exactDemand), 'FULL_PAYMENT_REPORTED', 'exact amount remains full-payment classification');
equal(classifyFullPaymentAmount(2499.99, exactDemand), 'PAYMENT_STATUS_REQUIRES_REVIEW', 'lower mismatch transitions pending classification to payment review');
equal(classifyFullPaymentAmount(2500.01, exactDemand), 'PAYMENT_STATUS_REQUIRES_REVIEW', 'higher mismatch transitions pending classification to payment review');

const fullCandidate = {
  type: 'FULL_PAYMENT_REPORTED',
  payload: {
    paymentReceivedDate: '2026-08-16',
    amountReceived: 2500,
    acceptedConfirmed: true,
    fullExactNoticeDemandConfirmed: true,
    receivedFrom: 'Tenant',
    note: 'Owner reports full exact demand received.',
  },
} satisfies ResolveOutcomeCandidate;
validateOutcomeCandidate(fullCandidate, exactDemand);
passed += 1;
throws(
  () => validateOutcomeCandidate({ ...fullCandidate, payload: { ...fullCandidate.payload, amountReceived: 2499 } }, exactDemand),
  /exactly match/,
  'FULL_PAYMENT_REPORTED cannot validate when actual amount differs from exact created demand',
);
throws(
  () => confirmOutcomeCandidate(context.binding, fullCandidate, '2026-08-16T18:00:00.000Z', { factualReportConfirmed: false }, exactDemand),
  /Review & Confirm/,
  'Review & Confirm is required before outcome confirmation',
);

const fullConfirmation = confirmOutcomeCandidate(
  context.binding,
  fullCandidate,
  '2026-08-16T18:00:00.000Z',
  { factualReportConfirmed: true },
  exactDemand,
);
equal(fullConfirmation.generation, outcomeConfirmationGeneration(context.binding, fullCandidate), 'confirmation uses separate resolve-confirm generation');
ok(!fullConfirmation.generation.includes('reviewApprovalGeneration'), 'outcome confirmation does not reuse Notice review approval generation');

const editedFullCandidate = { ...fullCandidate, payload: { ...fullCandidate.payload, receivedFrom: 'Different payer' } } satisfies ResolveOutcomeCandidate;
assert.notEqual(
  outcomeConfirmationGeneration(context.binding, fullCandidate),
  outcomeConfirmationGeneration(context.binding, editedFullCandidate),
  'material payload edit changes confirmation generation',
);
passed += 1;
throws(
  () => validateOutcomeConfirmation(context.binding, editedFullCandidate, fullConfirmation, exactDemand),
  /stale/,
  'stale confirmation cannot authorize edited event B',
);

const reviewCandidates: ResolveOutcomeCandidate[] = [
  {
    type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
    payload: { subtype: 'PARTIAL_PAYMENT_RECEIVED', eventDate: '2026-08-16', amount: 1200, accepted: 'YES', receivedOrOfferedBy: 'Tenant' },
  },
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-16' } },
  { type: 'POSSESSION_CHANGE_REPORTED', payload: { reportedOrObservedDate: '2026-08-16', observations: ['Unit appears empty', 'Mailbox observed empty'], keysReturned: 'NOT_SURE', physicalPossession: 'NO' } },
  { type: 'SERVICE_OR_OUTCOME_REVIEW', payload: { reviewReason: 'Service record discrepancy', factualNote: 'Owner noticed the recorded address needs factual review.', dateNoticed: '2026-08-16' } },
];
for (const candidate of reviewCandidates) {
  validateOutcomeCandidate(candidate, exactDemand);
  passed += 1;
}
throws(
  () => validateOutcomeCandidate({ type: 'PAYMENT_STATUS_REQUIRES_REVIEW', payload: { subtype: 'OTHER_OR_NOT_SURE', eventDate: '2026-08-16', accepted: 'NOT_SURE' } }, exactDemand),
  /note is required/,
  'Other/not sure payment review requires factual note',
);
throws(
  () => validateOutcomeCandidate({ type: 'POSSESSION_CHANGE_REPORTED', payload: { reportedOrObservedDate: '2026-08-16', observations: [], keysReturned: 'NO', physicalPossession: 'NO' } }, exactDemand),
  /observation/,
  'possession branch requires one or more factual observations',
);
throws(
  () => validateOutcomeCandidate({ type: 'SERVICE_OR_OUTCOME_REVIEW', payload: { reviewReason: '', factualNote: '' } }, exactDemand),
  /reason/,
  'service/outcome review requires reason and factual note',
);

const withdrawalCandidate = {
  type: 'OWNER_WITHDREW_NOTICE_PATH',
  payload: { decisionDate: '2026-08-16', note: 'Owner chose to stop this current path.', withdrawalConfirmed: true },
} satisfies ResolveOutcomeCandidate;
validateOutcomeCandidate(withdrawalCandidate, exactDemand);
passed += 1;
throws(
  () => confirmOutcomeCandidate(context.binding, withdrawalCandidate, '2026-08-16T18:01:00.000Z', { factualReportConfirmed: true }, exactDemand),
  /additional path-stop confirmation/,
  'withdrawal requires second Review & Confirm checkbox',
);
const withdrawalConfirmation = confirmOutcomeCandidate(
  context.binding,
  withdrawalCandidate,
  '2026-08-16T18:01:00.000Z',
  { factualReportConfirmed: true, withdrawalPathStopConfirmed: true },
  exactDemand,
);
equal(withdrawalConfirmation.withdrawalPathStopConfirmed, true, 'withdrawal second confirmation is bound');

function confirmedEvent(id: string, candidate: ResolveOutcomeCandidate, at: string): ResolveOutcomeEvent {
  const confirmation = confirmOutcomeCandidate(
    resolveBinding,
    candidate,
    at,
    {
      factualReportConfirmed: true,
      withdrawalPathStopConfirmed: candidate.type === 'OWNER_WITHDREW_NOTICE_PATH' ? true : undefined,
    },
    exactDemand,
  );
  return { ...candidate, recordKind: 'OUTCOME', id, recordedAtISO: at, confirmation } as ResolveOutcomeEvent;
}

const fullEvent = confirmedEvent('event-1', fullCandidate, '2026-08-16T18:02:00.000Z');
let history: ResolveHistoryRecord[] = appendResolveHistoryRecord([], fullEvent, context.binding, exactDemand);
equal(history.length, 1, 'confirmed outcome appends without mutating prior history');
equal(deriveResolveOperationalStatus(history, context.binding, exactDemand), 'RESOLUTION REPORTED', 'full payment maps to operational resolution status');
equal(nextTaskForOutcome(deriveCurrentResolveOutcome(history, context.binding, exactDemand), '2026-08-17'), 'Review the recorded outcome', 'full payment gets exact Next Task');

const replacementCandidate = {
  type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
  payload: { subtype: 'PARTIAL_PAYMENT_RECEIVED', eventDate: '2026-08-16', amount: 1200, accepted: 'YES', note: 'Corrected factual classification.' },
  correctionOfEventId: 'event-1',
} satisfies ResolveOutcomeCandidate;
const replacement = confirmedEvent('event-2', replacementCandidate, '2026-08-16T18:03:00.000Z');
const beforeReplacement = history;
history = appendResolveHistoryRecord(history, replacement, context.binding, exactDemand);
equal(beforeReplacement.length, 1, 'replacement correction does not rewrite original array');
equal(history.length, 2, 'replacement correction is appended');
equal(reduceEffectiveOutcomeHistory(history, context.binding, exactDemand).length, 1, 'replacement reduces to one effective confirmed outcome');
equal(deriveCurrentResolveOutcome(history, context.binding, exactDemand)?.id, 'event-2', 'replacement payload/classification becomes current effective record');
equal(deriveResolveOperationalStatus(history, context.binding, exactDemand), 'PAYMENT STATUS REQUIRES REVIEW', 'replacement drives deterministic operational status');
equal(nextTaskForOutcome(deriveCurrentResolveOutcome(history, context.binding, exactDemand), '2026-08-17'), 'Review payment status before another Notice-related step', 'payment review gets exact Next Task');

const errorCorrection = createRecordedInErrorCorrection({
  id: 'event-error-3',
  targetEventId: 'event-2',
  recordedAtISO: '2026-08-16T18:04:00.000Z',
  confirmedAtISO: '2026-08-16T18:04:00.000Z',
  binding: context.binding,
  recordedInErrorConfirmed: true,
});
const beforeError = history;
history = appendResolveHistoryRecord(history, errorCorrection, context.binding, exactDemand);
equal(beforeError.length, 2, 'recorded-in-error correction preserves raw history');
equal(history.length, 3, 'recorded-in-error correction appends a third raw record');
equal(reduceEffectiveOutcomeHistory(history, context.binding, exactDemand).length, 1, 'recorded-in-error restores the superseded predecessor to the effective view');
equal(deriveCurrentResolveOutcome(history, context.binding, exactDemand)?.id, 'event-1', 'recorded-in-error replacement restores its predecessor as current');
equal(deriveResolveOperationalStatus(history, context.binding, exactDemand), 'RESOLUTION REPORTED', 'restored predecessor again drives deterministic operational status');

const thirdReplacementCandidate = {
  type: 'NO_RESOLUTION_REPORTED',
  payload: { asOfDate: '2026-08-16', note: 'Later correction in the same immutable chain.' },
  correctionOfEventId: 'event-2',
} satisfies ResolveOutcomeCandidate;
const thirdReplacement = confirmedEvent(
  'event-3',
  thirdReplacementCandidate,
  '2026-08-16T18:03:30.000Z',
);

let correctionChain: ResolveHistoryRecord[] = appendResolveHistoryRecord(
  [],
  fullEvent,
  context.binding,
  exactDemand,
);
correctionChain = appendResolveHistoryRecord(
  correctionChain,
  replacement,
  context.binding,
  exactDemand,
);
correctionChain = appendResolveHistoryRecord(
  correctionChain,
  thirdReplacement,
  context.binding,
  exactDemand,
);

equal(
  deriveCurrentResolveOutcome(correctionChain, context.binding, exactDemand)?.id,
  'event-3',
  'latest valid replacement is effective before any recorded-in-error correction',
);

const thirdReplacementError = createRecordedInErrorCorrection({
  id: 'event-error-4',
  targetEventId: 'event-3',
  recordedAtISO: '2026-08-16T18:04:30.000Z',
  confirmedAtISO: '2026-08-16T18:04:30.000Z',
  binding: context.binding,
  recordedInErrorConfirmed: true,
});
correctionChain = appendResolveHistoryRecord(
  correctionChain,
  thirdReplacementError,
  context.binding,
  exactDemand,
);

equal(correctionChain.length, 4, 'recorded-in-error preserves all raw correction-chain history');
equal(
  reduceEffectiveOutcomeHistory(correctionChain, context.binding, exactDemand).length,
  1,
  'recording event-3 in error leaves one restored effective predecessor',
);
equal(
  deriveCurrentResolveOutcome(correctionChain, context.binding, exactDemand)?.id,
  'event-2',
  'recording event-3 in error restores event-2',
);

const secondReplacementError = createRecordedInErrorCorrection({
  id: 'event-error-5',
  targetEventId: 'event-2',
  recordedAtISO: '2026-08-16T18:05:00.000Z',
  confirmedAtISO: '2026-08-16T18:05:00.000Z',
  binding: context.binding,
  recordedInErrorConfirmed: true,
});
correctionChain = appendResolveHistoryRecord(
  correctionChain,
  secondReplacementError,
  context.binding,
  exactDemand,
);

equal(correctionChain.length, 5, 'second recorded-in-error correction also remains append-only');
equal(
  reduceEffectiveOutcomeHistory(correctionChain, context.binding, exactDemand).length,
  1,
  'second correction-chain restoration still has exactly one effective outcome',
);
equal(
  deriveCurrentResolveOutcome(correctionChain, context.binding, exactDemand)?.id,
  'event-1',
  'recording restored event-2 in error restores event-1',
);

const statuses: Array<[ResolveOutcomeCandidate, string, string]> = [
  [fullCandidate, 'RESOLUTION REPORTED', 'Review the recorded outcome'],
  [reviewCandidates[0], 'PAYMENT STATUS REQUIRES REVIEW', 'Review payment status before another Notice-related step'],
  [{ type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-16' } }, 'NO RESOLUTION REPORTED', 'Continue monitoring'],
  [withdrawalCandidate, 'CURRENT NOTICE PATH WITHDRAWN', 'No further task on this Notice path'],
  [reviewCandidates[2], 'POSSESSION CHANGE REPORTED', 'Review the possession-change record'],
  [reviewCandidates[3], 'SERVICE / OUTCOME ISSUE REQUIRES REVIEW', 'Review the service / outcome facts'],
];
for (let i = 0; i < statuses.length; i += 1) {
  const [candidate, status, task] = statuses[i];
  const event = confirmedEvent(`status-${i}`, candidate, `2026-08-16T19:0${i}:00.000Z`);
  const single = appendResolveHistoryRecord([], event, context.binding, exactDemand);
  equal(deriveResolveOperationalStatus(single, context.binding, exactDemand), status, `status ${status} derives deterministically`);
  equal(nextTaskForOutcome(event, '2026-08-17'), task, `status ${status} gets exact representational Next Task`);
}
const noResolutionAtThreshold = confirmedEvent(
  'threshold',
  { type: 'NO_RESOLUTION_REPORTED', payload: { asOfDate: '2026-08-17' } },
  '2026-08-17T19:10:00.000Z',
);
equal(nextTaskForOutcome(noResolutionAtThreshold, '2026-08-17'), 'Review available next options', 'no resolution at existing threshold changes only representational Next Task');

const fullReviewLines = describeOutcomeCandidate(fullCandidate, exactDemand).join('\n');
ok(fullReviewLines.includes('Amount shown on this Notice: $2500.00'), 'Review surface can show exact created-Notice demand');
ok(fullReviewLines.includes('Payment received: $2500.00 on 2026-08-16'), 'Review surface includes material full-payment facts');
for (const candidate of [...reviewCandidates, withdrawalCandidate]) {
  ok(describeOutcomeCandidate(candidate, exactDemand).length >= 1, `plain-English review material exists for ${candidate.type}`);
}

const componentSource = readFileSync('components/resolve-record.tsx', 'utf8');
const outcomeSource = readFileSync('lib/flow/outcomeEvents.ts', 'utf8');
const noticeFlowSource = readFileSync('components/notice-flow.tsx', 'utf8');
const routeSource = readFileSync('app/notice/3-day/resolve/page.tsx', 'utf8');
ok(componentSource.includes('Choose what happened'), 'UI starts with Choose what happened');
ok(componentSource.includes('Enter facts'), 'UI includes Enter facts stage');
ok(componentSource.includes("Review what you\\'re recording"), 'UI includes Review what you are recording stage');
ok(componentSource.includes('I confirm this accurately describes the facts I am reporting happened after service for this Notice.'), 'UI includes exact factual Review & Confirm copy');
ok(componentSource.includes('I confirm I am choosing to stop this current Notice path in OwnerPilot.'), 'UI includes exact withdrawal Review & Confirm copy');
ok(componentSource.includes('Record outcome'), 'UI records only after review confirmation');
ok(componentSource.includes('Amount shown on this Notice'), 'UI shows exact-demand boundary');
ok(componentSource.includes('Amount received is required.'), 'blank full-payment amount remains incomplete facts rather than payment-review mismatch');
ok(componentSource.includes('Full payment cannot be confirmed'), 'amount mismatch visibly transitions pending UI instead of saving full payment');
ok(!componentSource.includes('CONNECTED: NO · INVOKED: NO · EXECUTION AUTHORITY: NONE'), 'customer UI hides execution-governance mechanics');
ok(componentSource.includes('What to do next'), 'owner-centered summary shows the next task near the top');
ok(componentSource.includes('Payment needs review'), 'customer-readable status labels are present');
ok(componentSource.includes('Saved on this browser.'), 'browser-local provenance remains visible and secondary');
ok(componentSource.includes('Tenant said they moved out'), 'possession capture uses structured factual choices');
ok(noticeFlowSource.includes('href="/notice/3-day/resolve"'), 'successful ServiceStep contains the single bounded Resolve handoff');
equal((noticeFlowSource.match(/href=\"\/notice\/3-day\/resolve\"/g) ?? []).length, 1, 'ServiceStep contains exactly one Resolve CTA');
ok(routeSource.includes("import { ResolveRecord } from '@/components/resolve-record'"), 'Resolve route remains present');

const combined = `${componentSource}\n${outcomeSource}`.toLowerCase();
for (const forbidden of ['attorney referral', 'attorney status', 'counsel matching', 'outside-counsel', '/route-to-counsel', 'counsel_route', 'riskpath_records', 'supabase', 'phase c', 'pdi']) {
  equal(combined.includes(forbidden), false, `Resolve v1A does not contain unauthorized ${forbidden}`);
}
for (const forbiddenClaim of ['payment legally cures', 'service is legally sufficient', 'possession legally surrendered', 'waiver confirmed']) {
  equal(combined.includes(forbiddenClaim), false, `Resolve v1A makes no legal-effect claim: ${forbiddenClaim}`);
}

console.log(`${passed} Resolve & Record conformance assertions passed`);
