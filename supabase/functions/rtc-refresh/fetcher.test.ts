/**
 * Step 4 — LanguageFetcher tests. No live network (fetch injected).
 * Verifies byte-for-byte parity with scripts/rtc_url_drift_check.ts on the hashing:
 * SHA-256 hex of the raw terminal body; manual redirect-following with relative
 * resolution + hop cap; no conditional headers; non-2xx and network errors → { error }.
 */
import { createLanguageFetcher } from './fetcher.ts';
import { createHash } from 'node:crypto';
import type { RtcLanguage } from './_core/laRtcRules.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log('  \u2713 ' + name); } else { failed++; console.log('  \u2717 ' + name); }
}

const URLS = { english: 'https://lahd.example/english.pdf' } as unknown as Record<RtcLanguage, string>;

// Minimal Response-like stub.
function resp(status: number, opts: { location?: string; body?: Uint8Array } = {}): Response {
  const headers = new Headers();
  if (opts.location) headers.set('location', opts.location);
  const body = opts.body ?? new Uint8Array(0);
  return {
    status,
    headers,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as unknown as Response;
}

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x01, 0x02, 0x03]); // "%PDF-1.7\n" + bytes
const PDF_SHA = createHash('sha256').update(Buffer.from(PDF)).digest('hex'); // drift-checker's exact method

async function main() {
  // --- happy path: 200 terminal -> sha256 hex equals the drift-checker's Node digest ---
  {
    const calls: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetchImpl = (async (url: string, init: any) => {
      calls.push({ url, headers: init.headers });
      return resp(200, { body: PDF });
    }) as unknown as typeof fetch;
    const fetcher = createLanguageFetcher({ fetchImpl, urls: URLS });
    const r = await fetcher('english');
    check('200: returns sha256, no error', r.sha256 !== undefined && r.error === undefined);
    check('200: sha256 byte-matches drift-checker Node digest', r.sha256 === PDF_SHA);
    check('GET with no conditional headers (only user-agent)',
      !('if-none-match' in calls[0].headers) && !('if-modified-since' in calls[0].headers) && 'user-agent' in calls[0].headers);
  }

  // --- redirect: manual hop-following with relative Location resolution ---
  {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      if (url === 'https://lahd.example/english.pdf') return resp(301, { location: '/forms/english-v2.pdf' });
      if (url === 'https://lahd.example/forms/english-v2.pdf') return resp(200, { body: PDF });
      return resp(404);
    }) as unknown as typeof fetch;
    const fetcher = createLanguageFetcher({ fetchImpl, urls: URLS });
    const r = await fetcher('english');
    check('redirect: follows hop and resolves relative Location', r.sha256 === PDF_SHA);
    check('redirect: visited both URLs in order',
      seen[0] === 'https://lahd.example/english.pdf' && seen[1] === 'https://lahd.example/forms/english-v2.pdf');
  }

  // --- redirect loop: exceeds hop cap -> error, not infinite ---
  {
    const fetchImpl = (async (url: string) => resp(302, { location: url + '?x' })) as unknown as typeof fetch;
    const fetcher = createLanguageFetcher({ fetchImpl, urls: URLS });
    const r = await fetcher('english');
    check('redirect loop: returns error (hop cap), no sha256', r.error?.includes('redirect hops') === true && r.sha256 === undefined);
  }

  // --- non-2xx terminal: 404 is an ERROR, never hashed (would misclassify as revision) ---
  {
    const fetchImpl = (async () => resp(404)) as unknown as typeof fetch;
    const fetcher = createLanguageFetcher({ fetchImpl, urls: URLS });
    const r = await fetcher('english');
    check('404: error HTTP 404, no sha256', r.error === 'HTTP 404' && r.sha256 === undefined);
  }

  // --- network throw: recorded as error, no retry ---
  {
    let calls = 0;
    const fetchImpl = (async () => { calls++; throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    const fetcher = createLanguageFetcher({ fetchImpl, urls: URLS });
    const r = await fetcher('english');
    check('network error: recorded as error', r.error === 'ECONNRESET' && r.sha256 === undefined);
    check('network error: no retry (single call)', calls === 1);
  }

  // --- missing URL: defensive error ---
  {
    const fetcher = createLanguageFetcher({ fetchImpl: (async () => resp(200)) as unknown as typeof fetch, urls: {} as any });
    const r = await fetcher('english');
    check('missing URL: defensive error', r.error?.includes('no URL configured') === true);
  }
}

main().then(() => {
  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('  unexpected', e); process.exit(1); });
