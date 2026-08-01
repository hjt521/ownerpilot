// lib/chat/aiSdkFlag.test.ts
// Default-off CHAT_AI_SDK_ENABLED feature-flag behavior.

import { chatAiSdkEnabled } from './aiSdkFlag';

const original = process.env.CHAT_AI_SDK_ENABLED;
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

try {
  delete process.env.CHAT_AI_SDK_ENABLED;
  check('unset is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = 'false';
  check('"false" is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = '0';
  check('"0" is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = '1';
  check('"1" is on', chatAiSdkEnabled() === true);

  process.env.CHAT_AI_SDK_ENABLED = 'TRUE';
  check('case-insensitive "TRUE" is on', chatAiSdkEnabled() === true);

  process.env.CHAT_AI_SDK_ENABLED = '  true  ';
  check('surrounding whitespace is ignored', chatAiSdkEnabled() === true);
} finally {
  if (original === undefined) {
    delete process.env.CHAT_AI_SDK_ENABLED;
  } else {
    process.env.CHAT_AI_SDK_ENABLED = original;
  }
}

console.log(
  `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
);

if (failed > 0) process.exit(1);
