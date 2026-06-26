import { rollUpStatus } from './rollUpStatus';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
const eq = (name: string, got: unknown, want: unknown) =>
  check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

console.log('\n=== §4 rollUpStatus boundary suite (live determination §4; ruling §2.4) ===');

eq('live,0 + 1 fail -> live,1 (NO flip, no transition)',
  rollUpStatus({ status: 'live', consecutiveFailures: 0 }, 'unhealthy'),
  { status: 'live', consecutiveFailures: 1, transition: null });

eq('live,1 + 2nd consecutive fail -> not_live,2 (to_not_live)',
  rollUpStatus({ status: 'live', consecutiveFailures: 1 }, 'unhealthy'),
  { status: 'not_live', consecutiveFailures: 2, transition: 'to_not_live' });

eq('not_live,2 + success -> live,0 (to_live recovery)',
  rollUpStatus({ status: 'not_live', consecutiveFailures: 2 }, 'healthy'),
  { status: 'live', consecutiveFailures: 0, transition: 'to_live' });

eq('not_live,2 + sustained fail -> not_live,3 (NO re-alert)',
  rollUpStatus({ status: 'not_live', consecutiveFailures: 2 }, 'unhealthy'),
  { status: 'not_live', consecutiveFailures: 3, transition: null });

// "single transient absorbed": live -> fail -> success leaves live with no transition.
{
  const afterFail = rollUpStatus({ status: 'live', consecutiveFailures: 0 }, 'unhealthy');
  const afterRecover = rollUpStatus(afterFail, 'healthy');
  eq('live + fail + success -> live,0 (single transient absorbed, no transition)',
    afterRecover, { status: 'live', consecutiveFailures: 0, transition: null });
}

// Per-endpoint isolation: rollUpStatus is pure/stateless, so a County call cannot
// affect a ZIMAS call. Demonstrate independence — flipping one state leaves the other's
// computation untouched (the orchestrator writes only the addressed endpoint's 018 row).
{
  const countyPrev = { status: 'live' as const, consecutiveFailures: 1 };
  const zimasPrev = { status: 'live' as const, consecutiveFailures: 0 };
  const countyAfter = rollUpStatus(countyPrev, 'unhealthy'); // county flips to not_live
  const zimasAfter = rollUpStatus(zimasPrev, 'healthy');     // zimas unaffected
  check('per-endpoint isolation: county flip leaves zimas roll-up independent',
    countyAfter.status === 'not_live' && zimasAfter.status === 'live' && zimasAfter.consecutiveFailures === 0);
}

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
