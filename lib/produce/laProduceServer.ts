/**
 * LA produce server logic (la_notice_production_gap ruling §2 + erratum §2/§6).
 *
 * The load-bearing, SERVER-SIDE runtime assertion for producing a City-of-LA
 * notice (produce is client-rendered today, so the wizard must clear this server
 * check before rendering an LA packet). Plus the packet-assembly composer for the
 * two RTC attachments. Pure over injected inputs → unit-tested; the route supplies
 * the real gate flags + loaded packet.
 *
 * Fail-closed: anything but a fully-attached, in-version, gate-open confirmed_la
 * blocks with the appropriate code (the route maps to 409).
 */
import { evaluateLaProduceGate, type LaProduceBlockCode } from './laProduceGate';
import type { LoadPacketResult, RtcPacketMetadata } from '../rtc/loadCurrentPacket';

export interface VerifyLaProduceInput {
  /** cachedResolverVerdict verdict. */
  verdict: string;
  /** isLaProductionUnblocked() — six-flag predicate gate. */
  productionUnblocked: boolean;
  /** isLaProducePhase2dWired() — the produce-overlay launch flag. */
  phase2dWired: boolean;
  /** Result of loadCurrentPacket() — both RTC PDFs loaded + SHA-verified, or a fail reason. */
  packet: LoadPacketResult;
  /** LAHD prompt copy version the client will render. */
  lahdCopyVersion: string;
  /** The server's current locked LAHD copy version. */
  currentLahdCopyVersion: string;
}

export type VerifyLaProduceResult =
  | { ok: true; metadata: RtcPacketMetadata | null }
  | { ok: false; code: LaProduceBlockCode };

/**
 * Server-side produce assertion. Scoped to `confirmed_la`: a non-LA verdict is
 * "not applicable" (statewide produce proceeds, metadata null) and the LA packet /
 * gate checks do NOT run. For confirmed_la it is fail-closed.
 */
export function verifyLaProduce(i: VerifyLaProduceInput): VerifyLaProduceResult {
  if (i.verdict !== 'confirmed_la') return { ok: true, metadata: null }; // statewide; LA gate n/a
  const gate = evaluateLaProduceGate({
    verdict: i.verdict,
    productionUnblocked: i.productionUnblocked,
    phase2dWired: i.phase2dWired,
    rtcPacketAttached: i.packet.ok,
    lahdCopyCurrent: i.lahdCopyVersion === i.currentLahdCopyVersion,
  });
  if (!gate.ok) return gate;
  // gate.ok (for confirmed_la) implies packet.ok; the guard keeps the type narrow.
  if (!i.packet.ok) return { ok: false, code: 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED' };
  return { ok: true, metadata: i.packet.metadata };
}

// ---- Packet assembly (erratum §2 attachment list + filename suffixes) ----

export interface PacketAttachment {
  filename: string;
  content: Buffer;
}

/**
 * The two RTC attachments to append to the produced 3-day notice for an LA notice.
 * Both EN + ES attach, always (no opt-out). `baseName` is the produced notice's
 * file stem (e.g. "notice_5537-la-mirada_2026-06-29").
 */
export function assembleLaPacketAttachments(
  baseName: string,
  packet: Extract<LoadPacketResult, { ok: true }>,
): PacketAttachment[] {
  return [
    { filename: `${baseName}_rtc_notice_en.pdf`, content: packet.english },
    { filename: `${baseName}_rtc_notice_es.pdf`, content: packet.spanish },
  ];
}
