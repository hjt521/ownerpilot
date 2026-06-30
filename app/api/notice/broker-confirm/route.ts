// app/api/notice/broker-confirm/route.ts — POST submit (master prompt §4.1)
// Creates a broker-confirm request. Returns the raw token ONCE. Never stores/logs the raw token.

import { NextRequest, NextResponse } from 'next/server';
import { submitSchema } from '@/lib/decision2/schemas';
import { generateToken, hashToken } from '@/lib/decision2/token';
import { normalizeAddress } from '@/lib/decision2/normalize';
import { serviceRoleClient } from '@/lib/decision2/db';

const SLA_HOURS = 24;
const CONTACT_PURGE_DAYS = 90;

export async function POST(req: NextRequest) {
  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request', detail: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const addressNormalized = normalizeAddress(body.addressRaw);

  const submittedAt = new Date();
  const slaDueAt = new Date(submittedAt.getTime() + SLA_HOURS * 3600_000);
  const contactPurgeAt = new Date(submittedAt.getTime() + CONTACT_PURGE_DAYS * 86_400_000);

  const sb = serviceRoleClient();

  // Count prior denials for this address (status not_la / inconclusive).
  const { count: priorDenials } = await sb
    .from('broker_confirm_requests')
    .select('*', { count: 'exact', head: true })
    .eq('address_normalized', addressNormalized)
    .in('status', ['not_la', 'inconclusive']);

  const { data, error } = await sb
    .from('broker_confirm_requests')
    .insert({
      requester_token_hash: tokenHash,
      requester_contact: body.requesterContact ?? null,
      address_raw: body.addressRaw,
      address_normalized: addressNormalized,
      prior_resolver_verdict: 'manual_review',
      prior_review_reason: body.priorReviewReason,
      prior_failure_mode: body.priorFailureMode ?? null,
      status: 'pending',
      sla_due_at: slaDueAt.toISOString(),
      contact_purge_at: contactPurgeAt.toISOString(),
      prior_denial_count: priorDenials ?? 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`broker-confirm submit failed reqHashPrefix=${tokenHash.slice(0, 8)}`, error.message);
    return NextResponse.json({ error: 'could not create request' }, { status: 500 });
  }

  // Log only request UUID + masked hash prefix — NEVER the raw token.
  console.info(`broker-confirm submitted id=${data.id} hashPrefix=${tokenHash.slice(0, 8)}`);

  return NextResponse.json({
    token: rawToken,
    statusUrl: `/broker-review/${rawToken}`,
    slaDueAt: slaDueAt.toISOString(),
  });
}
