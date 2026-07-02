// app/api/magic-link/request/route.ts — POST {email}. Issues a single-use 30-min claim token tied to the current
// chat session (cookie), stores only its hash, and emails the raw token as a claim URL via Resend (G6).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { generateMagicToken, hashMagicToken, magicExpiry } from '@/lib/chat/magicLink';
import { sendClaimEmail } from '@/lib/email/resend';
import { isBetaAllowlisted } from '@/lib/beta/allowlist';

const COOKIE = 'op_chat_token';
const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'valid email required' }, { status: 400 });

  // Closed beta (B2): only allowlisted emails receive a claim link. Non-listed → surface the waitlist (no token,
  // no email sent). Same 200 shape so allowlist membership is not revealed by the response status.
  if (!isBetaAllowlisted(parsed.data.email)) {
    return NextResponse.json({ ok: true, waitlisted: true });
  }

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });

  const rawMagic = generateMagicToken();
  const { error } = await sb.from('magic_link_tokens').insert({
    token_hash: hashMagicToken(rawMagic),
    email: parsed.data.email,
    chat_session_id: session.id,
    purpose: 'save_to_riskpath',
    expires_at: magicExpiry(),
  });
  if (error) return NextResponse.json({ error: 'could not create link' }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const claimUrl = `${base}/api/magic-link/redeem?token=${rawMagic}`;
  try { await sendClaimEmail(parsed.data.email, claimUrl); }
  catch { return NextResponse.json({ error: 'could not send email' }, { status: 502 }); }

  // NEVER return the raw token in the response body — it goes only to the emailed address.
  return NextResponse.json({ ok: true });
}
