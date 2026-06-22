import {
  parseClassifierVerdict,
  verdictFlagsSide,
  buildClassifierInput,
  runClassifier,
  classifierBlocks,
  isUnsure,
  classifierDecision,
  classifyClassifierError,
  INPUT_CATEGORIES,
  OUTPUT_CATEGORIES,
  type CompleteFn,
} from './classifier';
import { CLASSIFIER_PROMPT } from './classifierPrompt';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
const stub = (text: string, tokens = 10): CompleteFn => async () => ({ text, tokens });
const throwing: CompleteFn = async () => { throw new Error('timeout'); };

console.log('\n=== verdict parsing ===\n');
{
  const a = parseClassifierVerdict('{"flagged": false, "categories": []}');
  check('clean negative parses', a.flagged === false && a.categories.length === 0);

  const b = parseClassifierVerdict('{"flagged": true, "categories": ["discrimination_context"]}');
  check('clean positive parses', b.flagged === true && b.categories[0] === 'discrimination_context');

  const c = parseClassifierVerdict('```json\n{"flagged": true, "categories": ["legal_conclusion"]}\n```');
  check('strips markdown fence', c.flagged === true && c.categories[0] === 'legal_conclusion');

  const d = parseClassifierVerdict('Sure! Here is the verdict: {"flagged": true, "categories": ["unsure"]} hope that helps');
  check('extracts JSON from surrounding prose', d.flagged === true && d.categories[0] === 'unsure');

  const e = parseClassifierVerdict('{"categories": ["notice_draft"]}');
  check('recall-favoring: categories present but flagged missing → flagged true', e.flagged === true);

  let threw = false;
  try { parseClassifierVerdict('not json at all'); } catch { threw = true; }
  check('malformed output throws (caller fail-opens)', threw);
}

console.log('\n=== side routing ===\n');
{
  check('input category flags input side',
    verdictFlagsSide({ flagged: true, categories: ['retaliation_oblique'] }, 'input') === true);
  check('output category does NOT flag input side',
    verdictFlagsSide({ flagged: true, categories: ['legal_conclusion'] }, 'input') === false);
  check('output category flags output side',
    verdictFlagsSide({ flagged: true, categories: ['legal_conclusion'] }, 'output') === true);
  check('unsure flags either side (input)',
    verdictFlagsSide({ flagged: true, categories: ['unsure'] }, 'input') === true);
  check('unsure flags either side (output)',
    verdictFlagsSide({ flagged: true, categories: ['unsure'] }, 'output') === true);
  check('dv_context_oblique is an input category', (INPUT_CATEGORIES as readonly string[]).includes('dv_context_oblique'));
  check('three input + three output categories', INPUT_CATEGORIES.length === 3 && OUTPUT_CATEGORIES.length === 3);
}

console.log('\n=== input formatting ===\n');
{
  const u = buildClassifierInput('input', 'evict my tenant', 'prior turn');
  check('includes SIDE', u.includes('SIDE: input'));
  check('includes TARGET', u.includes('TARGET:\nevict my tenant'));
  check('empty context renders (none)', buildClassifierInput('output', 'x', '').includes('(none)'));
}

console.log('\n=== runClassifier + fail-open-to-regex-floor ===\n');
(async () => {
  const ok = await runClassifier('output', 'you can legally evict', '', stub('{"flagged": true, "categories": ["legal_conclusion"]}', 42));
  check('successful flagged verdict → ok+flagged', ok.ok === true && ok.flagged === true);
  check('tokens propagate for the cap counter', ok.ok === true && ok.tokens === 42);
  check('classifierBlocks true on ok+flagged', classifierBlocks(ok) === true);

  const clean = await runClassifier('input', 'how do deposits work', '', stub('{"flagged": false, "categories": []}'));
  check('clean verdict → not flagged', clean.ok === true && clean.flagged === false);
  check('classifierBlocks false on clean', classifierBlocks(clean) === false);

  const err = await runClassifier('input', 'anything', '', throwing);
  check('model error → ok:false (never throws)', err.ok === false);
  check('FAIL-OPEN: classifierBlocks false on error', classifierBlocks(err) === false);

  const malformed = await runClassifier('output', 'x', '', stub('garbage not json'));
  check('malformed model output → ok:false (fail-open)', malformed.ok === false);

  const uns = await runClassifier('input', 'x', '', stub('{"flagged": true, "categories": ["unsure"]}'));
  check('isUnsure true when verdict carries unsure', isUnsure(uns) === true);
  check('unsure still blocks (recall-favoring)', classifierBlocks(uns) === true);

  const outOnInput = await runClassifier('input', 'x', '', stub('{"flagged": true, "categories": ["litigation_strategy"]}'));
  check('out-of-side category does not block (defensive)', classifierBlocks(outOnInput) === false);

  console.log('\n=== §4.2 fail-closed composition ===\n');
  const flaggedOk = await runClassifier('output', 'x', '', stub('{"flagged": true, "categories": ["legal_conclusion"]}'));
  const cleanOk = await runClassifier('output', 'x', '', stub('{"flagged": false, "categories": []}'));
  const errored = await runClassifier('output', 'x', '', throwing);
  check('flagged verdict blocks regardless of flag (fail-open)', classifierDecision(flaggedOk, false) === true);
  check('flagged verdict blocks regardless of flag (fail-closed)', classifierDecision(flaggedOk, true) === true);
  check('clean verdict never blocks', classifierDecision(cleanOk, false) === false && classifierDecision(cleanOk, true) === false);
  check('error + fail-open → does NOT block (degrade to regex floor)', classifierDecision(errored, false) === false);
  check('error + fail-closed → blocks (ops sustained-outage escalation)', classifierDecision(errored, true) === true);

  console.log('\n=== Slice 3b: error sanitization (reason leak closed) ===\n');
  check("classifyClassifierError: no-brace → no_json", classifyClassifierError(new Error('classifier: no JSON object found')) === 'no_json');
  check("classifyClassifierError: not-object → invalid_shape", classifyClassifierError(new Error('classifier: not an object')) === 'invalid_shape');
  check("classifyClassifierError: SyntaxError → parse_failed", classifyClassifierError(new SyntaxError('Unexpected token x')) === 'parse_failed');
  check("classifyClassifierError: other Error → model_error", classifyClassifierError(new Error('timeout')) === 'model_error');
  check("classifyClassifierError: non-Error → unknown", classifyClassifierError('boom') === 'unknown');

  const noJson = await runClassifier('input', 'x', '', stub('no json here at all'));
  check('no-brace output → no_json', noJson.ok === false && noJson.error === 'no_json');
  const badJson = await runClassifier('input', 'x', '', stub('{bad json: "tenant said something"}'));
  check('malformed JSON → parse_failed', badJson.ok === false && badJson.error === 'parse_failed');
  check('parse_failed leaks NO raw model text', !JSON.stringify(badJson).includes('tenant'));
  const modelErr = await runClassifier('input', 'x', '', throwing);
  check('complete() throw → model_error', modelErr.ok === false && modelErr.error === 'model_error');

  console.log('\n=== Slice 3b: latency + model_call_id ===\n');
  const okRes = await runClassifier('input', 'x', '', stub('{"flagged": false, "categories": []}', 7));
  check('success carries numeric latencyMs', okRes.ok === true && typeof okRes.latencyMs === 'number' && okRes.latencyMs >= 0);
  check('error carries numeric latencyMs', modelErr.ok === false && typeof modelErr.latencyMs === 'number' && modelErr.latencyMs >= 0);
  check('success modelCallId null when stub omits it', okRes.ok === true && okRes.modelCallId === null);
  check('error modelCallId is null', modelErr.ok === false && modelErr.modelCallId === null);
  const withId: CompleteFn = async () => ({ text: '{"flagged": false, "categories": []}', tokens: 5, modelCallId: 'msg_abc' });
  const idRes = await runClassifier('input', 'x', '', withId);
  check('modelCallId passes through from complete()', idRes.ok === true && idRes.modelCallId === 'msg_abc');

  console.log('\n=== locked prompt wired ===\n');
  check('CLASSIFIER_PROMPT is the verbatim attorney text', CLASSIFIER_PROMPT.includes('You are a safety classifier for OwnerPilot'));
  check('prompt defines dv_context_oblique', CLASSIFIER_PROMPT.includes('dv_context_oblique'));
  check('prompt carries the §1940.3 immigration carve-out', CLASSIFIER_PROMPT.includes('1940.3'));

  console.log(`\n${'-'.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'-'.repeat(40)}\n`);
  if (failed > 0) process.exit(1);
})();
