// lib/email/__tests__/deliveryLog.test.ts
// Lane P1 Item 6 T3 — recipient logging is hash + 4-char prefix, NEVER plaintext.

import { createHash } from 'node:crypto';
import { recipientLogId } from '../deliveryLog';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

const email = 'Owner.Name@Example.com';
const id = recipientLogId(email);
const expectedHash = createHash('sha256').update('owner.name@example.com', 'utf8').digest('hex');

check('id = <sha256>:<first4 localpart>', id === `${expectedHash}:owne`);
check('id does NOT contain the plaintext address', !id.includes('Owner.Name') && !id.includes('@example.com'));
check('case/space-insensitive (lowercased before hashing)', recipientLogId(' owner.name@EXAMPLE.com ') === id);
check('different email → different hash', recipientLogId('other@example.com') !== id);
check('prefix is at most 4 chars of local-part', id.split(':')[1].length <= 4);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nP1 delivery-log (hash + prefix, no PII): all passed');
