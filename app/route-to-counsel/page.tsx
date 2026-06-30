// app/route-to-counsel/page.tsx
// Lane 5 Decision 2 — referral landing. All copy from locked-prose (Lane 8 Surface 11 + decision2 §2.G preambles).
// No top-nav link (Lane 8 Fork 1); reachable from not_la/inconclusive/expired status states + refusal routing.

import {
  ROUTE_TO_COUNSEL_HEADING, ROUTE_TO_COUNSEL_BODY, ROUTE_TO_COUNSEL_FEE_DISCLAIMER,
  ROUTE_TO_COUNSEL_RESOURCES, ROUTE_TO_COUNSEL_CTA,
} from '@/lib/decision2/routeToCounselCopy';

export const metadata = {
  title: 'Find a California licensed attorney — OwnerPilot',
  robots: { index: false }, // outcome destination, not a marketing landing (Lane 8 Fork 1)
};

export default function RouteToCounselPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">{ROUTE_TO_COUNSEL_HEADING}</h1>
      <p className="mt-4 text-base leading-relaxed">{ROUTE_TO_COUNSEL_BODY}</p>

      <p className="mt-6 text-sm text-neutral-600">{ROUTE_TO_COUNSEL_FEE_DISCLAIMER}</p>

      <section className="mt-8 rounded-lg border border-neutral-200 p-5">
        {/* Resource block is locked-prose; render preformatted to preserve the listed phone/URL lines. */}
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{ROUTE_TO_COUNSEL_RESOURCES}</pre>
      </section>

      <a href="/chat" className="mt-8 inline-block min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
        {ROUTE_TO_COUNSEL_CTA}
      </a>
    </main>
  );
}
