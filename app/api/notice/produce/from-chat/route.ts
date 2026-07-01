// app/api/notice/produce/from-chat/route.ts — Group 4 notice-rail integration (PR-A3 scope-down).
// Per pr_a3_produce_handoff_fork_ruling_2026-07-01.md §2.1/§5.1, from-chat's server-side scope is exactly three
// things — it does NOT call the produce rail:
//   1. G4 server-side counsel hard-stop (unchanged).
//   2. intendedServiceDate validation (delegates to the PR-A2 validator).
//   3. Riskpath insert (unchanged shape; noticeDocumentId null under client-render — no server document row).
// It returns a produce-ready envelope; the Review step resolves the verdict (Fork A) and calls
// runLaProduceSequence (Fork B/B(ii)) client-side, then renders the notice body client-side.

import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { missingRequiredFields } from '@/lib/chat/intakeMerge';
import { evaluateProduceEligibility } from '@/lib/riskpath/produceGate';
import { buildRiskPathInsert } from '@/lib/riskpath/noticeGenerationEvent';
import { e2eTagFromHeaders } from '@/lib/testing/e2eRunTag';
import { validateIntendedServiceDate } from '@/lib/dates/intendedServiceDate';
import { lahdFilingPromptCopyVersion } from '@/lib/copy/lahd/lahdFilingPromptCopy';
import type { IntakeState } from '@/lib/chat/intakeSchema';

const COOKIE = 'op_chat_token';

/** Flatten intake_state {field:{value}} → {field:value} for the client to build the notice model. */
function flattenIntake(state: IntakeState): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v?.value]));
}

function slugBaseName(payload: Record<string, unknown>): string {
  const addr = typeof payload.property_address === 'string' ? payload.property_address : '';
  const slug = addr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug || 'notice';
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'no session' }, { status: 404 });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 404 });
  if (!session.user_id) return NextResponse.json({ error: 'claim your session before producing' }, { status: 401 });

  const intakeComplete = missingRequiredFields(session.intake_state ?? {}).length === 0;

  // (1) G4 hard-stop (unchanged). Counsel-route precedence + completeness.
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

  // (2) intendedServiceDate validated per broker ruling 2026-07-01 §1.2(2); delegates to PR-A2 validator
  // (lib/dates/intendedServiceDate.ts). Do not duplicate range/back-date logic here.
  const body = (await req.json().catch(() => ({}))) as { intendedServiceDate?: string };
  const sdCheck = validateIntendedServiceDate(body.intendedServiceDate);
  if (!sdCheck.ok) {
    return NextResponse.json({ error: 'invalid_service_date', detail: sdCheck.message }, { status: 400 });
  }
  const intendedServiceDate = body.intendedServiceDate as string;

  // Dangling POST to /api/notice/produce (no route) removed per broker ruling 2026-07-01 §1.2(3)
  // as corrected by pr_a3_produce_handoff_fork_ruling_2026-07-01.md §4.
  // Ratified rail is verify-la (POST) + la-packet (GET), called client-side by
  // runLaProduceSequence from the Review step. No server rail-caller exists or will be created.

  // (3) Riskpath insert (unchanged shape). noticeDocumentId is null: the notice body is client-rendered,
  // so there is no server-side document row at this boundary.
  const insert = buildRiskPathInsert({
    session: {
      id: session.id, user_id: session.user_id, property_id: session.property_id,
      intake_state: session.intake_state ?? {}, transcript: session.transcript ?? [],
    },
    noticeDocumentId: null,
    initialState: 'notice_created',
  });
  const tagged = { ...insert, ...e2eTagFromHeaders(req.headers) };
  const { data: rec, error } = await sb.from('riskpath_records').insert(tagged).select('id').single();
  if (error) return NextResponse.json({ error: 'record_write_failed', detail: error.message }, { status: 500 });

  // Produce-ready envelope (broker ruling 2026-07-01 §5.1(4)). Everything runLaProduceSequence needs EXCEPT
  // verdict/verdictSource (Review resolves, Fork A) and intendedServiceDate (PR-A2 Review state), plus the flat
  // payload (with serviceDate = intendedServiceDate) the Review step builds the notice model from.
  const payload = { ...flattenIntake(session.intake_state ?? {}), serviceDate: intendedServiceDate };
  return NextResponse.json({
    ok: true,
    riskpathId: rec.id,
    lahdCopyVersion: lahdFilingPromptCopyVersion,
    baseName: slugBaseName(payload),
    payload,
  });
}
