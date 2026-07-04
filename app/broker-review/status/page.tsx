import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { BrokerReviewStatusView } from '@/components/broker-review-status-view';

// Canonical status page for a broker-review request (Decision 2 §3). The token
// travels in the URL fragment, so the page is intentionally not personalized
// server-side; the client view reads the fragment and polls /status.
export const metadata: Metadata = {
  title: 'Broker Review Status | OwnerPilot AI',
  description: 'Check the status of your OwnerPilot broker jurisdiction review.',
  robots: { index: false, follow: false },
};

export default function BrokerReviewStatusPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-ivory">
        <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight">
            Your broker review
          </h1>
          <div className="mt-6">
            <BrokerReviewStatusView />
          </div>
        </div>
      </main>
    </>
  );
}
