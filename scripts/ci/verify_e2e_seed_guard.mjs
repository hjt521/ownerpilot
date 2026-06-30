#!/usr/bin/env node
// E4-S6 belt-and-suspenders: static guard asserting the preview-only seed endpoint keeps all four runtime
// locks. Fails CI if the route exists but any lock string is missing (e.g. someone removes the prod-404 check).
// Dependency-free; intended to run as its own CI step alongside the other lock guards.

import { readFileSync, existsSync } from 'node:fs';

const ROUTE = 'app/api/test/seed-session/route.ts';

if (!existsSync(ROUTE)) {
  console.log('verify_e2e_seed_guard: seed route absent — nothing to guard ✓');
  process.exit(0);
}

const src = readFileSync(ROUTE, 'utf8');
const required = [
  { needle: "VERCEL_ENV === 'production'", lock: 'S2 prod-404' },
  { needle: 'E2E_RUN_ACTIVE', lock: 'S3 e2e-flag gate' },
  { needle: 'TEST_SEED_SECRET', lock: 'S4 shared secret' },
  { needle: 'isCounselRouteTrigger', lock: 'S7 strict trigger validation' },
];
const missing = required.filter((r) => !src.includes(r.needle)).map((r) => r.lock);

if (missing.length) {
  console.error('verify_e2e_seed_guard: MISSING locks →', missing.join(', '));
  process.exit(1);
}
console.log('verify_e2e_seed_guard: all four seed-session locks present ✓');
process.exit(0);
