// components/chat/ReviewScreen.tsx
// Renders grouped captured fields with inline edit; CTAs for produce (Group 4) + send-draft magic-link (Group 3).
// Account number arrives already masked from /api/chat/review (G8).

'use client';
import { useEffect, useState } from 'react';

interface ReviewField { field: string; label: string; display: string; sensitive: boolean; }
interface ReviewGroup { heading: string; fields: ReviewField[]; }

export function ReviewScreen() {
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/chat/review');
    if (!r.ok) { setErr('No review session found. Start a chat first.'); return; }
    const d = await r.json(); setGroups(d.groups); setMissing(d.missingFields ?? []);
  }
  useEffect(() => { load(); }, []);

  async function saveEdit(field: string) {
    setErr(null);
    const r = await fetch('/api/chat/review', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: draft }),
    });
    const d = await r.json();
    if (!r.ok) { setErr(d.error ?? 'Could not save.'); return; }
    setGroups(d.groups); setMissing(d.missingFields ?? []); setEditing(null); setDraft('');
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Review your details</h1>
      <p className="mt-2 text-sm text-neutral-600">Check every detail before we generate the PDF. Edit anything that&apos;s off.</p>

      {groups.map((g) => (
        <section key={g.heading} className="mt-6 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-medium">{g.heading}</h2>
          <dl className="mt-3 space-y-2">
            {g.fields.map((f) => (
              <div key={f.field} className="flex items-start justify-between gap-3">
                <dt className="text-sm text-neutral-500">{f.label}</dt>
                <dd className="flex-1 text-right text-sm">
                  {editing === f.field ? (
                    <span className="flex items-center justify-end gap-2">
                      <input value={draft} onChange={(e) => setDraft(e.target.value)}
                        className="min-h-[44px] w-48 rounded border border-neutral-300 px-2 py-1 text-left" autoFocus />
                      <button onClick={() => saveEdit(f.field)} className="min-h-[44px] text-sm underline">Save</button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-2">
                      <span>{f.display}</span>
                      <button onClick={() => { setEditing(f.field); setDraft(f.sensitive ? '' : f.display === '—' ? '' : f.display); }}
                        className="min-h-[44px] text-xs underline text-neutral-500">Edit</button>
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
      {missing.length > 0 && (
        <p className="mt-4 text-sm text-amber-700">Still needed before generating: {missing.join(', ')}.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {/* Group 4 — notice-rail produce */}
        <button disabled={missing.length > 0}
          onClick={() => { window.location.href = '/api/notice/produce/from-chat'; }}
          className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white disabled:opacity-40">
          Generate notice PDF
        </button>
        {/* Group 3 — magic-link send-draft */}
        <button onClick={() => { window.location.href = '/chat/review?send=1'; }}
          className="min-h-[48px] rounded-md border border-neutral-300 px-5 py-3">
          Send myself this draft
        </button>
      </div>
    </main>
  );
}
