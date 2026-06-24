#!/usr/bin/env tsx
/**
 * rtc_parity_check.ts — RTC 9-URL SHA-256 parity check (build-side tool; BROKER-RUN, live network).
 *
 * Predicate-7 evidence per the Edge Function scope ruling §2.6, mechanism M1
 * (rtc_refresh_parity_check_mechanism_broker_ruling_2026-06-24). NOT a determination; authors no
 * legal content. Read-only network audit: exercises the IDENTICAL fetcher the deployed Edge Function
 * runs, against the 9 live LAHD URLs, and confirms each SHA-256 equals RTC_FORM_BASELINE_HASHES.
 *
 * IDENTICAL-CODE PROPERTY (the load-bearing point of M1): this imports createLanguageFetcher from
 * supabase/functions/rtc-refresh/fetcher.ts — the one and only fetcher file, the literal module the
 * Edge Function's index.ts imports. It calls createLanguageFetcher() with no args, exactly as index.ts
 * does, so the fetch options, redirect handling, header set, body buffering, and crypto.subtle SHA-256
 * are byte-identical to the deployed path. Constants come from the same _core/ snapshot the fetcher
 * uses (_core/ === lib/ canonical, enforced by the verify-edge-core-sync CI guard). Runs under Node/tsx;
 * .ts-extension imports resolve under tsx exactly as fetcher.test.ts demonstrates.
 *
 * MISMATCH SEMANTICS (ruling): any mismatch is a FETCHER-PARITY BUG (compression / redirect / TLS /
 * user-agent variance), NOT a form revision. Fix the fetcher; flip nothing. The script never writes
 * state, never touches the production gate, never deploys — it only fetches and compares.
 *
 * Usage:  tsx scripts/rtc_parity_check.ts            (broker-run, live network)
 *         tsx scripts/rtc_parity_check.ts > docs/compliance/rtc_parity_report_<date>.txt
 * Exit code 0 on full 9/9 parity; non-zero on any mismatch or fetch error.
 */
import { createLanguageFetcher, type LanguageFetcherDeps } from '../supabase/functions/rtc-refresh/fetcher.ts';
import { RTC_PUBLISHED_LANGUAGES, RTC_FORM_URLS, type RtcLanguage } from '../supabase/functions/rtc-refresh/_core/laRtcRules.ts';
import { RTC_FORM_BASELINE_HASHES } from '../supabase/functions/rtc-refresh/_core/rtcFormBaselines.ts';
import type { LanguageFetcher } from '../supabase/functions/rtc-refresh/_core/rtcRefreshJob.ts';

export type ParityStatus = 'match' | 'mismatch' | 'fetch_error';
export interface ParityResult {
  language: RtcLanguage; url: string; baseline: string;
  live: string | null; status: ParityStatus; error: string | null;
}
export interface ParityReport { ranAt: string; results: ParityResult[]; allMatch: boolean; matched: number; total: number; }

export async function runParityCheck(deps: {
  fetcher: LanguageFetcher;
  languages: readonly RtcLanguage[];
  urls: Record<RtcLanguage, string>;
  baselines: Record<RtcLanguage, string>;
  now?: () => Date;
}): Promise<ParityReport> {
  const ranAt = (deps.now ?? (() => new Date()))().toISOString();
  const results: ParityResult[] = [];
  for (const language of deps.languages) {
    const url = deps.urls[language];
    const baseline = deps.baselines[language];
    const fetched = await deps.fetcher(language);
    if (fetched.error !== undefined || fetched.sha256 === undefined) {
      results.push({ language, url, baseline, live: null, status: 'fetch_error', error: fetched.error ?? 'no sha256 returned' });
    } else if (fetched.sha256 === baseline) {
      results.push({ language, url, baseline, live: fetched.sha256, status: 'match', error: null });
    } else {
      results.push({ language, url, baseline, live: fetched.sha256, status: 'mismatch', error: null });
    }
  }
  const matched = results.filter((r) => r.status === 'match').length;
  return { ranAt, results, allMatch: matched === results.length, matched, total: results.length };
}

export function formatReport(report: ParityReport): string {
  const L: string[] = [];
  L.push(`RTC parity check — ${report.ranAt}`);
  L.push('Run by: broker (CalDRE B9445457)');
  L.push('Network: live LAHD CDN');
  L.push('Mechanism: M1 (broker-run script, identical fetcher code) — predicate 7 evidence');
  L.push('');
  report.results.forEach((r, i) => {
    L.push(`URL ${i + 1} (${r.language}): ${r.url}`);
    if (r.status === 'match') {
      L.push(`  Baseline: ${r.baseline}`);
      L.push(`  Live:     ${r.live}   \u2713 MATCH`);
    } else if (r.status === 'mismatch') {
      L.push(`  Baseline: ${r.baseline}`);
      L.push(`  Live:     ${r.live}   \u2717 MISMATCH`);
    } else {
      L.push(`  Baseline: ${r.baseline}`);
      L.push(`  Live:     (none)   \u2717 FETCH ERROR: ${r.error}`);
    }
    L.push('');
  });
  if (report.allMatch) {
    L.push(`Overall: ${report.matched}/${report.total} MATCH — PARITY CONFIRMED`);
  } else {
    L.push(`Overall: ${report.matched}/${report.total} MATCH — PARITY FAILED`);
    L.push('Any non-match is a FETCHER-PARITY BUG (compression / redirect / TLS / UA variance), NOT a form revision.');
    L.push('Fix the fetcher; flip nothing.');
  }
  return L.join('\n') + '\n';
}

async function main() {
  // Identical to deployed: createLanguageFetcher() with no args (index.ts wiring).
  const fetcher = createLanguageFetcher();
  const report = await runParityCheck({
    fetcher,
    languages: RTC_PUBLISHED_LANGUAGES,
    urls: RTC_FORM_URLS,
    baselines: RTC_FORM_BASELINE_HASHES,
  });
  process.stdout.write(formatReport(report));
  process.exit(report.allMatch ? 0 : 1);
}

// Only run main() when invoked directly (allows importing the pure functions for testing).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { process.stderr.write('[rtc-parity] unexpected: ' + (e as Error).message + '\n'); process.exit(2); });
}
