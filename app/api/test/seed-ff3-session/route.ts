// app/api/test/seed-ff3-session/route.ts
// PREVIEW-ONLY seed for the FF-3 capture E2E (ff3-capture.spec.ts). Creates ONE base-complete chat_sessions row
// that is "FF-3-ready" — every non-scripted required field + the four base scripted categories captured,
// ff3_capture_status NULL — so the very next owner turn opens FF-3 (flag on) and the spec drives the scripted
// walk deterministically (the FF-3 category never calls the LLM).
//
// Same four defense-in-depth locks as seed-session (ruling E4; enforced generically by
// scripts/ci/verify_e2e_seed_guard.mjs):
//   S2  production runtime → 404
//   S3  E2E_RUN_ACTIVE=true required → 404 otherwise
//   S4  TEST_SEED_SECRET shared secret in Authorization → 401 on mismatch
//   S7  strict, fixed-shape input (.strict()) — the only caller field is an optional `claimed` flag
//   S5  stamps e2e_run_id / synthetic_source so global-teardown cleans it up

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serviceClient, generateAnonToken, hashAnonToken } from '@/lib/chat/session';
import { ff3ReadyIntakeState } from '@/lib/testing/e2eFf3Fixture';

const bodySchema = z.object({ claimed: z.boolean().optional() }).strict();

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
  // S7 — strict input scope
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'bad seed input' }, { status: 400 });
  const { claimed } = parsed.data;

  // A claimed session (needed only if the spec walks through to produce) requires the provisioned test user.
  const testUserId = process.env.E2E_TEST_USER_ID;
  if (claimed && !testUserId) {
    return NextResponse.json({ error: 'E2E_TEST_USER_ID not provisioned' }, { status: 500 });
  }

  const runId = req.headers.get('x-e2e-run-id') || null;
  const rawToken = generateAnonToken();
  const sb = serviceClient();
  const { data, error } = await sb
    .from('chat_sessions')
    .insert({
      anon_token_hash: hashAnonToken(rawToken),
      user_id: claimed ? testUserId : null,
      status: 'active',              // base fields complete but FF-3 still pending → not intake_complete
      intake_state: ff3ReadyIntakeState(),
      intake_complete: false,
      ff3_capture_status: null,      // the next owner turn opens FF-3
      e2e_run_id: runId,             // S5 tag for teardown
      synthetic_source: 'e2e',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'seed failed', detail: error.message }, { status: 500 });

  // Spec reads { cookie } and sets op_chat_token.
  return NextResponse.json({ cookie: rawToken, sessionId: data.id });
}
