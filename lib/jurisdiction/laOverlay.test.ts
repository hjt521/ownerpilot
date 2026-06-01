import {
  isLaProductionUnblocked,
  laProductionMissingDependencies,
  LA_PRODUCTION_DEPENDENCIES,
  UD_STAGE_BOUNDARY_MESSAGE,
  LA_RTC_RULES,
  RTC_PUBLISHED_LANGUAGES,
  RTC_FORM_URLS,
} from './laRtcRules';
import {
  resolveRtcLanguage,
  computeLaOverlayRequirements,
} from './laOverlay';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}

console.log('\n=== Production gate (must stay LOCKED) ===');

console.log('\n1. Default deps -> LA production blocked');
{
  check('not unblocked', isLaProductionUnblocked() === false);
  check('all three missing', laProductionMissingDependencies().length === 3);
}

console.log('\n2. Partial deps still blocked (need ALL three)');
{
  check('geocode only -> blocked', isLaProductionUnblocked({
    geocodeConfirmationBuilt: true, cityBusinessDayCalendarBuilt: false, rtcFormRefreshJobBuilt: false,
  }) === false);
  check('two of three -> blocked', isLaProductionUnblocked({
    geocodeConfirmationBuilt: true, cityBusinessDayCalendarBuilt: true, rtcFormRefreshJobBuilt: false,
  }) === false);
}

console.log('\n3. Only all-three unblocks');
{
  check('all three -> unblocked', isLaProductionUnblocked({
    geocodeConfirmationBuilt: true, cityBusinessDayCalendarBuilt: true, rtcFormRefreshJobBuilt: true,
  }) === true);
}

console.log('\n4. The committed default literally has all deps false');
{
  check('geocode false', LA_PRODUCTION_DEPENDENCIES.geocodeConfirmationBuilt === false);
  check('calendar false', LA_PRODUCTION_DEPENDENCIES.cityBusinessDayCalendarBuilt === false);
  check('form job false', LA_PRODUCTION_DEPENDENCIES.rtcFormRefreshJobBuilt === false);
}

console.log('\n=== AB 2347 boundary (no day-counts may leak) ===');

console.log('\n5. UD boundary message carries NO UD-stage day-counts');
{
  // The attorney prohibited UD/court day-counts ("10 days", "tenants have more
  // time now"), NOT the notice's own "3-day period" (which is the premise of
  // the document and appears in her approved wording). So we assert the actual
  // requirement: no "10", and no UD-response-timing phrasing.
  check('does not contain "10"', UD_STAGE_BOUNDARY_MESSAGE.includes('10') === false);
  check('no "court days" timing', /court days/i.test(UD_STAGE_BOUNDARY_MESSAGE) === false);
  check('no "business days" timing', /business days/i.test(UD_STAGE_BOUNDARY_MESSAGE) === false);
  check('no "to respond" / response-window phrasing', /to respond|time to respond|days to/i.test(UD_STAGE_BOUNDARY_MESSAGE) === false);
  // The only day-count permitted is the notice's own compliance window.
  const digitMatches = UD_STAGE_BOUNDARY_MESSAGE.match(/\d+/g) || [];
  check('only day-number present is the notice 3-day period', digitMatches.every((d) => d === '3'), `found: ${JSON.stringify(digitMatches)}`);
  check('explicitly disclaims computing court deadlines', /do not compute, display, or track court deadlines/i.test(UD_STAGE_BOUNDARY_MESSAGE));
  check('mentions attorney-handled', UD_STAGE_BOUNDARY_MESSAGE.toLowerCase().includes('attorney'));
}

console.log('\n=== Rules entry ===');

console.log('\n6. RTC rules verified with audit fields');
{
  check('verified true', LA_RTC_RULES.verified === true);
  check('verifiedOn set', LA_RTC_RULES.verifiedOn === '2026-06-01');
  check('filing scope all notices', LA_RTC_RULES.filingScope === 'all_eviction_notices');
  check('3 business days', LA_RTC_RULES.filingDeadlineBusinessDays === 3);
  check('effective date', LA_RTC_RULES.effectiveDate === '2025-08-20');
}

console.log('\n7. Nine languages, each with a form URL');
{
  check('nine languages', RTC_PUBLISHED_LANGUAGES.length === 9);
  check('every language has a URL', RTC_PUBLISHED_LANGUAGES.every((l) => typeof RTC_FORM_URLS[l] === 'string' && RTC_FORM_URLS[l].includes('housing.lacity.gov')));
}

console.log('\n=== Language resolution ===');

console.log('\n8. Known published language -> matched');
{
  const r = resolveRtcLanguage({ kind: 'known', language: 'Spanish' });
  check('matched', r.status === 'matched' && (r as any).language === 'spanish');
}

console.log('\n9. Known but unpublished language -> English fallback');
{
  const r = resolveRtcLanguage({ kind: 'known', language: 'Vietnamese' });
  check('english_fallback', r.status === 'english_fallback');
}

console.log('\n10. Explicitly unknown -> English WITH logged ack (distinct state)');
{
  const r = resolveRtcLanguage({ kind: 'explicitly_unknown' });
  check('english_with_logged_ack', r.status === 'english_with_logged_ack');
}

console.log('\n11. Not captured -> must capture first (NOT a silent default)');
{
  const r = resolveRtcLanguage({ kind: 'not_captured' });
  check('must_capture_first', r.status === 'must_capture_first');
}

console.log('\n=== Overlay requirements ===');

console.log('\n12. Confirmed LA property: all obligations attach');
{
  const req = computeLaOverlayRequirements({ kind: 'known', language: 'korean' });
  check('rtc attachment', req.rtcAttachmentRequired === true);
  check('posting', req.postingRequired === true);
  check('filing prompt', req.lahdFilingPromptRequired === true);
  check('language matched korean', req.language.status === 'matched');
}

console.log('\n13. Filing deadline NOT computable until city calendar built');
{
  const noCal = computeLaOverlayRequirements({ kind: 'known', language: 'english' });
  check('not computable by default', noCal.filingDeadlineComputable === false);
  const withCal = computeLaOverlayRequirements({ kind: 'known', language: 'english' }, true);
  check('computable when calendar built', withCal.filingDeadlineComputable === true);
}

console.log('\n14. Not-captured language surfaces must-capture in requirements');
{
  const req = computeLaOverlayRequirements({ kind: 'not_captured' });
  check('must_capture_first', req.language.status === 'must_capture_first');
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
