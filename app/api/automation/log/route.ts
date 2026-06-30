// app/api/automation/log/route.ts
// Lane 7 Automation §P — Computer-only logging endpoint. Byte-exact logic from master prompt §4.
// Rejects non-Computer-owned cron_ids (403); Lane 5/6/9 crons write their own tables + call mirrorToNotion directly.

import { NextRequest, NextResponse } from 'next/server';
import { mirrorToNotion } from '@/lib/automation/notion';
import type { RunRecord } from '@/lib/automation/types';

const COMPUTER_OWNED_CRONS = new Set([
  'cron_1_ca_statute_watch',
  'cron_5_lahd_forms',
  'cron_6_la_rtc_packet',
  'cron_7_rent_control_cities',
  'cron_8_holiday_table',
  'cron_9_mirror_health_check',       // A14 ruling §5.6 — added to allowlist
  'cron_10_mirror_queue_drain',       // A14 drainer
  'cron_11_mirror_queue_depth_check', // A14 depth check
]);

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-automation-secret');
  if (auth !== process.env.AUTOMATION_LOG_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const run = (await req.json()) as RunRecord;
  if (!COMPUTER_OWNED_CRONS.has(run.cron_id)) {
    return NextResponse.json(
      { error: 'wrong owner — Lane 5/6/9 crons write to their own tables and call mirrorToNotion directly' },
      { status: 403 },
    );
  }

  // Persist to cron_runs table (base ruling §1.4) — wired to the repo's supabase service-role client.
  // ... insert row ...

  await mirrorToNotion(run);
  return NextResponse.json({ ok: true });
}
