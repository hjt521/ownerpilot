// lib/produce/packetVerification.ts
// Lane P2 — packet authenticity verification (QR target), PII-safe core.
// Source: BROKER STANDING ORDER 2026-07-03 §2 P2 + RULING omnibus_broker_ruling_2026-07-04 Item 3
//   (ADOPT authenticity-only via signed token, no login, no tenant PII; HMAC-SHA256 over
//    {manifest_hash, generation_ts, packet_type, expiry_ts}; 90-day expiry; /verify/<token>).
//
// The cover page carries a QR resolving to a public verification page that answers exactly one question — is this
// packet cover authentic and unaltered? It shows the manifest hash, generation time, and packet type. NO tenant
// name/address/amount, NO login. §1162: the QR/link is NOT service and goes on the cover page ONLY.
//
// Stateless HMAC (node:crypto) — no dependency, no DB row. Secret from PACKET_VERIFY_SECRET.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET_ENV = 'PACKET_VERIFY_SECRET';
/** Token validity, in days (ruling Item 3: 90 days — survives a typical eviction timeline, limits stale-URL exposure). */
export const PACKET_VERIFY_TTL_DAYS = 90;

/** The minimal, PII-FREE claims bound into the token (ruling Item 3 payload). */
export interface PacketVerifyClaims {
  manifestHash: string;  // packet manifest SHA-256 (authenticity anchor)
  generatedAt: string;   // ISO-8601 packet generation time
  packetType: string;    // e.g. '3day_packet' | 'lahd_filing' — describes the artifact, not a person
}

interface SignedPayload extends PacketVerifyClaims {
  exp: number;           // unix seconds (expiry_ts)
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  opts?: { secret?: string; now?: Date; ttlDays?: number },
): string {
  const secret = requireSecret(opts?.secret);
  const now = opts?.now ?? new Date();
  const exp = Math.floor(now.getTime() / 1000) + (opts?.ttlDays ?? PACKET_VERIFY_TTL_DAYS) * 86400;
  const payload: SignedPayload = { ...claims, exp };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${hmac(body, secret)}`;
}

export type PacketVerifyResult =
  | { valid: true; claims: PacketVerifyClaims; exp: number }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** Verify a token: signature (constant-time) then expiry. Returns the PII-free claims on success. */
export function verifyPacketToken(token: string, opts?: { secret?: string; now?: Date }): PacketVerifyResult {
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
  if (!payload || typeof payload.exp !== 'number' || !payload.manifestHash || !payload.packetType) {
    return { valid: false, reason: 'malformed' };
  }
  const nowSec = Math.floor((opts?.now ?? new Date()).getTime() / 1000);
  if (nowSec > payload.exp) return { valid: false, reason: 'expired' };
  return {
    valid: true,
    claims: { manifestHash: payload.manifestHash, generatedAt: payload.generatedAt, packetType: payload.packetType },
    exp: payload.exp,
  };
}

/** The PII-FREE authenticity view the /verify page returns (ruling Item 3 approved contents — exhaustive). */
export interface PacketAuthenticityView {
  verified: true;
  manifestHash: string;
  generatedAt: string;
  packetType: string;
  note: string;
}
export function authenticityView(claims: PacketVerifyClaims): PacketAuthenticityView {
  return {
    verified: true,
    manifestHash: claims.manifestHash,
    generatedAt: claims.generatedAt,
    packetType: claims.packetType,
    note: 'This confirms the packet cover hash matches an OwnerPilot-generated packet. It is not legal service and contains no personal information.',
  };
}

/** Build the public verification URL a QR encodes. */
export function packetVerifyUrl(token: string, baseUrl = 'https://ownerpilot.ai'): string {
  return `${baseUrl}/verify/${token}`;
}
