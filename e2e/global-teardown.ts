// e2e/global-teardown.ts — E2-D3/D4 tag-scoped cleanup after the Playwright suite. Deletes every row tagged
// with E2E_RUN_ID (documents→riskpath→sessions FK order) and verifies zero remain; fails the run if not.
import { createClient } from '@supabase/supabase-js';
import { cleanupE2eRun } from '../lib/testing/e2eCleanup';

async function globalTeardown() {
  const runId = process.env.E2E_RUN_ID;
  if (!runId) {
    console.warn('[e2e-teardown] E2E_RUN_ID unset — no tagged rows to clean (skipping).');
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('[e2e-teardown] SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required for cleanup');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const res = await cleanupE2eRun(sb, runId);
  console.log(
    `[e2e-teardown] runId=${runId} documentsDeleted=${res.documentsDeleted} remaining=${JSON.stringify(res.remaining)}`,
  );
  const leftover = res.remaining.documents + res.remaining.riskpath + res.remaining.sessions;
  if (leftover > 0) {
    console.error('[e2e-teardown] CLEANUP VERIFY FAILED — tagged rows remain. Investigate before declaring Gate 2.');
    process.exit(1);
  }
  console.log('[e2e-teardown] cleanup verified: zero tagged rows remain.');
}

export default globalTeardown;
