// app/riskpath/page.tsx — owner records dashboard (master prompt §H; claimed-only).

import { SiteHeader } from '@/components/site-header';
import { Dashboard } from '@/components/riskpath/Dashboard';

export const metadata = { title: 'Your RiskPath — OwnerPilot AI', robots: { index: false } };

export default function RiskPathPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Dashboard />
    </div>
  );
}
