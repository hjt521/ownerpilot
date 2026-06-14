import Link from 'next/link';
import { TrustStrip } from './trust-strip';

const TAGLINE = 'The AI Advantage for California Property Owners';
const TRUST_BAR =
  'Broker-Prepared Workflow \u00B7 California Licensed Real Estate Broker';

type LandingVariantProps = {
  /** Which persona/channel this page serves, e.g. "Crisis variant — Google Search". */
  variantLabel: string;
};

/**
 * Shared shell for the UTM landing variants — R1a-2 (Concept #1 "Calm Trust").
 * Design rules preserved: 16px+ text, 48px tap target, one primary CTA, trust
 * bar above the fold (non-negotiable). Broker positioning per the redesign
 * direction: attorney-backing claims removed from marketing surfaces; the
 * standing disclaimer sentence is retained per JT (2026-06-12). The variant
 * badge is internal labeling and renders only outside production.
 */
export function LandingVariant({ variantLabel }: LandingVariantProps) {
  const showVariantBadge = process.env.NODE_ENV !== 'production';
  return (
    <main className="flex min-h-screen flex-col bg-ivory text-ink">
      {/* Trust bar — kept above the fold on every page (non-negotiable). */}
      <div className="bg-brand px-4 py-3 text-center text-base font-medium text-white">
        {TRUST_BAR}
      </div>

      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ownerpilot-mark.png" alt="OwnerPilot.AI" className="h-8 w-auto" />
            <span className="font-serif text-lg font-bold text-brand">
              OwnerPilot<span className="text-gold">.AI</span>
            </span>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          OwnerPilot AI
        </p>
        <h1 className="max-w-2xl font-serif text-4xl font-bold leading-tight text-brand sm:text-5xl">
          {TAGLINE}
        </h1>
        {showVariantBadge && (
          <span className="rounded-full bg-tint px-4 py-2 text-sm text-muted">
            {variantLabel}
          </span>
        )}
        <Link
          href="/notice/3-day"
          className="mt-4 flex min-h-[48px] items-center justify-center rounded-lg bg-brand px-8 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-brand-bar"
        >
          Create Your 3-Day Notice →
        </Link>
        <p className="text-xs text-muted">Your information is secure and private.</p>
      </section>

      <div className="border-t border-rule bg-white">
        <TrustStrip />
      </div>

      <footer className="bg-brand">
        <div className="mx-auto max-w-6xl space-y-4 px-6 py-10 text-center">
          <Link
            href="/our-approach"
            className="text-sm font-medium text-gold-soft underline underline-offset-4 transition-colors hover:text-white"
          >
            About Our Approach → How OwnerPilot keeps its platform independent
          </Link>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-white/75">
            OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
          </p>
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} OwnerPilot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
