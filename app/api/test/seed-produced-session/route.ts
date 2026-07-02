// app/api/test/seed-produced-session/route.ts
// Gate-3 Slice 1 — PREVIEW-ONLY seed for the PR-B staleness E2E seams (staleness-reproduce / -dashboard-banner /
// -ack specs). Creates ONE claimed, intake-complete, NON-counsel chat_sessions row PLUS a prior riskpath_records
// row carrying a REAL produce_snapshot (built via captureProductionSnapshot(toNoticeFlowData(...)) — no bypass of
// the production capture path), so the specs can drift a field and exercise the serve-time staleness gate
// (Surface 1), the dashboard banner (Surface 2), and the ack endpoint (Surface 3).
//
// Same four defense-in-depth locks as seed-session (E4), now enforced across every app/api/test/*/route.ts by
// scripts/ci/verify_e2e_seed_guard.mjs:
//   S2  production runtime → 404 (endpoint invisible in prod)
//   S3  E2E_RUN_ACTIVE=true required → 404 otherwise
//   S4  TEST_SEED_SECRET shared secret in Authorization → 401 on mismatch
//   S7  strict input scope — z.object({}).strict() (no caller-controlled fields; deterministic)
// + S5  stamps e2e_run_id / synthetic_source on BOTH rows so teardown's tag + FK sweep cleans them (run-window §9.2).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient, generateAnonToken, hashAnonToken } from '@/lib/chat/session';
import { completeIntakeState } from '@/lib/testing/e2eIntakeFixture';
import { buildRiskPathInsert } from '@/lib/riskpath/noticeGenerationEvent';
import { captureProductionSnapshot } from '@/lib/flow/escalation';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { laProduceAuditSchema } from '@/lib/riskpath/produceAudit';

// serviceDate is NOT part of the snapshot (lib/flow/escalation.ts omits it), so any valid date assembles a valid
// NoticeFlowData without affecting the frozen snapshot. Fixed for determinism.
const SNAPSHOT_SERVICE_DATE = '2026-07-10';

// Opt-in produce_audit (Slice 2): default off preserves the Slice-1 baseline (no-audit → not LAHD-eligible);
// withProduceAudit:true stamps a schema-valid laProduceAudit — validated through the ratified laProduceAuditSchema
// (the same gate the produce-audit route enforces, no bypass) — so the row reads lahd.eligible=true.
const bodySchema = z.object({ withProduceAudit: z.boolean().optional() }).strict();

export async function POST(req: NextRequest) {
  // S2 — never reachable in production runtime
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // S3 — only during an active E2E run
  if (process.env.E2E_RUN_ACTIVE !== 'true') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // S4 — shared secret
  const secret = process.env.TEST_SEED_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // S7 — strict input scope (no caller-controlled fields)
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'bad seed input' }, { status: 400 });

  const testUserId = process.env.E2E_TEST_USER_ID;
  if (!testUserId) return NextResponse.json({ error: 'E2E_TEST_USER_ID not provisioned' }, { status: 500 });

  const runId = req.headers.get('x-e2e-run-id') || null;
  const rawToken = generateAnonToken();
  const sb = serviceClient();
  const intakeState = completeIntakeState();

  // (1) claimed, intake-complete, NON-counsel session → produce is reachable (unlike the counsel seed).
  const { data: sess, error: sErr } = await sb
    .from('chat_sessions')
    .insert({
      anon_token_hash: hashAnonToken(rawToken),
      user_id: testUserId,
      status: 'intake_complete',
      intake_state: intakeState,
      intake_complete: true,
      counsel_route_trigger: null,
      e2e_run_id: runId, // S5 tag
      synthetic_source: 'e2e',
    })
    .select('id, user_id, property_id')
    .single();
  if (sErr || !sess) {
    return NextResponse.json({ error: 'seed session failed', detail: sErr?.message }, { status: 500 });
  }

  // (2) prior produced riskpath row with a REAL snapshot (production capture path, not a hand-built object).
  const snapshot = captureProductionSnapshot(toNoticeFlowData(intakeState, SNAPSHOT_SERVICE_DATE));
  const insert = buildRiskPathInsert({
    session: {
      id: sess.id,
      user_id: sess.user_id,
      property_id: sess.property_id ?? null,
      intake_state: intakeState,
      transcript: [],
    },
    noticeDocumentId: null,
    initialState: 'notice_created',
  });
  const produceAudit = parsed.data.withProduceAudit
    ? laProduceAuditSchema.parse({
        rtcFormHashes: null,
        rtcFormLastModified: null,
        rtcRefreshRunAt: null,
        lahdFilingPromptCopyVersion: 'Rev 2.6.2026',
        lahdFilingPromptAcknowledgedAt: new Date().toISOString(),
        isLaProductionUnblockedAtProduce: true,
        cachedResolverVerdictSource: 'e2e-seed',
      })
    : null;
  const { data: rp, error: rErr } = await sb
    .from('riskpath_records')
    .insert({ ...insert, produce_snapshot: snapshot, produce_audit: produceAudit, e2e_run_id: runId, synthetic_source: 'e2e' })
    .select('id')
    .single();
  if (rErr || !rp) {
    return NextResponse.json({ error: 'seed riskpath failed', detail: rErr?.message }, { status: 500 });
  }

  return NextResponse.json({ cookie: rawToken, sessionId: sess.id, riskpathId: rp.id });
}
