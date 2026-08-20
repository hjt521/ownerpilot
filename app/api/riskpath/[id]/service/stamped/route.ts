// app/api/riskpath/[id]/service/stamped/route.ts
// Issue #393 additive stamped-photo provenance/derivative rail layered over Durable Service Evidence V1.
// The accepted PR #392 service API stays byte-identical; this route never determines service legality or sufficiency.

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import {
  SERVICE_EVIDENCE_BUCKET,
  hasFinalizedCreatedNoticeBinding,
  type CreatedNoticeBindingRecord,
} from '@/lib/riskpath/durableService';
import {
  MAX_STAMPED_DERIVATIVE_BYTES,
  STAMPED_DERIVATIVE_KIND,
  STAMP_SCHEMA_VERSION,
  buildServiceEvidenceCaptureFields,
  detectServiceEvidenceMime,
  renderStampedPhotoDerivative,
  sha256Hex,
  type StampedPhotoCanonicalInput,
} from '@/lib/riskpath/stampedServiceEvidence';

const COOKIE = 'op_chat_token';
const noStore = { 'Cache-Control': 'no-store' } as const;

const registerSchema = z.object({
  action: z.literal('register_capture_provenance'),
  evidenceId: z.string().uuid(),
  captureClientAt: z.string().datetime({ offset: true }).nullable(),
}).strict();
const finalizeSchema = z.object({ action: z.literal('finalize_stamped_derivative'), evidenceId: z.string().uuid() }).strict();
const readSchema = z.object({ action: z.literal('stamped_derivative_read'), derivativeId: z.string().uuid() }).strict();
const actionSchema = z.discriminatedUnion('action', [registerSchema, finalizeSchema, readSchema]);

function sameInstant(a: string | null, b: string | null): boolean {
  if (a == null || b == null) return a === b;
  const aMs = Date.parse(a);
  const bMs = Date.parse(b);
  return Number.isFinite(aMs) && Number.isFinite(bMs) && aMs === bMs;
}

type AuthorizedRecord = CreatedNoticeBindingRecord & {
  id: string;
  user_id: string;
  soft_deleted_at: null;
  created_notice_artifact_id: string;
  created_notice_service_date: string;
  created_notice_generation: string;
  created_notice_semantic_binding_id: string;
  created_notice_finalized_at: string;
};
type Authorized = { sb: ReturnType<typeof serviceClient>; userId: string; record: AuthorizedRecord };

type AdmittedEvidence = {
  id: string;
  service_event_id: string;
  storage_object_path: string;
  verified_mime_type: 'image/jpeg' | 'image/png' | 'application/pdf';
  server_sha256: string;
  capture_source: 'CAMERA_INTENT' | 'FILE_PICKER' | 'DOCUMENT_UPLOAD';
  geo_status: 'CAPTURED' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OPTED_OUT' | 'NOT_REQUESTED';
  geo_source: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  geo_altitude_m: number | null;
  geo_altitude_accuracy_m: number | null;
  geo_heading_deg: number | null;
  geo_speed_mps: number | null;
  device_class: string;
  platform_family: string;
  browser_family: string;
  admitted_at: string;
};

async function authorizeExactRecord(req: NextRequest, riskpathId: string): Promise<Authorized | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session?.user_id) return null;
  const { data: record } = await sb.from('riskpath_records')
    .select('id, user_id, soft_deleted_at, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at')
    .eq('id', riskpathId).eq('user_id', session.user_id).is('soft_deleted_at', null).maybeSingle();
  if (!record || !hasFinalizedCreatedNoticeBinding(record)) return null;
  return { sb, userId: session.user_id, record: record as AuthorizedRecord };
}

async function exactServiceEventExists(auth: Authorized, serviceEventId: string): Promise<boolean> {
  const { data } = await auth.sb.from('service_events').select('id')
    .eq('id', serviceEventId).eq('riskpath_record_id', auth.record.id)
    .eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).maybeSingle();
  return !!data;
}

async function admittedEvidence(auth: Authorized, evidenceId: string): Promise<AdmittedEvidence | null> {
  const { data } = await auth.sb.from('service_evidence_assets')
    .select('id, service_event_id, storage_object_path, verified_mime_type, server_sha256, capture_source, geo_status, geo_source, latitude, longitude, accuracy_meters, geo_altitude_m, geo_altitude_accuracy_m, geo_heading_deg, geo_speed_mps, device_class, platform_family, browser_family, admitted_at')
    .eq('id', evidenceId).eq('riskpath_record_id', auth.record.id)
    .eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).not('admitted_at', 'is', null).maybeSingle();
  if (!data || !data.server_sha256 || !data.verified_mime_type || !(await exactServiceEventExists(auth, data.service_event_id))) return null;
  return data as AdmittedEvidence;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeExactRecord(req, id);
  if (!auth) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  const [provenanceResult, derivativeResult] = await Promise.all([
    auth.sb.from('service_evidence_capture_provenance')
      .select('id, evidence_id, service_event_id, capture_classification, capture_client_at, server_registered_at')
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .order('server_registered_at', { ascending: true }),
    auth.sb.from('service_evidence_derivatives')
      .select('id, evidence_id, service_event_id, derivative_kind, verified_mime_type, verified_byte_size, server_sha256, source_server_sha256, capture_classification, capture_client_at, stamp_schema_version, stamp_payload, server_created_at')
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .order('server_created_at', { ascending: true }),
  ]);
  if (provenanceResult.error || derivativeResult.error) return NextResponse.json({ error: 'stamped_history_unavailable' }, { status: 503, headers: noStore });
  return NextResponse.json({ ok: true, provenance: provenanceResult.data ?? [], derivatives: derivativeResult.data ?? [] }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeExactRecord(req, id);
  if (!auth) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: noStore });

  if (parsed.data.action === 'register_capture_provenance') {
    const { data: evidence } = await auth.sb.from('service_evidence_assets')
      .select('id, service_event_id, capture_source, declared_mime_type, admitted_at')
      .eq('id', parsed.data.evidenceId).eq('riskpath_record_id', auth.record.id)
      .eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).maybeSingle();
    if (!evidence || !(await exactServiceEventExists(auth, evidence.service_event_id))) {
      return NextResponse.json({ error: 'evidence_unavailable' }, { status: 404, headers: noStore });
    }
    if (evidence.admitted_at) return NextResponse.json({ error: 'capture_provenance_must_precede_admission' }, { status: 409, headers: noStore });

    let captureFields;
    try {
      captureFields = buildServiceEvidenceCaptureFields({
        captureSource: evidence.capture_source,
        mimeType: evidence.declared_mime_type,
        captureClientAt: parsed.data.captureClientAt,
      });
    } catch {
      return NextResponse.json({ error: 'invalid_capture_provenance' }, { status: 400, headers: noStore });
    }

    const { data: existing } = await auth.sb.from('service_evidence_capture_provenance')
      .select('id, capture_classification, capture_client_at').eq('evidence_id', evidence.id)
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .eq('service_event_id', evidence.service_event_id).maybeSingle();
    if (existing) {
      if (existing.capture_classification !== captureFields.capture_classification || !sameInstant(existing.capture_client_at, captureFields.capture_client_at)) {
        return NextResponse.json({ error: 'capture_provenance_conflict' }, { status: 409, headers: noStore });
      }
      return NextResponse.json({ ok: true, provenanceId: existing.id, ...captureFields }, { headers: noStore });
    }

    const provenanceId = randomUUID();
    const { data: inserted, error } = await auth.sb.from('service_evidence_capture_provenance').insert({
      id: provenanceId,
      riskpath_record_id: auth.record.id,
      created_notice_artifact_id: auth.record.created_notice_artifact_id,
      service_event_id: evidence.service_event_id,
      evidence_id: evidence.id,
      ...captureFields,
      created_by_user_id: auth.userId,
    }).select('id, capture_classification, capture_client_at').single();
    if (error || !inserted) return NextResponse.json({ error: 'capture_provenance_write_failed' }, { status: 503, headers: noStore });
    return NextResponse.json({ ok: true, provenanceId: inserted.id, captureClassification: inserted.capture_classification, captureClientAt: inserted.capture_client_at }, { headers: noStore });
  }

  if (parsed.data.action === 'finalize_stamped_derivative') {
    const evidence = await admittedEvidence(auth, parsed.data.evidenceId);
    if (!evidence) return NextResponse.json({ error: 'evidence_unavailable' }, { status: 404, headers: noStore });
    const { data: provenance } = await auth.sb.from('service_evidence_capture_provenance')
      .select('id, capture_classification, capture_client_at').eq('evidence_id', evidence.id)
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .eq('service_event_id', evidence.service_event_id).maybeSingle();
    if (!provenance || provenance.capture_classification !== 'CONTEMPORANEOUS_CAMERA_INTENT' || !provenance.capture_client_at) {
      return NextResponse.json({ error: 'contemporaneous_capture_provenance_unavailable' }, { status: 409, headers: noStore });
    }

    const { data: existing } = await auth.sb.from('service_evidence_derivatives')
      .select('id, server_sha256, source_server_sha256, capture_client_at').eq('evidence_id', evidence.id)
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .eq('service_event_id', evidence.service_event_id).maybeSingle();
    if (existing) {
      if (existing.source_server_sha256 !== evidence.server_sha256 || !sameInstant(existing.capture_client_at, provenance.capture_client_at)) {
        return NextResponse.json({ error: 'stamped_derivative_binding_conflict' }, { status: 409, headers: noStore });
      }
      return NextResponse.json({ ok: true, derivativeId: existing.id, sha256: existing.server_sha256 }, { headers: noStore });
    }

    const { data: downloaded, error: downloadError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET).download(evidence.storage_object_path);
    if (downloadError || !downloaded) return NextResponse.json({ error: 'evidence_object_unavailable' }, { status: 409, headers: noStore });
    const originalBytes = new Uint8Array(await downloaded.arrayBuffer());
    if (detectServiceEvidenceMime(originalBytes) !== evidence.verified_mime_type || sha256Hex(originalBytes) !== evidence.server_sha256) {
      return NextResponse.json({ error: 'evidence_original_recheck_failed' }, { status: 409, headers: noStore });
    }
    if (!['image/jpeg', 'image/png'].includes(evidence.verified_mime_type)) {
      return NextResponse.json({ error: 'stamped_derivative_requires_image' }, { status: 409, headers: noStore });
    }

    let rendered;
    try {
      const canonical: StampedPhotoCanonicalInput = {
        evidenceId: evidence.id,
        originalSha256: evidence.server_sha256,
        captureClassification: 'CONTEMPORANEOUS_CAMERA_INTENT',
        captureClientAt: provenance.capture_client_at,
        geoStatus: evidence.geo_status,
        geoSource: evidence.geo_source,
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        accuracyMeters: evidence.accuracy_meters,
        geoAltitudeM: evidence.geo_altitude_m,
        geoAltitudeAccuracyM: evidence.geo_altitude_accuracy_m,
        geoHeadingDeg: evidence.geo_heading_deg,
        geoSpeedMps: evidence.geo_speed_mps,
        deviceClass: evidence.device_class,
        platformFamily: evidence.platform_family,
        browserFamily: evidence.browser_family,
      };
      rendered = await renderStampedPhotoDerivative(originalBytes, evidence.verified_mime_type as 'image/jpeg' | 'image/png', canonical);
    } catch {
      return NextResponse.json({ error: 'stamped_derivative_render_failed' }, { status: 409, headers: noStore });
    }
    if (rendered.bytes.byteLength > MAX_STAMPED_DERIVATIVE_BYTES) return NextResponse.json({ error: 'stamped_derivative_too_large' }, { status: 409, headers: noStore });

    const derivativeId = randomUUID();
    const objectPath = `${randomUUID()}/${randomUUID()}/${randomUUID()}`;
    const { error: uploadError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET)
      .upload(objectPath, rendered.bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) return NextResponse.json({ error: 'stamped_derivative_storage_failed' }, { status: 503, headers: noStore });

    const { data: inserted, error: insertError } = await auth.sb.from('service_evidence_derivatives').insert({
      id: derivativeId,
      riskpath_record_id: auth.record.id,
      created_notice_artifact_id: auth.record.created_notice_artifact_id,
      service_event_id: evidence.service_event_id,
      evidence_id: evidence.id,
      derivative_kind: STAMPED_DERIVATIVE_KIND,
      storage_object_path: objectPath,
      verified_mime_type: 'application/pdf',
      verified_byte_size: rendered.bytes.byteLength,
      server_sha256: rendered.sha256,
      source_server_sha256: evidence.server_sha256,
      capture_classification: 'CONTEMPORANEOUS_CAMERA_INTENT',
      capture_client_at: provenance.capture_client_at,
      stamp_schema_version: STAMP_SCHEMA_VERSION,
      stamp_payload: rendered.stampPayload,
    }).select('id, server_sha256').maybeSingle();
    if (insertError || !inserted) {
      await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET).remove([objectPath]);
      const { data: raced } = await auth.sb.from('service_evidence_derivatives')
        .select('id, server_sha256, source_server_sha256, capture_client_at').eq('evidence_id', evidence.id)
        .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
        .eq('service_event_id', evidence.service_event_id).maybeSingle();
      if (raced?.id && raced.server_sha256 && raced.source_server_sha256 === evidence.server_sha256 && sameInstant(raced.capture_client_at, provenance.capture_client_at)) {
        return NextResponse.json({ ok: true, derivativeId: raced.id, sha256: raced.server_sha256 }, { headers: noStore });
      }
      return NextResponse.json({ error: 'stamped_derivative_record_failed' }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ ok: true, derivativeId: inserted.id, sha256: inserted.server_sha256 }, { headers: noStore });
  }

  const { data: derivative } = await auth.sb.from('service_evidence_derivatives')
    .select('id, evidence_id, service_event_id, storage_object_path').eq('id', parsed.data.derivativeId)
    .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).maybeSingle();
  if (!derivative || !(await exactServiceEventExists(auth, derivative.service_event_id))) {
    return NextResponse.json({ error: 'derivative_unavailable' }, { status: 404, headers: noStore });
  }
  const { data: source } = await auth.sb.from('service_evidence_assets').select('id').eq('id', derivative.evidence_id)
    .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
    .eq('service_event_id', derivative.service_event_id).not('admitted_at', 'is', null).maybeSingle();
  if (!source) return NextResponse.json({ error: 'derivative_unavailable' }, { status: 404, headers: noStore });
  const { data: signed, error: signError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET)
    .createSignedUrl(derivative.storage_object_path, 60, { download: 'OwnerPilot-stamped-service-evidence.pdf' });
  if (signError || !signed?.signedUrl) return NextResponse.json({ error: 'derivative_read_unavailable' }, { status: 503, headers: noStore });
  return NextResponse.json({ ok: true, signedUrl: signed.signedUrl }, { headers: noStore });
}
