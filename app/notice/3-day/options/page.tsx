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
              OwnerPilot AI is not a law firm and does not provide legal advice.
              The resources below are provided for informational purposes only.
              OwnerPilot does not endorse any specific resource and has no
              affiliation with the organizations listed. For legal matters
              specific to your situation, consult a California licensed attorney
              of your choosing.
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
