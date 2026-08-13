import { strict as assert } from 'node:assert';
import { DRAFT_KEY, DRAFT_VERSION, type StorageLike } from './persistence';
import {
  appendResolveHistoryRecord,
  confirmOutcomeCandidate,
  createRecordedInErrorCorrection,
  type ResolveHistoryRecord,
  type ResolveOutcomeCandidate,
  type ResolveOutcomeEvent,
  type ResolveRecordBinding,
} from './outcomeEvents';
import {
  OUTCOME_KEY,
  OUTCOME_VERSION,
  restoreOutcomeHistory,
  saveOutcomeHistory,
} from './outcomePersistence';

let passed = 0;
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
  removeItem(key: string) { this.map.delete(key); }
}

const binding: ResolveRecordBinding = {
  noticeGeneration: 'notice-generation-a',
  successfulServiceAttemptId: 'success-a',
  serviceGeneration: 'service-v1:{"fixture":"a"}',
};
const exactDemand = 2500;
const fullCandidate = {
  type: 'FULL_PAYMENT_REPORTED',
  payload: {
    paymentReceivedDate: '2026-08-16',
    amountReceived: 2500,
    acceptedConfirmed: true,
    fullExactNoticeDemandConfirmed: true,
  },
} satisfies ResolveOutcomeCandidate;
const fullConfirmation = confirmOutcomeCandidate(
  binding,
  fullCandidate,
  '2026-08-16T18:00:00.000Z',
  { factualReportConfirmed: true },
  exactDemand,
);
const first: ResolveOutcomeEvent = {
  ...fullCandidate,
  recordKind: 'OUTCOME',
  id: 'event-1',
  recordedAtISO: '2026-08-16T18:00:00.000Z',
  confirmation: fullConfirmation,
};
const reviewCandidate = {
  type: 'PAYMENT_STATUS_REQUIRES_REVIEW',
  payload: {
    subtype: 'PARTIAL_PAYMENT_RECEIVED',
    eventDate: '2026-08-16',
    amount: 1200,
    accepted: 'YES',
  },
  correctionOfEventId: 'event-1',
} satisfies ResolveOutcomeCandidate;
const reviewConfirmation = confirmOutcomeCandidate(
  binding,
  reviewCandidate,
  '2026-08-16T18:05:00.000Z',
  { factualReportConfirmed: true },
  exactDemand,
);
const replacement: ResolveOutcomeEvent = {
  ...reviewCandidate,
  recordKind: 'OUTCOME',
  id: 'event-2',
  recordedAtISO: '2026-08-16T18:05:00.000Z',
  confirmation: reviewConfirmation,
};
let validHistory: ResolveHistoryRecord[] = appendResolveHistoryRecord([], first, binding, exactDemand);
validHistory = appendResolveHistoryRecord(validHistory, replacement, binding, exactDemand);
const recordedInError = createRecordedInErrorCorrection({
  id: 'event-error-3',
  targetEventId: 'event-2',
  recordedAtISO: '2026-08-16T18:06:00.000Z',
  confirmedAtISO: '2026-08-16T18:06:00.000Z',
  binding,
  recordedInErrorConfirmed: true,
});
validHistory = appendResolveHistoryRecord(validHistory, recordedInError, binding, exactDemand);

assert.notEqual(OUTCOME_KEY, DRAFT_KEY, 'Resolve & Record uses a separate browser-local persistence domain');
passed += 1;
equal(OUTCOME_KEY, 'op.resolveRecord.v1', 'accepted outcome key remains unchanged');
equal(DRAFT_VERSION, 4, 'Notice draft version remains unchanged');
equal(OUTCOME_VERSION, 1, 'outcome envelope remains its separate v1');

const emptyStorage = new MemoryStorage();
equal(restoreOutcomeHistory(binding, exactDemand, emptyStorage).status, 'absent', 'no stored outcome history is an ordinary empty state');

const storage = new MemoryStorage();
equal(saveOutcomeHistory(binding, validHistory, exactDemand, storage), true, 'valid confirmed typed history saves');
const restored = restoreOutcomeHistory(binding, exactDemand, storage);
equal(restored.status, 'ready', 'matching exact Notice/service binding restores history');
if (restored.status === 'ready') {
  equal(restored.envelope.binding.noticeGeneration, binding.noticeGeneration, 'notice generation round-trips');
  equal(restored.envelope.binding.successfulServiceAttemptId, binding.successfulServiceAttemptId, 'successful service id round-trips');
  equal(restored.envelope.binding.serviceGeneration, binding.serviceGeneration, 'service generation round-trips');
  equal(restored.envelope.events.length, 3, 'append-only raw history round-trips');
  equal(restored.envelope.events[0].recordKind, 'OUTCOME', 'confirmed outcome round-trips');
  equal(restored.envelope.events[2].recordKind, 'RECORDED_IN_ERROR', 'recorded-in-error correction round-trips');
}

for (const changed of [
  { ...binding, noticeGeneration: 'different-notice' },
  { ...binding, successfulServiceAttemptId: 'different-success' },
  { ...binding, serviceGeneration: 'service-v1:{"fixture":"different"}' },
]) {
  const mismatch = restoreOutcomeHistory(changed, exactDemand, storage);
  equal(mismatch.status, 'blocked', 'any exact binding drift blocks restore');
  if (mismatch.status === 'blocked') equal(mismatch.reason, 'binding_mismatch', 'binding drift is explicit');
}

const malformed = new MemoryStorage();
malformed.setItem(OUTCOME_KEY, '{not-json');
const malformedResult = restoreOutcomeHistory(binding, exactDemand, malformed);
equal(malformedResult.status, 'blocked', 'malformed stored history fails closed');
if (malformedResult.status === 'blocked') equal(malformedResult.reason, 'invalid', 'malformed history reports invalid');

const wrongVersion = new MemoryStorage();
wrongVersion.setItem(OUTCOME_KEY, JSON.stringify({ v: 99, savedAt: '2026-08-16T18:00:00.000Z', binding, events: [] }));
equal(restoreOutcomeHistory(binding, exactDemand, wrongVersion).status, 'blocked', 'unknown outcome-envelope version fails closed');

const staleConfirmation = new MemoryStorage();
staleConfirmation.setItem(OUTCOME_KEY, JSON.stringify({
  v: OUTCOME_VERSION,
  savedAt: '2026-08-16T18:00:00.000Z',
  binding,
  events: [{ ...first, payload: { ...first.payload, amountReceived: 2400 } }],
}));
equal(restoreOutcomeHistory(binding, exactDemand, staleConfirmation).status, 'blocked', 'material payload edit with old confirmation fails closed');

const wrongDemand = new MemoryStorage();
wrongDemand.setItem(OUTCOME_KEY, storage.getItem(OUTCOME_KEY) ?? '');
equal(restoreOutcomeHistory(binding, 2600, wrongDemand).status, 'blocked', 'stored full-payment event cannot restore against a different exact demand');

const badType = new MemoryStorage();
badType.setItem(OUTCOME_KEY, JSON.stringify({
  v: OUTCOME_VERSION,
  savedAt: '2026-08-16T18:00:00.000Z',
  binding,
  events: [{ ...first, type: 'ATTORNEY_REFERRAL' }],
}));
equal(restoreOutcomeHistory(binding, exactDemand, badType).status, 'blocked', 'obsolete unauthorized category fails closed');

const badCorrection = new MemoryStorage();
badCorrection.setItem(OUTCOME_KEY, JSON.stringify({
  v: OUTCOME_VERSION,
  savedAt: '2026-08-16T18:00:00.000Z',
  binding,
  events: [{ ...replacement, correctionOfEventId: 'missing-event' }],
}));
equal(restoreOutcomeHistory(binding, exactDemand, badCorrection).status, 'blocked', 'replacement without effective earlier target fails closed');

const throwingGet: StorageLike = {
  getItem() { throw new Error('blocked'); },
  setItem() {},
  removeItem() {},
};
equal(restoreOutcomeHistory(binding, exactDemand, throwingGet).status, 'blocked', 'storage read failure fails closed when history could exist');

const throwingSet: StorageLike = {
  getItem() { return null; },
  setItem() { throw new Error('quota'); },
  removeItem() {},
};
equal(saveOutcomeHistory(binding, [first], exactDemand, throwingSet), false, 'storage write failure does not pretend to record outcome');
equal(saveOutcomeHistory(binding, [first], exactDemand, null), false, 'missing browser storage cannot persist outcome');
equal(restoreOutcomeHistory(binding, exactDemand, null).status, 'absent', 'SSR/no-storage read does not invent history');

const invalidBinding = { ...binding, serviceGeneration: 'not-a-service-generation' };
equal(saveOutcomeHistory(invalidBinding, [first], exactDemand, new MemoryStorage()), false, 'invalid service binding cannot be saved');

ok(storage.getItem(DRAFT_KEY) === null, 'outcome writes never touch Notice draft key');
ok(storage.getItem(OUTCOME_KEY) !== null, 'outcome writes use only the Resolve & Record key');

console.log(`${passed} Resolve & Record persistence conformance assertions passed`);
