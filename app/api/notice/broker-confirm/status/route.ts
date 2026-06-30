// app/api/notice/broker-confirm/status/route.ts — GET by token (master prompt §4.2)
// 404 for both wrong + expired token (no distinction). Never returns requester_contact or address_raw.

import { NextRequest, NextResponse } from 'next/server';
import { hashToken } from '@/lib/decision2/token';
import { serviceRoleClient } from '@/lib/decision2/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const sb = serviceRoleClient();
  const { data, error } = await sb
    .from('broker_confirm_requests')
    .select('status, submitted_at, sla_due_at, resolved_at, resolved_outcome')
    .eq('requester_token_hash', hashToken(token))
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 }); // wrong OR expired — same 404
  }

  return NextResponse.json({
    status: data.status,
    submittedAt: data.submitted_at,
    slaDueAt: data.sla_due_at,
    resolvedAt: data.resolved_at,
    resolvedOutcome: data.resolved_outcome,
  });
}
