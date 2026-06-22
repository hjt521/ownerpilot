#!/usr/bin/env node
/**
 * Slice 4a — audit_exports broker-run export CLI (thin entry).
 * Per broker ruling 2026-06-21 §2.2–§2.4.
 *
 * Broker-run tool. service_role key required in local env. Build authored; broker operates.
 *
 * This entry wires the real service_role Supabase client, the filesystem
 * (output at mode 0600), and an interactive TTY prompt to the testable core in
 * lib/audit/exportCore.ts. It holds NO key material: it READS
 * process.env.SUPABASE_SERVICE_ROLE_KEY, which is populated only on the broker's
 * local machine. There is no CI / scheduled invocation surface (ruling §2.2 req 5).
 */
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';
import { hostname } from 'node:os';
import { createHash } from 'node:crypto';
import {
  runExport,
  AUDIT_TABLES,
  DEFAULT_OPERATOR,
  MIN_REASON_LENGTH,
  type ExportOptions,
  type ExportDbClient,
  type ExportIO,
} from '../lib/audit/exportCore';

const CLI_VERSION = '0.1.0';

const HELP = `audit_export — broker-run audit export tool.
Broker-run tool. service_role key required in local env. Build authored; broker operates.

Usage:
  npx tsx scripts/audit_export.ts --out <path> --reason <text> [options]

Required:
  --out <path>      Destination NDJSON file (created at mode 0600). No stdout.
  --reason <text>   Why this export is run (min ${MIN_REASON_LENGTH} chars). Recorded verbatim on the audit_exports row.
                    e.g. "section 8 verification pass", "incident SR-2026-08 evidence pull", "broker quarterly review"

Options:
  --tables <a,b,..> Comma-separated subset. Default: all seven audit tables.
  --from <ISO>      Lower bound on decided_at (inclusive). Default: all-time.
  --to <ISO>        Upper bound on decided_at (inclusive). Default: now.
  --include-held    Include rows under legal hold. Requires an interactive terminal
                    and a typed 'INCLUDE HELD ROWS' confirmation.
  --operator <text> Operator label on the row. Default: ${DEFAULT_OPERATOR}.
  --help            Show this help.

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
    if (key === 'include-held' || key === 'help') {
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

  const tables =
    typeof args.tables === 'string'
      ? args.tables
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [...AUDIT_TABLES];

  const opts: ExportOptions = {
    out: typeof args.out === 'string' ? args.out : '',
    tables,
    fromISO: typeof args.from === 'string' ? args.from : null,
    toISO: typeof args.to === 'string' ? args.to : null,
    includeHeld: args['include-held'] === true,
    reason: typeof args.reason === 'string' ? args.reason : '',
    operator: typeof args.operator === 'string' ? args.operator : DEFAULT_OPERATOR,
    cliVersion: CLI_VERSION,
    hostFingerprint: createHash('sha256').update(hostname()).digest('hex').slice(0, 16),
  };

  const db: ExportDbClient = {
    async insertExportRow(row) {
      const { data, error } = await supabase
        .from('audit_exports')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        throw new Error('audit_exports insert failed: ' + error.message);
      }
      return { id: (data as { id: string }).id };
    },
    async finalizeExportRow(id, rowCount) {
      const { error } = await supabase
        .from('audit_exports')
        .update({ row_count: rowCount })
        .eq('id', id);
      if (error) {
        throw new Error('audit_exports finalize failed: ' + error.message);
      }
    },
    async failExportRow(id, failedAtISO, failureReason) {
      await supabase
        .from('audit_exports')
        .update({ failed_at: failedAtISO, failure_reason: failureReason })
        .eq('id', id);
    },
    async selectTable(table, fromISO, toISO, includeHeld) {
      const rows: Record<string, unknown>[] = [];
      const PAGE = 1000;
      let offset = 0;
      // Paginate to defeat PostgREST's default 1000-row cap.
      for (;;) {
        let q = supabase
          .from(table)
          .select('*')
          .order('decided_at', { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (fromISO !== '-infinity') {
          q = q.gte('decided_at', fromISO);
        }
        q = q.lte('decided_at', toISO);
        if (!includeHeld) {
          q = q.eq('legal_hold', false);
        }
        const { data, error } = await q;
        if (error) {
          throw new Error(`select ${table} failed: ` + error.message);
        }
        const batch = (data ?? []) as Record<string, unknown>[];
        rows.push(...batch);
        if (batch.length < PAGE) {
          break;
        }
        offset += PAGE;
      }
      return rows;
    },
  };

  const io: ExportIO = {
    isTTY() {
      return Boolean(process.stdin.isTTY);
    },
    async promptHeldConfirmation(promptText) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = await new Promise<string>((resolve) => {
          rl.question(promptText, resolve);
        });
        return answer;
      } finally {
        rl.close();
      }
    },
    async writeSecureFile(path, content) {
      await fs.writeFile(path, content, { mode: 0o600 });
    },
    async modeIs0600(path) {
      const st = await fs.stat(path);
      return (st.mode & 0o777) === 0o600;
    },
    async removeFile(path) {
      await fs.rm(path, { force: true });
    },
  };

  const outcome = await runExport(opts, { db, io, now: () => new Date() });
  if (outcome.status === 'ok') {
    console.log(
      `export ok: ${outcome.rowCount} row(s) -> ${outcome.outPath} (audit_exports id ${outcome.exportId})`,
    );
    process.exit(0);
  } else if (outcome.status === 'aborted') {
    console.error('export aborted: ' + outcome.reason);
    process.exit(2);
  } else {
    console.error(
      `export failed after audit_exports row ${outcome.exportId}: ${outcome.failureReason}`,
    );
    console.error('the audit_exports row was kept and its failure_reason populated.');
    process.exit(3);
  }
}

main().catch((e) => {
  console.error('unexpected error', e);
  process.exit(1);
});
