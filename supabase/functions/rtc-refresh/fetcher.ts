/**
 * Real LanguageFetcher (Step 4) — Edge-native.
 *
 * Fetches a language's LAHD RTC form and returns its full-body SHA-256, mirroring
 * scripts/rtc_url_drift_check.ts's fetchWithChain BYTE-FOR-BYTE on the hashing so the
 * deployed function's hashes match RTC_FORM_BASELINE_HASHES (captured by that tool):
 *   - GET only; redirect: 'manual' — hops followed manually, relative Location resolved
 *     via new URL(location, url), capped at MAX_REDIRECT_HOPS.
 *   - No conditional headers (no If-None-Match / If-Modified-Since); no caching.
 *   - Hash = SHA-256 hex of the raw terminal-response body bytes (arrayBuffer()).
 *   - No retries — an error is recorded, never masked.
 *
 * Digest uses Web Crypto (crypto.subtle), which is byte-identical to the drift-checker's
 * Node createHash for the same input bytes (proven in the Step-4 sandbox). Deps (fetch,
 * urls, userAgent) are injectable so this runs under the Node test runner with a mock fetch.
 *
 * A non-2xx terminal response is an ERROR, not a body to hash — hashing a 404 page and
 * comparing it to the baseline would misclassify a fetch failure as a revision. Only a 2xx
 * terminal yields a sha256; everything else yields { error }.
 */
import { RTC_FORM_URLS, type RtcLanguage } from './_core/laRtcRules.ts';
import type { FetchedForm, LanguageFetcher } from './_core/rtcRefreshJob.ts';

const MAX_REDIRECT_HOPS = 10;
const DEFAULT_USER_AGENT = 'ownerpilot-rtc-refresh/1.0 (read-only form fetch; contact: broker)';

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface LanguageFetcherDeps {
  fetchImpl?: typeof fetch;
  urls?: Record<RtcLanguage, string>;
  userAgent?: string;
}

export function createLanguageFetcher(deps: LanguageFetcherDeps = {}): LanguageFetcher {
  const doFetch = deps.fetchImpl ?? fetch;
  const urls = deps.urls ?? RTC_FORM_URLS;
  const userAgent = deps.userAgent ?? DEFAULT_USER_AGENT;

  return async (language: RtcLanguage): Promise<FetchedForm> => {
    const inputUrl = urls[language];
    if (!inputUrl) return { language, error: `no URL configured for language ${language}` };
    let url = inputUrl;
    try {
      for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
        const resp = await doFetch(url, {
          method: 'GET',
          redirect: 'manual',                     // follow hops manually
          headers: { 'user-agent': userAgent },   // no conditional headers
        });
        const status = resp.status;
        const location = resp.headers.get('location');
        if (status >= 300 && status < 400 && location) {
          if (hop === MAX_REDIRECT_HOPS) {
            return { language, error: `exceeded ${MAX_REDIRECT_HOPS} redirect hops (possible loop)` };
          }
          url = new URL(location, url).toString();
          continue;
        }
        // terminal response
        if (status < 200 || status >= 300) {
          return { language, error: `HTTP ${status}` };
        }
        const buf = await resp.arrayBuffer();
        return { language, sha256: await sha256Hex(buf) };
      }
      return { language, error: 'redirect handling fell through (unexpected)' };
    } catch (e) {
      return { language, error: (e as Error).message };
    }
  };
}
