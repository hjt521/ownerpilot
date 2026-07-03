// lib/filing/efsRecord.ts
// Lane W4 (omnibus §3.5) — post-filing EFS capture helpers. Parse the LAHD EFS record number from the
// confirmation email/portal text, compute the 60-day post-filing edit window (only five tenant fields are
// editable through LAHD), and render the locked post-filing confirmation card. Pure — the capture endpoint +
// card UI are the wiring; this is the testable core.

import { lockedProseEntry } from '@/lib/compliance/lockedProse';

/** LAHD record numbers look like EFS####### (7 digits). Parse the first match from arbitrary text; normalize case. */
export function parseEfsRecordNumber(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.toUpperCase().match(/EFS\d{7}/);
  return m ? m[0] : null;
}

/** Valid EFS record number (exactly EFS + 7 digits). */
export function isEfsRecordNumber(value: string | null | undefined): boolean {
  return !!value && /^EFS\d{7}$/.test(value.toUpperCase());
}

/** The five tenant fields LAHD lets a landlord edit within 60 days of filing. Everything else is locked. */
export const EDITABLE_TENANT_FIELDS = ['unit_number', 'phone', 'email', 'first_name', 'last_name'] as const;
export type EditableTenantField = (typeof EDITABLE_TENANT_FIELDS)[number];

const EDIT_WINDOW_DAYS = 60;

function parseIso(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
}

export interface EditWindow {
  withinWindow: boolean;
  daysRemaining: number; // 0 when expired
  editableFields: readonly EditableTenantField[]; // the five fields while open; [] when expired
}

/** Compute the 60-day post-filing edit window from the filing date. `today` defaults to now (ISO date). */
export function editableFieldsWindow(filingDateIso: string, todayIso: string): EditWindow {
  const filed = parseIso(filingDateIso).getTime();
  const today = parseIso(todayIso).getTime();
  const daysSince = Math.floor((today - filed) / 86_400_000);
  const withinWindow = daysSince >= 0 && daysSince <= EDIT_WINDOW_DAYS;
  return {
    withinWindow,
    daysRemaining: withinWindow ? EDIT_WINDOW_DAYS - daysSince : 0,
    editableFields: withinWindow ? EDITABLE_TENANT_FIELDS : [],
  };
}

/** The locked post-filing confirmation card (§3.5) with the EFS record number interpolated. */
export function postFilingCardMessage(efsRecordNumber: string): string {
  // LockedKey: POST_FILING_CONFIRMATION_CARD_EN
  return lockedProseEntry('POST_FILING_CONFIRMATION_CARD_EN').value.replace('${efs_record_number}', efsRecordNumber);
}
