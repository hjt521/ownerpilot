'use client';

// components/chat/Ff3BrokerReply.tsx
// Omnibus §3 row 1 — owner-facing reply-to-broker widget, rendered inside the FF-3 held-state card. Pre-staged
// behind FF3_REPLY_TO_BROKER_ENABLED: on mount it asks GET /api/chat/ff3/reply-to-broker whether the seam is on.
// When OFF (default) the endpoint reports { enabled:false } and this component renders NOTHING — the held-state view
// is unchanged. When ON it shows the prior thread + a reply textarea.
//
// PLACEHOLDER COPY: the strings below are NOT locked prose. The final owner-facing wording is reserved for a broker
// ruling when the seam ships; the manifest floor stays at 130 and no entry-13 amendment is made in this seam.

import { useEffect, useState } from 'react';
import { FF3_REPLY_MAX, type Ff3ReplyEntry } from '@/lib/intake/ff3ReplyThread';

// Placeholder (non-locked) — final prose pending a broker ruling at ship time.
const REPLY_PROMPT = 'Reply to the broker’s note below.';
const REPLY_PLACEHOLDER = 'Type your reply…';

export function Ff3BrokerReply() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [replies, setReplies] = useState<Ff3ReplyEntry[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch('/api/chat/ff3/reply-to-broker');
        if (!r.ok) { if (live) setEnabled(false); return; }
        const d = await r.json();
        if (!live) return;
        setEnabled(!!d?.enabled);
        if (Array.isArray(d?.replies)) setReplies(d.replies);
      } catch {
        if (live) setEnabled(false);
      }
    })();
    return () => { live = false; };
  }, []);

  async function submit() {
    const msg = text.trim();
    if (!msg || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/chat/ff3/reply-to-broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      if (!r.ok) { setErr('Could not send. Please try again.'); setBusy(false); return; }
      const d = await r.json();
      if (Array.isArray(d?.replies)) setReplies(d.replies);
      setText('');
    } catch {
      setErr('Network error. Please try again.');
    }
    setBusy(false);
  }

  // Flag OFF (or unknown) → render nothing; held-state card is unchanged.
  if (!enabled) return null;

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4" data-testid="ff3-broker-reply">
      {replies.length > 0 && (
        <ul className="mb-3 space-y-2">
          {replies.map((e, i) => (
            <li key={i} className="rounded-md bg-white px-3 py-2 text-sm text-neutral-800">
              <span className="mr-2 text-xs uppercase tracking-wide text-neutral-400">{e.author}</span>
              {e.text}
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="ff3-reply-text" className="block text-sm font-medium text-neutral-700">{REPLY_PROMPT}</label>
      <textarea
        id="ff3-reply-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={FF3_REPLY_MAX}
        placeholder={REPLY_PLACEHOLDER}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base"
        data-testid="ff3-reply-input"
      />
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={submit}
        className="mt-2 min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white disabled:opacity-40"
        data-testid="ff3-reply-submit"
      >
        {busy ? 'Sending…' : 'Send reply'}
      </button>
    </div>
  );
}
