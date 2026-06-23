#!/usr/bin/env node
/**
 * verify_no_operator_secrets.mjs
 *
 * CI guard for the operator-surface-only credential rail (standing rule;
 * service_role exposure determination 2026-06-22 §4, narrowed to literal VALUES
 * for this PR). The Supabase service_role secret key (`sb_secret_<body>`) and
 * other operator-only credentials must NEVER appear as a literal value in any
 * git-tracked file — they live only in the broker-local .env (git-ignored); the
 * Vercel and CI runtimes never hold them. This guard scans every tracked file
 * for a real service_role secret value and fails (exit 1) on any hit.
 *
 * Scope: literal VALUES, not env-var NAMES. The names (SUPABASE_SERVICE_ROLE_KEY,
 * VERCEL_TOKEN) legitimately appear in .env.local.example, in scripts that read
 * process.env, and in docs — those are fine. A real `sb_secret_<body>` in a
 * tracked file is the violation. The publishable/anon key (`sb_publishable_`) is
 * intentionally public and is NOT forbidden. Broader name-in-app-runtime
 * enforcement is the deferred rail-enforcement ruling's scope (§4); this is the
 * literal-value cut that ships with deliverable 4.
 *
 * Run: node scripts/ci/verify_no_operator_secrets.mjs
 * Wire as a required check alongside verify-geocode-failure-event.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SELF = 'scripts/ci/verify_no_operator_secrets.mjs';

// Forbidden literal credential-value patterns. Extend, never narrow.
const FORBIDDEN = [
  { name: 'supabase service_role secret (sb_secret_)', re: /sb_secret_[A-Za-z0-9]{16,}/ },
];

// Binary/asset extensions we never scan.
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|mp4|zip|gz|lock)$/i;

function fail(msg) {
  console.error(`[verify-no-operator-secrets] FAIL: ${msg}`);
  process.exit(1);
}

let files;
try {
  files = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch (e) {
  fail(`could not list tracked files (git ls-files): ${e.message}`);
}

const hits = [];
for (const file of files) {
  if (file === SELF) continue;          // this guard's own source contains the pattern text
  if (SKIP_EXT.test(file)) continue;
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  if (src.includes('\u0000')) continue; // binary
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const { name, re } of FORBIDDEN) {
      if (re.test(lines[i])) hits.push(`${file}:${i + 1}  (${name})`);
    }
  }
}

if (hits.length > 0) {
  fail(
    `operator-only credential value(s) found in tracked files:\n  ` +
    hits.join('\n  ') +
    `\nThese live ONLY in the broker-local .env (git-ignored), never in ` +
    `app/Vercel/git/CI. Remove the literal value; if a real key leaked, ROTATE it.`,
  );
}

console.log(
  `[verify-no-operator-secrets] OK: ${files.length} tracked files scanned; ` +
  `no operator-only credential values present.`,
);
process.exit(0);
