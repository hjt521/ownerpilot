/**
 * Slice 8 -- section8Core (deliverable 4b) tests: the PURE decomposition + verdict.
 *
 * 4b model (durable-vs-durable): three counts (D / R_h / R_t) -> two symmetric
 * orphan quantities (freeze_dispositions_orphaned = D - R_h, freeze_audit_orphaned
 * = R_t - R_h) -> verdict. No log parsing, no recovery set, no wfu, no read-time
 * classification (Fork D/F-a). This file proves the arithmetic + the threshold
 * table (substrate-divergence red, negative-residual red, >=2 red, ==1 yellow,
 * NF-2 INDEPENDENT chains per Fork E). The monitor wiring is proven in
 * section8MonitorCore.test.ts; the end-to-end reconciliation in
 * section8.verification.test.ts.
 */
import {
  computeSection8Components,
  computeSection8Verdict,
  ROW_WRITING_DISPOSITIONS,
  NO_ROW_BY_DESIGN_DISPOSITIONS,
  type Section8Counts,
  type Section8Components,
} from './section8Core';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const counts = (D: number, R_h: number, R_t: number): Section8Counts => ({ D, R_h, R_t });
const comp = (fd: number, fa: number): Section8Components => ({
  freeze_dispositions_orphaned: fd,
  freeze_audit_orphaned: fa,
});
/** verdict from raw counts + prior (computes components internally). */
const V = (c: Section8Counts, prior: Section8Components | null): string =>
  computeSection8Verdict(c, computeSection8Components(c), prior);

function main() {
  // ---- classification sets (canonical reference; consumed by route.ts) ----
  check('sets: four row-writing dispositions', ROW_WRITING_DISPOSITIONS.size === 4);
  check('sets: confirmed_la / not_la / manual_review / gate_closed are row-writing',
    ROW_WRITING_DISPOSITIONS.has('confirmed_la') && ROW_WRITING_DISPOSITIONS.has('not_la') &&
    ROW_WRITING_DISPOSITIONS.has('manual_review') && ROW_WRITING_DISPOSITIONS.has('gate_closed'));
  check('sets: three no-row-by-design dispositions', NO_ROW_BY_DESIGN_DISPOSITIONS.size === 3);
  check('sets: invalid_json / address_required / geocode_unavailable are no-row-by-design',
    NO_ROW_BY_DESIGN_DISPOSITIONS.has('invalid_json') && NO_ROW_BY_DESIGN_DISPOSITIONS.has('address_required') &&
    NO_ROW_BY_DESIGN_DISPOSITIONS.has('geocode_unavailable'));
  check('sets: disjoint', [...ROW_WRITING_DISPOSITIONS].every((d) => !NO_ROW_BY_DESIGN_DISPOSITIONS.has(d)));

  // ---- decomposition arithmetic ----
  check('comp: balanced -> both 0', (() => { const c = computeSection8Components(counts(5, 5, 5)); return c.freeze_dispositions_orphaned === 0 && c.freeze_audit_orphaned === 0; })());
  check('comp: disposition orphan = D - R_h', computeSection8Components(counts(3, 1, 1)).freeze_dispositions_orphaned === 2);
  check('comp: audit orphan = R_t - R_h', computeSection8Components(counts(4, 4, 6)).freeze_audit_orphaned === 2);
  check('comp: negative disposition orphan permitted (substrate bug)', computeSection8Components(counts(1, 3, 3)).freeze_dispositions_orphaned === -2);
  check('comp: negative audit orphan permitted', computeSection8Components(counts(5, 5, 2)).freeze_audit_orphaned === -3);

  // ---- verdict: greens ----
  check('verdict: balanced -> green', V(counts(5, 5, 5), null) === 'green');
  check('verdict: quiet 0/0/0 -> green', V(counts(0, 0, 0), null) === 'green');

  // ---- verdict: substrate divergence (D==0 AND R_t>0) -> red, takes precedence ----
  check('verdict: D=0 R_t>0 -> red', V(counts(0, 0, 3), null) === 'red');
  check('verdict: divergence precedence over would-be-negative', V(counts(0, 0, 5), null) === 'red');

  // ---- verdict: negative residual -> red ----
  check('verdict: negative disposition orphan -> red', V(counts(1, 3, 3), null) === 'red');
  check('verdict: negative audit orphan -> red', V(counts(5, 5, 3), null) === 'red');

  // ---- verdict: >= 2 -> red ----
  check('verdict: disposition orphan 2 -> red', V(counts(2, 0, 0), null) === 'red');
  check('verdict: audit orphan 2 -> red', V(counts(5, 3, 5), null) === 'red');

  // ---- verdict: == 1 -> yellow first occurrence ----
  check('verdict: disposition orphan 1, no prior -> yellow', V(counts(1, 0, 0), null) === 'yellow');
  check('verdict: audit orphan 1 amid traffic, no prior -> yellow', V(counts(4, 4, 5), null) === 'yellow');
  check('verdict: both orphans 1 same run, no prior -> yellow', V(counts(5, 4, 5), null) === 'yellow');

  // ---- verdict: NF-2 independent chains (Fork E) ----
  check('chain: disposition orphan 1 + prior disposition orphan 1 -> red', V(counts(1, 0, 0), comp(1, 0)) === 'red');
  check('chain: audit orphan 1 + prior audit orphan 1 -> red', V(counts(4, 4, 5), comp(0, 1)) === 'red');
  check('chain: chains do NOT cross (disp now, audit prior) -> yellow', V(counts(1, 0, 0), comp(0, 1)) === 'yellow');
  check('chain: chains do NOT cross (audit now, disp prior) -> yellow', V(counts(4, 4, 5), comp(1, 0)) === 'yellow');
  check('chain: prior green (0,0) does not escalate -> yellow', V(counts(1, 0, 0), comp(0, 0)) === 'yellow');

  // ---- verdict: red severity beats the chain (>=2 regardless of prior) ----
  check('verdict: orphan 2 stays red even with prior 0', V(counts(2, 0, 0), comp(0, 0)) === 'red');
}

main();
console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
