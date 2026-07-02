// app/api/cron/privacy-ack-send/route.ts
// Lane 6 / ruling §4.6 — acknowledgement email cron. Fires within 24h of submission (CCPA: within 10 business
// days) — async, NOT synchronous from the POST (A14 isolation reasoning). Does NOT mirror to Notion (ruling §4).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPrivacyAckEmail } from '@/lib/email/resend';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = svc();
  const { data: rows } = await sb
    .from('privacy_requests')
    .select('id, contact_email, request_type, submitted_at')
    .is('acknowledged_at', null)
    .eq('status', 'received')
    .limit(100);

  let acked = 0;
  for (const row of rows ?? []) {
    try {
      // Real Resend send (D1): locked CCPA timeline copy + Reply-To privacy@ownerpilot.ai. Only acknowledge
      // (mark the row) if the send succeeds — a throw leaves the row unacknowledged for the next cron tick.
      await sendPrivacyAckEmail(row.contact_email as string, row.submitted_at as string);
      await sb.from('privacy_requests')
        .update({ acknowledged_at: new Date().toISOString(), status: 'acknowledged' })
        .eq('id', row.id);
      acked++;
    } catch (e) {
      console.error(`privacy-ack send failed for ${row.id}`, e);
    }
  }
  return NextResponse.json({ ok: true, acked });
}
