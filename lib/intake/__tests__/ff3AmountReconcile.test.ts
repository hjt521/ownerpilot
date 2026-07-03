// lib/intake/__tests__/ff3AmountReconcile.test.ts
// Lane FF-3 amount reconciliation gate. Named Wave-4 synthetics SC-FF3-AMOUNT-RECONCILE-{MATCH,NO-LEDGER,MISMATCH}
// (ruling §3), plus tolerance / direction / not_applicable edges.

import {
  reconcileFf3Amount, sumLedger,
  FF3_AMOUNT_RECONCILE_GATE, FF3_RECONCILE_MISMATCH_LOCKED_KEY,
} from '../ff3AmountReconcile';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// A notice for two missed months of $3,000 → ledger [3000, 3000] = 6000.
const twoMonths = [
  { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 },
  { periodStartDate: '2026-06-01', periodEndDate: '2026-06-30', amount: 3000 },
];

// --- Named Wave-4 synthetics ------------------------------------------------------------------------------------
{
  // SC-FF3-AMOUNT-RECONCILE-MATCH: notice 6000 vs ledger 6000 → silent pass.
  const r = reconcileFf3Amount(6000, twoMonths);
  check('SC-FF3-AMOUNT-RECONCILE-MATCH: outcome match', r.outcome === 'match');
  check('MATCH: ledgerTotal 6000, no delta, no card', r.ledgerTotal === 6000 && r.delta === null && r.lockedKey === null);
}
{
  // SC-FF3-AMOUNT-RECONCILE-NO-LEDGER: notice 6000 but owner kept no in-app ledger → soft-continue.
  const r = reconcileFf3Amount(6000, []);
  check('SC-FF3-AMOUNT-RECONCILE-NO-LEDGER: outcome no_ledger_baseline', r.outcome === 'no_ledger_baseline');
  check('NO-LEDGER: ledgerTotal null, soft-continue (no card)', r.ledgerTotal === null && r.lockedKey === null);
}
{
  // SC-FF3-AMOUNT-RECONCILE-MISMATCH: notice 6500 vs ledger 6000 (e.g. $500 non-rent item) → surface the flag.
  const r = reconcileFf3Amount(6500, twoMonths);
  check('SC-FF3-AMOUNT-RECONCILE-MISMATCH: outcome mismatch', r.outcome === 'mismatch');
  check('MISMATCH: delta +500 (notice exceeds ledger)', r.delta === 500);
  check('MISMATCH: surfaces the reconciliation flag key', r.lockedKey === FF3_RECONCILE_MISMATCH_LOCKED_KEY);
}

// --- direction / edges ------------------------------------------------------------------------------------------
check('mismatch delta negative when notice below ledger (stale ledger)', reconcileFf3Amount(5000, twoMonths).delta === -1000);
check('cent tolerance: 6000.004 vs 6000 → match', reconcileFf3Amount(6000.004, twoMonths).outcome === 'match');
check('just past tolerance: 6000.01 vs 6000 → mismatch', reconcileFf3Amount(6000.01, twoMonths).outcome === 'mismatch');
check('not_applicable when notice amount is null (non-fault notice)', reconcileFf3Amount(null, twoMonths).outcome === 'not_applicable');
check('every result stamps the gate id', reconcileFf3Amount(6000, twoMonths).gate === FF3_AMOUNT_RECONCILE_GATE);

// --- sumLedger unit ---------------------------------------------------------------------------------------------
check('sumLedger sums amounts', sumLedger(twoMonths) === 6000);
check('sumLedger null for empty', sumLedger([]) === null);
check('sumLedger null when all amounts missing', sumLedger([{ amount: null }, {}]) === null);
check('sumLedger ignores non-numeric, sums the rest', sumLedger([{ amount: 3000 }, { amount: null }]) === 3000);
check('sumLedger float-safe (0.1+0.2)', sumLedger([{ amount: 0.1 }, { amount: 0.2 }]) === 0.3);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nFF-3 amount reconciliation gate: all passed');
