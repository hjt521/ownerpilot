// lib/chat/modelProviderFailureRoute.test.ts
// Structural route guard: a failed model call must return before transcript or
// intake persistence and must not expose raw error detail.

import { readFileSync } from 'node:fs';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const route = readFileSync('app/api/chat/route.ts', 'utf8');

const modelCall = route.indexOf(
  'model = await callPerplexity(messages)',
);
const failureHandler = route.indexOf(
  'handleChatModelFailure(e, session.id)',
  modelCall,
);
const failureReturn = route.indexOf(
  'return NextResponse.json(failure.body',
  failureHandler,
);
const persistence = route.indexOf(
  ".from('chat_sessions').update",
  modelCall,
);

check('model call remains present', modelCall >= 0);
check(
  'model failure invokes the sanitized failure boundary',
  failureHandler > modelCall,
);
check(
  'model failure returns a generic response',
  failureReturn > failureHandler,
);
check(
  'failure return occurs before chat_sessions persistence',
  failureReturn >= 0 &&
  persistence >= 0 &&
  failureReturn < persistence,
);

const failureSection = route.slice(
  failureHandler,
  persistence >= 0 ? persistence : undefined,
);

check(
  'failure path contains no client detail field',
  !/\bdetail\s*:/.test(failureSection),
);
check(
  'failure path contains no transcript or intake update',
  !/transcript\s*:|intake_state\s*:/.test(failureSection),
);

console.log(
  `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
);

if (failed > 0) process.exit(1);
