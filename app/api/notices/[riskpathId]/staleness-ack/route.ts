// app/api/notices/[riskpathId]/staleness-ack/route.ts
// PR-B staleness acknowledgment endpoint (§5.4). Records the owner's acknowledgment of a staleness warning as an
// insert-only compliance artifact — called by Surface 1 (before re-producing) and Surface 2 (banner dismiss /
// navigate-to-Review). Owner-scoped: the riskpath row must belong to the current claimed session (service-role
// client + user_id gate; same posture as produce-audit). Insert-only — no updates.
// Source: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §5.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { stalenessAckBodySchema } from '@/lib/riskpath/stalenessAck';

const COOKIE = 'op_chat_token';

export async function POST(req: NextRequest, { params }: { params: Promise<{ riskpathId: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { riskpathId } = await params;

  const parsed = stalenessAckBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_ack', detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  // Ownership gate: the riskpath row must belong to this claimed owner.
  const { data: row } = await sb
    .from('riskpath_records')
    .select('id')
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await sb
    .from('staleness_acknowledgments')
    .insert({
      riskpath_id: riskpathId,
      chat_session_id: session.id,
      staleness_reason: parsed.data.staleness_reason,
      changed_fields: parsed.data.changed_fields,
      action_taken: parsed.data.action_taken,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'ack_write_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
