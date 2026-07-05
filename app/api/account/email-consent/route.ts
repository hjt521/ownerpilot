// app/api/account/email-consent/route.ts
// Part B-2 (p1_email_trigger_dependencies_broker_ruling_2026-07-05 B2 safeguard 1). Records the owner's one-time
// consent to receive owner-facing filing-record acknowledgment emails at their account address. Owner-scoped
// (claimed session + user_id, same posture as the LAHD filing-record endpoint). Idempotent: sets
// email_notifications_ack_at once; a repeat call does not move the timestamp.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';

const COOKIE = 'op_chat_token';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const { data: existing } = await sb
    .from('users')
    .select('email_notifications_ack_at')
    .eq('id', session.user_id)
    .maybeSingle();

  const already = existing?.email_notifications_ack_at ?? null;
  if (already) return NextResponse.json({ ok: true, ackAt: already });

  const ackAt = new Date().toISOString();
  const { error } = await sb.from('users').update({ email_notifications_ack_at: ackAt }).eq('id', session.user_id);
  if (error) return NextResponse.json({ error: 'consent_write_failed' }, { status: 500 });

  console.info(JSON.stringify({ evt: 'email_consent.recorded', user_id: session.user_id, at: ackAt }));
  return NextResponse.json({ ok: true, ackAt });
}
