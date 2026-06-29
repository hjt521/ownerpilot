/**
 * POST /api/notice/produce/verify-la — server-side LA produce assertion (Decision 2
 * produce-gate; la_notice_production_gap ruling §2 [MUST FIX]).
 *
 * The wizard renders the notice client-side, so it MUST clear this server check
 * before assembling an LA (confirmed_la) packet. Fail-closed: returns 200 {ok:true}
 * with the RTC metadata only when Phase 2D is wired AND the predicate gate is open
 * AND both RTC PDFs load with matching SHAs AND the LAHD copy version matches;
 * otherwise 409 with the blocking code.
 *
 * While PHASE2D_ASSEMBLY_ENGINE_WIRED is false (current), this always 409s
 * NOT_YET_AVAILABLE — the live behavior is unchanged.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { verifyLaProduce } from '@/lib/produce/laProduceServer';
import { loadCurrentPacketFromDisk } from '@/lib/rtc/loadCurrentPacket';
import { isLaProductionUnblocked, isLaProducePhase2dWired } from '@/lib/jurisdiction/laRtcRules';
import { lahdFilingPromptCopyVersion } from '@/lib/copy/lahd/lahdFilingPromptCopy';

// nodejs runtime: loadCurrentPacket reads the RTC PDFs from disk + hashes them.
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { verdict?: unknown; lahdCopyVersion?: unknown };
  try {
    body = (await req.json()) as { verdict?: unknown; lahdCopyVersion?: unknown };
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }
  const verdict = typeof body.verdict === 'string' ? body.verdict : '';
  const lahdCopyVersion = typeof body.lahdCopyVersion === 'string' ? body.lahdCopyVersion : '';

  const result = verifyLaProduce({
    verdict,
    productionUnblocked: isLaProductionUnblocked(),
    phase2dWired: isLaProducePhase2dWired(),
    packet: loadCurrentPacketFromDisk(),
    lahdCopyVersion,
    currentLahdCopyVersion: lahdFilingPromptCopyVersion,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, metadata: result.metadata }, { status: 200 });
  }
  // 409 (ruling §2.2): produce blocked. NOT_YET_AVAILABLE (not wired) vs
  // ATTACHMENT_FAILED (wired but runtime precondition failed) — distinct codes for logs.
  return NextResponse.json({ ok: false, code: result.code }, { status: 409 });
}
