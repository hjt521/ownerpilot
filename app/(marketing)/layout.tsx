// app/(marketing)/layout.tsx
// Marketing Tranche 1 — route-group layout. Flag-gated on MARKETING_TRANCHE1 (default OFF everywhere): when off,
// every marketing route in this group returns 404, so nothing is publicly reachable until a broker ruling flips
// the flag. Renders the shared MarketingFooter, which is the single source of the required sitewide disclaimer +
// broker-only license line on every page (addendum §5B.4).

import { notFound } from 'next/navigation';
import { marketingTranche1Enabled } from '@/lib/marketing/flags';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (!marketingTranche1Enabled()) notFound();
  return (
    <div className="min-h-screen bg-[#f7f4ee]">
      {children}
      <MarketingFooter />
    </div>
  );
}
