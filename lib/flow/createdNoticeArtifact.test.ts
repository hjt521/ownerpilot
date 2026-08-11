import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import type { NoticeFlowData } from './noticeFlowState';
import { individualLandlord } from './landlord.fixture';
import { normalizeAddressKey } from './jurisdictionVerdict';
import { bindReviewApproval, freezeReviewCreateInput, hasCurrentReviewApproval, reviewApprovalGeneration } from './reviewApproval';
import { captureCreatedNoticeArtifact, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot, evaluateStaleness } from './escalation';
import { evaluateCanProduceV4 } from './gates';
import { renderNotice } from '../produce/renderNotice';
import { saveDraft, loadDraft, DRAFT_VERSION, type StorageLike } from './persistence';

let passed = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}

function validData(): NoticeFlowData {
  const data: NoticeFlowData = {
    dispute: {
      tenantFiledComplaint: 'no',
      tenantWrittenWithholding: 'no',
      tenantBankruptcy: 'no',
    },
    propertyAddress: '442 Fresno St, Fresno, CA 93701',
    propertyUnit: '2',
    propertyCity: 'Fresno',
    propertyCounty: 'Fresno',
    tenantNames: ['Jason Kim'],
    rentPeriods: [
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 },
    ],
    paymentMethods: ['by_mail'],
    landlordContact: {
      phone: '(559) 555-0142',
      streetAddress: '4336 Prospect Ave, Los Angeles, CA 90028',
    },
    paymentBranch: 'mail_only',
    signerName: 'Jack Tah',
    ...individualLandlord('owner', { names: ['Jack Tah'] }),
    serviceDate: '2026-06-02',
    serviceMethod: 'personal',
    cachedCaliforniaEligibility: {
      status: 'CONFIRMED_CALIFORNIA',
      addressKey: normalizeAddressKey('442 Fresno St, Fresno, CA 93701'),
      resolvedAt: '2026-08-10T10:00:00.000Z',
      source: 'google_places',
    },
  };
  Object.assign(data, bindReviewApproval(data, '2026-08-10T10:01:00.000Z'));
  return data;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}

function successfulCreate(input: NoticeFlowData) {
  const frozen = freezeReviewCreateInput(input);
  const gate = evaluateCanProduceV4(frozen);
  ok(gate.canProduce && !!gate.computedDates, 'successful Create fixture clears the final gate');
  const dates = {
    compliancePeriodStartDate: gate.computedDates!.commencementDate,
    compliancePeriodEndDate: gate.computedDates!.expirationDate,
  };
  const model = renderNotice({ data: frozen, dates }).model;
  const productionSnapshot = captureProductionSnapshot(frozen);
  const createdNoticeArtifact = captureCreatedNoticeArtifact(
    frozen,
    productionSnapshot.producedAtISO,
    dates,
  );
  return {
    state: { ...input, productionSnapshot, createdNoticeArtifact } as NoticeFlowData,
    model,
    envelope: createdNoticeArtifact,
  };
}

console.log('=== UX2 created artifact integrity ===');

const createdA = successfulCreate(validData());
const restoredA = restoreCreatedNoticeArtifact(createdA.state);
ok(restoredA !== null, 'Scenario 1: successful Create A exposes exact artifact A');
equal(restoredA!.generation, createdA.envelope.generation, 'Scenario 1: artifact generation is A');
equal(
  JSON.stringify(renderNotice({ data: restoredA!.createData, dates: restoredA!.dates }).model),
  JSON.stringify(createdA.model),
  'Scenario 1: Download/Print reconstruction is byte-equivalent model A',
);

{
  const storage = fakeStorage();
  ok(DRAFT_VERSION === 4, 'artifact envelope remains backward-compatible inside draft v4');
  ok(saveDraft(4, createdA.state, storage), 'Scenario 2: created artifact saves in existing local draft envelope');
  const draft = loadDraft(storage);
  ok(draft !== null, 'Scenario 2: ordinary remount restores the draft');
  const remounted = restoreCreatedNoticeArtifact(draft!.data);
  ok(remounted !== null, 'Scenario 2: ordinary remount restores exact artifact identity');
  equal(remounted!.createData.serviceDate, '2026-06-02', 'Scenario 2: remount artifact retains A service date');
}

{
  const currentB = clone(createdA.state);
  currentB.rentPeriods[0].amount = 3250;
  ok(!!evaluateStaleness(currentB).reason, 'Scenario 3: material face edit preserves existing staleness behavior');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 3: stored artifact A remains independently recoverable');
  equal(artifact!.createData.rentPeriods[0].amount, 3000, 'Scenario 3: artifact use cannot silently substitute mutable rent B');
}

{
  const currentB = clone(createdA.state);
  currentB.serviceDate = '2026-06-03';
  equal(evaluateStaleness(currentB).reason, null, 'Scenario 4: serviceDate remains excluded from existing staleness');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 4: artifact A remains available when staleness intentionally stays clear');
  equal(artifact!.createData.serviceDate, '2026-06-02', 'Scenario 4: Download/Print remains A/X, never mutable Y');
}

{
  const currentB = clone(createdA.state);
  currentB.serviceMethod = 'post_and_mail';
  equal(evaluateStaleness(currentB).reason, null, 'Scenario 5: serviceMethod remains excluded from existing staleness');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 5: artifact A remains available after mutable service-method edit');
  equal(artifact!.createData.serviceMethod, 'personal', 'Scenario 5: Download/Print retains the created service method');
}

{
  const currentB = clone(createdA.state);
  currentB.rentPeriods[0].amount = 3250;
  ok(!hasCurrentReviewApproval(currentB), 'Scenario 7: stale approval A is rejected before Create B');
  Object.assign(currentB, bindReviewApproval(currentB, '2026-08-10T10:02:00.000Z'));
  ok(hasCurrentReviewApproval(currentB), 'Scenario 6: deliberate reconfirmation binds B');
  const createdB = successfulCreate(currentB);
  ok(createdB.envelope.generation !== createdA.envelope.generation, 'Scenario 6: fresh successful Create B replaces artifact generation A');
  equal(createdB.envelope.createData.rentPeriods[0].amount, 3250, 'Scenario 6: new artifact identity contains exact B');
  equal(createdB.envelope.createData.createdNoticeArtifact, undefined, 'Scenario 6: new artifact does not recursively contain old artifact A');
}

{
  const legacyPrepared = clone(createdA.state);
  delete legacyPrepared.createdNoticeArtifact;
  ok(
    restoreCreatedNoticeArtifact(legacyPrepared) === null,
    'legacy/remount fallback: ProductionSnapshot without exact artifact envelope fails closed',
  );
}

ok(
  reviewApprovalGeneration(createdA.state) === createdA.envelope.generation,
  'Scenario 8: artifact envelope does not become ReviewApprovalGeneration input',
);
equal(
  (createdA.envelope.createData.serviceAttempts ?? []).length,
  0,
  'Scenario 10: artifact capture creates no service attempt',
);
equal(
  createdA.envelope.createData.successfulServiceAttemptId,
  undefined,
  'Scenario 10: artifact capture creates no successful-service state',
);

const noticeFlow = readFileSync('components/notice-flow.tsx', 'utf8');
ok(noticeFlow.includes('restoreCreatedNoticeArtifact(data)'), 'UI restores artifact identity from persisted envelope');
ok(
  noticeFlow.includes("displayData.cachedResolverVerdict?.verdict === 'confirmed_la'") &&
    noticeFlow.includes('normalizeAddressKey(displayData.propertyAddress)'),
  'LAHD/RTC artifact-use routing is selected from exact artifact data, not mutable current data',
);
ok(noticeFlow.includes('data-testid="created-artifact-unavailable"'), 'UI has explicit fail-closed remount state');
ok(
  noticeFlow.includes("<PacketPrintOptions model={artifactModel} data={artifactData} disabledKeys={['serviceLog']} />"),
  'Download/Print consumes exact artifact model + artifact data',
);
ok(
  !noticeFlow.includes('artifact?.model ?? (noticePrepared ? renderedModel : null)'),
  'mutable renderedModel fallback is absent from artifact-use path',
);
ok(noticeFlow.includes('Your 3-Day Notice is ready'), 'Scenario 9: Notice Ready heading remains');
ok(noticeFlow.includes('PREPARED · NOT SERVED'), 'Scenario 9: PREPARED · NOT SERVED remains');
ok(noticeFlow.includes('href="/notice/3-day/serve"'), 'Scenario 10: actual service remains separate');

console.log(`${passed} created-artifact assertions passed`);
