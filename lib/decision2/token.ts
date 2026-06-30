// lib/decision2/token.ts
// Lane 5 Decision 2 — opaque request token. Raw token is returned to the owner + used in the status URL;
// only the SHA-256 hash is ever stored (master prompt §4.1 steps 2-3). NEVER log the raw token.

import { randomBytes, createHash } from 'node:crypto';

/** 32 random bytes hex (64 chars). Returned to the owner once; never persisted raw. */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hex of the raw token — this is what lands in requester_token_hash. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
