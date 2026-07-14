// lib/chat/ff3ReplyFlag.ts
// Omnibus §3 row 1 — FF-3 reply-to-broker seam activation gate. The reply UI + endpoint are pre-staged in the tree
// but stay DARK until this flag is explicitly on. Default OFF in every environment — shipping the seam is a separate
// broker ruling + a flag flip, NOT a build. Mirrors lib/chat/ff3Flag.ts exactly.

/** True only when FF3_REPLY_TO_BROKER_ENABLED is explicitly set to '1' or 'true'. Off (false) by default everywhere. */
export function ff3ReplyToBrokerEnabled(): boolean {
  const v = (process.env.FF3_REPLY_TO_BROKER_ENABLED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}
