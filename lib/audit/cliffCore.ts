/**
 * Slice 4b — broker-run live-cliff CLI, testable core.
 * Per broker ruling 2026-06-21 (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.5–§2.6).
 *
 * No service_role key handling and no Supabase/IO here — the cliff RPC, the TTY
 * check, and the alert emit are injected (CliffDeps) so the gating is
 * unit-testable. The thin entry scripts/audit_cliff_live.ts wires the real
 * service_role rpc + stdin TTY + alert. Build never enters, stores, or transmits
 * the key. The live cliff is NEVER scheduled — this CLI is its only invocation
 * surface (ruling §2.5 req 5). No autonomous deletion.
 */

// The eight audit tables the cliff processes (the original seven plus cliff_runs).
export const CLIFF_TABLES = [
  'geocode_audit_log',
  'manual_review_queue',
  'classifier_audit_log',
  'rate_limit_events',
  'audit_deletion_incidents',
  'audit_access_grants',
  'audit_exports',
  'cliff_runs',
] as const;
export type CliffTable = (typeof CLIFF_TABLES)[number];

export const CLIFF_CONFIRM_LITERAL = 'DELETE PAST-CLIFF ROWS';
export const CLIFF_ALERT_CLASS = 'audit_cliff_run_errors';

export interface CliffOptions {
  table: string;
  reason: string;
  confirm: string | null; // the --confirm flag value; required for live, ignored for dry-run
  dryRun: boolean;
}

export interface CliffRpcResult {
  dry_run: boolean;
  tables_processed: number;
  would_delete_total: number;
  deleted_total: number;
  held_skip_total: number;
  grace_skip_total: number;
  error_total: number;
}

export interface CliffDeps {
  // Calls public.audit_cliff(dryRun, table, triggeredBy, reason) and returns its jsonb result.
  rpcCliff(
    dryRun: boolean,
    table: string,
    triggeredBy: string,
    reason: string,
  ): Promise<CliffRpcResult>;
  isTTY(): boolean;
  emitAlert(alertClass: string, detail: Record<string, unknown>): void;
}

export type CliffOutcome =
  | { status: 'ok'; dryRun: boolean; result: CliffRpcResult }
  | { status: 'aborted'; reason: string };

function validate(opts: CliffOptions): string | null {
  if (!opts.table || !(CLIFF_TABLES as readonly string[]).includes(opts.table)) {
    return `--table is required and must be one of the audit tables; got: ${opts.table || '(none)'}`;
  }
  if (!opts.reason || opts.reason.trim().length === 0) {
    return '--reason is required (recorded on the cliff_runs row).';
  }
  return null;
}

/**
 * Orchestrates one cliff invocation, scoped to ONE table (ruling §2.5 req 4).
 *   - dry-run: read-only counts, triggered_by 'cli_dry', no confirmation needed.
 *   - live: requires an interactive TTY AND the exact --confirm literal, then
 *     runs audit_cliff(false, ...) which deletes past-cliff rows for the table.
 * If the RPC reports error_total > 0, an alert is emitted (ruling §2.6 req 5).
 */
export async function runCliff(opts: CliffOptions, deps: CliffDeps): Promise<CliffOutcome> {
  const invalid = validate(opts);
  if (invalid) {
    return { status: 'aborted', reason: invalid };
  }

  if (opts.dryRun) {
    const result = await deps.rpcCliff(true, opts.table, 'cli_dry', opts.reason);
    if (result.error_total > 0) {
      deps.emitAlert(CLIFF_ALERT_CLASS, {
        table: opts.table,
        dry_run: true,
        error_total: result.error_total,
      });
    }
    return { status: 'ok', dryRun: true, result };
  }

  // Live path: two independent barriers before any delete.
  if (!deps.isTTY()) {
    return {
      status: 'aborted',
      reason: 'live cliff requires an interactive terminal; aborting (nothing deleted).',
    };
  }
  if (opts.confirm !== CLIFF_CONFIRM_LITERAL) {
    return {
      status: 'aborted',
      reason: `--confirm must be exactly '${CLIFF_CONFIRM_LITERAL}'; aborting (nothing deleted).`,
    };
  }

  const result = await deps.rpcCliff(false, opts.table, 'cli', opts.reason);
  if (result.error_total > 0) {
    deps.emitAlert(CLIFF_ALERT_CLASS, {
      table: opts.table,
      dry_run: false,
      error_total: result.error_total,
    });
  }
  return { status: 'ok', dryRun: false, result };
}
