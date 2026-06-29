/**
 * LA produce client orchestration (Phase 2D client wiring §3).
 *
 * The async sequence the wizard runs before producing a City-of-LA notice:
 *   1. POST /verify-la  → 409 ⇒ blocked(code); 200 ⇒ continue
 *   2. GET  /la-packet  → 409 ⇒ blocked(code); 200 ⇒ ready(attachments, metadata)
 * Non-confirmed_la short-circuits to not_applicable (statewide produce, no LA steps).
 *
 * Pure over an injected fetch so it is unit-testable; the React panel calls it with
 * the real `fetch` and renders the result (locked block copy on blocked; the LAHD
 * prompt + acknowledgment on ready). Fail-safe: network/parse errors → 'error'
 * (the panel treats this as not-producible, same as a block).
 */
import type { LaProduceBlockCode } from './laProduceGate';
import type { RtcPacketMetadata } from '../rtc/loadCurrentPacket';
import type { DeliveredAttachment } from './laPacketDelivery';

/** Produce-time audit fields written on owner acknowledgment (ruling erratum §2). */
export interface LaProduceAuditFields {
  rtcFormHashes: { english: string; spanish: string } | null;
  rtcFormLastModified: { english: string; spanish: string } | null;
  rtcRefreshRunAt: string | null;
  lahdFilingPromptCopyVersion: string;
  lahdFilingPromptAcknowledgedAt: string;
  isLaProductionUnblockedAtProduce: boolean;
  cachedResolverVerdictSource: string;
}

export interface LaProduceSequenceDeps {
  verdict: string;
  lahdCopyVersion: string;
  baseName: string;
  fetchImpl: typeof fetch;
}

export type LaProduceSequenceResult =
  | { kind: 'not_applicable' }
  | { kind: 'blocked'; code: LaProduceBlockCode }
  | { kind: 'ready'; attachments: DeliveredAttachment[]; metadata: RtcPacketMetadata | null }
  | { kind: 'error'; detail: string };

const BLOCK_CODES: ReadonlySet<string> = new Set([
  'JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE',
  'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED',
]);

function asBlockCode(v: unknown): LaProduceBlockCode {
  return typeof v === 'string' && BLOCK_CODES.has(v)
    ? (v as LaProduceBlockCode)
    : 'JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED';
}

export async function runLaProduceSequence(
  deps: LaProduceSequenceDeps,
): Promise<LaProduceSequenceResult> {
  if (deps.verdict !== 'confirmed_la') return { kind: 'not_applicable' };

  // 1. Server assertion.
  let verify: Response;
  try {
    verify = await deps.fetchImpl('/api/notice/produce/verify-la', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict: deps.verdict, lahdCopyVersion: deps.lahdCopyVersion }),
    });
  } catch (e) {
    return { kind: 'error', detail: `verify-la fetch: ${String((e as Error).message ?? e)}` };
  }
  if (verify.status === 409) {
    const j = (await verify.json().catch(() => ({}))) as { code?: unknown };
    return { kind: 'blocked', code: asBlockCode(j.code) };
  }
  if (!verify.ok) return { kind: 'error', detail: `verify-la ${verify.status}` };

  // 2. Packet delivery (re-asserts server-side).
  const q = new URLSearchParams({
    verdict: deps.verdict,
    lahdCopyVersion: deps.lahdCopyVersion,
    baseName: deps.baseName,
  }).toString();
  let packet: Response;
  try {
    packet = await deps.fetchImpl(`/api/notice/produce/la-packet?${q}`);
  } catch (e) {
    return { kind: 'error', detail: `la-packet fetch: ${String((e as Error).message ?? e)}` };
  }
  if (packet.status === 409) {
    const j = (await packet.json().catch(() => ({}))) as { code?: unknown };
    return { kind: 'blocked', code: asBlockCode(j.code) };
  }
  if (!packet.ok) return { kind: 'error', detail: `la-packet ${packet.status}` };

  const body = (await packet.json().catch(() => null)) as
    | { ok?: boolean; attachments?: DeliveredAttachment[]; metadata?: RtcPacketMetadata | null }
    | null;
  if (!body || body.ok !== true || !Array.isArray(body.attachments)) {
    return { kind: 'error', detail: 'la-packet malformed body' };
  }
  return { kind: 'ready', attachments: body.attachments, metadata: body.metadata ?? null };
}
