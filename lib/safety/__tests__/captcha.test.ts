// lib/safety/__tests__/captcha.test.ts
// Lane P6 — Turnstile captcha verification: unconfigured allow, missing/invalid token block, success allow,
// verify-error fail-closed.

import { verifyCaptchaToken } from '../captcha';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

const origFetch = globalThis.fetch;
const origSecret = process.env.TURNSTILE_SECRET_KEY;

async function run() {
  // unconfigured → allow + configured:false
  delete process.env.TURNSTILE_SECRET_KEY;
  const u = await verifyCaptchaToken('any');
  check('unconfigured → allow (configured:false)', u.ok === true && u.configured === false);

  process.env.TURNSTILE_SECRET_KEY = 'secret';

  // missing token → block
  const m = await verifyCaptchaToken(null);
  check('configured + missing token → block', m.ok === false && m.reason === 'missing_token');

  // success → allow
  globalThis.fetch = (async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;
  check('valid token → allow', (await verifyCaptchaToken('tok')).ok === true);

  // invalid → block
  globalThis.fetch = (async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch;
  const iv = await verifyCaptchaToken('tok');
  check('invalid token → block', iv.ok === false && iv.reason === 'invalid_token');

  // verify error (non-200) → fail-closed
  globalThis.fetch = (async () => new Response('err', { status: 500 })) as typeof fetch;
  const e1 = await verifyCaptchaToken('tok');
  check('verify HTTP error → fail-closed block', e1.ok === false && e1.reason === 'verify_error');

  // network throw → fail-closed
  globalThis.fetch = (async () => { throw new Error('net'); }) as typeof fetch;
  const e2 = await verifyCaptchaToken('tok');
  check('verify network throw → fail-closed block', e2.ok === false && e2.reason === 'verify_error');

  globalThis.fetch = origFetch;
  if (origSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = origSecret;
  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nP6 captcha verification: all passed');
}
run();
