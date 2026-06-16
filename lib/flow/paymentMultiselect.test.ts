/**
 * C7a multi-select payment coverage.
 * Repo test convention (inline check() runner, top-level execution, ✓/✗ output).
 * Run with: npx tsx lib/flow/paymentMultiselect.test.ts
 *
 * Covers the broker determinations 2026-06-15:
 *   - c7a_multiselect_face_review_broker_determination (validator matrix + 2 sentences)
 *   - c7a_inperson_layout_broker_determination (inPersonOnlyLabel, rows 1 & 6)
 *   - c1_pobox_scope_multiselect_broker_determination (P.O.-box fires on any in-person leg)
 *
 * Sections:
 *   1. Validator matrix — 11 valid combinations, 4 disallowed (with codes).
 *   2. syncMethods dual-write — derived array agrees with the validator.
 *   3. looksLikePoBox detector — §3 forms + the "123 PO Box Street" negative.
 *   4. Renderer closure sentences — rows 1 & 6 render the locked closure sentence;
 *      mail-bearing faces do not.
 */
import { validatePaymentMethods } from '../payments/validatePaymentMethods';
import type { PaymentMethod } from '../payments/validatePaymentMethods';
import { syncMethods } from '../payments/syncMethods';
import { looksLikePoBox } from '../payments/validatePaymentBranch';
import { renderNotice, type ComputedNoticeDates } from '../produce/renderNotice';
import type { NoticeFlowData } from './noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`);
  }
}

// Top-level fixture with every detail field filled, so syncMethods can build a
// complete method array for any selected kind set.
const FULL: NoticeFlowData = {
  dispute: {},
  tenantNames: ['Jane Tenant'],
  rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 2000 }],
  paymentMethods: [],
  landlordContact: { phone: '(559) 555-0100', streetAddress: '12 Almond Ln, Fresno, CA 93650' },
  personalDeliveryDays: 'Monday through Friday',
  personalDeliveryHours: '9:00 a.m. to 5:00 p.m.',
  bankName: 'Wells Fargo',
  bankBranchAddress: '1 Bank Plaza, Fresno, CA',
  bankAccountNumber: '12345678',
  bankBranchWithinFiveMilesAttested: true,
  bankDepositPaperInstrumentConfirmed: true,
  eftPreviouslyEstablishedConfirmed: true,
} as NoticeFlowData;

function methodsFor(kinds: PaymentMethod['kind'][]): PaymentMethod[] {
  return syncMethods(kinds, FULL);
}
function validFor(kinds: PaymentMethod['kind'][]) {
  return validatePaymentMethods({ methods: methodsFor(kinds) });
}
function codesFor(kinds: PaymentMethod['kind'][]): string[] {
  return validFor(kinds).errors.map((e) => e.code).sort();
}

console.log('\n=== 1. Validator matrix: 11 valid combinations ===\n');
const VALID: PaymentMethod['kind'][][] = [
  ['in_person'],
  ['mail'],
  ['in_person', 'mail'],
  ['in_person', 'bank_deposit'],
  ['mail', 'bank_deposit'],
  ['mail', 'eft'],
  ['in_person', 'mail', 'bank_deposit'],
  ['in_person', 'mail', 'eft'],
  ['mail', 'bank_deposit', 'eft'],
  ['in_person', 'mail', 'bank_deposit', 'eft'],
];
for (const kinds of VALID) {
  check(`valid: [${kinds.join(', ')}]`, validFor(kinds).valid, codesFor(kinds).join(', '));
}

console.log('\n=== 1b. Disallowed combinations (with codes) ===\n');
check('bank alone -> floor', codesFor(['bank_deposit']).includes('SECTION_1947_3_FLOOR'));
check('eft alone -> floor + eft-requires-mail',
  codesFor(['eft']).includes('SECTION_1947_3_FLOOR') &&
  codesFor(['eft']).includes('EFT_REQUIRES_MAIL'));
check('in_person + eft (no mail) -> eft-requires-mail',
  codesFor(['in_person', 'eft']).includes('EFT_REQUIRES_MAIL') &&
  !validFor(['in_person', 'eft']).valid);
check('bank + eft (no mail) -> floor + eft-requires-mail',
  codesFor(['bank_deposit', 'eft']).includes('SECTION_1947_3_FLOOR') &&
  codesFor(['bank_deposit', 'eft']).includes('EFT_REQUIRES_MAIL'));

console.log('\n=== 2. syncMethods dual-write: derived array agrees with validator ===\n');
{
  // Each selected kind's detail fields are derived from FULL; a complete FULL
  // means every valid combo validates, and missing details surface per-method.
  check('in_person derives daysHours', methodsFor(['in_person'])[0]?.kind === 'in_person');
  const blankDays = { ...FULL, personalDeliveryDays: '', personalDeliveryHours: '' };
  check('blank days/hours -> IN_PERSON_HOURS_REQUIRED',
    validatePaymentMethods({ methods: syncMethods(['in_person'], blankDays) })
      .errors.some((e) => e.code === 'IN_PERSON_HOURS_REQUIRED'));
  const noAttest = { ...FULL, bankBranchWithinFiveMilesAttested: false };
  check('bank w/o 5-mile attestation -> BANK_5_MILE_UNCONFIRMED',
    validatePaymentMethods({ methods: syncMethods(['mail', 'bank_deposit'], noAttest) })
      .errors.some((e) => e.code === 'BANK_5_MILE_UNCONFIRMED'));
}

console.log('\n=== 3. looksLikePoBox detector (c1 §3) ===\n');
for (const s of ['PO Box 123', 'P.O. Box 4', 'P O Box 9', 'POB 12', 'Post Office Box 7',
  'Postal Box 8', 'Private Mail Box 200', 'PMB 301']) {
  check(`flags "${s}"`, looksLikePoBox(s) === true);
}
check('does NOT flag "123 PO Box Street" (street named PO Box)', looksLikePoBox('123 PO Box Street') === false);
check('does NOT flag a normal street', looksLikePoBox('12 Almond Ln, Fresno, CA 93650') === false);
check('does NOT flag "100 Post Road"', looksLikePoBox('100 Post Road') === false);

console.log('\n=== 4. Renderer closure sentences (rows 1 & 6) ===\n');
const dates: ComputedNoticeDates = {
  compliancePeriodStartDate: '2026-06-02',
  compliancePeriodEndDate: '2026-06-04',
};
function renderable(kinds: PaymentMethod['kind'][]): NoticeFlowData {
  return {
    ...FULL,
    propertyAddress: '12 Almond Ln, Fresno, CA 93650',
    propertyCounty: 'Fresno',
    baseRentOnlyConfirmed: true,
    landlordIdentity: { type: 'individual', names: ['Maria Lopez'] },
    landlordIdentityConfirmed: true,
    signerName: 'Maria Lopez',
    signerCapacity: 'owner',
    signingDate: '2026-06-01',
    serviceDate: '2026-06-01',
    serviceMethod: 'personal',
    paymentMethods: syncMethods(kinds, FULL),
  } as NoticeFlowData;
}
const IN_PERSON_ONLY =
  'Payment must be delivered in person at the address above, on the days and during the hours stated. Mail and bank-deposit payment are not offered for this notice.';
const IN_PERSON_NO_MAIL =
  'Payment must be delivered in person at the address above, on the days and during the hours stated. Mail payment is not offered for this notice.';
{
  const row1 = renderNotice({ data: renderable(['in_person']), dates }).noticeText;
  check('row 1: In person to label present', row1.includes('In person to'));
  check('row 1: inPersonOnlySentence present', row1.includes(IN_PERSON_ONLY));
  check('row 1: no mailbox-rule sentence', !row1.includes('it is conclusively presumed received'));

  const row6 = renderNotice({ data: renderable(['in_person', 'bank_deposit']), dates }).noticeText;
  check('row 6: In person to label present', row6.includes('In person to'));
  check('row 6: inPersonNoMailSentence present', row6.includes(IN_PERSON_NO_MAIL));
  check('row 6: bank paper-instrument sentence present', row6.includes('check, money order, or cashier'));

  const mailOnly = renderNotice({ data: renderable(['mail']), dates }).noticeText;
  check('mail-only: no in-person closure sentence',
    !mailOnly.includes(IN_PERSON_ONLY) && !mailOnly.includes(IN_PERSON_NO_MAIL));
  check('mail-only: By mail to label present', mailOnly.includes('By mail to'));

  const inPersonMail = renderNotice({ data: renderable(['in_person', 'mail']), dates }).noticeText;
  check('in_person+mail: combined label, no closure sentence',
    inPersonMail.includes('In person or by mail to') &&
    !inPersonMail.includes(IN_PERSON_ONLY) && !inPersonMail.includes(IN_PERSON_NO_MAIL));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) throw new Error(`${failed} multi-select payment test(s) failed`);
