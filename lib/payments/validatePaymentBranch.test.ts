import {
  validatePaymentBranch,
  isUsPhone,
  looksLikePoBox,
  PaymentBranchInput,
} from './validatePaymentBranch';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function hasError(r: ReturnType<typeof validatePaymentBranch>, code: string): boolean {
  return r.errors.some((e) => e.code === code);
}
function hasWarning(r: ReturnType<typeof validatePaymentBranch>, code: string): boolean {
  return r.warnings.some((w) => w.code === code);
}

const contact = { name: 'Jack Tah', phone: '(559) 555-0142', streetAddress: '442 Fresno St, Fresno, CA 93701' };

function mailOnly(): PaymentBranchInput {
  return { landlordContact: { ...contact }, paymentBranch: 'mail_only' };
}
function inPersonAndMail(): PaymentBranchInput {
  return {
    landlordContact: { ...contact },
    paymentBranch: 'in_person_and_mail',
    personalDeliveryDays: 'Monday through Friday',
    personalDeliveryHours: '9:00 a.m. to 5:00 p.m.',
  };
}
function bankDeposit(): PaymentBranchInput {
  return {
    landlordContact: { ...contact },
    paymentBranch: 'bank_deposit',
    bankName: 'Bank of the West',
    bankBranchAddress: '10 Bank St, Fresno, CA 93701',
    bankAccountNumber: '0001234567',
    bankDepositPaperInstrumentConfirmed: true,
    bankBranchWithinFiveMilesAttested: true,
  };
}

console.log('\n=== Phone + P.O.-box helpers ===\n');
console.log('0. Helpers');
{
  check('10-digit ok', isUsPhone('5595550142'));
  check('formatted ok', isUsPhone('(559) 555-0142'));
  check('11-digit leading 1 ok', isUsPhone('1-559-555-0142'));
  check('too short rejected', !isUsPhone('555-0142'));
  check('empty rejected', !isUsPhone(undefined));
  check('PO Box detected', looksLikePoBox('P.O. Box 123'));
  check('PO Box no dots detected', looksLikePoBox('PO Box 9'));
  check('Post Office Box detected', looksLikePoBox('Post Office Box 5'));
  check('street address not a PO box', !looksLikePoBox('442 Fresno St'));
}

console.log('\n=== Happy paths (each branch) ===\n');
console.log('1. Valid configurations');
{
  check('mail_only valid', validatePaymentBranch(mailOnly()).valid);
  check('in_person_and_mail valid', validatePaymentBranch(inPersonAndMail()).valid);
  check('bank_deposit valid (paper + 5mi attested)', validatePaymentBranch(bankDeposit()).valid);
  check('mailbox rule applies on mail_only', validatePaymentBranch(mailOnly()).mailboxRuleApplies);
  check('mailbox rule applies on bank_deposit', validatePaymentBranch(bankDeposit()).mailboxRuleApplies);
}

console.log('\n=== § 1161(2) payee trio ===\n');
console.log('2. Test 1 (spec): rejects missing phone, cites § 1161(2)');
{
  const d = mailOnly(); d.landlordContact = { name: contact.name, streetAddress: contact.streetAddress };
  const r = validatePaymentBranch(d);
  check('missing phone invalid', !r.valid);
  check('phone error present', hasError(r, 'CONTACT_PHONE_REQUIRED'));
  check('error cites § 1161(2)', r.errors.some((e) => e.message.includes('1161(2)')));
}
console.log('3. Bad phone format rejected');
{
  const d = mailOnly(); d.landlordContact = { ...contact, phone: '555' };
  check('format error', hasError(validatePaymentBranch(d), 'CONTACT_PHONE_FORMAT'));
}
console.log('4. Test 2 (spec): mail_only without street address rejected');
{
  const d = mailOnly(); d.landlordContact = { name: contact.name, phone: contact.phone };
  check('missing address invalid', hasError(validatePaymentBranch(d), 'CONTACT_ADDRESS_REQUIRED'));
}
console.log('5. Payee name is derived; only the override name is validated here (Defect #2)');
{
  // Typed landlordContact.name is retired — its absence is no longer an error.
  const d = mailOnly(); d.landlordContact = { phone: contact.phone, streetAddress: contact.streetAddress };
  check('missing typed name is NOT an error', !hasError(validatePaymentBranch(d), 'PAYEE_OVERRIDE_NAME_REQUIRED'));
  check('config without typed name still valid', validatePaymentBranch(d).valid);

  // With the non-landlord override ON, the override name must be present.
  const blank = mailOnly(); blank.payeeIsNonLandlord = true; blank.payeeOverrideName = '   ';
  check('override on + blank override name rejected', hasError(validatePaymentBranch(blank), 'PAYEE_OVERRIDE_NAME_REQUIRED'));
  const ok = mailOnly(); ok.payeeIsNonLandlord = true; ok.payeeOverrideName = 'Westside Property Management, Inc.';
  check('override on + present override name ok',
    !hasError(validatePaymentBranch(ok), 'PAYEE_OVERRIDE_NAME_REQUIRED') && validatePaymentBranch(ok).valid);
}

console.log('\n=== in_person_and_mail branch ===\n');
console.log('6. Test 3 (spec): rejects missing days/hours');
{
  const noDays = inPersonAndMail(); delete noDays.personalDeliveryDays;
  check('missing days', hasError(validatePaymentBranch(noDays), 'PERSONAL_DELIVERY_DAYS_REQUIRED'));
  const noHours = inPersonAndMail(); delete noHours.personalDeliveryHours;
  check('missing hours', hasError(validatePaymentBranch(noHours), 'PERSONAL_DELIVERY_HOURS_REQUIRED'));
}
console.log('7. Test 4 (spec): rejects P.O. box on personal-delivery branch');
{
  const d = inPersonAndMail(); d.landlordContact = { ...contact, streetAddress: 'P.O. Box 123, Fresno, CA 93701' };
  const r = validatePaymentBranch(d);
  check('PO box on in-person rejected', hasError(r, 'PERSONAL_DELIVERY_POBOX'));
  check('PO box flag set', r.listedAddressLooksLikePoBox);
  check('mailbox rule forced by PO box', r.mailboxRuleApplies);
}

console.log('\n=== bank_deposit branch (Decision 1 + C2) ===\n');
console.log('8. Decision 1: paper-instrument required for § 1947.3');
{
  const noPaper = bankDeposit(); noPaper.bankDepositPaperInstrumentConfirmed = false;
  check('bank w/o paper instrument invalid', hasError(validatePaymentBranch(noPaper), 'BANK_PAPER_INSTRUMENT_REQUIRED'));
}
console.log('9. Bank field completeness');
{
  const noName = bankDeposit(); delete noName.bankName;
  check('missing bank name', hasError(validatePaymentBranch(noName), 'BANK_NAME_REQUIRED'));
  const noAcct = bankDeposit(); delete noAcct.bankAccountNumber;
  check('missing account', hasError(validatePaymentBranch(noAcct), 'BANK_ACCOUNT_REQUIRED'));
}
console.log('10. Test 5 (spec): 5-mile not silently accepted (warns, not error)');
{
  const noAttest = bankDeposit(); noAttest.bankBranchWithinFiveMilesAttested = false;
  const r = validatePaymentBranch(noAttest);
  check('5-mile missing still well-formed at intake', r.valid);
  check('5-mile missing surfaces a warning (not silent)', hasWarning(r, 'BANK_5_MILE_UNVERIFIED'));
}

console.log('\n=== EFT add-on (Test 6 spec) ===\n');
console.log('11. EFT is add-on only; never primary; previously-established required');
{
  // There is no EFT branch — you cannot select EFT as the primary method.
  const eftAsPrimary = { landlordContact: { ...contact } } as PaymentBranchInput;
  (eftAsPrimary as { paymentBranch?: string }).paymentBranch = 'eft';
  check('EFT not a selectable branch', hasError(validatePaymentBranch(eftAsPrimary), 'BRANCH_INVALID'));

  const eftNoEstablish = mailOnly(); eftNoEstablish.eftElectionAvailable = true;
  check('EFT add-on requires previously-established', hasError(validatePaymentBranch(eftNoEstablish), 'EFT_NOT_PREVIOUSLY_ESTABLISHED'));

  const eftOk = mailOnly(); eftOk.eftElectionAvailable = true; eftOk.eftPreviouslyEstablishedConfirmed = true;
  check('EFT add-on valid when previously established + valid base branch', validatePaymentBranch(eftOk).valid);
}

console.log('\n=== Branch required ===\n');
console.log('12. No branch selected blocks');
{
  const d = { landlordContact: { ...contact } } as PaymentBranchInput;
  check('branch required', hasError(validatePaymentBranch(d), 'BRANCH_REQUIRED'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
