// app/api/waitlist/route.ts
// Fork B2 — closed-beta waitlist capture. POST {email[, city]} → upsert into waitlist_signups (service-role;
// broker-only read via Studio). Dedupe on email. No PII beyond the email the person volunteered; no free-text.
// Source: gate3_forks_C_D_B_E_F_G_omnibus_broker_ruling_2026-07-02 (B2).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const schema = z.object({ email: z.string().email(), city: z.string().max(80).optional() });

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const raw = form
    ? { email: form.get('email'), city: form.get('city') ?? undefined }
    : await req.json().catch(() => ({}));

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });

  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await sb
    .from('waitlist_signups')
    .upsert(
      { email: parsed.data.email.trim().toLowerCase(), city: parsed.data.city ?? null },
      { onConflict: 'email', ignoreDuplicates: true },
    );
  if (error) {
    console.error('waitlist insert failed', error.message);
    return NextResponse.json({ error: 'Could not join the waitlist. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
