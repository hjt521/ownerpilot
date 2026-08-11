import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval, hasCurrentReviewApproval } from './reviewApproval';
import { resolveBrowserNoticeStart } from './matterHydration';
import { clearProfile, extractProfile, loadProfile, saveProfile, type OwnerProfile } from './profile';
import { DRAFT_VERSION, loadDraft, saveDraft, type StorageLike } from './persistence';

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const profile: OwnerProfile = {
  landlordIdentity: { type: 'individual', names: ['Saved Landlord'] },
  landlordIdentityConfirmed: true,
  mailingAddress: '10 Saved Ave, Los Angeles, CA 90001',
  payeePhone: '2135550101',
  payeeStreetAddress: '20 Payee Ave, Los Angeles, CA 90001',
  paymentBranch: 'in_person_and_mail',
  personalDeliveryDays: 'Monday-Friday',
  personalDeliveryHours: '9:00 AM-5:00 PM',
  signerName: 'Saved Signer',
};

// Draft beats conflicting profile, including page position and current C6 binding.
const draftBase: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '111 Draft St, Los Angeles, CA 90001',
  tenantNames: ['Draft Tenant'],
  rentPeriods: [{ periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 2400 }],
  signerName: 'Draft Signer',
  dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
};
const approvedDraft = { ...draftBase, ...bindReviewApproval(draftBase, '2026-08-10T20:00:00.000Z') };
const restored = resolveBrowserNoticeStart(createFlowState().data, {
  pageIndex: 4,
  savedAt: '2026-08-10T20:00:00.000Z',
  data: approvedDraft,
}, profile);
assert.equal(restored.source, 'draft');
assert.equal(restored.pageIndex, 4);
assert.equal(restored.data.propertyAddress, draftBase.propertyAddress);
assert.equal(restored.data.signerName, 'Draft Signer');
assert.equal(restored.data.landlordIdentity, draftBase.landlordIdentity);
assert.equal(hasCurrentReviewApproval(restored.data), true, 'resume alone must not invalidate current C6');
assert.deepEqual(restored.profileSections, { landlordPayment: false, signerName: false });

// A later customer edit occurs after hydration and wins over every start source.
const edited = { ...restored.data, signerName: 'Customer Edit' };
assert.equal(edited.signerName, 'Customer Edit');
assert.equal(hasCurrentReviewApproval(edited), false, 'existing UX2 material-edit invalidation remains active');

// No draft + profile fills only the supported reusable subset into a fresh notice.
const fresh = createFlowState().data;
const profiled = resolveBrowserNoticeStart(fresh, null, profile);
assert.equal(profiled.source, 'profile');
assert.equal(profiled.pageIndex, 0);
assert.equal(profiled.data.signerName, 'Saved Signer');
assert.deepEqual(profiled.data.landlordIdentity, profile.landlordIdentity);
assert.equal(
  profiled.data.landlordIdentityConfirmed,
  fresh.landlordIdentityConfirmed,
  'saved identity may prefill, but a prior-notice confirmation must not carry into a new notice',
);
assert.equal(profiled.data.paymentBranch, 'in_person_and_mail');
assert.equal(profiled.data.landlordContact?.phone, '2135550101');
assert.equal(profiled.data.tenantNames[0], '');
assert.equal(profiled.data.rentPeriods[0].amount, 0);
assert.deepEqual(profiled.data.dispute, {});
assert.equal(profiled.data.serviceDate, undefined);
assert.equal(profiled.data.signerCapacity, undefined);
assert.equal(profiled.data.authorityEvidenceOnFile, undefined);
assert.equal(profiled.data.cachedResolverVerdict, undefined);
assert.equal(profiled.data.bankAccountNumber, undefined);
assert.equal(profiled.data.bankName, undefined);
assert.equal(profiled.data.bankBranchAddress, undefined);
assert.equal(profiled.data.eftElectionAvailable, undefined);
assert.equal(profiled.data.eftPreviouslyEstablishedConfirmed, undefined);
assert.deepEqual(profiled.profileSections, { landlordPayment: true, signerName: true });

// No draft + no profile is the ordinary empty/default notice.
const empty = resolveBrowserNoticeStart(fresh, null, null);
assert.equal(empty.source, 'empty');
assert.equal(empty.pageIndex, 0);
assert.strictEqual(empty.data, fresh);

// Projection boundary: sensitive/current/legal facts never enter the reusable profile.
const noticeSpecific = {
  ...draftBase,
  bankAccountNumber: 'SECRET',
  bankName: 'Sensitive Bank',
  bankBranchAddress: '1 Bank St',
  eftElectionAvailable: true,
  eftPreviouslyEstablishedConfirmed: true,
  signerCapacity: 'authorized_agent' as const,
  authorityEvidenceOnFile: true,
  serviceDate: '2026-08-12',
  cachedResolverVerdict: { verdict: 'confirmed_la', addressKey: 'x', source: 'live_resolver' } as NoticeFlowData['cachedResolverVerdict'],
};
const projected = extractProfile(noticeSpecific) as Record<string, unknown>;
for (const key of [
  'propertyAddress', 'tenantNames', 'rentPeriods', 'dispute', 'bankAccountNumber', 'bankName',
  'bankBranchAddress', 'eftElectionAvailable', 'eftPreviouslyEstablishedConfirmed', 'signerCapacity',
  'authorityEvidenceOnFile', 'serviceDate', 'cachedResolverVerdict',
]) {
  assert.equal(key in projected, false, `${key} must never cross into saved profile`);
}

// Existing two localStorage domains remain fail-soft and independent.
const storage = memoryStorage();
assert.equal(saveDraft(3, approvedDraft, storage), true);
assert.equal(saveProfile(noticeSpecific, storage), true);
const loadedDraft = loadDraft(storage);
const loadedProfile = loadProfile(storage);
assert.equal(loadedDraft?.pageIndex, 3);
assert.equal(loadedDraft?.data.propertyAddress, draftBase.propertyAddress);
assert.equal(loadedProfile?.signerName, noticeSpecific.signerName);
clearProfile(storage);
assert.equal(loadProfile(storage), null, 'profile opt-out keeps existing clearing behavior');
assert.equal(loadDraft(storage)?.pageIndex, 3, 'clearing profile must not clear current draft');

const corruptStorage: StorageLike = {
  getItem: () => '{broken',
  setItem: () => { throw new Error('unavailable'); },
  removeItem: () => { throw new Error('unavailable'); },
};
assert.equal(loadDraft(corruptStorage), null);
assert.equal(loadProfile(corruptStorage), null);
assert.equal(saveProfile(fresh, corruptStorage), false);
clearProfile(corruptStorage);

assert.equal(DRAFT_VERSION, 4, 'v1A must not create a new draft persistence version/domain');
console.log('matterHydration.test.ts: PASS');
