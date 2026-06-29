/**
 * RTC packet loader (la_notice_production_gap erratum §4/§6).
 *
 * Loads the two LAHD Notice-of-Right-to-Counsel PDFs (EN + ES) from
 * lib/rtc/packet/, recomputes their SHA-256, and asserts they match the pinned
 * baseline (lib/rtc/packet/baseline.json). FAIL-CLOSED: any unreadable file or
 * SHA mismatch returns { ok:false } and the produce path maps it to
 * JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED. No partial / single-language load.
 *
 * Pure over an injected `readFile` so the SHA-verify logic is unit-tested without
 * the real binaries; `loadCurrentPacketFromDisk` wires real fs for production.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RtcPacketBaseline {
  rtcFormBaselineHashes: { english: string; spanish: string };
  rtcFormLastModified: { english: string; spanish: string };
  rtcFormLocalPath: { english: string; spanish: string };
  rtcRefreshRunAt: string | null;
}

export interface RtcPacketMetadata {
  rtcFormHashes: { english: string; spanish: string };
  rtcFormLastModified: { english: string; spanish: string };
  rtcRefreshRunAt: string | null;
}

export type LoadPacketResult =
  | { ok: true; english: Buffer; spanish: Buffer; metadata: RtcPacketMetadata }
  | { ok: false; reason: 'baseline_unreadable' | 'pdf_unreadable' | 'sha_mismatch'; detail: string };

const sha256 = (b: Buffer): string => createHash('sha256').update(b).digest('hex');

export interface LoadPacketDeps {
  /** Injected file reader (default fs.readFileSync). Throws on missing/unreadable. */
  readFile: (path: string) => Buffer;
  /** Repo root, to resolve the baseline's relative localPaths. */
  repoRoot: string;
  /** Injected baseline for tests; production reads lib/rtc/packet/baseline.json. */
  baseline?: RtcPacketBaseline;
}

export function loadCurrentPacket(deps: LoadPacketDeps): LoadPacketResult {
  let baseline: RtcPacketBaseline;
  try {
    baseline =
      deps.baseline ??
      (JSON.parse(deps.readFile(resolve(deps.repoRoot, 'lib/rtc/packet/baseline.json')).toString('utf8')) as RtcPacketBaseline);
  } catch (e) {
    return { ok: false, reason: 'baseline_unreadable', detail: String((e as Error).message ?? e) };
  }

  let english: Buffer;
  let spanish: Buffer;
  try {
    english = deps.readFile(resolve(deps.repoRoot, baseline.rtcFormLocalPath.english));
    spanish = deps.readFile(resolve(deps.repoRoot, baseline.rtcFormLocalPath.spanish));
  } catch (e) {
    return { ok: false, reason: 'pdf_unreadable', detail: String((e as Error).message ?? e) };
  }

  const enSha = sha256(english);
  const esSha = sha256(spanish);
  if (enSha !== baseline.rtcFormBaselineHashes.english) {
    return { ok: false, reason: 'sha_mismatch', detail: `english ${enSha} != baseline ${baseline.rtcFormBaselineHashes.english}` };
  }
  if (esSha !== baseline.rtcFormBaselineHashes.spanish) {
    return { ok: false, reason: 'sha_mismatch', detail: `spanish ${esSha} != baseline ${baseline.rtcFormBaselineHashes.spanish}` };
  }

  return {
    ok: true,
    english,
    spanish,
    metadata: {
      rtcFormHashes: { english: enSha, spanish: esSha },
      rtcFormLastModified: baseline.rtcFormLastModified,
      rtcRefreshRunAt: baseline.rtcRefreshRunAt,
    },
  };
}

/** Production wiring: real fs + cwd repo root. Fail-closed until the PDFs are present. */
export function loadCurrentPacketFromDisk(repoRoot: string = process.cwd()): LoadPacketResult {
  return loadCurrentPacket({ readFile: (p) => readFileSync(p), repoRoot });
}
