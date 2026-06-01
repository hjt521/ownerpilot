import {
  evaluateDisputeScreen,
  evaluateCanProduce,
} from './gates';
import { NoticeFlowData } from './noticeFlowState';
import { CA_JUDICIAL_HOLIDAYS } from '../dates/holidays';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function hasBlocker(blockers: { code: string }[], code: string): boolean {
  return blockers.some((b) => b.code === code);
}

// For date tests we need a verified year. 2026 is verified in the repo, but
// guard in case: ensure 2026 is verified for these tests.
const has2026 = CA_JUDICIAL_HOLIDAYS[2026] && CA_JUDICIAL_HOLIDAYS[2026].verified;

console.log('\n=== Dispute screen ===');

console.log('\n1. All three "no" -> cleared, not blocked');
{
  const r = evaluateDisputeScreen({
    tenantFiledComplaint: false,
    tenantWrittenWithholding: false,
    tenantBankruptcy: false,
  });
  check('cleared', r.cleared === true);
  check('not blocked', r.blocked === false);
}

console.log('\n2. Unanswered -> NOT cleared, blocked (fails closed)');
{
  const r = evaluateDisputeScreen({ tenantFiledComplaint: false });
  check('not cleared', r.cleared === false);
  check('blocked', r.blocked === true);
}

console.log('\n3. Empty screen -> blocked');
{
  const r = evaluateDisputeScreen({});
  check('blocked', r.blocked === true);
  check('not cleared', r.cleared === false);
}

console.log('\n4. Each "yes" blocks');
{
  const a = evaluateDisputeScreen({ tenantFiledComplaint: true, tenantWrittenWithholding: false, tenantBankruptcy: false });
  const b = evaluateDisputeScreen({ tenantFiledComplaint: false, tenantWrittenWithholding: true, tenantBankruptcy: false });
  const c = evaluateDisputeScreen({ tenantFiledComplaint: false, tenantWrittenWithholding: false, tenantBankruptcy: true });
  check('complaint yes blocks', a.blocked && !a.cleared);
  check('withholding yes blocks', b.blocked && !b.cleared);
  check('bankruptcy yes blocks', c.blocked && !c.cleared);
}

console.log('\n=== Review gate (evaluateCanProduce) ===');

// A fully-valid baseline that SHOULD produce. Uses verified 2026 dates and a
// non-overlay city (Fresno) so jurisdiction is clean.
function validBaseline(): NoticeFlowData {
  return {
    dispute: {
      tenantFiledComplaint: false,
      tenantWrittenWithholding: false,
      tenantBankruptcy: false,
    },
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCity: 'Fresno',
    propertyCounty: 'Fresno',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 2000 }],
    baseRentOnlyConfirmed: true,
    paymentMethods: [{ kind: 'mail', mailAddress: 'PO Box 1, Fresno, CA' }],
    signerName: 'Owner Name',
    signerRole: 'owner',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
  };
}

console.log('\n5. Valid baseline -> canProduce true');
{
  const r = evaluateCanProduce(validBaseline());
  check('canProduce', r.canProduce === true, JSON.stringify(r.blockers));
  check('no blockers', r.blockers.length === 0);
  check('computed dates present', !!r.computedDates);
  if (has2026) check('expiration computed', r.computedDates?.expirationDate === '2026-06-04', r.computedDates?.expirationDate);
}

console.log('\n6. Each removed condition blocks (one at a time)');
{
  // dispute not cleared
  let d = validBaseline(); d.dispute = {};
  check('dispute blocks', !evaluateCanProduce(d).canProduce && hasBlocker(evaluateCanProduce(d).blockers, 'DISPUTE_NOT_CLEARED'));

  // missing address
  d = validBaseline(); d.propertyAddress = '';
  check('missing address blocks', hasBlocker(evaluateCanProduce(d).blockers, 'PROPERTY_ADDRESS_MISSING'));

  // no tenant
  d = validBaseline(); d.tenantNames = [];
  check('no tenant blocks', hasBlocker(evaluateCanProduce(d).blockers, 'NO_TENANT'));

  // no rent periods
  d = validBaseline(); d.rentPeriods = [];
  check('no rent periods blocks', hasBlocker(evaluateCanProduce(d).blockers, 'NO_RENT_PERIODS'));

  // base rent not confirmed
  d = validBaseline(); d.baseRentOnlyConfirmed = false;
  check('base rent not confirmed blocks', hasBlocker(evaluateCanProduce(d).blockers, 'BASE_RENT_NOT_CONFIRMED'));

  // invalid payment (empty)
  d = validBaseline(); d.paymentMethods = [];
  check('invalid payment blocks', hasBlocker(evaluateCanProduce(d).blockers, 'PAYMENT_METHODS_INVALID'));

  // missing signer
  d = validBaseline(); d.signerName = '';
  check('missing signer blocks', hasBlocker(evaluateCanProduce(d).blockers, 'SIGNER_MISSING'));

  // missing service date
  d = validBaseline(); d.serviceDate = undefined;
  check('missing service date blocks', hasBlocker(evaluateCanProduce(d).blockers, 'SERVICE_DATE_OR_METHOD_MISSING'));
}

console.log('\n7. SAFETY: LA-ish address blocks production (jurisdiction)');
{
  const d = validBaseline();
  d.propertyAddress = '456 Spring St, Los Angeles, CA 90013';
  d.propertyCity = 'Los Angeles';
  const r = evaluateCanProduce(d);
  check('LA-ish blocks', !r.canProduce);
  check('blocker is NEEDS_CONFIRMATION', hasBlocker(r.blockers, 'JURISDICTION_NEEDS_CONFIRMATION'));
}

console.log('\n8. SAFETY: hard-block city blocks production');
{
  const d = validBaseline();
  d.propertyAddress = '1 Market St, San Francisco, CA 94105';
  d.propertyCity = 'San Francisco';
  const r = evaluateCanProduce(d);
  check('SF blocks', !r.canProduce && hasBlocker(r.blockers, 'JURISDICTION_BLOCK_OVERLAY_CITY'));
}

console.log('\n9. Broker signer without authority evidence blocks');
{
  const d = validBaseline();
  d.signerRole = 'authorized_agent_broker';
  d.authorityEvidenceOnFile = undefined;
  const r = evaluateCanProduce(d);
  check('broker w/o authority blocks', hasBlocker(r.blockers, 'AUTHORITY_EVIDENCE_MISSING'));

  d.authorityEvidenceOnFile = true;
  check('broker w/ authority ok', evaluateCanProduce(d).canProduce === true, JSON.stringify(evaluateCanProduce(d).blockers));
}

console.log('\n10. Unverified-year service date blocks (date engine throws -> caught)');
{
  const d = validBaseline();
  d.serviceDate = '2099-06-01'; // no holiday table for 2099
  const r = evaluateCanProduce(d);
  check('unverified year blocks', !r.canProduce && hasBlocker(r.blockers, 'DATES_NOT_COMPUTABLE'));
}

console.log('\n11. Multiple missing conditions all surface together');
{
  const d = validBaseline();
  d.tenantNames = [];
  d.paymentMethods = [];
  d.baseRentOnlyConfirmed = false;
  const r = evaluateCanProduce(d);
  check('3+ blockers', r.blockers.length >= 3, `got ${r.blockers.length}`);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
