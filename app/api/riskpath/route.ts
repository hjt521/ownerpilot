// app/api/riskpath/route.ts — GET the claimed owner's RiskPath records. Claimed-only: the cookie session must be
// migrated (user_id set); anonymous sessions get 401. Returns records ordered newest-first.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';

const COOKIE = 'op_chat_token';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in to view your RiskPath' }, { status: 401 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) {
    return NextResponse.json({ error: 'sign in to view your RiskPath' }, { status: 401 });
  }
  const { data, error } = await sb
    .from('riskpath_records')
    .select('id, current_state, notice_document_id, counsel_route_trigger, created_at, updated_at')
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'could not load records' }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}
