'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { __opOwnerContinuationLocator?: string }
}

type Phase = 'checking' | 'email' | 'sent' | 'unavailable';

function takeBootstrappedLocator(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.__opOwnerContinuationLocator;
  try { delete window.__opOwnerContinuationLocator; } catch { /* ephemeral value only */ }
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function OwnerContinuationScan() {
  const locatorRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  if (!startedRef.current && typeof window !== 'undefined') {
    locatorRef.current = takeBootstrappedLocator();
    startedRef.current = true;
  }

  async function admit(body: { locator: string; email?: string }) {
    return fetch('/api/owner-continuation/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    });
  }

  useEffect(() => {
    const locator = locatorRef.current;
    if (!locator) { setPhase('unavailable'); return; }
    let active = true;
    (async () => {
      try {
        const r = await admit({ locator });
        const j = await r.json().catch(() => ({})) as { destination?: string; authenticationRequired?: boolean };
        if (!active) return;
        if (r.ok && typeof j.destination === 'string') {
          locatorRef.current = null;
          window.location.assign(j.destination); // hard navigation: fresh sensitive-route telemetry gate
          return;
        }
        if (r.ok && j.authenticationRequired === true) { setPhase('email'); return; }
        locatorRef.current = null;
        setPhase('unavailable');
      } catch {
        locatorRef.current = null;
        if (active) setPhase('unavailable');
      }
    })();
    return () => { active = false; };
  }, []);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    const locator = locatorRef.current;
    if (!locator || busy) return;
    setBusy(true);
    try {
      const r = await admit({ locator, email });
      locatorRef.current = null; // raw locator no longer needed after controlled admission POST
      setPhase(r.ok ? 'sent' : 'unavailable');
    } catch {
      locatorRef.current = null;
      setPhase('unavailable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-rule bg-white p-6 shadow-sm">
      <h1 className="font-serif text-2xl font-semibold text-brand">Continue your OwnerPilot record</h1>
      {phase === 'checking' && <p className="mt-3 text-sm text-gray-600">Checking this continuation code…</p>}
      {phase === 'email' && (
        <form onSubmit={requestLink} className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-gray-700">Enter the email used with OwnerPilot. We’ll send a secure sign-in link if it matches this record.</p>
          <label className="block text-sm font-medium text-gray-800">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <button type="submit" disabled={busy}
            className="min-h-[48px] rounded-md bg-ink px-5 py-3 text-white disabled:opacity-50">
            {busy ? 'Sending…' : 'Send secure sign-in link'}
          </button>
        </form>
      )}
      {phase === 'sent' && (
        <p className="mt-3 text-sm leading-relaxed text-gray-700">If that email matches this OwnerPilot record, a secure sign-in link is on its way. Open it in this browser to continue.</p>
      )}
      {phase === 'unavailable' && (
        <p className="mt-3 text-sm leading-relaxed text-gray-700">This continuation link is unavailable. Sign in to OwnerPilot to review your records.</p>
      )}
    </section>
  );
}
