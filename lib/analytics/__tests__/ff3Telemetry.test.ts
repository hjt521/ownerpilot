// lib/analytics/__tests__/ff3Telemetry.test.ts
// Omnibus §3 row 2 — FF-3 telemetry: flag-off no-op, consent gate, schema, PII denylist enforcement, consent reader.

import {
  emitFf3Event, assertFf3PayloadClean, ff3TelemetryConsentFromCookie,
  type Ff3TelemetryInput, type Ff3TelemetryPayload,
} from '../ff3Telemetry';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.error('ok -', name); }
}

// Capture console.log lines (the telemetry sink). NB: check() logs via console.error so it won't pollute capture.
const lines: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
function ff3Lines() { return lines.filter((l) => l.includes('"evt":"ff3.telemetry"')); }
function reset() { lines.length = 0; }

const base: Ff3TelemetryInput = {
  event: 'capture-start', chatSessionId: 'sess-1', actorType: 'owner',
  sourceRoute: 'POST /api/chat', dispositionRef: 'ff3_active', correlationId: 'corr-1', timestamp: 'T0',
};

// (1) flag OFF (default) → no emission regardless of consent.
delete process.env.FF3_TELEMETRY_ENABLED;
reset();
check('flag off + consent granted → no emit', emitFf3Event(base, { consentGranted: true }) === false && ff3Lines().length === 0);

// (2) flag ON + consent DECLINED → dropped.
process.env.FF3_TELEMETRY_ENABLED = '1';
reset();
check('flag on + consent declined → no emit', emitFf3Event(base, { consentGranted: false }) === false && ff3Lines().length === 0);

// (3) flag ON + consent GRANTED → emits one line with the full schema.
reset();
const emitted = emitFf3Event(base, { consentGranted: true });
const out = ff3Lines();
let parsed: Record<string, unknown> = {};
try { parsed = JSON.parse(out[0] ?? '{}'); } catch { /* leave empty */ }
check('flag on + consent granted → emits', emitted === true && out.length === 1);
check('emitted schema complete', ['event', 'ff3_session_id', 'chat_session_id', 'timestamp', 'disposition_ref', 'actor_type', 'source_route', 'correlation_id'].every((k) => k in parsed));
check('emitted values correct', parsed.event === 'capture-start' && parsed.chat_session_id === 'sess-1' && parsed.ff3_session_id === 'sess-1' && parsed.actor_type === 'owner' && parsed.correlation_id === 'corr-1');

// (4) PII denylist enforcement on the payload (a15 coverage). A denied key/value throws in assert, drops in emit.
const dirty = { ...(base as unknown as Ff3TelemetryPayload), event: 'capture-start', ff3_session_id: 's', chat_session_id: 's', timestamp: 'T', disposition_ref: null, actor_type: 'owner', source_route: 'r', correlation_id: 'c', email: 'a@b.com' } as unknown as Ff3TelemetryPayload;
let threw = false;
try { assertFf3PayloadClean(dirty); } catch { threw = true; }
check('assertFf3PayloadClean throws on a denied key', threw);
reset();
// emit must NOT throw even with a poisoned payload — it drops the event (fail-safe).
let emitThrew = false;
let emitRet = true;
try { emitRet = emitFf3Event({ ...base, sourceRoute: 'r@evil.com' }, { consentGranted: true }); } catch { emitThrew = true; }
check('emit never throws on a denylist violation (drops instead)', !emitThrew && emitRet === false && ff3Lines().length === 0);

delete process.env.FF3_TELEMETRY_ENABLED;

// (5) consent reader — same surface as GA4 mount (Cookiebot statistics).
check('consent: statistics:true → granted', ff3TelemetryConsentFromCookie('stamp:x,statistics:true,marketing:false') === true);
check('consent: statistics:false → declined', ff3TelemetryConsentFromCookie('statistics:false') === false);
check('consent: absent cookie → declined (fail-closed)', ff3TelemetryConsentFromCookie(null) === false);
check('consent: url-encoded value parsed', ff3TelemetryConsentFromCookie(encodeURIComponent('{statistics:true}')) === true);

console.log = realLog;
console.error(`\nff3Telemetry: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed > 0) process.exit(1);
