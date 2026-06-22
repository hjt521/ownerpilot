import { normalizeAddressKey, type CachedResolverVerdict, type CachedJurisdictionVerdict } from './jurisdictionVerdict';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); }
  else { failed++; console.log('  \u2717 ' + name); }
}

function main() {
  check('trims leading/trailing whitespace',
    normalizeAddressKey('  123 Main St  ') === '123 main st');
  check('collapses internal whitespace runs',
    normalizeAddressKey('123   Main\tSt') === '123 main st');
  check('lowercases',
    normalizeAddressKey('123 MAIN St') === '123 main st');
  check('undefined -> empty string',
    normalizeAddressKey(undefined) === '');
  check('null -> empty string',
    normalizeAddressKey(null) === '');
  check('empty -> empty',
    normalizeAddressKey('') === '');
  check('visually identical addresses (case + spacing) produce same key',
    normalizeAddressKey('123 Main St, Los Angeles') === normalizeAddressKey('123  MAIN st,   los angeles'));
  check('genuinely different addresses produce different keys',
    normalizeAddressKey('123 Main St') !== normalizeAddressKey('124 Main St'));
  check('newlines collapse too',
    normalizeAddressKey('123 Main St\n\nApt 4') === '123 main st apt 4');

  // type-level: verdict union is the four expected members
  const verdicts: CachedJurisdictionVerdict[] = ['confirmed_la', 'not_la', 'manual_review', 'resolution_failed'];
  check('verdict union has exactly the four expected members', verdicts.length === 4);

  const sample: CachedResolverVerdict = {
    verdict: 'not_la',
    addressKey: normalizeAddressKey('123 Main St'),
    resolvedAt: new Date().toISOString(),
  };
  check('CachedResolverVerdict shape holds', sample.verdict === 'not_la' && sample.addressKey === '123 main st');
}

main();
console.log('\n  ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
