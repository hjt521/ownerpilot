import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { currentAdmin } from '@/lib/admin/isAdmin';

import { DecisionOutputPreview } from './DecisionOutputPreview';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Decision Output v1A Preview | OwnerPilot',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DecisionOutputPreviewPage() {
  if (process.env.VERCEL_ENV !== 'preview') {
    notFound();
  }

  const { isAdmin } = await currentAdmin();
  if (!isAdmin) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ivory px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-rule bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap gap-2">
            {[
              'SYNTHETIC FIXTURE',
              'INTERNAL PREVIEW',
              'NO CUSTOMER FORECAST',
              'NO ACTION / SEND AUTHORITY',
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
            OP-PDI Decision Output v1A
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-muted">
            Governed, read-only decision analysis demonstrating the separation between
            represented outcomes, explicit owner priorities, deterministic recommendation,
            local Owner Decision representation, and a non-executing next-task seam.
          </p>
        </header>

        <div className="mt-8">
          <DecisionOutputPreview />
        </div>
      </div>
    </main>
  );
}
