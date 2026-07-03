// lib/admin/brokerChecklist.ts
// Lane C1-followthrough (omnibus §3.10) — definition + loader for the broker-side compliance checklist. The
// action set is code-defined (stable keys); completion state lives in broker_compliance_actions (migration 039).

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ChecklistAction {
  key: string;
  label: string;
  group: string;
}

/** The tracked broker-side compliance actions. Seeded with the C1 Sentry org-level toggles (§3.10). */
export const CHECKLIST_ACTIONS: ChecklistAction[] = [
  { key: 'sentry_data_scrubber', label: 'Sentry: enable Data Scrubber (org level)', group: 'C1 monitoring' },
  { key: 'sentry_scrub_ip', label: 'Sentry: enable Scrub IP (org level)', group: 'C1 monitoring' },
  { key: 'sentry_screenshots', label: 'Sentry: capture screenshots of both toggles for the C1 evidence packet', group: 'C1 monitoring' },
];

export interface ChecklistItem extends ChecklistAction {
  completed_at: string | null;
  completed_by: string | null;
  evidence_path: string | null;
}

/** Merge the code-defined actions with their persisted completion state (service-role read). */
export async function loadChecklist(sb: SupabaseClient): Promise<ChecklistItem[]> {
  const { data } = await sb
    .from('broker_compliance_actions')
    .select('action_key, completed_at, completed_by, evidence_path');
  const byKey = new Map((data ?? []).map((r: Record<string, unknown>) => [r.action_key as string, r]));
  return CHECKLIST_ACTIONS.map((a) => {
    const row = byKey.get(a.key);
    return {
      ...a,
      completed_at: (row?.completed_at as string) ?? null,
      completed_by: (row?.completed_by as string) ?? null,
      evidence_path: (row?.evidence_path as string) ?? null,
    };
  });
}
