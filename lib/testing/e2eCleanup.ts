// lib/testing/e2eCleanup.ts
// E2-D3/D4 — tag-scoped teardown for an E2E run, in FK order. chat_sessions + riskpath_records carry the
// e2e_run_id tag (we control those inserts). documents are created by the FROZEN Phase 2D rail and carry NO
// tag, so they are cleaned by FK reference (riskpath_records.notice_document_id collected before delete) —
// the single documented deviation from E2-D1 "every row", flagged for broker confirm.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface E2eCleanupResult {
  documentsDeleted: number;
  remaining: { documents: number; riskpath: number; sessions: number };
}

async function countTag(sb: SupabaseClient, table: string, runId: string): Promise<number> {
  const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).eq('e2e_run_id', runId);
  return count ?? 0;
}

export async function cleanupE2eRun(sb: SupabaseClient, runId: string): Promise<E2eCleanupResult> {
  if (!runId) throw new Error('cleanupE2eRun requires an E2E run id');

  // (1) collect document ids from tagged riskpath rows BEFORE deleting them (documents have no tag)
  const { data: rp } = await sb.from('riskpath_records').select('notice_document_id').eq('e2e_run_id', runId);
  const docIds = Array.from(
    new Set((rp ?? []).map((r) => (r as { notice_document_id: string | null }).notice_document_id).filter(Boolean)),
  ) as string[];

  // (2) FK order: documents → riskpath_records → chat_sessions
  if (docIds.length) await sb.from('documents').delete().in('id', docIds);
  await sb.from('riskpath_records').delete().eq('e2e_run_id', runId);
  await sb.from('chat_sessions').delete().eq('e2e_run_id', runId);

  // (3) verify zero remain
  let documents = 0;
  if (docIds.length) {
    const { count } = await sb.from('documents').select('*', { count: 'exact', head: true }).in('id', docIds);
    documents = count ?? 0;
  }
  const riskpath = await countTag(sb, 'riskpath_records', runId);
  const sessions = await countTag(sb, 'chat_sessions', runId);

  return { documentsDeleted: docIds.length, remaining: { documents, riskpath, sessions } };
}
