// lib/intake/__tests__/noticePathway.test.ts
// Lane W2 — 30/60/90-day terminations route to the Declaration of Intent pathway; 3/5-day notices stay on EFS.

import { classifyNoticePathway, routesToDeclarationOfIntent } from '../noticePathway';
import { lockedProse } from '@/lib/compliance/lockedProse';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// EFS side
check('3-day pay-or-quit → efs', classifyNoticePathway('3_day_pay_or_quit') === 'efs');
check('5-day pay-or-quit → efs', classifyNoticePathway('5_day_pay_or_quit') === 'efs');
check('3-day cure-or-quit → efs', classifyNoticePathway('3_day_cure_or_quit') === 'efs');

// Declaration side
check('30-day → declaration', classifyNoticePathway('30_day') === 'declaration_of_intent');
check('60-day → declaration', classifyNoticePathway('60_day') === 'declaration_of_intent');
check('90-day → declaration', classifyNoticePathway('90_day') === 'declaration_of_intent');

// Normalization (label spellings)
check('normalizes "60-day"', classifyNoticePathway('60-day') === 'declaration_of_intent');
check('normalizes "90 Day"', classifyNoticePathway('90 Day') === 'declaration_of_intent');

// Default / unknown → efs (current flow), never a false declaration route
check('unknown → efs default', classifyNoticePathway('something_else') === 'efs');
check('null → efs default', classifyNoticePathway(null) === 'efs');

// Convenience predicate
check('routesToDeclarationOfIntent true for 60-day', routesToDeclarationOfIntent('60_day') === true);
check('routesToDeclarationOfIntent false for 3-day', routesToDeclarationOfIntent('3_day_pay_or_quit') === false);

// Locked prose present + shape
check('stub prose cites Declaration of Intent + LAHD forms URL',
  lockedProse('DECLARATION_OF_INTENT_STUB_EN').includes('Declaration of Intent to Evict') &&
  lockedProse('DECLARATION_OF_INTENT_STUB_EN').includes('housing.lacity.gov/landlords/forms-notices'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nW2 notice pathway routing: all passed');
