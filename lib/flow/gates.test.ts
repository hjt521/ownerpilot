import {
  evaluateDisputeScreen,
  evaluateCanProduce,
} from './gates';
import { NoticeFlowData, DisputeScreen } from './noticeFlowState';
import { individualLandlord } from './landlord.fixture';
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
    tenantFiledComplaint: 'no',
    tenantWrittenWithholding: 'no',
    tenantBankruptcy: 'no',
  });
  check('cleared', r.cleared === true);
  check('not blocked', r.blocked === false);
}

console.log('\n2. Unanswered -> NOT cleared, blocked (fails closed)');
{
  const r = evaluateDisputeScreen({ tenantFiledComplaint: 'no' });
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
  const a = evaluateDisputeScreen({ tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  const b = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'yes', tenantBankruptcy: 'no' });
  const c = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'yes' });
  check('complaint yes blocks', a.blocked && !a.cleared);
  check('withholding yes blocks', b.blocked && !b.cleared);
  check('bankruptcy yes blocks', c.blocked && !c.cleared);
  check('yes is hardBlocked', a.hardBlocked && b.hardBlocked && c.hardBlocked);
}

console.log('\n4b. Per-question "I don\u2019t know" policy (complaint proceeds; withholding/bankruptcy block)');
{
  // Complaint unknown PROCEEDS (lower stakes) when others are 'no'.
  const cu = evaluateDisputeScreen({ tenantFiledComplaint: 'unknown', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  check('complaint-unknown CLEARS (proceeds)', cu.cleared === true);
  check('complaint-unknown not hardBlocked', cu.hardBlocked === false);
  check('complaint-unknown flagged proceed_warning', cu.perQuestion.tenantFiledComplaint === 'proceed_warning');

  // Withholding unknown BLOCKS (habitability defense risk).
  const wu = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'unknown', tenantBankruptcy: 'no' });
  check('withholding-unknown does NOT clear', wu.cleared === false);
  check('withholding-unknown blocks', wu.blocked === true);
  check('withholding-unknown flagged blocking', wu.perQuestion.tenantWrittenWithholding === 'blocking');
  check('withholding-unknown not hardBlocked', wu.hardBlocked === false);

  // Bankruptcy unknown BLOCKS with the automatic-stay flag.
  const bu = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'unknown' });
  check('bankruptcy-unknown does NOT clear', bu.cleared === false);
  check('bankruptcy-unknown flagged', bu.bankruptcyUnknown === true);
  check('bankruptcy-unknown flagged blocking', bu.perQuestion.tenantBankruptcy === 'blocking');

  // The critical invariant: blocking-unknown is NEVER treated as 'no'.
  check('withholding-unknown never clears', wu.cleared === false);
  check('bankruptcy-unknown never clears', bu.cleared === false);
}

console.log('\n4b-2. Unanswered ALWAYS blocks, even on the proceed-policy question');
{
  // complaint is the proceed-on-unknown question, but UNANSWERED still blocks.
  const r = evaluateDisputeScreen({ tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' });
  check('unanswered complaint blocks', r.cleared === false && r.blocked === true);
  check('unanswered complaint flagged blocking', r.perQuestion.tenantFiledComplaint === 'blocking');
}

console.log('\n4c. yes + unknown together still hard-blocks (yes dominates)');
{
  const r = evaluateDisputeScreen({ tenantFiledComplaint: 'yes', tenantWrittenWithholding: 'no', tenantBankruptcy: 'unknown' });
  check('hardBlocked when a yes present', r.hardBlocked === true);
  check('not cleared', r.cleared === false);
}

console.log('\n=== Review gate (evaluateCanProduce) ===');

// A fully-valid baseline that SHOULD produce. Uses verified 2026 dates and a
// non-overlay city (Fresno) so jurisdiction is clean.
function validBaseline(): NoticeFlowData {
  return {
    dispute: {
      tenantFiledComplaint: 'no',
      tenantWrittenWithholding: 'no',
      tenantBankruptcy: 'no',
    },
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCity: 'Fresno',
    propertyCounty: 'Fresno',
    tenantNames: ['Jane Tenant'],
    rentPeriods: [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 2000 }],
    produceAttestationConfirmed: true,
    paymentMethods: [{ kind: 'mail', mailAddress: 'PO Box 1, Fresno, CA' }],
    signerName: 'Owner Name',
    ...individualLandlord('owner'),
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
  d = validBaseline(); d.produceAttestationConfirmed = false;
  check('produce attestation not confirmed blocks', hasBlocker(evaluateCanProduce(d).blockers, 'PRODUCE_ATTESTATION_MISSING'));

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
  Object.assign(d, individualLandlord('broker_or_manager'));
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
  d.produceAttestationConfirmed = false;
  const r = evaluateCanProduce(d);
  check('3+ blockers', r.blockers.length >= 3, `got ${r.blockers.length}`);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);


// --- C5 soft-mode safety screen (flag ON) ----------------------------------
console.log('\nC5. Safety screen soft mode');
{
  const base: DisputeScreen = { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' };
  // Hard mode unchanged: a 'yes' hard-blocks.
  const hardYes = evaluateDisputeScreen({ ...base, tenantBankruptcy: 'yes' });
  check('hard mode: bankruptcy yes blocks', hardYes.cleared === false && hardYes.hardBlocked === true);
  // Soft mode: a 'yes' flags but does NOT hard-block; screen is cleared.
  const softYes = evaluateDisputeScreen({ ...base, tenantBankruptcy: 'yes' }, true);
  check('soft mode: bankruptcy yes flagged not hard-blocked', softYes.flagged === true && softYes.hardBlocked === false && softYes.cleared === true);
  // Soft mode: an 'unknown' flags + cleared.
  const softUnk = evaluateDisputeScreen({ ...base, tenantWrittenWithholding: 'unknown' }, true);
  check('soft mode: unknown flags + cleared', softUnk.flagged === true && softUnk.cleared === true);
  // Soft mode: an UNANSWERED question still blocks (needsCheck).
  const softUnanswered = evaluateDisputeScreen({ tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no' }, true);
  check('soft mode: unanswered blocks', softUnanswered.cleared === false && softUnanswered.needsCheck === true);
  // Soft mode: all 'no' -> not flagged, cleared.
  const softClean = evaluateDisputeScreen({ ...base }, true);
  check('soft mode: all no -> clean', softClean.flagged === false && softClean.cleared === true);
}
