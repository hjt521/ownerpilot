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
import { activeCursorOf, runScriptedActiveTurn, maybeBeginScripted } from '@/lib/chat/scriptedOrchestrate';
import { runtimeBannedTermGate } from '@/lib/chat/runtimeBannedTermGate';
import { decideFromCounts } from '@/lib/chat/rateLimit';
import { getRateLimitStore } from '@/lib/chat/rateLimitStore';
import { CLASSIFIER_LIVE } from '@/lib/chat/classifierConfig';
import { runClassifier } from '@/lib/chat/classifier';
import { makeGatewayComplete } from '@/lib/chat/classifierClient';
import { verifyCaptchaToken } from '@/lib/safety/captcha';
import { loadSession, createSession, hashAnonToken, serviceClient } from '@/lib/chat/session';
import { unsupportedLanguageNotice } from '@/lib/chat/refusalBank';
import { e2eTagFromHeaders } from '@/lib/testing/e2eRunTag';
import type { ChatMessage } from '@/lib/chat/responseFormat';
import type { TranscriptTurn } from '@/lib/chat/dbTypes';

const COOKIE = 'op_chat_token';
const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  language: z.enum(['en', 'es']).optional(),
  captchaToken: z.string().optional(), // P6: sent with the first message to gate new-session creation
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const { message, language, captchaToken } = parsed.data;

  const sb = serviceClient();
  let rawToken = req.cookies.get(COOKIE)?.value ?? '';
  let session = rawToken ? await loadSession(rawToken, sb) : null;
  let setCookie = false;
  if (!session) {
    // P6 owner-funnel hardening (ruling 2026-07-04 Item 1): gate NEW-session creation on CAPTCHA. Abuse/bot
    // control at the funnel entry. No-op until TURNSTILE_SECRET_KEY is set (verifyCaptchaToken → configured:false
    // ⇒ allow), so this is safe to ship dark. Existing sessions (cookie present) are never re-challenged.
    const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const cap = await verifyCaptchaToken(captchaToken, remoteIp);
    if (!cap.ok) {
      console.info(JSON.stringify({ evt: 'chat.captcha_blocked', reason: cap.reason, at: new Date().toISOString() }));
      return NextResponse.json({ error: 'Please complete the verification challenge and try again.' }, { status: 403 });
    }
    const created = await createSession(sb, e2eTagFromHeaders(req.headers));
    rawToken = created.rawToken; setCookie = true;
    session = await loadSession(rawToken, sb);
  }
  if (!session) return NextResponse.json({ error: 'session error' }, { status: 500 });

  const now = new Date().toISOString();
  const nowMs = Date.now();
  const priorState = session.intake_state ?? {};

  // P4 Q4 (ruling 2026-07-04): per-session rate-limit on the primary chat entrypoint (ratified RATE_LIMITS —
  // burst/daily/monthly-token). Store auto-selects Redis (Upstash/KV env) or a dev in-memory fallback, so this is
  // safe with no env. On exceed → HTTP 429 + audit log. (NOTE: Q4 recommended per-IP/per-user buckets with
  // different numbers; that differs from the ratified per-session config — reconciliation flagged, not adopted.)
  try {
    const counts = await getRateLimitStore().registerRequest(session.id, nowMs);
    const rl = decideFromCounts(counts, nowMs);
    if (!rl.allowed) {
      console.info(JSON.stringify({ evt: 'chat.rate_limited', reason: rl.reason, session_id: session.id, at: now }));
      return NextResponse.json(
        { error: "You're sending messages faster than we can respond — give it a minute." },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }
  } catch (e) {
    // Rate-limit store failure must not take down chat; log and continue (degrade open, same posture as classifier).
    console.warn('rate-limit store error — allowing request', (e as Error).message);
  }

  // Lane 2E (Fork A): if a deterministic scripted-capture cursor is active, the server parses the owner's
  // message directly — the LLM is NOT called for the four capture categories.
  const activeCursor = activeCursorOf(session.transcript);
  // Lane FF-3 (flag-gated): completeness for the FF-3 category lives in this typed column, not intake_state.
  const ff3Status = (session as { ff3_capture_status?: string | null }).ff3_capture_status ?? null;
  let turn;
  if (activeCursor) {
    turn = runScriptedActiveTurn(priorState, message, activeCursor, now, ff3Status);
  } else {
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

    // P4 Q4: H1 classifier as pre-model middleware — log + pass-through (do NOT block during rollout, per ruling).
    // Dark by default: only runs when CLASSIFIER_LIVE is set, so no extra model call / latency in prod until enabled.
    if (CLASSIFIER_LIVE) {
      try {
        const verdict = await runClassifier('input', message, '', makeGatewayComplete());
        console.info(JSON.stringify({
          evt: 'chat.classifier', ok: verdict.ok,
          flagged: verdict.ok ? verdict.flagged : null,
          categories: verdict.ok ? verdict.categories : null,
          session_id: session.id, at: now,
        }));
      } catch (e) {
        console.warn('classifier error — passing through', (e as Error).message);
      }
    }

    let model;
    try { model = await callPerplexity(messages); }
    catch (e) {
      return NextResponse.json({ error: 'assistant unavailable', detail: (e as Error).message }, { status: 502 });
    }

    // Transition check: if the LLM just captured the last non-scripted required field, override its reply with
    // the verbatim first scripted block (the LLM never authors a scripted prompt).
    turn = maybeBeginScripted(applyTurn(priorState, message, model), now, ff3Status);
  }

  // P4 Q3 (p4_persona_production_wiring_broker_ruling_2026-07-04): runtime banned-term output gate. ALL response
  // text passes through before it leaves the server — the technical wall against leaking CAR copyrighted
  // expression or legal-advice language from live model output. Fail-closed. Logs BLOCK/SCRUB to the audit sink.
  const gated = runtimeBannedTermGate(turn.reply);
  if (gated.action !== 'pass') {
    console.info(JSON.stringify({
      evt: 'chat.output_gate', action: gated.action,
      term_ids: gated.matches.map((m) => m.id), session_id: session.id, at: new Date().toISOString(),
    }));
    turn.reply = gated.output;
    // Reflect the gated text in the PERSISTED assistant transcript turn — never store unscrubbed output.
    for (let i = turn.transcriptAdditions.length - 1; i >= 0; i--) {
      if (turn.transcriptAdditions[i].role === 'assistant') {
        turn.transcriptAdditions[i] = { ...turn.transcriptAdditions[i], content: gated.output };
        break;
      }
    }
  }

  // §E.4: if the model claimed complete prematurely, re-prompt next turn with the missing fields (do not route).
  const updated = await sb.from('chat_sessions').update({
    intake_state: turn.intakeState,
    transcript: [...(session.transcript ?? []), ...turn.transcriptAdditions],
    intake_complete: turn.intakeComplete,
    status: turn.status,
    last_refusal: turn.refusal,
    message_count: (session.message_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
    // Lane FF-3 (flag-gated): typed columns for the FF-3 category (ff3_capture_status +, on completion, the five
    // intake columns). Empty for every non-FF-3 turn, so this spread is a no-op unless FF-3 capture is active.
    ...(turn.ff3Persist ?? {}),
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
