// lib/automation/types.ts
// Lane 7 Automation §P — cron run record types. Byte-exact from master prompt §3.1.
// `Cron Category` field added per lane7 ruling Fork (Notion schema +1 field).

export type CronCategory = 'external_source_watch' | 'in_app_health' | 'decision2_ops';

export type RunStatus = 'clean' | 'change_detected' | 'failure' | 'partial';

export interface RunRecord {
  cron_id: string;
  cron_name: string;
  cron_category: CronCategory;
  status: RunStatus;
  run_date: string;          // ISO
  changes_found: number;
  summary: string;
  report_link: string;
}
