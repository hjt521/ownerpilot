import {
  renderNotice,
  formatNoticeDate,
  formatCurrency,
  signerRoleLabel,
  NoticeRenderError,
  RenderNoticeInput,
} from './renderNotice';
import type { NoticeFlowData } from '../flow/noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function throws(fn: () => unknown): boolean {
  try { fn(); return false; } catch { return true; }
}

function fullData(): NoticeFlowData {
  return {
    dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    propertyAddress: '123 Main St, Fresno, CA 93701',
    propertyCounty: 'Fresno',
    tenantNames: ['Jane Doe', 'John Doe'],
    rentPeriods: [
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2000 },
      { periodStartDate: '2026-06-01', periodEndDate: '2026-06-30', amount: 2000 },
    ],
    baseRentOnlyConfirmed: true,
    paymentMethods: [
      { kind: 'in_person', daysHours: 'Mon-Fri 9am-5pm' },
      { kind: 'mail', mailAddress: '500 Office Rd, Fresno, CA 93701' },
    ],
    signerName: 'Acme Property Mgmt',
    signerRole: 'authorized_agent_broker',
    serviceDate: '2026-07-03',
    serviceMethod: 'personal',
  };
}
const dates = { compliancePeriodStartDate: '2026-07-06', compliancePeriodEndDate: '2026-07-08' };

console.log('\n=== Formatting helpers ===\n');
console.log('1. Date + currency + role formatting');
{
  check('date formats long', formatNoticeDate('2026-07-03') === 'July 3, 2026');
  check('currency 2dp + thousands', formatCurrency(4000) === '4,000.00');
  check('owner label', signerRoleLabel('owner') === 'Owner');
  check('broker label', signerRoleLabel('authorized_agent_broker') === 'Authorized Agent for Owner');
  check('bad date throws', throws(() => formatNoticeDate('07/03/2026')));
}

console.log('\n=== Happy-path render ===\n');
const out = renderNotice({ data: fullData(), dates });
console.log('2. Locked fixed language present, verbatim');
{
  check('title', out.noticeText.includes('THREE-DAY NOTICE TO PAY RENT OR QUIT'));
  check('hereby notified', out.noticeText.includes('YOU ARE HEREBY NOTIFIED that rent is now due and unpaid'));
  check('base rent only sentence', out.noticeText.includes('The amount demanded above is base rent only.'));
  check('forfeiture election verbatim', out.noticeText.includes('The landlord hereby elects to declare a forfeiture of the lease or rental agreement'));
  check('judicial holidays exclusion', out.noticeText.includes('excludes Saturdays, Sundays, and California judicial holidays'));
}

console.log('3. Computed dates appear ON THE FACE (post-Eshagian)');
{
  check('commencement date on face', out.noticeText.includes('commences on July 6, 2026'));
  check('expiration date on face', out.noticeText.includes('expires at the end of the day on July 8, 2026'));
  check('expiration repeated in warning', out.noticeText.includes('by the end of July 8, 2026'));
}

console.log('4. Tenants, property, county, dated line');
{
  check('both tenants joined', out.noticeText.includes('Jane Doe, John Doe'));
  check('address', out.noticeText.includes('123 Main St, Fresno, CA 93701'));
  check('county line', out.noticeText.includes('County of Fresno, California'));
  check('dated service date', out.noticeText.includes('Dated: July 3, 2026'));
  check('signer name + role', out.noticeText.includes('Acme Property Mgmt') && out.noticeText.includes('Authorized Agent for Owner'));
}

console.log('5. Demand range + itemization + total');
{
  check('covered range', out.noticeText.includes('for the period May 1, 2026 through June 30, 2026'));
  check('per-period line 1', out.noticeText.includes('Rent for the period May 1, 2026 through May 31, 2026: $2,000.00'));
  check('per-period line 2', out.noticeText.includes('Rent for the period June 1, 2026 through June 30, 2026: $2,000.00'));
  check('total demanded', out.noticeText.includes('TOTAL DUE: $4,000.00'));
}

console.log('6. Payment method conditional blocks');
{
  check('in-person block + hours', out.noticeText.includes('In person:') && out.noticeText.includes('Mon-Fri 9am-5pm'));
  check('mail block + address', out.noticeText.includes('By mail: Payment may be mailed to: 500 Office Rd, Fresno, CA 93701.'));
  check('no bank block (not offered)', !out.noticeText.includes('By deposit to a financial institution'));
  check('no eft block (not offered)', !out.noticeText.includes('electronic funds transfer'));
}

console.log('7. Proof of service rendered BLANK (filled after service)');
{
  check('has POS heading', out.proofOfServiceText.includes('PROOF OF SERVICE'));
  check('server name blank, not landlord', !out.proofOfServiceText.includes('Acme Property Mgmt'));
  check('tenant names present in POS', out.proofOfServiceText.includes('Jane Doe, John Doe'));
  check('all three service methods present', out.proofOfServiceText.includes('Personal service') && out.proofOfServiceText.includes('Substituted service') && out.proofOfServiceText.includes('Posting and mailing'));
  check('penalty of perjury', out.proofOfServiceText.includes('penalty of perjury under the laws of the State of California'));
}

console.log('8. Audit record of variables used');
{
  check('captures computed dates', out.variablesUsed.compliance_period_start_date === '2026-07-06' && out.variablesUsed.compliance_period_end_date === '2026-07-08');
  check('captures total', out.variablesUsed.total_rent_due === '4,000.00');
  check('captures tenants', out.variablesUsed.tenant_names_joined === 'Jane Doe, John Doe');
}

console.log('\n=== Fail closed (never emit a defective notice) ===\n');
console.log('9. Missing required fields throw NoticeRenderError');
{
  const noAddr = fullData(); delete noAddr.propertyAddress;
  check('missing address throws', throws(() => renderNotice({ data: noAddr, dates })));
  const noCounty = fullData(); delete noCounty.propertyCounty;
  check('missing county throws', throws(() => renderNotice({ data: noCounty, dates })));
  const noTenant = fullData(); noTenant.tenantNames = [];
  check('no tenants throws', throws(() => renderNotice({ data: noTenant, dates })));
  const noBaseRent = fullData(); noBaseRent.baseRentOnlyConfirmed = false;
  check('unconfirmed base-rent throws', throws(() => renderNotice({ data: noBaseRent, dates })));
  const noSigner = fullData(); delete noSigner.signerName;
  check('missing signer throws', throws(() => renderNotice({ data: noSigner, dates })));
  const noPay = fullData(); noPay.paymentMethods = [];
  check('no payment methods throws', throws(() => renderNotice({ data: noPay, dates })));
  const cashOnly = fullData(); cashOnly.paymentMethods = [{ kind: 'cash' }];
  check('cash-only (no renderable block) throws', throws(() => renderNotice({ data: cashOnly, dates })));
}

console.log('10. error type is NoticeRenderError');
{
  const noAddr = fullData(); delete noAddr.propertyAddress;
  let isType = false;
  try { renderNotice({ data: noAddr, dates }); } catch (e) { isType = e instanceof NoticeRenderError; }
  check('throws NoticeRenderError', isType);
}

console.log('\n=== EFT + single tenant variants ===\n');
console.log('11. EFT block renders, single tenant');
{
  const d = fullData();
  d.tenantNames = ['Solo Tenant'];
  d.paymentMethods = [{ kind: 'mail', mailAddress: 'X' }, { kind: 'eft', previouslyEstablishedConfirmed: true }];
  const r = renderNotice({ data: d, dates });
  check('single tenant no comma', r.noticeText.includes('TO: Solo Tenant, AND ALL OTHER'));
  check('eft block present', r.noticeText.includes('electronic funds transfer procedure previously established'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
