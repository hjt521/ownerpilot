import { strict as assert } from 'node:assert';
import type { NoticeFlowData } from './noticeFlowState';
import { individualLandlord, entityLandlord } from './landlord.fixture';
import { normalizeAddressKey } from './jurisdictionVerdict';
import { evaluateCanProduceV4 } from './gates';
import { captureProductionSnapshot } from './escalation';
import { DRAFT_VERSION, loadDraft, saveDraft, type StorageLike } from './persistence';
import {
  bindReviewApproval,
  canonicalReviewCreateInput,
  clearReviewApproval,
  freezeReviewCreateInput,
  hasCurrentReviewApproval,
  reviewApprovalGeneration,
} from './reviewApproval';

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
  const d: NoticeFlowData = {
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
      name: 'Deprecated Typed Name',
      phone: '(559) 555-0142',
      streetAddress: '4336 Prospect Ave, Los Angeles, CA 90028',
    },
    paymentBranch: 'mail_only',
    signerName: 'Jack Tah',
    ...individualLandlord('owner', { names: ['Jack Tah'] }),
    signingDate: '2026-06-01',
    serviceDate: '2026-06-02',
    serviceMethod: 'personal',
    cachedCaliforniaEligibility: {
      status: 'CONFIRMED_CALIFORNIA',
      addressKey: normalizeAddressKey('442 Fresno St, Fresno, CA 93701'),
      resolvedAt: '2026-08-10T10:00:00.000Z',
      source: 'google_places',
    },
  };
  Object.assign(d, bindReviewApproval(d, '2026-08-10T10:01:00.000Z'));
  return d;
}

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}

console.log('=== UX2 review approval generation ===');

{
  const a = validData();
  const b: NoticeFlowData = {
    serviceMethod: a.serviceMethod,
    serviceDate: a.serviceDate,
    cachedCaliforniaEligibility: a.cachedCaliforniaEligibility,
    landlordIdentityConfirmed: a.landlordIdentityConfirmed,
    signerCapacity: a.signerCapacity,
    signerName: a.signerName,
    paymentBranch: a.paymentBranch,
    landlordContact: a.landlordContact,
    paymentMethods: a.paymentMethods,
    rentPeriods: a.rentPeriods,
    tenantNames: a.tenantNames,
    propertyCounty: a.propertyCounty,
    propertyCity: a.propertyCity,
    propertyUnit: a.propertyUnit,
    propertyAddress: a.propertyAddress,
    dispute: a.dispute,
    landlordIdentity: a.landlordIdentity,
  };
  equal(
    reviewApprovalGeneration(a),
    reviewApprovalGeneration(b),
    'object-property insertion order does not change generation',
  );
  equal(
    canonicalReviewCreateInput(a),
    canonicalReviewCreateInput(b),
    'canonical create input is stable for equivalent state',
  );
}

{
  const a = validData();
  const b = {
    ...a,
    produceAttestationAcceptedAt: '2099-01-01T00:00:00.000Z',
    bankInterstitialDismissed: !a.bankInterstitialDismissed,
    saveLandlordPaymentDefaults: true,
    signingDate: '2099-01-01',
    mailingAddress: 'Different profile-only mailing address',
    cachedCaliforniaEligibility: {
      ...a.cachedCaliforniaEligibility!,
      resolvedAt: '2099-01-01T00:00:00.000Z',
    },
  };
  equal(
    reviewApprovalGeneration(a),
    reviewApprovalGeneration(b),
    'wall-clock/UI-only/backward-compatibility residue does not force reconfirmation',
  );
}

for (const [name, mutate] of [
  ['rent amount', (d: NoticeFlowData) => { d.rentPeriods[0].amount = 3100; }],
  ['tenant identity', (d: NoticeFlowData) => { d.tenantNames = ['Changed Tenant']; }],
  ['landlord identity', (d: NoticeFlowData) => {
    Object.assign(d, entityLandlord('officer_member_trustee', {
      entityLegalName: 'Changed Owner LLC',
      signerTitle: 'Managing Member',
    }));
    d.signerName = 'Manager Person';
  }],
  ['signer name', (d: NoticeFlowData) => { d.signerName = 'Changed Signer'; }],
  ['property unit', (d: NoticeFlowData) => { d.propertyUnit = '3'; }],
  ['payment methods', (d: NoticeFlowData) => { d.paymentMethods = ['in_person', 'by_mail']; d.personalDeliveryDays = 'Mon-Fri'; d.personalDeliveryHours = '9-5'; }],
  ['service date', (d: NoticeFlowData) => { d.serviceDate = '2026-06-03'; }],
  ['California evidence', (d: NoticeFlowData) => { d.cachedCaliforniaEligibility = { ...d.cachedCaliforniaEligibility!, status: 'UNKNOWN' }; }],
] as const) {
  const a = validData();
  const b = freezeReviewCreateInput(a);
  const changed = JSON.parse(JSON.stringify(b)) as NoticeFlowData;
  mutate(changed);
  ok(
    reviewApprovalGeneration(changed) !== reviewApprovalGeneration(a),
    `${name} changes the approval generation`,
  );
}

{
  const a = validData();
  ok(hasCurrentReviewApproval(a), 'state A has a current bound C6 approval');

  const b = JSON.parse(JSON.stringify(a)) as NoticeFlowData;
  b.rentPeriods[0].amount = 3250;
  ok(
    b.produceAttestationConfirmed === true && !hasCurrentReviewApproval(b),
    'stale persisted C6 Boolean cannot authorize materially changed state B',
  );

  Object.assign(b, bindReviewApproval(b, '2026-08-10T10:02:00.000Z'));
  ok(hasCurrentReviewApproval(b), 'deliberate reconfirmation binds and authorizes state B');
  ok(
    reviewApprovalGeneration(a) !== reviewApprovalGeneration(b),
    'A and B have distinct exact create generations',
  );

  Object.assign(b, clearReviewApproval());
  ok(!hasCurrentReviewApproval(b), 'clearing C6 removes current approval authority');
}

{
  const frozen = freezeReviewCreateInput(validData());
  ok(Object.isFrozen(frozen), 'final create input root is frozen');
  ok(Object.isFrozen(frozen.rentPeriods), 'final create input nested arrays are frozen');
  ok(Object.isFrozen(frozen.rentPeriods[0]), 'final create input nested objects are frozen');
}

{
  const d = validData();
  const approved = reviewApprovalGeneration(d);
  const frozen = freezeReviewCreateInput(d);
  const gateGeneration = reviewApprovalGeneration(frozen);
  const renderGeneration = reviewApprovalGeneration(frozen);
  const createGeneration = reviewApprovalGeneration(frozen);
  equal(approved, gateGeneration, 'approved generation equals final gate generation');
  equal(gateGeneration, renderGeneration, 'gate generation equals render generation');
  equal(renderGeneration, createGeneration, 'render generation equals create generation');

  const gate = evaluateCanProduceV4(frozen);
  ok(gate.canProduce, `fresh bound C6 allows ordinary gate evaluation: ${gate.blockers.map((b) => b.code).join(', ')}`);

  const snapshot = captureProductionSnapshot(frozen);
  const produced = { ...frozen, productionSnapshot: snapshot };
  equal(
    reviewApprovalGeneration(produced),
    reviewApprovalGeneration(frozen),
    'ProductionSnapshot remains a separate contract and does not alter approval generation',
  );
}

{
  const stale = validData();
  const oldGeneration = stale.reviewApprovalGeneration;
  stale.tenantNames = ['Different Tenant'];
  stale.reviewApprovalGeneration = oldGeneration;
  stale.produceAttestationConfirmed = true;
  const gate = evaluateCanProduceV4(stale);
  ok(!gate.canProduce, 'stale generation fails the final produce gate');
  ok(
    gate.blockers.some((b) => b.code === 'PRODUCE_ATTESTATION_MISSING'),
    'stale generation retains PRODUCE_ATTESTATION_MISSING fail-closed behavior',
  );
}

{
  const storage = fakeStorage();
  const a = validData();
  ok(saveDraft(4, a, storage), 'approved state A saves in the current draft envelope');
  const restored = loadDraft(storage);
  ok(restored !== null, 'approved state A restores from localStorage');
  equal(DRAFT_VERSION, 4, 'UX2 approval state uses draft version 4');
  const changed = restored!.data;
  changed.rentPeriods[0].amount = 3300;
  ok(
    changed.produceAttestationConfirmed === true && !hasCurrentReviewApproval(changed),
    'restored stale C6 cannot resurrect authority after a material fact change',
  );
}

console.log(`${passed} review approval assertions passed`);
