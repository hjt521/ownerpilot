/**
 * Step (e) — pin lifetime (Q3) + version record (Q4). Pure functions, no I/O.
 */
import type { RtcLanguage } from '../laRtcRules';
import type {
  LanguagePin,
  NoticeVersionRecordColumn,
  PinStatus,
  RtcFormVersionRecord,
} from './rtcRefreshTypes';

const DAY_MS = 24 * 60 * 60 * 1000;
const PIN_BASE_DAYS = 30; // Q3b: 30-day lifetime
const PIN_RENEWAL_DAYS = 30; // Q3b: one renewal of up to 30 more days

/**
 * Pin status at a given moment (Q3b §3.2). Day-0 = acceptanceDate of the
 * superseding revision. Expires at day 30 (or day 60 if renewedOnce).
 */
export function pinStatus(pin: LanguagePin, now: Date): PinStatus {
  const day0 = new Date(pin.acceptanceDate + 'T00:00:00Z').getTime();
  const lifeDays = PIN_BASE_DAYS + (pin.renewedOnce ? PIN_RENEWAL_DAYS : 0);
  const expiresAt = day0 + lifeDays * DAY_MS;
  const remainingMs = expiresAt - now.getTime();
  if (remainingMs <= 0) return { state: 'expired' };
  return { state: 'active', daysRemaining: Math.ceil(remainingMs / DAY_MS) };
}

/**
 * Q3c serve-time recheck: the pinned hash MUST equal the SHA-256 of the PDF
 * physically about to be attached. Returns true only on exact match.
 * Caller fails closed (manual review) on false.
 */
export function serveTimePinMatches(pinnedHash: string, attachedPdfSha256: string): boolean {
  return pinnedHash === attachedPdfSha256;
}

/**
 * Seal the immutable version record at service time (Q4 §4.4). The caller must
 * write this exactly once and never overwrite (Q4 §4.2). For non-LA notices the
 * column is null (Q4a (B)).
 */
export function sealVersionRecord(args: {
  isLaNotice: boolean;
  servedLanguages: RtcLanguage[];
  attachedHashes: Partial<Record<RtcLanguage, string>>;
  lastModified: Partial<Record<RtcLanguage, string>>;
  refreshRunAt: string;
  servedAt: string;
}): NoticeVersionRecordColumn {
  if (!args.isLaNotice) return null;
  const rtcFormHashes: Partial<Record<RtcLanguage, string>> = {};
  const rtcFormLastModified: Partial<Record<RtcLanguage, string>> = {};
  for (const lang of args.servedLanguages) {
    const h = args.attachedHashes[lang];
    if (h !== undefined) rtcFormHashes[lang] = h;
    const lm = args.lastModified[lang];
    if (lm !== undefined) rtcFormLastModified[lang] = lm;
  }
  const record: RtcFormVersionRecord = {
    rtcFormHashes,
    rtcFormLastModified,
    rtcRefreshRunAt: args.refreshRunAt,
    servedAt: args.servedAt,
  };
  return record;
}

/**
 * Guard for the immutability rule (Q4 §4.2): a write is permitted ONLY when the
 * existing column is null (never written). Returns true if the write is allowed.
 * Corrections never go through here — they use the separate correction field
 * per Q4 §4.3.
 */
export function mayWriteVersionRecord(existing: NoticeVersionRecordColumn): boolean {
  return existing === null;
}
