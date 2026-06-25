/**
 * Step-2 regression tests:
 *  - RTC_FORM_BASELINE_HASHES carries the CORRECTED Jun-16 english + spanish
 *    hashes (acceptance determinations' MUST-FIX), all nine present.
 *  - laLanguageGate is fail-closed: while the LA-wide gate is closed (all deps
 *    false at HEAD), NO language is unblocked. No bypass.
 */
import {
  RTC_FORM_BASELINE_HASHES,
  RTC_FORM_LAST_MODIFIED,
} from './rtcFormBaselines';
import { isLaLanguageUnblocked } from './laLanguageGate';
import { RTC_PUBLISHED_LANGUAGES, isLaProductionUnblocked } from './laRtcRules';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); }
  else { failed++; console.log('  \u2717 ' + name); }
}

const ENGLISH_JUN16 = 'd0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a';
const SPANISH_JUN16 = '947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371';

console.log('\n=== corrected Jun-16 baseline hashes (acceptance MUST-FIX) ===');
check('english baseline is the Jun-16 corrected hash',
  RTC_FORM_BASELINE_HASHES.english === ENGLISH_JUN16);
check('spanish baseline is the Jun-16 CORRECTED (888-phone) hash',
  RTC_FORM_BASELINE_HASHES.spanish === SPANISH_JUN16);
check('english last-modified is the Jun-16 timestamp',
  RTC_FORM_LAST_MODIFIED.english === '2026-06-16T21:03:44Z');
check('spanish last-modified is the Jun-16 timestamp',
  RTC_FORM_LAST_MODIFIED.spanish === '2026-06-16T21:03:55Z');

console.log('\n=== all nine baselines present, well-formed, no Aug-2025 spanish ===');
check('all nine languages have a baseline hash',
  RTC_PUBLISHED_LANGUAGES.every((l) => typeof RTC_FORM_BASELINE_HASHES[l] === 'string'));
check('all nine hashes are 64-hex SHA-256',
  RTC_PUBLISHED_LANGUAGES.every((l) => /^[0-9a-f]{64}$/.test(RTC_FORM_BASELINE_HASHES[l])));
check('all nine languages have a last-modified',
  RTC_PUBLISHED_LANGUAGES.every((l) => typeof RTC_FORM_LAST_MODIFIED[l] === 'string'));
// the Aug-2025 spanish hash is unknown to build, but we can assert spanish is the Jun-16 value (not anything else)
check('spanish baseline is exactly the Jun-16 hash (Aug-2025 typo form not represented)',
  RTC_FORM_BASELINE_HASHES.spanish === SPANISH_JUN16);

async function main() {
  console.log('\n=== per-language gate is fail-closed while LA-wide gate is closed ===');
  check('LA-wide gate is closed at HEAD (all deps false)', isLaProductionUnblocked() === false);
  check('english is NOT unblocked (gate closed)',
    (await isLaLanguageUnblocked({ language: 'english' })) === false);
  check('spanish is NOT unblocked (gate closed)',
    (await isLaLanguageUnblocked({ language: 'spanish' })) === false);
  check('every language is fail-closed while the gate is closed',
    (await Promise.all(RTC_PUBLISHED_LANGUAGES.map((l) => isLaLanguageUnblocked({ language: l })))).every(
      (v) => v === false,
    ));

  console.log('\n----------------------------------------');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------');
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
