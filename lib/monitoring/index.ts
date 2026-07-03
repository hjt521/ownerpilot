// lib/monitoring/index.ts
// Fork C (C1) — Sentry init + capture, FEATURE-OFF by default. Monitoring is a no-op unless SENTRY_DSN is set.
// Per the C1 amendment, hosted sentry.io is the authorized INTERIM for closed beta (self-sunsetting at GA);
// SENTRY_DSN is the hosted project DSN — no Relay side-car needed. No session replay, no user identity,
// sendDefaultPii:false, and a beforeSend that scrubs every event through the A15 denylist. @sentry/node is a
// declared dependency but is still loaded lazily via a RUNTIME specifier, so the app builds + typechecks even
// if the dep is momentarily absent (belt-and-suspenders); monitoring simply stays a safe no-op.
// Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (C1) + C1 hosted-interim amendment.

import { scrubMonitoringEvent, scrubValue } from './scrub';

let started = false;

// Runtime specifier (not a static import) → tsc + the build stay green without @sentry installed.
const SENTRY_MODULE = '@sentry/node';

/** True only when a self-hosted DSN is configured. Reads false until ops sets SENTRY_DSN (feature-off default). */
export function isMonitoringEnabled(): boolean {
  return typeof process.env.SENTRY_DSN === 'string' && process.env.SENTRY_DSN.length > 0;
}

async function loadSentry(): Promise<Record<string, (...args: unknown[]) => unknown> | null> {
  try {
    return (await import(SENTRY_MODULE)) as Record<string, (...args: unknown[]) => unknown>;
  } catch {
    return null; // dep not installed yet → monitoring stays a safe no-op
  }
}

/** Initialize monitoring iff SENTRY_DSN is set. Safe no-op otherwise. Idempotent. */
export async function initMonitoring(): Promise<void> {
  if (started || !isMonitoringEnabled()) return;
  started = true;
  const Sentry = await loadSentry();
  if (!Sentry || typeof Sentry.init !== 'function') return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? 'development',
    sendDefaultPii: false, // C1: never attach IP / cookies / headers
    replaysSessionSampleRate: 0, // C1: no session replay
    replaysOnErrorSampleRate: 0,
    beforeSend: (event: unknown) => scrubMonitoringEvent(event as Record<string, unknown>),
    beforeBreadcrumb: (crumb: unknown) => scrubValue(crumb),
  });
}

/** Capture an exception through the scrubbed pipeline. No-op unless monitoring is enabled. */
export async function captureException(err: unknown, extra?: Record<string, unknown>): Promise<void> {
  if (!isMonitoringEnabled()) return;
  const Sentry = await loadSentry();
  if (!Sentry || typeof Sentry.captureException !== 'function') return;
  const scrubbedExtra = extra ? (scrubMonitoringEvent({ extra }).extra as Record<string, unknown>) : undefined;
  Sentry.captureException(err, scrubbedExtra ? { extra: scrubbedExtra } : undefined);
}
