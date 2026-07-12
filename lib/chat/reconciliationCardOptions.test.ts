// lib/chat/reconciliationCardOptions.test.ts
// FF-3 Block C §3.1 — the three-way buttons parse VERBATIM from the ratified entry-14 card (regex, not hard-coded).

import { parseReconciliationOptions } from './reconciliationCardOptions';
import { lockedProse } from '@/lib/compliance/lockedProse';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// Parse against the actual ratified card (with placeholders still present — the options don't contain them).
const card = lockedProse('chatFf3AmountReconciliationFlag');
const opts = parseReconciliationOptions(card);

check('exactly three options parsed', opts.length === 3);
check('ordinals are 1,2,3 in order', opts.map((o) => o.ordinal).join(',') === '1,2,3');
check('labels include the ordinal prefix', opts.every((o) => o.label.startsWith(`(${o.ordinal}) `)));
// Verbatim: each label body (minus the "(N) " prefix) is a literal substring of the ratified card.
check('labels are verbatim substrings of the card', opts.every((o) => card.includes(o.label.replace(/^\(\d\)\s/, ''))));
check('option (1) is the records-incomplete branch', opts[0].label.includes('notice amount is right'));
check('option (2) is the notice-wrong branch', opts[1].label.includes('rent-period records are right'));
check('option (3) is the broker-review branch', opts[2].label.includes('help figuring out which is right'));

// A card with no bold ordinals yields nothing (defensive).
check('non-option text → empty', parseReconciliationOptions('just some prose, no options').length === 0);

if (failed > 0) { console.error(`\n${failed} reconciliationCardOptions check(s) FAILED`); process.exit(1); }
else { console.log('\nAll reconciliationCardOptions checks passed.'); }
