import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/** Homepage — R1a (Concept #1 "Calm Trust"). Replaces the create-next-app
    template. Trust-strip copy follows the approved concept mock; marketing
    copy is subject to JT preview approval. */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            3-Day Notice to Pay Rent or Quit
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight text-brand sm:text-5xl">
            Create a California 3-Day Notice in Minutes
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Answer a few simple questions and we&apos;ll prepare a
            broker-prepared 3-Day Notice that&apos;s ready to review and print.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/notice/3-day"
              className="rounded-lg bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-bar"
            >
              Generate Notice →
            </Link>
            <Link
              href="/our-approach"
              className="text-sm font-medium text-brand underline underline-offset-4 transition-colors hover:text-brand-bar"
            >
              Learn about our approach
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Your information is secure and private.
          </p>
        </section>

        <section className="border-t border-rule bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
            <div>
              <div className="mb-3 h-1 w-10 rounded bg-gold" />
              <h2 className="font-serif text-lg font-bold text-brand">
                Broker-Prepared Workflow
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Created by a California licensed real estate broker.
              </p>
            </div>
            <div>
              <div className="mb-3 h-1 w-10 rounded bg-gold" />
              <h2 className="font-serif text-lg font-bold text-brand">
                CA Licensed Real Estate Broker Review
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Get expert review from a licensed broker for extra peace of
                mind.
              </p>
            </div>
            <div>
              <div className="mb-3 h-1 w-10 rounded bg-gold" />
              <h2 className="font-serif text-lg font-bold text-brand">
                RiskPath™ Follow-Up
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Smart guidance for what comes next — service tracking, records,
                and reminders.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
