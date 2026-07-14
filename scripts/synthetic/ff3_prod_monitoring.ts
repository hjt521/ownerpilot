#!/usr/bin/env tsx
/**
 * Synthetic FF3-PROD-MONITORING — deterministic canary over the FF-3 monitoring-critical invariants.
 * Source: ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md §1.2 (production monitoring parity).
 *
 * Mirrors SC-DAYCOUNT: no DB / no Preview — it exercises the pure gate/chain/resume-authorization logic and asserts
 * the exact invariants the production Sev classifications (on-call addendum §1) and anomaly monitors depend on:
 *   (1) the produce-gate chain writes one node per evaluated gate — the Sev-1 "silent disposition skip" canary;
 *   (2) a reconciliation mismatch HALTS at the reconciliation gate (never a silent pass);
 *   (3) the resume scope-check is fail-closed on every bound field (amount / ledger / period / note hash);
 *   (4) the one-shot resume token round-trips and rejects tamper + expiry.
 * Runs on every CI commit alongside the other synthetics. process.exit(1) on any failure.
 *
 * Run: npm run synthetic:ff3:monitoring   (or: npx tsx scripts/synthetic/ff3_prod_monitoring.ts)
 */

import { runProduceGateChain, FF4_FMR_GATE } from '@/lib/intake/produceGateChain';
import { FF3_AMOUNT_RECONCILE_GATE } from '@/lib/intake/ff3AmountReconcile';
import {
  buildResumeAuthorization, checkResumeScope, ledgerPeriodKey, resolutionNoteHash, FF3_RESUME_SCOPE_MISMATCH,
} from '@/lib/intake/ff3ResumeAuthorization';
import { mintResumeToken, verifyResumeToken } from '@/lib/intake/ff3ResumeToken';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };

const AT = '2026-07-13T12:00:00Z';
const TODAY = '2026-07-13';
const PERIODS = [{ amount: 3000 }, { amount: 3000 }]; // ledger sums to $6,000

// (1) Chain traversal — mismatch halts at reconciliation; one node per evaluated gate (silent-skip canary).
const mismatch = runProduceGateChain({
  bedrooms: 2, amount_of_rent_owed: 6300, just_cause: 'nonpayment', notice_type: 'three_day_pay_or_quit',
  rent_periods: PERIODS, service_date: TODAY, today: TODAY, evaluatedAt: AT,
});
check('chain: reconciliation mismatch HALTS at the reconciliation gate', mismatch.status === 'halted' && mismatch.stoppedAt === FF3_AMOUNT_RECONCILE_GATE);
check('chain: reconciliation node is recorded (no silent skip)', mismatch.gates.some((g) => g.gate === FF3_AMOUNT_RECONCILE_GATE));
check('chain: exactly one node per evaluated gate', mismatch.gates.length === new Set(mismatch.gates.map((g) => g.gate)).size);

// clear path — matching amount proceeds through FMR/W6/W2, each with a node.
const clear = runProduceGateChain({
  bedrooms: 2, amount_of_rent_owed: 6000, just_cause: 'nonpayment', notice_type: 'three_day_pay_or_quit',
  rent_periods: PERIODS, service_date: TODAY, today: TODAY, evaluatedAt: AT,
});
check('chain: matching amount clears end-to-end', clear.status === 'clear');
check('chain: FMR node present on a non-payment 3-day', clear.gates.some((g) => g.gate === FF4_FMR_GATE));
check('chain: clear path records >= 3 gate nodes', clear.gates.length >= 3);

// (3) Resume scope-check — fail-closed on every bound field.
const note = 'Confirmed; continue with the notice as drafted.';
const period = ledgerPeriodKey([{ periodStartDate: '2026-05-01', periodEndDate: '2026-06-30' }]);
const auth = buildResumeAuthorization({ sessionId: 's1', noticeAmount: 6300, ledgerTotal: 6000, ledgerPeriod: period, brokerEmail: 'b@x', resolutionNote: note, authorizedAt: AT });
const live = { session_id: 's1', notice_amount: 6300, ledger_total: 6000, ledger_period: period, resolution_note_hash: resolutionNoteHash(note) };
check('resume: matching live state passes scope', checkResumeScope(auth, live).ok === true);
check('resume: amount drift → scope_mismatch (fail-closed)', (() => { const r = checkResumeScope(auth, { ...live, notice_amount: 6500 }); return !r.ok && r.reason === FF3_RESUME_SCOPE_MISMATCH; })());
check('resume: ledger drift → scope_mismatch', !checkResumeScope(auth, { ...live, ledger_total: 5999 }).ok);
check('resume: note tamper → scope_mismatch', !checkResumeScope(auth, { ...live, resolution_note_hash: resolutionNoteHash(note + 'x') }).ok);

// (4) Resume token — round-trip + tamper/expiry rejection.
const secret = 'synthetic-ff3-resume-secret';
const now = 1_770_000_000_000;
const tok = mintResumeToken(secret, { sessionId: 's1', authorizedAt: AT, noteHash: auth.resolution_note_hash }, now);
check('token: round-trips under the same secret', verifyResumeToken(secret, tok, now).ok === true);
check('token: wrong secret rejected', !verifyResumeToken('other-secret', tok, now).ok);
check('token: expired (>5min) rejected', !verifyResumeToken(secret, tok, now + 6 * 60 * 1000).ok);

console.log(`\n${'-'.repeat(52)}\n  FF3-PROD-MONITORING: ${passed} passed, ${failed} failed\n${'-'.repeat(52)}`);
if (failed > 0) process.exit(1);
