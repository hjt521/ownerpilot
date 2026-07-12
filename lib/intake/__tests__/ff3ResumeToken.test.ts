// lib/intake/__tests__/ff3ResumeToken.test.ts
// FF-3 Block C server-resume — one-shot continuation token. Covers mint/verify round-trip, tamper, wrong secret,
// expiry, and malformed input. Deterministic via injected clock.

import { mintResumeToken, verifyResumeToken, FF3_RESUME_TOKEN_TTL_SEC } from '../ff3ResumeToken';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

const SECRET = 'preview-ff3-resume-secret';
const NOW = 1_770_000_000_000; // fixed ms
const fields = { sessionId: 'sid-1', authorizedAt: '2026-07-12T09:00:00.000Z', noteHash: 'abc123' };

const tok = mintResumeToken(SECRET, fields, NOW);

const ok = verifyResumeToken(SECRET, tok, NOW);
check('round-trip verifies', ok.ok === true);
check('payload binds session', ok.ok && ok.payload.session_id === 'sid-1');
check('payload binds authorized_at', ok.ok && ok.payload.authorized_at === fields.authorizedAt);
check('payload binds note_hash', ok.ok && ok.payload.note_hash === 'abc123');
check('exp is now + TTL', ok.ok && ok.payload.exp === Math.floor(NOW / 1000) + FF3_RESUME_TOKEN_TTL_SEC);

// wrong secret
const wrong = verifyResumeToken('different-secret', tok, NOW);
check('wrong secret → bad_signature', !wrong.ok && wrong.reason === 'bad_signature');

// tampered body
const [, sig] = tok.split('.');
const tampered = `${Buffer.from(JSON.stringify({ session_id: 'sid-2', authorized_at: fields.authorizedAt, note_hash: 'abc123', exp: Math.floor(NOW/1000)+300 })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}.${sig}`;
const t = verifyResumeToken(SECRET, tampered, NOW);
check('tampered body → bad_signature', !t.ok && t.reason === 'bad_signature');

// expired: verify one second past exp
const expired = verifyResumeToken(SECRET, tok, NOW + (FF3_RESUME_TOKEN_TTL_SEC + 1) * 1000);
check('past TTL → expired', !expired.ok && expired.reason === 'expired');

// still valid one second before exp
const stillOk = verifyResumeToken(SECRET, tok, NOW + (FF3_RESUME_TOKEN_TTL_SEC - 1) * 1000);
check('within TTL → ok', stillOk.ok === true);

// malformed
check('no dot → malformed', !verifyResumeToken(SECRET, 'garbage', NOW).ok);
check('empty → malformed', verifyResumeToken(SECRET, '', NOW).ok === false);

if (failed > 0) { console.error(`\n${failed} ff3ResumeToken check(s) FAILED`); process.exit(1); }
else { console.log('\nAll ff3ResumeToken checks passed.'); }
