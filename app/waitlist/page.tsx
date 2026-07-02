// app/waitlist/page.tsx — Fork B2 closed-beta waitlist landing. Trust credentials above the fold (CLAUDE.md),
// one primary CTA, 16px body. Non-allowlisted magic-link requests point owners here.
import type { Metadata } from 'next';
import { TrustStrip } from '@/components/trust-strip';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';

export const metadata: Metadata = {
  title: 'Join the OwnerPilot AI waitlist',
  description:
    'OwnerPilot AI is in a limited California beta. Join the waitlist and we’ll email you when your spot opens.',
};

export default function WaitlistPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">
        The AI Advantage for California Property Owners
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand">OwnerPilot AI is in limited beta</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        We’re opening to a small group of California property owners first. Add your email and we’ll let you know
        the moment your spot is ready.
      </p>
      <div className="mt-8">
        <WaitlistForm />
      </div>
      <TrustStrip />
    </main>
  );
}
