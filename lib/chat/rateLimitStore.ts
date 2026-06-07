/**
 * Storage for per-session rate-limit counters. Counters only — no message content,
 * ever (persistence lock 2026-06-06).
 *
 * ATOMIC by construction (attorney rate-limit sign-off §2.2 gate). The interface
 * exposes two atomic operations rather than get/set:
 *   - registerRequest: one atomic step that adds to the burst window, increments the
 *     daily counter, and reads the month token sum, returning the post-increment counts.
 *   - addTokens: one atomic INCRBY of the month token counter.
 * No read-modify-write across awaits, so concurrent serverless instances cannot lose
 * increments. The pure decision (decideFromCounts in rateLimit.ts) runs over the counts.
 *
 * Two implementations, identical semantics:
 *   - InMemoryRateLimitStore: DEV-ONLY. Single process; correct within one instance,
 *     but NOT shared across serverless instances or cold starts — which is exactly why
 *     production needs the Redis store. Do not ship this to production.
 *   - RedisRateLimitStore: production. Atomic via Lua (one round trip per op). Takes a
 *     minimal injected client so it is library-agnostic (Upstash Redis, Vercel KV, or
 *     ioredis all expose an eval()). Wire it in app bootstrap with setRateLimitStore().
 */

import {
  RATE_LIMITS,
  utcDay,
  utcMonth,
  msToUtcDayEnd,
  msToUtcMonthEnd,
  type RequestCounts,
} from './rateLimit';

export interface RateLimitStore {
  /** Atomically register one request and return the post-increment counts. */
  registerRequest(sessionId: string, now: number): Promise<RequestCounts>;
  /** Atomically add model tokens to the session's month counter. */
  addTokens(sessionId: string, now: number, tokens: number): Promise<void>;
}

// ----------------------------------------------------------------------------
// DEV-ONLY in-memory store. Mirrors the Redis semantics for a single process.
// ----------------------------------------------------------------------------

type MemEntry = {
  burst: number[]; // ms timestamps inside the rolling window
  day: string; // 'YYYY-MM-DD' (UTC) dayCount applies to
  dayCount: number;
  month: string; // 'YYYY-MM' (UTC) tokenCount applies to
  tokenCount: number;
};

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, MemEntry>();

  private entry(sessionId: string): MemEntry {
    let e = this.map.get(sessionId);
    if (!e) {
      e = { burst: [], day: '', dayCount: 0, month: '', tokenCount: 0 };
      this.map.set(sessionId, e);
    }
    return e;
  }

  async registerRequest(sessionId: string, now: number): Promise<RequestCounts> {
    const e = this.entry(sessionId);
    // burst (rolling window): prune then add this request
    const windowStart = now - RATE_LIMITS.burstWindowMs;
    e.burst = e.burst.filter((t) => t > windowStart);
    e.burst.push(now);
    // daily (per-UTC-day; resets when the day rolls)
    const today = utcDay(now);
    if (e.day !== today) {
      e.day = today;
      e.dayCount = 0;
    }
    e.dayCount += 1;
    // month tokens read (pre-response). Reset the bucket if the month rolled.
    const month = utcMonth(now);
    if (e.month !== month) {
      e.month = month;
      e.tokenCount = 0;
    }
    return {
      burstCount: e.burst.length,
      oldestBurstMs: e.burst.length ? Math.min(...e.burst) : null,
      dayCount: e.dayCount,
      monthTokens: e.tokenCount,
    };
  }

  async addTokens(sessionId: string, now: number, tokens: number): Promise<void> {
    const e = this.entry(sessionId);
    const month = utcMonth(now);
    if (e.month !== month) {
      e.month = month;
      e.tokenCount = 0;
    }
    e.tokenCount += Math.max(0, Math.floor(tokens));
  }
}

// ----------------------------------------------------------------------------
// Production Redis store. Atomic via Lua; library-agnostic via RedisLike.
// ----------------------------------------------------------------------------

/** Minimal client surface the Redis store needs. Upstash Redis, Vercel KV, and
 *  ioredis all expose a compatible eval(script, keys, args). */
export interface RedisLike {
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
}

/**
 * registerRequest, one atomic round trip:
 *   KEYS[1] burst sorted-set, KEYS[2] daily key, KEYS[3] month-token key
 *   ARGV[1] now(ms), ARGV[2] burstWindowMs, ARGV[3] dayTtlMs, ARGV[4] unique member
 * Returns { burstCount, oldestScore|'-1', dayCount, monthTokens }.
 */
export const REGISTER_SCRIPT = `
local now = tonumber(ARGV[1])
local win = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - win)
redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('PEXPIRE', KEYS[1], win)
local burst = redis.call('ZCARD', KEYS[1])
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local oldestScore = '-1'
if oldest[2] then oldestScore = oldest[2] end
local day = redis.call('INCR', KEYS[2])
redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[3]))
local tok = redis.call('GET', KEYS[3])
if not tok then tok = '0' end
return {burst, oldestScore, day, tok}
`.trim();

/**
 * addTokens, one atomic round trip:
 *   KEYS[1] month-token key; ARGV[1] tokens, ARGV[2] monthTtlMs.
 * INCRBY then refresh TTL to the (fixed) month boundary.
 */
export const ADD_TOKENS_SCRIPT = `
local n = redis.call('INCRBY', KEYS[1], tonumber(ARGV[1]))
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
return n
`.trim();

export class RedisRateLimitStore implements RateLimitStore {
  private seq = 0;
  constructor(
    private readonly client: RedisLike,
    private readonly prefix = 'rl'
  ) {}

  private burstKey(sid: string): string {
    return `${this.prefix}:${sid}:b`;
  }
  private dayKey(sid: string, now: number): string {
    return `${this.prefix}:${sid}:d:${utcDay(now)}`;
  }
  private tokenKey(sid: string, now: number): string {
    return `${this.prefix}:${sid}:t:${utcMonth(now)}`;
  }

  async registerRequest(sessionId: string, now: number): Promise<RequestCounts> {
    // Unique zset member so same-ms requests don't dedupe (score = now, member unique).
    const member = `${now}:${(this.seq = (this.seq + 1) % 1_000_000)}`;
    const raw = (await this.client.eval(
      REGISTER_SCRIPT,
      [this.burstKey(sessionId), this.dayKey(sessionId, now), this.tokenKey(sessionId, now)],
      [now, RATE_LIMITS.burstWindowMs, msToUtcDayEnd(now), member]
    )) as [number | string, string, number | string, string];
    const burstCount = Number(raw[0]);
    const oldestScore = Number(raw[1]);
    const dayCount = Number(raw[2]);
    const monthTokens = Number(raw[3]);
    return {
      burstCount,
      oldestBurstMs: oldestScore >= 0 ? oldestScore : null,
      dayCount,
      monthTokens,
    };
  }

  async addTokens(sessionId: string, now: number, tokens: number): Promise<void> {
    const n = Math.max(0, Math.floor(tokens));
    if (n === 0) return;
    await this.client.eval(
      ADD_TOKENS_SCRIPT,
      [this.tokenKey(sessionId, now)],
      [n, msToUtcMonthEnd(now)]
    );
  }
}

// ----------------------------------------------------------------------------
// Selection seam.
// ----------------------------------------------------------------------------

let store: RateLimitStore | null = null;
let warned = false;

/**
 * Inject the production store at app bootstrap, e.g.:
 *   import { Redis } from '@upstash/redis'
 *   setRateLimitStore(new RedisRateLimitStore(Redis.fromEnv()))
 * (or a Vercel KV / ioredis client — anything exposing eval()).
 */
export function setRateLimitStore(s: RateLimitStore): void {
  store = s;
}

/** The configured store. Falls back to the DEV-ONLY in-memory store with a one-time
 *  warning if nothing was injected — which on serverless means limits do not bind. */
export function getRateLimitStore(): RateLimitStore {
  if (store) return store;
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[rateLimit] Using DEV-ONLY in-memory store: counters are NOT shared across ' +
        'serverless instances and reset on cold start, so limits will not bind in ' +
        'production. Inject a RedisRateLimitStore via setRateLimitStore() before going ' +
        'beyond dev-only (attorney rate-limit sign-off §2.2).'
    );
  }
  store = new InMemoryRateLimitStore();
  return store;
}

/** Test seam: drop the singleton so a test can start clean. */
export function __resetRateLimitStoreForTests(): void {
  store = null;
  warned = false;
}
