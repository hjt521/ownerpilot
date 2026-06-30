// app/page.tsx — Lane 8 homepage (AI-first rebuild). Replaces the R1a "Calm Trust" homepage.
// Composition per Lane 8 INTEGRATION_NOTES: Hero → HowItWorks → Features → CTA → FAQ(NewFaqItems) → footer.
// SiteHeader + TrustStrip retained for above-fold attorney/broker trust badges (CLAUDE.md design rule).
// Hero illustration slot stays text-only for now (Canva asset handled separately).

import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { TrustStrip } from '@/components/trust-strip';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Features } from '@/components/marketing/Features';
import { NewFaqItems } from '@/components/marketing/Faq';
import { FooterLegal } from '@/components/marketing/FooterLegal';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <TrustStrip />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />

        {/* CTA band (the "existing pricing/CTA" slot — no pricing page in scope yet) */}
        <section className="mx-auto max-w-3xl px-5 py-14 text-center">
          <Link
            href="/chat"
            className="inline-block min-h-[48px] rounded-md bg-neutral-900 px-6 py-3 text-white"
          >
            Start a notice
          </Link>
        </section>

        {/* FAQ — Lane 8 Surface 6: the 4 new items render first; existing FAQ items (none yet) would follow. */}
        <section id="faq" className="mx-auto max-w-2xl px-5 py-14">
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          <div className="mt-6">
            <NewFaqItems />
            {/* existing FAQ items render below when added */}
          </div>
        </section>
      </main>
      <SiteFooter />
      {/* FooterLegal: render here for now; canonical home is INSIDE components/site-footer.tsx for global
          coverage on every page — move it there in one edit and drop this page-level mount. */}
      <FooterLegal />
    </div>
  );
}
