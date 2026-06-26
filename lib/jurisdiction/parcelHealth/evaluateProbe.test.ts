import { evaluateProbe } from './evaluateProbe';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
const eq = (name: string, got: unknown, want: unknown) =>
  check(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}`);

console.log('\n=== §2 evaluateProbe boundary suite (live determination §2; ruling §2.4) ===');

// http -> shape -> latency ordering; first failure names the reason.
eq('200 + valid + 10000ms -> healthy (<= boundary)',
  evaluateProbe({ httpStatus: 200, responseShapeValid: true, latencyMs: 10000 }),
  { outcome: 'healthy', reason: null });

eq('200 + valid + 9999ms -> healthy (just under)',
  evaluateProbe({ httpStatus: 200, responseShapeValid: true, latencyMs: 9999 }),
  { outcome: 'healthy', reason: null });

eq('200 + valid + 10001ms -> unhealthy(latency)',
  evaluateProbe({ httpStatus: 200, responseShapeValid: true, latencyMs: 10001 }),
  { outcome: 'unhealthy', reason: 'latency' });

eq('500 + valid + 5000ms -> unhealthy(http_status) [http precedence over shape]',
  evaluateProbe({ httpStatus: 500, responseShapeValid: true, latencyMs: 5000 }),
  { outcome: 'unhealthy', reason: 'http_status' });

eq('200 + missing field + 5000ms -> unhealthy(response_shape)',
  evaluateProbe({ httpStatus: 200, responseShapeValid: false, latencyMs: 5000 }),
  { outcome: 'unhealthy', reason: 'response_shape' });

eq('200 + invalid shape + 12000ms -> unhealthy(response_shape) [shape precedence over latency]',
  evaluateProbe({ httpStatus: 200, responseShapeValid: false, latencyMs: 12000 }),
  { outcome: 'unhealthy', reason: 'response_shape' });

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
