// lib/email/__tests__/privacyAck.test.ts
// D1 §3.3 item 4 — sendPrivacyAckEmail POSTs to Resend with the correct from/to/subject/reply_to and the locked
// CCPA timeline body (PRIVACY_ACK_CCPA_TIMELINE_EN), with [DATE] interpolated from submitted_at (America/Los_Angeles).

import { sendPrivacyAckEmail, PRIVACY_ACK_REPLY_TO } from '../resend';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const origFetch = globalThis.fetch;
const origKey = process.env.RESEND_API_KEY;

async function run() {
  process.env.RESEND_API_KEY = 'test-key';
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  await sendPrivacyAckEmail('requester@example.com', '2026-07-02T21:53:00.000Z');

  const c = calls[0];
  check('exactly one Resend call', calls.length === 1);
  check('posts to the Resend endpoint', c?.url === 'https://api.resend.com/emails');
  check('from = noreply@ownerpilot.ai', String(c?.body.from ?? '').includes('noreply@ownerpilot.ai'));
  check('to = the requester', c?.body.to === 'requester@example.com');
  check('reply_to = privacy@ownerpilot.ai', c?.body.reply_to === PRIVACY_ACK_REPLY_TO);
  check('subject is non-empty', typeof c?.body.subject === 'string' && (c!.body.subject as string).length > 0);

  const locked = lockedProseEntry('PRIVACY_ACK_CCPA_TIMELINE_EN').value;
  const expected = locked.replace('[DATE]', 'July 2, 2026'); // 21:53Z → America/Los_Angeles (PDT) → Jul 2
  check('body is the locked CCPA copy with [DATE] interpolated', c?.body.text === expected);
  check('no [DATE] placeholder remains', !String(c?.body.text).includes('[DATE]'));
  check('body cites Cal. Civ. Code §1798.130', String(c?.body.text).includes('§1798.130'));
  check('body directs replies to privacy@ownerpilot.ai', String(c?.body.text).includes('privacy@ownerpilot.ai'));

  globalThis.fetch = origFetch;
  process.env.RESEND_API_KEY = origKey;

  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nprivacy ack email: all passed');
}

void run();
