// lib/intake/__tests__/fmrPreCheck.test.ts
// Lane FF-4 (ruling 2026-07-03) — the FMR gate compares AMOUNT OWED (not contract rent) vs FMR, blocking when
// amount_owed <= fmr ("higher than" is strict). Covers the ruling §2.5 items 1,2,4,5 + the Correction-B message.

import { fmrPreCheck, fmrThreshold, fmrHardBlockMessage, FMR_LA_TABLE, FMR_PORTAL_TEXT_VERBATIM } from '../fmrPreCheck';
import { lockedProseEntry } from '@/lib/compliance/lockedProse';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// §2.5(1) quantity + FMR table
check('2BR FMR = 2903', fmrThreshold(2) === 2903);
check('0BR/1BR/3BR/4BR FMR', fmrThreshold(0) === 2079 && fmrThreshold(1) === 2328 && fmrThreshold(3) === 3681 && fmrThreshold(4) === 4098);
check('>4BR clamps to 4BR', fmrThreshold(6) === 4098);
check('table effective window', FMR_LA_TABLE.effective_from === '2026-05-21' && FMR_LA_TABLE.effective_to === '2026-09-30');

// §4.4 Clifton golden (Correction C): gate reads AMOUNT OWED (6000), not contract rent (3000). Both pass here,
// but the assertion must exercise amount owed explicitly.
check('SC-CLIFTON: amount_owed 6000 > FMR 2903 → pass', fmrPreCheck({ bedrooms: 2, amountOwed: 6000 }).blocked === false);
check('SC-CLIFTON: contract rent is NOT the gate quantity (3000 would also pass but is irrelevant)', fmrPreCheck({ bedrooms: 2, amountOwed: 6000 }).fmr === 2903);

// §2.5(5) — the three ruled synthetics (Correction D)
check('SC-FMR-QUANTITY-DIVERGENCE-01: 2BR owed 5600 → PASS (contract-rent gate would wrongly block)', fmrPreCheck({ bedrooms: 2, amountOwed: 5600 }).blocked === false);
check('SC-FMR-QUANTITY-DIVERGENCE-02: 2BR owed 2000 → BLOCK (contract-rent gate would wrongly pass)', fmrPreCheck({ bedrooms: 2, amountOwed: 2000 }).blocked === true);
check('SC-FMR-BOUNDARY-EQUAL: 2BR owed 2903 → BLOCK ("higher than" is strict)', fmrPreCheck({ bedrooms: 2, amountOwed: 2903 }).blocked === true);
check('boundary +1: owed 2904 → PASS', fmrPreCheck({ bedrooms: 2, amountOwed: 2904 }).blocked === false);

// §2.5(3) — locked prose Correction B verbatim + interpolation
const msg = fmrHardBlockMessage({ amountOwed: 2000, bedrooms: 2, fmr: 2903 });
check('message: amount owed interpolated', msg.includes('$2,000'));
check('message: bedrooms + fmr interpolated', msg.includes('2-bedroom') && msg.includes('$2,903'));
check('message: says "amount owed does not exceed FMR"', msg.includes('when the amount owed does not exceed FMR'));
check('message: includes option (3) wait-to-accrue', msg.includes('wait until more rent accrues'));
check('message: no leftover placeholder', !/\$\{[a-z_]+\}/.test(msg));

// §2.5(3) — the manifest entry is the ruling's Correction B, carrying portal_text_verbatim
const entry = lockedProseEntry('FMR_HARD_BLOCK_EN');
check('locked entry present + tier A', entry.tier === 'A' && entry.value.includes('is not higher than the Fair Market Rent'));
check('module pins portal_text_verbatim (standing rule)', FMR_PORTAL_TEXT_VERBATIM.includes('owes an amount higher than'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nFF-4 FMR pre-check: all passed');
