// app/api/riskpath/courtesy-reminder/route.ts — POST save a courtesy reminder to a claimed owner's RiskPath record.
// Owner-copy-only (§B.7): no server SMS is sent. notes/message free-text scrubbed for PII before persist.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { REMINDER_TONES } from '@/lib/riskpath/courtesyReminder';
import { scanFreeText } from '@/lib/safety/denylist';

const COOKIE = 'op_chat_token';
const schema = z.object({
  riskpath_record_id: z.string().uuid(),
  tone: z.enum(REMINDER_TONES as [string, ...string[]]),
  message_text: z.string().min(1).max(2000),
  channel: z.enum(['owner_copy', 'sms_app_handoff']),
});

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid reminder' }, { status: 400 });

  // PII guard on the free-text message (defense in depth; the owner controls this text).
  if (scanFreeText(parsed.data.message_text).length) {
    return NextResponse.json({ error: 'remove personal identifiers (emails/phones/account numbers) from the message' }, { status: 400 });
  }

  const { error } = await sb.from('courtesy_reminders').insert({
    riskpath_record_id: parsed.data.riskpath_record_id,
    user_id: session.user_id,
    tone: parsed.data.tone,
    message_text: parsed.data.message_text,
    channel: parsed.data.channel,
  });
  if (error) return NextResponse.json({ error: 'could not save reminder' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
