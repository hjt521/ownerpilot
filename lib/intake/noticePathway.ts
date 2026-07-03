// lib/intake/noticePathway.ts
// Lane W2 (omnibus §3.2) — notice-type routing. The LAHD EFS portal only files 3-day / 5-day notices; 30/60/90
// -day termination-of-tenancy notices go through the separate Declaration of Intent to Evict pathway. This maps a
// notice type to its filing pathway so the chat/intake flow can route terminations to the scaffolding stub.

export type NoticePathway = 'efs' | 'declaration_of_intent';

/** 3-day / 5-day notices file through the LAHD EFS system (the current OwnerPilot flow). */
export const EFS_NOTICE_TYPES = ['3_day_pay_or_quit', '5_day_pay_or_quit', '3_day_cure_or_quit'] as const;
/** 30/60/90-day termination notices file through the Declaration of Intent to Evict pathway. */
export const DECLARATION_NOTICE_TYPES = ['30_day', '60_day', '90_day'] as const;

const DECLARATION_SET = new Set<string>(DECLARATION_NOTICE_TYPES);

/**
 * Classify a notice type to its LAHD filing pathway. 30/60/90-day terminations → 'declaration_of_intent';
 * everything else (the 3/5-day EFS notices, and unknown/default) → 'efs' (the current flow). Normalizes case + a
 * few common label spellings ("60-day", "60 Day") to the underscore form.
 */
export function classifyNoticePathway(noticeType: string | null | undefined): NoticePathway {
  const key = (noticeType ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return DECLARATION_SET.has(key) ? 'declaration_of_intent' : 'efs';
}

/** True when the notice type must route to the Declaration of Intent scaffolding rather than the EFS flow. */
export function routesToDeclarationOfIntent(noticeType: string | null | undefined): boolean {
  return classifyNoticePathway(noticeType) === 'declaration_of_intent';
}
