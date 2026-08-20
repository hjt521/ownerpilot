// app/api/notices/[riskpathId]/created-notice/finalize/route.ts
// Finalizes the exact pending Created Notice binding only after the client has successfully rendered the
// same produce envelope and reached the existing LA produce-ready / acknowledgment point.
// Artifact identity is a binding nonce, never authorization.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import type { IntakeState } from '@/lib/chat/intakeSchema';
import {
  hasCompleteCreatedNoticeBinding,
  recomputeCreatedNoticeBinding,
} from '@/lib/riskpath/durableService';

const COOKIE = 'op_chat_token';
const bodySchema = z.object({ createdNoticeArtifactId: z.string().uuid() }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ riskpathId: string }> },
) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const { riskpathId } = await params;
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session?.user_id) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });

  const { data: record } = await sb
    .from('riskpath_records')
    .select('id, user_id, soft_deleted_at, captured_payload, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
    .eq('id', riskpathId)
    .eq('user_id', session.user_id)
    .is('soft_deleted_at', null)
    .maybeSingle();

  if (!record) return NextResponse.json({ error: 'record_unavailable' }, { status: 404 });
  if (!hasCompleteCreatedNoticeBinding(record)) {
    return NextResponse.json({ error: 'created_notice_identity_unavailable' }, { status: 409 });
  }
  if (record.created_notice_artifact_id !== parsed.data.createdNoticeArtifactId) {
    return NextResponse.json({ error: 'created_notice_identity_mismatch' }, { status: 409 });
  }

  let recomputed: ReturnType<typeof recomputeCreatedNoticeBinding>;
  try {
    recomputed = recomputeCreatedNoticeBinding({
      intakeState: record.captured_payload as IntakeState,
      intendedServiceDate: record.created_notice_service_date,
    });
  } catch {
    return NextResponse.json({ error: 'created_notice_identity_recompute_failed' }, { status: 409 });
  }

  if (
    recomputed.created_notice_generation !== record.created_notice_generation ||
    recomputed.created_notice_semantic_binding_id !== record.created_notice_semantic_binding_id
  ) {
    return NextResponse.json({ error: 'created_notice_identity_mismatch' }, { status: 409 });
  }

  // Exact already-finalized identity is safely idempotent. No identity field is rewritten.
  if (record.created_notice_finalized_at) {
    return NextResponse.json(
      { ok: true, riskpathId: record.id, finalized: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const finalizedAt = new Date().toISOString();
  const { data: finalized, error } = await sb
    .from('riskpath_records')
    .update({ created_notice_finalized_at: finalizedAt })
    .eq('id', record.id)
    .eq('user_id', session.user_id)
    .eq('created_notice_artifact_id', parsed.data.createdNoticeArtifactId)
    .eq('created_notice_generation', record.created_notice_generation)
    .eq('created_notice_semantic_binding_id', record.created_notice_semantic_binding_id)
    .eq('created_notice_service_date', record.created_notice_service_date)
    .is('soft_deleted_at', null)
    .is('created_notice_finalized_at', null)
    .select('id, created_notice_finalized_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'created_notice_finalization_failed' }, { status: 503 });
  if (!finalized) {
    // A concurrent same-artifact finalization may have won. Re-read and accept only exact immutable identity.
    const { data: current } = await sb
      .from('riskpath_records')
      .select('id, user_id, soft_deleted_at, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
      .eq('id', record.id)
      .eq('user_id', session.user_id)
      .is('soft_deleted_at', null)
      .maybeSingle();
    if (
      current &&
      current.created_notice_artifact_id === record.created_notice_artifact_id &&
      current.created_notice_service_date === record.created_notice_service_date &&
      current.created_notice_generation === record.created_notice_generation &&
      current.created_notice_semantic_binding_id === record.created_notice_semantic_binding_id &&
      current.created_notice_finalized_at
    ) {
      return NextResponse.json(
        { ok: true, riskpathId: current.id, finalized: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return NextResponse.json({ error: 'created_notice_finalization_denied' }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, riskpathId: finalized.id, finalized: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
