// lib/intake/__tests__/ff3ResumeCard.test.ts
// FF-3 Block B — entry-13 resume-card interpolation. The broker note is owner-facing verbatim; confirm it fills
// the {broker_resolution_note} slot exactly, including a note containing $ (function-form replacement).

import { ff3ResumeCard, ff3ResumeCardContinueOnly } from '../ff3ResumeCard';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const note = 'Your notice amount governs the filing; the $300 gap is a late fee we flagged in your case notes.';
const card = ff3ResumeCard(note);

check('card contains the broker note verbatim', card.includes(note));
check('no unfilled {broker_resolution_note} placeholder', !card.includes('{broker_resolution_note}'));
check('$ in note is inserted literally (not a regex token)', card.includes('$300 gap'));
check('card is the ratified entry-13 opener', card.startsWith('Thanks for your patience.'));

// --- Block C continue-only variant (no reply-to-broker control until the seam ships) ---
const co = ff3ResumeCardContinueOnly(note);
check('continue-only contains the broker note verbatim', co.includes(note));
check('continue-only leaves no placeholder', !co.includes('{broker_resolution_note}'));
check('continue-only offers continue', /tap continue/i.test(co));
check('continue-only does NOT offer reply to broker (deferred)', !/reply to broker/i.test(co));
check('continue-only $ inserted literally', co.includes('$300 gap'));

if (failed > 0) { console.error(`\n${failed} ff3ResumeCard check(s) FAILED`); process.exit(1); }
else { console.log('\nAll ff3ResumeCard checks passed.'); }
