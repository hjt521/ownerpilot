// app/api/test/seed-session/route.ts
// E4 — PREVIEW-ONLY seed for the counsel-route hard-stop E2E (counsel-route-hardstop.spec.ts). Creates ONE
// complete, claimed chat_sessions row with a counsel_route_trigger set, so the spec can assert produce →
// 409 routed_to_counsel (the G4 server-side hard-stop) without walking a full intake.
//
// Four defense-in-depth locks (ruling E4), in order:
//   S2  production runtime → 404 (first check; endpoint is invisible in prod)
//   S3  E2E_RUN_ACTIVE=true required → 404 otherwise
//   S4  TEST_SEED_SECRET shared secret in Authorization → 401 on mismatch
//   S7  strict input scope — exactly { complete:true, counselTrigger } (.strict()), trigger validated against
//       the canonical COUNSEL_ROUTE_TRIGGERS; one fixed row shape, no arbitrary write surface
// + S5  stamps the e2e_run_id / synthetic_source tag so teardown cleans it up
// S6 (build-time/CI exclusion) is enforced by scripts/ci/verify_e2e_seed_guard.mjs.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient, generateAnonToken, hashAnonToken } from '@/lib/chat/session';
import { completeIntakeState } from '@/lib/testing/e2eIntakeFixture';
import { isCounselRouteTrigger } from '@/lib/riskpath/triggers';

const bodySchema = z
  .object({ complete: z.literal(true), counselTrigger: z.string().min(1) })
  .strict();

export async function POST(req: NextRequest) {
  // S2 — never reachable in production runtime
  // S2 — never reachable in the PRODUCTION deployment. Gate on VERCEL_ENV only: NODE_ENV is 'production' on ALL
  // Vercel deployments (including Preview), so checking it here would 404 the seed on Preview too (defect fix).
  if (process.env.VERCEL_ENV === 'production') {
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
  // S7 — strict input scope
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'bad seed input' }, { status: 400 });
  const { counselTrigger } = parsed.data;
  if (!isCounselRouteTrigger(counselTrigger)) {
    return NextResponse.json({ error: 'unknown counsel trigger' }, { status: 400 });
  }

  // Claimed session needs a real user FK — a single provisioned, Preview-only test user (no users-table churn).
  const testUserId = process.env.E2E_TEST_USER_ID;
  if (!testUserId) return NextResponse.json({ error: 'E2E_TEST_USER_ID not provisioned' }, { status: 500 });

  const runId = req.headers.get('x-e2e-run-id') || null;
  const rawToken = generateAnonToken();
  const sb = serviceClient();
  const { data, error } = await sb
    .from('chat_sessions')
    .insert({
      anon_token_hash: hashAnonToken(rawToken),
      user_id: testUserId, // claimed → passes the produce 401, reaches the 409 hard-stop
      status: 'intake_complete',
      intake_state: completeIntakeState(),
      intake_complete: true,
      counsel_route_trigger: counselTrigger, // S7: the only caller-controlled field
      e2e_run_id: runId, // S5 tag for teardown
      synthetic_source: 'e2e',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'seed failed', detail: error.message }, { status: 500 });

  // Spec reads { cookie } and sets op_chat_token.
  return NextResponse.json({ cookie: rawToken, sessionId: data.id });
}
