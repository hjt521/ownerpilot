// app/preferences/email/page.tsx
// Part B-2 (p1_email_trigger_dependencies_broker_ruling_2026-07-05 B2 safeguard 2). Granular per-notification-type
// email preferences — the destination of the CAN-SPAM footer link in owner-facing transactional email. Auth-gated
// via the account cookie (the API returns 401 when signed out). Client component: reads current opt-outs, toggles
// per type.
'use client';

import { useEffect, useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
  'lahd-confirmation': 'LAHD filing confirmation emails',
};

export default function EmailPreferencesPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [optedOut, setOptedOut] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'signed_out' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/account/email-preferences').catch(() => null);
      if (!r) { setStatus('error'); return; }
      if (r.status === 401) { setStatus('signed_out'); return; }
      if (!r.ok) { setStatus('error'); return; }
      const data = await r.json();
      setTypes(data.manageableTypes ?? []);
      setOptedOut(data.optedOut ?? []);
      setStatus('ready');
    })();
  }, []);

  async function toggle(type: string, nextOptedOut: boolean) {
    // optimistic
    setOptedOut((prev) => (nextOptedOut ? [...new Set([...prev, type])] : prev.filter((t) => t !== type)));
    const r = await fetch('/api/account/email-preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_type: type, opted_out: nextOptedOut }),
    }).catch(() => null);
    if (!r || !r.ok) {
      // revert on failure
      setOptedOut((prev) => (nextOptedOut ? prev.filter((t) => t !== type) : [...new Set([...prev, type])]));
    }
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-2xl font-semibold">Email preferences</h1>
      <p className="mt-2 text-base leading-relaxed text-neutral-700">
        Choose which emails OwnerPilot sends to your account address. Turning one off takes effect on the next send.
      </p>

      {status === 'loading' && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {status === 'signed_out' && (
        <p className="mt-6 text-base text-neutral-700">Please sign in to manage your email preferences.</p>
      )}
      {status === 'error' && (
        <p className="mt-6 text-base text-red-600">We couldn&apos;t load your preferences. Please try again.</p>
      )}

      {status === 'ready' && (
        <ul className="mt-6 space-y-4">
          {types.map((type) => {
            const isOn = !optedOut.includes(type);
            return (
              <li key={type} className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 p-4">
                <span className="text-base text-ink">{TYPE_LABELS[type] ?? type}</span>
                <label className="flex min-h-[48px] items-center gap-2 text-sm">
                  <input type="checkbox" checked={isOn} onChange={(e) => toggle(type, !e.target.checked)}
                    className="min-h-[24px] min-w-[24px]" />
                  {isOn ? 'On' : 'Off'}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
