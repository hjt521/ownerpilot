// lib/chat/aiSdkFlag.test.ts
// Default-off, Preview-only CHAT_AI_SDK_ENABLED feature-flag behavior.

import { chatAiSdkEnabled } from './aiSdkFlag';

const originalFlag = process.env.CHAT_AI_SDK_ENABLED;
const originalEnvironment = process.env.VERCEL_ENV;
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
  process.env.VERCEL_ENV = 'preview';

  delete process.env.CHAT_AI_SDK_ENABLED;
  check('Preview + unset is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = 'false';
  check('Preview + "false" is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = '0';
  check('Preview + "0" is off', chatAiSdkEnabled() === false);

  process.env.CHAT_AI_SDK_ENABLED = '1';
  check('Preview + "1" is on', chatAiSdkEnabled() === true);

  process.env.CHAT_AI_SDK_ENABLED = 'TRUE';
  check('Preview matching is case-insensitive', chatAiSdkEnabled() === true);

  process.env.CHAT_AI_SDK_ENABLED = '  true  ';
  check('Preview ignores surrounding whitespace', chatAiSdkEnabled() === true);

  process.env.CHAT_AI_SDK_ENABLED = 'true';
  process.env.VERCEL_ENV = 'production';
  check('Production remains off even when flag is true', chatAiSdkEnabled() === false);

  process.env.VERCEL_ENV = 'development';
  check('Development remains off even when flag is true', chatAiSdkEnabled() === false);

  delete process.env.VERCEL_ENV;
  check('Missing environment remains off even when flag is true', chatAiSdkEnabled() === false);
} finally {
  if (originalFlag === undefined) {
    delete process.env.CHAT_AI_SDK_ENABLED;
  } else {
    process.env.CHAT_AI_SDK_ENABLED = originalFlag;
  }

  if (originalEnvironment === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalEnvironment;
  }
}

console.log(
  `\n${'-'.repeat(48)}\n  ${passed} passed, ${failed} failed\n${'-'.repeat(48)}`,
);

if (failed > 0) process.exit(1);
