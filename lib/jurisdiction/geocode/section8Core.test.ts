/**
 * Slice 8 -- section8Core decomposition + threshold tests.
 *
 * Proves the §3.2 four-component arithmetic and the §3.5 threshold table on
 * deterministic synthetic inputs. Pure; no resolver, no DB, no logs. The
 * resolver-driven integration test lives in section8.verification.test.ts.
 */
import {
  computeSection8Components,
  computeSection8Verdict,
  ROW_WRITING_DISPOSITIONS,
  NO_ROW_BY_DESIGN_DISPOSITIONS,
  type Section8Input,
  type Section8DispositionEvent,
  type Section8Components,
  type Section8Verdict,
} from './section8Core';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const h = (s: string) => 'hash_' + s;
const rows = (...hs: string[]) => hs.map((x) => ({ decision_input_hash: h(x) }));
const recovery = (...hs: string[]) => new Set(hs.map(h));
const ev = (disposition: Section8DispositionEvent['disposition'], hashKey?: string): Section8DispositionEvent =>
  hashKey === undefined ? { disposition } : { disposition, decision_input_hash: h(hashKey) };

function input(over: Partial<Section8Input>): Section8Input {
  return {
    windowRows: [],
    dispositionEvents: [],
    failureEvents: [],
    recoveryRowHashes: new Set<string>(),
    ...over,
  };
}

function main() {
  // 0. Set hygiene: the two disposition sets partition the 7-value union.
  {
    check('row-writing set has 4 members', ROW_WRITING_DISPOSITIONS.size === 4);
    check('no-row-by-design set has 3 members', NO_ROW_BY_DESIGN_DISPOSITIONS.size === 3);
    const overlap = [...ROW_WRITING_DISPOSITIONS].filter((d) => NO_ROW_BY_DESIGN_DISPOSITIONS.has(d));
    check('the two sets are disjoint', overlap.length === 0);
    check('gate_closed is row-writing', ROW_WRITING_DISPOSITIONS.has('gate_closed'));
    check('geocode_unavailable is no-row-by-design', NO_ROW_BY_DESIGN_DISPOSITIONS.has('geocode_unavailable'));
  }

  // 1. Clean window: every row-writing disposition has its row. freeze 0 -> green.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'a'), ev('confirmed_la', 'b'), ev('not_la', 'c'), ev('manual_review', 'd'), ev('gate_closed', 'e')],
      windowRows: rows('a', 'b', 'c', 'd', 'e'),
      recoveryRowHashes: recovery('a', 'b', 'c', 'd', 'e'),
    }));
    check('clean: rows_written 5', c.rows_written === 5);
    check('clean: write_failures_unrecovered 0', c.write_failures_unrecovered === 0);
    check('clean: dispositions_with_no_row_by_design 0', c.dispositions_with_no_row_by_design === 0);
    check('clean: freeze_loss_suspected 0', c.freeze_loss_suspected === 0);
    check('clean: verdict green', computeSection8Verdict(c, null) === 'green');
  }

  // 2. By-design no-row dispositions: counted in N3, NOT in the N4 numerator.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('invalid_json'), ev('address_required'), ev('geocode_unavailable')],
    }));
    check('by-design: rows_written 0', c.rows_written === 0);
    check('by-design: N3 == 3', c.dispositions_with_no_row_by_design === 3);
    check('by-design: freeze 0 (not counted as row-writing)', c.freeze_loss_suspected === 0);
    check('by-design: verdict green', computeSection8Verdict(c, null) === 'green');
  }

  // 3. One freeze-loss: a row-writing disposition with NO row and NO failure
  //    event (the freeze-loss signature). freeze 1 -> yellow (first occurrence).
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'x')],
      windowRows: [],
      recoveryRowHashes: new Set<string>(),
    }));
    check('freeze-loss: freeze_loss_suspected 1', c.freeze_loss_suspected === 1);
    check('freeze-loss: wfu 0 (no failure event)', c.write_failures_unrecovered === 0);
    check('freeze-loss: verdict yellow on first occurrence', computeSection8Verdict(c, null) === 'yellow');
    check('freeze-loss: verdict green-prior still yellow', computeSection8Verdict(c, 'green') === 'yellow');
    check('freeze-loss: verdict red if prior yellow (consecutive)', computeSection8Verdict(c, 'yellow') === 'red');
    check('freeze-loss: verdict red if prior red', computeSection8Verdict(c, 'red') === 'red');
  }

  // 4. Write-failure UNRECOVERED: disposition + failure event, no row anywhere.
  //    N4 nets to 0 (the disposition is explained by the failure), but wfu drives red.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'y')],
      windowRows: [],
      failureEvents: [{ decision_input_hash: h('y') }],
      recoveryRowHashes: new Set<string>(),
    }));
    check('wfu: write_failures_unrecovered 1', c.write_failures_unrecovered === 1);
    check('wfu: freeze_loss_suspected 0 (failure accounts for it)', c.freeze_loss_suspected === 0);
    check('wfu: verdict red despite freeze 0', computeSection8Verdict(c, null) === 'red');
  }

  // 5. Write-failure RECOVERED: failure event present but the row exists in the
  //    recovery set (arrived late). wfu 0 -> green.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'z')],
      windowRows: rows('z'),
      failureEvents: [{ decision_input_hash: h('z') }],
      recoveryRowHashes: recovery('z'),
    }));
    check('recovered: rows_written 1', c.rows_written === 1);
    check('recovered: wfu 0 (row exists in recovery set)', c.write_failures_unrecovered === 0);
    check('recovered: freeze 0', c.freeze_loss_suspected === 0);
    check('recovered: verdict green', computeSection8Verdict(c, null) === 'green');
  }

  // 6. freeze >= 2 -> red regardless of prior verdict.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'p'), ev('not_la', 'q')],
      windowRows: [],
    }));
    check('freeze>=2: freeze_loss_suspected 2', c.freeze_loss_suspected === 2);
    check('freeze>=2: verdict red with prior null', computeSection8Verdict(c, null) === 'red');
    check('freeze>=2: verdict red with prior green', computeSection8Verdict(c, 'green') === 'red');
  }

  // 7. Negative residual -> red (substrate bug): more rows than row-writing
  //    dispositions (disposition log dropped events, or a non-route writer).
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('confirmed_la', 'm')],
      windowRows: rows('m', 'n'),
      recoveryRowHashes: recovery('m', 'n'),
    }));
    check('negative: freeze_loss_suspected -1', c.freeze_loss_suspected === -1);
    check('negative: verdict red (substrate bug)', computeSection8Verdict(c, null) === 'red');
  }

  // 8. gate_closed is row-writing: a gate_closed disposition with no row is a
  //    freeze-loss candidate exactly like a verdict row.
  {
    const c = computeSection8Components(input({
      dispositionEvents: [ev('gate_closed', 'g')],
      windowRows: [],
    }));
    check('gate_closed: contributes to freeze residual', c.freeze_loss_suspected === 1);
  }

  // 9. Mixed one-shot green-light set: one of each row-writing disposition with
  //    rows, plus the three by-design error dispositions. The pre-go-live pass
  //    criterion (§2.5): freeze 0, wfu 0, N3 == injected error count (3).
  {
    const c = computeSection8Components(input({
      dispositionEvents: [
        ev('confirmed_la', 'r1'), ev('not_la', 'r2'), ev('manual_review', 'r3'), ev('gate_closed', 'r4'),
        ev('invalid_json'), ev('address_required'), ev('geocode_unavailable'),
      ],
      windowRows: rows('r1', 'r2', 'r3', 'r4'),
      recoveryRowHashes: recovery('r1', 'r2', 'r3', 'r4'),
    }));
    const injectedErrorCount = 3;
    const oneShotPass = c.freeze_loss_suspected === 0 && c.write_failures_unrecovered === 0 && c.dispositions_with_no_row_by_design === injectedErrorCount;
    check('one-shot: freeze 0', c.freeze_loss_suspected === 0);
    check('one-shot: wfu 0', c.write_failures_unrecovered === 0);
    check('one-shot: N3 matches injected error count exactly', c.dispositions_with_no_row_by_design === injectedErrorCount);
    check('one-shot: pre-go-live pass criterion satisfied', oneShotPass);
    check('one-shot: verdict green', computeSection8Verdict(c, null) === 'green');
  }

  // 10. Verdict precedence table spot-checks against §3.5.
  {
    const mk = (over: Partial<Section8Components>): Section8Components => ({ rows_written: 0, write_failures_unrecovered: 0, dispositions_with_no_row_by_design: 0, freeze_loss_suspected: 0, ...over });
    const cases: Array<[Partial<Section8Components>, Section8Verdict | null, Section8Verdict]> = [
      [{ freeze_loss_suspected: 0, write_failures_unrecovered: 0 }, null, 'green'],
      [{ freeze_loss_suspected: 1 }, null, 'yellow'],
      [{ freeze_loss_suspected: 1 }, 'green', 'yellow'],
      [{ freeze_loss_suspected: 1 }, 'yellow', 'red'],
      [{ freeze_loss_suspected: 1 }, 'red', 'red'],
      [{ freeze_loss_suspected: 2 }, null, 'red'],
      [{ freeze_loss_suspected: 5 }, 'green', 'red'],
      [{ write_failures_unrecovered: 1 }, null, 'red'],
      [{ write_failures_unrecovered: 1, freeze_loss_suspected: 0 }, 'green', 'red'],
      [{ freeze_loss_suspected: -1 }, null, 'red'],
      [{ freeze_loss_suspected: -3 }, 'green', 'red'],
    ];
    let all = true;
    for (const [c, prior, want] of cases) {
      const got = computeSection8Verdict(mk(c), prior);
      if (got !== want) { all = false; console.log(`    mismatch: ${JSON.stringify(c)} prior=${prior} -> ${got}, want ${want}`); }
    }
    check('verdict precedence table matches §3.5 for all spot-checks', all);
  }
}

main();
console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
