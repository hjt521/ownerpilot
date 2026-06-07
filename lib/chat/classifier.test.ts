import {
  parseClassifierVerdict,
  verdictFlagsSide,
  buildClassifierInput,
  runClassifier,
  classifierBlocks,
  isUnsure,
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

  console.log('\n=== locked prompt wired ===\n');
  check('CLASSIFIER_PROMPT is the verbatim attorney text', CLASSIFIER_PROMPT.includes('You are a safety classifier for OwnerPilot'));
  check('prompt defines dv_context_oblique', CLASSIFIER_PROMPT.includes('dv_context_oblique'));
  check('prompt carries the §1940.3 immigration carve-out', CLASSIFIER_PROMPT.includes('1940.3'));

  console.log(`\n${'-'.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`${'-'.repeat(40)}\n`);
  if (failed > 0) process.exit(1);
})();
