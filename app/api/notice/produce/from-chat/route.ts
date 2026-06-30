// app/api/notice/produce/from-chat/route.ts — Group 4 notice-rail integration.
// Orchestrates produce from a completed chat session:
//   1. G4 server-side hard-stop: read chat_sessions.counsel_route_trigger + completion → evaluateProduceEligibility.
//   2. G3: invoke the EXISTING Phase 2D LA produce rail server-to-server (env-flag + Decision 2 freshness passthrough,
//      unmodified). No second gate, no new flag. Frozen rail files are NOT edited — called as a service.
//   3. On success: write riskpath_records via the lane-4 Option-B snapshot (captured_payload + transcript_snapshot).

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { missingRequiredFields } from '@/lib/chat/intakeMerge';
import { evaluateProduceEligibility } from '@/lib/riskpath/produceGate';
import { buildRiskPathInsert } from '@/lib/riskpath/noticeGenerationEvent';
import type { IntakeState } from '@/lib/chat/intakeSchema';

const COOKIE = 'op_chat_token';

/** Flatten intake_state {field:{value}} → {field:value} for the produce rail payload. */
function flattenIntake(state: IntakeState): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v?.value]));
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });
  if (!session.user_id) return NextResponse.json({ error: 'claim your session before producing' }, { status: 401 });

  const intakeComplete = missingRequiredFields(session.intake_state ?? {}).length === 0;

  // (1) G4 hard-stop. Counsel-route precedence; freshness re-checked by the rail in (2), pre-passed true here so
  // the rail is the authoritative freshness gate (G3) — we only block early on counsel + completeness.
  const gate = evaluateProduceEligibility({
    intakeComplete,
    counselTrigger: (session as { counsel_route_trigger?: string | null }).counsel_route_trigger ?? null,
    freshnessOk: true,
  });
  if (!gate.allowed) {
    if (gate.reason === 'counsel_route') {
      return NextResponse.json({ error: 'routed_to_counsel', refusal: gate.refusal, href: '/route-to-counsel' }, { status: 409 });
    }
    return NextResponse.json({ error: gate.reason }, { status: 409 });
  }

  // (2) G3 — call the existing Phase 2D LA produce rail (env-flagged + Decision 2 freshness inside the rail).
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const railRes = await fetch(`${base}/api/notice/produce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-invoke': process.env.INTERNAL_INVOKE_SECRET ?? '' },
    body: JSON.stringify({ source: 'chat', payload: flattenIntake(session.intake_state ?? {}) }),
  });
  if (!railRes.ok) {
    // The rail surfaces NOT_YET_AVAILABLE / stale / ATTACHMENT_FAILED with its existing copy — pass it through.
    const detail = await railRes.json().catch(() => ({}));
    return NextResponse.json({ error: 'produce_unavailable', detail }, { status: railRes.status });
  }
  const rail = (await railRes.json()) as { pdfUrl?: string; documentId?: string };

  // (3) Option B — durable evidence record at notice generation.
  const insert = buildRiskPathInsert({
    session: {
      id: session.id, user_id: session.user_id, property_id: session.property_id,
      intake_state: session.intake_state ?? {}, transcript: session.transcript ?? [],
    },
    noticeDocumentId: rail.documentId ?? null,
    initialState: 'notice_created',
  });
  const { data: rec, error } = await sb.from('riskpath_records').insert(insert).select('id').single();
  if (error) return NextResponse.json({ error: 'record_write_failed', detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, pdfUrl: rail.pdfUrl ?? null, riskpathId: rec.id });
}
