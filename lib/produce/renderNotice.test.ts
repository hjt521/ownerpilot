import {
  renderNotice,
  formatNoticeDate,
  formatCurrency,
  signerRoleLabel,
  NoticeRenderError,
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

const dates = { compliancePeriodStartDate: '2026-07-06', compliancePeriodEndDate: '2026-07-08' };
const contact = { name: 'Jack Tah', phone: '(559) 555-0142', streetAddress: '442 Fresno St, Fresno, CA 93701' };

function base(): NoticeFlowData {
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
    paymentMethods: [],
    landlordContact: { ...contact },
    paymentBranch: 'mail_only',
    signerName: 'Acme Property Mgmt',
    signerRole: 'authorized_agent_broker',
    serviceDate: '2026-07-03',
    serviceMethod: 'personal',
  };
}
function inPersonData(): NoticeFlowData {
  const d = base();
  d.paymentBranch = 'in_person_and_mail';
  d.personalDeliveryDays = 'Monday through Friday';
  d.personalDeliveryHours = '9:00 a.m. to 5:00 p.m.';
  return d;
}
function bankData(): NoticeFlowData {
  const d = base();
  d.paymentBranch = 'bank_deposit';
  d.bankName = 'Bank of the West';
  d.bankBranchAddress = '10 Bank St, Fresno, CA 93701';
  d.bankAccountNumber = '0001234567';
  d.bankDepositPaperInstrumentConfirmed = true;
  d.bankBranchWithinFiveMilesAttested = true;
  return d;
}

const out = renderNotice({ data: base(), dates });

console.log('\n=== Locked language preserved (Eshagian disclosures intact) ===\n');
console.log('1. Unchanged fixed language + dates on face');
{
  check('title', out.noticeText.includes('THREE-DAY NOTICE TO PAY RENT OR QUIT'));
  check('citation on face', out.noticeText.includes('California Code of Civil Procedure \u00A7 1161(2)'));
  check('hereby notified', out.noticeText.includes('YOU ARE HEREBY NOTIFIED that rent is now due and unpaid'));
  check('base rent only', out.noticeText.includes('The amount demanded above is base rent only.'));
  check('forfeiture election', out.noticeText.includes('The landlord hereby elects to declare a forfeiture of the lease or rental agreement'));
  check('holidays exclusion', out.noticeText.includes('excludes Saturdays, Sundays, and California judicial holidays'));
  check('commencement date on face', out.noticeText.includes('commences on July 6, 2026'));
  check('expiration date on face', out.noticeText.includes('expires at the end of the day on July 8, 2026'));
  check('sentence-case recipient', out.noticeText.includes('and all other tenants, subtenants, and occupants in possession of the premises located at:'));
  check('total + itemization', out.noticeText.includes('TOTAL DUE: $4,000.00') && out.noticeText.includes('Rent for the period May 1, 2026 through May 31, 2026: $2,000.00'));
  check('county line', out.noticeText.includes('County of Fresno, California'));
  check('signer block', out.noticeText.includes('Acme Property Mgmt') && out.noticeText.includes('Authorized Agent for Owner') && out.noticeText.includes('Dated: July 3, 2026'));
}

console.log('\n=== v4 HOW TO PAY: § 1161(2) payee trio ===\n');
console.log('2. Payable to + Telephone (mail_only)');
{
  check('Payable to payee (not signer)', out.noticeText.includes('Payable to: Jack Tah'));
  check('Telephone line present', out.noticeText.includes('Telephone: (559) 555-0142'));
  check('By mail to address', out.noticeText.includes('By mail to: 442 Fresno St, Fresno, CA 93701'));
  check('mailbox-rule sentence', out.noticeText.includes('conclusively presumed received on the date posted'));
}

console.log('3. in_person_and_mail branch');
{
  const r = renderNotice({ data: inPersonData(), dates });
  check('in person or by mail label', r.noticeText.includes('In person or by mail to: 442 Fresno St, Fresno, CA 93701'));
  check('personal delivery days/hours', r.noticeText.includes('Available for personal delivery: Monday through Friday, 9:00 a.m. to 5:00 p.m.'));
  check('mailbox-rule still present (in case tenant mails)', r.noticeText.includes('conclusively presumed received on the date posted'));
}

console.log('4. bank_deposit branch');
{
  const r = renderNotice({ data: bankData(), dates });
  check('bank name', r.noticeText.includes('Bank: Bank of the West'));
  check('branch address', r.noticeText.includes('Branch: 10 Bank St, Fresno, CA 93701'));
  check('account number', r.noticeText.includes('Account number: 0001234567'));
  check('paper instrument sentence', r.noticeText.includes('may be made by check, money order, or cashier\u2019s check'));
  check('5-mile sentence', r.noticeText.includes('within five miles of the rental property'));
  check('mailbox-rule sentence', r.noticeText.includes('conclusively presumed received on the date posted'));
}

console.log('5. EFT add-on (only when previously established)');
{
  const d = base(); d.eftElectionAvailable = true; d.eftPreviouslyEstablishedConfirmed = true;
  const r = renderNotice({ data: d, dates });
  check('EFT sentence present when previously established', r.noticeText.includes('previously established an electronic funds transfer procedure'));
  check('no EFT sentence by default', !out.noticeText.includes('electronic funds transfer'));
}

console.log('\n=== Structured model ===\n');
console.log('6. model.pay reflects branch + payee + rows + sentences');
{
  check('branch', out.model.pay.branch === 'mail_only');
  check('payee name', out.model.pay.payeeName === 'Jack Tah');
  check('payee phone', out.model.pay.payeePhone === '(559) 555-0142');
  check('mail row', out.model.pay.rows.some((r) => r.label === 'By mail to' && r.value === '442 Fresno St, Fresno, CA 93701'));
  check('mailbox-rule in sentences', out.model.pay.sentences.some((s) => s.includes('conclusively presumed')));
  const bank = renderNotice({ data: bankData(), dates });
  check('bank model rows (3)', bank.model.pay.rows.length === 3);
  check('bank model sentences (paper + 5mi + mailbox)', bank.model.pay.sentences.length === 3);
  check('audit captures branch + payee', out.variablesUsed.payment_branch === 'mail_only' && out.variablesUsed.payee_phone === '(559) 555-0142');
}

console.log('\n=== Proof of service blank ===\n');
console.log('7. POS unchanged, blank, tenant present');
{
  check('POS heading', out.proofOfServiceText.includes('PROOF OF SERVICE'));
  check('server blank (not signer)', !out.proofOfServiceText.includes('Acme Property Mgmt'));
  check('tenant in POS', out.proofOfServiceText.includes('Jane Doe, John Doe'));
  check('penalty of perjury', out.proofOfServiceText.includes('penalty of perjury under the laws of the State of California'));
}

console.log('\n=== Fail closed ===\n');
console.log('8. Missing required v4 fields throw');
{
  const noName = base(); noName.landlordContact = { phone: contact.phone, streetAddress: contact.streetAddress };
  check('missing payee name throws', throws(() => renderNotice({ data: noName, dates })));
  const noPhone = base(); noPhone.landlordContact = { name: contact.name, streetAddress: contact.streetAddress };
  check('missing payee phone throws', throws(() => renderNotice({ data: noPhone, dates })));
  const noAddr = base(); noAddr.landlordContact = { name: contact.name, phone: contact.phone };
  check('missing payee address throws', throws(() => renderNotice({ data: noAddr, dates })));
  const noBranch = base(); delete noBranch.paymentBranch;
  check('missing branch throws', throws(() => renderNotice({ data: noBranch, dates })));
  const noDays = inPersonData(); delete noDays.personalDeliveryDays;
  check('in-person missing days throws', throws(() => renderNotice({ data: noDays, dates })));
  const noPaper = bankData(); noPaper.bankDepositPaperInstrumentConfirmed = false;
  check('bank w/o paper instrument throws', throws(() => renderNotice({ data: noPaper, dates })));
  const eftNoEst = base(); eftNoEst.eftElectionAvailable = true;
  check('EFT add-on w/o previously-established throws', throws(() => renderNotice({ data: eftNoEst, dates })));
  let isType = false;
  try { renderNotice({ data: noName, dates }); } catch (e) { isType = e instanceof NoticeRenderError; }
  check('throws NoticeRenderError', isType);
}

console.log('\n=== County optional + helpers ===\n');
console.log('9. County optional; helpers');
{
  const noCounty = base(); delete noCounty.propertyCounty;
  const r = renderNotice({ data: noCounty, dates });
  check('omitted county drops line', !r.noticeText.includes('County of'));
  check('model omits county', r.model.recipient.propertyCounty === undefined);
  check('date helper', formatNoticeDate('2026-07-03') === 'July 3, 2026');
  check('currency helper', formatCurrency(4000) === '4,000.00');
  check('owner label', signerRoleLabel('owner') === 'Owner');
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
