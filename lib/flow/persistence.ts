/**
 * Draft persistence for the 3-day notice wizard (R2a, 2026-06-12).
 *
 * A single versioned envelope in localStorage keeps the in-progress draft
 * refresh-safe and lets future modules (Serve & Track, Proof of Service)
 * read flow facts after navigation. Data never leaves the browser.
 *
 * Design rules:
 *  - Fail-soft everywhere. Storage may be absent (SSR), throwing (private
 *    browsing quotas), or hold corrupt/stale payloads; every such case
 *    returns null / false and never throws into the wizard.
 *  - Versioned envelope. Any shape change bumps DRAFT_VERSION; old versions
 *    are discarded rather than migrated (a draft is cheap to re-enter,
 *    a crash is not).
 *  - Injectable storage so the suite can exercise all paths without a DOM.
 */
import type { NoticeFlowData } from './noticeFlowState';

export const DRAFT_KEY = 'op.noticeDraft.v1';
// Bumped 1 -> 2 with the 5-page wizard re-partition (Slice A). A stored
// pageIndex from the old 4-page structure points at a different page now,
// so pre-redesign drafts are discarded on load (loadDraft's version check)
// rather than restoring the user onto the wrong page. Envelope shape is
// unchanged; the next autosave overwrites the same key (no orphan).
export const DRAFT_VERSION = 2;

export interface DraftEnvelope {
  v: number;
  savedAt: string;
  pageIndex: number;
  data: NoticeFlowData;
}

export interface RestoredDraft {
  pageIndex: number;
  data: NoticeFlowData;
  savedAt: string;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Persist the current draft. Returns false (silently) if storage is unavailable. */
export function saveDraft(
  pageIndex: number,
  data: NoticeFlowData,
  storage?: StorageLike | null,
): boolean {
  const s = resolveStorage(storage);
  if (!s) return false;
  const envelope: DraftEnvelope = {
    v: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    pageIndex,
    data,
  };
  try {
    s.setItem(DRAFT_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/** Load a draft if present, valid, and current-version; otherwise null. */
export function loadDraft(storage?: StorageLike | null): RestoredDraft | null {
  const s = resolveStorage(storage);
  if (!s) return null;
  let raw: string | null;
  try {
    raw = s.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const env = parsed as Partial<DraftEnvelope>;
  if (env.v !== DRAFT_VERSION) return null;
  if (typeof env.pageIndex !== 'number' || !Number.isFinite(env.pageIndex)) return null;
  if (typeof env.data !== 'object' || env.data === null) return null;
  if (typeof env.savedAt !== 'string') return null;
  return { pageIndex: env.pageIndex, data: env.data as NoticeFlowData, savedAt: env.savedAt };
}

/** Remove any stored draft. Never throws. */
export function clearDraft(storage?: StorageLike | null): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.removeItem(DRAFT_KEY);
  } catch {
    /* fail-soft */
  }
}
