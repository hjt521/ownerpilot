// lib/automation/mirrorScrubber.ts
// Lane 7 A15 — scrub the Notion mirror payload against the PII denylist BEFORE any Notion write.
// Master prompt §11: no PII in the Notion mirror. Reuses the generalized lib/safety/denylist scanFreeText.
// A denylist block is a CODE DEFECT (not a retry candidate): caller must NOT write to Notion and must NOT enqueue.

import { scanFreeText } from '@/lib/safety/denylist';
import type { RunRecord } from './types';

export interface ScrubRejection {
  field: string;
  patterns: string[]; // matched pattern NAMES only — never the offending content (A15 §4.3)
}

export interface MirrorScrubResult {
  ok: boolean;
  scrubbedPayload?: RunRecord;
  rejections?: ScrubRejection[];
}

// Free-text fields that get content-scanned. Structural fields (cron_id, run_date, status, cron_category,
// changes_found, report_link, cron_name) are safe and bypass scrubbing.
const FREE_TEXT_FIELDS: (keyof RunRecord)[] = ['summary'];

export function scrubMirrorPayload(payload: RunRecord): MirrorScrubResult {
  const rejections: ScrubRejection[] = [];
  for (const field of FREE_TEXT_FIELDS) {
    const v = payload[field];
    if (typeof v === 'string') {
      const patterns = scanFreeText(v);
      if (patterns.length) rejections.push({ field: String(field), patterns });
    }
  }
  // Defensive: scan any future 'notes'-style free-text field if present on the object.
  const extra = (payload as unknown as Record<string, unknown>)['notes'];
  if (typeof extra === 'string') {
    const patterns = scanFreeText(extra);
    if (patterns.length) rejections.push({ field: 'notes', patterns });
  }

  if (rejections.length) return { ok: false, rejections };
  return { ok: true, scrubbedPayload: payload };
}
