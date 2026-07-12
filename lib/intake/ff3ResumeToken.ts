// lib/intake/ff3ResumeToken.ts
// FF-3 Block C server-resume — the one-shot continuation token minted by POST /api/chat/ff3/resume and consumed by
// the produce gate. Authority: ff3_gate4_omnibus_authorization_broker_signature_2026-07-12 §2.
//
// The token is defense-in-depth: it ties a scope-validated resume call to the immediately-following produce call so
// produce cannot be invoked directly to skip the reconciliation math. It is HMAC-signed with a DEDICATED secret
// (FF3_RESUME_SECRET — blast-radius isolation from BROKER_RESOLVE_SECRET, §2(b)) and short-TTL (5 min, §2 TTL).
//
// Binding fields (payload): session_id + authorized_at + note_hash. verifyResumeToken re-derives the MAC and checks
// expiry; the CALLER additionally re-checks these fields against the live authorization (so a token minted for one
// authorization can't be replayed after a re-resolve changes the note). Consumption (one-shot) is stamped by the
// produce gate at consume time (§2(a) produce-consume), never here — this module is pure/I-O-free.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const FF3_RESUME_TOKEN_TTL_SEC = 300; // 5 minutes (omnibus §2 TTL)

export interface ResumeTokenPayload {
  session_id: string;
  authorized_at: string;
  note_hash: string;
  /** Unix seconds expiry. */
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function mac(secret: string, body: string): Buffer {
  return createHmac('sha256', secret).update(body, 'utf8').digest();
}

/** Mint a signed one-shot resume token. `nowMs`/`ttlSec` injectable for deterministic tests. */
export function mintResumeToken(
  secret: string,
  fields: { sessionId: string; authorizedAt: string; noteHash: string },
  nowMs: number = Date.now(),
  ttlSec: number = FF3_RESUME_TOKEN_TTL_SEC,
): string {
  const payload: ResumeTokenPayload = {
    session_id: fields.sessionId,
    authorized_at: fields.authorizedAt,
    note_hash: fields.noteHash,
    exp: Math.floor(nowMs / 1000) + ttlSec,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(mac(secret, body));
  return `${body}.${sig}`;
}

export type ResumeTokenVerify =
  | { ok: true; payload: ResumeTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** Verify signature + expiry. Does NOT check scope against live state — the caller does that (fail-closed). */
export function verifyResumeToken(secret: string, token: string, nowMs: number = Date.now()): ResumeTokenVerify {
  if (typeof token !== 'string' || !token.includes('.')) return { ok: false, reason: 'malformed' };
  const [body, sig] = token.split('.');
  if (!body || !sig) return { ok: false, reason: 'malformed' };

  const expected = mac(secret, body);
  const got = fromB64url(sig);
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return { ok: false, reason: 'bad_signature' };

  let payload: ResumeTokenPayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as ResumeTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload.exp !== 'number' || Math.floor(nowMs / 1000) > payload.exp) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
