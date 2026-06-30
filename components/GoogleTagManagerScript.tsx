// components/GoogleTagManagerScript.tsx
// Lane 6 Analytics §Q — consent-gated GTM container loader.
//
// @next/third-parties' GoogleTagManager is NOT compatible with Next 16 (its peer range is next ^13||^14||^15),
// so the GTM container is loaded via next/script instead — same consent posture, no incompatible dependency.
//
// Consent: Cookiebot Path A (data-blockingmode="auto", mounted BEFORE this in layout) auto-blocks the GTM
// container until the visitor accepts; the injected loader also carries data-cookieconsent="statistics" so
// Cookiebot recognizes/holds it. Only mounts when NEXT_PUBLIC_GTM_ID is provisioned. No gtag/js loader and no
// hardcoded GA4 measurement id, so Guard G (pre-consent analytics) stays clean.

'use client';
import Script from 'next/script';

export function GoogleTagManagerScript() {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id) return null;
  return (
    <Script
      id="gtm-container"
      strategy="afterInteractive"
      data-cookieconsent="statistics"
      dangerouslySetInnerHTML={{
        __html:
          "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
          "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';" +
          "j.async=true;j.setAttribute('data-cookieconsent','statistics');" +
          "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;" +
          "f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" +
          id +
          "');",
      }}
    />
  );
}
