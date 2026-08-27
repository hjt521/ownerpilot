import { strict as assert } from 'node:assert';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
} from './filingCanonicalFacts';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';

const source: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Canonical Ave',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = { ...source, ...bindReviewApproval(source, '2026-08-13T18:00:00.000Z') };
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-13T18:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-14',
  compliancePeriodEndDate: '2026-08-18',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-13T18:01:00.000Z',
    propertyAddress: '100 Canonical Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Canonical Ave',
    signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};
const verification = { verificationId: 'facts-smoke', verifiedAtISO: '2026-08-13T18:02:00.000Z' };
const projection = projectFilingCanonicalFacts(persisted, {
  preparation: {
    leaseStatus: { state: 'KNOWN', value: 'OTHER', verification },
    agreementTermDescription: { state: 'KNOWN', value: 'ONE-YEAR CONTRACT', verification },
    agreementRentAmount: { state: 'KNOWN', value: 2500, verification },
    agreementRentFrequency: { state: 'KNOWN', value: 'MONTHLY', verification },
    agreementRentDue: { state: 'KNOWN', value: 'FIRST_DAY_OF_MONTH', verification },
    agreementForm: { state: 'KNOWN', value: 'WRITTEN', verification },
    agreementParty: { state: 'KNOWN', value: 'PLAINTIFF', verification },
    agreementDate: { state: 'UNKNOWN' },
  },
});
assert.equal(projection.status, 'READY');
if (projection.status === 'READY') {
  assert.equal(projection.facts[CANONICAL_FILING_FACT_REFS.leaseStatus].state, 'KNOWN');
  assert.equal(projection.facts[CANONICAL_FILING_FACT_REFS.agreementDate].state, 'UNKNOWN');
}
console.log('E2D1R1_CANONICAL_FACTS_SMOKE=PASS');
