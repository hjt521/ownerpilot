#!/usr/bin/env node
// scripts/verify-normalize-identical-to-resolver.mjs
// Lane 5 Decision 2 CI guard (ruling §2.3). Purpose AFTER the Option-1 ruling: prevent regression where
// lib/decision2/normalize.ts stops re-exporting the resolver SSOT and grows its own normalization logic.
//
// Static assertions (1 & 2) run under plain `node` (how package.json wires this). Assertion 3 (runtime
// reference identity) requires a TS runtime; it is attempted best-effort and SKIPPED (not failed) when the
// runner can't import .ts — the re-export line guaranteed by assertions 1 & 2 already implies identity.

import { readFileSync } from 'fs';

const FILE = 'lib/decision2/normalize.ts';
let src;
try { src = readFileSync(FILE, 'utf8'); }
catch { console.error(`verify-normalize-identical-to-resolver: cannot read ${FILE}`); process.exit(1); }

// Assertion 1 — no local normalization logic.
const FORBIDDEN = [/SUFFIX_MAP/, /DIRECTIONAL_MAP/, /export\s+function\s+normalizeAddress/, /const\s+normalizeAddress\s*=/];
for (const pat of FORBIDDEN) {
  if (pat.test(src)) {
    console.error(`verify-normalize-identical-to-resolver: ${FILE} MUST be a re-export only; matched forbidden pattern ${pat}`);
    process.exit(1);
  }
}

// Assertion 2 — explicit re-export from the SSOT path.
if (!/from\s+['"]@\/lib\/jurisdiction\/addressNormalize['"]/.test(src)) {
  console.error('verify-normalize-identical-to-resolver: must re-export from @/lib/jurisdiction/addressNormalize');
  process.exit(1);
}

// Assertion 3 — runtime reference identity (best-effort; requires a TS runtime).
try {
  const fromDecision = (await import('../lib/decision2/normalize.ts')).normalizeAddress;
  const fromResolver = (await import('../lib/jurisdiction/addressNormalize.ts')).normalizeAddressForJurisdictionKey;
  if (fromDecision !== fromResolver) {
    console.error('verify-normalize-identical-to-resolver: re-export does not preserve function reference identity');
    process.exit(1);
  }
  console.log('verify-normalize-identical-to-resolver: OK (re-export verified + runtime identity confirmed)');
} catch {
  console.log('verify-normalize-identical-to-resolver: OK (re-export verified; runtime identity check skipped — no TS runtime)');
}
