'use client';

// app/admin/ff3-review/Ff3ReviewClient.tsx
// FF-3 Block B client. Renders the awaiting-review list (no owner PII), a per-session transcript deep link, and the
// resolve form. Two locked-language carve-outs (ruling §6): (a) the note field warns the operator the text is
// owner-facing verbatim; (b) the success confirmation does not claim the owner was notified.

import { useState } from 'react';
import type { AwaitingReviewRow } from '@/lib/admin/ff3Review';

function money(n: number | null): string {
  return n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// (§6b) Success string must not misrepresent mechanism — no "owner has been notified".
const RESOLVE_SUCCESS = 'Note saved. It will surface when the owner next opens their session.';
// (§6a) Placeholder warns the note is shown to the owner verbatim.
const NOTE_PLACEHOLDER =
  'Written to the owner verbatim — they see exactly this when they next open their session. Explain what you found and how to proceed.';

export function Ff3ReviewClient({ initial }: { initial: AwaitingReviewRow[] }) {
  const [rows, setRows] = useState<AwaitingReviewRow[]>(initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, unknown[] | null>>({});

  async function viewTranscript(id: string) {
    if (transcripts[id]) { setTranscripts((t) => ({ ...t, [id]: null })); return; }
    const res = await fetch(`/api/admin/ff3-review?session=${encodeURIComponent(id)}`);
    const json = await res.json().catch(() => ({}));
    setTranscripts((t) => ({ ...t, [id]: Array.isArray(json.transcript) ? json.transcript : [] }));
  }

  async function resolve(id: string) {
    const note = (notes[id] ?? '').trim();
    if (!note) { setMsg('Enter a note before resolving.'); return; }
    setBusy(id); setMsg(null);
    const res = await fetch('/api/admin/ff3-review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: id, broker_resolution_note: note }),
    });
    setBusy(null);
    if (!res.ok) { setMsg('Could not save. Try again.'); return; }
    const json = await res.json().catch(() => ({}));
    setRows(Array.isArray(json.items) ? json.items : rows.filter((r) => r.session_id !== id));
    setMsg(RESOLVE_SUCCESS);
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Always render the confirmation message — even after resolving the last item empties the list. */}
      {msg && <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{msg}</p>}
      {rows.length === 0 && (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-6 text-neutral-600">No sessions awaiting broker review.</p>
      )}
      {rows.map((r) => {
        const delta = r.notice_amount != null && r.ledger_total != null ? r.notice_amount - r.ledger_total : null;
        return (
          <div key={r.session_id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(r.session_id)}
                className="font-mono text-xs text-neutral-500 hover:text-neutral-800"
                title="Copy session id"
              >
                {r.session_id} ⧉
              </button>
              <span className="text-xs text-neutral-500">
                escalated {r.reconciliation_resolved_at ? new Date(r.reconciliation_resolved_at).toLocaleString() : '—'}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-neutral-500">Notice amount</dt><dd className="font-semibold">{money(r.notice_amount)}</dd></div>
              <div><dt className="text-neutral-500">Ledger total</dt><dd className="font-semibold">{money(r.ledger_total)}</dd></div>
              <div><dt className="text-neutral-500">Gap</dt><dd className="font-semibold">{money(delta)}</dd></div>
            </dl>

            <button type="button" onClick={() => viewTranscript(r.session_id)} className="mt-3 text-sm text-brand underline">
              {transcripts[r.session_id] ? 'Hide transcript' : 'View transcript'}
            </button>
            {transcripts[r.session_id] && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100">
                {JSON.stringify(transcripts[r.session_id], null, 2)}
              </pre>
            )}

            {/* Omnibus §3 row 1: owner reply thread, read-only. Empty until the reply seam ships (flag off). */}
            {r.reply_thread.length > 0 && (
              <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Owner replies</p>
                <ul className="space-y-2">
                  {r.reply_thread.map((e, i) => (
                    <li key={i} className="text-sm text-neutral-800">
                      <span className="mr-2 text-xs uppercase tracking-wide text-neutral-400">{e.author}</span>
                      {e.text}
                      <span className="ml-2 text-xs text-neutral-400">{new Date(e.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-neutral-700">Resolution note</label>
            <textarea
              value={notes[r.session_id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [r.session_id]: e.target.value }))}
              placeholder={NOTE_PLACEHOLDER}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy === r.session_id}
              onClick={() => resolve(r.session_id)}
              className="mt-2 min-h-[44px] rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === r.session_id ? 'Saving…' : 'Resolve'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
