/**
 * Tests for the A2 escalation staleness helpers.
 * Matches the repo test convention (inline check() runner, top-level execution,
 * \u2713/\u2717 output, passed/failed summary). Run with the same tool used for
 * validatePaymentBranch_test.ts / gates_v4_test.ts.
 */

import {
  captureProductionSnapshot,
  evaluateStaleness,
  getSuccessfulAttempt,
  deriveComplianceInputs,
  validateSigningDate,
} from './escalation';
import type { NoticeFlowData, ServiceAttempt } from './noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

function baseData(): NoticeFlowData {
  return {
    dispute: {},
    propertyAddress: '123 Main St, Los Angeles, CA 90012',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2000 },
    ],
    baseRentOnlyConfirmed: true,
    paymentMethods: [],
    landlordContact: {
      name: 'Acme Property Mgmt',
      phone: '(555) 555-5555',
      streetAddress: '1 Owner Way, Los Angeles, CA 90001',
    },
    paymentBranch: 'in_person_and_mail',
    personalDeliveryDays: 'Monday through Friday',
    personalDeliveryHours: '9:00 a.m. to 5:00 p.m.',
    signerName: 'Sam Signer',
    signerCapacity: 'owner',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
  };
}

console.log('\n=== No snapshot ===\n');
{
  const r = evaluateStaleness(baseData(), undefined);
  check('1. no snapshot => not stale', r.stale === false && r.changedFields.length === 0);
}

console.log('\n=== Identical data ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  const r = evaluateStaleness(data);
  check('2. identical => not stale', r.stale === false, r.changedFields.join(', '));
  check('3. identical => amount unchanged', r.amountChanged === false);
}

console.log('\n=== Re-serve (the normal escalation path) ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.serviceMethod = 'substituted';
  data.serviceDate = '2026-06-05';
  const r = evaluateStaleness(data);
  check('4. new date + method alone => NOT stale', r.stale === false, r.changedFields.join(', '));
}

console.log('\n=== Amount change (A2 exception i) ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.rentPeriods = [
    { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2500 },
  ];
  const r = evaluateStaleness(data);
  check('5. amount change => stale', r.stale === true);
  check('6. amount change => amountChanged true', r.amountChanged === true);
  check('7. amount change => names "Amount demanded"', r.changedFields.includes('Amount demanded'));
}

console.log('\n=== Face field change (A2 exception ii) ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.landlordContact = { ...data.landlordContact!, streetAddress: '2 New Way, LA, CA 90001' };
  const r = evaluateStaleness(data);
  check('8. payee address change => stale', r.stale === true);
  check('9. payee address change => amount unchanged', r.amountChanged === false);
  check('10. payee address change => names "Payee address"', r.changedFields.includes('Payee address'));
}

console.log('\n=== Payment branch change ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.paymentBranch = 'bank_deposit';
  data.bankName = 'First Bank';
  data.bankBranchAddress = '5 Bank St, LA, CA 90001';
  data.bankAccountNumber = '0001234567';
  const r = evaluateStaleness(data);
  check('11. branch change => stale', r.stale === true);
  check('12. branch change => names "Payment method"', r.changedFields.includes('Payment method'));
}

console.log('\n=== Tenant change ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.tenantNames = ['Jane Tenant', 'John Tenant'];
  const r = evaluateStaleness(data);
  check('13. tenant change => stale', r.stale === true);
  check('14. tenant change => names "Tenant names"', r.changedFields.includes('Tenant names'));
}

console.log('\n=== Payee name tracks the DERIVED name (Defect #2 cutover) ===\n');
{
  const data = baseData();
  data.landlordIdentity = { type: 'individual', names: ['Maria Lopez'] };
  data.landlordIdentityConfirmed = true;
  data.productionSnapshot = captureProductionSnapshot(data);
  // Turning on the non-landlord override changes the DERIVED payee name.
  data.payeeIsNonLandlord = true;
  data.payeeOverrideName = 'Westside Property Management, Inc.';
  const r = evaluateStaleness(data);
  check('D2-1. override flips derived payee name => stale', r.stale === true, r.changedFields.join(', '));
  check('D2-2. => names "Payee name"', r.changedFields.includes('Payee name'));
}
{
  // The typed (deprecated) landlordContact.name no longer drives staleness.
  const data = baseData();
  data.landlordIdentity = { type: 'individual', names: ['Maria Lopez'] };
  data.landlordIdentityConfirmed = true;
  data.productionSnapshot = captureProductionSnapshot(data);
  data.landlordContact = { ...data.landlordContact!, name: 'Totally Different Name' };
  const r = evaluateStaleness(data);
  check('D2-3. typed landlordContact.name change alone => no "Payee name" change',
    !r.changedFields.includes('Payee name'));
}

console.log('\n=== stalenessReason enum (B1) ===\n');
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  check('15. fresh => reason null', evaluateStaleness(data).reason === null);
}
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.rentPeriods = [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2500 }];
  check('16. amount change => reason AMOUNT_CHANGED', evaluateStaleness(data).reason === 'AMOUNT_CHANGED');
}
{
  const data = baseData();
  data.productionSnapshot = captureProductionSnapshot(data);
  data.tenantNames = ['Jane Tenant', 'John Tenant'];
  check('17. face change => reason FACE_FIELD_CHANGED', evaluateStaleness(data).reason === 'FACE_FIELD_CHANGED');
}

console.log('\n=== getSuccessfulAttempt / deriveComplianceInputs (B1) ===\n');
const server = { name: 'Pat Server', address: '9 Server Rd', age18Plus: true, partyToNotice: false };
function attempt(over: Partial<ServiceAttempt>): ServiceAttempt {
  return { attemptDate: '2026-06-01', method: 'personal', outcome: 'FAILED', server, ...over };
}
{
  const data = baseData();
  data.serviceAttempts = [attempt({ outcome: 'FAILED' })];
  check('18. no SUCCESS => getSuccessfulAttempt undefined', getSuccessfulAttempt(data) === undefined);
  check('19. no SUCCESS => deriveComplianceInputs undefined', deriveComplianceInputs(data) === undefined);
}
{
  const data = baseData();
  data.serviceAttempts = [
    attempt({ attemptDate: '2026-06-01', method: 'personal', outcome: 'FAILED' }),
    attempt({ attemptDate: '2026-06-03', method: 'personal', outcome: 'SUCCESS', id: 's1' }),
  ];
  const ci = deriveComplianceInputs(data);
  check('20. personal SUCCESS => counts from attemptDate', !!ci && ci.serviceDate === '2026-06-03' && ci.serviceMethod === 'personal', JSON.stringify(ci));
  check('21. getSuccessfulAttempt returns the SUCCESS entry', getSuccessfulAttempt(data)?.id === 's1');
}
{
  const data = baseData();
  data.serviceAttempts = [
    attempt({ method: 'substituted', outcome: 'SUCCESS', attemptDate: '2026-06-04', mailingDate: '2026-06-05' }),
  ];
  const ci = deriveComplianceInputs(data);
  check('22. substituted SUCCESS => counts from mailingDate', !!ci && ci.serviceDate === '2026-06-05' && ci.serviceMethod === 'substituted', JSON.stringify(ci));
}
{
  const data = baseData();
  data.serviceAttempts = [attempt({ method: 'post_and_mail', outcome: 'SUCCESS', mailingDate: undefined })];
  check('23. post_and_mail SUCCESS without mailingDate => undefined (invalid)', deriveComplianceInputs(data) === undefined);
}

console.log('\n=== validateSigningDate (B1 q3) ===\n');
{
  const r = validateSigningDate('2026-06-01', '2026-06-02');
  check('24. signing before service => ok, no warning', r.ok === true && !r.warning && !r.error);
}
{
  const r = validateSigningDate('2026-06-02', '2026-06-01');
  check('25. signing AFTER service => hard error', r.ok === false && !!r.error);
}
{
  const r = validateSigningDate('2026-05-01', '2026-06-15');
  check('26. signing >30 days before service => warning, still ok', r.ok === true && !!r.warning);
}
{
  const r = validateSigningDate(undefined, '2026-06-01');
  check('27. missing signing date => ok (validated elsewhere)', r.ok === true);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} escalation test(s) failed`);
