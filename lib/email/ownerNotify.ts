// lib/email/ownerNotify.ts
// Part B-2 of p1_email_trigger_dependencies_broker_ruling_2026-07-05 (B2). Owner-facing transactional-email
// safeguards for the LAHD-confirmation send: a narrowly-scoped account-email lookup (with access logging), the
// per-notification-type suppression check, and the pure send-decision. Everything the send path needs to decide
// whether an owner-facing email may go out.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Notification types that flow through the owner-facing email safeguards. */
export type OwnerNotificationType = 'lahd-confirmation';

export interface OwnerNotifyContext {
  email: string;
  /** Consent gate: null until the owner has authorized owner-facing filing-record emails (B2 safeguard 1). */
  ackAt: string | null;
}

/**
 * Narrowly-scoped owner-email lookup (B2). Returns ONLY the account email + the consent timestamp — never the
 * full user record — from public.users (email lives there directly; no auth-admin needed). Least-privilege per
 * the ruling. Every call is access-logged (path + user_id + timestamp, NEVER the email) to the audit sink so a
 * "which user records were read for which sends" reconstruction is possible.
 */
export async function getOwnerNotifyContext(
  sb: SupabaseClient,
  userId: string,
  callerPath: string,
): Promise<OwnerNotifyContext | null> {
  console.info(JSON.stringify({ evt: 'owner_email.lookup', path: callerPath, user_id: userId, at: new Date().toISOString() }));
  const { data, error } = await sb
    .from('users')
    .select('email, email_notifications_ack_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data || !data.email) return null;
  return { email: data.email as string, ackAt: (data.email_notifications_ack_at as string | null) ?? null };
}

/**
 * Suppression check (B2 safeguard 3). True if the owner has any suppression row for this notification type or the
 * catch-all 'all' (opt-out, hard bounce, or spam complaint). Fail-closed: on query error, treat as suppressed
 * (do not send) so a transient DB failure never results in an un-consented/opted-out send.
 */
export async function isOwnerSuppressed(
  sb: SupabaseClient,
  userId: string,
  notificationType: OwnerNotificationType,
): Promise<boolean> {
  const { data, error } = await sb
    .from('email_notification_suppressions')
    .select('id')
    .eq('user_id', userId)
    .in('notification_type', [notificationType, 'all'])
    .limit(1);
  if (error) return true; // fail-closed
  return (data?.length ?? 0) > 0;
}

export interface LahdConfirmationSendDecision {
  send: boolean;
  reason: 'send' | 'no_confirmation_ref' | 'no_consent' | 'suppressed' | 'already_sent';
}

/**
 * Pure send-decision for the LAHD-confirmation email. Send only when: a confirmation reference exists, the owner
 * has consented, they are not suppressed, and no email has already gone out for this filing (idempotency). Order
 * matters only for the reason label; any failing condition blocks the send.
 */
export function decideLahdConfirmationSend(input: {
  confirmationRef: string | null | undefined;
  ackAt: string | null;
  suppressed: boolean;
  alreadySent: boolean;
}): LahdConfirmationSendDecision {
  if (!input.confirmationRef || !input.confirmationRef.trim()) return { send: false, reason: 'no_confirmation_ref' };
  if (input.alreadySent) return { send: false, reason: 'already_sent' };
  if (!input.ackAt) return { send: false, reason: 'no_consent' };
  if (input.suppressed) return { send: false, reason: 'suppressed' };
  return { send: true, reason: 'send' };
}
