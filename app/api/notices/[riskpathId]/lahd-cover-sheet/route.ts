// app/api/notices/[riskpathId]/lahd-cover-sheet/route.ts
// PR-C — serve the pre-filled LAHD Eviction Notice Filing Cover Sheet for an owner's riskpath row (§2.2).
// Owner-scoped (service-role + claimed session, user_id gate). Pre-fills from the row's produce_snapshot; the
// owner prints, signs the Declaration, and mails it with a copy of the served notice. Separate artifact — this
// route never touches the notice PDF. Returns HTML the owner prints to PDF (same posture as the notice render).

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { buildLahdCoverSheetHtml, type CoverSheetInput } from '@/lib/produce/lahdCoverSheet';
import type { ProductionSnapshot } from '@/lib/flow/noticeFlowState';

const COOKIE = 'op_chat_token';

export async function GET(req: NextRequest, { params }: { params: Promise<{ riskpathId: string }> }) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { riskpathId } = await params;

  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session || !session.user_id) return NextResponse.json({ error: 'sign in' }, { status: 401 });

  const { data: row } = await sb
    .from('riskpath_records')
    .select('id, produce_snapshot')
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const snap = (row.produce_snapshot ?? null) as ProductionSnapshot | null;
  const input: CoverSheetInput = snap
    ? {
        ownerName: (snap.payeeName || snap.signerName || '').trim() || undefined,
        propertyAddress: (snap.propertyAddress || '').trim() || undefined,
        tenantName: (snap.tenantNames && snap.tenantNames[0]) || undefined,
        totalAmountOwed: typeof snap.totalAmount === 'number' ? snap.totalAmount : undefined,
      }
    : {};

  return new NextResponse(buildLahdCoverSheetHtml(input), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
