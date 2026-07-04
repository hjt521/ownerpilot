/** produceVerify pure tests (Decision 2 produce-gate ruling §6 acceptance item 7). */
import { verifyBrokerConfirmForProduce, type AttestationRow } from './produceVerify';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const NOW = '2026-06-28T12:00:00.000Z';
const ADDR = '5537 LA MIRADA AVENUE UNIT 202 LOS ANGELES CA 90038';
const fresh = '2026-06-20T12:00:00.000Z'; // 8 days old
const stale = '2026-05-20T12:00:00.000Z'; // ~39 days old

const ok: AttestationRow = { status: 'confirmed', outcome: 'confirmed_la', resolvedAt: fresh, addressNormalized: ADDR };

// happy path
check('confirmed + match + fresh → ok', verifyBrokerConfirmForProduce(ok, ADDR, NOW).ok === true);

// not_found
check('null row → not_found',
  (() => { const r = verifyBrokerConfirmForProduce(null, ADDR, NOW); return !r.ok && r.reason === 'not_found'; })());

// address_mismatch (token from a different address — the cross-session attack)
check('different address → address_mismatch',
  (() => { const r = verifyBrokerConfirmForProduce(ok, '1200 WILSHIRE BOULEVARD LOS ANGELES CA 90017', NOW); return !r.ok && r.reason === 'address_mismatch'; })());
check('null stored address → address_mismatch',
  (() => { const r = verifyBrokerConfirmForProduce({ ...ok, addressNormalized: null }, ADDR, NOW); return !r.ok && r.reason === 'address_mismatch'; })());

// not_confirmed (cache-edit attack: status flipped client-side but server row isn't confirmed)
check('status pending → not_confirmed',
  (() => { const r = verifyBrokerConfirmForProduce({ ...ok, status: 'pending' }, ADDR, NOW); return !r.ok && r.reason === 'not_confirmed'; })());
check('denied (outcome denied_la) → not_confirmed',
  (() => { const r = verifyBrokerConfirmForProduce({ status: 'denied', outcome: 'denied_la', resolvedAt: fresh, addressNormalized: ADDR }, ADDR, NOW); return !r.ok && r.reason === 'not_confirmed'; })());
check('confirmed but no resolved_at → not_confirmed',
  (() => { const r = verifyBrokerConfirmForProduce({ ...ok, resolvedAt: null }, ADDR, NOW); return !r.ok && r.reason === 'not_confirmed'; })());

// stale_attestation (>30 days)
check('confirmed but 39 days old → stale_attestation',
  (() => { const r = verifyBrokerConfirmForProduce({ ...ok, resolvedAt: stale }, ADDR, NOW); return !r.ok && r.reason === 'stale_attestation'; })());
check('exactly 30 days → still ok',
  (() => { const r = verifyBrokerConfirmForProduce({ ...ok, resolvedAt: '2026-05-29T12:00:00.000Z' }, ADDR, NOW); return r.ok === true; })());

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
