// lib/produce/__tests__/packetVerification.test.ts
// Lane P2 — packet authenticity token (ruling Item 3): sign/verify round-trip, tamper + expiry, PII-free view,
// 90-day TTL, packet_type claim, /verify URL.

import {
  signPacketToken, verifyPacketToken, authenticityView, packetVerifyUrl, PACKET_VERIFY_TTL_DAYS,
} from '../packetVerification';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const SECRET = 'test-secret-abc';
const NOW = new Date('2026-07-04T12:00:00Z');
const claims = { manifestHash: 'a'.repeat(64), generatedAt: '2026-07-04T11:59:00Z', packetType: '3day_packet' };

// round-trip
const tok = signPacketToken(claims, { secret: SECRET, now: NOW });
const r = verifyPacketToken(tok, { secret: SECRET, now: NOW });
check('valid token round-trips', r.valid === true && r.valid && r.claims.manifestHash === claims.manifestHash);
check('claims carry ONLY {manifestHash, generatedAt, packetType} (no PII)', r.valid && Object.keys(r.claims).sort().join(',') === 'generatedAt,manifestHash,packetType');

// tamper / forgery
check('tampered signature → bad_signature', verifyPacketToken(tok.slice(0, -2) + 'zz', { secret: SECRET, now: NOW }).valid === false);
check('wrong secret → bad_signature', verifyPacketToken(tok, { secret: 'other', now: NOW }).valid === false);
{
  const body = tok.split('.')[0];
  const dec = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  dec.manifestHash = 'b'.repeat(64);
  const forgedBody = Buffer.from(JSON.stringify(dec)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  check('forged payload (changed hash, old sig) → bad_signature', verifyPacketToken(`${forgedBody}.${tok.split('.')[1]}`, { secret: SECRET, now: NOW }).valid === false);
}

// 90-day expiry
check('TTL is 90 days', PACKET_VERIFY_TTL_DAYS === 90);
{
  const past = new Date(NOW.getTime() + (PACKET_VERIFY_TTL_DAYS + 1) * 86400 * 1000);
  const pr = verifyPacketToken(tok, { secret: SECRET, now: past });
  check('expired past 90 days → expired', pr.valid === false && pr.reason === 'expired');
  const inside = new Date(NOW.getTime() + (PACKET_VERIFY_TTL_DAYS - 1) * 86400 * 1000);
  check('valid at day 89', verifyPacketToken(tok, { secret: SECRET, now: inside }).valid === true);
}

// malformed
check('malformed → malformed', verifyPacketToken('garbage', { secret: SECRET, now: NOW }).valid === false);

// PII-free view
{
  const v = authenticityView(claims);
  check('view exposes only hash + time + type + note', Object.keys(v).sort().join(',') === 'generatedAt,manifestHash,note,packetType,verified');
  check('view carries no name/address/amount', !/name|address|tenant|amount|owed/i.test(v.note));
  check('view states not legal service', v.note.includes('not legal service'));
}

// verify URL
check('packetVerifyUrl builds /verify/<token>', packetVerifyUrl('TOK') === 'https://ownerpilot.ai/verify/TOK');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nP2 packet verification (90-day, packet_type): all passed');
