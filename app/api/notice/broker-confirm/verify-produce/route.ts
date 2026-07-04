/**
 * POST /api/notice/broker-confirm/verify-produce — produce cross-check (Decision 2
 * produce-gate ruling §2, Guardrail 1). The wizard calls this before producing on a
 * `source === 'broker_confirm'` verdict. Verifies the durable attestation row
 * (token-scoped) authorizes produce for the address: confirmed_la + address match +
 * 30-day freshness. Fail-closed — anything but ok blocks produce.
 *
 * Response: 200 {ok:true} | 200 {ok:false, reason} (blocked) | 400 invalid | 503 db_error.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyProduceBrokerConfirm, type BrokerConfirmClient } from '@/lib/brokerConfirm/brokerConfirmServer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token?: unknown; address?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; address?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const address = typeof body.address === 'string' ? body.address : '';

  const supabase = (await createClient()) as unknown as BrokerConfirmClient;
  const result = await verifyProduceBrokerConfirm(supabase, token, address);

  if (result.ok) return NextResponse.json({ ok: true }, { status: 200 });
  if (result.reason === 'db_error') return NextResponse.json({ ok: false, reason: 'db_error' }, { status: 503 });
  if (result.reason === 'invalid') return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  // not_found / address_mismatch / not_confirmed / stale_attestation → blocked, but a
  // well-formed answer (200). The wizard invalidates its cache and prompts re-resolution.
  return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
}
