// lib/intake/__tests__/ff3ProduceGate.test.ts
// FF-3 co-batch Block A — evaluateFf3Gate: flag-off no-op, clear→proceed, mismatch→reconciliation_flag, the three
// owner selections ((1) override→proceed, (2)→pause, (3)→broker_review), FMR block, W6 block, W2 defect.

import { evaluateFf3Gate, type Ff3SessionColumns } from '../ff3ProduceGate';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const AT = '2026-07-10T12:00:00Z';
const TODAY = '2026-07-10';
const SERVICE = '2026-07-10';

function ff3(over: Partial<Ff3SessionColumns> = {}): Ff3SessionColumns {
  return {
    bedrooms: 2,
    amount_of_rent_owed: 6000,
    just_cause: 'nonpayment',
    notice_type: 'three_day_pay_or_quit',
    rent_periods: [{ amount: 3000 }, { amount: 3000 }],
    ...over,
  };
}
function ev(cols: Ff3SessionColumns, selection: '1' | '2' | '3' | null = null) {
  return evaluateFf3Gate({ ff3: cols, intendedServiceDate: SERVICE, today: TODAY, selection, evaluatedAt: AT });
}

// Flag OFF → skip (produce unchanged, no chain).
delete process.env.FF3_CAPTURE_ENABLED;
const off = ev(ff3());
check('flag OFF → skip, chain null', off.disposition.kind === 'skip' && off.chain === null);

// Flag ON for the rest.
process.env.FF3_CAPTURE_ENABLED = '1';

check('clear case → proceed', ev(ff3()).disposition.kind === 'proceed');

const mm = ev(ff3({ amount_of_rent_owed: 6300 }));
check('mismatch, no selection → reconciliation_flag + card', mm.disposition.kind === 'reconciliation_flag' && !!mm.disposition.card);
check('  compliance_gates rows persisted for the halt', (mm.chain?.gates.length ?? 0) >= 1);

const s1 = ev(ff3({ amount_of_rent_owed: 6300 }), '1');
check('selection (1) → proceed + resolution records_incomplete', s1.disposition.kind === 'proceed' && s1.disposition.reconciliation_resolution === 'records_incomplete');
check('  (1) override lets the chain run to clear', s1.chain?.status === 'clear');

const s2 = ev(ff3({ amount_of_rent_owed: 6300 }), '2');
check('selection (2) → pause + resolution notice_wrong, no chain', s2.disposition.kind === 'pause' && s2.disposition.reconciliation_resolution === 'notice_wrong' && s2.chain === null);

const s3 = ev(ff3({ amount_of_rent_owed: 6300 }), '3');
check('selection (3) → broker_review + resolution broker_review', s3.disposition.kind === 'broker_review' && s3.disposition.reconciliation_resolution === 'broker_review');

const fmr = ev(ff3({ amount_of_rent_owed: 2000, rent_periods: [{ amount: 2000 }] }));
check('FMR block → fmr_block + FMR_HARD_BLOCK_EN card', fmr.disposition.kind === 'fmr_block' && fmr.disposition.card === 'FMR_HARD_BLOCK_EN');

const w6 = evaluateFf3Gate({ ff3: ff3(), intendedServiceDate: '2026-06-01', today: '2026-07-10', selection: null, evaluatedAt: AT });
check('W6 late → late_filing_block', w6.disposition.kind === 'late_filing_block');

const def = ev(ff3({ notice_type: 'not_a_real_type', just_cause: 'other', amount_of_rent_owed: null, rent_periods: [] }));
check('unrecognized notice_type → defect → broker_review', def.disposition.kind === 'broker_review' && def.chain?.status === 'defect');

delete process.env.FF3_CAPTURE_ENABLED;

if (failed > 0) { console.error(`\n${failed} ff3ProduceGate check(s) FAILED`); process.exit(1); }
else { console.log('\nAll ff3ProduceGate checks passed.'); }
