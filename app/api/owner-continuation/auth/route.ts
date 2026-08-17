// app/api/owner-continuation/auth/route.ts
// Purpose-bound Owner Continuation admission/authentication. POST only: scanning the public
// page never mutates a matter. Pre-auth responses contain no private matter fields.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, loadSession, serviceClient } from '@/lib/chat/session';
import { generateMagicToken, hashMagicToken, magicExpiry } from '@/lib/chat/magicLink';
import { sendClaimEmail } from '@/lib/email/resend';
import { isBetaAllowlisted } from '@/lib/beta/allowlist';
import {
  OWNER_CONTINUATION_PURPOSE,
  OWNER_CONTINUATION_VERSION,
  canonicalOwnerPilotOrigin,
  evaluateOwnerContinuationAssociation,
  exactRiskPathDestination,
  hashOwnerContinuationLocator,
  isOwnerContinuationLocator,
} from '@/lib/riskpath/ownerContinuation';

const COOKIE = 'op_chat_token';
const schema = z.object({
  locator: z.string().max(128),
  email: z.string().email().optional(),
});

function genericUnavailable() {
  return NextResponse.json({ error: 'This continuation link is unavailable.' }, {
    status: 404,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function setSessionCookie(res: NextResponse, rawToken: string) {
  res.cookies.set(COOKIE, rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !isOwnerContinuationLocator(parsed.data.locator)) return genericUnavailable();

  const sb = serviceClient();
  const digest = hashOwnerContinuationLocator(parsed.data.locator);
  const { data: continuation } = await sb
    .from('owner_continuations')
    .select('id, locator_digest, riskpath_record_id, purpose, version, revoked_at')
    .eq('locator_digest', digest)
    .maybeSingle();
  const admission = evaluateOwnerContinuationAssociation(parsed.data.locator, continuation ?? null);
  if (!admission.ok) return genericUnavailable();

  // Load only authorization fields. No matter facts are returned from this public route.
  const { data: record } = await sb
    .from('riskpath_records')
    .select('id, user_id, soft_deleted_at')
    .eq('id', admission.association.riskpath_record_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!record) return genericUnavailable();

  let rawSessionToken = req.cookies.get(COOKIE)?.value ?? '';
  let session = rawSessionToken ? await loadSession(rawSessionToken, sb) : null;
  let createdSession = false;
  if (!session) {
    const created = await createSession(sb);
    rawSessionToken = created.rawToken;
    session = await loadSession(rawSessionToken, sb);
    createdSession = true;
  }
  if (!session) return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 });

  // Already-authenticated scan: independently authorize the exact record, then return only
  // the fixed private destination. Wrong accounts receive a generic denial.
  if (session.user_id) {
    if (session.user_id !== record.user_id) {
      const denied = NextResponse.json({ error: 'This record is not available for this account.' }, {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      });
      if (createdSession) setSessionCookie(denied, rawSessionToken);
      return denied;
    }
    const ok = NextResponse.json({ ok: true, destination: exactRiskPathDestination(record.id) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (createdSession) setSessionCookie(ok, rawSessionToken);
    return ok;
  }

  // First admission without an email creates/retains only the anonymous same-browser session.
  if (!parsed.data.email) {
    const needsAuth = NextResponse.json({ ok: true, authenticationRequired: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (createdSession) setSessionCookie(needsAuth, rawSessionToken);
    return needsAuth;
  }

  // Do not disclose whether the submitted email is the owner. Only the exact owner email may
  // receive the purpose-bound link; every other submission receives the same generic response.
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const { data: owner } = await sb.from('users').select('id, email').eq('id', record.user_id).maybeSingle();
  const ownerMatches =
    !!owner?.email &&
    owner.email.trim().toLowerCase() === normalizedEmail &&
    isBetaAllowlisted(normalizedEmail);

  if (ownerMatches) {
    const rawMagic = generateMagicToken();
    const { error } = await sb.from('magic_link_tokens').insert({
      token_hash: hashMagicToken(rawMagic),
      email: normalizedEmail,
      chat_session_id: session.id,
      purpose: OWNER_CONTINUATION_PURPOSE,
      owner_continuation_id: admission.association.id,
      expires_at: magicExpiry(),
    });
    if (error) return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 });

    try {
      const origin = canonicalOwnerPilotOrigin();
      await sendClaimEmail(normalizedEmail, `${origin}/api/magic-link/redeem?token=${rawMagic}`);
    } catch {
      return NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 });
    }
  }

  const sent = NextResponse.json({ ok: true, checkEmail: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
  if (createdSession) setSessionCookie(sent, rawSessionToken);
  return sent;
}
