// lib/intake/__tests__/ff3RentPeriodsFromSession.test.ts
// PR A — reconciliation-gate runtime-defect fix (ff3_reconciliation_gate_runtime_defect_ruling_2026-07-12).
// WIRING-LAYER test: proves the produce seam reads rent_periods from the PRODUCTION data shape
// (intake_state.rent_periods.value), so the reconciliation gate FIRES. It also documents the pre-fix behavior
// (reading the non-existent top-level session.rent_periods → undefined → gate soft-continues) so the fail/pass
// contrast is visible in one run.

import { ff3RentPeriodsFromSession } from '../ff3ProduceGate';
import { reconcileFf3Amount } from '../ff3AmountReconcile';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// A production-shaped chat_sessions row: rent_periods lives in intake_state (jsonb), NOT a top-level column.
// (Mirrors e2eFf3Fixture.ff3ReadyIntakeState: two $3,000 periods = $6,000 ledger.)
const session = {
  id: 'sid-1',
  amount_of_rent_owed: 6300, // typed column (real): notice amount diverges from the $6,000 ledger
  intake_state: {
    rent_periods: {
      value: [
        { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 },
        { periodStartDate: '2026-06-01', periodEndDate: '2026-06-30', amount: 3000 },
      ],
      confidence: 1,
      updated_at: '',
    },
  },
} as unknown as { intake_state?: Record<string, { value?: unknown } | undefined>; amount_of_rent_owed: number };

// --- the fix: read from intake_state.rent_periods.value ---
const periods = ff3RentPeriodsFromSession(session);
check('post-fix: rent_periods extracted from intake_state (2 periods)', Array.isArray(periods) && periods!.length === 2);
check('post-fix: ledger sums to 6000', (periods ?? []).reduce((a, p) => a + (p.amount ?? 0), 0) === 6000);

// Gate FIRES post-fix: notice 6300 vs ledger 6000 → mismatch.
const post = reconcileFf3Amount(session.amount_of_rent_owed, periods);
check('post-fix: reconciliation gate FIRES (mismatch)', post.outcome === 'mismatch' && post.ledgerTotal === 6000 && post.delta === 300);

// --- documents the pre-fix defect: the old read was the non-existent top-level column ---
const buggy = (session as unknown as { rent_periods?: unknown }).rent_periods; // was `ff3Cols.rent_periods`
check('pre-fix read was undefined (no such column)', buggy === undefined);
const pre = reconcileFf3Amount(session.amount_of_rent_owed, buggy as never);
check('pre-fix: gate SOFT-CONTINUED (no_ledger_baseline) — the defect', pre.outcome === 'no_ledger_baseline');

// --- unchanged: a genuinely ledgerless session still soft-continues ---
check('no intake_state → null (genuine no-ledger preserved)', ff3RentPeriodsFromSession({}) === null);
check('missing rent_periods key → null', ff3RentPeriodsFromSession({ intake_state: {} }) === null);
check('non-array value → null (defensive)', ff3RentPeriodsFromSession({ intake_state: { rent_periods: { value: 'nope' } } }) === null);

if (failed > 0) { console.error(`\n${failed} ff3RentPeriodsFromSession check(s) FAILED`); process.exit(1); }
else { console.log('\nAll ff3RentPeriodsFromSession checks passed — gate fires post-fix, soft-continued pre-fix.'); }
