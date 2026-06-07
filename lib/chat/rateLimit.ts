/**
 * H2 rate limits for the help chatbox (chatbox #4; Jack's decision 2026-06-07,
 * adopting the attorney's standing §C recommendation: product-session gate +
 * low-friction soft cap + per-session monthly token cap).
 *
 * Pure logic only — no storage, no I/O, no framework. The store (rateLimitStore.ts)
 * performs the ATOMIC counter mutation and hands back the post-increment counts; this
 * module decides allow/deny over those counts. Counters only; never transcripts
 * (persistence lock 2026-06-06 — counts are not transcripts).
 *
 * Atomicity note (attorney rate-limit sign-off §2.2 gate): the prior design was
 * get -> checkRateLimit -> set(recordRequest), a read-modify-write that loses
 * increments under serverless concurrency (two instances both read N, both write
 * N+1). That is replaced by store-side atomic increment (Redis INCR/INCRBY + a single
 * Lua round trip for the burst window). Behavioral consequence, documented and
 * deliberately in the stricter-only direction: the counter now increments on every
 * attempt including over-limit ones (increment-then-check), where the old code skipped
 * counting a request it was about to reject. Thresholds and the 429 path are unchanged.
 *
 * Thresholds are documented one-sentence-each per the attorney's §C reinforcement
 * #3, and are deliberately tunable constants.
 */

export const RATE_LIMITS = {
  /** Burst: max requests in a rolling 60s window per session — stops hammering. */
  burstMax: 5,
  burstWindowMs: 60_000,
  /** Daily soft cap: max chat requests per session per UTC day — generous for a
   *  real user, painful for a scraper. Counts every request (incl. guard refusals),
   *  which also throttles guard-probing (attorney §C reinforcement #2). */
  dailyMax: 30,
  /** Per-session monthly token cap (UTC month) — bounds API cost and sustained
   *  guard-probing. Recorded from actual model usage after each response. */
  monthlyTokenMax: 150_000,
} as const;

export type RateDecision =
  | { allowed: true }
  | { allowed: false; reason: 'burst' | 'daily' | 'monthly'; retryAfterMs: number };

/**
 * Post-increment counts handed back by the store's atomic registerRequest:
 *  - burstCount / dayCount include the current request (increment-then-check).
 *  - oldestBurstMs is the oldest timestamp still inside the burst window (for
 *    retry-after), or null if the window is empty.
 *  - monthTokens is the month's token sum BEFORE this response (tokens are added
 *    later via addTokens), matching the old pre-increment token check.
 */
export type RequestCounts = {
  burstCount: number;
  oldestBurstMs: number | null;
  dayCount: number;
  monthTokens: number;
};

export const utcDay = (now: number): string => new Date(now).toISOString().slice(0, 10);
export const utcMonth = (now: number): string => new Date(now).toISOString().slice(0, 7);

/** Milliseconds from `now` to the next UTC midnight (daily key TTL + retry-after). */
export function msToUtcDayEnd(now: number): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return next - now;
}

/** Milliseconds from `now` to the first of the next UTC month (token key TTL + retry). */
export function msToUtcMonthEnd(now: number): number {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return next - now;
}

/**
 * Decide allow/deny from the atomic post-increment counts. Pure.
 * Precedence (unchanged): burst -> daily -> monthly. burst/daily use `>` because the
 * counts already include this request; monthly uses `>=` because monthTokens is the
 * pre-response sum (same as the old check).
 */
export function decideFromCounts(c: RequestCounts, now: number): RateDecision {
  if (c.burstCount > RATE_LIMITS.burstMax) {
    const retryAfterMs =
      c.oldestBurstMs != null
        ? Math.max(0, c.oldestBurstMs + RATE_LIMITS.burstWindowMs - now)
        : RATE_LIMITS.burstWindowMs;
    return { allowed: false, reason: 'burst', retryAfterMs };
  }
  if (c.dayCount > RATE_LIMITS.dailyMax) {
    return { allowed: false, reason: 'daily', retryAfterMs: msToUtcDayEnd(now) };
  }
  if (c.monthTokens >= RATE_LIMITS.monthlyTokenMax) {
    return { allowed: false, reason: 'monthly', retryAfterMs: msToUtcMonthEnd(now) };
  }
  return { allowed: true };
}
