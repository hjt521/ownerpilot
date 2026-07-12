// lib/intake/ff3ResumeAuthorization.ts
// FF-3 Block C server-resume seam — the PURE, I/O-free core of the scoped broker-authorization override.
// Authority: ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12 §Gap-A (Option 2).
//
// A broker resolving an awaiting_broker_review session authorizes THIS specific reconciliation mismatch on THIS
// specific session — not an open-ended override. That authorization is captured as a scoped object at resolve
// time and re-checked against live session state when the owner taps Continue. Every field is a constraint:
//   session_id           — the authorization is bound to one session.
//   notice_amount        — the notice figure the broker saw (numeric dollars; DB column amount_of_rent_owed).
//   ledger_total         — the rent-ledger baseline the broker saw (the reconciliation counter-value).
//   ledger_period        — identity of the covered ledger period(s), so a re-scoped ledger invalidates the auth.
//   broker_email         — who authorized (audit).
//   resolution_note_hash — sha256 of the exact broker note (defense-in-depth: a tampered note fails scope).
//   authorized_at        — when.
// If ANY of {session_id, notice_amount, ledger_total, ledger_period, resolution_note_hash} drifts between
// resolve and Continue, checkResumeScope fails closed with ff3_resume_scope_mismatch and the authorization is
// NOT consumed (the owner sees a soft error; the broker's authorization survives for a legitimate later attempt).
//
// Consumption (one-shot) and persistence are the caller's job (the resume endpoint); this module never touches
// I/O. It only (a) hashes the note, (b) assembles the object, (c) compares an object to live state.

import { createHash } from 'node:crypto';

/** Soft error codes surfaced by the resume seam (ruling §Gap-A). Not owner-facing prose. */
export const FF3_RESUME_SCOPE_MISMATCH = 'ff3_resume_scope_mismatch' as const;
export const FF3_RESUME_ALREADY_CONSUMED = 'ff3_resume_already_consumed' as const;

/** The scoped authorization object persisted to chat_sessions.broker_resume_authorization (jsonb). */
export interface ResumeAuthorization {
  session_id: string;
  /** Notice figure in dollars (chat_sessions.amount_of_rent_owed, numeric(10,2)). */
  notice_amount: number;
  /** Rent-ledger baseline the reconciliation compared against (sum of covered rent_periods amounts). */
  ledger_total: number;
  /** Identity of the covered ledger period(s) — a stable key so a changed ledger invalidates the authorization. */
  ledger_period: string;
  broker_email: string;
  /** sha256(broker_resolution_note) — a note edit invalidates the authorization. */
  resolution_note_hash: string;
  authorized_at: string;
}

/** Live session state the authorization is re-checked against at Continue time. */
export interface ResumeLiveState {
  session_id: string;
  notice_amount: number | null | undefined;
  ledger_total: number | null | undefined;
  ledger_period: string | null | undefined;
  resolution_note_hash: string;
}

export interface ScopeCheckResult {
  ok: boolean;
  /** Populated on failure — the first field that diverged (for the audit log / soft-error detail). */
  reason?: string;
  divergedField?: string;
}

/** A captured rent period carrying its covered dates (Lane-2E shape). */
export interface DatedPeriod {
  periodStartDate?: string | null;
  periodEndDate?: string | null;
}

/**
 * Stable, order-independent identity of the covered ledger period(s). Bound into the authorization so a re-scoped
 * ledger (periods added/removed/shifted) invalidates a prior broker authorization even if the summed total is
 * unchanged. Computed identically at resolve time and produce-consume time from intake_state.rent_periods.
 */
export function ledgerPeriodKey(periods: DatedPeriod[] | null | undefined): string {
  if (!Array.isArray(periods) || periods.length === 0) return '';
  return periods
    .map((p) => `${p.periodStartDate ?? ''}:${p.periodEndDate ?? ''}`)
    .sort()
    .join(',');
}

/** sha256 hex of the exact broker note bytes (utf-8). Same primitive the locked-prose guard uses. */
export function resolutionNoteHash(note: string): string {
  return createHash('sha256').update(note, 'utf8').digest('hex');
}

/** Assemble the scoped authorization object at resolve time (server-derived; no defaulting). */
export function buildResumeAuthorization(params: {
  sessionId: string;
  noticeAmount: number;
  ledgerTotal: number;
  ledgerPeriod: string;
  brokerEmail: string;
  resolutionNote: string;
  authorizedAt?: string;
}): ResumeAuthorization {
  return {
    session_id: params.sessionId,
    notice_amount: params.noticeAmount,
    ledger_total: params.ledgerTotal,
    ledger_period: params.ledgerPeriod,
    broker_email: params.brokerEmail,
    resolution_note_hash: resolutionNoteHash(params.resolutionNote),
    authorized_at: params.authorizedAt ?? new Date().toISOString(),
  };
}

/** Exact-equality money compare on numeric(10,2) values (2-dp rounding guards float noise). */
function sameMoney(a: number, b: number | null | undefined): boolean {
  if (b == null) return false;
  return Math.round(a * 100) === Math.round(b * 100);
}

/**
 * Fail-closed scope check: the stored authorization must match live session state on every bound field. Any
 * divergence → { ok: false, reason: FF3_RESUME_SCOPE_MISMATCH, divergedField }. The caller must NOT consume the
 * authorization on failure.
 */
export function checkResumeScope(auth: ResumeAuthorization, live: ResumeLiveState): ScopeCheckResult {
  const fail = (field: string): ScopeCheckResult => ({ ok: false, reason: FF3_RESUME_SCOPE_MISMATCH, divergedField: field });

  if (auth.session_id !== live.session_id) return fail('session_id');
  if (!sameMoney(auth.notice_amount, live.notice_amount)) return fail('notice_amount');
  if (!sameMoney(auth.ledger_total, live.ledger_total)) return fail('ledger_total');
  if (auth.ledger_period !== (live.ledger_period ?? null)) return fail('ledger_period');
  if (auth.resolution_note_hash !== live.resolution_note_hash) return fail('resolution_note_hash');
  return { ok: true };
}
