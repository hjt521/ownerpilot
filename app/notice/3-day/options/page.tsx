import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Your options | OwnerPilot AI',
  description:
    'Independent public resources for California landlords and tenants when a '
    + 'situation may involve more than routine nonpayment.',
};

type Resource = {
  name: string;
  href: string;
  blurb: string;
};

const RESOURCES: Resource[] = [
  {
    name: 'California Courts Self-Help — Eviction',
    href: 'https://selfhelp.courts.ca.gov/eviction',
    blurb:
      'Free, official step-by-step information on the California eviction '
      + '(unlawful detainer) process, for both landlords and tenants.',
  },
  {
    name: 'State Bar of California — Find a Lawyer Referral Service',
    href: 'https://www.calbar.ca.gov/public/find-legal-professionals/find-lawyer-referral-service',
    blurb:
      'Search certified lawyer referral services by county. Referred attorneys '
      + 'offer a reduced-fee or free initial consultation and are in good '
      + 'standing with the State Bar.',
  },
  {
    name: 'Tenants Together',
    href: 'https://www.tenantstogether.org/',
    blurb:
      'California\'s statewide renters\' rights nonprofit. '
      + 'Tenant-focused, but a useful plain-language reference for the tenant '
      + 'protections that may bear on your situation.',
  },
  {
    name: 'Stay Housed LA',
    href: 'https://www.stayhousedla.org/',
    blurb:
      'A Los Angeles County and City tenant-assistance program. Tenant-focused; '
      + 'relevant context if your rental property is in Los Angeles.',
  },
];

export default function OptionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-ivory">
        <article className="mx-auto max-w-2xl px-6 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-gold mb-3">
            Your options
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand leading-tight mb-6">
            Resources if your situation may be more than routine nonpayment
          </h1>
          <div className="space-y-4 text-base text-gray-700 leading-relaxed mb-10">
            <p>
              OwnerPilot is a broker-prepared document tool, not a law firm, and
              does not provide legal advice. The organizations below are
              independent; we don&rsquo;t control or endorse them, and listing
              them isn&rsquo;t a recommendation of any particular one.
            </p>
            <p>
              If a tenant has raised a dispute or complaint in writing, asserted
              a legal claim, or filed for bankruptcy, talking to a California
              licensed attorney of your choosing before serving any notice is
              the safest path.
            </p>
          </div>
          <ul className="space-y-4">
            {RESOURCES.map((r) => (
              <li key={r.href}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-rule bg-white px-5 py-4 shadow-sm transition-colors hover:border-brand hover:bg-tint"
                >
                  <h2 className="font-semibold text-gray-900 mb-1">
                    {r.name} <span aria-hidden className="text-gold">&#8599;</span>
                  </h2>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.blurb}</p>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-10 border-t border-rule pt-6">
            <Link
              href="/notice/3-day"
              className="text-sm font-semibold text-brand underline"
            >
              &larr; Back to the notice
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
