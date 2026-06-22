/**
 * Slice 4b — live-cliff CLI core tests. Covers the §2.5 gating (table/reason
 * validation, non-TTY abort, confirm-literal mismatch), dry-run vs live
 * triggered_by routing, one-table scoping, and the §2.6 error_total alert.
 */
import {
  runCliff,
  CLIFF_CONFIRM_LITERAL,
  CLIFF_ALERT_CLASS,
  type CliffOptions,
  type CliffDeps,
  type CliffRpcResult,
} from './cliffCore';

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
  rpcCalls: { dryRun: boolean; table: string; triggeredBy: string; reason: string }[];
  alerts: { alertClass: string; detail: Record<string, unknown> }[];
}

function makeDeps(cfg: { isTTY?: boolean; errorTotal?: number }): {
  deps: CliffDeps;
  rec: Recorder;
} {
  const rec: Recorder = { rpcCalls: [], alerts: [] };
  const deps: CliffDeps = {
    async rpcCliff(dryRun, table, triggeredBy, reason) {
      rec.rpcCalls.push({ dryRun, table, triggeredBy, reason });
      const result: CliffRpcResult = {
        dry_run: dryRun,
        tables_processed: 1,
        would_delete_total: dryRun ? 5 : 0,
        deleted_total: dryRun ? 0 : 5,
        held_skip_total: 1,
        grace_skip_total: 2,
        error_total: cfg.errorTotal ?? 0,
      };
      return result;
    },
    isTTY() {
      return cfg.isTTY ?? true;
    },
    emitAlert(alertClass, detail) {
      rec.alerts.push({ alertClass, detail });
    },
  };
  return { deps, rec };
}

function baseOpts(over: Partial<CliffOptions>): CliffOptions {
  return {
    table: 'geocode_audit_log',
    reason: 'weekly retention review',
    confirm: CLIFF_CONFIRM_LITERAL,
    dryRun: false,
    ...over,
  };
}

async function main() {
  // unknown table => abort, no rpc.
  {
    const { deps, rec } = makeDeps({});
    const r = await runCliff(baseOpts({ table: 'not_a_table' }), deps);
    check('unknown table => aborted', r.status === 'aborted');
    check('unknown table => no rpc', rec.rpcCalls.length === 0);
  }

  // reason missing => abort, no rpc.
  {
    const { deps, rec } = makeDeps({});
    const r = await runCliff(baseOpts({ reason: '   ' }), deps);
    check('reason blank => aborted', r.status === 'aborted');
    check('reason blank => no rpc', rec.rpcCalls.length === 0);
  }

  // dry-run => ok, triggered_by cli_dry, no confirm/TTY needed.
  {
    const { deps, rec } = makeDeps({ isTTY: false });
    const r = await runCliff(baseOpts({ dryRun: true, confirm: null }), deps);
    check('dry-run ok even non-TTY', r.status === 'ok' && r.dryRun === true);
    check('dry-run calls rpc dryRun=true', rec.rpcCalls.length === 1 && rec.rpcCalls[0].dryRun === true);
    check('dry-run triggered_by cli_dry', rec.rpcCalls[0].triggeredBy === 'cli_dry');
  }

  // live, non-TTY => abort, no rpc.
  {
    const { deps, rec } = makeDeps({ isTTY: false });
    const r = await runCliff(baseOpts({ dryRun: false }), deps);
    check('live non-TTY => aborted', r.status === 'aborted');
    check('live non-TTY => no rpc (nothing deleted)', rec.rpcCalls.length === 0);
  }

  // live, confirm wrong => abort, no rpc.
  {
    const { deps, rec } = makeDeps({ isTTY: true });
    const r = await runCliff(baseOpts({ dryRun: false, confirm: 'delete past-cliff rows' }), deps);
    check('live wrong confirm => aborted', r.status === 'aborted');
    check('live wrong confirm => no rpc', rec.rpcCalls.length === 0);
  }

  // live, confirm null => abort.
  {
    const { deps, rec } = makeDeps({ isTTY: true });
    const r = await runCliff(baseOpts({ dryRun: false, confirm: null }), deps);
    check('live no confirm => aborted', r.status === 'aborted');
    check('live no confirm => no rpc', rec.rpcCalls.length === 0);
  }

  // live, TTY + exact confirm => ok, triggered_by cli, dryRun false.
  {
    const { deps, rec } = makeDeps({ isTTY: true });
    const r = await runCliff(baseOpts({ dryRun: false }), deps);
    check('live ok', r.status === 'ok' && r.dryRun === false);
    check('live rpc dryRun=false', rec.rpcCalls[0].dryRun === false);
    check('live triggered_by cli', rec.rpcCalls[0].triggeredBy === 'cli');
    check('live scoped to one table', rec.rpcCalls[0].table === 'geocode_audit_log');
    check('reason passed through', rec.rpcCalls[0].reason === 'weekly retention review');
    check('no alert when error_total 0', rec.alerts.length === 0);
  }

  // error_total > 0 => alert emitted with the right class.
  {
    const { deps, rec } = makeDeps({ isTTY: true, errorTotal: 2 });
    const r = await runCliff(baseOpts({ dryRun: false }), deps);
    check('error_total>0 still ok status', r.status === 'ok');
    check('error_total>0 => alert emitted', rec.alerts.length === 1);
    check('alert class is audit_cliff_run_errors', rec.alerts[0].alertClass === CLIFF_ALERT_CLASS);
    check('alert detail carries error_total', rec.alerts[0].detail.error_total === 2);
  }

  // cliff_runs is itself a valid target (8th table).
  {
    const { deps, rec } = makeDeps({ isTTY: true });
    const r = await runCliff(baseOpts({ table: 'cliff_runs', dryRun: true }), deps);
    check('cliff_runs is a valid table', r.status === 'ok');
    check('cliff_runs rpc called', rec.rpcCalls[0].table === 'cliff_runs');
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
