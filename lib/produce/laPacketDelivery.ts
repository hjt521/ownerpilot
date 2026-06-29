/**
 * LA packet delivery logic (Phase 2D client-wiring authorization §3).
 *
 * The delivery endpoint (GET /api/notice/produce/la-packet) returns the two RTC
 * PDFs to the client for an LA notice — but ONLY after re-running the full
 * `verifyLaProduce` assertion (defense in depth: never trust a client "I already
 * passed verify-la" signal). On block, 409 with the same code as verify-la. This
 * is the pure core; the route supplies real flags + the loaded packet and adds the
 * no-store header + audit-sink entry on every branch.
 */
import { verifyLaProduce, assembleLaPacketAttachments, type VerifyLaProduceInput } from './laProduceServer';
import type { LaProduceBlockCode } from './laProduceGate';
import type { RtcPacketMetadata } from '../rtc/loadCurrentPacket';

export interface DeliverLaPacketInput extends VerifyLaProduceInput {
  /** Produced-notice file stem used for the RTC attachment filenames. */
  baseName: string;
}

export interface DeliveredAttachment {
  filename: string;
  contentBase64: string;
}

export type DeliverLaPacketResult =
  | { status: 200; body: { ok: true; attachments: DeliveredAttachment[]; metadata: RtcPacketMetadata | null } }
  | { status: 409; body: { ok: false; code: LaProduceBlockCode } };

export function deliverLaPacket(i: DeliverLaPacketInput): DeliverLaPacketResult {
  const v = verifyLaProduce(i);
  if (!v.ok) return { status: 409, body: { ok: false, code: v.code } };
  // Non-LA (or, defensively, an unloaded packet) → no RTC attachments.
  if (i.verdict !== 'confirmed_la' || !i.packet.ok) {
    return { status: 200, body: { ok: true, attachments: [], metadata: v.metadata } };
  }
  const attachments = assembleLaPacketAttachments(i.baseName, i.packet).map((a) => ({
    filename: a.filename,
    contentBase64: a.content.toString('base64'),
  }));
  return { status: 200, body: { ok: true, attachments, metadata: v.metadata } };
}
