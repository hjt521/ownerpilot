// components/CookiebotBanner.tsx
// Lane 6 Analytics §Q — Cookiebot consent banner (master prompt §4.2). Path A ($11/mo, locked).
// data-blockingmode="auto" blocks GTM/GA4 until consent. Mount BEFORE GTM/GA4 in layout (§4.3).

'use client';
import Script from 'next/script';

export function CookiebotBanner() {
  const cbid = process.env.NEXT_PUBLIC_COOKIEBOT_CBID;
  if (!cbid) return null;
  return (
    <Script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={cbid}
      data-blockingmode="auto"
      strategy="beforeInteractive"
    />
  );
}
