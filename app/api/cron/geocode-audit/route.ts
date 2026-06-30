// app/api/cron/geocode-audit/route.ts
// Lane 7 Automation §P — cron #9 geocode-audit integrity check. Byte-exact from master prompt §2.1.
// Vercel Cron (vercel.json), daily 10:00 UTC = 02:00 PT. Bearer CRON_SECRET auth.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mirrorToNotion } from '@/lib/automation/notion';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const checks = {
    durability_gate_open: false,
    orphan_audits: 0,
    null_resolved_at_count: 0,
    null_failureMode_count: 0,
  };

  const { data: gate } = await supabase
    .from('feature_flags').select('value').eq('key', 'geocode_audit_durability_open').single();
  checks.durability_gate_open = gate?.value === true;

  const { count: orphans } = await supabase
    .from('geocode_audit_log').select('*', { count: 'exact', head: true }).is('resolver_call_id', null);
  checks.orphan_audits = orphans ?? 0;

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: nullResolved } = await supabase
    .from('geocode_audit_log').select('*', { count: 'exact', head: true })
    .is('resolved_at', null).lt('created_at', dayAgo);
  checks.null_resolved_at_count = nullResolved ?? 0;

  const status = (
    !checks.durability_gate_open || checks.orphan_audits > 0 || checks.null_resolved_at_count > 5
  ) ? 'failure' : 'clean';

  const summary = status === 'clean'
    ? 'All integrity checks passed.'
    : `Integrity issues: gate=${checks.durability_gate_open}, orphans=${checks.orphan_audits}, null_resolved_24h+=${checks.null_resolved_at_count}.`;

  await mirrorToNotion({
    cron_id: 'cron_9_geocode_audit',
    cron_name: 'Geocode audit-log integrity check',
    cron_category: 'in_app_health',
    status,
    run_date: new Date().toISOString(),
    changes_found: checks.orphan_audits + checks.null_resolved_at_count,
    summary,
    report_link: '',
  });

  return NextResponse.json({ ok: true, checks, status });
}
