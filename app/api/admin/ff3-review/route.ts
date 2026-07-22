// app/api/admin/ff3-review/route.ts
// FF-3 Block B — admin-gated API for the awaiting_broker_review resolution surface.
// GET: list sessions awaiting broker review (+ reconciliation gap). POST: resolve one with a broker note.
// Gate: authenticated user's email must be on ADMIN_EMAILS (ruling §2). Writes use the service-role client.
// The reviewer email + resolved-at written on the row are the mutation audit trail (ruling §4).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { currentAdmin } from '@/lib/admin/isAdmin';
import { readRequestBody } from '@/lib/http/requestBody';
import { loadAwaitingReview, resolveAwaitingReview, loadSessionTranscript } from '@/lib/admin/ff3Review';
// Omnibus §3 row 2 — FF-3 telemetry (pre-staged; no-op unless FF3_TELEMETRY_ENABLED + consent; never throws).
import { emitFf3Event, ff3TelemetryConsentFromCookie } from '@/lib/analytics/ff3Telemetry';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const postSchema = z.object({
  session_id: z.string().uuid(),
  // Owner-facing verbatim (feeds entry-13 {broker_resolution_note}); required, bounded.
  broker_resolution_note: z.string().trim().min(1, 'note required').max(2000),
});

export async function GET(req: NextRequest) {
  const { isAdmin } = await currentAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const sb = svc();
  // ?session=<uuid> → the deep-linked transcript for one awaiting session (ruling §3).
  const sessionId = req.nextUrl.searchParams.get('session');
  try {
    if (sessionId) {
      const transcript = await loadSessionTranscript(sb, sessionId);
      if (transcript === null) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ transcript });
    }
    return NextResponse.json({ items: await loadAwaitingReview(sb) });
  } catch (e) {
    // A data-layer query failure surfaces as a 500 (→ Sentry §B "/admin/ff3-review 5xx → Sev-2 page"), never a
    // 200 with an empty list. Loud, not silent.
    console.error('[ff3-review] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'review_query_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin, email } = await currentAdmin();
  if (!isAdmin || !email) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = postSchema.safeParse(await readRequestBody(req));
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 });

  const sb = svc();
  const result = await resolveAwaitingReview(sb, parsed.data.session_id, parsed.data.broker_resolution_note, email);
  if (!result.ok) {
    console.error('ff3-review resolve failed', result.error);
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }
  // Omnibus §3 row 2 — resolution-recorded seam (broker actor). Only when a row was actually resolved. No-op unless
  // telemetry on + consent; never throws (soak-safe).
  if (result.affected > 0) {
    emitFf3Event(
      { event: 'resolution-recorded', chatSessionId: parsed.data.session_id, actorType: 'broker', sourceRoute: 'POST /api/admin/ff3-review', dispositionRef: 'broker_resolution_note' },
      { consentGranted: ff3TelemetryConsentFromCookie(req.cookies.get('CookieConsent')?.value) },
    );
  }
  // affected === 0 → the session wasn't in the awaiting set (already resolved / not escalated). Not an error.
  return NextResponse.json({ items: await loadAwaitingReview(sb), resolved: result.affected });
}
