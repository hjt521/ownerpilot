// e2e/playwright.config.ts — AI-first rebuild E2E. Runs against a deployed PREVIEW (BASE_URL), not the sandbox.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }, // 50+/mobile audience (CLAUDE.md)
  ],
});
