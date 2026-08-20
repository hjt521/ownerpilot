// app/api/owner-continuation/issue/route.ts
// Authenticated Owner Continuation locator issuance. Possession of the returned locator
// never grants matter access; every later private read independently authorizes the exact owner.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { hasFinalizedCreatedNoticeBinding } from '@/lib/riskpath/durableService';
import {
  OWNER_CONTINUATION_PURPOSE,
  OWNER_CONTINUATION_VERSION,
  buildOwnerContinuationPublicUrl,
  canonicalOwnerPilotOrigin,
  generateOwnerContinuationLocator,
  hashOwnerContinuationLocator,
} from '@/lib/riskpath/ownerContinuation';

const COOKIE = 'op_chat_token';
const schema = z.object({ riskpathId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid record' }, { status: 400 });

  const sessionToken = req.cookies.get(COOKIE)?.value;
  if (!sessionToken) return NextResponse.json({ error: 'authentication required' }, { status: 401 });

  const sb = serviceClient();
  const session = await loadSession(sessionToken, sb);
  if (!session?.user_id) return NextResponse.json({ error: 'authentication required' }, { status: 401 });

  const { data: record } = await sb
    .from('riskpath_records')
    .select('id, user_id, soft_deleted_at, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
    .eq('id', parsed.data.riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!record) return NextResponse.json({ error: 'record unavailable' }, { status: 404 });
  // New QR issuance is available only for a complete finalized exact Created Notice binding.
  // Existing already-issued locator associations are not touched by this route or migration.
  if (!hasFinalizedCreatedNoticeBinding(record)) {
    return NextResponse.json({ error: 'continuation unavailable' }, { status: 409 });
  }

  let origin: string;
  try {
    origin = canonicalOwnerPilotOrigin();
  } catch {
    return NextResponse.json({ error: 'continuation unavailable' }, { status: 503 });
  }

  const rawLocator = generateOwnerContinuationLocator();
  const { error } = await sb.from('owner_continuations').insert({
    locator_digest: hashOwnerContinuationLocator(rawLocator),
    riskpath_record_id: record.id,
    purpose: OWNER_CONTINUATION_PURPOSE,
    version: OWNER_CONTINUATION_VERSION,
  });
  if (error) return NextResponse.json({ error: 'continuation unavailable' }, { status: 503 });

  return NextResponse.json(
    { ok: true, scanUrl: buildOwnerContinuationPublicUrl(rawLocator, origin) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
