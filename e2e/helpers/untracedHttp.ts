// e2e/helpers/untracedHttp.ts
// Security repair for run #30599083648: the uploaded Playwright trace
// (playwright-failure-30599083648-1) contained the full Authorization bearer value for
// TEST_SEED_SECRET. Root cause: Playwright's `trace: 'retain-on-failure'` (e2e/playwright.config.ts)
// records full request/response headers — including Authorization and Cookie — for any network call
// routed through a test-fixture-provided APIRequestContext (e.g. the `request` fixture's
// `.newContext()`, or `page.context().request`), and does not redact secrets from that record.
//
// This helper performs the same HTTP calls via the Node global `fetch`, entirely outside any
// Playwright fixture, so the call is never added to the trace/report artifacts in the first place —
// there is nothing to redact because nothing sensitive is ever recorded. Use this for any E2E call
// that carries the TEST_SEED_SECRET bearer token, a service-role key, or a seeded session cookie.
//
// Deliberately minimal: no retries, no auth-header allowlist logic — just enough to POST/GET JSON
// without going through Playwright's traced request path.

export interface UntracedResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: T;
}

export async function untracedFetch<T = unknown>(
  baseURL: string,
  path: string,
  init?: RequestInit,
): Promise<UntracedResponse<T>> {
  const res = await fetch(new URL(path, baseURL), init);
  let json: unknown = undefined;
  try {
    json = await res.json();
  } catch {
    // no body / not JSON — leave json undefined rather than throw
  }
  return { ok: res.ok, status: res.status, json: json as T };
}
