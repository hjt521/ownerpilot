// lib/monitoring/__tests__/beforeSend.test.ts
// Fork C1-A no-bypass: the beforeSend scrub is the telemetry-boundary compliance control. scrubBeforeSend must
// (a) scrub normally via the canonical scrubber and (b) THROW if handed a non-canonical scrub (a silent bypass
// would be a PII exfil vector — throwing and losing the one event is the correct failure mode).

import { scrubBeforeSend } from '../index';
import { REDACTED } from '../scrub';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}
const obj = (v: unknown) => v as Record<string, unknown>;

// Normal path: canonical scrubber → user identity dropped, denied keys + PII-shaped strings redacted.
const ev = scrubBeforeSend({ message: 'boom', user: { id: 'u1', email: 'a@b.com' }, extra: { email: 'a@b.com' } });
check('drops user identity', !('user' in ev));
check('redacts denied key in extra', obj(ev.extra).email === REDACTED);
check('keeps clean message', ev.message === 'boom');

// Bypass path: a non-canonical scrub (e.g. an identity passthrough that would leak PII) MUST throw.
let threw = false;
try {
  scrubBeforeSend({ message: 'x', user: { email: 'leak@b.com' } }, ((e: Record<string, unknown>) => e) as never);
} catch { threw = true; }
check('throws when scrub is replaced (no-bypass)', threw);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nmonitoring beforeSend no-bypass: all passed');
