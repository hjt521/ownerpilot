// app/privacy-request/page.tsx
// Lane 6 / ruling §3 — CCPA/CPRA request form. H1 = locked DISCLAIMER_DO_NOT_SELL_HEADER; body = locked
// PRIVACY_REQUEST_BODY rendered as a SINGLE block above the request-type selector (ruling §3 wiring notes:
// em-dashes byte-exact, parenthetical numerals intentional, no section headers).

'use client';
import { useState } from 'react';
import { lockedProse } from '@/lib/compliance/lockedProse';

// LockedKey: DISCLAIMER_DO_NOT_SELL_HEADER
// LockedKey: PRIVACY_REQUEST_BODY
const HEADER = lockedProse('DISCLAIMER_DO_NOT_SELL_HEADER');
const BODY = lockedProse('PRIVACY_REQUEST_BODY');

const REQUEST_TYPES: { value: string; label: string }[] = [
  { value: 'know', label: 'Right to Know' },
  { value: 'delete', label: 'Right to Delete' },
  { value: 'correct', label: 'Right to Correct' },
  { value: 'opt_out', label: 'Right to Opt Out of Sale/Sharing' },
  { value: 'limit_sensitive', label: 'Right to Limit Sensitive Information' },
];

export default function PrivacyRequestPage() {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [requestType, setRequestType] = useState('opt_out');
  const [email, setEmail] = useState('');

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const res = await fetch('/api/privacy-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_type: requestType, contact_email: email }),
    });
    setStatus(res.ok ? 'sent' : 'error');
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">{HEADER}</h1>

      {/* PRIVACY_REQUEST_BODY — single locked block above the selector; preserve line breaks (em-dash bullets). */}
      <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{BODY}</div>

      {status === 'sent' ? (
        <p className="mt-8 text-base">Your request has been received. We will acknowledge it by email.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm">Request type</span>
            <select
              value={requestType}
              onChange={(x) => setRequestType(x.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-3 min-h-[48px]"
            >
              {REQUEST_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(x) => setEmail(x.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-3 min-h-[48px]"
            />
          </label>
          <button type="submit" className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
            Submit request
          </button>
          {status === 'error' && <p className="text-sm text-red-600">A valid request type and email are required.</p>}
        </form>
      )}
    </main>
  );
}
