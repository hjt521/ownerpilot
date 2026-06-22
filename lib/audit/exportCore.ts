/**
 * Slice 4a — audit_exports broker-run export CLI, testable core.
 * Per broker ruling 2026-06-21 (slice4_export_cliff_resolver_wiring_broker_ruling_response_2026-06-21.md §2.2–§2.4).
 *
 * This module contains NO service_role key handling and NO direct Supabase or
 * filesystem calls. Every side effect is injected via ExportDeps so the six
 * §2.4 scenarios are unit-testable with fakes. The thin entry
 * scripts/audit_export.ts wires the real service_role client, filesystem
 * (mode 0600), and interactive TTY prompt. Build never enters, stores, or
 * transmits the service_role key (ruling §2.2 requirement 1).
 */

export const AUDIT_TABLES = [
  'geocode_audit_log',
  'manual_review_queue',
  'classifier_audit_log',
  'rate_limit_events',
  'audit_deletion_incidents',
  'audit_access_grants',
  'audit_exports',
] as const;
export type AuditTable = (typeof AUDIT_TABLES)[number];

export const MIN_REASON_LENGTH = 12;
export const HELD_CONFIRM_LITERAL = 'INCLUDE HELD ROWS';
export const HELD_CONFIRM_PROMPT =
  '--include-held is set. This export will include rows under legal hold ' +
  "(preservation order). Type the literal string 'INCLUDE HELD ROWS' to confirm: ";
export const DEFAULT_OPERATOR = 'jack_taglyan_caldre_b9445457';
export const DATE_FLOOR_SENTINEL = '-infinity';

export interface ExportOptions {
  out: string;
  tables: string[];
  fromISO: string | null; // null => floor sentinel ('-infinity')
  toISO: string | null; // null => now()
  includeHeld: boolean;
  reason: string;
  operator: string;
  cliVersion: string;
  hostFingerprint: string;
}

export interface AuditExportRowInsert {
  operator: string;
  tables: string[];
  date_range_start: string;
  date_range_end: string;
  included_held: boolean;
  reason: string;
  cli_version: string;
  host_fingerprint: string;
}

export interface ExportDbClient {
  insertExportRow(row: AuditExportRowInsert): Promise<{ id: string }>;
  finalizeExportRow(id: string, rowCount: number): Promise<void>;
  failExportRow(id: string, failedAtISO: string, failureReason: string): Promise<void>;
  selectTable(
    table: string,
    fromISO: string,
    toISO: string,
    includeHeld: boolean,
  ): Promise<Record<string, unknown>[]>;
}

export interface ExportIO {
  isTTY(): boolean;
  promptHeldConfirmation(promptText: string): Promise<string>;
  writeSecureFile(path: string, content: string): Promise<void>; // must create at mode 0600
  modeIs0600(path: string): Promise<boolean>;
  removeFile(path: string): Promise<void>;
}

export interface ExportDeps {
  db: ExportDbClient;
  io: ExportIO;
  now: () => Date;
}

export type ExportOutcome =
  | { status: 'ok'; exportId: string; rowCount: number; outPath: string }
  | { status: 'aborted'; reason: string } // pre-insert: NO row, NO file
  | { status: 'failed'; exportId: string; failureReason: string }; // post-insert: row kept

function validate(opts: ExportOptions): string | null {
  if (!opts.out || opts.out.trim().length === 0) {
    return '--out <path> is required (no stdout fallback).';
  }
  if (!opts.reason || opts.reason.length < MIN_REASON_LENGTH) {
    return `--reason is required and must be at least ${MIN_REASON_LENGTH} characters.`;
  }
  if (opts.tables.length === 0) {
    return 'at least one table is required.';
  }
  for (const t of opts.tables) {
    if (!(AUDIT_TABLES as readonly string[]).includes(t)) {
      return `unknown table: ${t}`;
    }
  }
  return null;
}

function ndjsonLine(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * Orchestrates one export run. Order (ruling §2.4 requirement 1):
 *   validate → held-row gating → insert audit_exports row → query → write file
 *   → confirm 0600 → finalize row_count.
 * Any failure AFTER the row insert populates the failure-path columns and keeps
 * the row (ruling §2.4 requirement 2).
 */
export async function runExport(opts: ExportOptions, deps: ExportDeps): Promise<ExportOutcome> {
  // 1) validate BEFORE any row/file (scenario i).
  const invalid = validate(opts);
  if (invalid) {
    return { status: 'aborted', reason: invalid };
  }

  // 2) held-row gating BEFORE any row/file (scenarios iv, v).
  if (opts.includeHeld) {
    if (!deps.io.isTTY()) {
      return {
        status: 'aborted',
        reason: 'include-held requires an interactive terminal; aborting (no row, no file).',
      };
    }
    const typed = await deps.io.promptHeldConfirmation(HELD_CONFIRM_PROMPT);
    if (typed !== HELD_CONFIRM_LITERAL) {
      return {
        status: 'aborted',
        reason: 'include-held confirmation did not match; aborting (no row, no file).',
      };
    }
  }

  // 3) resolve the date range with sentinels.
  const fromISO = opts.fromISO ?? DATE_FLOOR_SENTINEL;
  const toISO = opts.toISO ?? deps.now().toISOString();

  // 4) write the audit_exports row BEFORE the file (ruling §2.4 requirement 1).
  const insert: AuditExportRowInsert = {
    operator: opts.operator,
    tables: opts.tables,
    date_range_start: fromISO,
    date_range_end: toISO,
    included_held: opts.includeHeld,
    reason: opts.reason,
    cli_version: opts.cliVersion,
    host_fingerprint: opts.hostFingerprint,
  };
  const inserted = await deps.db.insertExportRow(insert);
  const exportId = inserted.id;

  // 5) query + write file; on any post-insert failure, keep the row and record
  //    the failure (ruling §2.4 requirement 2).
  try {
    let total = 0;
    const lines: string[] = [];
    for (const table of opts.tables) {
      const rows = await deps.db.selectTable(table, fromISO, toISO, opts.includeHeld);
      // one meta record per table block (ruling §2.3 requirement 2).
      lines.push(ndjsonLine({ _meta: 'table_boundary', table, row_count: rows.length }));
      for (const r of rows) {
        lines.push(ndjsonLine(r));
      }
      total += rows.length;
    }
    const content = lines.length > 0 ? lines.join('\n') + '\n' : '';
    await deps.io.writeSecureFile(opts.out, content);

    const modeOk = await deps.io.modeIs0600(opts.out);
    if (!modeOk) {
      await deps.io.removeFile(opts.out);
      throw new Error(`output file mode is not 0600 after creation; removed ${opts.out}`);
    }

    await deps.db.finalizeExportRow(exportId, total);
    return { status: 'ok', exportId, rowCount: total, outPath: opts.out };
  } catch (e) {
    const failureReason = e instanceof Error ? e.message : String(e);
    await deps.db.failExportRow(exportId, deps.now().toISOString(), failureReason);
    return { status: 'failed', exportId, failureReason };
  }
}
