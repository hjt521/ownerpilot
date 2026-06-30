#!/usr/bin/env node
// scripts/verify-broker-confirm-sla-sync.mjs
// Lane 5 Decision 2 CI guard (master prompt §6): the SLA cron expression must be byte-identical
// between migration 024 and the broker-confirm-sla edge function. Fail the build if they diverge.

import { readFileSync } from 'node:fs';

const MIGRATION = 'supabase/migrations/024_broker_confirm_sla_cron.sql';
const EDGE_FN = 'supabase/functions/broker-confirm-sla/index.ts';

function fail(msg) {
  console.error(`ci:verify-broker-confirm-sla-sync FAILED — ${msg}`);
  process.exit(1);
}

let migrationSrc, edgeSrc;
try { migrationSrc = readFileSync(MIGRATION, 'utf8'); } catch { fail(`cannot read ${MIGRATION}`); }
try { edgeSrc = readFileSync(EDGE_FN, 'utf8'); } catch { fail(`cannot read ${EDGE_FN}`); }

// Migration: the schedule string is the 2nd arg to cron.schedule('broker-confirm-sla-sweep', '<expr>', ...)
const migMatch = migrationSrc.match(/cron\.schedule\(\s*'broker-confirm-sla-sweep'\s*,\s*'([^']+)'/);
if (!migMatch) fail('could not find broker-confirm-sla-sweep cron expression in migration 024');
const migExpr = migMatch[1];

// Edge fn: const SLA_CRON_EXPRESSION = '<expr>'
const edgeMatch = edgeSrc.match(/SLA_CRON_EXPRESSION\s*=\s*'([^']+)'/);
if (!edgeMatch) fail('could not find SLA_CRON_EXPRESSION in the edge function');
const edgeExpr = edgeMatch[1];

if (migExpr !== edgeExpr) {
  fail(`cron expression mismatch: migration='${migExpr}' edge='${edgeExpr}'`);
}

console.log(`ci:verify-broker-confirm-sla-sync OK — both pinned to '${migExpr}'`);
process.exit(0);
