// app/api/magic-link/redeem/route.ts — GET ?token=. Validates (single-use + 30-min TTL), consumes, then migrates
// the anonymous chat session to a claimed user (ensure users row by email → set user_id + claimed_at + status).
// Lands the owner back on /chat/review (now claimed). RiskPath records are written at notice generation (Group 4),
// not here — claim just establishes the claimed user (avoids empty records).

import { NextRequest, NextResponse } from 'next/server';
import { serviceClient } from '@/lib/chat/session';
import { hashMagicToken, evaluateMagicToken, type MagicTokenRow } from '@/lib/chat/magicLink';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!raw) return NextResponse.redirect(`${base}/chat/review?claim=invalid`);

  const sb = serviceClient();
  const { data: row } = await sb
    .from('magic_link_tokens')
    .select('expires_at, consumed_at, chat_session_id, email, purpose')
    .eq('token_hash', hashMagicToken(raw))
    .maybeSingle();

  const verdict = evaluateMagicToken((row as MagicTokenRow) ?? null);
  if (!verdict.valid) return NextResponse.redirect(`${base}/chat/review?claim=${verdict.reason}`);
  const tok = row as MagicTokenRow;

  // single-use: consume first (idempotent guard against double-redeem)
  await sb.from('magic_link_tokens').update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', hashMagicToken(raw)).is('consumed_at', null);

  // ensure a users row for this email
  const { data: existing } = await sb.from('users').select('id').eq('email', tok.email).maybeSingle();
  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data: created } = await sb.from('users').insert({ email: tok.email }).select('id').single();
    userId = created?.id;
  }

  // migrate the anonymous session → claimed
  if (tok.chat_session_id && userId) {
    await sb.from('chat_sessions').update({
      user_id: userId, status: 'claimed', claimed_at: new Date().toISOString(),
    }).eq('id', tok.chat_session_id);
  }

  return NextResponse.redirect(`${base}/chat/review?claim=ok`);
}
