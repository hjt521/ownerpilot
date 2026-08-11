import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData, type ServiceAttempt } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot } from './escalation';
import {
  deriveServiceTaskDisplay,
  getPreviousServerCandidate,
  restoreServiceTaskContext,
} from './serviceTaskPresentation';

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
  propertyAddress: '100 Exact Ave, Los Angeles, CA 90001',
  propertyUnit: '4',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Exact Tenant'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Exact Owner'] },
  landlordIdentityConfirmed: true,
  landlordContact: {
    phone: '2135551212',
    streetAddress: '100 Exact Ave, Los Angeles, CA 90001',
  },
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  signerName: 'Exact Owner',
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
const createdNoticeArtifact = captureCreatedNoticeArtifact(
  approved,
  createdAtISO,
  {
    compliancePeriodStartDate: '2026-08-13',
    compliancePeriodEndDate: '2026-08-17',
  },
);
const created: NoticeFlowData = {
  ...approved,
  productionSnapshot,
  createdNoticeArtifact,
};

const prepared = deriveServiceTaskDisplay(created);
equal(prepared.kind, 'prepared', 'created Notice begins in prepared/not-served task state');
equal(prepared.statusLabel, 'PREPARED · NOT SERVED', 'prepared status label is factual');

const failed: ServiceAttempt = {
  id: 'failed-1',
  attemptDate: '2026-08-13',
  method: 'personal',
  outcome: 'FAILED',
  server: {
    name: 'Same Server',
    address: '200 Server St, Los Angeles, CA 90001',
    age18Plus: true,
    partyToNotice: false,
  },
};
const afterFailure: NoticeFlowData = { ...created, serviceAttempts: [failed] };
const inProgress = deriveServiceTaskDisplay(afterFailure);
equal(inProgress.kind, 'in_progress', 'failed attempt leaves service task incomplete');
equal(inProgress.statusLabel, '1 ATTEMPT RECORDED · NOT SERVED', 'failed attempt status is factual');

const candidate = getPreviousServerCandidate(afterFailure);
equal(candidate?.name, 'Same Server', 'same-Notice server name may be proposed');
equal(candidate?.address, '200 Server St, Los Angeles, CA 90001', 'same-Notice server address may be proposed');
ok(!('age18Plus' in (candidate ?? {})), 'server eligibility is not part of reusable candidate');
ok(!('partyToNotice' in (candidate ?? {})), 'party status is not part of reusable candidate');

const successful: ServiceAttempt = {
  id: 'success-1',
  attemptDate: '2026-08-14',
  method: 'substituted',
  outcome: 'SUCCESS',
  mailingDate: '2026-08-15',
  server: {
    name: 'Same Server',
    address: '200 Server St, Los Angeles, CA 90001',
    age18Plus: true,
    partyToNotice: false,
  },
};
const served: NoticeFlowData = {
  ...created,
  serviceAttempts: [failed, successful],
  successfulServiceAttemptId: 'success-1',
};
const recorded = deriveServiceTaskDisplay(served);
equal(recorded.kind, 'recorded', 'successful attempt completes service task');
equal(recorded.statusLabel, 'SERVICE RECORDED', 'successful task status avoids sufficiency claim');

const mutableFaceChanged: NoticeFlowData = {
  ...served,
  propertyAddress: '999 Mutable Ave, Los Angeles, CA 90001',
  propertyUnit: '99',
  tenantNames: ['Different Mutable Tenant'],
};
const context = restoreServiceTaskContext(mutableFaceChanged);
ok(context !== null, 'exact artifact remains restorable even when later mutable face differs');
equal(context?.noticeData.propertyAddress, '100 Exact Ave, Los Angeles, CA 90001', 'service identity comes from exact artifact A');
equal(context?.noticeData.propertyUnit, '4', 'artifact unit is preserved');
equal(context?.noticeData.tenantNames[0], 'Exact Tenant', 'artifact tenant is preserved');
equal(context?.serviceData.propertyAddress, '100 Exact Ave, Los Angeles, CA 90001', 'proof/service projection keeps artifact face');
equal(context?.serviceData.serviceAttempts?.length, 2, 'proof/service projection uses current service-event history');
equal(context?.serviceData.successfulServiceAttemptId, 'success-1', 'projection uses current successful event id');

const missingArtifact: NoticeFlowData = {
  ...created,
  createdNoticeArtifact: undefined,
};
equal(restoreServiceTaskContext(missingArtifact), null, 'ProductionSnapshot without exact artifact fails closed');

const mismatchedArtifact: NoticeFlowData = {
  ...created,
  productionSnapshot: { ...productionSnapshot, producedAtISO: '2026-08-11T06:02:00.000Z' },
};
equal(restoreServiceTaskContext(mismatchedArtifact), null, 'artifact/snapshot identity mismatch fails closed');

console.log(`${passed} Service task presentation assertions passed`);
