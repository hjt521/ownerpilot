// lib/monitoring/scrub.ts
// Fork C (C1) — PII scrub at the Sentry SDK boundary. Runs every monitoring event through the SAME canonical
// A15 denylist the analytics + Notion-mirror surfaces use (lib/safety/denylist), so nothing PII-shaped leaves the
// process. Unlike the analytics surface (which THROWS on a violation), monitoring REDACTS: dropping an error
// event because its stack happened to contain a denied key would lose the operational signal, so denied keys and
// PII-shaped strings are replaced with a marker instead. User identity is dropped wholesale (C1: no user identity).
// Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (C1).

import { DENIED_KEYS, scanFreeText } from '@/lib/safety/denylist';

export const REDACTED = '[redacted-pii]';

/** Recursively redact denied keys + PII-shaped strings in an arbitrary JSON-ish value. Pure; returns a copy. */
export function scrubValue(value: unknown, keyHint?: string): unknown {
  if (keyHint && DENIED_KEYS.has(keyHint)) return REDACTED;
  if (typeof value === 'string') return scanFreeText(value).length > 0 ? REDACTED : value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubValue(v, k);
    return out;
  }
  return value;
}

/** Minimal shape of a Sentry event — we only need to touch the PII-bearing bags; unknown fields pass through. */
export interface MonitoringEvent {
  message?: unknown;
  exception?: unknown;
  extra?: unknown;
  contexts?: unknown;
  tags?: unknown;
  request?: unknown;
  breadcrumbs?: unknown;
  user?: unknown;
  [k: string]: unknown;
}

/**
 * beforeSend scrub: redact PII across the event's free-text + key-value bags, and drop user identity entirely
 * (C1: no user identity, no session replay). Returns the scrubbed event.
 */
export function scrubMonitoringEvent<E extends MonitoringEvent>(event: E): E {
  const scrubbed = scrubValue(event) as E;
  if ('user' in scrubbed) delete (scrubbed as MonitoringEvent).user; // never attach user identity
  return scrubbed;
}
