// lib/riskpath/lahdFilingRecord.ts
// PR-C LAHD filing-completion record — validation + the cover-sheet revision constant.
// Source: pr_c_lahd_checklist_scope_omnibus_broker_ruling_2026-07-01.md §§6, 7.2.

import { z } from 'zod';

/**
 * The LAHD Eviction Notice Filing Cover Sheet revision this build renders + records (§2.2 baseline).
 * §7.2: the cron `0abb46c4` pinned-forms snapshot lives on the broker's scheduling layer (not runtime-readable
 * from the app), so the app uses this hard-coded constant. If LAHD publishes a new revision, the cron flags it,
 * the broker re-ratifies, and this constant bumps. Anti-defaulting: never fabricate a newer revision.
 */
export const COVER_SHEET_REVISION = 'Rev 2.6.2026';

export const FILING_CHANNEL = z.enum(['online_portal', 'mail_with_cover_sheet', 'other']);

/** Owner-attested filing record (§6.1). cover_sheet_revision is stamped server-side, not from the body. */
export const lahdFilingRecordBodySchema = z.object({
  filing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'filing_date must be an ISO date (YYYY-MM-DD)')
    .refine((d) => d <= new Date().toISOString().slice(0, 10), 'filing_date cannot be in the future'),
  filing_channel: FILING_CHANNEL,
});
export type LahdFilingRecordBody = z.infer<typeof lahdFilingRecordBodySchema>;
