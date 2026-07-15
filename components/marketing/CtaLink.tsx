'use client';

// components/marketing/CtaLink.tsx
// Marketing Tranche 1 — a CTA link that (a) fires a consent-gated, flag-gated marketing event on click and
// (b) navigates to a SHIPPED route. Event emission is inert in Tranche 1 (MARKETING_ANALYTICS_ENABLED off), so
// the click is a plain navigation until Tranche 3. page_path is derived from usePathname so authors never pass an
// identifier. Min 48px tap target (CLAUDE.md + WCAG 2.5.5).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fireMarketingEvent, type MarketingCtaSlug } from '@/lib/analytics/marketingEvents';

interface CtaLinkProps {
  href: string;
  ctaSlug: MarketingCtaSlug;
  sectionId?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function CtaLink({ href, ctaSlug, sectionId, children, variant = 'primary' }: CtaLinkProps) {
  const pathname = usePathname();
  const base =
    'inline-flex min-h-[48px] items-center justify-center rounded-md px-6 py-3 text-base font-semibold transition-colors';
  const style =
    variant === 'primary'
      ? 'bg-neutral-900 text-white hover:bg-neutral-700'
      : 'border border-neutral-400 text-neutral-900 hover:border-neutral-700';
  return (
    <Link
      href={href}
      onClick={() => fireMarketingEvent({ event: 'cta_click', page_path: pathname, cta_slug: ctaSlug, section_id: sectionId })}
      className={`${base} ${style}`}
    >
      {children}
    </Link>
  );
}
