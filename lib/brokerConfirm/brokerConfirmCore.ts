/**
 * Broker-confirm path — pure, testable core (Decision 2).
 *
 * Governing rulings:
 *  - county_parcel_lookup_method_broker_ruling_2026-06-28 §2 (manual broker-confirm path)
 *  - decision2_broker_confirm_path_design_broker_ruling_2026-06-28
 *      Decision A (token + optional email identity), Decision B (eligible set),
 *      Decision C (24h SLA + ≤2 notifications), §5 (audit codes), §1.4 (pending UI).
 *
 * Pure logic only — no DB, no network, no Supabase. The migration, routes, and cron
 * are thin wrappers around these functions (matches the resolver/adapter pattern).
 *
 * Two engineering interpretations flagged to the broker (faithful to the ruling's
 * spirit, surfaced per §8 "surface any §0 fork I haven't anticipated"):
 *  - [FLAG-1] ZIMAS-class eligibility: the ruling §3.3 lists zimas_miss/timeout/error
 *    as eligible, but the resolver maps ALL ZIMAS non-confirm outcomes to the
 *    reviewReason `parcel_lookup_inconclusive` (the ZIMAS branch/failureMode is kept
 *    on the linked geocode_audit_log row). Eligibility is therefore keyed on
 *    reviewReason, and `parcel_lookup_inconclusive` SUBSUMES the ZIMAS dead-ends.
 *  - [FLAG-2] Token storage: §2.3.4 contemplates hash-and-store; we store ONLY the
 *    SHA-256 hash of the opaque token (`requester_token_hash`), never the raw token.
 *    The client holds the raw token; poll sends it; the server hashes + looks up.
 */
import { createHash, randomBytes } from 'node:crypto';

// ---- Decision B — eligible escalation set (reviewReason granularity) -----------
export const BROKER_CONFIRM_ELIGIBLE_REASONS: ReadonlySet<string> = new Set([
  'parcel_lookup_inconclusive', // subsumes zimas_miss / zimas_timeout / zimas_error [FLAG-1]
  'county_situs_gap',
  'county_ambiguous',
]);

/** True only for a manual_review with an eligible jurisdiction-inconclusive reason.
 *  Excludes confirmed_la, not_la, input_corrected, and address-quality reasons
 *  (no_locality / coarse_granularity) per Decision B §3.1/§3.2. */
export function isEscalationEligible(
  priorDisposition: string,
  priorReviewReason: string | null,
): boolean {
  return (
    priorDisposition === 'manual_review' &&
    priorReviewReason !== null &&
    BROKER_CONFIRM_ELIGIBLE_REASONS.has(priorReviewReason)
  );
}

// ---- Lifecycle status model ---------------------------------------------------
export type BrokerConfirmStatus =
  | 'pending'
  | 'confirmed'
  | 'denied'
  | 'inconclusive'
  | 'cancelled'
  | 'expired';

/** Broker attestation outcome (§2.2 + §5 manual_broker_inconclusive). */
export type BrokerConfirmOutcome = 'confirmed_la' | 'denied_la' | 'inconclusive';

const TERMINAL: ReadonlySet<BrokerConfirmStatus> = new Set([
  'confirmed', 'denied', 'inconclusive', 'cancelled', 'expired',
]);
export function isTerminal(s: BrokerConfirmStatus): boolean {
  return TERMINAL.has(s);
}

/** Transitions are only ever FROM pending; terminal states are final. */
export function canTransition(from: BrokerConfirmStatus, to: BrokerConfirmStatus): boolean {
  if (from !== 'pending') return false;
  return to !== 'pending' && (TERMINAL.has(to));
}

/** Broker resolution outcome → terminal status. */
export function outcomeToStatus(outcome: BrokerConfirmOutcome): BrokerConfirmStatus {
  switch (outcome) {
    case 'confirmed_la': return 'confirmed';
    case 'denied_la': return 'denied';
    case 'inconclusive': return 'inconclusive';
  }
}

/** §5 audit code for each status. */
export const BROKER_CONFIRM_AUDIT_CODE: Record<BrokerConfirmStatus, string> = {
  pending: 'manual_broker_pending',
  confirmed: 'manual_broker_confirmed_la',
  denied: 'manual_broker_denied_la',
  inconclusive: 'manual_broker_inconclusive',
  cancelled: 'manual_broker_cancelled',
  expired: 'manual_broker_expired',
};

// ---- Decision C — SLA + notification schedule ---------------------------------
export const SLA_WINDOW_MS = 24 * 60 * 60 * 1000; // SYNC-WITH(SLA_CONSTANTS): sla_window_ms (core-only; not in Edge)
export const NOTIFY_WARNING_LEAD_MS = 60 * 60 * 1000; // SYNC-WITH(SLA_CONSTANTS): warning_lead_ms

export function slaDueAt(createdAtIso: string): string {
  return new Date(new Date(createdAtIso).getTime() + SLA_WINDOW_MS).toISOString();
}

/** A pending request is breached once now ≥ sla_due_at (§4.1). */
export function isSlaBreached(
  nowIso: string,
  slaDueAtIso: string,
  status: BrokerConfirmStatus,
): boolean {
  return status === 'pending' && new Date(nowIso).getTime() >= new Date(slaDueAtIso).getTime();
}

export type NotifyKind = 'warning' | 'breach' | null;

/** Which notification (if any) is due now, respecting the ≤2-notifications cap
 *  (§4.2.2): one 'warning' at due−1h, one 'breach' at due, each at most once. */
export function dueNotification(
  nowIso: string,
  slaDueAtIso: string,
  status: BrokerConfirmStatus,
  alreadySent: Iterable<Exclude<NotifyKind, null>>,
): NotifyKind {
  if (status !== 'pending') return null;
  const now = new Date(nowIso).getTime();
  const due = new Date(slaDueAtIso).getTime();
  const sent = new Set(alreadySent);
  if (now >= due) return sent.has('breach') ? null : 'breach';
  if (now >= due - NOTIFY_WARNING_LEAD_MS) return sent.has('warning') ? null : 'warning';
  return null;
}

/** Notifications fire only when the owner supplied an email (§4.2.4). */
export function shouldNotify(kind: NotifyKind, requesterContact: string | null): boolean {
  return kind !== null && !!requesterContact && requesterContact.trim() !== '';
}

// ---- Decision A — opaque token (hash-and-store) -------------------------------
/** 256-bit random hex (exceeds the §2.3.4 128-bit minimum; UUIDv4 was the floor). */
export function generateRequesterToken(): string {
  return randomBytes(32).toString('hex');
}
/** SHA-256 of the raw token — the ONLY thing persisted server-side [FLAG-2]. */
export function hashRequesterToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ---- Decision A §2.3.5 — requester_contact 90-day post-resolution purge -------
export const CONTACT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // SYNC-WITH(SLA_CONSTANTS): contact_retention_ms

/** True when an email should be nullified: present, request resolved/cancelled,
 *  and ≥90 days since that anchor. address_input is NOT subject to this (§2.3.6). */
export function contactPurgeDue(
  nowIso: string,
  resolvedAtIso: string | null,
  cancelledAtIso: string | null,
  contact: string | null,
): boolean {
  if (!contact) return false;
  const anchor = resolvedAtIso ?? cancelledAtIso;
  if (!anchor) return false;
  return new Date(nowIso).getTime() >= new Date(anchor).getTime() + CONTACT_RETENTION_MS;
}
