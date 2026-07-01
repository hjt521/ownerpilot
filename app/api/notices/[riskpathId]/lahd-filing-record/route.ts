// app/api/notices/[riskpathId]/lahd-filing-record/route.ts
// PR-C LAHD filing-completion endpoint (§6.3). Records the owner's attestation that they filed the served notice
// with LAHD, as an insert-only compliance artifact. Owner-scoped (service-role client + claimed session, user_id
// gate — same posture as produce-audit / staleness-ack). Insert-only; a correction inserts a new row.
// Source: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §6.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { lahdFilingRecordBodySchema, COVER_SHEET_REVISION } from '@/lib/riskpath/lahdFilingRecord';

const COOKIE = 'op_chat_token';

export async function POST(req: NextRequest, { params }: { params: Promise<{ riskpathId: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { riskpathId } = await params;

  const parsed = lahdFilingRecordBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_filing_record', detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const { data: row } = await sb
    .from('riskpath_records')
    .select('id')
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data, error } = await sb
    .from('lahd_filing_records')
    .insert({
      riskpath_id: riskpathId,
      chat_session_id: session.id,
      filing_date: parsed.data.filing_date,
      filing_channel: parsed.data.filing_channel,
      cover_sheet_revision: COVER_SHEET_REVISION,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'filing_record_write_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
