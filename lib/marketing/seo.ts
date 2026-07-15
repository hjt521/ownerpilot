// lib/marketing/seo.ts
// Marketing Tranche 1 — SEO metadata builder + Schema.org JSON-LD object builders (pure; the render component
// lives in components/marketing/JsonLd.tsx). Titles <= 60 chars, descriptions <= 155 chars (enforced by the
// caller; helper trims defensively). Broker-only attribution.

import type { Metadata } from 'next';

const SITE = 'https://ownerpilot.ai';

export interface MarketingMetaInput {
  title: string;
  description: string;
  /** Absolute path beginning with "/" (e.g. "/california-3-day-notice"). */
  path: string;
  ogImage?: string;
}

export function buildMarketingMetadata({ title, description, path, ogImage }: MarketingMetaInput): Metadata {
  const url = `${SITE}${path}`;
  const images = ogImage ? [{ url: ogImage }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', images },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** Site-level Organization schema. Broker-only — no attorney/legal-service typing. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OwnerPilot AI',
    url: SITE,
    description:
      'Broker-supervised document preparation workflows and recordkeeping tools for California property owners.',
  };
}

export function serviceJsonLd(input: { name: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: `${SITE}${input.path}`,
    provider: { '@type': 'Organization', name: 'OwnerPilot AI', url: SITE },
    areaServed: { '@type': 'State', name: 'California' },
  };
}

export function faqPageJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function articleJsonLd(input: { headline: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: `${SITE}${input.path}`,
    publisher: { '@type': 'Organization', name: 'OwnerPilot AI', url: SITE },
  };
}
