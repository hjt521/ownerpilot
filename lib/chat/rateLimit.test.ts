import {
  RATE_LIMITS,
  emptyRateState,
  checkRateLimit,
  recordRequest,
  recordTokens,
  type RateState,
} from './rateLimit';
import { newSessionId, parseSessionId, sessionCookie, SESSION_COOKIE } from './session';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

const T = Date.UTC(2026, 5, 7, 12, 0, 0); // 2026-06-07T12:00:00Z
const monthOf = (n: number) => new Date(n).toISOString().slice(0, 7);
const dayOf = (n: number) => new Date(n).toISOString().slice(0, 10);

console.log('\n=== burst window ===\n');
{
  let s = emptyRateState();
  let allowedCount = 0;
  for (let i = 0; i < RATE_LIMITS.burstMax; i++) {
    if (checkRateLimit(s, T + i * 1000).allowed) allowedCount++;
    s = recordRequest(s, T + i * 1000);
  }
  check('first burstMax requests allowed', allowedCount === RATE_LIMITS.burstMax);
  const d = checkRateLimit(s, T + RATE_LIMITS.burstMax * 1000);
  check('request over burst cap denied', d.allowed === false);
  check('burst denial reason is burst', d.allowed === false && d.reason === 'burst');
  check('burst denial gives retryAfterMs', d.allowed === false && d.retryAfterMs > 0);
  check('allowed again after window clears',
    checkRateLimit(s, T + RATE_LIMITS.burstWindowMs + 5000).allowed === true);
}

console.log('\n=== daily soft cap ===\n');
{
  const atCap: RateState = {
    burstHits: [], day: dayOf(T), dayCount: RATE_LIMITS.dailyMax, month: monthOf(T), tokenCount: 0,
  };
  const d = checkRateLimit(atCap, T);
  check('at daily cap → denied daily', d.allowed === false && d.reason === 'daily');
  const nextDay = Date.UTC(2026, 5, 8, 0, 0, 5);
  check('new UTC day resets daily count', checkRateLimit(atCap, nextDay).allowed === true);
}

console.log('\n=== monthly token cap ===\n');
{
  const atCap: RateState = {
    burstHits: [], day: '', dayCount: 0, month: monthOf(T), tokenCount: RATE_LIMITS.monthlyTokenMax,
  };
  const d = checkRateLimit(atCap, T);
  check('at monthly token cap → denied monthly', d.allowed === false && d.reason === 'monthly');
  const nextMonth = Date.UTC(2026, 6, 1, 0, 0, 5);
  check('new UTC month resets token count', checkRateLimit(atCap, nextMonth).allowed === true);
}

console.log('\n=== state updates ===\n');
{
  let r = emptyRateState();
  r = recordRequest(r, T);
  check('recordRequest increments dayCount', r.dayCount === 1);
  check('recordRequest sets today', r.day === dayOf(T));
  check('recordRequest adds a burst hit', r.burstHits.length === 1);

  // pruning: an old hit outside the window is dropped on the next record
  const withOld: RateState = { ...emptyRateState(), burstHits: [T - 120_000, T - 1_000] };
  const pruned = recordRequest(withOld, T);
  check('recordRequest prunes hits outside the burst window',
    pruned.burstHits.length === 2 && !pruned.burstHits.includes(T - 120_000));

  let tk = emptyRateState();
  tk = recordTokens(tk, T, 1000);
  tk = recordTokens(tk, T, 500);
  check('recordTokens accumulates within month', tk.tokenCount === 1500 && tk.month === monthOf(T));
  const tkNext = recordTokens(tk, Date.UTC(2026, 6, 1, 0, 0, 0), 200);
  check('recordTokens resets on new month', tkNext.tokenCount === 200);

  // day rollover resets dayCount on record
  const yday: RateState = { ...emptyRateState(), day: dayOf(T - 86_400_000), dayCount: 17 };
  check('recordRequest resets dayCount on new day', recordRequest(yday, T).dayCount === 1);
}

console.log('\n=== empty state allows ===\n');
{
  check('fresh session is allowed', checkRateLimit(emptyRateState(), T).allowed === true);
}

console.log('\n=== session gate (pseudonymous cookie) ===\n');
{
  const uuid = 'b3f1c2d4-5e6f-4a7b-8c9d-0123456789ab';
  check('parseSessionId reads the cookie', parseSessionId(`${SESSION_COOKIE}=${uuid}`) === uuid);
  check('parseSessionId reads among other cookies',
    parseSessionId(`a=1; ${SESSION_COOKIE}=${uuid}; b=2`) === uuid);
  check('parseSessionId rejects non-uuid value', parseSessionId(`${SESSION_COOKIE}=hax`) === null);
  check('parseSessionId null on missing header', parseSessionId(null) === null);
  check('parseSessionId null when cookie absent', parseSessionId('other=1') === null);

  const id = newSessionId();
  check('newSessionId is uuid-shaped',
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  check('round-trip: parse(new) === new', parseSessionId(`${SESSION_COOKIE}=${id}`) === id);

  const c = sessionCookie(id);
  check('cookie is HttpOnly', /HttpOnly/.test(c));
  check('cookie is Secure', /Secure/.test(c));
  check('cookie is SameSite=Lax', /SameSite=Lax/.test(c));
  check('cookie is Path=/', /Path=\//.test(c));
  check('cookie carries the session id', c.includes(`${SESSION_COOKIE}=${id}`));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
