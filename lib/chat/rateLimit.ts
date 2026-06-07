/**
 * H2 rate limits for the help chatbox (chatbox #4; Jack's decision 2026-06-07,
 * adopting the attorney's standing §C recommendation: product-session gate +
 * low-friction soft cap + per-session monthly token cap).
 *
 * Pure logic only — no storage, no I/O, no framework. The route plugs in a store
 * (see rateLimitStore.ts) and a pseudonymous session id (see session.ts). Counters
 * only; never transcripts (persistence lock 2026-06-06 — counts are not transcripts).
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

export type RateState = {
  burstHits: number[]; // ms timestamps of recent requests, pruned to the window
  day: string; // 'YYYY-MM-DD' (UTC) that dayCount applies to
  dayCount: number; // requests counted today
  month: string; // 'YYYY-MM' (UTC) that tokenCount applies to
  tokenCount: number; // model tokens counted this month
};

export type RateDecision =
  | { allowed: true }
  | { allowed: false; reason: 'burst' | 'daily' | 'monthly'; retryAfterMs: number };

export function emptyRateState(): RateState {
  return { burstHits: [], day: '', dayCount: 0, month: '', tokenCount: 0 };
}

const utcDay = (now: number): string => new Date(now).toISOString().slice(0, 10);
const utcMonth = (now: number): string => new Date(now).toISOString().slice(0, 7);

/** Decide whether a request is allowed, given the session's current state and now.
 *  Pure: does not mutate. The route records the request only when allowed. */
export function checkRateLimit(state: RateState, now: number): RateDecision {
  // burst (rolling window)
  const windowStart = now - RATE_LIMITS.burstWindowMs;
  const recent = state.burstHits.filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMITS.burstMax) {
    const oldest = Math.min(...recent);
    return { allowed: false, reason: 'burst', retryAfterMs: Math.max(0, oldest + RATE_LIMITS.burstWindowMs - now) };
  }
  // daily (UTC day; resets implicitly when the stored day != today)
  const dayCount = state.day === utcDay(now) ? state.dayCount : 0;
  if (dayCount >= RATE_LIMITS.dailyMax) {
    const tomorrow = Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate() + 1
    );
    return { allowed: false, reason: 'daily', retryAfterMs: tomorrow - now };
  }
  // monthly tokens (UTC month; resets when stored month != this month)
  const tokenCount = state.month === utcMonth(now) ? state.tokenCount : 0;
  if (tokenCount >= RATE_LIMITS.monthlyTokenMax) {
    const d = new Date(now);
    const nextMonth = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    return { allowed: false, reason: 'monthly', retryAfterMs: nextMonth - now };
  }
  return { allowed: true };
}

/** Record an allowed request (burst + daily). Pure: returns the next state.
 *  Resets daily/monthly windows when the stored period has rolled over. */
export function recordRequest(state: RateState, now: number): RateState {
  const windowStart = now - RATE_LIMITS.burstWindowMs;
  const today = utcDay(now);
  const month = utcMonth(now);
  return {
    burstHits: [...state.burstHits.filter((t) => t > windowStart), now],
    day: today,
    dayCount: (state.day === today ? state.dayCount : 0) + 1,
    month,
    tokenCount: state.month === month ? state.tokenCount : 0,
  };
}

/** Record model token usage against the monthly cap. Pure. Called after a response
 *  completes, with the actual input+output tokens (or a best-effort estimate). */
export function recordTokens(state: RateState, now: number, tokens: number): RateState {
  const month = utcMonth(now);
  return {
    ...state,
    month,
    tokenCount: (state.month === month ? state.tokenCount : 0) + Math.max(0, Math.floor(tokens)),
  };
}
