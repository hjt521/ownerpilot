// lib/sms/__tests__/sms.test.ts
// Lane P3 — quiet-hours, consent/keyword gating, and the Twilio sender (mocked). Key invariant: tenant_reminder
// is hard-blocked pending the §B.7 reversal; quiet-hours enforced except for user-initiated 2FA.

import { quietHoursCheck, areaCodeOf, timezoneOf } from '../quietHours';
import { parseInboundKeyword, sendGate, applyKeyword, type SmsConsentRecord } from '../smsConsent';
import { sendSms } from '../twilio';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

// --- quiet hours ---
check('areaCode from E.164', areaCodeOf('+13105551234') === '310');
check('LA number → Pacific, not inferred', timezoneOf('+13105551234').tz === 'America/Los_Angeles' && !timezoneOf('+13105551234').inferred);
check('unknown area code → Pacific + inferred flag', timezoneOf('+19995551234').inferred === true);
// 2026-07-03 04:00Z = 21:00 (9pm) PDT prev day → quiet in LA
check('9pm LA local → quiet', quietHoursCheck('+13105551234', new Date('2026-07-03T04:00:00Z')).quiet === true);
// 2026-07-03 19:00Z = 12:00 noon PDT → not quiet
check('noon LA local → not quiet', quietHoursCheck('+13105551234', new Date('2026-07-03T19:00:00Z')).quiet === false);
// 2026-07-03 14:00Z = 7:00am PDT → quiet (before 8am)
check('7am LA local → quiet (before 8am)', quietHoursCheck('+13105551234', new Date('2026-07-03T14:00:00Z')).quiet === true);

// --- keyword parsing ---
check('STOP → stop', parseInboundKeyword('STOP') === 'stop');
check('unsubscribe → stop', parseInboundKeyword(' Unsubscribe ') === 'stop');
check('START → start', parseInboundKeyword('start') === 'start');
check('HELP → help', parseInboundKeyword('HELP') === 'help');
check('other → null', parseInboundKeyword('hi there') === null);

// --- consent gate ---
check('tenant_reminder HARD-BLOCKED pending §B.7 ruling (even with full consent)',
  sendGate('tenant_reminder', { phone: '+13105551234', optedIn: true, doubleOptInConfirmed: true, optedOut: false } as SmsConsentRecord).allowed === false);
check('broker_alert allowed (no consent needed)', sendGate('broker_alert', null).allowed === true);
check('auth_2fa allowed (transactional)', sendGate('auth_2fa', null).allowed === true);

// --- applyKeyword ---
{
  const c: SmsConsentRecord = { phone: '+1', optedIn: true, doubleOptInConfirmed: true, optedOut: false };
  check('STOP opts out + clears opt-in', applyKeyword(c, 'stop', 'NOW').consent.optedOut === true && applyKeyword(c, 'stop', 'NOW').consent.optedIn === false);
  check('START re-opts-in + stamps evidence', applyKeyword({ ...c, optedOut: true, optedIn: false }, 'start', 'NOW').consent.optedIn === true);
}

// --- sender (mocked) ---
const origFetch = globalThis.fetch;
const orig = { sid: process.env.TWILIO_ACCOUNT_SID, tok: process.env.TWILIO_AUTH_TOKEN, from: process.env.TWILIO_FROM };
async function senderTests() {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response(JSON.stringify({ sid: 'SM123' }), { status: 200 }); }) as typeof fetch;
  process.env.TWILIO_ACCOUNT_SID = 'AC'; process.env.TWILIO_AUTH_TOKEN = 't'; process.env.TWILIO_FROM = '+1444';

  // tenant_reminder blocked → no Twilio call
  calls = 0;
  const r1 = await sendSms({ to: '+13105551234', body: 'x', purpose: 'tenant_reminder', templateId: 'rem', now: new Date('2026-07-03T19:00:00Z') });
  check('tenant_reminder → not sent, no Twilio call', r1.sent === false && calls === 0);

  // broker_alert at noon → sent
  calls = 0;
  const r2 = await sendSms({ to: '+13105551234', body: 'ready', purpose: 'broker_alert', templateId: 'alert', now: new Date('2026-07-03T19:00:00Z') });
  check('broker_alert at noon → sent', r2.sent === true && calls === 1);

  // broker_alert at 9pm local → quiet-hours blocked
  calls = 0;
  const r3 = await sendSms({ to: '+13105551234', body: 'ready', purpose: 'broker_alert', templateId: 'alert', now: new Date('2026-07-03T04:00:00Z') });
  check('broker_alert at 9pm → quiet_hours blocked, no call', r3.sent === false && r3.reason === 'quiet_hours' && calls === 0);

  // auth_2fa at 9pm local → sent (quiet-hours exempt)
  calls = 0;
  const r4 = await sendSms({ to: '+13105551234', body: 'code 123', purpose: 'auth_2fa', templateId: '2fa', now: new Date('2026-07-03T04:00:00Z') });
  check('auth_2fa at 9pm → sent (quiet-hours exempt)', r4.sent === true && calls === 1);

  // not configured → skip
  calls = 0; delete process.env.TWILIO_ACCOUNT_SID;
  const r5 = await sendSms({ to: '+13105551234', body: 'x', purpose: 'broker_alert', templateId: 'a', now: new Date('2026-07-03T19:00:00Z') });
  check('unconfigured → not_configured, no call', r5.sent === false && r5.reason === 'not_configured' && calls === 0);

  globalThis.fetch = origFetch;
  process.env.TWILIO_ACCOUNT_SID = orig.sid; process.env.TWILIO_AUTH_TOKEN = orig.tok; process.env.TWILIO_FROM = orig.from;
  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nP3 SMS (quiet-hours + consent + sender): all passed');
}
senderTests();
