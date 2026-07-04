// app/api/notice/packet/deliver/route.ts
// Lane P1 — packet-delivery trigger (ruling omnibus_broker_ruling_2026-07-04 Item 6). Emails a combined packet PDF
// (a COPY) to any recipient the authenticated user directs, subject to the three tightenings:
//   T1 — the ruled CCP §1162 non-service disclaimer is baked into sendPacketDeliveryEmail (locked-prose).
//   T2 — SENDER AUTH: the session must be claimed (user_id present). Anonymous /chat sessions cannot deliver to
//        arbitrary third parties (spam/phishing + SMTP/10DLC reputation control).
//   T3 — RECIPIENT LOGGING: log sender id + recipient hash (sha256 + 4-char prefix, no plaintext PII) +
//        manifest hash + status to the audit sink.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { readRequestBody } from '@/lib/http/requestBody';
import { sendPacketDeliveryEmail } from '@/lib/email/resend';
import { recipientLogId, logPacketDelivery } from '@/lib/email/deliveryLog';

const COOKIE = 'op_chat_token';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // T2 — sender authentication
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in to send a packet' }, { status: 401 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });
  if (!session.user_id) {
    return NextResponse.json({ error: 'claim your session before sending a packet' }, { status: 401 });
  }

  const body = (await readRequestBody(req)) as {
    to?: string; manifestHash?: string; packet?: { filename?: string; content?: string };
  };
  const to = (body.to ?? '').trim();
  const manifestHash = (body.manifestHash ?? '').trim();
  const packet = body.packet;

  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'valid recipient email required' }, { status: 400 });
  if (!packet?.content || !packet.filename) return NextResponse.json({ error: 'packet attachment required' }, { status: 400 });
  if (!manifestHash) return NextResponse.json({ error: 'manifestHash required' }, { status: 400 });

  const at = new Date().toISOString();
  try {
    await sendPacketDeliveryEmail(to, { filename: packet.filename, content: packet.content });
  } catch (e) {
    logPacketDelivery({ sender_user_id: session.user_id, recipient_log_id: recipientLogId(to), manifest_hash: manifestHash, status: 'error', at });
    return NextResponse.json({ error: 'delivery failed', detail: (e as Error).message }, { status: 502 });
  }

  // T3 — recipient logging (hash + prefix only; never the plaintext address)
  logPacketDelivery({ sender_user_id: session.user_id, recipient_log_id: recipientLogId(to), manifest_hash: manifestHash, status: 'sent', at });
  return NextResponse.json({ ok: true });
}
