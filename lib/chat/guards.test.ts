import {
  withinHistoryLimits,
  inputTriggersHandoff,
  outputViolates,
  latestUserText,
  inputFires,
  outputFires,
  GENERIC_DECLINE,
  INPUT_REFUSAL,
  OUTPUT_REFUSAL,
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
const msg = (role: 'user' | 'assistant', content: string): ChatMessage => ({ role, content });

console.log('\n=== H3 history caps (ruling §5) ===\n');
{
  check('empty history ok', withinHistoryLimits([]));
  check('normal small history ok', withinHistoryLimits([msg('user', 'hi'), msg('assistant', 'hello')]));
  check('exactly MAX_MESSAGES ok', withinHistoryLimits(Array.from({ length: MAX_MESSAGES }, () => msg('user', 'x'))));
  check('over MAX_MESSAGES rejected', !withinHistoryLimits(Array.from({ length: MAX_MESSAGES + 1 }, () => msg('user', 'x'))));
  check('per-message at cap ok', withinHistoryLimits([msg('user', 'a'.repeat(MAX_MESSAGE_CHARS))]));
  check('per-message over cap rejected', !withinHistoryLimits([msg('user', 'a'.repeat(MAX_MESSAGE_CHARS + 1))]));
  check('total over cap rejected', !withinHistoryLimits(
    Array.from({ length: 20 }, () => msg('user', 'a'.repeat(Math.ceil(MAX_TOTAL_CHARS / 20) + 5)))
  ));
}

console.log('\n=== latestUserText ===\n');
{
  check('returns last user turn', latestUserText([msg('user', 'a'), msg('assistant', 'b'), msg('user', 'c')]) === 'c');
  check('skips trailing assistant turn', latestUserText([msg('user', 'a'), msg('assistant', 'b')]) === 'a');
  check('empty when no user turn', latestUserText([msg('assistant', 'b')]) === '');
}

console.log('\n=== Attorney refusal copy is verbatim (ruling 2026-06-07 §A.3) ===\n');
{
  check('GENERIC_DECLINE matches the 2026-06-06 ruling string',
    GENERIC_DECLINE === "I'm not able to help with that here — please contact support.");
  check('INPUT_REFUSAL opens with the verbatim first line',
    INPUT_REFUSAL.startsWith("That sounds like a situation that needs a lawyer working with you directly, not a chatbot."));
  check('INPUT_REFUSAL ends with the verbatim closing line',
    INPUT_REFUSAL.endsWith("If you have a different question that doesn't touch any of the above, ask away."));
  check('INPUT_REFUSAL has four paragraphs', INPUT_REFUSAL.split('\n\n').length === 4);
  check('OUTPUT_REFUSAL opens with the verbatim reset framing',
    OUTPUT_REFUSAL.startsWith("I was about to answer that in a way I shouldn't — let me stop and reset."));
  check('OUTPUT_REFUSAL has three paragraphs', OUTPUT_REFUSAL.split('\n\n').length === 3);
  check('no doc-formatting artifacts',
    !INPUT_REFUSAL.includes('**') && !OUTPUT_REFUSAL.includes('**'));
}

console.log('\n=== H1 LIVE — canonical hit per category (graduated 2026-06-07) ===\n');
{
  check('A.1.1 fires on a served UD complaint',
    inputFires('The tenant was served with an unlawful detainer complaint.') === 'A.1.1');
  check('A.1.2 fires on bankruptcy', inputFires('My tenant just filed for bankruptcy.') === 'A.1.2');
  check('A.1.3 fires on a reasonable-accommodation request',
    inputFires('My tenant requested a reasonable accommodation.') === 'A.1.3');
  check('A.1.4 fires on a DV restraining order',
    inputFires('There is a restraining order tied to domestic violence.') === 'A.1.4');
  check('A.1.5 fires on habitability rent-withholding',
    inputFires('They are withholding rent citing habitability problems.') === 'A.1.5');
  check('A.2.1 fires on notice boilerplate',
    outputFires('YOU ARE HEREBY NOTIFIED that you must pay or quit.') === 'A.2.1');
  check('A.2.2 fires on a verdict-shape conclusion',
    outputFires('Yes, you can legally evict for that.') === 'A.2.2');
  check('A.2.3 fires on cash-for-keys tactics', outputFires('You could offer cash-for-keys.') === 'A.2.3');
  check('A.2.4 fires on a named firm', outputFires('Contact the Law Offices of Jameson.') === 'A.2.4');
}

console.log('\n=== H1 LIVE — canonical benign passes (no over-trigger) ===\n');
{
  check('benign rent-cap question does not fire input', inputFires('How do I raise rent under AB 1482?') === null);
  check('general 3-day-notice info does not fire output',
    outputFires('California requires 3 days written notice for nonpayment, excluding weekends and judicial holidays.') === null);
  check('Decision 5: general "go to court to evict" no longer fires A.1.1',
    inputFires('Do I need to go to court to evict someone in California?') === null);
  check('Decision 2: a year ("built in 1941") does not fire A.1.5',
    inputFires('My building was built in 1941.') === null);
  check('Decision 3: general fair-housing question no longer fires regex A.1.3 (classifier scope)',
    inputFires('What does the Fair Housing Act protect against, generally?') === null);
}

console.log('\n=== H1 LIVE — wiring + allow-list ===\n');
{
  check('inputTriggersHandoff true on litigation', inputTriggersHandoff('We have an unlawful detainer trial date.') === true);
  check('inputTriggersHandoff false on benign', inputTriggersHandoff('How do security deposits work?') === false);
  check('outputViolates true on a drafted notice', outputViolates('Notice to Pay Rent or Quit: you have three (3) days...') === true);
  check('outputViolates false on general info', outputViolates('A 30-day notice is generally used for month-to-month terminations.') === false);
  check('A.2.4 allow-list: INPUT_REFUSAL does not trip the output guard', outputViolates(INPUT_REFUSAL) === false);
  check('A.2.4 allow-list: OUTPUT_REFUSAL does not trip the output guard', outputViolates(OUTPUT_REFUSAL) === false);
}

console.log(`\n${'-'.repeat(40)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);
if (failed > 0) process.exit(1);
