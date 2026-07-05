// lib/email/__tests__/ownerNotify.test.ts
// B-2 send-decision coverage (p1_email_trigger_dependencies_broker_ruling_2026-07-05 B2). The LAHD-confirmation
// email sends ONLY with a confirmation_ref + consent + not-suppressed + not-already-sent. Every other path blocks.

import { decideLahdConfirmationSend } from '../ownerNotify';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

const ok = { confirmationRef: 'LAHD-123', ackAt: '2026-07-05T00:00:00Z', suppressed: false, alreadySent: false };

check('all conditions met → send', decideLahdConfirmationSend(ok).send === true);

check('no confirmation_ref → block', (() => {
  const d = decideLahdConfirmationSend({ ...ok, confirmationRef: null });
  return d.send === false && d.reason === 'no_confirmation_ref';
})());

check('whitespace confirmation_ref → block', decideLahdConfirmationSend({ ...ok, confirmationRef: '   ' }).send === false);

check('no consent (ackAt null) → block', (() => {
  const d = decideLahdConfirmationSend({ ...ok, ackAt: null });
  return d.send === false && d.reason === 'no_consent';
})());

check('suppressed → block', (() => {
  const d = decideLahdConfirmationSend({ ...ok, suppressed: true });
  return d.send === false && d.reason === 'suppressed';
})());

check('already sent → block (idempotency)', (() => {
  const d = decideLahdConfirmationSend({ ...ok, alreadySent: true });
  return d.send === false && d.reason === 'already_sent';
})());

// Precedence: a ref-less send never reports a consent/suppression reason (nothing to notify about yet).
check('missing ref takes precedence over missing consent', decideLahdConfirmationSend({ confirmationRef: '', ackAt: null, suppressed: true, alreadySent: false }).reason === 'no_confirmation_ref');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nownerNotify send-decision (B-2): all passed');
