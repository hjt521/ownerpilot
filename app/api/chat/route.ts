// app/api/chat/route.ts — AI-first /chat orchestration (SUPERSEDES the prior single-turn ai_sessions Q&A route).
// One turn: load/create session → build messages (locked persona + history + owner msg [+ missing-fields inject]) →
// callPerplexity → applyTurn → persist chat_sessions → return { reply, refusal, routeToReview }.
// G5: the locked persona is sent verbatim; the only runtime channels are history, the owner message, and the
// §E.4 missing-fields system note. G4: counsel-route hard-stop lives in the PRODUCE route, not here.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OWNERPILOT_PERSONA_SYSTEM_PROMPT } from '@/lib/chat/persona';
import { callPerplexity } from '@/lib/chat/perplexityClient';
import { applyTurn } from '@/lib/chat/orchestrate';
import { loadSession, createSession, hashAnonToken, serviceClient } from '@/lib/chat/session';
import { unsupportedLanguageNotice } from '@/lib/chat/refusalBank';
import type { ChatMessage } from '@/lib/chat/responseFormat';
import type { TranscriptTurn } from '@/lib/chat/dbTypes';

const COOKIE = 'op_chat_token';
const bodySchema = z.object({ message: z.string().min(1).max(4000), language: z.enum(['en', 'es']).optional() });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const { message, language } = parsed.data;

  const sb = serviceClient();
  let rawToken = req.cookies.get(COOKIE)?.value ?? '';
  let session = rawToken ? await loadSession(rawToken, sb) : null;
  let setCookie = false;
  if (!session) {
    const created = await createSession(sb);
    rawToken = created.rawToken; setCookie = true;
    session = await loadSession(rawToken, sb);
  }
  if (!session) return NextResponse.json({ error: 'session error' }, { status: 500 });

  // Build the message list: locked persona (verbatim) + transcript history + this owner message.
  const history: ChatMessage[] = (session.transcript ?? []).map((t: TranscriptTurn) => ({
    role: t.role === 'owner' ? 'user' : 'assistant', content: t.content,
  }));
  const messages: ChatMessage[] = [
    { role: 'system', content: OWNERPILOT_PERSONA_SYSTEM_PROMPT },
    ...(language === 'es' ? [{ role: 'system' as const, content: `language_preference=es. ${unsupportedLanguageNotice()}` }] : []),
    ...history,
    { role: 'user', content: message },
  ];

  let model;
  try { model = await callPerplexity(messages); }
  catch (e) {
    return NextResponse.json({ error: 'assistant unavailable', detail: (e as Error).message }, { status: 502 });
  }

  const turn = applyTurn(session.intake_state ?? {}, message, model);

  // §E.4: if the model claimed complete prematurely, re-prompt next turn with the missing fields (do not route).
  const updated = await sb.from('chat_sessions').update({
    intake_state: turn.intakeState,
    transcript: [...(session.transcript ?? []), ...turn.transcriptAdditions],
    intake_complete: turn.intakeComplete,
    status: turn.status,
    last_refusal: turn.refusal,
    message_count: (session.message_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', session.id);
  if (updated.error) return NextResponse.json({ error: 'persist failed' }, { status: 500 });

  const res = NextResponse.json({
    reply: turn.reply,
    refusal: turn.refusal,
    routeToReview: turn.routeToReview,
    missingFields: turn.missingFields,
  });
  if (setCookie) {
    res.cookies.set(COOKIE, rawToken, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
