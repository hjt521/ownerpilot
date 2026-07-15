// components/marketing/SeoLanding.tsx
// Marketing Tranche 1 — shared presentational shell for the SEO landing pages so every page renders the same
// accessible structure (one <h1>, sectioned <h2>s, one primary CTA per hero, optional FAQ). Server component.
// The sitewide disclaimer + broker license line come from MarketingFooter (route-group layout), not here — so
// they are identical on every page by construction. Copy is a Tranche-1 draft; Tranche 2 does word-by-word review.

import { CtaLink } from '@/components/marketing/CtaLink';
import { JsonLd } from '@/components/marketing/JsonLd';
import { faqPageJsonLd } from '@/lib/marketing/seo';
import type { MarketingCtaSlug } from '@/lib/analytics/marketingEvents';

export interface LandingCta {
  href: string;
  label: string;
  ctaSlug: MarketingCtaSlug;
}
export interface LandingSection {
  heading: string;
  body: string[];
}
export interface FaqItem {
  q: string;
  a: string;
}

export interface SeoLandingProps {
  eyebrow: string;
  h1: string;
  intro: string[];
  primaryCta: LandingCta;
  secondaryCta?: LandingCta;
  sections: LandingSection[];
  faqs?: FaqItem[];
  /** Optional trailing note (e.g. the UD-filed carve-out). Rendered as an emphasized callout. */
  calloutNote?: string;
}

export function SeoLanding({ eyebrow, h1, intro, primaryCta, secondaryCta, sections, faqs, calloutNote }: SeoLandingProps) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <a href="/" className="mb-8 inline-flex min-h-[48px] items-center text-base font-medium text-neutral-700 hover:text-neutral-900">
        ← Back to home
      </a>

      <header className="mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#a8895a]">{eyebrow}</p>
        <h1 className="font-serif text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">{h1}</h1>
        <div className="mt-6 space-y-4">
          {intro.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-neutral-700">{p}</p>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CtaLink href={primaryCta.href} ctaSlug={primaryCta.ctaSlug} sectionId="hero" variant="primary">
            {primaryCta.label}
          </CtaLink>
          {secondaryCta && (
            <CtaLink href={secondaryCta.href} ctaSlug={secondaryCta.ctaSlug} sectionId="hero" variant="secondary">
              {secondaryCta.label}
            </CtaLink>
          )}
        </div>
      </header>

      {sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="font-serif text-2xl font-semibold text-neutral-900">{s.heading}</h2>
          <div className="mt-3 space-y-4">
            {s.body.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-neutral-700">{p}</p>
            ))}
          </div>
        </section>
      ))}

      {calloutNote && (
        <p className="mt-10 rounded-md border border-[#a8895a] bg-[#faf6ee] px-5 py-4 text-base leading-relaxed text-neutral-800">
          {calloutNote}
        </p>
      )}

      {faqs && faqs.length > 0 && (
        <section className="mt-12" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-neutral-900">Frequently asked questions</h2>
          <dl className="mt-4 space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="text-lg font-semibold text-neutral-900">{f.q}</dt>
                <dd className="mt-2 text-base leading-relaxed text-neutral-700">{f.a}</dd>
              </div>
            ))}
          </dl>
          <JsonLd data={faqPageJsonLd(faqs)} />
        </section>
      )}
    </main>
  );
}
