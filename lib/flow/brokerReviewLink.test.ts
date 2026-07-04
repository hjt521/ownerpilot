/** brokerReviewLink helper tests (Decision 2 UI slice §3). */
import {
  buildStatusLinkPath,
  buildStatusLinkAbsolute,
  parseTokenFromLink,
  BROKER_REVIEW_STATUS_PATH,
} from './brokerReviewLink';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name); }
}

const TOK = 'a'.repeat(64);

check('buildStatusLinkPath uses fragment', buildStatusLinkPath(TOK) === `${BROKER_REVIEW_STATUS_PATH}#t=${TOK}`);
check('buildStatusLinkAbsolute joins origin (trailing slash trimmed)',
  buildStatusLinkAbsolute('https://www.ownerpilot.ai/', TOK) === `https://www.ownerpilot.ai${BROKER_REVIEW_STATUS_PATH}#t=${TOK}`);

check('parse full fragment URL', parseTokenFromLink(`https://www.ownerpilot.ai/broker-review/status#t=${TOK}`) === TOK);
check('parse query-param URL', parseTokenFromLink(`https://x/broker-review/status?t=${TOK}`) === TOK);
check('parse bare token', parseTokenFromLink(TOK) === TOK);
check('parse with surrounding whitespace', parseTokenFromLink(`  ${TOK}  `) === TOK);
check('reject empty', parseTokenFromLink('') === null);
check('reject non-token text', parseTokenFromLink('https://www.ownerpilot.ai/notice/3-day') === null);
check('reject short hex', parseTokenFromLink('t=' + 'a'.repeat(40)) === null);
check('reject non-hex of right length', parseTokenFromLink('z'.repeat(64)) === null);

console.log('\n----------------------------------------');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('----------------------------------------');
if (failed > 0) process.exit(1);
