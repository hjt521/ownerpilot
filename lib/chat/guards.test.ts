import {
  withinHistoryLimits,
  inputTriggersHandoff,
  outputViolates,
  latestUserText,
  _anyMatch,
  GENERIC_DECLINE,
  INPUT_REFUSAL,
  OUTPUT_REFUSAL,
  TRIGGERS_PENDING_ATTORNEY_REVIEW,
  OUTPUT_PATTERNS_PENDING_ATTORNEY_REVIEW,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_CHARS,
  type ChatMessage,
} from './guards';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; console.log(`  \u2717 ${name}${detail ? ` \u2014 ${detail}` : ''}`); }
}
function msg(role: 'user' | 'assistant', content: string): ChatMessage {
  return { role, content };
}
function many(n: number, content = 'hi'): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => msg(i % 2 === 0 ? 'user' : 'assistant', content));
}

console.log('\n=== H3 history caps (ruling §5) ===\n');
{
  check('empty history ok', withinHistoryLimits([]));
  check('normal small history ok', withinHistoryLimits([msg('user', 'how do I raise rent?')]));
  check(`exactly ${MAX_MESSAGES} messages ok`, withinHistoryLimits(many(MAX_MESSAGES)));
  check(`${MAX_MESSAGES + 1} messages rejected`, !withinHistoryLimits(many(MAX_MESSAGES + 1)));

  const atLimit = msg('user', 'a'.repeat(MAX_MESSAGE_CHARS));
  check('per-message at cap ok', withinHistoryLimits([atLimit]));
  const overLimit = msg('user', 'a'.repeat(MAX_MESSAGE_CHARS + 1));
  check('per-message over cap rejected', !withinHistoryLimits([overLimit]));

  // total cap: many messages each under per-message cap but summing over total.
  const chunk = 'a'.repeat(2500); // under 4000
  const big = Array.from({ length: 25 }, () => msg('user', chunk)); // 25*2500 = 62,500 > 50,000, 25 msgs < 32
  check('count under cap but total over cap rejected',
    big.length <= MAX_MESSAGES && !withinHistoryLimits(big), `total=${25 * 2500}`);

  const okTotal = Array.from({ length: 10 }, () => msg('user', chunk)); // 25,000 < 50,000
  check('total under cap ok', withinHistoryLimits(okTotal));
}

console.log('\n=== latestUserText ===\n');
{
  check('returns last user turn', latestUserText([
    msg('user', 'first'), msg('assistant', 'reply'), msg('user', 'second'),
  ]) === 'second');
  check('skips trailing assistant turn', latestUserText([
    msg('user', 'only user'), msg('assistant', ''),
  ]) === 'only user');
  check('empty when no user turn', latestUserText([msg('assistant', 'x')]) === '');
}

console.log('\n=== H1 match engine works (mechanism proof) ===\n');
{
  // Prove the engine fires with a TEMPORARY local pattern (NOT shipped) — the
  // real lists arrive from the attorney after the §2 diff.
  const tmp = [/\bunlawful\s+detainer\b/i];
  check('engine matches a sample pattern', _anyMatch(tmp, 'we have an Unlawful Detainer hearing'));
  check('engine does not match unrelated text', !_anyMatch(tmp, 'how do I price my rental?'));
}

console.log('\n=== H1 scaffold is INERT until attorney delivers patterns ===\n');
{
  check('trigger list is empty placeholder', TRIGGERS_PENDING_ATTORNEY_REVIEW.length === 0);
  check('output pattern list is empty placeholder', OUTPUT_PATTERNS_PENDING_ATTORNEY_REVIEW.length === 0);
  check('input pre-check never fires yet', !inputTriggersHandoff('tenant filed an unlawful detainer and bankruptcy'));
  check('output guard never fires yet', !outputViolates('here is a 3-day notice you could serve...'));
}

console.log('\n=== Attorney refusal copy is verbatim (ruling 2026-06-07 §A.3) ===\n');
{
  check('GENERIC_DECLINE matches the 2026-06-06 ruling string',
    GENERIC_DECLINE === "I'm not able to help with that here — please contact support.");

  // INPUT_REFUSAL (§A.3.a): verbatim, bold stripped, paragraphs joined with blank lines.
  check('INPUT_REFUSAL opens with the verbatim first line',
    INPUT_REFUSAL.startsWith("That sounds like a situation that needs a lawyer working with you directly, not a chatbot."));
  check('INPUT_REFUSAL ends with the verbatim closing line',
    INPUT_REFUSAL.endsWith("If you have a different question that doesn't touch any of the above, ask away."));
  check('INPUT_REFUSAL names the /our-approach separation-of-counsel posture',
    INPUT_REFUSAL.includes('/our-approach'));
  check('INPUT_REFUSAL has four paragraphs', INPUT_REFUSAL.split('\n\n').length === 4);
  check('INPUT_REFUSAL carries no doc-formatting bold/quote artifacts',
    !INPUT_REFUSAL.includes('**') && !INPUT_REFUSAL.startsWith('"') && !INPUT_REFUSAL.endsWith('"'));

  // OUTPUT_REFUSAL (§A.3.b): the "reset" framing is load-bearing per the ruling.
  check('OUTPUT_REFUSAL opens with the verbatim reset framing',
    OUTPUT_REFUSAL.startsWith("I was about to answer that in a way I shouldn't — let me stop and reset."));
  check('OUTPUT_REFUSAL ends with the verbatim re-ask invitation',
    OUTPUT_REFUSAL.endsWith("If your question can be re-asked in that frame, I'll take another run at it."));
  check('OUTPUT_REFUSAL has three paragraphs', OUTPUT_REFUSAL.split('\n\n').length === 3);
  check('OUTPUT_REFUSAL carries no doc-formatting bold/quote artifacts',
    !OUTPUT_REFUSAL.includes('**') && !OUTPUT_REFUSAL.startsWith('"') && !OUTPUT_REFUSAL.endsWith('"'));

  // Guards remain INERT until the §A.4 pattern sign-off (lists still empty).
  check('input/output guards still inert (patterns pending §A.4 sign-off)',
    !inputTriggersHandoff('tenant filed an unlawful detainer and bankruptcy') &&
    !outputViolates('here is a 3-day notice you could serve...'));
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
