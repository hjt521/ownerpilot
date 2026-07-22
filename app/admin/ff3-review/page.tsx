// app/admin/ff3-review/page.tsx
// FF-3 Block B — the awaiting_broker_review resolution surface. Server-gated by ADMIN_EMAILS (ruling §2): a
// non-admin (or signed-out) visitor gets 404 (notFound) so it isn't discoverable. Admin sees the sessions the
// FF-3 reconciliation gate escalated (owner selected (3) / a defect) with the reconciliation gap, and resolves
// each with a broker note that later surfaces to the owner verbatim (entry-13). No owner PII on the list itself
// (ruling §3) — the transcript is behind the per-session deep link.

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { currentAdmin } from '@/lib/admin/isAdmin';
import { loadAwaitingReview } from '@/lib/admin/ff3Review';
import { Ff3ReviewClient } from './Ff3ReviewClient';

export const dynamic = 'force-dynamic';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export default async function Ff3ReviewPage() {
  const { isAdmin } = await currentAdmin();
  if (!isAdmin) notFound();

  // Distinguish "no sessions awaiting review" from "the query broke" — a swallowed error previously rendered the
  // empty-state, which is how the migration-050 drift hid. On failure, render a legible banner (client) instead of
  // the generic error boundary, and log server-side.
  let items: Awaited<ReturnType<typeof loadAwaitingReview>> = [];
  let queryFailed = false;
  try {
    items = await loadAwaitingReview(svc());
  } catch (e) {
    console.error('[ff3-review] page load failed:', e instanceof Error ? e.message : e);
    queryFailed = true;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold">FF-3 broker review</h1>
      <p className="mt-2 text-base text-neutral-600">
        Sessions the reconciliation gate escalated for broker review. Review the gap, open the transcript if you
        need context, then leave a resolution note. The note is shown to the owner verbatim when they next open
        their session — it does not notify them and does not auto-resume the case.
      </p>
      <Ff3ReviewClient initial={items} queryFailed={queryFailed} />
    </main>
  );
}
