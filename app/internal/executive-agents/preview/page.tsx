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
  CaoPreviewWorkbenchForm,
} from './CaoPreviewWorkbenchForm';

export const dynamic = 'force-dynamic';

export const metadata:
Metadata = {
  title:
    'CAO Preview Workbench | OwnerPilot',
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
      <div className="mx-auto max-w-6xl">
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
            Chief Architecture Officer Workbench
          </h1>

          <p className="mt-4 max-w-4xl text-base leading-7 text-muted sm:text-lg">
            Initiate one bounded architecture assignment using a server-collected,
            immutable, allowlisted repository evidence packet. The application
            performs one pinned Gateway request, releases only validated final
            output, and starts no follow-on action.
          </p>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-4">
            <BoundaryCard
              title="Role"
              value="Chief Architecture Officer only"
            />
            <BoundaryCard
              title="Evidence"
              value="Approved immutable scope"
            />
            <BoundaryCard
              title="Model"
              value="Registry-pinned primary"
            />
            <BoundaryCard
              title="Execution"
              value="One human-initiated run"
            />
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-rule bg-white p-6 shadow-sm sm:p-9">
          <CaoPreviewWorkbenchForm />
        </section>

        <aside className="mt-8 rounded-2xl border border-gold/40 bg-[#fffaf0] p-5 text-sm leading-6 text-ink">
          <strong className="text-brand">
            Authority boundary:
          </strong>{' '}
          This surface cannot browse arbitrary repositories, read environment
          files, use tools, write GitHub, persist reports server-side, deploy,
          access Production data, activate roles, change models, continue
          automatically, or perform legal, notice, payment, attorney,
          jurisdiction, or Los Angeles actions.
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
