// app/admin/broker-checklist/page.tsx
// Lane C1-followthrough (omnibus §3.10) — broker compliance checklist. Server-gated by ADMIN_EMAILS: a
// non-admin (or signed-out) visitor gets 404 (notFound) so the surface isn't discoverable. Admin sees the
// tracked broker-side actions (e.g. the C1 Sentry org toggles) with completion + evidence.

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { currentAdmin } from '@/lib/admin/isAdmin';
import { loadChecklist } from '@/lib/admin/brokerChecklist';
import { BrokerChecklistClient } from './BrokerChecklistClient';

export const dynamic = 'force-dynamic';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export default async function BrokerChecklistPage() {
  const { isAdmin } = await currentAdmin();
  if (!isAdmin) notFound();

  const items = await loadChecklist(svc());

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Broker compliance checklist</h1>
      <p className="mt-2 text-base text-neutral-600">
        Broker-side compliance actions tracked by the platform. Mark complete and record an evidence pointer
        (screenshot filename or URL) for the Gate-3 evidence packet.
      </p>
      <BrokerChecklistClient initial={items} />
    </main>
  );
}
