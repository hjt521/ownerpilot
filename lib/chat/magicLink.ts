// lib/chat/magicLink.ts
// AI-first /chat — magic-link claim tokens (G6: hash-stored, 30-min TTL, single-use). Raw token only in the
// emailed URL; only the SHA-256 hash is stored (magic_link_tokens.token_hash).

import { createHash, randomBytes } from 'node:crypto';

export const MAGIC_TTL_MINUTES = 30;

export function generateMagicToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashMagicToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function magicExpiry(nowMs: number = Date.now()): string {
  return new Date(nowMs + MAGIC_TTL_MINUTES * 60_000).toISOString();
}

export interface MagicTokenRow {
  expires_at: string;
  consumed_at: string | null;
  chat_session_id: string | null;
  email: string;
  purpose: 'claim_session' | 'save_to_riskpath';
}

export type MagicReason = 'not_found' | 'consumed' | 'expired';

/** Pure: is this token redeemable now? Single-use + TTL enforced. */
export function evaluateMagicToken(row: MagicTokenRow | null, nowMs: number = Date.now()):
  { valid: boolean; reason?: MagicReason } {
  if (!row) return { valid: false, reason: 'not_found' };
  if (row.consumed_at) return { valid: false, reason: 'consumed' };
  if (new Date(row.expires_at).getTime() < nowMs) return { valid: false, reason: 'expired' };
  return { valid: true };
}
