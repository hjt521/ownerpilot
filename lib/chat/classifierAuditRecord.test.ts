/**
 * Slice 3b — classifier audit record assembly + emission gate tests.
 * Covers the §1.2 record content, the bare-target hash (side out of the hash),
 * getDeploySha fallback, and the six §2.3 emission scenarios via classifierAuditFor.
 */
import { getDeploySha, buildClassifierAuditRecord, classifierAuditFor } from './classifierAuditRecord';
import { CLASSIFIER_MODEL } from './classifierConfig';
import type { ClassifierResult } from './classifier';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const ok = (over: Partial<Extract<ClassifierResult, { ok: true }>> = {}): ClassifierResult => ({
  ok: true, flagged: false, categories: [], tokens: 5, modelCallId: 'msg_1', latencyMs: 12, ...over,
});
const err = (): ClassifierResult => ({ ok: false, error: 'model_error', modelCallId: null, latencyMs: 8 });

async function main() {
  const savedKey = process.env.CLASSIFIER_AUDIT_HASH_KEY;
  const savedGen = process.env.CLASSIFIER_AUDIT_KEY_GENERATION;
  const savedSha = process.env.VERCEL_GIT_COMMIT_SHA;
  process.env.CLASSIFIER_AUDIT_HASH_KEY = 'testkey';
  process.env.CLASSIFIER_AUDIT_KEY_GENERATION = 'gen-2026-06';
  process.env.VERCEL_GIT_COMMIT_SHA = 'deadbeef';

  // --- getDeploySha (§4.4) ---
  check('getDeploySha reads env', getDeploySha() === 'deadbeef');
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  check("getDeploySha falls back to 'unknown'", getDeploySha() === 'unknown');
  process.env.VERCEL_GIT_COMMIT_SHA = 'deadbeef';

  // --- record content: success, not flagged → allow ---
  const rAllow = buildClassifierAuditRecord({ side: 'input', target: 'How do deposits work', result: ok(), failClosed: false });
  check('model_id = CLASSIFIER_MODEL', rAllow.model_id === CLASSIFIER_MODEL);
  check('model_call_id passthrough', rAllow.model_call_id === 'msg_1');
  check('not-flagged → verdict allow', rAllow.verdict === 'allow');
  check('decision_latency_ms passthrough', rAllow.decision_latency_ms === 12);
  check('chain_head_sha from env', rAllow.chain_head_sha === 'deadbeef');
  check('key_generation stamped', rAllow.key_generation === 'gen-2026-06');
  check('input_decision_hash non-null (key present)', typeof rAllow.input_decision_hash === 'string' && (rAllow.input_decision_hash as string).length === 64);
  check('side carried', rAllow.side === 'input');
  check('reason null on success', rAllow.reason === null);
  check('score_or_flags has flagged/categories', !!(rAllow.score_or_flags as { flagged?: boolean }).flagged === false && Array.isArray((rAllow.score_or_flags as { categories?: unknown }).categories));
  check('record has NO input_text / target field', !('input_text' in rAllow) && !('target' in rAllow));

  // --- success, flagged → block ---
  const rBlock = buildClassifierAuditRecord({ side: 'output', target: 'you would win this case', result: ok({ flagged: true, categories: ['legal_conclusion'] }), failClosed: false });
  check('flagged → verdict block', rBlock.verdict === 'block');

  // --- error result → reason is the bounded class, verdict from fail-mode ---
  const rErrOpen = buildClassifierAuditRecord({ side: 'input', target: 'x', result: err(), failClosed: false });
  check('error + fail-open → verdict allow', rErrOpen.verdict === 'allow');
  check('error → reason is bounded class', rErrOpen.reason === 'model_error');
  check('error → model_call_id null', rErrOpen.model_call_id === null);
  check('error → score_or_flags carries error_class', (rErrOpen.score_or_flags as { error_class?: string }).error_class === 'model_error');
  check('error reason leaks no raw text', !JSON.stringify(rErrOpen).includes('Error:'));
  const rErrClosed = buildClassifierAuditRecord({ side: 'input', target: 'x', result: err(), failClosed: true });
  check('error + fail-closed → verdict block', rErrClosed.verdict === 'block');

  // --- bare-target hash: same text, different side → SAME hash (side out of hash) ---
  const hIn = buildClassifierAuditRecord({ side: 'input', target: 'identical text', result: ok(), failClosed: false }).input_decision_hash;
  const hOut = buildClassifierAuditRecord({ side: 'output', target: 'identical text', result: ok(), failClosed: false }).input_decision_hash;
  check('same target hashes identically across sides', hIn === hOut && hIn !== null);
  const hDiff = buildClassifierAuditRecord({ side: 'input', target: 'different text', result: ok(), failClosed: false }).input_decision_hash;
  check('different target → different hash', hDiff !== hIn);

  // --- key missing → null hash (durability-first; sink warns) ---
  delete process.env.CLASSIFIER_AUDIT_HASH_KEY;
  const rNull = buildClassifierAuditRecord({ side: 'input', target: 'x', result: ok(), failClosed: false });
  check('key missing → input_decision_hash null', rNull.input_decision_hash === null);
  process.env.CLASSIFIER_AUDIT_HASH_KEY = 'testkey';

  // --- six §2.3 emission scenarios via classifierAuditFor ---
  check('S1 input regex pre-empt (not invoked) → no row', classifierAuditFor(false, { side: 'input', target: 'x', result: ok(), failClosed: false }) === null);
  check('S2 input classifier success → row', classifierAuditFor(true, { side: 'input', target: 'x', result: ok(), failClosed: false }) !== null);
  check('S3 input classifier error → row (ok=false)', (() => { const r = classifierAuditFor(true, { side: 'input', target: 'x', result: err(), failClosed: false }); return r !== null && r.ok === false; })());
  check('S4 output regex pre-empt (not invoked) → no row', classifierAuditFor(false, { side: 'output', target: 'x', result: ok(), failClosed: false }) === null);
  check('S5 output classifier success → row', classifierAuditFor(true, { side: 'output', target: 'x', result: ok(), failClosed: false }) !== null);
  check('S6 output classifier error → row (ok=false)', (() => { const r = classifierAuditFor(true, { side: 'output', target: 'x', result: err(), failClosed: false }); return r !== null && r.ok === false; })());

  if (savedKey === undefined) delete process.env.CLASSIFIER_AUDIT_HASH_KEY; else process.env.CLASSIFIER_AUDIT_HASH_KEY = savedKey;
  if (savedGen === undefined) delete process.env.CLASSIFIER_AUDIT_KEY_GENERATION; else process.env.CLASSIFIER_AUDIT_KEY_GENERATION = savedGen;
  if (savedSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = savedSha;
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  \u2717 unexpected error', e); process.exit(1); });
