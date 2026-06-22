#!/usr/bin/env node
/**
 * Slice 4b — broker-run live-cliff CLI (thin entry).
 * Per broker ruling 2026-06-21 §2.5–§2.6.
 *
 * Broker-run tool. service_role key required in local env. Build authored; broker operates.
 *
 * Wires the real service_role rpc to public.audit_cliff, the interactive TTY
 * check, and the error alert to the testable core in lib/audit/cliffCore.ts.
 * Holds NO key material; READS process.env.SUPABASE_SERVICE_ROLE_KEY, populated
 * only on the broker's local machine. There is no CI / scheduled invocation
 * surface (ruling §2.5 req 5). One table per invocation; no autonomous deletion.
 *
 * Modes:
 *   --status                 read the latest cliff_runs rows (broker read surface).
 *   --table <t> --reason <r> --dry-run            preview one table (no delete).
 *   --table <t> --reason <r> --confirm "DELETE PAST-CLIFF ROWS"   live cliff.
 */
import { createClient } from '@supabase/supabase-js';
import {
  runCliff,
  CLIFF_TABLES,
  CLIFF_CONFIRM_LITERAL,
  type CliffDeps,
  type CliffRpcResult,
} from '../lib/audit/cliffCore';

const HELP = `audit_cliff_live — broker-run retention-cliff tool.
Broker-run tool. service_role key required in local env. Build authored; broker operates.

Usage:
  npx tsx scripts/audit_cliff_live.ts --status
  npx tsx scripts/audit_cliff_live.ts --table <name> --reason <text> --dry-run
  npx tsx scripts/audit_cliff_live.ts --table <name> --reason <text> --confirm "DELETE PAST-CLIFF ROWS"

Flags:
  --status            Print the latest cliff_runs rows (the scheduled dry-run report surface).
  --table <name>      One audit table per invocation. One of:
                      ${CLIFF_TABLES.join(', ')}
  --reason <text>     Why this run (recorded on the cliff_runs row). Required for --dry-run and live.
  --dry-run           Preview only: counts what WOULD be deleted; deletes nothing.
  --confirm <text>    Live cliff requires exactly: ${CLIFF_CONFIRM_LITERAL}
                      Live cliff also requires an interactive terminal.
  --help              Show this help.

The live cliff deletes past-cliff rows for ONE table. The schedule only ever runs
the dry-run; the live delete is this CLI only. Held rows are never deleted.

Environment (local only):
  SUPABASE_SERVICE_ROLE_KEY   The broker's service_role key. Required.
  NEXT_PUBLIC_SUPABASE_URL    The project URL (or SUPABASE_URL).
`;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      continue;
    }
    const key = a.slice(2);
    if (key === 'dry-run' || key === 'status' || key === 'help') {
      out[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || process.argv.length <= 2) {
    console.log(HELP);
    process.exit(0);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY not set; this tool runs locally with the broker's service_role; abort.",
    );
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) not set; abort.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // --status: the broker read surface over cliff_runs (ruling §2.5 req 2).
  if (args.status === true) {
    const { data, error } = await supabase
      .from('cliff_runs')
      .select(
        'run_at, dry_run, table_name, would_delete_count, deleted_count, held_skip_count, grace_skip_count, error_count, triggered_by, cli_reason',
      )
      .order('run_at', { ascending: false })
      .limit(40);
    if (error) {
      console.error('cliff_runs read failed: ' + error.message);
      process.exit(1);
    }
    console.log(JSON.stringify(data ?? [], null, 2));
    process.exit(0);
  }

  const deps: CliffDeps = {
    async rpcCliff(dryRun, table, triggeredBy, reason) {
      const { data, error } = await supabase.rpc('audit_cliff', {
        p_dry_run: dryRun,
        p_table: table,
        p_triggered_by: triggeredBy,
        p_reason: reason,
      });
      if (error) {
        throw new Error('audit_cliff rpc failed: ' + error.message);
      }
      return data as CliffRpcResult;
    },
    isTTY() {
      return Boolean(process.stdin.isTTY);
    },
    emitAlert(alertClass, detail) {
      // Shared alert transport (Resend) is not yet built — emit to console as the
      // documented stub, same cross-cutting gap as the geocode/classifier sinks.
      console.error(`[ALERT ${alertClass}] ` + JSON.stringify(detail));
    },
  };

  const outcome = await runCliff(
    {
      table: typeof args.table === 'string' ? args.table : '',
      reason: typeof args.reason === 'string' ? args.reason : '',
      confirm: typeof args.confirm === 'string' ? args.confirm : null,
      dryRun: args['dry-run'] === true,
    },
    deps,
  );

  if (outcome.status === 'ok') {
    const label = outcome.dryRun ? 'dry-run' : 'live cliff';
    console.log(`${label} ok: ` + JSON.stringify(outcome.result));
    process.exit(0);
  } else {
    console.error('cliff aborted: ' + outcome.reason);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error('unexpected error', e);
  process.exit(1);
});
