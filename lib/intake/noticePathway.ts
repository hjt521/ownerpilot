// lib/intake/noticePathway.ts
// Lane W2 (omnibus §3.2) — notice-type routing. The LAHD EFS portal only files 3-day / 5-day notices; 30/60/90
// -day termination-of-tenancy notices go through the separate Declaration of Intent to Evict pathway. This maps a
// notice type to its filing pathway so the chat/intake flow can route terminations to the scaffolding stub.

export type NoticePathway = 'efs' | 'declaration_of_intent';

// Two vocabularies are unified here: the original W2 labels ('60_day', "60-day") AND the FF-3 structured enum
// (lib/intake/ff3Fields.ts NOTICE_TYPE_VALUES, e.g. 'sixty_day_termination'). Before this, the FF-3 enum values
// were all misclassified as 'efs' (they don't match '30_day'/'60_day'/'90_day'), so a 60/90-day termination fed
// from the FF-3 typed column would have misrouted to EFS instead of the Declaration pathway. Fixed by adding the
// FF-3 enum values to both sets (W2 routing / produce-gate wiring, 2026-07-03).

/** 3-day / 5-day notices file through the LAHD EFS system (the current OwnerPilot flow). */
export const EFS_NOTICE_TYPES = [
  '3_day_pay_or_quit', '5_day_pay_or_quit', '3_day_cure_or_quit',
  // FF-3 enum — the three 3-day notices file via EFS.
  'three_day_pay_or_quit', 'three_day_cure_or_quit', 'three_day_unconditional_quit',
] as const;
/** 30/60/90-day termination notices file through the Declaration of Intent to Evict pathway. */
export const DECLARATION_NOTICE_TYPES = [
  '30_day', '60_day', '90_day',
  // FF-3 enum — 30/60/90-day terminations file via Declaration of Intent.
  'thirty_day_termination', 'sixty_day_termination', 'ninety_day_termination_section8',
] as const;

const DECLARATION_SET = new Set<string>(DECLARATION_NOTICE_TYPES);
const EFS_SET = new Set<string>(EFS_NOTICE_TYPES);

function normalizeNoticeKey(noticeType: string | null | undefined): string {
  return (noticeType ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Classify a notice type to its LAHD filing pathway. 30/60/90-day terminations → 'declaration_of_intent';
 * everything else (the 3/5-day EFS notices, and unknown/default) → 'efs' (the current flow). Normalizes case + a
 * few common label spellings ("60-day", "60 Day") to the underscore form. Recognizes both the original W2 labels
 * and the FF-3 enum. NOTE: unknown types default to 'efs' here (backward-compat for the chat-flow callers); the
 * W2 produce-gate uses recognizedNoticePathway() instead, which fails closed on unknown rather than defaulting.
 */
export function classifyNoticePathway(noticeType: string | null | undefined): NoticePathway {
  return DECLARATION_SET.has(normalizeNoticeKey(noticeType)) ? 'declaration_of_intent' : 'efs';
}

/**
 * Strict classifier for the produce-gate: returns the pathway only for a RECOGNIZED notice type, else null.
 * The W2 gate maps null → 'prerequisite_incomplete' (fail-closed) rather than silently defaulting to EFS.
 */
export function recognizedNoticePathway(noticeType: string | null | undefined): NoticePathway | null {
  const key = normalizeNoticeKey(noticeType);
  if (DECLARATION_SET.has(key)) return 'declaration_of_intent';
  if (EFS_SET.has(key)) return 'efs';
  return null;
}

/** True when the notice type must route to the Declaration of Intent scaffolding rather than the EFS flow. */
export function routesToDeclarationOfIntent(noticeType: string | null | undefined): boolean {
  return classifyNoticePathway(noticeType) === 'declaration_of_intent';
}
