// lib/intake/__tests__/wave4GoldenCatalog.test.ts
// FF-3 Migration-042 co-batch §7 — Wave-4 golden catalog additions (omnibus §Item 11, ratified in
// ff3_migration_042_cobatch_build_countersign_broker_ruling_2026-07-10 §4.3).
//
// CALL-SITE / chain-level synthetics (distinct from the pure-gate unit tests): each drives the full
// runProduceGateChain and asserts the node the case targets. The three SC-FF3-AMOUNT-RECONCILE-* synthetics live
// in produceGateChain.test.ts and count toward the Item 11 target; this file adds the remaining 4 W2 + 2 FF-4
// call-site cases. Deterministic (injected evaluatedAt + fixed today/service_date) per the 06-30 harness-
// conformance floor.

import { runProduceGateChain, FF4_FMR_GATE, type ProduceGateChainInput } from '../produceGateChain';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const AT = '2026-07-10T12:00:00Z';
const TODAY = '2026-07-10';
const SERVICE = '2026-07-10'; // within the W6 filing window ⇒ W6 passes for every case below

function run(over: Partial<ProduceGateChainInput>) {
  return runProduceGateChain({
    bedrooms: 2,
    amount_of_rent_owed: null,
    just_cause: 'other',
    notice_type: 'three_day_pay_or_quit',
    rent_periods: [],
    service_date: SERVICE,
    today: TODAY,
    evaluatedAt: AT,
    ...over,
  });
}

function w2(r: ReturnType<typeof run>) {
  return r.gates.find((g) => g.gate === 'w2_notice_pathway');
}

// --- 4 W2 call-site synthetics (notice-pathway routing + fail-closed, through the chain) -----------------------

// SC-W2-CALLSITE-3DAY-EFS-01 — a non-payment 3-day passes reconcile(match)/FMR(above)/W6, then W2 routes EFS.
const c1 = run({ notice_type: 'three_day_pay_or_quit', just_cause: 'nonpayment', amount_of_rent_owed: 6000, rent_periods: [{ amount: 6000 }] });
check('SC-W2-CALLSITE-3DAY-EFS-01: chain clear, W2 → efs', c1.status === 'clear' && w2(c1)?.result === 'efs');

// SC-W2-CALLSITE-60DAY-DECLARATION-01 — a 60-day termination (no amount) reaches W2 → declaration_of_intent.
const c2 = run({ notice_type: 'sixty_day_termination', just_cause: 'owner_move_in' });
check('SC-W2-CALLSITE-60DAY-DECLARATION-01: chain clear, W2 → declaration_of_intent', c2.status === 'clear' && w2(c2)?.result === 'declaration_of_intent');

// SC-W2-CALLSITE-30DAY-DECLARATION-01 — a 30-day termination reaches W2 → declaration_of_intent.
const c3 = run({ notice_type: 'thirty_day_termination', just_cause: 'end_of_term_sro_or_covered' });
check('SC-W2-CALLSITE-30DAY-DECLARATION-01: chain clear, W2 → declaration_of_intent', c3.status === 'clear' && w2(c3)?.result === 'declaration_of_intent');

// SC-W2-CALLSITE-UNKNOWN-FAILCLOSED-01 — an unrecognized notice_type reaches W2 and fails closed (defect, not a
// silent EFS default). W6 still runs (it computes a deadline from any present notice_type + service_date).
const c4 = run({ notice_type: 'not_a_real_type', just_cause: 'other' });
check('SC-W2-CALLSITE-UNKNOWN-FAILCLOSED-01: chain defect at W2 (fail-closed)', c4.status === 'defect' && c4.stoppedAt === 'w2_notice_pathway');

// --- 2 FF-4 call-site synthetics (FMR block boundary + pass, through the chain) --------------------------------

// SC-FF4-CALLSITE-BLOCK-AT-FMR-01 — owed EXACTLY the 2BR FMR (2903) blocks ("higher than" is strict) at the FMR
// node after reconcile passes.
const f1 = run({ notice_type: 'three_day_pay_or_quit', just_cause: 'nonpayment', amount_of_rent_owed: 2903, rent_periods: [{ amount: 2903 }] });
check('SC-FF4-CALLSITE-BLOCK-AT-FMR-01: owed==FMR → halted at ff4_fmr', f1.status === 'halted' && f1.stoppedAt === FF4_FMR_GATE && f1.lockedKey === 'FMR_HARD_BLOCK_EN');

// SC-FF4-CALLSITE-PASS-ABOVE-FMR-01 — owed one dollar above FMR passes and the chain clears.
const f2 = run({ notice_type: 'three_day_pay_or_quit', just_cause: 'nonpayment', amount_of_rent_owed: 2904, rent_periods: [{ amount: 2904 }] });
check('SC-FF4-CALLSITE-PASS-ABOVE-FMR-01: owed 2904 > FMR 2903 → chain clear', f2.status === 'clear' && f2.gates[1].result === 'pass');

if (failed > 0) { console.error(`\n${failed} Wave-4 catalog check(s) FAILED`); process.exit(1); }
else { console.log('\nAll Wave-4 golden-catalog synthetics passed.'); }
