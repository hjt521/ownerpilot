// app/api/notice/broker-confirm/cancel/route.ts — POST cancel (master prompt §4.3)
// Only pending requests can cancel (409 otherwise). Purges contact + writes inline_terminal audit row.

import { NextRequest, NextResponse } from 'next/server';
import { cancelSchema } from '@/lib/decision2/schemas';
import { hashToken } from '@/lib/decision2/token';
import { serviceRoleClient } from '@/lib/decision2/db';

export async function POST(req: NextRequest) {
  const parsed = cancelSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const sb = serviceRoleClient();
  const { data: row, error } = await sb
    .from('broker_confirm_requests')
    .select('id, status')
    .eq('requester_token_hash', hashToken(parsed.data.token))
    .maybeSingle();

  if (error || !row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 409 });
  }

  await sb.from('broker_confirm_requests').update({
    status: 'cancelled', cancelled_at: new Date().toISOString(), requester_contact: null,
  }).eq('id', row.id);

  await sb.from('broker_confirm_purge_audit').insert({ request_id: row.id, purge_reason: 'inline_terminal' });

  return NextResponse.json({ ok: true });
}
