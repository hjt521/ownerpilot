import type {
  Metadata,
} from 'next';

import {
  notFound,
} from 'next/navigation';

import {
  currentAdmin,
} from '@/lib/admin/isAdmin';

import {
  LivePreviewExecutiveAgentForm,
} from './LivePreviewExecutiveAgentForm';

export const dynamic = 'force-dynamic';

export const metadata:
Metadata = {
  title:
    'Executive Agent Preview | OwnerPilot',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ExecutiveAgentPreviewPage() {
  if (
    process.env.VERCEL_ENV !==
      'preview' ||
    process.env
      .EXECUTIVE_AGENTS_PREVIEW_ENABLED !==
      'true'
  ) {
    notFound();
  }

  const {
    isAdmin,
  } = await currentAdmin();

  if (!isAdmin) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ivory px-5 py-10 text-ink sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-rule bg-white/80 p-6 shadow-sm sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            {[
              'NONCANONICAL',
              'ADVISORY',
              'DRAFT-ONLY',
              'HUMAN REVIEW REQUIRED',
              'NO IMPLEMENTATION AUTHORITY',
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
            Restricted internal Preview
          </p>

          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-brand sm:text-5xl">
            Chief Architecture Officer Preview
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            Initiate one bounded synthetic or approved nonsensitive CAO run.
            The server invokes one pinned Gateway model, withholds substantive
            content until complete validation succeeds, and retains all
            disposition and implementation authority with the human reviewer.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <BoundaryCard
              title="Role"
              value="Chief Architecture Officer only"
            />
            <BoundaryCard
              title="Model slot"
              value="Pinned primary only"
            />
            <BoundaryCard
              title="Execution"
              value="One human-initiated run"
            />
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-rule bg-white p-6 shadow-sm sm:p-9">
          <LivePreviewExecutiveAgentForm />
        </section>

        <aside className="mt-8 rounded-2xl border border-gold/40 bg-[#fffaf0] p-5 text-sm leading-6 text-ink">
          <strong className="text-brand">
            Input boundary:
          </strong>{' '}
          Do not enter customer, tenant, legal-case, property-address,
          payment, notice, credential, authentication-header, health,
          financial-account, personally identifying, confidential,
          privileged, jurisdiction, Los Angeles-rule, Production, or other
          sensitive information.
        </aside>
      </div>
    </main>
  );
}

function BoundaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-tint p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">
        {title}
      </p>
      <p className="mt-2 font-semibold text-brand">
        {value}
      </p>
    </div>
  );
}
