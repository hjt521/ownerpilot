// app/api/cron/mirror-queue-drain/route.ts
// Lane 7 A14 — cron #10 drainer. Every 5 min: retry due queue rows via the shared drainOnce (lib/automation/queueDrain).
// Backoff 1,2,4,8,16,32,60,60 capped 60min, 8 max attempts; exhausted rows resolve + notify.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { drainOnce } from '@/lib/automation/queueDrain';
import { mirrorToNotion } from '@/lib/automation/notion';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // Synthetic-run pause (ruling Q3): while a prod synthetic window is open, the real drainer stands
  // down so it can't interleave with run-uuid-scoped synthetic rows. JT unsets this after D4 + D8.
  if (process.env.SYNTHETIC_RUN_ACTIVE === 'true') {
    return new NextResponse(null, { status: 204 });
  }
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const summary = await drainOnce(sb, mirrorToNotion, { limit: 50 });
  return NextResponse.json({ ok: true, ...summary });
}
