// lib/beta/__tests__/allowlist.test.ts
// Fork B2 — the closed-beta allowlist gates by email, is case/space-insensitive, defaults closed, and BETA_OPEN
// opens the gate. Self-executing.

import { isBetaAllowlisted } from '../allowlist';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}
const OLD = { BETA_ALLOWLIST: process.env.BETA_ALLOWLIST, BETA_OPEN: process.env.BETA_OPEN };

process.env.BETA_OPEN = '';
process.env.BETA_ALLOWLIST = 'a@x.com, Owner@Example.COM';
check('allowlisted email passes', isBetaAllowlisted('a@x.com'));
check('case + space insensitive', isBetaAllowlisted('  owner@example.com '));
check('non-listed email blocked', !isBetaAllowlisted('nope@x.com'));

process.env.BETA_ALLOWLIST = '';
check('empty allowlist blocks all (closed default)', !isBetaAllowlisted('a@x.com'));

process.env.BETA_OPEN = 'true';
check('BETA_OPEN=true opens the gate', isBetaAllowlisted('anyone@x.com'));

process.env.BETA_ALLOWLIST = OLD.BETA_ALLOWLIST;
process.env.BETA_OPEN = OLD.BETA_OPEN;

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nbeta allowlist: all passed');
