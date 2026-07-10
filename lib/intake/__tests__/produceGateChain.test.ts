// lib/intake/__tests__/produceGateChain.test.ts
// FF-3 Migration-042 co-batch §2/§3/§7 — chain order + short-circuit + defect, the three reconcile synthetics
// (countersign §3.3), FMR applicability/block, W6 block/defect, W2 pathway, and the call-site helpers.

import {
  runProduceGateChain,
  FF4_FMR_GATE,
  type ProduceGateChainInput,
} from '../produceGateChain';
import { FF3_AMOUNT_RECONCILE_GATE, FF3_RECONCILE_MISMATCH_LOCKED_KEY } from '../ff3AmountReconcile';
import { FMR_PORTAL_TEXT_VERBATIM_HASH } from '../fmrPreCheck';
import {
  resolveReconciliationSelection,
  buildReconciliationCard,
  runGatedProduceChain,
  toComplianceGateRows,
} from '../reconciliationCallSite';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const AT = '2026-07-10T12:00:00Z';
// Base: non-payment 3-day, 2BR (FMR 2903), service today so W6 passes; amount + periods reconcile.
function base(over: Partial<ProduceGateChainInput> = {}): ProduceGateChainInput {
  return {
    bedrooms: 2,
    amount_of_rent_owed: 6000,
    just_cause: 'nonpayment',
    notice_type: 'three_day_pay_or_quit',
    rent_periods: [{ amount: 3000 }, { amount: 3000 }],
    service_date: '2026-07-10',
    today: '2026-07-10',
    evaluatedAt: AT,
    ...over,
  };
}

// --- Reconcile synthetics (countersign §3.3) -------------------------------------------------------------------
const match = runProduceGateChain(base());
check('SC-FF3-AMOUNT-RECONCILE-MATCH → clear, 4 gates', match.status === 'clear' && match.gates.length === 4);
check('  reconcile node = match, no card', match.gates[0].result === 'match' && match.gates[0].lockedKey === null);

const noLedger = runProduceGateChain(base({ rent_periods: [] }));
check('SC-FF3-AMOUNT-RECONCILE-NO-LEDGER → clear', noLedger.status === 'clear' && noLedger.gates[0].result === 'no_ledger_baseline');

const mismatch = runProduceGateChain(base({ amount_of_rent_owed: 6300 }));
check('SC-FF3-AMOUNT-RECONCILE-MISMATCH → halted at reconcile', mismatch.status === 'halted' && mismatch.stoppedAt === FF3_AMOUNT_RECONCILE_GATE);
check('  mismatch surfaces entry-14 card key', mismatch.lockedKey === FF3_RECONCILE_MISMATCH_LOCKED_KEY);
check('  chain short-circuits (1 gate only)', mismatch.gates.length === 1);

// --- FMR (FF-4) ------------------------------------------------------------------------------------------------
const fmrBlock = runProduceGateChain(base({ amount_of_rent_owed: 2000, rent_periods: [{ amount: 2000 }] }));
check('SC-FMR-BLOCK: owed 2000 <= FMR 2903 → halted at ff4_fmr', fmrBlock.status === 'halted' && fmrBlock.stoppedAt === FF4_FMR_GATE);
check('  FMR block surfaces FMR_HARD_BLOCK_EN', fmrBlock.lockedKey === 'FMR_HARD_BLOCK_EN');
check('  FMR node carries verbatim_hash (§6 retrofit)', fmrBlock.gates[1].context.verbatim_hash === FMR_PORTAL_TEXT_VERBATIM_HASH);

const fmrNA = runProduceGateChain(base({ notice_type: 'thirty_day_termination', just_cause: 'owner_move_in', amount_of_rent_owed: null, rent_periods: [] }));
check('SC-FMR-NOT-APPLICABLE: 30-day owner-move-in → FMR not_applicable', fmrNA.gates[1].result === 'not_applicable');

// --- W6 late-filing --------------------------------------------------------------------------------------------
const w6Block = runProduceGateChain(base({ service_date: '2026-06-01', today: '2026-07-10' }));
check('SC-W6-BLOCK: service far past deadline → halted at w6_late_filing', w6Block.status === 'halted' && w6Block.stoppedAt === 'w6_late_filing');

const w6Defect = runProduceGateChain(base({ service_date: null }));
check('SC-W6-DEFECT: null service_date → defect (fail-closed)', w6Defect.status === 'defect' && w6Defect.stoppedAt === 'w6_late_filing');

// --- W2 notice-pathway (informational, clear) ------------------------------------------------------------------
check('SC-W2-CLEAR: recognized notice_type → w2 not prerequisite_incomplete', match.gates[3].gate === 'w2_notice_pathway' && match.gates[3].result !== 'prerequisite_incomplete');

// --- Call-site (§3) --------------------------------------------------------------------------------------------
const d1 = resolveReconciliationSelection('1');
const d2 = resolveReconciliationSelection('2');
const d3 = resolveReconciliationSelection('3');
check('selection (1) records-incomplete → continue to FF-4', d1.resolution === 'records_incomplete' && d1.proceedToFf4 === true && d1.nextState === 'continue');
check('selection (2) notice-wrong → pause, no FF-4', d2.resolution === 'notice_wrong' && d2.proceedToFf4 === false && d2.nextState === 'pause');
check('selection (3) unsure → awaiting_broker_review, no FF-4', d3.resolution === 'broker_review' && d3.proceedToFf4 === false && d3.nextState === 'awaiting_broker_review');

const card = buildReconciliationCard(mismatch.gates[0]);
check('entry-14 card renders (no unfilled placeholders)', !!card && !card.includes('${expected_owed}') && !card.includes('${amount_of_rent_owed}'));
check('entry-14 card interpolates ledger + notice money', !!card && card.includes('$6,000.00') && card.includes('$6,300.00'));
check('no card on non-mismatch node', buildReconciliationCard(match.gates[0]) === null);

const rows = toComplianceGateRows('sess-1', match);
check('compliance_gates rows = one per node', rows.length === 4 && rows[0].gate === FF3_AMOUNT_RECONCILE_GATE && rows[0].chat_session_id === 'sess-1');
check('FMR row carries verbatim_hash into persistence', rows[1].verbatim_hash === FMR_PORTAL_TEXT_VERBATIM_HASH);

// Flag gate: no-op when FF3_CAPTURE_ENABLED is off (prod-safe), runs when on.
delete process.env.FF3_CAPTURE_ENABLED;
check('runGatedProduceChain → null when flag OFF (prod no-op)', runGatedProduceChain(base()) === null);
process.env.FF3_CAPTURE_ENABLED = '1';
check('runGatedProduceChain → runs when flag ON', runGatedProduceChain(base())?.status === 'clear');
delete process.env.FF3_CAPTURE_ENABLED;

if (failed > 0) { console.error(`\n${failed} check(s) FAILED`); process.exit(1); }
else { console.log('\nAll produceGateChain checks passed.'); }
