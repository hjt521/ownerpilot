// lib/chat/__tests__/udProPerGate.test.ts
// persona_correction_ud_filing_pro_per_authority_2026-07-05 coverage:
//  - the 8 mandatory-attorney phrases BLOCK and return the UD-specific fallback (not the generic one)
//  - the CORRECT negation ("does not require an attorney") is NOT blocked
//  - generic blocks (e.g. court-ready) still use the generic SAFE_FALLBACK
//  - the persona reference context carries the corrected pro-per paragraph

import { runtimeBannedTermGate, FALLBACKS, SAFE_FALLBACK } from '../runtimeBannedTermGate';
import { OWNERPILOT_PERSONA_SYSTEM_PROMPT } from '../persona';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

// The exact defect the ruling cites.
const bad = runtimeBannedTermGate('You must have an attorney review this UD before filing with the Superior Court.');
check('mandatory-attorney claim → BLOCK', bad.action === 'block');
check('BLOCK returns the UD-specific fallback', bad.output === FALLBACKS.ud_pro_per);
check('UD fallback affirms pro per + no attorney required', /pro per/i.test(bad.output) && /without an attorney/i.test(bad.output));
check('match id is the UD phrase', bad.matches[0]?.id === 'ud-must-have-attorney');

// A few more of the eight.
check('"requires an attorney" → block', runtimeBannedTermGate('This filing requires an attorney.').action === 'block');
check('"only a lawyer can file" → block', runtimeBannedTermGate('Only a lawyer can file this.').action === 'block');
check('"you need an attorney to file" → block', runtimeBannedTermGate('Basically, you need an attorney to file this UD.').action === 'block');

// Negation must survive — the corrected, accurate statement is NOT blocked.
const good = runtimeBannedTermGate('You do not require an attorney to file — you can file pro per in California.');
check('correct negation ("do not require an attorney") is NOT blocked', good.action !== 'block');

// Fallback isolation: a non-UD block still uses the generic fallback.
const car = runtimeBannedTermGate('This document is court-ready.');
check('generic block (court-ready) uses SAFE_FALLBACK, not the UD one', car.action === 'block' && car.output === SAFE_FALLBACK);

// Persona carries the correction.
check('persona has the pro-per paragraph', OWNERPILOT_PERSONA_SYSTEM_PROMPT.includes('Filing authority and the pro per path'));
check('persona states no attorney required to file', OWNERPILOT_PERSONA_SYSTEM_PROMPT.includes('an attorney is not required to file'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nUD pro-per gate + persona correction: all passed');
