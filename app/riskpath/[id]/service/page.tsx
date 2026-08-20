// app/riskpath/[id]/service/page.tsx
// Exact-record cross-device durable service surface. Route ID is never authority.

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { DurableServiceClient } from '@/components/riskpath/DurableServiceClient';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { hasFinalizedCreatedNoticeBinding } from '@/lib/riskpath/durableService';

const COOKIE = 'op_chat_token';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'Record service | OwnerPilot',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function capturedValue(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const field = (payload as Record<string, unknown>)[key];
  if (field && typeof field === 'object') {
    const value = (field as { value?: unknown }).value;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const values = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      return values.length ? values.join(', ') : null;
    }
  }
  return null;
}

export default async function DurableServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) notFound();
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session?.user_id) notFound();

  const { data: record } = await sb
    .from('riskpath_records')
    .select('id, user_id, soft_deleted_at, captured_payload, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
    .eq('id', id)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!record || !hasFinalizedCreatedNoticeBinding(record)) notFound();

  const property = capturedValue(record.captured_payload, 'property_address');
  const tenants = capturedValue(record.captured_payload, 'tenant_names');

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <a href={`/riskpath/${id}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">&larr; Back to Notice record</a>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-gold">Serve &amp; Track</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-brand">Record service and evidence</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">This record is tied to the exact Created Notice associated with this OwnerPilot record. Record facts only after they occur.</p>
        {(property || tenants) && <div className="mt-5 rounded-lg border border-rule bg-white p-4 text-sm text-gray-800">
          {property && <p><span className="font-semibold">Property:</span> {property}</p>}
          {tenants && <p className="mt-1"><span className="font-semibold">Tenant(s):</span> {tenants}</p>}
        </div>}
        <div className="mt-7"><DurableServiceClient riskpathId={id} /></div>
      </main>
    </div>
  );
}
