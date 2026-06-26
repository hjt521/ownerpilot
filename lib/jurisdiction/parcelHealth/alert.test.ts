// Boundary tests for the parcel-health alert builders (§3.4 / §3.5) and the
// EmailAlertDestination constructor (Fork ①b boot-validation).
// Structural assertions only — verifies the AlertEvent fields land in the right
// slots and the null→"never" branch. Does NOT re-assert the full locked-prose
// paragraphs (that text lives in alert.ts under LOCKED markers; duplicating it
// here would create a second drift surface).

import assert from 'node:assert';
import { renderToLiveAlert, renderToNotLiveAlert, EmailAlertDestination } from './alert';
import type { AlertEvent, ProbeReason } from './types';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  \u2713 ${name}`);
}

// §3.4 — to_live: subject + interpolated slots.
check('to_live subject names endpoint, recovered, live', () => {
  const e: AlertEvent = {
    endpoint: 'county',
    transition: 'to_live',
    detectedAt: '2026-06-25T12:00:00Z',
    context: {
      consecutiveFailures: 3,
      lastSuccessAt: '2026-06-25T11:30:00Z',
      lastProbeAt: '2026-06-25T12:00:00Z',
    },
  };
  const r = renderToLiveAlert(e);
  assert.strictEqual(
    r.subject,
    '[OwnerPilot] Parcel health: `county` recovered — live'
  );
  assert.match(r.body, /Detected at: `2026-06-25T12:00:00Z`/);
  assert.match(r.body, /Last successful probe: `2026-06-25T11:30:00Z`/);
  assert.match(r.body, /Consecutive failures before recovery: `3`/);
});

// §3.4 — to_live: zimas endpoint interpolates into subject + body.
check('to_live interpolates zimas endpoint', () => {
  const e: AlertEvent = {
    endpoint: 'zimas',
    transition: 'to_live',
    detectedAt: '2026-06-25T12:00:00Z',
    context: {
      consecutiveFailures: 2,
      lastSuccessAt: '2026-06-25T10:00:00Z',
      lastProbeAt: '2026-06-25T12:00:00Z',
    },
  };
  const r = renderToLiveAlert(e);
  assert.match(r.subject, /`zimas` recovered/);
  assert.match(r.body, /^The `zimas` parcel endpoint has recovered\./);
});

// §3.5 — to_not_live: subject carries endpoint + reason; body carries the reason line.
check('to_not_live subject names endpoint and reason', () => {
  const e: AlertEvent & { reason: ProbeReason } = {
    endpoint: 'county',
    transition: 'to_not_live',
    detectedAt: '2026-06-25T13:00:00Z',
    reason: 'latency',
    context: {
      consecutiveFailures: 2,
      lastSuccessAt: '2026-06-25T12:00:00Z',
      lastProbeAt: '2026-06-25T13:00:00Z',
    },
  };
  const r = renderToNotLiveAlert(e);
  assert.strictEqual(
    r.subject,
    '[OwnerPilot] Parcel health: `county` not live — `latency`'
  );
  assert.match(r.body, /Reason on the second failure: `latency`/);
  assert.match(r.body, /Last probe at: `2026-06-25T13:00:00Z`/);
});

// §3.5 — to_not_live: lastSuccessAt null renders the literal "never".
check('to_not_live renders never when no prior success', () => {
  const e: AlertEvent & { reason: ProbeReason } = {
    endpoint: 'zimas',
    transition: 'to_not_live',
    detectedAt: '2026-06-25T13:00:00Z',
    reason: 'http_status',
    context: {
      consecutiveFailures: 2,
      lastSuccessAt: null,
      lastProbeAt: '2026-06-25T13:00:00Z',
    },
  };
  const r = renderToNotLiveAlert(e);
  assert.match(r.body, /Last successful probe: `never`/);
});

// §3.5 — each ProbeReason value lands verbatim in the subject.
check('to_not_live carries each reason value into the subject', () => {
  const reasons: ProbeReason[] = ['http_status', 'response_shape', 'latency'];
  for (const reason of reasons) {
    const e: AlertEvent & { reason: ProbeReason } = {
      endpoint: 'county',
      transition: 'to_not_live',
      detectedAt: '2026-06-25T13:00:00Z',
      reason,
      context: {
        consecutiveFailures: 2,
        lastSuccessAt: null,
        lastProbeAt: '2026-06-25T13:00:00Z',
      },
    };
    const r = renderToNotLiveAlert(e);
    assert.ok(r.subject.endsWith('`' + reason + '`'));
  }
});

// Fork ①b — config injected at construction; boot-validation throws naming the env var.
// These pin the boot-time-fail behavior so a misconfigured Edge function fails loudly at
// construction, never silently at the first send.
check('constructs with complete config and reports kind email', () => {
  const dest = new EmailAlertDestination({ apiKey: 'k', from: 'a@x.test', to: 'b@x.test' });
  assert.strictEqual(dest.kind, 'email');
});

check('throws naming RESEND_API_KEY when apiKey missing', () => {
  assert.throws(
    () => new EmailAlertDestination({ apiKey: '', from: 'a@x.test', to: 'b@x.test' }),
    /RESEND_API_KEY/
  );
});

check('throws naming PARCEL_HEALTH_ALERT_FROM when from missing', () => {
  assert.throws(
    () => new EmailAlertDestination({ apiKey: 'k', from: '', to: 'b@x.test' }),
    /PARCEL_HEALTH_ALERT_FROM/
  );
});

check('throws naming PARCEL_HEALTH_ALERT_EMAIL when to missing', () => {
  assert.throws(
    () => new EmailAlertDestination({ apiKey: 'k', from: 'a@x.test', to: '' }),
    /PARCEL_HEALTH_ALERT_EMAIL/
  );
});

console.log(`\n${passed} passed`);
