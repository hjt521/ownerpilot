import {
  looksLikePoBox,
  validatePayeeTrioAndDelivery,
} from './contactValidation';
import type { NoticeFlowData, OfferedMethod } from '../flow/noticeFlowState';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function has(issues: { code: string; message: string }[], code: string): boolean {
  return issues.some((i) => i.code === code);
}

const contact = { name: 'Jack Tah', phone: '(559) 555-0142', streetAddress: '442 Fresno St, Fresno, CA 93701' };
const poBox = { name: 'Jack Tah', phone: '(559) 555-0142', streetAddress: 'P.O. Box 55, Fresno, CA 93701' };

function mk(
  methods: OfferedMethod[],
  lc: { name?: string; phone?: string; streetAddress?: string } = contact,
  extra: Partial<NoticeFlowData> = {},
): NoticeFlowData {
  return { paymentMethods: methods, landlordContact: { ...lc }, ...extra } as Partial<NoticeFlowData> as NoticeFlowData;
}

console.log('\n=== looksLikePoBox detector (C1 \u00a73: start-anchored) ===\n');
console.log('0a. Positives (P.O.-box forms at start of line)');
{
  check('PO Box', looksLikePoBox('PO Box 9'));
  check('P.O. Box', looksLikePoBox('P.O. Box 123'));
  check('P O Box', looksLikePoBox('P O Box 7'));
  check('POB', looksLikePoBox('POB 12'));
  check('P.O.B.', looksLikePoBox('P.O.B. 5'));
  check('Post Office Box', looksLikePoBox('Post Office Box 5'));
  check('Postal Box', looksLikePoBox('Postal Box 8'));
  check('Private Mail Box', looksLikePoBox('Private Mail Box 4'));
  check('PMB', looksLikePoBox('PMB 100'));
  check('case-insensitive', looksLikePoBox('po box 9'));
  check('leading whitespace tolerated', looksLikePoBox('   PO Box 9'));
}
console.log('\n0b. Negatives (must NOT flag)');
{
  check('123 PO Box Street (determination negative — mid-string)', !looksLikePoBox('123 PO Box Street'));
  check('442 Fresno St', !looksLikePoBox('442 Fresno St'));
  check('12 Pember St (pmb-ish prefix)', !looksLikePoBox('12 Pember St'));
  check('Pober Ave (pob-ish prefix)', !looksLikePoBox('Pober Ave'));
  check('1 Post Road (post but not post office box)', !looksLikePoBox('1 Post Road'));
  check('undefined', !looksLikePoBox(undefined));
}

console.log('\n=== validatePayeeTrioAndDelivery — \u00a7 1161(2) trio ===\n');
console.log('1. Trio presence/format');
{
  check('full trio -> no issues', validatePayeeTrioAndDelivery(mk(['by_mail'])).length === 0);

  const noPhone = mk(['by_mail'], { name: 'Jack Tah', streetAddress: contact.streetAddress });
  check('missing phone -> CONTACT_PHONE_REQUIRED', has(validatePayeeTrioAndDelivery(noPhone), 'CONTACT_PHONE_REQUIRED'));

  const badPhone = mk(['by_mail'], { ...contact, phone: '555' });
  check('bad phone -> CONTACT_PHONE_FORMAT', has(validatePayeeTrioAndDelivery(badPhone), 'CONTACT_PHONE_FORMAT'));

  const noAddr = mk(['by_mail'], { name: 'Jack Tah', phone: contact.phone });
  check('missing address -> CONTACT_ADDRESS_REQUIRED', has(validatePayeeTrioAndDelivery(noAddr), 'CONTACT_ADDRESS_REQUIRED'));
}
console.log('\n2. Non-landlord override name');
{
  const blank = mk(['by_mail'], contact, { payeeIsNonLandlord: true, payeeOverrideName: '   ' });
  check('override on + blank -> PAYEE_OVERRIDE_NAME_REQUIRED', has(validatePayeeTrioAndDelivery(blank), 'PAYEE_OVERRIDE_NAME_REQUIRED'));

  const ok = mk(['by_mail'], contact, { payeeIsNonLandlord: true, payeeOverrideName: 'Westside Property Management, Inc.' });
  check('override on + present -> ok', !has(validatePayeeTrioAndDelivery(ok), 'PAYEE_OVERRIDE_NAME_REQUIRED'));
}

console.log('\n=== C1 P.O.-box gate — fires on any in-person leg (\u00a71 matrix) ===\n');
console.log('3. Rows with an in-person leg BLOCK a P.O.-box address');
{
  check('Row 1 (in person only) + PO box -> block', has(validatePayeeTrioAndDelivery(mk(['in_person'], poBox)), 'PERSONAL_DELIVERY_POBOX'));
  check('Row 3 (in person + mail) + PO box -> block', has(validatePayeeTrioAndDelivery(mk(['in_person', 'by_mail'], poBox)), 'PERSONAL_DELIVERY_POBOX'));
  check('Row 6 (in person + bank) + PO box -> block', has(validatePayeeTrioAndDelivery(mk(['in_person', 'bank_deposit'], poBox)), 'PERSONAL_DELIVERY_POBOX'));
}
console.log('\n4. Rows without an in-person leg ALLOW a P.O.-box address (mail to a P.O. box is permitted)');
{
  check('Row 2 (mail only) + PO box -> allow', !has(validatePayeeTrioAndDelivery(mk(['by_mail'], poBox)), 'PERSONAL_DELIVERY_POBOX'));
  check('Row 4 (mail + bank) + PO box -> allow', !has(validatePayeeTrioAndDelivery(mk(['by_mail', 'bank_deposit'], poBox)), 'PERSONAL_DELIVERY_POBOX'));
  check('in-person + normal street -> allow', !has(validatePayeeTrioAndDelivery(mk(['in_person'], contact)), 'PERSONAL_DELIVERY_POBOX'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
