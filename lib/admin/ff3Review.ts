// lib/admin/ff3Review.ts
// FF-3 Block B — data layer for the /admin/ff3-review resolution surface.
// Authority: ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11 §1, §3, §4.
// Server-only (service-role client). No owner PII on the list (ruling §3) — only session id + gap + timestamp.

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildResumeAuthorization, ledgerPeriodKey, type DatedPeriod } from '@/lib/intake/ff3ResumeAuthorization';
import { sumLedger } from '@/lib/intake/ff3AmountReconcile';
import { ff3RentPeriodsFromSession } from '@/lib/intake/ff3ProduceGate';

/** State predicate (ruling §1, option (b) tightened): note-nullability IS the awaiting-review transition. */
export const AWAITING_REVIEW = {
  reconciliation_resolution: 'broker_review',
} as const;

export interface AwaitingReviewRow {
  session_id: string;
  reconciliation_resolved_at: string | null;
  /** Reconciliation gap surfaced from the ff3_amount_reconciliation compliance_gates row (no owner PII). */
  notice_amount: number | null;
  ledger_total: number | null;
}

/** Load sessions awaiting broker review (oldest first), each with its reconciliation gap. */
export async function loadAwaitingReview(sb: SupabaseClient): Promise<AwaitingReviewRow[]> {
  const { data: sessions } = await sb
    .from('chat_sessions')
    .select('id, reconciliation_resolved_at')
    .eq('reconciliation_resolution', AWAITING_REVIEW.reconciliation_resolution)
    .not('reconciliation_resolved_at', 'is', null)
    .is('broker_resolution_note', null)
    .order('reconciliation_resolved_at', { ascending: true });
  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id as string);
  const { data: gates } = await sb
    .from('compliance_gates')
    .select('chat_session_id, context_json, evaluated_at')
    .in('chat_session_id', ids)
    .eq('gate', 'ff3_amount_reconciliation')
    .order('evaluated_at', { ascending: false });

  const latestBySession = new Map<string, Record<string, unknown>>();
  for (const g of gates ?? []) {
    const sid = g.chat_session_id as string;
    if (!latestBySession.has(sid)) latestBySession.set(sid, (g.context_json ?? {}) as Record<string, unknown>);
  }

  return sessions.map((s) => {
    const ctx = latestBySession.get(s.id as string) ?? {};
    return {
      session_id: s.id as string,
      reconciliation_resolved_at: (s.reconciliation_resolved_at as string | null) ?? null,
      notice_amount: (ctx.noticeAmount as number | null) ?? null,
      ledger_total: (ctx.ledgerTotal as number | null) ?? null,
    };
  });
}

/** On-demand transcript for one awaiting session (the ruling §3 "deep link to full transcript" — PII lives here,
 *  never on the summary list). Returns null if the session isn't awaiting review. */
export async function loadSessionTranscript(sb: SupabaseClient, sessionId: string): Promise<unknown[] | null> {
  const { data } = await sb
    .from('chat_sessions')
    .select('transcript')
    .eq('id', sessionId)
    .eq('reconciliation_resolution', AWAITING_REVIEW.reconciliation_resolution)
    .is('broker_resolution_note', null)
    .maybeSingle();
  if (!data) return null;
  return (data.transcript as unknown[] | null) ?? [];
}

export interface ResolveResult {
  ok: boolean;
  error?: string;
  /** rows affected — 0 means the session wasn't in the awaiting set (already resolved / not escalated). */
  affected: number;
}

/**
 * Resolve an awaiting session: write the broker note (owner-facing verbatim), resolved-at, and reviewer email.
 * Guarded so it only mutates sessions still in the awaiting set — enforces "no edit-after-resolve" (ruling excludes
 * it): the broker_resolution_note IS NULL predicate means a second resolve is a no-op. Owner-driven resume only;
 * this does NOT notify (no push/email/SMS) or auto-resume (Decision 2).
 */
export async function resolveAwaitingReview(
  sb: SupabaseClient,
  sessionId: string,
  brokerResolutionNote: string,
  reviewerEmail: string,
): Promise<ResolveResult> {
  const now = new Date().toISOString();

  // PR B-server-resume (omnibus §2): derive the scoped, one-shot resume authorization SERVER-SIDE from existing
  // session state (no admin UI change). Bound to notice_amount + ledger_total + ledger_period + note hash so the
  // broker authorizes THIS specific mismatch on THIS session. Written in the same guarded update as the note.
  const { data: sess } = await sb
    .from('chat_sessions')
    .select('amount_of_rent_owed, intake_state')
    .eq('id', sessionId)
    .maybeSingle();
  const periods = ff3RentPeriodsFromSession(sess as { intake_state?: Record<string, { value?: unknown } | undefined> } | null);
  const authorization = buildResumeAuthorization({
    sessionId,
    noticeAmount: Number((sess as { amount_of_rent_owed?: number | null } | null)?.amount_of_rent_owed ?? 0),
    ledgerTotal: sumLedger(periods) ?? 0,
    ledgerPeriod: ledgerPeriodKey(periods as DatedPeriod[] | null),
    brokerEmail: reviewerEmail,
    resolutionNote: brokerResolutionNote,
    authorizedAt: now,
  });

  const { data, error } = await sb
    .from('chat_sessions')
    .update({
      broker_resolution_note: brokerResolutionNote,
      broker_resolution_resolved_at: now,
      broker_resolution_reviewer_email: reviewerEmail,
      broker_resume_authorization: authorization,
    })
    .eq('id', sessionId)
    .eq('reconciliation_resolution', AWAITING_REVIEW.reconciliation_resolution)
    .not('reconciliation_resolved_at', 'is', null)
    .is('broker_resolution_note', null)
    .select('id');
  if (error) return { ok: false, error: error.message, affected: 0 };
  return { ok: true, affected: data?.length ?? 0 };
}
