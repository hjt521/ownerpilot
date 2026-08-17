// app/api/notice/produce/from-chat/route.ts — Group 4 notice-rail integration (PR-A3 scope-down).
// Per pr_a3_produce_handoff_fork_ruling_2026-07-01.md §2.1/§5.1, from-chat's server-side scope is exactly three
// things — it does NOT call the produce rail:
//   1. G4 server-side counsel hard-stop (unchanged).
//   2. intendedServiceDate validation (delegates to the PR-A2 validator).
//   3. Riskpath insert (now with a pending exact Created Notice identity binding for Durable Service Evidence V1).
// It returns a produce-ready envelope; the Review step resolves the verdict (Fork A) and calls
// runLaProduceSequence (Fork B/B(ii)) client-side, then renders the notice body client-side.

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { fetchActiveHold, isHoldActive, activeHoldBannerMessage } from '@/lib/dns/holds';
import { missingRequiredFields } from '@/lib/chat/intakeMerge';
import { evaluateProduceEligibility } from '@/lib/riskpath/produceGate';
import { buildRiskPathInsert } from '@/lib/riskpath/noticeGenerationEvent';
import { buildPendingCreatedNoticeBinding } from '@/lib/riskpath/durableService';
import { e2eTagFromHeaders } from '@/lib/testing/e2eRunTag';
import { validateIntendedServiceDate } from '@/lib/dates/intendedServiceDate';
import { lahdFilingPromptCopyVersion } from '@/lib/copy/lahd/lahdFilingPromptCopy';
import type { IntakeState } from '@/lib/chat/intakeSchema';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { captureProductionSnapshot } from '@/lib/flow/escalation';
import { checkStaleness } from '@/lib/chat/stalenessCheck';
import type { ProductionSnapshot } from '@/lib/flow/noticeFlowState';
import { evaluateFf3Gate, ff3RentPeriodsFromSession, type Ff3SessionColumns } from '@/lib/intake/ff3ProduceGate';
import { toComplianceGateRows } from '@/lib/intake/reconciliationCallSite';
import { verifyResumeToken } from '@/lib/intake/ff3ResumeToken';
import { sumLedger } from '@/lib/intake/ff3AmountReconcile';
import {
  checkResumeScope, resolutionNoteHash, ledgerPeriodKey, FF3_RESUME_SCOPE_MISMATCH,
  type ResumeAuthorization, type DatedPeriod,
} from '@/lib/intake/ff3ResumeAuthorization';
import { emitFf3Event, ff3TelemetryConsentFromCookie } from '@/lib/analytics/ff3Telemetry';

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

  const hold = await fetchActiveHold(sb, session.id);
  if (isHoldActive(hold)) {
    return NextResponse.json(
      { error: 'do_not_serve_hold', message: activeHoldBannerMessage(hold!) },
      { status: 423 },
    );
  }

  const intakeComplete = missingRequiredFields(session.intake_state ?? {}).length === 0;
  const gate = evaluateProduceEligibility({
    intakeComplete,
    counselTrigger: (session as { counsel_route_trigger?: string | null }).counsel_route_trigger ?? null,
    freshnessOk: true,
  });
  if (!gate.allowed) {
    if (gate.reason === 'counsel_route') {
      return NextResponse.json({ error: 'routed_to_counsel', refusal: gate.refusal }, { status: 409 });
    }
    return NextResponse.json({ error: gate.reason }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    intendedServiceDate?: string;
    acknowledgedStaleness?: boolean;
    reconciliationSelection?: '1' | '2' | '3';
    resumeToken?: string;
  };
  const sdCheck = validateIntendedServiceDate(body.intendedServiceDate);
  if (!sdCheck.ok) {
    return NextResponse.json({ error: 'invalid_service_date', detail: sdCheck.message }, { status: 400 });
  }
  const intendedServiceDate = body.intendedServiceDate as string;

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

  const ff3Cols = session as unknown as Ff3SessionColumns;
  let brokerAuthorizedResume = false;
  if (typeof body.resumeToken === 'string' && body.resumeToken) {
    const rs = session as unknown as {
      id: string; amount_of_rent_owed: number | null; broker_resolution_note: string | null;
      broker_resume_authorization: ResumeAuthorization | null; broker_resume_consumed_at: string | null;
    };
    const secret = process.env.FF3_RESUME_SECRET;
    const auth = rs.broker_resume_authorization;
    if (secret && auth && !rs.broker_resume_consumed_at) {
      const v = verifyResumeToken(secret, body.resumeToken);
      const bound =
        v.ok &&
        v.payload.session_id === rs.id &&
        v.payload.authorized_at === auth.authorized_at &&
        v.payload.note_hash === auth.resolution_note_hash;
      if (bound) {
        const periods = ff3RentPeriodsFromSession(session);
        const scope = checkResumeScope(auth, {
          session_id: rs.id,
          notice_amount: rs.amount_of_rent_owed,
          ledger_total: sumLedger(periods),
          ledger_period: ledgerPeriodKey(periods as DatedPeriod[] | null),
          resolution_note_hash: resolutionNoteHash(rs.broker_resolution_note ?? ''),
        });
        if (!scope.ok) {
          return NextResponse.json({ error: FF3_RESUME_SCOPE_MISMATCH, field: scope.divergedField }, { status: 409 });
        }
        const { data: consumed } = await sb
          .from('chat_sessions')
          .update({ broker_resume_consumed_at: new Date().toISOString() })
          .eq('id', rs.id)
          .is('broker_resume_consumed_at', null)
          .select('id');
        if ((consumed?.length ?? 0) > 0) brokerAuthorizedResume = true;
      }
    }
  }

  const ff3Tel = { consentGranted: ff3TelemetryConsentFromCookie(req.cookies.get('CookieConsent')?.value) };
  if (brokerAuthorizedResume) {
    emitFf3Event({ event: 'resume-consumed', chatSessionId: session.id, actorType: 'owner', sourceRoute: 'POST /api/notice/produce/from-chat', dispositionRef: 'broker_resume_consumed' }, ff3Tel);
  }

  const ff3Gate = evaluateFf3Gate({
    ff3: {
      bedrooms: ff3Cols.bedrooms,
      amount_of_rent_owed: ff3Cols.amount_of_rent_owed,
      just_cause: ff3Cols.just_cause,
      notice_type: ff3Cols.notice_type,
      rent_periods: ff3RentPeriodsFromSession(session),
    },
    intendedServiceDate,
    today: new Date().toISOString().slice(0, 10),
    selection: body.reconciliationSelection ?? null,
    brokerAuthorizedResume,
  });
  if (ff3Gate.disposition.kind === 'skip') {
    emitFf3Event({ event: 'produce-gate-skipped', chatSessionId: session.id, actorType: 'system', sourceRoute: 'POST /api/notice/produce/from-chat', dispositionRef: 'skip' }, ff3Tel);
  }
  if (ff3Gate.disposition.kind !== 'skip') {
    if (ff3Gate.chain) {
      await sb.from('compliance_gates').insert(toComplianceGateRows(session.id, ff3Gate.chain));
    }
    const d = ff3Gate.disposition;
    if (d.reconciliation_resolution) {
      await sb
        .from('chat_sessions')
        .update({ reconciliation_resolution: d.reconciliation_resolution, reconciliation_resolved_at: new Date().toISOString() })
        .eq('id', session.id);
    }
    if (d.kind === 'reconciliation_flag')
      emitFf3Event({ event: 'reconciliation-fired', chatSessionId: session.id, actorType: 'system', sourceRoute: 'POST /api/notice/produce/from-chat', dispositionRef: 'reconciliation_flag' }, ff3Tel);
    if (d.kind === 'broker_review')
      emitFf3Event({ event: 'escalation-created', chatSessionId: session.id, actorType: 'owner', sourceRoute: 'POST /api/notice/produce/from-chat', dispositionRef: d.reconciliation_resolution ?? 'broker_review' }, ff3Tel);
    if (d.kind === 'proceed')
      emitFf3Event({ event: 'produce-gate-cleared', chatSessionId: session.id, actorType: 'system', sourceRoute: 'POST /api/notice/produce/from-chat', dispositionRef: d.reconciliation_resolution ?? 'proceed' }, ff3Tel);
    if (d.kind === 'reconciliation_flag')
      return NextResponse.json({ error: 'ff3_reconciliation_flag', card: d.card, selectionRequired: true }, { status: 409 });
    if (d.kind === 'fmr_block')
      return NextResponse.json({ error: 'ff4_fmr_block', card: d.card }, { status: 409 });
    if (d.kind === 'late_filing_block')
      return NextResponse.json({ error: 'w6_late_filing_block' }, { status: 409 });
    if (d.kind === 'pause')
      return NextResponse.json({ error: 'ff3_notice_wrong_pause' }, { status: 409 });
    if (d.kind === 'broker_review')
      return NextResponse.json({ error: 'ff3_awaiting_broker_review' }, { status: 409 });
  }

  // Allocate an opaque event identity for this exact prospective Notice generation. The deterministic material
  // generation/semantic identities are computed from the same captured intake + frozen service date that the
  // client will reconstruct through reviewProduce. finalized_at remains NULL until successful client production.
  const createdNoticeArtifactId = randomUUID();
  let createdNoticeBinding;
  try {
    createdNoticeBinding = buildPendingCreatedNoticeBinding({
      intakeState: session.intake_state ?? {},
      intendedServiceDate,
      artifactId: createdNoticeArtifactId,
    });
  } catch {
    return NextResponse.json({ error: 'created_notice_identity_failed' }, { status: 409 });
  }

  const insert = buildRiskPathInsert({
    session: {
      id: session.id, user_id: session.user_id, property_id: session.property_id,
      intake_state: session.intake_state ?? {}, transcript: session.transcript ?? [],
    },
    noticeDocumentId: null,
    createdNoticeBinding,
    initialState: 'notice_created',
  });
  const tagged = { ...insert, produce_snapshot: currentSnapshot, ...e2eTagFromHeaders(req.headers) };
  const { data: rec, error } = await sb.from('riskpath_records').insert(tagged).select('id').single();
  if (error) return NextResponse.json({ error: 'record_write_failed', detail: error.message }, { status: 500 });

  const payload = { ...flattenIntake(session.intake_state ?? {}), serviceDate: intendedServiceDate };
  return NextResponse.json({
    ok: true,
    riskpathId: rec.id,
    createdNoticeArtifactId,
    lahdCopyVersion: lahdFilingPromptCopyVersion,
    baseName: slugBaseName(payload),
    payload,
  });
}
