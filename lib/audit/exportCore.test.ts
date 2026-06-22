/**
 * Slice 4a — audit_exports export core tests.
 * Covers the six §2.4 requirement-3 scenarios (i–vi) plus the 0600-mode
 * removal path and multi-table NDJSON boundaries. All side effects are faked;
 * no service_role key, no real DB, no real filesystem.
 */
import {
  runExport,
  HELD_CONFIRM_LITERAL,
  DATE_FLOOR_SENTINEL,
  type ExportOptions,
  type ExportDeps,
  type AuditExportRowInsert,
} from './exportCore';

let passed = 0,
  failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log('  \u2713 ' + name);
  } else {
    failed++;
    console.log('  \u2717 ' + name);
  }
}

interface Recorder {
  inserted: AuditExportRowInsert[];
  finalized: { id: string; rowCount: number }[];
  failedRows: { id: string; failedAtISO: string; failureReason: string }[];
  writes: { path: string; content: string }[];
  removed: string[];
}

interface FakeConfig {
  tableData?: Record<string, Record<string, unknown>[]>;
  selectThrows?: boolean;
  isTTY?: boolean;
  promptResponse?: string;
  modeOk?: boolean;
}

function makeDeps(cfg: FakeConfig): { deps: ExportDeps; rec: Recorder } {
  const rec: Recorder = { inserted: [], finalized: [], failedRows: [], writes: [], removed: [] };
  let counter = 0;
  const deps: ExportDeps = {
    now: () => new Date('2026-06-22T00:00:00.000Z'),
    db: {
      async insertExportRow(row) {
        rec.inserted.push(row);
        counter++;
        return { id: 'exp-' + counter };
      },
      async finalizeExportRow(id, rowCount) {
        rec.finalized.push({ id, rowCount });
      },
      async failExportRow(id, failedAtISO, failureReason) {
        rec.failedRows.push({ id, failedAtISO, failureReason });
      },
      async selectTable(table) {
        if (cfg.selectThrows) {
          throw new Error('simulated query failure for ' + table);
        }
        return cfg.tableData && cfg.tableData[table] ? cfg.tableData[table] : [];
      },
    },
    io: {
      isTTY() {
        return cfg.isTTY ?? true;
      },
      async promptHeldConfirmation() {
        return cfg.promptResponse ?? '';
      },
      async writeSecureFile(path, content) {
        rec.writes.push({ path, content });
      },
      async modeIs0600() {
        return cfg.modeOk ?? true;
      },
      async removeFile(path) {
        rec.removed.push(path);
      },
    },
  };
  return { deps, rec };
}

function baseOpts(over: Partial<ExportOptions>): ExportOptions {
  return {
    out: '/tmp/out.ndjson',
    tables: ['geocode_audit_log'],
    fromISO: null,
    toISO: null,
    includeHeld: false,
    reason: 'broker quarterly review',
    operator: 'jack_taglyan_caldre_b9445457',
    cliVersion: '0.1.0',
    hostFingerprint: 'abc123def4567890',
    ...over,
  };
}

async function main() {
  // (i) reason missing/too short => abort, NO row, NO file.
  {
    const { deps, rec } = makeDeps({});
    const r = await runExport(baseOpts({ reason: 'short' }), deps);
    check('i reason too short => aborted', r.status === 'aborted');
    check('i no row inserted', rec.inserted.length === 0);
    check('i no file written', rec.writes.length === 0);
    const r2 = await runExport(baseOpts({ reason: '' }), makeDeps({}).deps);
    check('i empty reason => aborted', r2.status === 'aborted');
  }

  // also: --out required.
  {
    const { deps, rec } = makeDeps({});
    const r = await runExport(baseOpts({ out: '' }), deps);
    check('out required => aborted', r.status === 'aborted');
    check('out required => no row', rec.inserted.length === 0);
  }

  // (ii) reason present, include-held off => row written, file written.
  {
    const { deps, rec } = makeDeps({
      tableData: { geocode_audit_log: [{ id: '1', decided_at: 't', legal_hold: false }] },
    });
    const r = await runExport(baseOpts({}), deps);
    check('ii ok', r.status === 'ok');
    check('ii one row inserted', rec.inserted.length === 1);
    check('ii included_held false on row', rec.inserted[0].included_held === false);
    check('ii reason recorded verbatim', rec.inserted[0].reason === 'broker quarterly review');
    check('ii file written once', rec.writes.length === 1);
    check('ii finalize row_count=1', rec.finalized.length === 1 && rec.finalized[0].rowCount === 1);
    check('ii ndjson has meta boundary', rec.writes[0].content.includes('"_meta":"table_boundary"'));
    check('ii no failure recorded', rec.failedRows.length === 0);
  }

  // (iii) include-held on, typed confirmation correct => row included_held=true, file written.
  {
    const { deps, rec } = makeDeps({
      isTTY: true,
      promptResponse: HELD_CONFIRM_LITERAL,
      tableData: { geocode_audit_log: [{ id: '1' }] },
    });
    const r = await runExport(
      baseOpts({ includeHeld: true, reason: 'incident SR-2026-08 evidence pull' }),
      deps,
    );
    check('iii ok', r.status === 'ok');
    check('iii row inserted', rec.inserted.length === 1);
    check('iii included_held true on row', rec.inserted[0].included_held === true);
    check('iii file written', rec.writes.length === 1);
  }

  // (iv) include-held on, typed confirmation wrong => abort, NO row.
  {
    const { deps, rec } = makeDeps({ isTTY: true, promptResponse: 'include held rows' });
    const r = await runExport(
      baseOpts({ includeHeld: true, reason: 'incident evidence pull' }),
      deps,
    );
    check('iv aborted', r.status === 'aborted');
    check('iv no row inserted', rec.inserted.length === 0);
    check('iv no file written', rec.writes.length === 0);
  }

  // (v) include-held on, non-TTY => abort, NO row (even with correct literal queued).
  {
    const { deps, rec } = makeDeps({ isTTY: false, promptResponse: HELD_CONFIRM_LITERAL });
    const r = await runExport(
      baseOpts({ includeHeld: true, reason: 'incident evidence pull' }),
      deps,
    );
    check('v aborted (non-TTY)', r.status === 'aborted');
    check('v no row inserted', rec.inserted.length === 0);
    check('v no file written', rec.writes.length === 0);
  }

  // (vi) export query fails AFTER row insert => row carries failure_reason, no finalize.
  {
    const { deps, rec } = makeDeps({ selectThrows: true });
    const r = await runExport(baseOpts({}), deps);
    check('vi failed', r.status === 'failed');
    check('vi row WAS inserted', rec.inserted.length === 1);
    check('vi failExportRow called once', rec.failedRows.length === 1);
    check('vi failure_reason populated', rec.failedRows[0].failureReason.length > 0);
    check('vi no finalize', rec.finalized.length === 0);
  }

  // edge: file mode not 0600 => remove file + record failure (row kept).
  {
    const { deps, rec } = makeDeps({
      modeOk: false,
      tableData: { geocode_audit_log: [{ id: '1' }] },
    });
    const r = await runExport(baseOpts({}), deps);
    check('mode!=0600 => failed', r.status === 'failed');
    check('mode!=0600 => file removed', rec.removed.length === 1);
    check('mode!=0600 => failure recorded', rec.failedRows.length === 1);
  }

  // edge: multi-table boundaries + total count + floor sentinel on row.
  {
    const { deps, rec } = makeDeps({
      tableData: {
        geocode_audit_log: [{ id: 'a' }],
        classifier_audit_log: [{ id: 'b' }, { id: 'c' }],
      },
    });
    const r = await runExport(
      baseOpts({ tables: ['geocode_audit_log', 'classifier_audit_log'] }),
      deps,
    );
    check('multi ok', r.status === 'ok');
    check('multi total=3', r.status === 'ok' && r.rowCount === 3);
    const content = rec.writes[0].content;
    check('multi two meta boundaries', (content.match(/"_meta":"table_boundary"/g) || []).length === 2);
    check('floor sentinel used when from unset', rec.inserted[0].date_range_start === DATE_FLOOR_SENTINEL);
    check('to defaults to now ISO', rec.inserted[0].date_range_end === '2026-06-22T00:00:00.000Z');
  }

  // edge: unknown table => abort before row.
  {
    const { deps, rec } = makeDeps({});
    const r = await runExport(baseOpts({ tables: ['not_a_table'] }), deps);
    check('unknown table => aborted', r.status === 'aborted');
    check('unknown table => no row', rec.inserted.length === 0);
  }
}

main()
  .then(() => {
    console.log(`\n  ${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error('  \u2717 unexpected error', e);
    process.exit(1);
  });
