/**
 * Tests for the A2 escalation staleness helpers.
 * Matches the repo test convention (inline check() runner, top-level execution,
 * \u2713/\u2717 output, passed/failed summary). Run with the same tool used for
 * validatePaymentBranch_test.ts / gates_v4_test.ts.
 */

import {
  captureProductionSnapshot,
  evaluateStaleness,
} from './escalation';
import type { NoticeFlowData } from './noticeFlowState';

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
    signerRole: 'owner',
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

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} escalation test(s) failed`);
