import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval, hasCurrentReviewApproval } from './reviewApproval';
import {
  hydrateMatterData,
  type SavedNoticeDefaults,
} from './matterHydration';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

function fresh(): NoticeFlowData {
  return createFlowState().data;
}

console.log('=== Matter Hydration v1A precedence ===\n');
{
  const defaults = fresh();
  const hydrated = hydrateMatterData({ defaults });
  check('empty state + no stored values returns defaults', JSON.stringify(hydrated) === JSON.stringify(defaults));

  const savedDefaults: SavedNoticeDefaults = {
    mailingAddress: '10 Saved Ave',
    payeePhone: '2135550100',
    payeeStreetAddress: '10 Saved Ave',
    paymentBranch: 'in_person_and_mail',
    personalDeliveryDays: 'Monday through Friday',
    personalDeliveryHours: '9:00 a.m. to 5:00 p.m.',
    signerName: 'Saved Signer',
  };
  const fromSaved = hydrateMatterData({ defaults: fresh(), savedDefaults });
  check('saved browser-local defaults hydrate an otherwise empty Notice', fromSaved.mailingAddress === '10 Saved Ave');
  check('saved nested payee contact hydrates', fromSaved.landlordContact?.phone === '2135550100' && fromSaved.landlordContact?.streetAddress === '10 Saved Ave');
  check('saved profile keeps opt-in active', fromSaved.saveLandlordPaymentDefaults === true);

  const restoredDraft = fresh();
  restoredDraft.mailingAddress = '20 Draft Ave';
  restoredDraft.landlordContact = { phone: '3105550200' };
  const fromDraft = hydrateMatterData({ defaults: fresh(), savedDefaults, restoredDraft });
  check('restored current Notice draft overrides conflicting saved defaults', fromDraft.mailingAddress === '20 Draft Ave' && fromDraft.landlordContact?.phone === '3105550200');
  check('absent draft nested contact field inherits lower-precedence saved default', fromDraft.landlordContact?.streetAddress === '10 Saved Ave');

  const withEdits = hydrateMatterData({
    defaults: fresh(),
    savedDefaults,
    restoredDraft,
    currentEdits: {
      mailingAddress: '',
      landlordContact: { phone: '' },
      tenantNames: ['Current Tenant'],
    },
  });
  check('current customer edits override conflicting restored/default values', withEdits.tenantNames[0] === 'Current Tenant');
  check('explicitly cleared current top-level value is not resurrected', withEdits.mailingAddress === '');
  check('explicitly cleared current nested value is not resurrected', withEdits.landlordContact?.phone === '');
  check('an absent current nested field may inherit lower-precedence value', withEdits.landlordContact?.streetAddress === '10 Saved Ave');
}

console.log('\n=== Determinism ===\n');
{
  const savedDefaults: SavedNoticeDefaults = {
    mailingAddress: '100 Deterministic Way',
    payeePhone: '8185550101',
  };
  const restoredDraft = fresh();
  restoredDraft.propertyAddress = '200 Draft St';
  const currentEdits: Partial<NoticeFlowData> = { propertyUnit: '5' };

  const first = hydrateMatterData({ defaults: fresh(), savedDefaults, restoredDraft, currentEdits });
  const second = hydrateMatterData({ defaults: fresh(), savedDefaults, restoredDraft, currentEdits });
  check('hydration is deterministic across repeated application', JSON.stringify(first) === JSON.stringify(second));

  const reapplied = hydrateMatterData({ defaults: fresh(), restoredDraft: first });
  check('hydrated state remains stable when restored again except approval metadata', JSON.stringify(first) === JSON.stringify(reapplied));
}

console.log('\n=== Prefill is not confirmation ===\n');
{
  const approved = fresh();
  approved.propertyAddress = '300 Exact State Ave';
  Object.assign(approved, bindReviewApproval(approved, '2026-08-11T00:00:00.000Z'));
  check('fixture begins with a current exact-generation C6 approval', hasCurrentReviewApproval(approved) === true);

  const hydrated = hydrateMatterData({ defaults: fresh(), restoredDraft: approved });
  check('hydration clears persisted produce attestation', hydrated.produceAttestationConfirmed === undefined);
  check('hydration clears persisted attestation timestamp', hydrated.produceAttestationAcceptedAt === undefined);
  check('hydration clears persisted ReviewApprovalGeneration', hydrated.reviewApprovalGeneration === undefined);
  check('hydration cannot produce a current C6 approval', hasCurrentReviewApproval(hydrated) === false);

  const stale = fresh();
  stale.propertyAddress = '400 State A Ave';
  Object.assign(stale, bindReviewApproval(stale, '2026-08-11T00:00:00.000Z'));
  stale.propertyAddress = '401 State B Ave';
  const staleHydrated = hydrateMatterData({ defaults: fresh(), restoredDraft: stale });
  check('stale persisted C6 Boolean/generation cannot bypass current-generation checks', hasCurrentReviewApproval(staleHydrated) === false && staleHydrated.produceAttestationConfirmed === undefined);
}

console.log('\n=== Post-create and service boundaries ===\n');
{
  const emptyHydrated = hydrateMatterData({ defaults: fresh() });
  check('hydration does not fabricate a ProductionSnapshot', emptyHydrated.productionSnapshot === undefined);
  check('hydration does not fabricate a CreatedNoticeArtifactEnvelope', emptyHydrated.createdNoticeArtifact === undefined);
  check('hydration does not fabricate service attempts', emptyHydrated.serviceAttempts === undefined && emptyHydrated.successfulServiceAttemptId === undefined);

  const artifactCreateData = fresh();
  artifactCreateData.propertyAddress = '500 Frozen Artifact Ave';
  artifactCreateData.propertyCounty = 'Fresno';
  artifactCreateData.tenantNames = ['Artifact Tenant'];

  const restoredDraft = fresh();
  restoredDraft.propertyAddress = '500 Frozen Artifact Ave';
  restoredDraft.productionSnapshot = {
    producedAtISO: '2026-08-11T00:00:00.000Z',
    propertyAddress: '500 Frozen Artifact Ave',
    propertyCounty: 'Fresno',
    tenantNames: ['Artifact Tenant'],
    totalAmount: 1000,
    rentPeriods: [{ start: '2026-07-01', end: '2026-07-31', amount: 1000 }],
    payeeName: 'Owner Example',
    payeePhone: '5595550100',
    payeeStreetAddress: '1 Main St',
    paymentBranch: 'mail_only',
    signerName: 'Owner Example',
  };
  restoredDraft.createdNoticeArtifact = {
    generation: 'artifact-generation-v1',
    createdAtISO: '2026-08-11T00:00:00.000Z',
    createData: artifactCreateData,
    dates: {
      compliancePeriodStartDate: '2026-08-12',
      compliancePeriodEndDate: '2026-08-16',
    },
  };
  restoredDraft.serviceAttempts = [
    {
      id: 'attempt-1',
      attemptDate: '2026-08-11',
      method: 'personal',
      outcome: 'FAILED',
      server: {
        name: 'Server Example',
        address: '1 Main St',
        age18Plus: true,
        partyToNotice: false,
      },
    },
  ];

  const hydrated = hydrateMatterData({
    defaults: fresh(),
    restoredDraft,
    currentEdits: { propertyAddress: '999 Mutable Draft Ave' },
  });

  check('current mutable draft may change without rewriting ProductionSnapshot', hydrated.propertyAddress === '999 Mutable Draft Ave' && hydrated.productionSnapshot?.propertyAddress === '500 Frozen Artifact Ave');
  check('existing exact created artifact remains distinct from mutable hydrated draft', hydrated.createdNoticeArtifact?.createData.propertyAddress === '500 Frozen Artifact Ave');
  check('existing service state is preserved but not fabricated', hydrated.serviceAttempts?.[0]?.id === 'attempt-1' && hydrated.serviceAttempts?.[0]?.outcome === 'FAILED');
  check('actual successful-service state is not invented', hydrated.successfulServiceAttemptId === undefined);

  assert.notStrictEqual(hydrated.createdNoticeArtifact?.createData, restoredDraft.createdNoticeArtifact?.createData);
  check('hydration clones preserved artifact data rather than sharing mutable identity', hydrated.createdNoticeArtifact?.createData !== restoredDraft.createdNoticeArtifact?.createData);
}

console.log('\n' + '-'.repeat(52));
console.log(`  ${passed} passed, ${failures.length} failed`);
console.log('-'.repeat(52) + '\n');

if (failures.length > 0) process.exit(1);
