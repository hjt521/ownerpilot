/**
 * A-2 diff emitter — predicate-9 artifact guard (A-3 §8.3 predicate 9).
 *
 * Asserts the committed example packet (produced by scripts/emit_a2_diff_packet.py
 * against the synthetic fixture pair under __fixtures__/a2/) has the expected shape
 * and correctly distinguishes ADD (auto_apply) / REMOVE (broker_review) /
 * CORPUS-IMPACT (build_halt) per the A-2 reconciliation discipline. Guards the
 * committed artifact against drift; the emitter logic itself lives in the Python
 * construction rail (§2.4 step 13).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const packet = JSON.parse(
  readFileSync(join(here, '__fixtures__', 'a2', 'expected_packet.json'), 'utf8'),
);

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name); }
}

console.log('\n=== A-2 emitter packet shape ===');
check('artifact tag is A2 diff packet', packet.artifact === 'workstream_a_A2_diff_packet');
check('baseline + candidate sha256 present',
  typeof packet.baseline?.sha256 === 'string' && typeof packet.candidate?.sha256 === 'string');

console.log('\n=== three-disposition distinction (A-2 §2.1/§2.2/§2.3) ===');
check('summary: 1 ADD', packet.summary.add === 1);
check('summary: 2 REMOVE', packet.summary.remove === 2);
check('summary: 1 corpus-impact', packet.summary.corpus_impact === 1);
check('summary: 1 add auto_apply', packet.summary.add_auto_apply === 1);
check('summary: 1 remove broker_review', packet.summary.remove_broker_review === 1);
check('summary: 1 build_halt', packet.summary.build_halt === 1);

const byZip = Object.fromEntries(
  [...packet.add, ...packet.remove].map((r: any) => [r.zip5, r]),
);
check('ADD 90099 → auto_apply', byZip['90099']?.disposition === 'auto_apply');
check('REMOVE 91608 (non-corpus) → broker_review',
  byZip['91608']?.disposition === 'broker_review' && byZip['91608']?.corpus_impact === false);
check('REMOVE 91343 (corpus-load-bearing) → build_halt',
  byZip['91343']?.disposition === 'build_halt' && byZip['91343']?.corpus_impact === true);

console.log('\n=== outcome gating ===');
check('outcome is BUILD_HALT (corpus-impact present)',
  typeof packet.outcome === 'string' && packet.outcome.startsWith('BUILD_HALT'));
check('corpus_impact_rows lists 91343',
  Array.isArray(packet.corpus_impact_rows)
  && packet.corpus_impact_rows.some((r: any) => r.zip5 === '91343'));

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
