// lib/email/__tests__/resendMonitor.test.ts
// Fork C1-A §5.2 email-send monitor: a Resend failure surfaces (send() throws with the extracted Resend code so
// the monitor can tag/fingerprint it), and a success emits the "sends observed" soak signal per template family.
// Monitoring itself is a safe no-op here (no SENTRY_DSN) — we assert the send() contract, not the Sentry call.

import { sendClaimEmail } from '../resend';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const origFetch = globalThis.fetch;
const origInfo = console.info;
const origKey = process.env.RESEND_API_KEY;
const origDsn = process.env.SENTRY_DSN;

async function run() {
  process.env.RESEND_API_KEY = 'test-key';
  delete process.env.SENTRY_DSN; // monitoring stays a no-op; we test send()'s observable behavior

  // 1. Success → soak signal emitted with the correct template family.
  const infoLines: string[] = [];
  console.info = ((...a: unknown[]) => { infoLines.push(String(a[0])); }) as typeof console.info;
  globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;

  await sendClaimEmail('owner@example.com', 'https://ownerpilot.ai/claim/abc');
  const soak = infoLines.map((l) => { try { return JSON.parse(l); } catch { return {}; } })
    .find((o) => o.evt === 'email.sent');
  check('success emits email.sent soak signal', !!soak);
  check('soak tagged template=claim', soak?.template === 'claim');

  // 2. Failure (Resend 422 JSON) → send() throws, error carries the extracted code, and it does not hang on the
  //    monitoring no-op.
  console.info = origInfo;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ name: 'validation_error', message: 'to is invalid' }), { status: 422 })
  ) as typeof fetch;

  let thrown: Error | null = null;
  try {
    await sendClaimEmail('owner@example.com', 'https://ownerpilot.ai/claim/abc');
  } catch (e) { thrown = e as Error; }
  check('failure throws', thrown !== null);
  check('error carries HTTP status', !!thrown && thrown.message.includes('422'));
  check('error carries extracted Resend code', !!thrown && thrown.message.includes('validation_error'));

  // 3. Missing key → no-op (no throw, no fetch).
  delete process.env.RESEND_API_KEY;
  let threw3 = false;
  try { await sendClaimEmail('owner@example.com', 'https://ownerpilot.ai/claim/abc'); } catch { threw3 = true; }
  check('no key → safe no-op (no throw)', threw3 === false);

  globalThis.fetch = origFetch;
  console.info = origInfo;
  if (origKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = origKey;
  if (origDsn === undefined) delete process.env.SENTRY_DSN; else process.env.SENTRY_DSN = origDsn;

  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nresend email-send monitor: all passed');
}

void run();
