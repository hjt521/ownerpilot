// lib/monitoring/__tests__/scrub.test.ts
// Fork C (C1) — the monitoring PII scrub redacts denied keys + PII-shaped strings (SSOT: the A15 denylist) and
// drops user identity. Self-executing (same convention as lib/analytics/__tests__/denylist.test.ts).

import { scrubMonitoringEvent, scrubValue, REDACTED } from '../scrub';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}
const obj = (v: unknown) => v as Record<string, unknown>;

// Denied KEYS redacted (reuses the canonical A15 list).
check('redacts denied key email', obj(scrubValue({ email: 'a@b.com' })).email === REDACTED);
check('redacts denied key tenant_name', obj(scrubValue({ tenant_name: 'Jane Doe' })).tenant_name === REDACTED);
check('redacts denied key address', obj(scrubValue({ address: '123 Main St' })).address === REDACTED);
check('redacts denied key phone', obj(scrubValue({ phone: '213-555-0100' })).phone === REDACTED);

// PII-shaped string values in ALLOWED keys redacted (content scan).
check('redacts email-shaped value', obj(scrubValue({ note: 'reach me at a@b.com' })).note === REDACTED);
check('redacts phone-shaped value', obj(scrubValue({ msg: 'call 213-555-0100 today' })).msg === REDACTED);
check('redacts long digit run', obj(scrubValue({ ref: 'acct 123456789012' })).ref === REDACTED);

// Safe values preserved.
check('keeps clean string', obj(scrubValue({ code: 'stale_notice' })).code === 'stale_notice');
check('keeps numbers', obj(scrubValue({ n: 42 })).n === 42);

// Nested structures.
const nested = obj(scrubValue({ extra: { tenant_name: 'X', ok: 'fresh' } }));
check('nested denied key redacted', obj(nested.extra).tenant_name === REDACTED);
check('nested clean preserved', obj(nested.extra).ok === 'fresh');

// Event-level: user identity dropped entirely; extra bag scrubbed; clean message kept.
const ev = scrubMonitoringEvent({ message: 'boom', user: { id: 'u1', email: 'a@b.com' }, extra: { phone: '213-555-0100' } });
check('drops user identity entirely', !('user' in ev));
check('scrubs extra denied key', obj(ev.extra).phone === REDACTED);
check('keeps clean message', ev.message === 'boom');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nmonitoring scrub: all passed');
