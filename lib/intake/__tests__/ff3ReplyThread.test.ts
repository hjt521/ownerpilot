// lib/intake/__tests__/ff3ReplyThread.test.ts
// Omnibus §3 row 1 — reply-to-broker seam: flag default-off + pure append/normalize behavior.

import { ff3ReplyToBrokerEnabled } from '../../chat/ff3ReplyFlag';
import {
  appendOwnerReply, normalizeReplyThread, FF3_REPLY_MAX, FF3_REPLY_THREAD_MAX,
} from '../ff3ReplyThread';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// --- flag: default OFF everywhere, on only for explicit 1/true ---
delete process.env.FF3_REPLY_TO_BROKER_ENABLED;
check('flag: unset → off', ff3ReplyToBrokerEnabled() === false);
process.env.FF3_REPLY_TO_BROKER_ENABLED = 'false';
check('flag: "false" → off', ff3ReplyToBrokerEnabled() === false);
process.env.FF3_REPLY_TO_BROKER_ENABLED = '0';
check('flag: "0" → off', ff3ReplyToBrokerEnabled() === false);
process.env.FF3_REPLY_TO_BROKER_ENABLED = '1';
check('flag: "1" → on', ff3ReplyToBrokerEnabled() === true);
process.env.FF3_REPLY_TO_BROKER_ENABLED = 'TRUE';
check('flag: "TRUE" → on', ff3ReplyToBrokerEnabled() === true);
delete process.env.FF3_REPLY_TO_BROKER_ENABLED;

// --- normalizeReplyThread: defensive coercion ---
check('normalize: null → []', normalizeReplyThread(null).length === 0);
check('normalize: non-array → []', normalizeReplyThread({ a: 1 }).length === 0);
check('normalize: drops malformed entries', normalizeReplyThread([{ author: 'owner', text: 'hi', at: 'x' }, { nope: 1 }, null]).length === 1);
check('normalize: keeps valid owner + broker entries',
  normalizeReplyThread([{ author: 'owner', text: 'a', at: 't1' }, { author: 'broker', text: 'b', at: 't2' }]).length === 2);

// --- appendOwnerReply: pure, trimmed, bounded ---
const a1 = appendOwnerReply([], '  hello broker  ', 'T0');
check('append: adds trimmed owner entry', a1.ok && a1.thread.length === 1 && a1.thread[0].text === 'hello broker' && a1.thread[0].author === 'owner');
check('append: stamps the provided time', a1.ok && a1.thread[0].at === 'T0');

const a2 = appendOwnerReply(a1.thread, 'second', 'T1');
check('append: preserves prior entries (immutable)', a2.ok && a2.thread.length === 2 && a1.thread.length === 1);

const a3 = appendOwnerReply([], '   ', 'T2');
check('append: empty text rejected', !a3.ok && a3.error === 'empty');

const a4 = appendOwnerReply([], 'x'.repeat(FF3_REPLY_MAX + 500), 'T3');
check('append: over-long text is truncated to the bound', a4.ok && a4.thread[0].text.length === FF3_REPLY_MAX);

const full = Array.from({ length: FF3_REPLY_THREAD_MAX }, (_, i) => ({ author: 'owner' as const, text: `m${i}`, at: 't' }));
const a5 = appendOwnerReply(full, 'one too many', 'T4');
check('append: rejects when thread is full', !a5.ok && a5.error === 'thread_full');

console.log(`\nff3ReplyThread: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed > 0) process.exit(1);
