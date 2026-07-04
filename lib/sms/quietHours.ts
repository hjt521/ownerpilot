// lib/sms/quietHours.ts
// Lane P3 — TCPA quiet-hours enforcement (pure). No SMS may send 8pm–8am in the RECIPIENT's local time.
// Source: BROKER STANDING ORDER — Productization 2026-07-03 §2 P3.
//
// Timezone is inferred from the US area code (NANP). Unknown/non-US → default America/Los_Angeles AND flag
// `inferred: true` so the caller logs the fallback (per the order: "if unknown, default to Pacific and log").

/** Curated NANP area-code → IANA timezone map. Not exhaustive; unknown codes fall back to Pacific (flagged). */
const AREA_CODE_TZ: Record<string, string> = {
  // Pacific
  '213': 'America/Los_Angeles', '310': 'America/Los_Angeles', '323': 'America/Los_Angeles',
  '424': 'America/Los_Angeles', '818': 'America/Los_Angeles', '626': 'America/Los_Angeles',
  '747': 'America/Los_Angeles', '661': 'America/Los_Angeles', '562': 'America/Los_Angeles',
  '619': 'America/Los_Angeles', '415': 'America/Los_Angeles', '408': 'America/Los_Angeles',
  '206': 'America/Los_Angeles', '503': 'America/Los_Angeles', '702': 'America/Los_Angeles',
  // Mountain
  '303': 'America/Denver', '720': 'America/Denver', '801': 'America/Denver', '505': 'America/Denver',
  '602': 'America/Phoenix', '480': 'America/Phoenix', // Arizona (no DST)
  // Central
  '312': 'America/Chicago', '773': 'America/Chicago', '214': 'America/Chicago', '713': 'America/Chicago',
  '512': 'America/Chicago', '210': 'America/Chicago', '615': 'America/Chicago', '504': 'America/Chicago',
  // Eastern
  '212': 'America/New_York', '646': 'America/New_York', '917': 'America/New_York', '718': 'America/New_York',
  '202': 'America/New_York', '404': 'America/New_York', '305': 'America/New_York', '617': 'America/New_York',
  '215': 'America/New_York', '412': 'America/New_York', '313': 'America/New_York',
};

const DEFAULT_TZ = 'America/Los_Angeles';
export const QUIET_START_HOUR = 20; // 8pm
export const QUIET_END_HOUR = 8;    // 8am

/** Extract the 3-digit NANP area code from an E.164 (+1AAANXXXXXX) or 10/11-digit US number. null if not parseable. */
export function areaCodeOf(phone: string): string | null {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return d.slice(1, 4);
  if (d.length === 10) return d.slice(0, 3);
  return null;
}

export function timezoneOf(phone: string): { tz: string; inferred: boolean } {
  const ac = areaCodeOf(phone);
  const tz = ac ? AREA_CODE_TZ[ac] : undefined;
  return tz ? { tz, inferred: false } : { tz: DEFAULT_TZ, inferred: true };
}

/** The recipient's local hour (0–23) at `now` for their inferred timezone. */
export function localHour(phone: string, now: Date): number {
  const { tz } = timezoneOf(phone);
  const h = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now);
  return Number(h) % 24;
}

export interface QuietHoursResult {
  quiet: boolean;      // true ⇒ MUST NOT send now
  localHour: number;
  tz: string;
  inferred: boolean;   // true ⇒ timezone was a fallback; caller logs it
}

/** Whether `now` falls in the recipient's 8pm–8am quiet window. Quiet = hour >= 20 OR hour < 8. */
export function quietHoursCheck(phone: string, now: Date): QuietHoursResult {
  const { tz, inferred } = timezoneOf(phone);
  const h = localHour(phone, now);
  return { quiet: h >= QUIET_START_HOUR || h < QUIET_END_HOUR, localHour: h, tz, inferred };
}
