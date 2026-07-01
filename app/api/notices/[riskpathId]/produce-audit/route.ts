// app/api/notices/[riskpathId]/produce-audit/route.ts
// PR-A3 §5.2 produce-audit fast-follow. Persists the LA produce-audit blob (RTC form hashes + LAHD acknowledgment
// + produce-time gate/verdict provenance) onto the owner's riskpath record, so the CHAT produce path is
// compliance-equivalent to the WIZARD path (which persists the same laProduceAudit into flow state).
// Auth mirrors the §5.1 from-chat insert: service-role client + claimed session; ownership is enforced by the
// user_id filter (service role bypasses RLS). Idempotent overwrite on riskpath_id.
// Ruling: pr_a3_5_2_core_countersign_and_open_items_broker_ruling_2026-07-01.md §2.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { produceAuditBodySchema } from '@/lib/riskpath/produceAudit';

const COOKIE = 'op_chat_token';

export async function POST(req: NextRequest, { params }: { params: Promise<{ riskpathId: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { riskpathId } = await params;

  const parsed = produceAuditBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_audit', detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  // Owner-scoped, idempotent overwrite. Service role bypasses RLS, so the user_id filter IS the ownership gate.
  const { data, error } = await sb
    .from('riskpath_records')
    .update({ produce_audit: parsed.data.laProduceAudit, updated_at: new Date().toISOString() })
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'audit_write_failed', detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, riskpathId: data.id });
}
