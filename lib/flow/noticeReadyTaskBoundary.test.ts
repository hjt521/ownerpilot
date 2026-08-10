import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createFlowState, type ServiceAttempt } from './noticeFlowState';
import {
  captureProductionSnapshot,
  evaluateStaleness,
  getSuccessfulAttempt,
} from './escalation';

let passed = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}

const noticeFlow = readFileSync('components/notice-flow.tsx', 'utf8');
const noticeSummary = readFileSync('components/notice-summary-panel.tsx', 'utf8');
const serveTrack = readFileSync('components/serve-track.tsx', 'utf8');
const lockedPlannedDateCopy = readFileSync('lib/flow/intendedServiceDateCopy.ts', 'utf8');

ok(noticeFlow.includes('Planned service date'), 'pre-production field is labeled planned');
ok(
  noticeFlow.includes('It does not record service.'),
  'planned-date helper explicitly says it does not record service',
);
ok(
  noticeFlow.includes('If the plan changes before service, update the planned service'),
  'planned-date preview only instructs pre-service plan updates',
);
ok(
  noticeFlow.includes('After service occurs, record the actual service event in Serve &amp; Track.'),
  'planned-date preview sends later actual service to Serve & Track without mismatch adjudication',
);
ok(
  !noticeFlow.includes('If the notice is served on a different date'),
  'planned-date preview does not decide a post-service date mismatch',
);
ok(
  !noticeFlow.includes('regenerate it before recording what actually happened'),
  'unauthorized regenerate-before-recording instruction is absent',
);
ok(
  noticeSummary.includes('k="Planned Service Date"'),
  'notice summary labels the same pre-production value as planned service',
);
ok(
  !noticeSummary.includes('k="Intended Service Date"'),
  'notice summary no longer uses the old intended-service field label',
);
ok(
  noticeFlow.includes('Your 3-Day Notice is ready'),
  'successful production has a standalone Notice Ready heading',
);
ok(noticeFlow.includes('PREPARED · NOT SERVED'), 'Notice Ready is explicitly not served');
ok(
  noticeFlow.includes('data-testid="notice-ready-state"'),
  'Notice Ready has a stable component-test boundary',
);
ok(
  noticeFlow.includes('data-testid="record-service-later-task"'),
  'service is presented as a separate later task',
);
ok(
  noticeFlow.includes('href="/notice/3-day/serve"'),
  'later service task uses the existing service route',
);
ok(
  noticeFlow.includes('const noticePrepared = !!data.productionSnapshot && !evaluateStaleness(data).reason;'),
  'Notice Ready derives from successful production and existing staleness logic',
);
ok(
  !noticeFlow.includes('served && `Served ${served}`'),
  'planned service date is not rendered as completed service in review',
);
ok(
  noticeFlow.includes('Planned service ${plannedService}'),
  'review summary labels the pre-production date as planned service',
);
ok(
  serveTrack.includes('result.canProduce && !!data.productionSnapshot'),
  'separate service task requires an actually prepared notice',
);
ok(
  serveTrack.includes('record the actual service'),
  'later service surface uses actual-event terminology',
);
ok(
  lockedPlannedDateCopy.includes('LOCKED wizard copy — verbatim. Do NOT edit'),
  'locked planned/intended-date broker copy remains present and protected',
);

const onProducedStart = noticeFlow.indexOf('const onProduced = () => {');
const onProducedEnd = noticeFlow.indexOf('// Slice E:', onProducedStart);
ok(onProducedStart >= 0 && onProducedEnd > onProducedStart, 'production callback is inspectable');
const onProducedBody = noticeFlow.slice(onProducedStart, onProducedEnd);
ok(onProducedBody.includes('productionSnapshot'), 'production records only the existing production snapshot');
ok(!onProducedBody.includes('serviceAttempts'), 'production callback does not create a service attempt');
ok(
  !onProducedBody.includes('successfulServiceAttemptId'),
  'production callback does not set successful service state',
);

const readyStart = noticeFlow.indexOf('function NoticeReadyState()');
const readyEnd = noticeFlow.indexOf('function ReviewStep(', readyStart);
ok(readyStart >= 0 && readyEnd > readyStart, 'Notice Ready component is inspectable');
const readyBody = noticeFlow.slice(readyStart, readyEnd);
ok(!readyBody.includes('ReServePanel'), 'service attempt form is not part of Notice Ready');
ok(!readyBody.includes('ServiceStep'), 'service UI does not visually continue under Notice Ready');
ok(!readyBody.includes('serviceAttempts'), 'Notice Ready does not mutate or expose service-attempt state');

const base = createFlowState().data;
const planned = { ...base, serviceDate: '2026-08-12' };
const produced = {
  ...planned,
  productionSnapshot: captureProductionSnapshot(planned),
};
equal((produced.serviceAttempts ?? []).length, 0, 'planned date plus production adds no service attempts');
equal(produced.successfulServiceAttemptId, undefined, 'production adds no successful service id');
equal(getSuccessfulAttempt(produced), undefined, 'planned date alone is never successful service');
equal(evaluateStaleness(produced).reason, null, 'freshly produced unchanged notice is not stale');

const failedAttempt: ServiceAttempt = {
  id: 'failed-1',
  method: 'personal',
  attemptDate: '2026-08-12',
  outcome: 'FAILED',
  server: { name: '', address: '', age18Plus: true, partyToNotice: false },
};
const failedOnly = { ...produced, serviceAttempts: [failedAttempt] };
equal(getSuccessfulAttempt(failedOnly), undefined, 'failed service attempt does not become served');
equal(
  failedOnly.successfulServiceAttemptId,
  undefined,
  'failed service attempt does not set successful service state',
);

const successfulAttempt: ServiceAttempt = {
  id: 'success-1',
  method: 'personal',
  attemptDate: '2026-08-13',
  outcome: 'SUCCESS',
  server: {
    name: 'Sample Server',
    address: '100 Test Ave, Los Angeles, CA 90001',
    age18Plus: true,
    partyToNotice: false,
  },
};
const served = {
  ...produced,
  serviceAttempts: [failedAttempt, successfulAttempt],
  successfulServiceAttemptId: successfulAttempt.id,
};
equal(getSuccessfulAttempt(served)?.id, 'success-1', 'actual successful event drives served state');

const changed = { ...produced, propertyAddress: '200 Changed Ave, Los Angeles, CA 90001' };
ok(!!evaluateStaleness(changed).reason, 'changed notice fact preserves existing staleness invalidation');

console.log(`${passed} Notice Ready task-boundary assertions passed`);
