// components/chat/ChatSurface.tsx
// AI-first /chat — the conversational surface. Always-on §2.2 disclaimer above the input; typing indicator;
// refusal widget + route-to-counsel handoff; redirect to /chat/review when the engine signals routeToReview.
// Talks only to POST /api/chat (the engine sets the httpOnly anon-token cookie).

'use client';
import { useState, useRef, useEffect } from 'react';
import { lockedProse } from '@/lib/compliance/lockedProse';
import { showsCounselHandoff, appendsChatDisclaimer, type ChatMessageVM, type ChatTurnResponse } from '@/lib/chat/clientTypes';

// LockedKey: CHAT_LANDING_DISCLAIMER
const CHAT_DISCLAIMER = lockedProse('CHAT_LANDING_DISCLAIMER');

export function ChatSurface() {
  const [messages, setMessages] = useState<ChatMessageVM[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    const ownerMsg: ChatMessageVM = { id: `o${Date.now()}`, role: 'owner', content: text, refusal: null };
    setMessages((m) => [...m, ownerMsg]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) { setError("The assistant is unavailable right now. Please try again."); setBusy(false); return; }
      const data = (await res.json()) as ChatTurnResponse;
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: data.reply, refusal: data.refusal }]);
      if (data.routeToReview) { window.location.href = '/chat/review'; return; }
    } catch {
      setError('Network error. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4">
      <div className="flex-1 space-y-4 overflow-y-auto py-6" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-base leading-relaxed text-neutral-600">
            Tell us what&apos;s happening with your tenant — rent owed, payment dates, who&apos;s on the lease, the
            property address. I&apos;ll ask one question at a time and confirm each detail with you.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'owner' ? 'text-right' : 'text-left'}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
              m.role === 'owner' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
              {m.content}
            </div>
            {m.role === 'assistant' && appendsChatDisclaimer(m.refusal) && (
              <p className="mt-1 text-xs italic text-neutral-500">{CHAT_DISCLAIMER}</p>
            )}
            {m.role === 'assistant' && showsCounselHandoff(m.refusal) && (
              <a href="/route-to-counsel" className="mt-2 inline-block min-h-[44px] text-sm underline">
                Find a California landlord-tenant attorney →
              </a>
            )}
          </div>
        ))}
        {busy && <div className="text-left"><span className="inline-block rounded-2xl bg-neutral-100 px-4 py-2.5 text-neutral-400">…</span></div>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={endRef} />
      </div>

      {/* §2.2 disclaimer — always on, above the input */}
      <p className="border-t border-neutral-200 pt-2 text-xs text-neutral-500">{CHAT_DISCLAIMER}</p>
      <form onSubmit={send} className="flex items-end gap-2 py-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          rows={1}
          placeholder="Type your message…"
          className="min-h-[48px] flex-1 resize-none rounded-md border border-neutral-300 px-3 py-3 text-base"
          aria-label="Message"
        />
        <button type="submit" disabled={busy || !input.trim()}
          className="min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
