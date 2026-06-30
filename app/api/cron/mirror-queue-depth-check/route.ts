// app/api/cron/mirror-queue-depth-check/route.ts
// Lane 7 A14 — cron #11 depth check. Hourly: count unresolved queue rows; 3-tier broker alerting (ruling §5.4).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const { count } = await sb
    .from('automation_mirror_queue')
    .select('*', { count: 'exact', head: true })
    .is('resolved_at', null);

  const depth = count ?? 0;

  // Oldest unresolved row age, for the notification.
  const { data: oldest } = await sb
    .from('automation_mirror_queue')
    .select('created_at')
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let tier: 'ok' | 'informational' | 'action_recommended' | 'action_required' = 'ok';
  if (depth >= 50) tier = 'action_required';
  else if (depth >= 20) tier = 'action_recommended';
  else if (depth >= 5) tier = 'informational';

  if (tier !== 'ok') {
    const oldestAt = oldest?.created_at ?? 'n/a';
    console.error(`[broker-notify:${tier}] Lane 7 mirror queue depth=${depth} oldest_unresolved=${oldestAt}`
      + (tier === 'action_required' ? ' — possible Notion outage' : ''));
  }

  return NextResponse.json({ ok: true, depth, tier, oldest_unresolved: oldest?.created_at ?? null });
}
