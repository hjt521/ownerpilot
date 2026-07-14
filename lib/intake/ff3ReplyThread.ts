// lib/intake/ff3ReplyThread.ts
// Omnibus §3 row 1 — pure helpers for the FF-3 owner→broker reply thread persisted on
// chat_sessions.broker_reply_thread (jsonb, default '[]'; migration 050). Kept side-effect-free so the append rule,
// bounds, and shape are unit-testable independent of the route/DB. The route does the read-modify-write.
//
// NOTE (pending broker ruling): the thread is owner-authored free text. It is NEVER emitted to analytics/telemetry
// and NEVER copied into a locked-prose slot. The broker-side surface renders it read-only.

/** One entry in the reply thread. `author` is 'owner' for now; 'broker' is reserved for the future inline-reply seam. */
export interface Ff3ReplyEntry {
  author: 'owner' | 'broker';
  /** Owner-authored free text, trimmed + length-bounded at the seam. */
  text: string;
  /** ISO-8601 timestamp (server clock). */
  at: string;
}

/** Max characters accepted for a single reply (mirrors the admin resolution-note bound). */
export const FF3_REPLY_MAX = 2000;
/** Defensive cap on thread length so a client loop can't grow the jsonb unbounded. */
export const FF3_REPLY_THREAD_MAX = 50;

/** Coerce an unknown jsonb value into a well-formed entry array (defends against nulls / legacy rows). */
export function normalizeReplyThread(raw: unknown): Ff3ReplyEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: Ff3ReplyEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if ((o.author === 'owner' || o.author === 'broker') && typeof o.text === 'string' && typeof o.at === 'string') {
      out.push({ author: o.author, text: o.text, at: o.at });
    }
  }
  return out;
}

export interface AppendResult {
  ok: boolean;
  thread: Ff3ReplyEntry[];
  error?: 'empty' | 'thread_full';
}

/**
 * Append an owner reply to the thread. Pure: returns the next thread (or an error) without mutating the input.
 * Trims + bounds the text; rejects empty text and a full thread. The route persists the returned thread.
 */
export function appendOwnerReply(existing: unknown, text: string, at: string): AppendResult {
  const thread = normalizeReplyThread(existing);
  const trimmed = (text ?? '').trim().slice(0, FF3_REPLY_MAX);
  if (!trimmed) return { ok: false, thread, error: 'empty' };
  if (thread.length >= FF3_REPLY_THREAD_MAX) return { ok: false, thread, error: 'thread_full' };
  return { ok: true, thread: [...thread, { author: 'owner', text: trimmed, at }] };
}
