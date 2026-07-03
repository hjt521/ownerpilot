#!/usr/bin/env node
/**
 * CI guard — API routes must read request bodies through lib/http/requestBody::readRequestBody, never by calling
 * req.formData()/req.json() directly. This forbids the "formData-first, catch → json" antipattern that broke
 * /api/privacy-request (#139) and then /api/waitlist: on Vercel req.formData() returns an EMPTY FormData for a
 * JSON body (instead of throwing), so direct parsing silently read fields as null → 400.
 *
 * Rule: any route.ts under app/api that calls `.formData(` must import readRequestBody. (Routes that read only
 * JSON via req.json() are NOT at risk — the bug is specific to formData() on JSON bodies — so they are not
 * flagged.) The canonical reader itself lives in lib/http, out of scope. A route that legitimately needs raw
 * multipart (e.g. a file upload) can be added to ALLOW below with a justification.
 *
 * Dependency-free (Node built-ins). Exits non-zero on any violation.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'app/api';
const ALLOW = new Set([
  // 'app/api/<route>/route.ts',  // + reason — none currently
]);

function walk(dir, acc) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === 'route.ts') acc.push(p);
  }
  return acc;
}

const routes = walk(ROOT, []);
const violations = [];
for (const file of routes) {
  if (ALLOW.has(file)) continue;
  const src = readFileSync(file, 'utf8');
  const callsFormData = /\.formData\s*\(/.test(src);
  const usesHelper = /from ['"]@\/lib\/http\/requestBody['"]/.test(src);
  if (callsFormData && !usesHelper) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error('✗ route body-parsing guard: these routes read the body directly instead of readRequestBody():');
  for (const v of violations) console.error(`   - ${v}`);
  console.error('\n  Use `readRequestBody(req)` from @/lib/http/requestBody (dispatches on Content-Type;');
  console.error('  Vercel returns an empty FormData for JSON bodies, so direct req.formData() drops all fields).');
  process.exit(1);
}
console.log(`✓ route body-parsing guard: ${routes.length} route(s) clean (all body reads go through readRequestBody).`);
