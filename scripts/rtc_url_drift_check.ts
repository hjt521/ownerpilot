#!/usr/bin/env tsx
/**
 * rtc_url_drift_check.ts — RTC form URL drift checker (build-side tool; BROKER-RUN)
 *
 * NOT a determination. Authors no legal content. This is a read-only network audit tool
 * that fetches each URL in RTC_FORM_URLS and records, per URL: HTTP status, the full redirect
 * chain + final URL, Last-Modified, Content-Length (header + actual bytes), full-body SHA-256,
 * and content-type. Output is a dated markdown report + a sidecar JSON audit log. The broker
 * runs this against the live network (the sandbox cannot reach housing.lacity.gov) and supplies
 * the output to the la_rtc_forms_authoritative_source_and_refresh_policy workstream.
 *
 * Read-only w.r.t. the codebase: imports RTC_FORM_URLS from laRtcRules.ts as data. Does NOT
 * edit laRtcRules.ts (frozen under master §5 / W2). Reading an exported constant is allowed.
 *
 * Discipline (routing ruling §2.3):
 *   - Read-only HTTP. GET only. No POST, no auth, no cookies.
 *   - No conditional headers (If-None-Match / If-Modified-Since NOT sent) — always a fresh fetch.
 *   - Redirects are NOT silently followed: each hop is recorded in the chain; final URL reported.
 *   - No retries that mask errors. A 404 is reported as a 404. A network error is reported as-is.
 *   - No caching. Fresh fetch each invocation.
 *   - Deterministic: URLs processed in a stable sorted order; same input → same output structure.
 *   - Honest user-agent identifying the tool.
 *   - Each fetch logged to the sidecar JSON for audit.
 *
 * Usage:
 *   tsx scripts/rtc_url_drift_check.ts
 *   tsx scripts/rtc_url_drift_check.ts --urls https://a.example/x.pdf,https://b.example/y.pdf   (override, for testing)
 *   tsx scripts/rtc_url_drift_check.ts --out-dir docs/compliance --date 2026-06-19
 */

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const USER_AGENT = 'ownerpilot-rtc-url-drift-check/1.0 (read-only form audit; contact: broker)';
const MAX_REDIRECT_HOPS = 10;

type Hop = { url: string; status: number; location: string | null };
type Result = {
  key: string;
  inputUrl: string;
  ok: boolean;
  finalUrl: string | null;
  finalStatus: number | null;
  redirectChain: Hop[];
  lastModified: string | null;
  contentType: string | null;
  contentLengthHeader: string | null;
  actualBytes: number | null;
  sha256: string | null;
  error: string | null;
};

function parseArgs(argv: string[]) {
  let urlsOverride: string | null = null;
  let outDir = 'docs/compliance';
  let date = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--urls') urlsOverride = argv[++i];
    else if (argv[i] === '--out-dir') outDir = argv[++i];
    else if (argv[i] === '--date') date = argv[++i];
  }
  return { urlsOverride, outDir, date };
}

/** Load RTC_FORM_URLS from laRtcRules.ts, tolerating object {key:url} or array shapes. */
function loadUrls(): { key: string; url: string }[] {
  let mod: any;
  try {
    mod = require('../lib/jurisdiction/laRtcRules');
  } catch (e) {
    process.stderr.write(
      `[rtc-url-drift] ERROR: could not import ../lib/jurisdiction/laRtcRules (${(e as Error).message})\n`,
    );
    process.exit(2);
  }
  const raw = mod.RTC_FORM_URLS ?? mod.default?.RTC_FORM_URLS;
  if (!raw) {
    process.stderr.write('[rtc-url-drift] ERROR: laRtcRules.ts does not export RTC_FORM_URLS (shape changed — update loader only)\n');
    process.exit(2);
  }
  let pairs: { key: string; url: string }[];
  if (Array.isArray(raw)) pairs = raw.map((u: string, i: number) => ({ key: String(i), url: String(u) }));
  else pairs = Object.entries(raw).map(([k, v]) => ({ key: k, url: String(v) }));
  // deterministic stable order
  pairs.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return pairs;
}

/** Manual redirect-following GET — records every hop, follows up to a cap, no conditional headers. */
async function fetchWithChain(inputUrl: string): Promise<Result> {
  const result: Result = {
    key: '', inputUrl, ok: false, finalUrl: null, finalStatus: null, redirectChain: [],
    lastModified: null, contentType: null, contentLengthHeader: null, actualBytes: null,
    sha256: null, error: null,
  };
  let url = inputUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const resp = await fetch(url, {
        method: 'GET',
        redirect: 'manual',           // do NOT silently follow
        headers: { 'user-agent': USER_AGENT }, // no conditional headers
        // no cache option set -> undici does not cache by default; fresh fetch
      });
      const status = resp.status;
      const location = resp.headers.get('location');
      result.redirectChain.push({ url, status, location });

      // 3xx with a Location → record and follow manually
      if (status >= 300 && status < 400 && location) {
        if (hop === MAX_REDIRECT_HOPS) {
          result.error = `exceeded ${MAX_REDIRECT_HOPS} redirect hops (possible loop) — not followed further`;
          result.finalUrl = url;
          result.finalStatus = status;
          return result;
        }
        url = new URL(location, url).toString(); // resolve relative redirects
        continue;
      }

      // terminal response — read body bytes for hash + size
      const buf = Buffer.from(await resp.arrayBuffer());
      result.finalUrl = url;
      result.finalStatus = status;
      result.lastModified = resp.headers.get('last-modified');
      result.contentType = resp.headers.get('content-type');
      result.contentLengthHeader = resp.headers.get('content-length');
      result.actualBytes = buf.length;
      result.sha256 = createHash('sha256').update(buf).digest('hex');
      result.ok = status >= 200 && status < 300;
      return result;
    }
    result.error = 'redirect handling fell through (unexpected)';
    return result;
  } catch (e) {
    result.error = (e as Error).message; // no retry — record and move on
    return result;
  }
}

function mdReport(date: string, results: Result[]): string {
  const lines: string[] = [];
  lines.push(`# RTC form URL drift report — ${date}`);
  lines.push('');
  lines.push('**Build-side audit output — not a determination.** Read-only fetch of `RTC_FORM_URLS`.');
  lines.push('Generated by `scripts/rtc_url_drift_check.ts` (broker-run). No conditional headers; redirects recorded, not silently followed; no retries; no caching.');
  lines.push('');
  const okCount = results.filter((r) => r.ok).length;
  const errCount = results.filter((r) => r.error).length;
  const redirCount = results.filter((r) => r.redirectChain.length > 1).length;
  lines.push(`**Summary:** ${results.length} URLs · ${okCount} returned 2xx · ${errCount} errored · ${redirCount} involved a redirect.`);
  lines.push('');
  lines.push('| key | final status | redirected | SHA-256 | bytes | content-type | last-modified | error |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const redir = r.redirectChain.length > 1 ? `yes (${r.redirectChain.length - 1})` : 'no';
    const sha = r.sha256 ? r.sha256.slice(0, 16) + '…' : '—';
    lines.push(
      `| ${r.key} | ${r.finalStatus ?? '—'} | ${redir} | ${sha} | ${r.actualBytes ?? '—'} | ${r.contentType ?? '—'} | ${r.lastModified ?? '—'} | ${r.error ?? ''} |`,
    );
  }
  lines.push('');
  lines.push('## Per-URL detail');
  for (const r of results) {
    lines.push('');
    lines.push(`### ${r.key}`);
    lines.push(`- input URL: ${r.inputUrl}`);
    lines.push(`- final URL: ${r.finalUrl ?? '—'}`);
    lines.push(`- final status: ${r.finalStatus ?? '—'}`);
    if (r.redirectChain.length > 1) {
      lines.push(`- redirect chain:`);
      r.redirectChain.forEach((h, i) => lines.push(`    ${i}. ${h.status} ${h.url}${h.location ? ` → ${h.location}` : ''}`));
    }
    lines.push(`- SHA-256 (full body): ${r.sha256 ?? '—'}`);
    lines.push(`- bytes (actual): ${r.actualBytes ?? '—'}  ·  Content-Length header: ${r.contentLengthHeader ?? '—'}`);
    lines.push(`- content-type: ${r.contentType ?? '—'}`);
    lines.push(`- last-modified: ${r.lastModified ?? '—'}`);
    if (r.error) lines.push(`- ERROR: ${r.error}`);
  }
  lines.push('');
  lines.push('_The broker reviews this output and decides which URLs are authoritative and current. This tool draws no such conclusion._');
  return lines.join('\n') + '\n';
}

async function main() {
  const { urlsOverride, outDir, date } = parseArgs(process.argv.slice(2));
  const pairs = urlsOverride
    ? urlsOverride.split(',').map((u, i) => ({ key: String(i), url: u.trim() }))
    : loadUrls();

  process.stderr.write(`[rtc-url-drift] checking ${pairs.length} URL(s)…\n`);
  const results: Result[] = [];
  for (const { key, url } of pairs) {
    process.stderr.write(`  → ${key}: ${url}\n`);
    const r = await fetchWithChain(url);
    r.key = key;
    results.push(r);
  }

  mkdirSync(outDir, { recursive: true });
  const mdPath = join(outDir, `rtc_url_drift_report_${date}.md`);
  const jsonPath = join(outDir, `rtc_url_drift_report_${date}.json`);
  writeFileSync(mdPath, mdReport(date, results), 'utf8');
  writeFileSync(jsonPath, JSON.stringify({ date, userAgent: USER_AGENT, results }, null, 2) + '\n', 'utf8');

  process.stderr.write(`[rtc-url-drift] wrote ${mdPath}\n[rtc-url-drift] wrote ${jsonPath}\n`);
  const anyError = results.some((r) => r.error);
  process.exit(anyError ? 1 : 0); // non-zero if any URL errored, so the broker notices
}

main();
