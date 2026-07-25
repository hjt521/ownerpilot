// lib/btrm/safeguards/guard.test.ts — BTRM-001 §11 hard-constraint guards + §6 human-review state-machine guard.
// This is the CI safeguard the independent architecture-review-board challenge (spec §13) conditioned approval on.

import { assertNoCharacterLabel, assertHumanReviewGated, assertSymmetricRuleSelection } from './guard';
import { scanForCharacterLabels, isCleanOfCharacterLabels } from './characterLabelDenylist';

let passed = 0, failed = 0;
const check = (n: string, c: boolean, d = '') => { c ? passed++ : (failed++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)); if (c) console.log(`  ✓ ${n}`); };
const throws = (fn: () => void) => { try { fn(); return false; } catch { return true; } };

// -- character-label denylist --
check('descriptive event text is clean', isCleanOfCharacterLabels('Three direct questions about the payment date were not answered.'));
check('a character-label conclusion is caught', !isCleanOfCharacterLabels('The tenant is evasive by nature.'));
check('"manipulative" is caught', scanForCharacterLabels('The tenant is manipulative.').includes('manipulative'));
check('"lazy landlord" is caught', scanForCharacterLabels('This is a lazy landlord.').includes('lazy landlord'));
check('case-insensitive match', scanForCharacterLabels('BAD TENANT flagged for review').includes('bad tenant'));

// -- protected-characteristic + style-proxy prohibition --
check('protected characteristic mention is caught', scanForCharacterLabels('based on national origin').includes('national origin'));
check('style-as-proxy is caught', scanForCharacterLabels('due to poor grammar in messages').includes('poor grammar'));

// -- assertNoCharacterLabel --
check('assertNoCharacterLabel does not throw on clean text', !throws(() => assertNoCharacterLabel('Payment received on May 10.')));
check('assertNoCharacterLabel throws on a prohibited label', throws(() => assertNoCharacterLabel('This tenant is a con artist.')));

// -- human-review state-machine guard (BTRM-001 §6) --
check('non-material option needs no human review flag', !throws(() => assertHumanReviewGated({ materialConsequence: false })));
check('material option WITH humanReviewRequired passes', !throws(() => assertHumanReviewGated({ materialConsequence: true, humanReviewRequired: true })));
check('material option WITHOUT humanReviewRequired is rejected (no automated adverse action)', throws(() => assertHumanReviewGated({ materialConsequence: true, humanReviewRequired: false })));
check('material option with humanReviewRequired omitted is rejected', throws(() => assertHumanReviewGated({ materialConsequence: true })));

// -- symmetry guard --
check('identical rule-selection results across roles passes', !throws(() => assertSymmetricRuleSelection({ eventClass: 'deadline_missed' }, { eventClass: 'deadline_missed' }, 'owner-vs-tenant')));
check('divergent rule-selection results across roles is rejected', throws(() => assertSymmetricRuleSelection({ eventClass: 'deadline_missed' }, { eventClass: 'deadline_missed', extraPenalty: true }, 'owner-vs-tenant')));

console.log(`\n${'-'.repeat(44)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(44)}`);
if (failed > 0) process.exit(1);
