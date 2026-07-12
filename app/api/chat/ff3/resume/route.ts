// app/api/chat/ff3/resume/route.ts
// FF-3 Block C server-resume — owner "Continue" after a broker resolves an awaiting_broker_review hold.
// Authority: ff3_gate4_omnibus_authorization_broker_signature_2026-07-12 §2.
//
// Validates the scoped broker authorization against LIVE session state and, on match, mints a short-TTL one-shot
// continuation token the client immediately hands to the produce gate. It does NOT consume the authorization — the
// produce gate stamps broker_resume_consumed_at at consume time (§2(a) produce-consume). Fail-closed on any drift.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { ff3RentPeriodsFromSession } from '@/lib/intake/ff3ProduceGate';
import { sumLedger } from '@/lib/intake/ff3AmountReconcile';
import {
  checkResumeScope,
  resolutionNoteHash,
  ledgerPeriodKey,
  FF3_RESUME_ALREADY_CONSUMED,
  type ResumeAuthorization,
  type DatedPeriod,
} from '@/lib/intake/ff3ResumeAuthorization';
import { mintResumeToken } from '@/lib/intake/ff3ResumeToken';

const COOKIE = 'op_chat_token';

interface ResumeSessionCols {
  id: string;
  amount_of_rent_owed: number | null;
  broker_resolution_note: string | null;
  broker_resume_authorization: ResumeAuthorization | null;
  broker_resume_consumed_at: string | null;
  intake_state?: Record<string, { value?: unknown } | undefined> | null;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });

  const s = session as unknown as ResumeSessionCols;
  const auth = s.broker_resume_authorization;
  // No authorization on this session → nothing to resume (not an awaiting/resolved reconciliation case).
  if (!auth) return NextResponse.json({ error: 'ff3_resume_not_authorized' }, { status: 409 });
  // One-shot: already consumed → soft error, no owner-facing screen (omnibus §8).
  if (s.broker_resume_consumed_at) return NextResponse.json({ error: FF3_RESUME_ALREADY_CONSUMED }, { status: 409 });

  const secret = process.env.FF3_RESUME_SECRET;
  if (!secret) return NextResponse.json({ error: 'resume_unconfigured' }, { status: 500 });

  const periods = ff3RentPeriodsFromSession(s);
  const scope = checkResumeScope(auth, {
    session_id: s.id,
    notice_amount: s.amount_of_rent_owed,
    ledger_total: sumLedger(periods),
    ledger_period: ledgerPeriodKey(periods as DatedPeriod[] | null),
    resolution_note_hash: resolutionNoteHash(s.broker_resolution_note ?? ''),
  });
  if (!scope.ok) {
    return NextResponse.json({ error: scope.reason, field: scope.divergedField }, { status: 409 });
  }

  const resumeToken = mintResumeToken(secret, {
    sessionId: s.id,
    authorizedAt: auth.authorized_at,
    noteHash: auth.resolution_note_hash,
  });
  return NextResponse.json({ ok: true, resumeToken });
}
