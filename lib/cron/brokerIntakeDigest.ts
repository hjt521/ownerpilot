// lib/cron/brokerIntakeDigest.ts
// Part A of p1_email_trigger_dependencies_broker_ruling_2026-07-05 — pure decision logic for the
// broker-intake-digest cron. Kept side-effect-free so the dark-until-FF-3 posture (A3) is unit-testable
// without touching Supabase or Resend.
//
// Dark-until-FF-3 posture (ruling A3): the digest sends ONLY when there is a configured recipient AND at
// least one intake sits in the awaiting-review state. FF-3 is dark (FF3_CAPTURE_ENABLED off) under
// omnibus_broker_ruling_2026-07-04 guardrail 2, so `awaiting_broker_review` rows cannot exist yet — which
// means this cron is live-but-idle until FF-3 is separately authorized to flip. No code deploy or ruling
// coordination gap when that happens: the digest simply starts firing.

/** The single `ff3_capture_status` value that parks an intake for broker review (migration 043). */
export const AWAITING_REVIEW_STATUS = 'awaiting_broker_review';

export interface DigestDecision {
  action: 'send' | 'skip';
  /** unconfigured = no BROKER_REVIEW_EMAIL (pre-provisioning dark); empty_queue = count 0 (dark until FF-3);
   *  queue_nonempty = send. */
  reason: 'unconfigured' | 'empty_queue' | 'queue_nonempty';
}

/**
 * Decide whether the digest should send. Send only when a recipient is configured AND the awaiting-review
 * count is positive. Everything else is a silent skip (the ruled dark behavior).
 */
export function decideDigestSend(count: number, recipient: string | undefined | null): DigestDecision {
  const to = (recipient ?? '').trim();
  if (!to) return { action: 'skip', reason: 'unconfigured' };
  if (!Number.isFinite(count) || count <= 0) return { action: 'skip', reason: 'empty_queue' };
  return { action: 'send', reason: 'queue_nonempty' };
}
