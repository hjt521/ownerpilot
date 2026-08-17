// app/riskpath/[id]/page.tsx
// Authenticated exact-record Owner Continuation surface. The route identifier is never authority:
// every render binds the requested id to the exact current session.user_id and excludes soft-deleted rows.

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { checkStaleness } from '@/lib/chat/stalenessCheck';
import type { IntakeState } from '@/lib/chat/intakeSchema';
import type { ProductionSnapshot } from '@/lib/flow/noticeFlowState';
import { statusMeta } from '@/lib/riskpath/statusLabels';
import { hasFinalizedCreatedNoticeBinding } from '@/lib/riskpath/durableService';
import { NOTICE_CREATED_DISPLAY_STATE, resolveOwnerContinuationTask } from '@/lib/riskpath/ownerContinuation';

const COOKIE = 'op_chat_token';
const PLACEHOLDER_SERVICE_DATE = '2026-01-01';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = { title: 'OwnerPilot record', robots: { index: false, follow: false }, referrer: 'no-referrer' };

function capturedValue(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const field = (payload as Record<string, unknown>)[key];
  if (typeof field === 'string' && field.trim()) return field.trim();
  if (field && typeof field === 'object') {
    const value = (field as { value?: unknown }).value;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const strings = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
      if (strings.length) return strings.join(', ');
    }
  }
  return null;
}

export default async function ExactRiskPathRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionToken = (await cookies()).get(COOKIE)?.value;
  if (!sessionToken) notFound();
  const sb = serviceClient();
  const session = await loadSession(sessionToken, sb);
  if (!session?.user_id) notFound();

  const { data: record } = await sb
    .from('riskpath_records')
    .select('id, user_id, current_state, notice_document_id, counsel_route_trigger, created_at, updated_at, chat_session_id, captured_payload, produce_snapshot, produce_audit, soft_deleted_at, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
    .eq('id', id)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!record) notFound();

  let stale = false;
  let staleWarning: string | null = null;
  const snapshot = (record.produce_snapshot ?? null) as ProductionSnapshot | null;
  if (snapshot && record.chat_session_id) {
    const { data: sourceSession } = await sb.from('chat_sessions').select('intake_state').eq('id', record.chat_session_id).maybeSingle();
    const intake = sourceSession?.intake_state as IntakeState | undefined;
    if (intake) {
      try {
        const verdict = checkStaleness(toNoticeFlowData(intake, PLACEHOLDER_SERVICE_DATE), snapshot);
        stale = verdict.stale;
        staleWarning = verdict.warning;
      } catch { /* inability to reassemble does not invent a stale verdict */ }
    }
  }

  const lahdEligible = record.produce_audit != null;
  let lahdFiled = false;
  if (lahdEligible) {
    const { data: filing } = await sb.from('lahd_filing_records').select('id').eq('riskpath_id', record.id).order('filed_at', { ascending: false }).limit(1).maybeSingle();
    lahdFiled = !!filing;
  }

  const task = resolveOwnerContinuationTask({ currentState: record.current_state, stale, lahdEligible, lahdFiled });
  const stateLabel = record.current_state === 'notice_created' ? NOTICE_CREATED_DISPLAY_STATE : statusMeta(record.current_state).label;
  const property = capturedValue(record.captured_payload, 'property_address');
  const tenants = capturedValue(record.captured_payload, 'tenant_names');
  const durableServiceAvailable = hasFinalizedCreatedNoticeBinding(record);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <p className="text-sm font-medium text-gray-500">Owner record</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-brand">Notice record</h1>
        {(property || tenants) && <div className="mt-5 rounded-lg border border-rule bg-white p-4">
          {property && <p className="text-sm text-gray-800"><span className="font-semibold">Property:</span> {property}</p>}
          {tenants && <p className="mt-1 text-sm text-gray-800"><span className="font-semibold">Tenant(s):</span> {tenants}</p>}
        </div>}

        <section className="mt-5 rounded-lg border border-rule bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current state</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{stateLabel}</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Current task</p>
          <p className="mt-1 text-xl font-semibold text-brand">{task.label}</p>
          {task.kind === 'record_service' && <>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{task.guidance}</p>
            {durableServiceAvailable ? <a href={`/riskpath/${id}/service`} className="mt-4 inline-flex min-h-[48px] items-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Record service &amp; evidence</a> : <p className="mt-3 text-sm text-gray-600">Service recording and evidence are unavailable for this legacy or unfinalized Notice record.</p>}
          </>}
          {task.kind === 'existing_staleness_action' && <>{staleWarning && <p className="mt-2 text-sm leading-relaxed text-amber-800">{staleWarning}</p>}<a href="/chat/review" className="mt-4 inline-flex min-h-[48px] items-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Review &amp; produce a new notice</a></>}
          {task.kind === 'existing_lahd_action' && <a href="/riskpath" className="mt-4 inline-flex min-h-[48px] items-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white">Open LAHD filing record</a>}
          {task.kind === 'review_record' && <p className="mt-2 text-sm leading-relaxed text-gray-700">Review the stored record information below. No new legal or operational step is selected here.</p>}
        </section>

        <section className="mt-5 rounded-lg border border-rule bg-white p-5">
          <h2 className="font-semibold text-gray-900">Record information</h2>
          <dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-gray-500">Created</dt><dd>{new Date(record.created_at).toLocaleDateString()}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Last updated</dt><dd>{new Date(record.updated_at).toLocaleDateString()}</dd></div></dl>
          {record.notice_document_id && <a href={`/api/documents/${record.notice_document_id}`} className="mt-4 inline-block min-h-[44px] text-sm font-medium underline">View notice PDF</a>}
        </section>
      </main>
    </div>
  );
}
