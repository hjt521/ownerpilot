// lib/cron/__tests__/brokerIntakeDigest.test.ts
// Part A dark-behavior coverage for p1_email_trigger_dependencies_broker_ruling_2026-07-05 A3.
// The digest sends ONLY when a recipient is configured AND the awaiting-review count is positive; every other
// case is a silent skip (the ruled dark-until-FF-3 posture).

import { decideDigestSend, AWAITING_REVIEW_STATUS } from '../brokerIntakeDigest';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

// A3 dark behavior — the steady state until FF-3 goes live.
check('count 0 + recipient set → skip (empty_queue)', (() => {
  const d = decideDigestSend(0, 'review@ownerpilot.ai');
  return d.action === 'skip' && d.reason === 'empty_queue';
})());

check('recipient unset → skip (unconfigured) even if count > 0', (() => {
  const d = decideDigestSend(5, undefined);
  return d.action === 'skip' && d.reason === 'unconfigured';
})());

check('empty-string recipient → skip (unconfigured)', decideDigestSend(3, '   ').action === 'skip');

// Populated behavior — only when both conditions hold.
check('count > 0 + recipient set → send', (() => {
  const d = decideDigestSend(1, 'review@ownerpilot.ai');
  return d.action === 'send' && d.reason === 'queue_nonempty';
})());

check('negative/NaN count → skip (never a spurious send)',
  decideDigestSend(-1, 'review@ownerpilot.ai').action === 'skip' &&
  decideDigestSend(Number.NaN, 'review@ownerpilot.ai').action === 'skip');

// Guard against a status-string rename drifting away from migration 043 silently.
check('awaiting-review status constant is the 043 value', AWAITING_REVIEW_STATUS === 'awaiting_broker_review');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nbroker-intake-digest (dark-until-FF-3): all passed');
