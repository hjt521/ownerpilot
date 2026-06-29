/**
 * GET /api/notice/produce/la-packet — RTC packet delivery (Phase 2D §3, [RATIFIED]).
 *
 * Returns the two RTC PDFs (base64) for an LA notice, but ONLY after re-running the
 * full server assertion (defense in depth — never trusts a prior verify-la pass).
 * 200 + attachments when authorized; 409 with the blocking code otherwise. No-store
 * (each produce re-asserts). Emits a non-PII audit event on EVERY branch.
 *
 * While PHASE2D_ASSEMBLY_ENGINE_WIRED is false (current), this always 409s — live
 * behavior unchanged.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { deliverLaPacket } from '@/lib/produce/laPacketDelivery';
import { loadCurrentPacketFromDisk } from '@/lib/rtc/loadCurrentPacket';
import { isLaProductionUnblocked, isLaProducePhase2dWired } from '@/lib/jurisdiction/laRtcRules';
import { lahdFilingPromptCopyVersion } from '@/lib/copy/lahd/lahdFilingPromptCopy';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const verdict = url.searchParams.get('verdict') ?? '';
  const lahdCopyVersion = url.searchParams.get('lahdCopyVersion') ?? '';
  const baseName = url.searchParams.get('baseName') ?? 'notice';

  const result = deliverLaPacket({
    baseName,
    verdict,
    productionUnblocked: isLaProductionUnblocked(),
    phase2dWired: isLaProducePhase2dWired(),
    packet: loadCurrentPacketFromDisk(),
    lahdCopyVersion,
    currentLahdCopyVersion: lahdFilingPromptCopyVersion,
  });

  // Audit on every 200 AND 409 (§3). Non-PII: no address, just verdict + outcome.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: 'la_packet_delivery',
      status: result.status,
      verdict,
      code: result.status === 409 ? result.body.code : null,
      attachments: result.status === 200 ? result.body.attachments.length : 0,
      at: new Date().toISOString(),
    }),
  );

  const res = NextResponse.json(result.body, { status: result.status });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
