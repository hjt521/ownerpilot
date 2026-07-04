// lib/produce/packetVerification.ts
// Lane P2 — packet authenticity verification (QR target), PII-safe core.
// Source: BROKER STANDING ORDER — Productization 2026-07-03 §2 P2.
//
// The cover page carries a QR that resolves to a short-lived signed URL a filing clerk can scan to confirm the
// packet is authentic. This module is the PII-SAFE core: it mints + verifies a stateless HMAC token that binds
// ONLY {packetId, manifestHash, generatedAt, exp} — NO tenant name/address/amount. The authenticity view shows
// the manifest hash + generation time + "verified" — never the packet contents (see the §4.4 fork in the P2
// attestation: what the scanned URL displays + its auth model is a broker privacy decision, held).
//
// §1162 note: the QR/verification link is NOT service and goes on the cover page ONLY, never on the 3-day notice
// itself (standing order §2 P2). This module encodes an authenticity check, not a servable document.
//
// Stateless HMAC (node:crypto) — no new dependency, no DB row. Secret from PACKET_VERIFY_SECRET.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET_ENV = 'PACKET_VERIFY_SECRET';
/** Default validity window for a scanned authenticity link (hours). Short-lived by design. */
export const PACKET_VERIFY_TTL_HOURS = 72;

/** The minimal, PII-FREE claims bound into the token. */
export interface PacketVerifyClaims {
  packetId: string;      // opaque packet/artifact id — not a person
  manifestHash: string;  // the packet manifest SHA-256 (authenticity anchor)
  generatedAt: string;   // ISO-8601 packet generation time
}

interface SignedPayload extends PacketVerifyClaims {
  exp: number;           // unix seconds
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj: unknown): string {
  return b64url(Buffer.from(JSON.stringify(obj), 'utf8'));
}
function hmac(data: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(data).digest());
}

function requireSecret(secret?: string): string {
  const s = secret ?? process.env[SECRET_ENV];
  if (!s) throw new Error(`${SECRET_ENV} not set — cannot sign/verify packet authenticity tokens`);
  return s;
}

/** Mint a stateless authenticity token: `<payload>.<hmac>`. `now`/`secret` injectable for tests. */
export function signPacketToken(
  claims: PacketVerifyClaims,
  opts?: { secret?: string; now?: Date; ttlHours?: number },
): string {
  const secret = requireSecret(opts?.secret);
  const now = opts?.now ?? new Date();
  const exp = Math.floor(now.getTime() / 1000) + (opts?.ttlHours ?? PACKET_VERIFY_TTL_HOURS) * 3600;
  const payload: SignedPayload = { ...claims, exp };
  const body = b64urlJson(payload);
  return `${body}.${hmac(body, secret)}`;
}

export type PacketVerifyResult =
  | { valid: true; claims: PacketVerifyClaims; exp: number }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** Verify a token: signature (constant-time) then expiry. Returns the PII-free claims on success. */
export function verifyPacketToken(
  token: string,
  opts?: { secret?: string; now?: Date },
): PacketVerifyResult {
  const secret = requireSecret(opts?.secret);
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return { valid: false, reason: 'malformed' };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: 'bad_signature' };

  let payload: SignedPayload;
  try {
    payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch { return { valid: false, reason: 'malformed' }; }
  if (!payload || typeof payload.exp !== 'number' || !payload.manifestHash || !payload.packetId) {
    return { valid: false, reason: 'malformed' };
  }
  const nowSec = Math.floor((opts?.now ?? new Date()).getTime() / 1000);
  if (nowSec > payload.exp) return { valid: false, reason: 'expired' };
  return { valid: true, claims: { packetId: payload.packetId, manifestHash: payload.manifestHash, generatedAt: payload.generatedAt }, exp: payload.exp };
}

/** The PII-FREE authenticity view payload the scanned endpoint returns (engineer lean — see the §4.4 fork). */
export interface PacketAuthenticityView {
  verified: true;
  manifestHash: string;
  generatedAt: string;
  note: string;
}
export function authenticityView(claims: PacketVerifyClaims): PacketAuthenticityView {
  return {
    verified: true,
    manifestHash: claims.manifestHash,
    generatedAt: claims.generatedAt,
    note: 'This confirms the packet manifest hash matches an OwnerPilot-generated packet. It is not legal service and contains no personal information.',
  };
}
