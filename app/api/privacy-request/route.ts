// app/api/privacy-request/route.ts
// Lane 6 / ruling §4 — CCPA/CPRA request intake. Service-role insert into privacy_requests; on opt_out also
// write the suppression registry (hash-keyed). notes free-text scrubbed (no PII to a stored free-text field).
// Acknowledgement email is NOT sent synchronously here — the privacy-ack-send cron handles it (A14 isolation reasoning).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { suppressEmail } from '@/lib/privacy/suppression';
import { scanFreeText } from '@/lib/safety/denylist';

const requestSchema = z.object({
  request_type: z.enum(['know', 'delete', 'correct', 'opt_out', 'limit_sensitive']),
  contact_email: z.string().email(),
  notes: z.string().max(2000).optional(),
  requester_authorization_uploaded: z.boolean().optional().default(false),
});

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const raw = form
    ? {
        request_type: form.get('request_type'),
        contact_email: form.get('contact_email'),
        notes: form.get('notes') ?? undefined,
        requester_authorization_uploaded: form.get('requester_authorization_uploaded') === 'true',
      }
    : await req.json().catch(() => ({}));

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid request type and email are required.' }, { status: 400 });
  }
  const body = parsed.data;

  // Scrub the free-text notes — block if PII-shaped content is present (don't store PII in a free-text field).
  if (body.notes) {
    const hits = scanFreeText(body.notes);
    if (hits.length) {
      return NextResponse.json(
        { error: 'Please remove personal identifiers (emails, phone numbers, account numbers) from the notes field.' },
        { status: 400 },
      );
    }
  }

  const sb = svc();
  const { error } = await sb.from('privacy_requests').insert({
    request_type: body.request_type,
    contact_email: body.contact_email,
    notes: body.notes ? { text: body.notes } : {},
    requester_authorization_uploaded: body.requester_authorization_uploaded,
    status: 'received',
  });
  if (error) {
    console.error(`privacy-request insert failed type=${body.request_type}`, error.message);
    return NextResponse.json({ error: 'Could not record your request. Please try again.' }, { status: 500 });
  }

  // opt_out → suppression registry (hash-keyed). Ack email handled by the cron, not here.
  if (body.request_type === 'opt_out') {
    await suppressEmail(body.contact_email);
  }

  return NextResponse.json({ ok: true });
}
