// e2e/playwright.config.ts — AI-first rebuild E2E. Runs against a deployed PREVIEW (BASE_URL), not the sandbox.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 1,
  // E2-D3/D4: tag every request with the run id so server write paths stamp e2e_run_id, then clean up after.
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: process.env.E2E_RUN_ID ? { 'X-E2E-Run-Id': process.env.E2E_RUN_ID } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }, // 50+/mobile audience (CLAUDE.md)
  ],
});
