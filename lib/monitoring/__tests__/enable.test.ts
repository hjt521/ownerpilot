// lib/monitoring/__tests__/enable.test.ts
// Fork C1 — monitoring is FEATURE-OFF by default (no SENTRY_DSN → every entrypoint is a safe no-op) and stays
// safe even if @sentry/node can't be loaded. Self-executing (repo test convention).

import { initMonitoring, captureException, isMonitoringEnabled } from '../index';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const origDsn = process.env.SENTRY_DSN;

async function run() {
  // Feature-off default: no DSN → disabled, and every entrypoint no-ops without throwing.
  delete process.env.SENTRY_DSN;
  check('disabled when SENTRY_DSN unset', isMonitoringEnabled() === false);

  let threw = false;
  try {
    await initMonitoring();
    await captureException(new Error('should be swallowed while disabled'), { tenant_name: 'Jane Doe' });
  } catch { threw = true; }
  check('initMonitoring + captureException no-op (no throw) when disabled', threw === false);

  // Enabled flag flips with a DSN present. Even if @sentry/node isn't loadable in this env, init/capture must
  // still not throw (loadSentry returns null → safe no-op). This guards the prod-enable path.
  process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
  check('enabled when SENTRY_DSN set', isMonitoringEnabled() === true);

  let threw2 = false;
  try {
    await initMonitoring();
    await captureException(new Error('boom'), { path: '/api/privacy-request' });
  } catch { threw2 = true; }
  check('init + capture safe even if @sentry not loadable', threw2 === false);

  if (origDsn === undefined) delete process.env.SENTRY_DSN; else process.env.SENTRY_DSN = origDsn;

  if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
  console.log('\nmonitoring enable: all passed');
}

void run();
