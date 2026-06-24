/**
 * rtc-refresh Edge Function — Deno entry (thin binding).
 *
 * Wires the runtime: reads RTC_REFRESH_SECRET from Deno env, supplies the clock,
 * and injects the dependency stubs (real store/fetcher/alerts land in Steps 3/4/5).
 * All logic lives in handler.ts (Deno-free, unit-tested under the Node runner).
 */
import { handleRequest, type HandlerEnv } from './handler.ts';
import type { LanguageFetcher } from './_core/rtcRefreshJob.ts';
import type { RefreshStateStore, AlertSink } from './_core/rtcRefreshTypes.ts';

// Step-named throw-on-invoke stubs. Pre-go-live the production gate short-circuits
// before runRefresh, so these never execute in the real path; a test that reaches
// them fails loudly rather than silently no-op.
const fetcher: LanguageFetcher = async () => {
  throw new Error('skeleton: fetcher not implemented; lands in Step 4');
};
const store: RefreshStateStore = {
  getLanguageState: async () => { throw new Error('skeleton: store not implemented; lands in Step 3'); },
  setLanguageState: async () => { throw new Error('skeleton: store not implemented; lands in Step 3'); },
  getPin: async () => { throw new Error('skeleton: store not implemented; lands in Step 3'); },
  setPin: async () => { throw new Error('skeleton: store not implemented; lands in Step 3'); },
  recordRunResult: async () => { throw new Error('skeleton: store not implemented; lands in Step 3'); },
};
const alerts: AlertSink = {
  emit: async () => { throw new Error('skeleton: alert sink not implemented; lands in Step 5'); },
};

const env: HandlerEnv = {
  secret: Deno.env.get('RTC_REFRESH_SECRET'),
  now: () => new Date(),
  deps: { fetcher, store, alerts },
};

Deno.serve((req) => handleRequest(req, env));
