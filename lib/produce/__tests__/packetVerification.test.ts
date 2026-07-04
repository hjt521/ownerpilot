// lib/produce/__tests__/packetVerification.test.ts
// Lane P2 — packet authenticity token: sign/verify round-trip, tamper + expiry rejection, PII-free view.

import {
  signPacketToken, verifyPacketToken, authenticityView, PACKET_VERIFY_TTL_HOURS,
} from '../packetVerification';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const SECRET = 'test-secret-abc';
const NOW = new Date('2026-07-03T12:00:00Z');
const claims = { packetId: 'pkt_123', manifestHash: 'a'.repeat(64), generatedAt: '2026-07-03T11:59:00Z' };

// round-trip
const tok = signPacketToken(claims, { secret: SECRET, now: NOW });
const r = verifyPacketToken(tok, { secret: SECRET, now: NOW });
check('valid token round-trips', r.valid === true && r.valid && r.claims.manifestHash === claims.manifestHash);
check('claims carry NO PII fields (only packetId/manifestHash/generatedAt)', r.valid && Object.keys(r.claims).sort().join(',') === 'generatedAt,manifestHash,packetId');

// tamper
const tampered = tok.slice(0, -2) + (tok.slice(-2) === 'aa' ? 'bb' : 'aa');
check('tampered signature → bad_signature', verifyPacketToken(tampered, { secret: SECRET, now: NOW }).valid === false);
check('wrong secret → bad_signature', verifyPacketToken(tok, { secret: 'other', now: NOW }).valid === false);

// payload tamper (swap manifestHash) → signature fails
{
  const body = tok.split('.')[0];
  const decoded = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  decoded.manifestHash = 'b'.repeat(64);
  const forgedBody = Buffer.from(JSON.stringify(decoded)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const forged = `${forgedBody}.${tok.split('.')[1]}`;
  check('forged payload (changed hash, kept old sig) → bad_signature', verifyPacketToken(forged, { secret: SECRET, now: NOW }).valid === false);
}

// expiry
{
  const past = new Date(NOW.getTime() + (PACKET_VERIFY_TTL_HOURS + 1) * 3600 * 1000);
  const pr = verifyPacketToken(tok, { secret: SECRET, now: past });
  check('expired token → expired', pr.valid === false && pr.reason === 'expired');
  const justInside = new Date(NOW.getTime() + (PACKET_VERIFY_TTL_HOURS - 1) * 3600 * 1000);
  check('token still valid just inside TTL', verifyPacketToken(tok, { secret: SECRET, now: justInside }).valid === true);
}

// malformed
check('malformed (no dot) → malformed', verifyPacketToken('garbage', { secret: SECRET, now: NOW }).valid === false);

// PII-free view
{
  const v = authenticityView(claims);
  check('authenticity view exposes only hash + time + note', Object.keys(v).sort().join(',') === 'generatedAt,manifestHash,note,verified');
  check('authenticity view carries no name/address/amount', !/name|address|tenant|amount|owed/i.test(JSON.stringify(v).replace('manifestHash','').replace('generatedAt','')));
  check('authenticity view states it is not legal service', v.note.includes('not legal service'));
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nP2 packet verification: all passed');
