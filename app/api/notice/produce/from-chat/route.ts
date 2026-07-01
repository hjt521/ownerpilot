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
// PR-B staleness guard — Surface 1 (Fork 1 §3 write + Fork 2 §4.1 pre-produce gate).
// Source: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §§3-4.
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { captureProductionSnapshot } from '@/lib/flow/escalation';
import { checkStaleness } from '@/lib/chat/stalenessCheck';
import type { ProductionSnapshot } from '@/lib/flow/noticeFlowState';

const COOKIE = 'op_chat_token';

/** Best-effort capture of the produce-time face snapshot from the current intake (§3.1 write path). Returns null
 *  if the notice model can't be assembled (the row then lacks produce_snapshot → the §4.4 fallback covers it). */
function produceSnapshotFor(state: IntakeState, serviceDate: string): ProductionSnapshot | null {
  try {
    return captureProductionSnapshot(toNoticeFlowData(state, serviceDate));
  } catch {
    return null;
  }
}

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
  const body = (await req.json().catch(() => ({}))) as { intendedServiceDate?: string; acknowledgedStaleness?: boolean };
  const sdCheck = validateIntendedServiceDate(body.intendedServiceDate);
  if (!sdCheck.ok) {
    return NextResponse.json({ error: 'invalid_service_date', detail: sdCheck.message }, { status: 400 });
  }
  const intendedServiceDate = body.intendedServiceDate as string;

  // PR-B Surface 1 (§4.1): warn-then-require-new-row. Before producing a NEW row, compare the current face
  // against the most-recent prior produced row's snapshot for this session. If drifted and the owner has not yet
  // acknowledged, return 409 with the staleness details (no insert); the client shows the ratified warning +
  // records the acknowledgment (POST /staleness-ack), then re-POSTs with acknowledgedStaleness=true.
  const currentSnapshot = produceSnapshotFor(session.intake_state ?? {}, intendedServiceDate);
  if (currentSnapshot && !body.acknowledgedStaleness) {
    const { data: prior } = await sb
      .from('riskpath_records')
      .select('id, produce_snapshot')
      .eq('chat_session_id', session.id)
      .is('soft_deleted_at', null)
      .not('produce_snapshot', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prior?.produce_snapshot) {
      const staleness = checkStaleness(
        toNoticeFlowData(session.intake_state ?? {}, intendedServiceDate),
        prior.produce_snapshot as ProductionSnapshot,
      );
      if (staleness.stale) {
        return NextResponse.json(
          { error: 'stale_notice', priorRiskpathId: prior.id, staleness: { reason: staleness.reason, changedFields: staleness.changedFields, warning: staleness.warning } },
          { status: 409 },
        );
      }
    }
  }

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
  // PR-B §3.1 write path: persist the produce-time face snapshot durably on the row (Fork 1 → 1A).
  const tagged = { ...insert, produce_snapshot: currentSnapshot, ...e2eTagFromHeaders(req.headers) };
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
