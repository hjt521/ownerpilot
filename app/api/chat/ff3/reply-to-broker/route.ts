// app/api/chat/ff3/reply-to-broker/route.ts
// Omnibus §3 row 1 — FF-3 reply-to-broker seam (pre-staged behind FF3_REPLY_TO_BROKER_ENABLED, default OFF).
// Owner-authenticated to the session cookie (same pattern as /api/chat/ff3/resume). When the flag is OFF the seam is
// dark: GET reports enabled:false with no replies; POST 404s. Shipping the seam is a separate broker ruling.
//
// GET  → { enabled, replies }  (replies only surfaced when the flag is on)
// POST → { ok, replies }       (append one owner reply to chat_sessions.broker_reply_thread)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { readRequestBody } from '@/lib/http/requestBody';
import { ff3ReplyToBrokerEnabled } from '@/lib/chat/ff3ReplyFlag';
import { appendOwnerReply, normalizeReplyThread, FF3_REPLY_MAX } from '@/lib/intake/ff3ReplyThread';

const COOKIE = 'op_chat_token';

const postSchema = z.object({
  message: z.string().trim().min(1, 'message required').max(FF3_REPLY_MAX),
});

export async function GET(req: NextRequest) {
  // Dark when the flag is off — report disabled without touching the DB so the owner UI renders unchanged.
  if (!ff3ReplyToBrokerEnabled()) return NextResponse.json({ enabled: false, replies: [] });

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });

  const replies = normalizeReplyThread((session as unknown as { broker_reply_thread?: unknown }).broker_reply_thread);
  return NextResponse.json({ enabled: true, replies });
}

export async function POST(req: NextRequest) {
  // Dark when the flag is off — no persistence, endpoint appears absent.
  if (!ff3ReplyToBrokerEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });

  const parsed = postSchema.safeParse(await readRequestBody(req));
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });

  // Read-modify-write of the jsonb thread. Low-volume owner action; a lost-update race would drop at most one
  // concurrent reply from the same session (acceptable pre-flip; a broker ruling finalizes the seam before it ships).
  const s = session as unknown as { id: string; broker_reply_thread?: unknown };
  const append = appendOwnerReply(s.broker_reply_thread, parsed.data.message, new Date().toISOString());
  if (!append.ok) return NextResponse.json({ error: append.error === 'thread_full' ? 'thread_full' : 'invalid request' }, { status: 400 });

  const { error } = await sb.from('chat_sessions').update({ broker_reply_thread: append.thread }).eq('id', s.id);
  if (error) return NextResponse.json({ error: 'could not save' }, { status: 500 });
  return NextResponse.json({ ok: true, replies: append.thread });
}
