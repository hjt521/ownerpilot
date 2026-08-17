// app/api/magic-link/redeem/route.ts — existing claim redemption plus the purpose-bound Owner Continuation branch.
// Owner Continuation redemption requires the same browser session, re-checks revocation, claims the exact owner,
// then independently re-authorizes the exact RiskPath row before a fixed server redirect.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { hashMagicToken, evaluateMagicToken, type MagicTokenRow } from '@/lib/chat/magicLink';
import {
  OWNER_CONTINUATION_PURPOSE,
  canonicalOwnerPilotOrigin,
  exactRiskPathDestination,
  isOwnerContinuationMagicBinding,
} from '@/lib/riskpath/ownerContinuation';

const COOKIE = 'op_chat_token';

function ownerContinuationInvalid(origin: string) {
  return NextResponse.redirect(`${origin}/owner-continuation?auth=invalid`);
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('token');
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!raw) return NextResponse.redirect(`${base}/chat/review?claim=invalid`);

  const sb = serviceClient();
  const tokenHash = hashMagicToken(raw);
  const { data: row } = await sb
    .from('magic_link_tokens')
    .select('expires_at, consumed_at, chat_session_id, email, purpose, owner_continuation_id')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  const verdict = evaluateMagicToken((row as MagicTokenRow) ?? null);
  if (!verdict.valid) return NextResponse.redirect(`${base}/chat/review?claim=${verdict.reason}`);
  const tok = row as MagicTokenRow;

  if (tok.purpose === 'owner_record_continuation') {
    let origin: string;
    try { origin = canonicalOwnerPilotOrigin(); }
    catch { return NextResponse.json({ error: 'authentication unavailable' }, { status: 503 }); }

    if (!isOwnerContinuationMagicBinding(tok.purpose, tok.owner_continuation_id) || !tok.chat_session_id) {
      return ownerContinuationInvalid(origin);
    }

    // Purpose-bound return is same-browser: a copied magic link cannot claim a different browser session.
    const currentRaw = req.cookies.get(COOKIE)?.value;
    const currentSession = currentRaw ? await loadSession(currentRaw, sb) : null;
    if (!currentSession || currentSession.id !== tok.chat_session_id) return ownerContinuationInvalid(origin);

    // Re-read the association at redemption time. Revocation after email issuance denies redemption.
    const { data: continuation } = await sb
      .from('owner_continuations')
      .select('id, riskpath_record_id, purpose, version, revoked_at')
      .eq('id', tok.owner_continuation_id!)
      .eq('purpose', OWNER_CONTINUATION_PURPOSE)
      .is('revoked_at', null)
      .maybeSingle();
    if (!continuation) return ownerContinuationInvalid(origin);

    const { data: riskpath } = await sb
      .from('riskpath_records')
      .select('id, user_id, soft_deleted_at')
      .eq('id', continuation.riskpath_record_id)
      .is('soft_deleted_at', null)
      .maybeSingle();
    if (!riskpath) return ownerContinuationInvalid(origin);

    // The emailed identity must still be the exact current owner of this record.
    const { data: owner } = await sb.from('users').select('id, email').eq('id', riskpath.user_id).maybeSingle();
    if (!owner?.email || owner.email.trim().toLowerCase() !== tok.email.trim().toLowerCase()) {
      return ownerContinuationInvalid(origin);
    }
    if (currentSession.user_id && currentSession.user_id !== owner.id) return ownerContinuationInvalid(origin);

    // Consume atomically only after every purpose/session/association/owner check passes.
    const { data: consumed } = await sb.from('magic_link_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('consumed_at', null)
      .select('id');
    if ((consumed?.length ?? 0) !== 1) return ownerContinuationInvalid(origin);

    const { error: claimError } = await sb.from('chat_sessions').update({
      user_id: owner.id,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    }).eq('id', currentSession.id);
    if (claimError) return ownerContinuationInvalid(origin);

    // Magic-link success is not matter authorization. Re-execute exact user authorization after claim.
    const { data: authorized } = await sb
      .from('riskpath_records')
      .select('id')
      .eq('id', riskpath.id)
      .eq('user_id', owner.id)
      .is('soft_deleted_at', null)
      .maybeSingle();
    if (!authorized) return ownerContinuationInvalid(origin);

    return NextResponse.redirect(`${origin}${exactRiskPathDestination(authorized.id)}`);
  }

  // Existing claim_session/save_to_riskpath behavior remains unchanged.
  await sb.from('magic_link_tokens').update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', tokenHash).is('consumed_at', null);

  const { data: existing } = await sb.from('users').select('id').eq('email', tok.email).maybeSingle();
  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data: created } = await sb.from('users').insert({ email: tok.email }).select('id').single();
    userId = created?.id;
  }

  if (tok.chat_session_id && userId) {
    await sb.from('chat_sessions').update({
      user_id: userId, status: 'claimed', claimed_at: new Date().toISOString(),
    }).eq('id', tok.chat_session_id);
  }

  return NextResponse.redirect(`${base}/chat/review?claim=ok`);
}
