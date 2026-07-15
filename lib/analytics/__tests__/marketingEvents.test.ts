// lib/analytics/__tests__/marketingEvents.test.ts
// Marketing Tranche 1 — closed-union event schema: flag/consent gating + the "PII-by-construction" compile check.

import { fireMarketingEvent, type MarketingEvent } from '../marketingEvents';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.error('ok -', name); }
}

// Minimal browser shim so hasConsent() + window.gtag are exercisable in the node test env.
const gtagCalls: unknown[][] = [];
(globalThis as unknown as { window?: unknown }).window = {
  Cookiebot: { consent: { statistics: true } },
  gtag: (...args: unknown[]) => { gtagCalls.push(args); },
};

const validCta: MarketingEvent = { event: 'cta_click', page_path: '/california-3-day-notice', cta_slug: 'start_notice', section_id: 'hero' };
const validPageView: MarketingEvent = { event: 'page_view', page_path: '/riskpath-records', utm_source: 'blog' };

// (1) flag OFF (default) → no emit regardless of consent.
delete process.env.MARKETING_ANALYTICS_ENABLED;
check('flag off → no emit', fireMarketingEvent(validCta) === false && gtagCalls.length === 0);

// (2) flag ON + consent granted → emit, gtag called with the discriminator as the event name.
process.env.MARKETING_ANALYTICS_ENABLED = '1';
const emitted = fireMarketingEvent(validCta);
check('flag on + consent → emit', emitted === true && gtagCalls.length === 1 && gtagCalls[0][1] === 'cta_click');
check('page_view variant emits', fireMarketingEvent(validPageView) === true);

// (3) flag ON + consent DECLINED → drop.
(globalThis as unknown as { window: { Cookiebot: { consent: { statistics: boolean } } } }).window.Cookiebot.consent.statistics = false;
const before = gtagCalls.length;
check('flag on + consent declined → no emit', fireMarketingEvent(validCta) === false && gtagCalls.length === before);

delete process.env.MARKETING_ANALYTICS_ENABLED;

// (4) PII-BY-CONSTRUCTION compile check (validated by `tsc`, not at runtime). Under the old `[k: string]: unknown`
// index signature this object would have COMPILED; the closed union rejects the unlisted field. The expect-error
// directive below turns a successful rejection into a passing typecheck, and a regression (if someone reopens the
// union) into a tsc failure on this line.
// @ts-expect-error — unlisted field `tenant_email` is rejected by the closed union (no catch-all, no PII surface).
const wouldLeakPii: MarketingEvent = { event: 'cta_click', page_path: '/x', cta_slug: 'ask_ai', tenant_email: 'a@b.com' };
void wouldLeakPii;

console.error(`\nmarketingEvents: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed > 0) process.exit(1);
