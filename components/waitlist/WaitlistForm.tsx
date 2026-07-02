'use client';
// components/waitlist/WaitlistForm.tsx — Fork B2 closed-beta waitlist capture form. Design rules (CLAUDE.md):
// 16px+ inputs, 48px+ tap targets, one primary CTA, plain-English states.
import { useState, type FormEvent } from 'react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="text-base font-medium text-brand" role="status">
        You’re on the list. We’ll email you when your spot opens.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="wl-email">Email address</label>
      <input
        id="wl-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="min-h-[48px] flex-1 rounded-md border border-gray-300 px-4 text-base"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="min-h-[48px] rounded-md bg-brand px-6 text-base font-semibold text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </button>
      {state === 'error' && (
        <p className="text-sm text-red-700" role="alert">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
