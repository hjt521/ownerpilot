#!/usr/bin/env node
/**
 * constitution/validation/run_checks.ts — the Constitutional Health Monitor.
 *
 * Executes run_checks.sql against the constitution schema (READ-ONLY), then adds the repository-side comparisons
 * (baseline checksum match) and emits a machine-readable report. Exits non-zero on any FAIL or on drift, so CI can
 * simply run this. Future CI: `node constitution/validation/run_checks.ts` (or the compiled JS).
 *
 * Connection: reads a read-only Postgres URL from env (CONSTITUTION_DB_URL, else SUPABASE_DB_URL). No writes.
 * Dependency: `pg` (node-postgres). If not installed: `npm i -D pg`.
 *
 * Outputs:
 *   - stdout: human summary
 *   - constitution/validation/last_report.json: machine-readable report
 *   - exit code: 0 = healthy, 1 = fail/drift, 2 = runner error (couldn't connect / read files)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = join(HERE, 'run_checks.sql');
const CHECKSUM_PATH = join(HERE, '..', 'baseline', 'constitution_checksum.sha256');
const REPORT_PATH = join(HERE, 'last_report.json');

function committedOverall(): string | null {
  try {
    const line = readFileSync(CHECKSUM_PATH, 'utf8').split('\n').find((l) => l.includes('constitution.OVERALL'));
    return line ? line.trim().split(/\s+/)[0] : null;
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  const url = process.env.CONSTITUTION_DB_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('[constitution] no CONSTITUTION_DB_URL / SUPABASE_DB_URL set — cannot run health checks.');
    return 2;
  }
  let Client: any;
  try {
    ({ Client } = await import('pg'));
  } catch {
    console.error('[constitution] missing dependency `pg`. Install with: npm i -D pg');
    return 2;
  }

  const client = new Client({ connectionString: url, application_name: 'constitution_health' });
  let health: any;
  try {
    await client.connect();
    // run_checks.sql is a single statement returning one json column.
    const sql = readFileSync(SQL_PATH, 'utf8');
    const res = await client.query(sql);
    health = res.rows[0]?.constitution_health ?? res.rows[0];
  } catch (e) {
    console.error('[constitution] health query failed:', e instanceof Error ? e.message : e);
    return 2;
  } finally {
    await client.end().catch(() => {});
  }

  // Repo-side comparison: live genesis checksum vs committed baseline.
  const liveOverall: string | undefined = health?.genesis?.overall_sha256;
  const committed = committedOverall();
  const drift = committed != null && liveOverall != null && committed !== liveOverall;

  const checks: any[] = Array.isArray(health?.checks) ? health.checks : [];
  const fails = checks.filter((c) => c.status === 'fail');
  const warns = checks.filter((c) => c.status === 'warn');

  const report = {
    report: 'constitution_health',
    generated_at: new Date().toISOString(),
    genesis: {
      live_overall_sha256: liveOverall,
      committed_overall_sha256: committed,
      drift,
    },
    checks,
    summary: {
      total: checks.length,
      pass: checks.filter((c) => c.status === 'pass').length,
      warn: warns.length,
      fail: fails.length,
      drift,
    },
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  // Human summary
  console.log(`\nConstitution health — overall ${drift ? 'DRIFT ⛔' : liveOverall?.slice(0, 12) + '… (baseline match ✓)'}`);
  for (const c of checks) console.log(`  [${c.status.toUpperCase().padEnd(4)}] ${c.check}${c.offenders?.length ? ` (${c.offenders.length})` : ''}`);
  console.log(`  drift: ${drift ? 'YES' : 'no'} | pass ${report.summary.pass} · warn ${report.summary.warn} · fail ${report.summary.fail}\n`);

  // Health gate: FAIL checks or drift => non-zero. Warnings do not fail the build.
  return fails.length > 0 || drift ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(2); });
