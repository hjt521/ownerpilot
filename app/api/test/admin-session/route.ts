// app/api/test/admin-session/route.ts
// PREVIEW-ONLY: mint a Supabase-Auth session for the provisioned E2E admin so the Playwright admin browser context
// can drive /admin/ff3-review. Authority: ff3_gate4_omnibus_authorization_broker_signature_2026-07-12 §4.
//
// SECURITY BOUNDARY (§4 clarification): this endpoint mints a session for `E2E_ADMIN_EMAIL` ONLY, read from the
// environment at invocation. It NEVER accepts an email/user from the request body (strict empty input) — even with
// a valid bearer + E2E_RUN_ACTIVE, a caller cannot specify a different user. This prevents it from becoming a
// general-purpose "mint any admin session" surface if a lock is ever bypassed.
//
// Same four defense-in-depth locks as the seed routes (verify_e2e_seed_guard enforces them generically):
//   S2  production runtime → 404
//   S3  E2E_RUN_ACTIVE=true required → 404 otherwise
//   S4  TEST_SEED_SECRET shared secret in Authorization → 401 on mismatch
//   S7  strict, fixed-shape input: z.object({}).strict() — the body must be exactly {}

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createClient as createSsrClient } from '@/lib/supabase/server';

const bodySchema = z.object({}).strict(); // S7 — no email/user override accepted.

/** Ensure the single provisioned admin auth user exists with the known test password (idempotent). */
async function ensureAdminUser(admin: SupabaseClient, email: string, password: string): Promise<void> {
  const { data } = await admin.auth.admin.listUsers();
  const existing = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  } else {
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
  }
}

export async function POST(req: NextRequest) {
  // S2 — never reachable in production runtime.
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // S3 — only during an active E2E run.
  if (process.env.E2E_RUN_ACTIVE !== 'true') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // S4 — shared secret.
  const secret = process.env.TEST_SEED_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // S7 — strict empty input; the admin identity comes from env, never the request.
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'bad input' }, { status: 400 });

  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const svcUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!email || !password || !svcUrl || !serviceKey || !publicUrl || !anonKey) {
    return NextResponse.json({ error: 'admin-session not provisioned' }, { status: 500 });
  }

  const admin = createAdminClient(svcUrl, serviceKey, { auth: { persistSession: false } });
  await ensureAdminUser(admin, email, password);

  // Sign in to obtain tokens, then install them via the app's OWN SSR cookie writer so the sb-* cookie format
  // matches exactly what currentAdmin()/getUser() reads. The admin context that made this request is then authed.
  const signIn = createAdminClient(publicUrl, anonKey, { auth: { persistSession: false } });
  const { data: sess, error } = await signIn.auth.signInWithPassword({ email, password });
  if (error || !sess.session) return NextResponse.json({ error: 'sign-in failed' }, { status: 500 });

  const ssr = await createSsrClient();
  await ssr.auth.setSession({
    access_token: sess.session.access_token,
    refresh_token: sess.session.refresh_token,
  });

  return NextResponse.json({ ok: true, email });
}
