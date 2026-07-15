// components/marketing/MarketingFooter.tsx
// Marketing Tranche 1 — shared footer for every marketing surface (SEO pages, blog articles). Consumes the
// legalBoilerplate constants STRUCTURALLY so the required sitewide disclaimer + broker-only license line are
// identical on every page by construction — no per-page copy, no drift, and the Gate T1-A exact-string check
// reduces to "this component is imported." Server component (no interactivity). Broker-only attribution (§4A).

import Link from 'next/link';
import { SITEWIDE_DISCLAIMER, BROKER_LICENSE_LINE } from '@/lib/marketing/legalBoilerplate';

export function MarketingFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50 px-5 py-10 text-neutral-600">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Sitewide disclaimer — verbatim from the single-source constant (min 14px secondary text per CLAUDE.md). */}
        <p className="text-sm leading-relaxed">{SITEWIDE_DISCLAIMER}</p>

        {/* Broker-only credential line. Never paired with attorney credentials (§4A). */}
        <p className="text-sm font-medium text-neutral-700">{BROKER_LICENSE_LINE}</p>

        {/* CCPA 2026 surface: Do-Not-Sell + privacy links stay visible on every marketing surface. Shipped routes only. */}
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Legal and privacy">
          <Link href="/privacy" className="inline-flex min-h-[48px] items-center underline hover:text-neutral-900">
            Privacy Policy
          </Link>
          <Link href="/privacy-request" className="inline-flex min-h-[48px] items-center underline hover:text-neutral-900">
            Do Not Sell or Share My Personal Information
          </Link>
        </nav>
      </div>
    </footer>
  );
}
