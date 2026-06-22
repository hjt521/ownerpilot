import {
  supersedeNeedsConfirmation,
  JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE,
  JURISDICTION_MANUAL_REVIEW_REQUIRED_MESSAGE,
  JURISDICTION_RESOLUTION_FAILED_MESSAGE,
} from './jurisdictionSupersession';
import { normalizeAddressKey, type CachedResolverVerdict } from './jurisdictionVerdict';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); }
  else { failed++; console.log('  \u2717 ' + name); }
}

const ADDR = '123 Main St, Los Angeles, CA';
function cached(verdict: CachedResolverVerdict['verdict'], addr = ADDR): CachedResolverVerdict {
  return { verdict, addressKey: normalizeAddressKey(addr), resolvedAt: '2026-06-22T00:00:00.000Z' };
}

function main() {
  // --- no cached verdict: stub stands ---
  const r1 = supersedeNeedsConfirmation(ADDR, undefined);
  check('no cached verdict -> no_verdict (stub stands)', r1.kind === 'no_verdict');

  // --- not_la clears ---
  const r2 = supersedeNeedsConfirmation(ADDR, cached('not_la'));
  check('not_la -> cleared', r2.kind === 'cleared');

  // --- confirmed_la -> LA overlay blocker ---
  const r3 = supersedeNeedsConfirmation(ADDR, cached('confirmed_la'));
  check('confirmed_la -> superseded', r3.kind === 'superseded');
  check('confirmed_la -> LA_OVERLAY code',
    r3.kind === 'superseded' && r3.blocker.code === 'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE');
  check('confirmed_la -> verbatim §3.B message',
    r3.kind === 'superseded' && r3.blocker.message === JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE);

  // --- manual_review -> manual review blocker ---
  const r4 = supersedeNeedsConfirmation(ADDR, cached('manual_review'));
  check('manual_review -> MANUAL_REVIEW code',
    r4.kind === 'superseded' && r4.blocker.code === 'JURISDICTION_MANUAL_REVIEW_REQUIRED');
  check('manual_review -> verbatim §3.B message',
    r4.kind === 'superseded' && r4.blocker.message === JURISDICTION_MANUAL_REVIEW_REQUIRED_MESSAGE);

  // --- resolution_failed -> failed blocker ---
  const r5 = supersedeNeedsConfirmation(ADDR, cached('resolution_failed'));
  check('resolution_failed -> RESOLUTION_FAILED code',
    r5.kind === 'superseded' && r5.blocker.code === 'JURISDICTION_RESOLUTION_FAILED');
  check('resolution_failed -> verbatim §3.B message',
    r5.kind === 'superseded' && r5.blocker.message === JURISDICTION_RESOLUTION_FAILED_MESSAGE);

  // --- stale verdict (cached for a different address) -> stub stands ---
  const r6 = supersedeNeedsConfirmation('999 Other Ave', cached('confirmed_la', ADDR));
  check('cached verdict for different address -> no_verdict (stale, stub stands)', r6.kind === 'no_verdict');

  // --- case/space-insensitive address match still applies the verdict ---
  const r7 = supersedeNeedsConfirmation('123  MAIN st, los angeles, CA', cached('not_la', ADDR));
  check('case/space-variant of same address still matches cache', r7.kind === 'cleared');

  // --- verbatim copy guards (exact bytes from ruling §3.B) ---
  check('LA overlay message exact bytes',
    JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE_MESSAGE ===
    "This property is in the City of Los Angeles. The Los Angeles overlay isn't available in OwnerPilot yet, so a notice for this address can't be produced here. We'll let you know when LA support is live.");
  check('manual review message exact bytes',
    JURISDICTION_MANUAL_REVIEW_REQUIRED_MESSAGE ===
    "We couldn't automatically determine the jurisdiction for this address. A notice for this property requires manual review before it can be produced. Please contact your broker or attorney for assistance with this address.");
  check('resolution failed message exact bytes',
    JURISDICTION_RESOLUTION_FAILED_MESSAGE ===
    "We weren't able to verify jurisdiction for this address right now. This is usually temporary. Please try again, or come back in a few minutes.");
}

main();
console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
