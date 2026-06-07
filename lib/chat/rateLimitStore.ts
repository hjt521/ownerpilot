/**
 * Storage for per-session rate-limit counters.
 *
 * The decision logic (rateLimit.ts) is pure; this is the state it reads/writes.
 * Counters only — no message content, ever (persistence lock 2026-06-06).
 *
 * ⚠️ PRODUCTION: the in-memory store below is DEV-ONLY. It does not survive cold
 * starts and is not shared across serverless instances, so on a serverless deploy
 * (e.g. Vercel) the limits would reset per-instance and effectively not bind. Before
 * the chatbox goes beyond dev-only, swap getRateLimitStore() for a shared store
 * (Upstash Redis / Vercel KV / Redis) implementing the same RateLimitStore interface.
 * This is one of the items gating production for #4 — flagged, not hand-waved.
 */

import type { RateState } from './rateLimit';

export interface RateLimitStore {
  get(sessionId: string): Promise<RateState | null>;
  set(sessionId: string, state: RateState): Promise<void>;
}

/** DEV-ONLY in-memory store. See the production warning above. */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, RateState>();
  async get(sessionId: string): Promise<RateState | null> {
    return this.map.get(sessionId) ?? null;
  }
  async set(sessionId: string, state: RateState): Promise<void> {
    this.map.set(sessionId, state);
  }
}

let singleton: RateLimitStore | null = null;

/** Returns the configured store. DEV returns the in-memory store; replace this
 *  body with a shared-store client for production (same interface). */
export function getRateLimitStore(): RateLimitStore {
  if (!singleton) singleton = new InMemoryRateLimitStore();
  return singleton;
}
