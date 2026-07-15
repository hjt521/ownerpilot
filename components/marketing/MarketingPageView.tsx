'use client';

// components/marketing/MarketingPageView.tsx
// Marketing Tranche 1, slice 5 — emits a consent-gated, flag-gated `page_view` marketing event once per marketing
// route mount. Inert in Tranche 1 (MARKETING_ANALYTICS_ENABLED off + consent not granted → fireMarketingEvent
// drops). Rendered once by the (marketing) route-group layout, so every marketing page reports page_view without
// each page having to remember to. page_path is derived from usePathname — no identifier is ever passed.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fireMarketingEvent } from '@/lib/analytics/marketingEvents';

export function MarketingPageView() {
  const pathname = usePathname();
  useEffect(() => {
    fireMarketingEvent({ event: 'page_view', page_path: pathname });
  }, [pathname]);
  return null;
}
