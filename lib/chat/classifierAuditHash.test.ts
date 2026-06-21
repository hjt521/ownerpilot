/**
 * Slice 3a — classifier audit hash tests. Pins the FROZEN canonicalization
 * (ruling §4.5) and HMAC determinism (classifier-lock-conflict ruling §1.3), and
 * the durability-first null path when the key is absent (ruling §4.3).
 */
import {
  canonicalizeForHash,
  hmacInput,
  computeClassifierInputDecisionHash,
  resolveKeyGeneration,
} from './classifierAuditHash';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

// Known-answer HMAC vectors (key 'testkey', sha 'abc123').
const H_BASE = '7cb9be6f8484fa36ed628162058114e7e389c42c60d0d7baa25f9865a2ce9b42';
const H_CAFE = '71a3e3da4a9659f7b007cff481c8bc381c14e9ad07a7e8b387de948f8ad4c7f5';

function hash(input: string, sha: string, key: string): string {
  const r = computeClassifierInputDecisionHash(input, sha, key);
  return r.hash as string;
}

async function main() {
  // --- canonicalization (frozen pipeline §4.5) ---
  check('NFC: precomposed cafe', canonicalizeForHash('caf\u00e9') === 'caf\u00e9');
  check('NFC: decomposed === precomposed', canonicalizeForHash('cafe\u0301') === canonicalizeForHash('caf\u00e9'));
  check('trim: leading/trailing whitespace', canonicalizeForHash('  help me  ') === 'help me');
  check('lowercase: ASCII', canonicalizeForHash('HELP ME') === 'help me');
  // toLowerCase (NOT toLocaleLowerCase) is locale-independent: 'I' folds to 'i'
  // everywhere. In a Turkish locale toLocaleLowerCase('I') would be 'ı' (dotless);
  // we deliberately do NOT use locale folding, so the hash is reproducible.
  check('lowercase: I folds to i (locale-independent)', canonicalizeForHash('I') === 'i');
  check('hmacInput uses pipe delimiter', hmacInput('help me', 'abc123') === 'help me|abc123');

  // --- HMAC determinism + separation (§1.3) ---
  check('known answer (base)', hash('Help me', 'abc123', 'testkey') === H_BASE);
  check('case+whitespace collapse to base', hash('  HELP ME  ', 'abc123', 'testkey') === H_BASE);
  check('NFC equivalence collapses', hash('cafe\u0301', 'abc123', 'testkey') === hash('caf\u00e9', 'abc123', 'testkey'));
  check('cafe known answer', hash('caf\u00e9', 'abc123', 'testkey') === H_CAFE);
  check('determinism: same inputs => same hash', hash('Help me', 'abc123', 'testkey') === hash('Help me', 'abc123', 'testkey'));
  check('different key => different hash', hash('Help me', 'abc123', 'testkey') !== hash('Help me', 'abc123', 'otherkey'));
  check('different sha => different hash', hash('Help me', 'abc123', 'testkey') !== hash('Help me', 'zzz999', 'testkey'));

  // --- key-missing null path (§4.3) ---
  const missing = computeClassifierInputDecisionHash('Help me', 'abc123', null);
  check('key missing => hash null', missing.hash === null);
  check('key missing => keyMissing true', missing.keyMissing === true);
  const present = computeClassifierInputDecisionHash('Help me', 'abc123', 'testkey');
  check('key present => keyMissing false', present.keyMissing === false);
  check('key present => hash non-null', typeof present.hash === 'string' && present.hash.length === 64);

  // --- key generation resolution (§4.4) ---
  const savedGen = process.env.CLASSIFIER_AUDIT_KEY_GENERATION;
  delete process.env.CLASSIFIER_AUDIT_KEY_GENERATION;
  check("generation fallback is 'gen-unknown'", resolveKeyGeneration() === 'gen-unknown');
  process.env.CLASSIFIER_AUDIT_KEY_GENERATION = 'gen-2026-06';
  check('generation reads env', resolveKeyGeneration() === 'gen-2026-06');
  check('compute stamps the generation', computeClassifierInputDecisionHash('x', 'y', 'k').keyGeneration === 'gen-2026-06');
  if (savedGen === undefined) delete process.env.CLASSIFIER_AUDIT_KEY_GENERATION; else process.env.CLASSIFIER_AUDIT_KEY_GENERATION = savedGen;
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => {
  console.error('  \u2717 unexpected error', e);
  process.exit(1);
});
