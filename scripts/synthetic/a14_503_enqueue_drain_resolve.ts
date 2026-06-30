// scripts/synthetic/a14_503_enqueue_drain_resolve.ts
// A14 synthetic test — 503 → enqueue → drain → resolve. Exercises the REAL queue table + drainOnce logic against
// a Supabase PREVIEW branch. Idempotent: tags + deletes its own rows on exit. NEVER runs without --preview-db.
//
//   npm run synthetic:a14:503 -- --preview-db
//   env: SUPABASE_PREVIEW_URL, SUPABASE_PREVIEW_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { drainOnce } from '../../lib/automation/queueDrain';
import type { RunRecord } from '../../lib/automation/types';
import type { MirrorResult } from '../../lib/automation/notion';

const MARKER = 'SYNTHETIC_A14_503';
let pass = 0, fail = 0;
const ck = (n: string, c: boolean) => { c ? pass++ : (fail++, console.error('FAIL:', n)); };

function guardPreviewDb() {
  if (!process.argv.includes('--preview-db')) throw new Error('refusing to run without --preview-db (never target prod)');
  const url = process.env.SUPABASE_PREVIEW_URL, key = process.env.SUPABASE_PREVIEW_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_PREVIEW_URL + SUPABASE_PREVIEW_SERVICE_ROLE_KEY required');
  if (/(prod|www\.ownerpilot)/i.test(url)) throw new Error('URL looks like production — aborting');
  return createClient(url, key, { auth: { persistSession: false } });
}

function testPayload(): RunRecord {
  return { cron_id: 'cron_9_mirror_health_check', cron_name: 'Geocode audit-log integrity check',
    cron_category: 'in_app_health', status: 'clean', run_date: new Date().toISOString(),
    changes_found: 0, summary: `${MARKER} all integrity checks passed`, report_link: '' };
}

async function main() {
  const sb = guardPreviewDb();
  try {
    // 1. enqueue (simulates a transient Notion failure having queued the row)
    const { data: ins } = await sb.from('automation_mirror_queue')
      .insert({ payload_jsonb: testPayload(), next_retry_at: new Date(Date.now() - 1000).toISOString() })
      .select('id').single();
    ck('row enqueued', !!ins?.id);

    // 2. drain tick #1 — mock Notion returns transient failure → row should requeue (attempts=1)
    const fail503: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: false, reason: 'queued_for_retry' });
    await drainOnce(sb, fail503, { nowMs: Date.now() });
    const { data: afterFail } = await sb.from('automation_mirror_queue').select('attempts, resolved_at, next_retry_at').eq('id', ins!.id).single();
    ck('after 503: attempts=1, unresolved, backoff scheduled',
      afterFail!.attempts === 1 && afterFail!.resolved_at === null && new Date(afterFail!.next_retry_at).getTime() > Date.now());

    // 3. drain tick #2 — mock returns success (advance clock past backoff) → row resolves
    const ok200: (p: RunRecord) => Promise<MirrorResult> = async () => ({ written: true });
    await drainOnce(sb, ok200, { nowMs: Date.now() + 5 * 60_000 });
    const { data: afterOk } = await sb.from('automation_mirror_queue').select('resolved_at').eq('id', ins!.id).single();
    ck('after 200: resolved_at set', afterOk!.resolved_at !== null);
  } finally {
    // idempotent cleanup — remove all rows this test created (marker in payload summary)
    const { data: all } = await sb.from('automation_mirror_queue').select('id, payload_jsonb');
    for (const r of all ?? []) {
      if ((r.payload_jsonb as RunRecord)?.summary?.startsWith(MARKER)) {
        await sb.from('automation_mirror_queue').delete().eq('id', r.id);
      }
    }
  }
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
