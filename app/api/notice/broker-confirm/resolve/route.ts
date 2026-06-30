// app/api/notice/broker-confirm/resolve/route.ts — POST broker-only (master prompt §4.4)
// Service-role/broker-authenticated only. Sets outcome, purges contact, writes inline_terminal audit row.

import { NextRequest, NextResponse } from 'next/server';
import { resolveSchema } from '@/lib/decision2/schemas';
import { serviceRoleClient } from '@/lib/decision2/db';

export async function POST(req: NextRequest) {
  // Auth: broker actor only. The shared secret gates the route; anon/owner cannot call.
  // (Wire to the repo's broker-auth check if one exists; secret-header fallback shown here.)
  const auth = req.headers.get('x-broker-secret');
  if (!auth || auth !== process.env.BROKER_RESOLVE_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = resolveSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  const { requestId, outcome, brokerActorId } = parsed.data;

  const sb = serviceRoleClient();
  const { error } = await sb.from('broker_confirm_requests').update({
    status: outcome,
    resolved_at: new Date().toISOString(),
    resolved_outcome: outcome,
    resolved_by_broker_id: brokerActorId,
    requester_contact: null,
  }).eq('id', requestId);

  if (error) return NextResponse.json({ error: 'could not resolve' }, { status: 500 });

  await sb.from('broker_confirm_purge_audit').insert({ request_id: requestId, purge_reason: 'inline_terminal' });

  return NextResponse.json({ ok: true });
}
