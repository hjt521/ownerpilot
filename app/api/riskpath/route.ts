// app/api/riskpath/route.ts — GET the claimed owner's RiskPath records. Claimed-only: the cookie session must be
// migrated (user_id set); anonymous sessions get 401. Returns records ordered newest-first.
//
// PR-B Surface 2 (§4.2): each record carries a per-row `staleness` verdict — the current session intake compared
// against that row's frozen `produce_snapshot` via the shared evaluateStaleness engine — so the dashboard can
// render the ratified warning banner when the notice's face has drifted since it was produced.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { checkStaleness } from '@/lib/chat/stalenessCheck';
import type { ProductionSnapshot } from '@/lib/flow/noticeFlowState';
import type { IntakeState } from '@/lib/chat/intakeSchema';

const COOKIE = 'op_chat_token';
// serviceDate/serviceMethod are excluded from the staleness comparison (lib/flow/escalation.ts evaluateStaleness
// omits them), so this placeholder ONLY assembles a valid NoticeFlowData and DOES NOT AFFECT THE VERDICT.
// Do not propagate this value into any comparison path (§5.3 countersign note).
const PLACEHOLDER_SERVICE_DATE = '2026-01-01';

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
    .select('id, current_state, notice_document_id, counsel_route_trigger, created_at, updated_at, chat_session_id, produce_snapshot')
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'could not load records' }, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  // Load each row's session intake_state once (staleness compares current intake vs the row's produce_snapshot).
  const sessionIds = [...new Set(rows.map((r) => r.chat_session_id).filter(Boolean))] as string[];
  const intakeById = new Map<string, IntakeState>();
  if (sessionIds.length) {
    const { data: sess } = await sb.from('chat_sessions').select('id, intake_state').in('id', sessionIds);
    for (const s of (sess ?? []) as Array<{ id: string; intake_state: IntakeState }>) intakeById.set(s.id, s.intake_state);
  }

  const records = rows.map((r) => {
    const snap = (r.produce_snapshot ?? null) as ProductionSnapshot | null;
    let staleness: {
      hasSnapshot: boolean; stale: boolean;
      reason?: string | null; changedFields?: string[]; warning?: string | null;
    };
    if (!snap) {
      staleness = { hasSnapshot: false, stale: false };
    } else {
      const intake = intakeById.get(r.chat_session_id as string);
      let stale = false, reason: string | null = null, changedFields: string[] = [], warning: string | null = null;
      if (intake) {
        try {
          const o = checkStaleness(toNoticeFlowData(intake, PLACEHOLDER_SERVICE_DATE), snap);
          stale = o.stale; reason = o.reason; changedFields = o.changedFields; warning = o.warning;
        } catch { /* intake no longer assembles → treat as not stale (no banner) */ }
      }
      staleness = { hasSnapshot: true, stale, reason, changedFields, warning };
    }
    // Do not leak the snapshot or session id to the client — only the verdict.
    const { chat_session_id: _c, produce_snapshot: _p, ...pub } = r;
    void _c; void _p;
    return { ...pub, staleness };
  });

  return NextResponse.json({ records });
}
