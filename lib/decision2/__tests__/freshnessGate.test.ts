// lib/decision2/__tests__/freshnessGate.test.ts
// Lane 5 Decision 2 — freshness gate cases (master prompt §3.2). Repo run_tests.mjs check() pattern.

import { isFreshConfirm } from '../freshnessGate';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const now = new Date('2026-06-29T12:00:00Z');
const daysAgo = (d: number, h = 0, s = 0) =>
  new Date(now.getTime() - (d * 24 * 60 * 60 * 1000) - (h * 60 * 60 * 1000) - (s * 1000));

check('resolved 29d 23h ago → true', isFreshConfirm(daysAgo(29, 23), now) === true);
check('resolved exactly 30d ago → true', isFreshConfirm(daysAgo(30), now) === true);
check('resolved 30d + 1s ago → false', isFreshConfirm(daysAgo(30, 0, 1), now) === false);
check('resolved in the future (clock skew) → false', isFreshConfirm(new Date(now.getTime() + 1000), now) === false);
check('resolved 1s ago → true', isFreshConfirm(daysAgo(0, 0, 1), now) === true);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nfreshnessGate: all passed');
