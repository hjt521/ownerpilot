import {
  validatePaymentMethods,
  PaymentMethod,
} from './validatePaymentMethods';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function hasCode(errors: { code: string }[], code: string): boolean {
  return errors.some((e) => e.code === code);
}

console.log('\n1. Valid: in-person (with hours) + mail — satisfies the floor');
{
  const methods: PaymentMethod[] = [
    { kind: 'in_person', daysHours: 'Mon-Fri 9am-5pm' },
    { kind: 'by_mail', mailAddress: '123 Main St, Los Angeles, CA' },
  ];
  const r = validatePaymentMethods({ methods });
  check('valid', r.valid, JSON.stringify(r.errors));
  check('canContinue true', r.canContinue === true);
  check('no errors', r.errors.length === 0);
}

console.log('\n2. Empty set is invalid');
{
  const r = validatePaymentMethods({ methods: [] });
  check('invalid', !r.valid);
  check('NO_METHODS', hasCode(r.errors, 'NO_METHODS'));
  check('canContinue false', r.canContinue === false);
}

console.log('\n3. EFT alone fails the § 1947.3 floor AND lacks confirmation');
{
  const r = validatePaymentMethods({ methods: [{ kind: 'eft' }] });
  check('invalid', !r.valid);
  check('SECTION_1947_3_FLOOR', hasCode(r.errors, 'SECTION_1947_3_FLOOR'));
  check('EFT_NOT_PREVIOUSLY_ESTABLISHED', hasCode(r.errors, 'EFT_NOT_PREVIOUSLY_ESTABLISHED'));
}

console.log('\n4. EFT with confirmation still fails the floor (EFT does not satisfy § 1947.3)');
{
  const r = validatePaymentMethods({
    methods: [{ kind: 'eft', previouslyEstablishedConfirmed: true }],
  });
  check('invalid', !r.valid);
  check('floor error present', hasCode(r.errors, 'SECTION_1947_3_FLOOR'));
  check('no EFT-confirmation error', !hasCode(r.errors, 'EFT_NOT_PREVIOUSLY_ESTABLISHED'));
}

console.log('\n5. Cash only is invalid (cash cannot be sole method)');
{
  const r = validatePaymentMethods({ methods: [{ kind: 'cash' }] });
  check('invalid', !r.valid);
  check('CASH_ONLY', hasCode(r.errors, 'CASH_ONLY'));
  check('also fails floor', hasCode(r.errors, 'SECTION_1947_3_FLOOR'));
}

console.log('\n6. Cash + mail is valid (cash allowed when not sole, floor met by mail)');
{
  const r = validatePaymentMethods({
    methods: [
      { kind: 'cash' },
      { kind: 'by_mail', mailAddress: 'PO Box 5, LA, CA' },
    ],
  });
  check('valid', r.valid, JSON.stringify(r.errors));
  check('no CASH_ONLY', !hasCode(r.errors, 'CASH_ONLY'));
}

console.log('\n7. In-person without hours is invalid');
{
  const r = validatePaymentMethods({ methods: [{ kind: 'in_person' }] });
  check('invalid', !r.valid);
  check('IN_PERSON_HOURS_REQUIRED', hasCode(r.errors, 'IN_PERSON_HOURS_REQUIRED'));
}

console.log('\n8. Bank deposit: all fields + 5-mile confirmation required');
{
  // Missing everything
  const bad = validatePaymentMethods({ methods: [{ kind: 'bank_deposit' }, { kind: 'by_mail', mailAddress: 'x' }] });
  check('bank name required', hasCode(bad.errors, 'BANK_NAME_REQUIRED'));
  check('bank branch required', hasCode(bad.errors, 'BANK_BRANCH_REQUIRED'));
  check('bank account required', hasCode(bad.errors, 'BANK_ACCOUNT_REQUIRED'));
  check('5-mile unconfirmed', hasCode(bad.errors, 'BANK_5_MILE_UNCONFIRMED'));

  // Complete + confirmed, alongside a floor method
  const good = validatePaymentMethods({
    methods: [
      { kind: 'by_mail', mailAddress: 'x' },
      {
        kind: 'bank_deposit',
        bankName: 'Bank of X',
        branchAddress: '1 Bank St, LA, CA',
        accountNumber: '12345',
        within5MilesConfirmed: true,
      },
    ],
  });
  check('complete bank deposit valid', good.valid, JSON.stringify(good.errors));
}

console.log('\n9. Bank deposit alone fails the floor (deposit is not a § 1947.3 method)');
{
  const r = validatePaymentMethods({
    methods: [{
      kind: 'bank_deposit',
      bankName: 'B', branchAddress: 'A', accountNumber: '1',
      within5MilesConfirmed: true,
    }],
  });
  check('invalid', !r.valid);
  check('fails floor', hasCode(r.errors, 'SECTION_1947_3_FLOOR'));
}

console.log('\n10. Duplicate method kind is flagged');
{
  const r = validatePaymentMethods({
    methods: [
      { kind: 'by_mail', mailAddress: 'a' },
      { kind: 'by_mail', mailAddress: 'b' },
    ],
  });
  check('DUPLICATE_METHOD', hasCode(r.errors, 'DUPLICATE_METHOD'));
}

console.log('\n11. Multiple errors are all returned together');
{
  const r = validatePaymentMethods({
    methods: [
      { kind: 'in_person' },              // missing hours
      { kind: 'eft' },                    // missing confirmation
    ],
  });
  // in_person satisfies the floor, so no floor error; but two per-method errors:
  check('at least 2 errors', r.errors.length >= 2, `got ${r.errors.length}`);
  check('hours error', hasCode(r.errors, 'IN_PERSON_HOURS_REQUIRED'));
  check('eft error', hasCode(r.errors, 'EFT_NOT_PREVIOUSLY_ESTABLISHED'));
  check('no floor error (in_person satisfies floor)', !hasCode(r.errors, 'SECTION_1947_3_FLOOR'));
}

console.log('\n12. EFT requires By Mail (composition determination \u00a76)');
{
  const noMail = validatePaymentMethods({
    methods: [
      { kind: 'in_person', daysHours: 'Mon-Fri 9am-5pm' },
      { kind: 'eft', previouslyEstablishedConfirmed: true },
    ],
  });
  check('invalid without mail', !noMail.valid);
  check('EFT_REQUIRES_MAIL', hasCode(noMail.errors, 'EFT_REQUIRES_MAIL'));
  const withMail = validatePaymentMethods({
    methods: [
      { kind: 'by_mail', mailAddress: '1 A St, LA, CA' },
      { kind: 'eft', previouslyEstablishedConfirmed: true },
    ],
  });
  check('valid with mail', withMail.valid, JSON.stringify(withMail.errors));
  check('no EFT_REQUIRES_MAIL with mail', !hasCode(withMail.errors, 'EFT_REQUIRES_MAIL'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
