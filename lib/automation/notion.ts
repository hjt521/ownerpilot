// lib/automation/notion.ts
// Lane 7 Automation §P — Notion mirror. A15: scrub payload before any write. A14: enqueue on transient failure.
// Uses @notionhq/client (NOT lib/http/boundFetch — no Phase 2D freeze concern). Fail-soft: cron primary work
// always completes; mirror outcome is returned, never thrown back into the cron.

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { RunRecord } from './types';
import { scrubMirrorPayload } from './mirrorScrubber';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_AUTOMATION_DB_ID!;

export type MirrorResult =
  | { written: true }
  | { written: false; reason: 'denylist_block'; rejections: { field: string; patterns: string[] }[] }
  | { written: false; reason: 'queued_for_retry' }
  | { written: false; reason: 'non_transient_error' }
  | { written: false; reason: 'env_unset' };

function svc() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** A14 transient classification: 5xx, 429, network/DNS/timeout → queue. Other 4xx → broker-alert, no queue. */
export function isTransientNotionError(err: unknown): boolean {
  const e = err as { status?: number; code?: string; name?: string };
  if (typeof e?.status === 'number') return e.status === 429 || e.status >= 500;
  const code = String(e?.code ?? e?.name ?? '').toLowerCase();
  return /timeout|etimedout|timed_?out|econn|enotfound|eai_again|network|fetch failed|socket/.test(code);
}

async function notifyBroker(title: string, detail: string): Promise<void> {
  // Wire to the repo notification rail (in_app + email). NEVER include offending payload content (A15 §4.3).
  console.error(`[broker-notify] ${title} :: ${detail}`);
}

async function enqueueForRetry(payload: RunRecord, err: unknown): Promise<void> {
  await svc().from('automation_mirror_queue').insert({
    payload_jsonb: payload,
    last_error: String((err as { message?: string })?.message ?? err).slice(0, 500),
  });
}

async function callNotionApi(payload: RunRecord): Promise<void> {
  await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      'Run ID':        { title:  [{ text: { content: `${payload.cron_id}_${payload.run_date.slice(0, 10)}` } }] },
      'Cron':          { select: { name: payload.cron_name } },
      'Cron Category': { select: { name: payload.cron_category } },
      'Status':        { select: { name: payload.status } },
      'Run Date':      { date: { start: payload.run_date } },
      'Changes Found': { number: payload.changes_found },
      'Summary':       { rich_text: [{ text: { content: payload.summary.slice(0, 2000) } }] },
      'Report Link':   { url: payload.report_link || null },
      'Next Run':      { date: null },
    },
  } as Parameters<typeof notion.pages.create>[0]);
}

/** Write a cron run to the Notion mirror. Scrub first (A15); enqueue on transient failure (A14). */
export async function postToNotionDb(payload: RunRecord): Promise<MirrorResult> {
  // A15 — denylist scrub is the FIRST line. Block = code defect; do NOT write, do NOT enqueue.
  const scrub = scrubMirrorPayload(payload);
  if (!scrub.ok) {
    const fields = (scrub.rejections ?? []).map((r) => `${r.field}:${r.patterns.join('/')}`).join(', ');
    await notifyBroker(
      'Lane 7 mirror payload rejected by denylist — code review required',
      `rejected fields/patterns: ${fields}`, // pattern NAMES only, never the offending string
    );
    return { written: false, reason: 'denylist_block', rejections: scrub.rejections! };
  }

  if (!process.env.NOTION_TOKEN || !DB_ID) {
    console.warn('Notion env not set — skipping mirror');
    return { written: false, reason: 'env_unset' };
  }

  // A14 — write; queue on transient, broker-alert on non-transient.
  try {
    await callNotionApi(scrub.scrubbedPayload!);
    return { written: true };
  } catch (err) {
    if (isTransientNotionError(err)) {
      await enqueueForRetry(scrub.scrubbedPayload!, err);
      return { written: false, reason: 'queued_for_retry' };
    }
    await notifyBroker('Lane 7 non-transient mirror failure', String((err as { message?: string })?.message ?? err));
    return { written: false, reason: 'non_transient_error' };
  }
}

/** Back-compat name used by cron routes. */
export const mirrorToNotion = postToNotionDb;
