// components/riskpath/Dashboard.tsx — claimed-only RiskPath records list with status badges + document links.

'use client';
import { useEffect, useState } from 'react';
import { statusMeta, type StatusTone } from '@/lib/riskpath/statusLabels';

interface RecordVM {
  id: string; current_state: string; notice_document_id: string | null;
  counsel_route_trigger: string | null; created_at: string; updated_at: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  progress: 'bg-blue-50 text-blue-800',
  resolved: 'bg-green-50 text-green-800',
  attention: 'bg-amber-50 text-amber-800',
};

export function Dashboard() {
  const [records, setRecords] = useState<RecordVM[] | null>(null);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    fetch('/api/riskpath').then(async (r) => {
      if (r.status === 401) { setUnauth(true); return; }
      const d = await r.json(); setRecords(d.records ?? []);
    });
  }, []);

  if (unauth) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Your RiskPath</h1>
        <p className="mt-4">Sign in with the link we emailed you to view your saved records.</p>
        <a href="/chat" className="mt-6 inline-block min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">Start a notice</a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Your RiskPath</h1>
      {records === null && <p className="mt-4 text-neutral-400">Loading…</p>}
      {records?.length === 0 && <p className="mt-4 text-neutral-600">No records yet. When you generate a notice, it will appear here.</p>}
      <ul className="mt-6 space-y-3">
        {records?.map((r) => {
          const meta = statusMeta(r.current_state);
          return (
            <li key={r.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>
                <span className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.counsel_route_trigger && (
                <p className="mt-2 text-sm text-amber-700">Counsel-route: {r.counsel_route_trigger}</p>
              )}
              {r.notice_document_id && (
                <a href={`/api/documents/${r.notice_document_id}`} className="mt-2 inline-block min-h-[44px] text-sm underline">
                  View notice PDF
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
