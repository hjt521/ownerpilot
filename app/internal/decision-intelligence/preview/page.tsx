import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentAdmin } from '@/lib/admin/isAdmin';
import { SYNTHETIC_DECISION_OUTPUT_PREVIEW } from '@/lib/pdi/decisionOutputPreview';

import { DecisionOutputPreview } from './DecisionOutputPreview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Decision Intelligence Preview | OwnerPilot',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DecisionIntelligencePreviewPage() {
  if (process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  const { isAdmin } = await currentAdmin();
  if (!isAdmin) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ivory px-5 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-rule bg-white/80 p-6 shadow-sm sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            {[
              'SYNTHETIC FIXTURE',
              'INTERNAL PREVIEW',
              'ADVISORY ONLY',
              'NO CUSTOMER FORECAST',
              'NO SEND AUTHORITY',
              'NO PRODUCTION AUTHORITY',
            ].map(label => (
              <span
                key={label}
                className="rounded-full border border-gold/50 bg-tint px-3 py-1 text-xs font-bold tracking-wide text-brand"
              >
                {label}
              </span>
            ))}
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-gold">
            OwnerPilot Decision Intelligence
          </p>
          <h1 className="mt-3 max-w-5xl font-serif text-4xl font-semibold leading-tight text-brand sm:text-5xl">
            Decision roadmap, calculations and negotiation-outcome Preview
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-muted sm:text-lg">
            A scientific, Founder-reviewable prototype for showing how an OwnerPilot
            recommendation could be derived from governed alternatives, explicit
            outcome branches, transparent arithmetic, uncertainty, sensitivity and
            a negotiation intervention that may improve the represented outcome.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <BoundaryCard title="Inputs" value="Deterministic synthetic fixture" />
            <BoundaryCard title="Numerics" value="Transparent fixed calculations" />
            <BoundaryCard title="Negotiation" value="Draft + projected uplift only" />
            <BoundaryCard title="Authority" value="None" />
          </div>
        </header>

        <div className="mt-8">
          <DecisionOutputPreview fixture={SYNTHETIC_DECISION_OUTPUT_PREVIEW} />
        </div>
      </div>
    </main>
  );
}

function BoundaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-tint p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
      <p className="mt-2 font-semibold text-brand">{value}</p>
    </div>
  );
}
