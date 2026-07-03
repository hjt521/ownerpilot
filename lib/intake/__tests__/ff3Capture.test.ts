// lib/intake/__tests__/ff3Capture.test.ts
// Lane FF-3 capture — enum matching from owner phrasing, bedroom parsing, and the raw→validated promotion.

import { matchJustCause, matchNoticeType, parseBedrooms, buildFf3FromRaw } from '../ff3Capture';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// just_cause matching
check('exact enum passes through', matchJustCause('nonpayment') === 'nonpayment');
check('"non-payment of rent" → nonpayment', matchJustCause('Non-payment of rent') === 'nonpayment');
check('"they owe rent" → nonpayment', matchJustCause('the tenant owes rent') === 'nonpayment');
check('"lease violation" → breach', matchJustCause('lease violation') === 'breach_of_lease');
check('"owner move-in" → owner_move_in', matchJustCause('owner move-in') === 'owner_move_in');
check('unmatched → null', matchJustCause('purple monkey') === null);

// notice_type matching
check('"3-day pay or quit" → pay_or_quit', matchNoticeType('3-day pay or quit') === 'three_day_pay_or_quit');
check('"three day cure" → cure_or_quit', matchNoticeType('three day notice to cure') === 'three_day_cure_or_quit');
check('"30 day" → thirty_day', matchNoticeType('30 day notice') === 'thirty_day_termination');
check('"60-day" → sixty_day', matchNoticeType('60-day termination') === 'sixty_day_termination');
check('"90 day section 8" → ninety', matchNoticeType('90 day section 8') === 'ninety_day_termination_section8');
check('bare "3 day" → pay_or_quit default', matchNoticeType('3 day') === 'three_day_pay_or_quit');

// bedrooms
check('number 2', parseBedrooms(2) === 2);
check('"2 bedroom" → 2', parseBedrooms('2 bedroom') === 2);
check('"studio" → 0', parseBedrooms('studio') === 0);
check('7 out of range → null', parseBedrooms(7) === null);

// build — full Clifton-like promotion
const ok = buildFf3FromRaw({
  bedrooms: '2 bed', contract_monthly_rent: 3000, amount_of_rent_owed: 6000,
  just_cause: 'non-payment', notice_type: '3 day pay or quit',
});
check('build ok for complete input', ok.ok === true && ok.ok && ok.value.just_cause === 'nonpayment' && ok.value.notice_type === 'three_day_pay_or_quit');

// build — missing fields reported
const miss = buildFf3FromRaw({ bedrooms: 2, contract_monthly_rent: 3000, just_cause: 'nonpayment', notice_type: '3 day pay' });
check('build reports missing amount for pay-or-quit', miss.ok === false && miss.missing.includes('amount_of_rent_owed'));

// build — unmatched enum reported as missing
const badcause = buildFf3FromRaw({ bedrooms: 2, contract_monthly_rent: 3000, amount_of_rent_owed: 6000, just_cause: 'xyz', notice_type: '3 day pay' });
check('build reports missing just_cause when unmatched', badcause.ok === false && badcause.missing.includes('just_cause'));

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nFF-3 capture matchers: all passed');
