// app/broker-review/check-status/page.tsx
// Lane 5 Decision 2 — recovery surface (decision2 §3.3). Owner pastes their saved broker-review link; we parse
// the token and redirect to the canonical status URL. All copy from locked-prose (BROKER_CONFIRM_CHECK_STATUS_*).

'use client';
import { useState } from 'react';
import {
  BROKER_CONFIRM_CHECK_STATUS_H1, BROKER_CONFIRM_CHECK_STATUS_INTRO,
  BROKER_CONFIRM_CHECK_STATUS_FIELD, BROKER_CONFIRM_CHECK_STATUS_BUTTON,
  BROKER_CONFIRM_CHECK_STATUS_ERROR,
} from '@/lib/decision2/brokerConfirmCopy';

/** Extract the broker-review token from a pasted canonical URL (/broker-review/<token>). */
function parseToken(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/\/broker-review\/([A-Za-z0-9]+)(?:[/?#]|$)/);
  if (m) return m[1];
  // Allow a bare 64-hex token paste as well.
  if (/^[0-9a-f]{64}$/.test(trimmed)) return trimmed;
  return null;
}

export default function CheckStatusPage() {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = parseToken(value);
    if (!token) { setError(true); return; }
    window.location.href = `/broker-review/${token}`;
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-semibold">{BROKER_CONFIRM_CHECK_STATUS_H1}</h1>
      <p className="mt-4 text-base leading-relaxed">{BROKER_CONFIRM_CHECK_STATUS_INTRO}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">{BROKER_CONFIRM_CHECK_STATUS_FIELD}</span>
          <input
            type="text"
            required
            value={value}
            onChange={(ev) => { setValue(ev.target.value); setError(false); }}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-3 min-h-[48px]"
          />
        </label>
        <button type="submit" className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
          {BROKER_CONFIRM_CHECK_STATUS_BUTTON}
        </button>
        {error && <p className="text-sm text-red-600">{BROKER_CONFIRM_CHECK_STATUS_ERROR}</p>}
      </form>
    </main>
  );
}
