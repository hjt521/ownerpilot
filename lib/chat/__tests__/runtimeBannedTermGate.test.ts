// lib/chat/__tests__/runtimeBannedTermGate.test.ts
// Lane P4 Q3 — runtime banned-term output gate. Broker-required test categories: BLOCK, SCRUB, LOG-ONLY (n/a —
// no log_only entries configured; covered by the mechanism test), benign pass-through, and fail-closed.

import { runtimeBannedTermGate, SAFE_FALLBACK } from '../runtimeBannedTermGate';

let failed = 0;
const check = (n: string, c: boolean) => { c ? 0 : (failed++, console.error('FAIL:', n)); console.log((c ? 'ok - ' : 'XX - ') + n); };

// --- BLOCK: a legal-advice banned term discards the response → safe fallback ---
{
  const r = runtimeBannedTermGate('We can give you an official legal opinion on your case.');
  check('BLOCK: legal-advice term → action block', r.action === 'block');
  check('BLOCK: output is the safe fallback', r.output === SAFE_FALLBACK);
  check('BLOCK: original text NOT returned', !r.output.includes('official legal opinion'));
  check('BLOCK: match logged with excerpt', r.matches.length === 1 && r.matches[0].id === 'official-legal-opinion' && r.matches[0].excerpt.length > 0);
}

// --- SCRUB: CAR identifiers are redacted, rest of the response survives ---
{
  const r = runtimeBannedTermGate('Your lease appears to be a C.A.R. Form RLMM. The rent is $3,000 due on the first.');
  check('SCRUB: CAR identifiers → action scrub', r.action === 'scrub');
  check('SCRUB: CAR strings redacted', !r.output.includes('RLMM') && !r.output.includes('C.A.R. Form'));
  check('SCRUB: substantive analysis survives', r.output.includes('$3,000 due on the first'));
  check('SCRUB: redaction marker present', r.output.includes('[redacted]'));
  check('SCRUB: matches logged (no full text — excerpt only)', r.matches.every((m) => m.excerpt.length <= 200));
}

// --- paragraph-number pattern scrub ---
{
  const r = runtimeBannedTermGate('Your lease Paragraph 3B covers late fees.');
  check('SCRUB: CAR paragraph pattern → scrub', r.action === 'scrub' && r.output.includes('[redacted]') && !r.output.includes('Paragraph 3B'));
}

// --- benign: no banned terms → pass through unchanged ---
{
  const clean = 'Your rent is $3,000 and it is due on the first of the month. A studio counts as zero bedrooms.';
  const r = runtimeBannedTermGate(clean);
  check('PASS: benign response unchanged', r.action === 'pass' && r.output === clean && r.matches.length === 0);
}

// --- fail-closed: an input whose toString throws → block + safe fallback (never leak) ---
{
  const evil = { toString() { throw new Error('boom'); } } as unknown as string;
  const r = runtimeBannedTermGate(evil);
  check('FAIL-CLOSED: internal error → block + safe fallback', r.action === 'block' && r.output === SAFE_FALLBACK);
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nP4 Q3 runtime banned-term gate: all passed');
