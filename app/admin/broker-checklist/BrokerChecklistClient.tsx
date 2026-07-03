'use client';
// Lane C1-followthrough (omnibus §3.10) — client checklist. Renders broker compliance actions with a complete
// toggle + evidence pointer; POSTs to /api/admin/broker-checklist. Admin-only surface (page is server-gated).

import { useState } from 'react';
import type { ChecklistItem } from '@/lib/admin/brokerChecklist';

export function BrokerChecklistClient({ initial }: { initial: ChecklistItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((i) => [i.key, i.evidence_path ?? ''])),
  );

  async function save(action_key: string, completed: boolean) {
    setBusy(action_key);
    try {
      const res = await fetch('/api/admin/broker-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_key, completed, evidence_path: evidence[action_key] || undefined }),
      });
      if (res.ok) setItems((await res.json()).items);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="mt-6 space-y-4">
      {items.map((it) => {
        const done = !!it.completed_at;
        return (
          <li key={it.key} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={done}
                disabled={busy === it.key}
                onChange={(e) => save(it.key, e.target.checked)}
                className="mt-1 h-5 w-5"
                aria-label={it.label}
              />
              <div className="flex-1">
                <p className="text-base">{it.label}</p>
                <p className="text-sm text-neutral-500">{it.group}</p>
                {done && (
                  <p className="mt-1 text-sm text-green-700">
                    Completed {new Date(it.completed_at!).toLocaleDateString()} by {it.completed_by ?? '—'}
                    {it.evidence_path ? ` · evidence: ${it.evidence_path}` : ''}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={evidence[it.key] ?? ''}
                    onChange={(e) => setEvidence((s) => ({ ...s, [it.key]: e.target.value }))}
                    placeholder="Evidence path or URL (screenshot filename)"
                    className="min-h-[44px] flex-1 rounded-md border border-neutral-300 px-3 text-sm"
                  />
                  {done && (
                    <button
                      type="button"
                      disabled={busy === it.key}
                      onClick={() => save(it.key, true)}
                      className="min-h-[44px] rounded-md bg-neutral-900 px-4 text-sm text-white"
                    >
                      Update evidence
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
