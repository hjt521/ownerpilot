import { evaluateCanProduceV4 } from './gates';
import type { NoticeFlowData } from './noticeFlowState';
import { individualLandlord, entityLandlord } from './landlord.fixture';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function codes(r: ReturnType<typeof evaluateCanProduceV4>): string[] {
  return r.blockers.map((b) => b.code);
}
function has(r: ReturnType<typeof evaluateCanProduceV4>, code: string): boolean {
  return codes(r).includes(code);
}
// The blockers this slice is responsible for. We assert on these directly
// rather than on the total count, so the test is robust to the real
// date/holiday/jurisdiction engines on the build machine.
const V4_MANAGED = [
  'PAYMENT_CONFIG_INVALID', 'BANK_5_MILE_NOT_VERIFIED', 'SIGNER_MISSING',
  'SIGNER_ROLE_MISSING', 'NO_TENANT', 'NO_RENT_PERIODS', 'BASE_RENT_NOT_CONFIRMED',
  'PROPERTY_ADDRESS_MISSING', 'DISPUTE_NOT_CLEARED',
];
function noManagedBlockers(r: ReturnType<typeof evaluateCanProduceV4>): boolean {
  return V4_MANAGED.every((c) => !has(r, c));
}

/** A fully valid v4 configuration. (Wording sign-off is now LIVE, so this
 *  produces; it no longer hangs on the sign-off gate.) */
function validV4(): NoticeFlowData {
  return {
    dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    propertyAddress: '442 Fresno St, Fresno, CA 93701',
    propertyCounty: 'Fresno',
    tenantNames: ['Jason Kim'],
    rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 }],
    baseRentOnlyConfirmed: true,
    paymentMethods: [], // legacy field unused by v4 gate
    landlordContact: { name: 'Jack Tah', phone: '(559) 555-0142', streetAddress: '4336 Prospect Ave, Los Angeles, CA 90028' },
    paymentBranch: 'mail_only',
    signerName: 'Jack Tah',
    ...individualLandlord('owner', { names: ['Jack Tah'] }),
    signingDate: '2026-06-02', // B1: execution date (<= service date)
    serviceDate: '2026-06-02',
    serviceMethod: 'personal',
  };
}

console.log('\n=== v4 produce gate ===\n');

console.log('1. Fully valid config PRODUCES (wording sign-off is live)');
{
  const r = evaluateCanProduceV4(validV4());
  check('can produce', r.canProduce === true, `blockers: ${codes(r).join(', ')}`);
  check('no TEMPLATE_NOT_SIGNED_OFF (wording signed off)', !has(r, 'TEMPLATE_NOT_SIGNED_OFF'));
  check('no v4-managed blockers on a valid config', noManagedBlockers(r), `got: ${codes(r).join(', ')}`);
  check('reports template version', r.templateVersion.startsWith('v4-'));
}

console.log('2. Wording sign-off is live: TEMPLATE_NOT_SIGNED_OFF never blocks; broken configs still fail for their own reasons');
{
  const broken = validV4(); delete broken.signerName;
  const r = evaluateCanProduceV4(broken);
  check('no sign-off blocker (wording signed off)', !has(r, 'TEMPLATE_NOT_SIGNED_OFF'));
  check('broken config still cannot produce', !r.canProduce);
  check('fails for the real reason (missing signer)', has(r, 'SIGNER_MISSING'));
}

console.log('3. § 1161(2) payee trio gates payment config');
{
  const noPhone = validV4(); noPhone.landlordContact = { name: 'Jack Tah', streetAddress: '4336 Prospect Ave' };
  const r = evaluateCanProduceV4(noPhone);
  check('missing payee phone -> PAYMENT_CONFIG_INVALID', has(r, 'PAYMENT_CONFIG_INVALID'));
  check('phone error surfaced for field UI', r.paymentErrors.some((e) => e.code === 'CONTACT_PHONE_REQUIRED'));
}

console.log('4. Bank-deposit branch: 5-mile production gate (ruling C2)');
{
  const bank = validV4();
  bank.paymentBranch = 'bank_deposit';
  bank.bankName = 'Bank of the West';
  bank.bankBranchAddress = '10 Bank St, Fresno, CA 93701';
  bank.bankAccountNumber = '0001234567';
  bank.bankDepositPaperInstrumentConfirmed = true;
  // No within-5-miles attestation yet:
  const r1 = evaluateCanProduceV4(bank);
  check('bank w/o 5-mile attestation blocks production', has(r1, 'BANK_5_MILE_NOT_VERIFIED'));
  check('5-mile surfaced as intake warning too', r1.paymentWarnings.some((w) => w.code === 'BANK_5_MILE_UNVERIFIED'));

  bank.bankBranchWithinFiveMilesAttested = true;
  const r2 = evaluateCanProduceV4(bank);
  check('bank with attestation clears bank gates', !has(r2, 'BANK_5_MILE_NOT_VERIFIED') && !has(r2, 'PAYMENT_CONFIG_INVALID'),
    `got: ${codes(r2).join(', ')}`);
  check('produces once bank gates clear (sign-off live)', r2.canProduce === true, `got: ${codes(r2).join(', ')}`);
}

console.log('5. Bank-deposit without paper instrument is invalid (Decision 1)');
{
  const bank = validV4();
  bank.paymentBranch = 'bank_deposit';
  bank.bankName = 'Bank of the West';
  bank.bankBranchAddress = '10 Bank St, Fresno, CA 93701';
  bank.bankAccountNumber = '0001234567';
  bank.bankBranchWithinFiveMilesAttested = true;
  bank.bankDepositPaperInstrumentConfirmed = false; // not confirmed
  const r = evaluateCanProduceV4(bank);
  check('no paper instrument -> PAYMENT_CONFIG_INVALID', has(r, 'PAYMENT_CONFIG_INVALID'));
  check('paper-instrument error surfaced', r.paymentErrors.some((e) => e.code === 'BANK_PAPER_INSTRUMENT_REQUIRED'));
}

console.log('6. Other gates still fire under v4');
{
  const noSigner = validV4(); delete noSigner.signerName;
  check('missing signer', has(evaluateCanProduceV4(noSigner), 'SIGNER_MISSING'));

  const dispute = validV4(); dispute.dispute = { tenantBankruptcy: 'yes' };
  check('dispute not cleared', has(evaluateCanProduceV4(dispute), 'DISPUTE_NOT_CLEARED'));

  const noDates = validV4(); delete noDates.serviceDate;
  check('missing service date', has(evaluateCanProduceV4(noDates), 'SERVICE_DATE_OR_METHOD_MISSING'));

  const noTenant = validV4(); noTenant.tenantNames = [];
  check('no tenant', has(evaluateCanProduceV4(noTenant), 'NO_TENANT'));
}

console.log('7. in_person_and_mail with P.O. box payee address is invalid');
{
  const d = validV4();
  d.paymentBranch = 'in_person_and_mail';
  d.personalDeliveryDays = 'Monday through Friday';
  d.personalDeliveryHours = '9:00 a.m. to 5:00 p.m.';
  d.landlordContact = { name: 'Jack Tah', phone: '5595550142', streetAddress: 'P.O. Box 55, Fresno, CA 93701' };
  const r = evaluateCanProduceV4(d);
  check('PO box on in-person -> PAYMENT_CONFIG_INVALID', has(r, 'PAYMENT_CONFIG_INVALID'));
  check('PO box error surfaced', r.paymentErrors.some((e) => e.code === 'PERSONAL_DELIVERY_POBOX'));
}

console.log('8. Entity landlord: production OPEN (Defect #3 countersigned 2026-06-05; gate lifted)');
{
  const e = validV4();
  Object.assign(e, entityLandlord('officer_member_trustee')); // entity + signerTitle 'Managing Member'
  const r = evaluateCanProduceV4(e);
  check('entity can produce now', r.canProduce === true, `blockers: ${codes(r).join(', ')}`);
  check('ENTITY_LANDLORD_NOT_SUPPORTED no longer fires', !has(r, 'ENTITY_LANDLORD_NOT_SUPPORTED'));
}

console.log('9. Entity landlord without a signer title: SIGNER_TITLE_REQUIRED blocks (fail closed)');
{
  const e = validV4();
  Object.assign(e, entityLandlord('officer_member_trustee'));
  delete e.signerTitle;
  const r = evaluateCanProduceV4(e);
  check('blocked without entity title', r.canProduce === false);
  check('SIGNER_TITLE_REQUIRED fires', has(r, 'SIGNER_TITLE_REQUIRED'));
  check('ENTITY_LANDLORD_NOT_SUPPORTED still gone', !has(r, 'ENTITY_LANDLORD_NOT_SUPPORTED'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
