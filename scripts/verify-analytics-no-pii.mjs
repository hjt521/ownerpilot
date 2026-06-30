#!/usr/bin/env node
// scripts/verify-analytics-no-pii.mjs
// Lane 6 Analytics §Q static CI guard (master prompt §3.3): scan analytics call sites and assert
// no denied PII keys are passed as inline object-literal params. Byte-exact from spec.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DENIED = ['address', 'tenant_name', 'landlord_name', 'email',
  'phone', 'payee_account_number', 'requester_contact'];

const violations = [];

function scan(dir) {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f === '.next' || f === '.git') continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { scan(p); continue; }
    if (!/\.(ts|tsx|js|jsx)$/.test(f)) continue;
    const src = readFileSync(p, 'utf8');
    // Find gtag/fireClientEvent/fireServerEvent calls and look for denied keys in inline object literals
    const callRegex = /(gtag|fireClientEvent|fireServerEvent)\s*\([^)]*\)/g;
    const calls = src.match(callRegex) ?? [];
    for (const c of calls) {
      for (const key of DENIED) {
        // Skip if denylist file itself
        if (p.endsWith('denylist.ts') || p.endsWith('verify-analytics-no-pii.mjs')) continue;
        const re = new RegExp(`['"]${key}['"]\\s*:`);
        if (re.test(c)) violations.push({ file: p, key, snippet: c.slice(0, 200) });
      }
    }
  }
}

scan(process.cwd());
if (violations.length) {
  console.error('Analytics PII denylist violations:');
  for (const v of violations) console.error(`  ${v.file} — key "${v.key}" — ${v.snippet}`);
  process.exit(1);
}
console.log('analytics-no-pii: OK');
