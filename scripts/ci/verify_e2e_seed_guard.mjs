#!/usr/bin/env node
// E4-S6 belt-and-suspenders (generalized, Gate-3 Slice 1): static guard asserting that EVERY preview-only
// test-seed endpoint under app/api/test/*/route.ts keeps all four runtime locks. Fails CI if any such route
// exists but drops a lock string (e.g. someone removes the prod-404 check, or adds a new unguarded seed route).
// Shape-based iteration is the standing pattern per gate3_slice1_seed_strategy_broker_ruling_2026-07-02 §"standing
// patterns" — new seed routes are guarded automatically, no fresh ruling needed. Dependency-free.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'app/api/test';

// The four universal locks every test-seed route must carry (S7 asserted generically via zod .strict(), since the
// specific strict-validation symbol differs per route — e.g. seed-session uses isCounselRouteTrigger).
const LOCKS = [
  { needle: "VERCEL_ENV === 'production'", lock: 'S2 prod-404' },
  { needle: 'E2E_RUN_ACTIVE', lock: 'S3 e2e-flag gate' },
  { needle: 'TEST_SEED_SECRET', lock: 'S4 shared secret' },
  { needle: '.strict(', lock: 'S7 strict input schema' },
];

if (!existsSync(DIR)) {
  console.log('verify_e2e_seed_guard: no app/api/test dir — nothing to guard ✓');
  process.exit(0);
}

const routes = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(DIR, d.name, 'route.ts'))
  .filter(existsSync);

if (routes.length === 0) {
  console.log('verify_e2e_seed_guard: no test-seed routes present — nothing to guard ✓');
  process.exit(0);
}

let failed = false;
for (const route of routes) {
  const src = readFileSync(route, 'utf8');
  const missing = LOCKS.filter((r) => !src.includes(r.needle)).map((r) => r.lock);
  if (missing.length) {
    console.error(`verify_e2e_seed_guard: ${route} — MISSING locks → ${missing.join(', ')}`);
    failed = true;
  }
}

// Targeted check for the admin-session minter (omnibus §4): it must mint for the env-provisioned E2E_ADMIN_EMAIL
// ONLY, never an email supplied in the request. Strict-EMPTY body enforces this at the schema level.
const adminRoute = join(DIR, 'admin-session', 'route.ts');
if (existsSync(adminRoute)) {
  const src = readFileSync(adminRoute, 'utf8');
  if (!src.includes('E2E_ADMIN_EMAIL')) {
    console.error('verify_e2e_seed_guard: admin-session must read E2E_ADMIN_EMAIL from env (never the request)');
    failed = true;
  }
  if (!/z\.object\(\{\s*\}\)\.strict\(\)/.test(src)) {
    console.error('verify_e2e_seed_guard: admin-session body must be z.object({}).strict() — no email/user override accepted');
    failed = true;
  }
  if (/email:\s*z\./.test(src)) {
    console.error('verify_e2e_seed_guard: admin-session must not declare an email field in its request schema');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`verify_e2e_seed_guard: all four locks present on ${routes.length} test-seed route(s) ✓`);
process.exit(0);
