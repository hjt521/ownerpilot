import {
  RATE_LIMITS,
  decideFromCounts,
  msToUtcDayEnd,
  msToUtcMonthEnd,
  utcDay,
  utcMonth,
  type RequestCounts,
} from './rateLimit';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
const T = Date.UTC(2026, 5, 7, 12, 0, 0); // 2026-06-07T12:00:00Z
const base = (over: Partial<RequestCounts> = {}): RequestCounts => ({
  burstCount: 1, oldestBurstMs: T, dayCount: 1, monthTokens: 0, ...over,
});

console.log('\n=== decideFromCounts: allow ===\n');
check('fresh counts allowed', decideFromCounts(base(), T).allowed === true);
check('burst at cap (==max) allowed', decideFromCounts(base({ burstCount: RATE_LIMITS.burstMax }), T).allowed === true);
check('daily at cap (==max) allowed', decideFromCounts(base({ dayCount: RATE_LIMITS.dailyMax }), T).allowed === true);
check('tokens just under cap allowed', decideFromCounts(base({ monthTokens: RATE_LIMITS.monthlyTokenMax - 1 }), T).allowed === true);

console.log('\n=== decideFromCounts: deny ===\n');
{
  const d = decideFromCounts(base({ burstCount: RATE_LIMITS.burstMax + 1, oldestBurstMs: T - 10_000 }), T);
  check('burst over cap denied', d.allowed === false && d.reason === 'burst');
  check('burst retry-after from oldest in window', !d.allowed && d.retryAfterMs === (T - 10_000) + RATE_LIMITS.burstWindowMs - T);
}
{
  const d = decideFromCounts(base({ dayCount: RATE_LIMITS.dailyMax + 1 }), T);
  check('daily over cap denied', d.allowed === false && d.reason === 'daily');
  check('daily retry-after = ms to UTC day end', !d.allowed && d.retryAfterMs === msToUtcDayEnd(T));
}
{
  const d = decideFromCounts(base({ monthTokens: RATE_LIMITS.monthlyTokenMax }), T);
  check('tokens at/over cap denied (>=)', d.allowed === false && d.reason === 'monthly');
  check('monthly retry-after = ms to UTC month end', !d.allowed && d.retryAfterMs === msToUtcMonthEnd(T));
}

console.log('\n=== precedence (burst > daily > monthly) ===\n');
{
  const all = base({ burstCount: 99, oldestBurstMs: T, dayCount: 99, monthTokens: 1e9 });
  check('burst wins when everything is over', decideFromCounts(all, T).allowed === false && (decideFromCounts(all, T) as { reason: string }).reason === 'burst');
  const dm = base({ burstCount: 1, dayCount: 99, monthTokens: 1e9 });
  check('daily beats monthly', (decideFromCounts(dm, T) as { reason: string }).reason === 'daily');
}

console.log('\n=== period helpers ===\n');
check('utcDay format', utcDay(T) === '2026-06-07');
check('utcMonth format', utcMonth(T) === '2026-06');
check('msToUtcDayEnd is positive and < 24h', msToUtcDayEnd(T) > 0 && msToUtcDayEnd(T) <= 86_400_000);
check('msToUtcDayEnd at noon = 12h', msToUtcDayEnd(T) === 12 * 3_600_000);
check('msToUtcMonthEnd positive', msToUtcMonthEnd(T) > 0);
check('oldestBurstMs null → retry falls back to full window',
  (() => { const d = decideFromCounts(base({ burstCount: RATE_LIMITS.burstMax + 1, oldestBurstMs: null }), T); return !d.allowed && d.retryAfterMs === RATE_LIMITS.burstWindowMs; })());

console.log(`\n${'-'.repeat(40)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
