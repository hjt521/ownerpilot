// lib/email/__tests__/productizationEmails.test.ts
// P1 productization emails (broker standing order 2026-07-03 §2): packet-delivery (with attachment + §1162
// non-service disclaimer), broker-intake-digest (count + link, no PII), lahd-confirmation. Mocks Resend fetch.

import {
  sendPacketDeliveryEmail, sendBrokerIntakeDigestEmail, sendLahdConfirmationEmail,
} from '../resend';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const origFetch = globalThis.fetch;
const origKey = process.env.RESEND_API_KEY;

async function run() {
  process.env.RESEND_API_KEY = 'test-key';
  let calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  // --- packet-delivery: attachment + §1162 non-service disclaimer ---
  calls = [];
  await sendPacketDeliveryEmail('owner@example.com', { filename: 'packet.pdf', content: 'YmFzZTY0' });
  const p = calls[0];
  check('packet: one Resend call to the endpoint', calls.length === 1 && p.url === 'https://api.resend.com/emails');
  check('packet: from noreply@ownerpilot.ai', String(p.body.from).includes('noreply@ownerpilot.ai'));
  check('packet: to the recipient', p.body.to === 'owner@example.com');
  check('packet: attachment carried through', Array.isArray(p.body.attachments) && (p.body.attachments as unknown[]).length === 1
    && (p.body.attachments as Array<{ filename: string; content: string }>)[0].filename === 'packet.pdf');
  check('packet: body carries the §1162 NON-service disclaimer', String(p.body.text).includes('NOT legal service') && String(p.body.text).includes('1162'));
  check('packet: body carries the G5 not-a-law-firm footer', String(p.body.text).includes('not a law firm'));

  // --- broker-intake-digest: count + link, NO case PII in body ---
  calls = [];
  await sendBrokerIntakeDigestEmail('broker@ownerpilot.ai', 3, 'https://ownerpilot.ai/admin/broker-checklist');
  const d = calls[0];
  check('digest: count interpolated', String(d.body.text).includes('3 intake'));
  check('digest: review url interpolated', String(d.body.text).includes('/admin/broker-checklist'));
  check('digest: no {{}} placeholders remain', !String(d.body.text).includes('{{'));
  check('digest: no attachment', d.body.attachments === undefined);

  // --- lahd-confirmation: ref + filed date ---
  calls = [];
  await sendLahdConfirmationEmail('owner@example.com', 'LAHD-2026-004821', '2026-06-29T18:00:00.000Z');
  const l = calls[0];
  check('lahd: confirmation ref interpolated', String(l.body.text).includes('LAHD-2026-004821'));
  check('lahd: filed date rendered (June 29, 2026)', String(l.body.text).includes('June 29, 2026'));
  check('lahd: no {{}} placeholders remain', !String(l.body.text).includes('{{'));

  // --- key-missing no-op (same posture as the base send) ---
  calls = [];
  delete process.env.RESEND_API_KEY;
  await sendLahdConfirmationEmail('owner@example.com', 'X', '2026-06-29T18:00:00.000Z');
  check('no send when RESEND_API_KEY unset', calls.length === 0);

  globalThis.fetch = origFetch;
  process.env.RESEND_API_KEY = origKey;
  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nP1 productization emails: all passed');
}

run();
