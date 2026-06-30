// app/api/cron/privacy-ack-send/route.ts
// Lane 6 / ruling §4.6 — acknowledgement email cron. Fires within 24h of submission (CCPA: within 10 business
// days) — async, NOT synchronous from the POST (A14 isolation reasoning). Does NOT mirror to Notion (ruling §4).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function sendAckEmail(to: string, requestType: string): Promise<void> {
  // Wire to Resend (transactional). Subject/body from the locked CCPA timeline language. NEVER include other
  // requesters' data; one email per request. Placeholder until the Resend client is wired on-branch.
  console.info(`[privacy-ack] would send acknowledgement to ${to.replace(/(.).*(@.*)/, '$1***$2')} type=${requestType}`);
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = svc();
  const { data: rows } = await sb
    .from('privacy_requests')
    .select('id, contact_email, request_type')
    .is('acknowledged_at', null)
    .eq('status', 'received')
    .limit(100);

  let acked = 0;
  for (const row of rows ?? []) {
    try {
      await sendAckEmail(row.contact_email as string, row.request_type as string);
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
