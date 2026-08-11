import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { createFlowState, type ServiceAttempt } from './noticeFlowState';
import {
  captureProductionSnapshot,
  evaluateStaleness,
  getSuccessfulAttempt,
} from './escalation';
import { bindReviewApproval } from './reviewApproval';

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
const packetPrint = readFileSync('components/packet-print-options.tsx', 'utf8');
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
  !noticeFlow.includes('checked={data.baseRentOnlyConfirmed === true}'),
  'Rent Owed no longer asks for the duplicate base-rent checkbox',
);
ok(
  noticeFlow.includes('Enter base rent only — not late fees, utilities, or other charges.'),
  'base-rent explanatory instruction remains visible',
);
ok(
  noticeFlow.includes('By producing this notice, I confirm: the amounts entered are base rent only'),
  'final C6 substantive testimony remains present',
);
ok(
  noticeFlow.includes('data-testid="create-notice-button"'),
  'Review exposes an explicit Create Notice boundary',
);
ok(
  noticeFlow.includes('Create Notice'),
  'Create Notice action is customer-visible',
);

ok(
  noticeFlow.includes('Your 3-Day Notice is ready'),
  'successful Create has a standalone Notice Ready heading',
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
  !noticeFlow.includes('served && `Served ${served}`'),
  'planned service date is not rendered as completed service in review',
);
ok(
  noticeFlow.includes('Planned service ${plannedService}'),
  'review summary labels the pre-production date as planned service',
);
ok(
  noticeFlow.includes('If served as planned, pay or vacate by ${deadline}'),
  'review deadline derived from the planned date is explicitly conditional',
);
ok(
  !noticeFlow.includes('deadline ? `Deadline: ${deadline}` :'),
  'review no longer presents a planned-date calculation as an unconditional Deadline',
);
ok(
  noticeSummary.includes('k="If served as planned, pay or vacate by"'),
  'sticky summary labels the planned-date deadline as conditional',
);
ok(
  !noticeSummary.includes('k="Pay or Vacate By"'),
  'sticky summary no longer presents the planned-date deadline as unconditional',
);
ok(
  noticeSummary.includes('Later: Record Service'),
  'notice-complete sticky hierarchy presents service as a later task',
);
ok(
  !noticeSummary.includes('Next: Serve &amp; Track'),
  'notice-complete sticky hierarchy does not call service the next task',
);
ok(
  noticeSummary.includes('After the notice is actually served, return to Serve &amp; Track to record'),
  'sticky task copy tells the landlord to return after actual service',
);
ok(
  serveTrack.includes('result.canProduce && !!data.productionSnapshot'),
  'separate service task retains the existing ProductionSnapshot readiness contract',
);
ok(
  serveTrack.includes('record the actual service'),
  'later service surface uses actual-event terminology',
);
ok(
  lockedPlannedDateCopy.includes('LOCKED wizard copy — verbatim. Do NOT edit'),
  'locked planned/intended-date broker copy remains present and protected',
);

const createStart = noticeFlow.indexOf('const createNotice = () => {');
const createEnd = noticeFlow.indexOf('// Slice E:', createStart);
ok(createStart >= 0 && createEnd > createStart, 'Create callback is inspectable');
const createBody = noticeFlow.slice(createStart, createEnd);
ok(createBody.includes('freezeReviewCreateInput(data)'), 'Create freezes the current create input');
ok(createBody.includes('hasCurrentReviewApproval(frozen)'), 'Create requires current C6 approval for frozen input');
ok(createBody.includes('evaluateCanProduceV4(frozen)'), 'Create performs a fresh final gate on frozen input');
ok(createBody.includes('data: frozen'), 'renderer receives the exact frozen create input');
ok(createBody.includes('captureProductionSnapshot(frozen)'), 'ProductionSnapshot is captured from the same frozen input');
ok(!createBody.includes('preparedNoticeGeneration'), 'Create does not redefine approval identity as a staleness/prepared contract');
ok(!createBody.includes('serviceAttempts'), 'Create does not create a service attempt');
ok(!createBody.includes('successfulServiceAttemptId'), 'Create does not set successful service state');

ok(
  !packetPrint.includes('onProduced: () => void'),
  'PacketPrintOptions no longer accepts a production-authority callback',
);
ok(
  !packetPrint.includes('onProduced();'),
  'print/download does not record production authority',
);
ok(
  packetPrint.includes('export function NoticePreview'),
  'informational notice preview is reusable independently of print authority',
);
ok(
  packetPrint.includes("const w = window.open('', '_blank');"),
  'browser popup remains an artifact-use concern after Create',
);

const base = createFlowState().data;
const planned: typeof base = {
  ...base,
  serviceDate: '2026-08-12',
  paymentMethods: ['by_mail'],
};
const approved = {
  ...planned,
  ...bindReviewApproval(planned, '2026-08-10T12:00:00.000Z'),
};
const produced = {
  ...approved,
  productionSnapshot: captureProductionSnapshot(approved),
};
equal((produced.serviceAttempts ?? []).length, 0, 'planned date plus Create adds no service attempts');
equal(produced.successfulServiceAttemptId, undefined, 'Create adds no successful service id');
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
equal(
  evaluateStaleness(failedOnly).reason,
  null,
  'later failed service activity preserves existing staleness semantics',
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
equal(
  evaluateStaleness(served).reason,
  null,
  'actual service state remains a later task and preserves existing staleness semantics',
);

const changedServiceDate = { ...produced, serviceDate: '2026-08-14' };
equal(
  evaluateStaleness(changedServiceDate).reason,
  null,
  'serviceDate change remains excluded from the existing ProductionSnapshot staleness contract',
);

const changed = { ...produced, propertyAddress: '200 Changed Ave, Los Angeles, CA 90001' };
ok(!!evaluateStaleness(changed).reason, 'changed snapshotted notice fact preserves existing staleness invalidation');

console.log(`${passed} Notice Ready / Create-boundary assertions passed`);
