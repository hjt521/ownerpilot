/**
 * Step 5 — console AlertSink tests. Pure transport: the sink serializes the already-built
 * RtcRefreshAlert to console.error with the [ALERT rtc_refresh] prefix and decides nothing.
 * Verifies the exact emitted shape against the four §5.1 taxonomy alerts produced by the
 * core's buildAlert (severity/channels/title/body/source unchanged by the sink).
 */
import { createConsoleAlertSink } from './alerts.ts';
import { buildAlert } from './_core/rtcRefreshJob.ts';
import type { RtcRefreshAlert } from './_core/rtcRefreshTypes.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

// Capture console.error.
function captureErr<T>(fn: () => Promise<T>): Promise<{ lines: string[]; result: T }> {
  const lines: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  return fn().then((result) => { console.error = orig; return { lines, result }; },
                   (e) => { console.error = orig; throw e; });
}

async function main() {
  const sink = createConsoleAlertSink();

  // --- emits with the project-wide prefix, one line, parseable JSON ---
  {
    const alert = buildAlert({ kind: 'refresh_failure', language: 'spanish', reason: 'HTTP 503' });
    const { lines } = await captureErr(() => sink.emit(alert));
    check('emits exactly one line', lines.length === 1);
    check('line starts with [ALERT rtc_refresh] prefix', lines[0].startsWith('[ALERT rtc_refresh] '));
    const json = lines[0].slice('[ALERT rtc_refresh] '.length);
    const parsed = JSON.parse(json) as RtcRefreshAlert;
    check('payload round-trips as the same alert', JSON.stringify(parsed) === JSON.stringify(alert));
  }

  // --- pure transport: payload is byte-identical to what the core built (no reshape/add/suppress) ---
  {
    const alert = buildAlert({ kind: 'revision_detected', language: 'korean' });
    const { lines } = await captureErr(() => sink.emit(alert));
    const parsed = JSON.parse(lines[0].slice('[ALERT rtc_refresh] '.length));
    check('preserves source rtc_refresh', parsed.source === 'rtc_refresh');
    check('preserves channels in_app+email', JSON.stringify(parsed.channels) === JSON.stringify(['in_app', 'email']));
    check('preserves severity from core (major)', parsed.severity === 'major');
    check('does not add fields beyond the alert', Object.keys(parsed).sort().join(',') === Object.keys(alert).sort().join(','));
  }

  // --- §5.1 taxonomy: critical severities pass through unchanged (sink does not escalate/route) ---
  {
    const pin = buildAlert({ kind: 'pin_mismatch', language: 'english', noticeId: 'n-123' });
    const allfail = buildAlert({ kind: 'all_languages_failed' });
    const { lines } = await captureErr(async () => { await sink.emit(pin); await sink.emit(allfail); });
    const p = JSON.parse(lines[0].slice('[ALERT rtc_refresh] '.length));
    const a = JSON.parse(lines[1].slice('[ALERT rtc_refresh] '.length));
    check('pin_mismatch severity critical preserved', p.severity === 'critical');
    check('all_languages_failed severity critical preserved', a.severity === 'critical');
    check('channels still in_app+email on critical (no routing change by severity)',
      JSON.stringify(p.channels) === JSON.stringify(['in_app', 'email']) &&
      JSON.stringify(a.channels) === JSON.stringify(['in_app', 'email']));
  }

  // --- async contract: emit returns a promise that resolves ---
  {
    const r = sink.emit(buildAlert({ kind: 'all_languages_failed' }));
    check('emit returns a Promise', typeof (r as Promise<void>).then === 'function');
    await r;
    check('promise resolves', true);
  }
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  unexpected', e); process.exit(1); });
