// ============================================================================
// GENERATED FILE — DO NOT EDIT
// Source: lib/jurisdiction/rtcRefresh/rtcRefreshJob.ts
// Regenerate with: npm run build:edge-core
// CI guard: git diff --exit-code supabase/functions/rtc-refresh/_core/
// Governing ruling: rtc_edge_core_gitignore_vs_guard_broker_ruling_response_2026-06-23.md
// ============================================================================
/**
 * Step (e) — RTC form refresh job core.
 *
 * Productionizes the committed drift checker (scripts/rtc_url_drift_check.ts):
 * fetch each RTC_FORM_URLS entry, strict-SHA-256 compare against
 * RTC_FORM_BASELINE_HASHES, set per-language runtime state, emit alerts.
 *
 * Rulings implemented:
 *  - Strict SHA-256 threshold (W4 §2.3): any inequality = revision_detected.
 *  - Per-language outcomes set runtime state (Q2 §2.3): match | staged_revision
 *    (revision) | refresh_failure (fetch/hash error).
 *  - Non-blocking on deploy (Q2 (A)): this returns a result + sets state + alerts;
 *    it NEVER throws to fail a deploy. The runtime gate enforces safety.
 *  - All-9 fetch failure → [CRITICAL] alert (Q2 §2.3), deploy still proceeds.
 *  - Alert taxonomy (Q5 §5.1).
 *
 * GATE: asserts isLaProductionUnblocked() at entry — refuses to run while the LA
 * production gate is closed. Flips no flag. rtcFormRefreshJobBuilt stays false
 * until broker sign-off.
 */
import { isLaProductionUnblocked, RTC_PUBLISHED_LANGUAGES, type RtcLanguage } from './laRtcRules.ts';
import { RTC_FORM_BASELINE_HASHES } from './rtcFormBaselines.ts';
import type {
  AlertSink,
  AlertTrigger,
  LanguageRefreshOutcome,
  RefreshRunResult,
  RefreshStateStore,
  RtcRefreshAlert,
} from './rtcRefreshTypes.ts';

/** What a single-language fetch returns (reuses drift-check shape: hash or error). */
export interface FetchedForm {
  language: RtcLanguage;
  sha256?: string;
  error?: string;
}

/** Injected fetcher — wraps the drift-check fetch+hash for one language. Testable. */
export type LanguageFetcher = (language: RtcLanguage) => Promise<FetchedForm>;

/**
 * PURE: classify one fetched form against its baseline. No I/O.
 * strict SHA-256 (W4 §2.3).
 */
export function classifyOutcome(fetched: FetchedForm): LanguageRefreshOutcome {
  if (fetched.error !== undefined) {
    return { language: fetched.language, kind: 'fetch_error', reason: fetched.error };
  }
  const baseline = RTC_FORM_BASELINE_HASHES[fetched.language];
  if (fetched.sha256 !== undefined && fetched.sha256 === baseline) {
    return { language: fetched.language, kind: 'match' };
  }
  // Present but not equal → revision detected (strict).
  return {
    language: fetched.language,
    kind: 'revision_detected',
    detectedHash: fetched.sha256 ?? '(none)',
  };
}

/** Build the Q5 §5.1 alert payload for a trigger. */
export function buildAlert(trigger: AlertTrigger): RtcRefreshAlert {
  const base = { source: 'rtc_refresh' as const, channels: ['in_app', 'email'] as const };
  switch (trigger.kind) {
    case 'refresh_failure':
      return { ...base, severity: 'major', title: `LAHD RTC refresh — ${trigger.language} blocked (${trigger.reason})`, body: `Refresh failed for ${trigger.language}: ${trigger.reason}. Language blocked at runtime until next successful refresh.` };
    case 'revision_detected':
      return { ...base, severity: 'major', title: `LAHD RTC revision detected — ${trigger.language}`, body: `A strict SHA-256 mismatch was detected for ${trigger.language}. Language staged for broker review; blocked at runtime until acceptance.` };
    case 'pin_mismatch':
      return { ...base, severity: 'critical', title: `RTC pin mismatch — ${trigger.language}, notice ${trigger.noticeId}`, body: `Serve-time hash recheck failed for notice ${trigger.noticeId} (${trigger.language}). Notice held for manual broker review.` };
    case 'all_languages_failed':
      return { ...base, severity: 'critical', title: `[CRITICAL] LAHD RTC refresh — all languages failed`, body: `All nine RTC form fetches failed (possible network-wide outage). Deploy proceeded; runtime gate is enforcing per-language blocks.` };
  }
}

/**
 * Run a full refresh across all nine languages. Non-blocking (Q2 (A)) — returns
 * a result and updates state + alerts, never throws to fail a deploy.
 */
export async function runRefresh(deps: {
  fetcher: LanguageFetcher;
  store: RefreshStateStore;
  alerts: AlertSink;
  /** Injectable gate; defaults to the real (closed) gate. Tests force open. */
  gateIsOpen?: () => boolean;
}): Promise<RefreshRunResult> {
  const gateOpen = deps.gateIsOpen ?? isLaProductionUnblocked;
  if (!gateOpen()) {
    throw new Error('la-prod-gate-closed: refresh job must not run while the LA production gate is closed');
  }

  const runAt = new Date().toISOString();
  const outcomes: LanguageRefreshOutcome[] = [];

  for (const language of RTC_PUBLISHED_LANGUAGES) {
    let fetched: FetchedForm;
    try {
      fetched = await deps.fetcher(language);
    } catch (e) {
      fetched = { language, error: (e as Error).message };
    }
    const outcome = classifyOutcome(fetched);
    outcomes.push(outcome);

    // Set per-language runtime state + alert (Q2 §2.3).
    if (outcome.kind === 'match') {
      await deps.store.setLanguageState(language, { status: 'unblocked' });
    } else if (outcome.kind === 'revision_detected') {
      await deps.store.setLanguageState(language, { status: 'staged_revision', detectedHash: outcome.detectedHash, since: runAt });
      await deps.alerts.emit(buildAlert({ kind: 'revision_detected', language }));
    } else {
      await deps.store.setLanguageState(language, { status: 'refresh_failure', reason: outcome.reason, since: runAt });
      await deps.alerts.emit(buildAlert({ kind: 'refresh_failure', language, reason: outcome.reason }));
    }
  }

  const allFailed = outcomes.every((o) => o.kind === 'fetch_error');
  if (allFailed) {
    await deps.alerts.emit(buildAlert({ kind: 'all_languages_failed' }));
  }

  const result: RefreshRunResult = { runAt, outcomes, allFailed };
  await deps.store.recordRunResult(result);
  return result;
}
