// lib/analytics/consent.ts
// Lane 6 Analytics §Q — Cookiebot consent gate. Byte-exact from master prompt §4.1.
// No analytics fire until window.Cookiebot.consent.statistics is true (Cookiebot Path A, $11/mo, locked).

declare global {
  interface Window {
    Cookiebot?: { consent: { statistics: boolean; marketing: boolean } };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.Cookiebot?.consent?.statistics;
}
