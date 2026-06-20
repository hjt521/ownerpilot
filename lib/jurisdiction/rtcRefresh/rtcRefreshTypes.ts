/**
 * Step (e) — RTC form refresh job: state model + contracts.
 *
 * Encodes the runtime-semantics rulings from
 * `rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20`
 * (Q1–Q5) on top of the W4 policy frame. Types + interfaces only.
 *
 * No edits to frozen laRtcRules.ts. Consumes RtcLanguage + baselines read-only.
 */
import type { RtcLanguage } from '../laRtcRules';

/** Per-language runtime state — the single source of truth the gate consults (Q2 §2.4). */
export type LanguageRefreshState =
  | { status: 'unblocked' } // baseline match; may serve
  | { status: 'refresh_failure'; reason: string; since: string } // W4 §2.2 fetch/hash error → block
  | { status: 'staged_revision'; detectedHash: string; since: string }; // W4 §2.5 revision detected, awaiting broker acceptance → block

/** Outcome of checking one language during a refresh run. */
export type LanguageRefreshOutcome =
  | { language: RtcLanguage; kind: 'match' }
  | { language: RtcLanguage; kind: 'revision_detected'; detectedHash: string }
  | { language: RtcLanguage; kind: 'fetch_error'; reason: string };

/** Result of a full refresh run across all nine languages. */
export interface RefreshRunResult {
  runAt: string; // ISO timestamp
  outcomes: LanguageRefreshOutcome[];
  /** True when every language failed to fetch (Q2 §2.3 all-9 critical escalation). */
  allFailed: boolean;
}

// --- Alert taxonomy (Q5 §5.1) ----------------------------------------------

export type AlertSeverity = 'major' | 'critical';

/** Every RTC-refresh alert carries source: "rtc_refresh" and channels in_app+email (Q5). */
export interface RtcRefreshAlert {
  source: 'rtc_refresh';
  channels: ReadonlyArray<'in_app' | 'email'>;
  severity: AlertSeverity;
  title: string;
  body: string;
}

/** The four trigger flavors from §5.1. */
export type AlertTrigger =
  | { kind: 'refresh_failure'; language: RtcLanguage; reason: string }
  | { kind: 'revision_detected'; language: RtcLanguage }
  | { kind: 'pin_mismatch'; language: RtcLanguage; noticeId: string }
  | { kind: 'all_languages_failed' };

/** Sink the refresh job emits alerts to. Reuses the shared channel (Q5 (A)). */
export interface AlertSink {
  emit(alert: RtcRefreshAlert): Promise<void>;
}

// --- Pin model (Q3) ---------------------------------------------------------

/**
 * An in-flight pin (Q3a: specific language hash). Pins the hash a draft will
 * serve, with a 30-day lifetime from the acceptance-file date (Q3b).
 */
export interface LanguagePin {
  language: RtcLanguage;
  pinnedHash: string;
  /** Day-0 of the 30-day clock = broker acceptance-file date of the superseding revision (Q3b §3.2.1). */
  acceptanceDate: string; // 'YYYY-MM-DD'
  /** Set true only by an explicit broker renewal determination (Q3b §3.2.3). */
  renewedOnce?: boolean;
}

export type PinStatus =
  | { state: 'active'; daysRemaining: number }
  | { state: 'expired' }; // day 30 reached (or 60 if renewed); draft must re-acknowledge

// --- Version record (Q4) ----------------------------------------------------

/**
 * Immutable audit record of which form version a notice actually served (Q4).
 * Written ONCE at the moment of service (Q4 §4.4). null for non-LA notices
 * (Q4a (B): all notices carry the field, null when no RTC form attaches).
 */
export interface RtcFormVersionRecord {
  /** Hash(es) of the PDF(s) physically attached, keyed by language (W4 §2.4 shape). */
  rtcFormHashes: Partial<Record<RtcLanguage, string>>;
  rtcFormLastModified: Partial<Record<RtcLanguage, string>>;
  /** When the refresh that validated these hashes last ran. */
  rtcRefreshRunAt: string;
  /** When this record was sealed (= service time, Q4 §4.4). */
  servedAt: string;
}

/** A notice's version-record column — null for non-LA (Q4a). */
export type NoticeVersionRecordColumn = RtcFormVersionRecord | null;

// --- Storage (typed interface; stub backs it — engineering call, §7 item 4) --

/**
 * Persistent state the refresh job reads/writes. §7 ratified this as a typed
 * interface + in-memory stub now; real Supabase wiring deferred. The interface
 * is the stable contract.
 */
export interface RefreshStateStore {
  getLanguageState(language: RtcLanguage): Promise<LanguageRefreshState>;
  setLanguageState(language: RtcLanguage, state: LanguageRefreshState): Promise<void>;
  getPin(language: RtcLanguage, noticeId: string): Promise<LanguagePin | null>;
  setPin(noticeId: string, pin: LanguagePin): Promise<void>;
  recordRunResult(result: RefreshRunResult): Promise<void>;
}
