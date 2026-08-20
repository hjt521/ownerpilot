// app/api/riskpath/[id]/service/pos010-preview/route.ts
// Synthetic/non-Production proof surface for exact stored evidence -> stamped derivative -> POS-010 attachment package.
// Preview-only. It is not filing/e-filing and does not determine service legality or sufficiency.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { loadSession, serviceClient } from '@/lib/chat/session';
import { SERVICE_EVIDENCE_BUCKET, hasFinalizedCreatedNoticeBinding } from '@/lib/riskpath/durableService';
import {
  buildStampedPhotoPayload,
  detectServiceEvidenceMime,
  sha256Hex,
  stampedPhotoStampLines,
} from '@/lib/riskpath/stampedServiceEvidence';
import {
  POS010_FORM_VERSION,
  POS010_SOURCE_RELATIVE_PATH,
  generatePos010PhotographicEvidencePackage,
  type Pos010PhotoAttachmentInput,
} from '@/lib/legal/pos010PhotographicEvidence';

const COOKIE = 'op_chat_token';
const noStore = { 'Cache-Control': 'no-store' } as const;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return `{${Object.keys(objectValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(objectValue[key])}`)
      .join(',')}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('canonicalJson: unsupported non-JSON value');
  return serialized;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'not_found' }, { status: 404, headers: noStore });
  const { id } = await params;
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  const sb = serviceClient();
  const session = await loadSession(token, sb);
  if (!session?.user_id) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });

  const { data: record } = await sb.from('riskpath_records')
    .select('id, user_id, soft_deleted_at, created_notice_artifact_id, created_notice_service_date, created_notice_generation, created_notice_semantic_binding_id, created_notice_finalized_at, e2e_run_id, synthetic_source')
    .eq('id', id).eq('user_id', session.user_id).is('soft_deleted_at', null).maybeSingle();
  if (!record || !hasFinalizedCreatedNoticeBinding(record) || record.synthetic_source !== 'e2e' || !record.e2e_run_id) {
    return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  }

  const { data: derivatives, error: derivativeError } = await sb.from('service_evidence_derivatives')
    .select('id, evidence_id, service_event_id, storage_object_path, server_sha256, source_server_sha256, capture_classification, capture_client_at, stamp_schema_version, stamp_payload, server_created_at')
    .eq('riskpath_record_id', record.id).eq('created_notice_artifact_id', record.created_notice_artifact_id)
    .order('server_created_at', { ascending: true });
  if (derivativeError) return NextResponse.json({ error: 'preview_attachment_unavailable' }, { status: 503, headers: noStore });
  if (!derivatives?.length) return NextResponse.json({ error: 'no_stamped_evidence' }, { status: 409, headers: noStore });

  const evidenceIds = derivatives.map((d) => d.evidence_id);
  const eventIds = [...new Set(derivatives.map((d) => d.service_event_id))];
  const [evidenceResult, eventResult, provenanceResult] = await Promise.all([
    sb.from('service_evidence_assets')
      .select('id, service_event_id, server_sha256, verified_mime_type, capture_source, geo_status, geo_source, latitude, longitude, accuracy_meters, geo_altitude_m, geo_altitude_accuracy_m, geo_heading_deg, geo_speed_mps, device_class, platform_family, browser_family, server_received_at, admitted_at')
      .in('id', evidenceIds).eq('riskpath_record_id', record.id).eq('created_notice_artifact_id', record.created_notice_artifact_id).not('admitted_at', 'is', null),
    sb.from('service_events')
      .select('id, attempt_date, method').in('id', eventIds).eq('riskpath_record_id', record.id).eq('created_notice_artifact_id', record.created_notice_artifact_id),
    sb.from('service_evidence_capture_provenance')
      .select('evidence_id, service_event_id, capture_classification, capture_client_at')
      .in('evidence_id', evidenceIds).eq('riskpath_record_id', record.id).eq('created_notice_artifact_id', record.created_notice_artifact_id),
  ]);
  if (evidenceResult.error || eventResult.error || provenanceResult.error) {
    return NextResponse.json({ error: 'preview_attachment_unavailable' }, { status: 503, headers: noStore });
  }
  const evidenceById = new Map((evidenceResult.data ?? []).map((row) => [row.id, row]));
  const eventById = new Map((eventResult.data ?? []).map((row) => [row.id, row]));
  const provenanceByEvidence = new Map((provenanceResult.data ?? []).map((row) => [row.evidence_id, row]));

  const photos: Pos010PhotoAttachmentInput[] = [];
  for (const derivative of derivatives) {
    const evidence = evidenceById.get(derivative.evidence_id);
    const event = eventById.get(derivative.service_event_id);
    const provenance = provenanceByEvidence.get(derivative.evidence_id);
    if (!evidence || !event || !provenance || evidence.service_event_id !== event.id || provenance.service_event_id !== event.id || !evidence.server_sha256) {
      return NextResponse.json({ error: 'preview_attachment_exact_binding_failed' }, { status: 409, headers: noStore });
    }
    if (
      evidence.capture_source !== 'CAMERA_INTENT' ||
      provenance.capture_classification !== 'CONTEMPORANEOUS_CAMERA_INTENT' ||
      !provenance.capture_client_at ||
      derivative.capture_classification !== 'CONTEMPORANEOUS_CAMERA_INTENT'
    ) {
      return NextResponse.json({ error: 'preview_attachment_capture_classification_failed' }, { status: 409, headers: noStore });
    }
    if (derivative.source_server_sha256 !== evidence.server_sha256 || derivative.capture_client_at !== provenance.capture_client_at) {
      return NextResponse.json({ error: 'preview_attachment_source_binding_failed' }, { status: 409, headers: noStore });
    }

    let payload;
    try {
      payload = buildStampedPhotoPayload({
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
      });
    } catch {
      return NextResponse.json({ error: 'preview_attachment_stamp_recompute_failed' }, { status: 409, headers: noStore });
    }
    if (canonicalJson(payload) !== canonicalJson(derivative.stamp_payload)) {
      return NextResponse.json({ error: 'preview_attachment_stamp_binding_failed' }, { status: 409, headers: noStore });
    }

    const { data: downloaded, error: downloadError } = await sb.storage.from(SERVICE_EVIDENCE_BUCKET).download(derivative.storage_object_path);
    if (downloadError || !downloaded) return NextResponse.json({ error: 'preview_attachment_derivative_unavailable' }, { status: 409, headers: noStore });
    const derivativeBytes = new Uint8Array(await downloaded.arrayBuffer());
    if (detectServiceEvidenceMime(derivativeBytes) !== 'application/pdf' || sha256Hex(derivativeBytes) !== derivative.server_sha256) {
      return NextResponse.json({ error: 'preview_attachment_derivative_hash_failed' }, { status: 409, headers: noStore });
    }
    photos.push({
      fact: {
        riskpathRecordId: record.id,
        createdNoticeArtifactId: record.created_notice_artifact_id,
        serviceEventId: event.id,
        attemptDate: event.attempt_date,
        method: event.method,
        evidenceId: evidence.id,
        captureClassification: provenance.capture_classification,
        captureClientAt: provenance.capture_client_at,
        serverReceivedAt: evidence.server_received_at,
        geoStatus: evidence.geo_status,
        geoSource: evidence.geo_source,
        latitude: evidence.latitude,
        longitude: evidence.longitude,
        accuracyMeters: evidence.accuracy_meters,
        originalSha256: evidence.server_sha256,
        stampedDerivativeSha256: derivative.server_sha256,
        stampSchemaVersion: derivative.stamp_schema_version,
        stampText: stampedPhotoStampLines(payload).join('\n'),
        exceptionKind: null,
        exceptionExplanation: null,
      },
      stampedDerivativePdfBytes: derivativeBytes,
    });
  }

  let officialPos010Bytes: Uint8Array;
  try {
    officialPos010Bytes = new Uint8Array(await readFile(join(process.cwd(), ...POS010_SOURCE_RELATIVE_PATH.split('/'))));
  } catch {
    return NextResponse.json({ error: 'governed_pos010_asset_unavailable' }, { status: 503, headers: noStore });
  }

  let result;
  try {
    result = await generatePos010PhotographicEvidencePackage({ officialPos010Bytes, photos });
  } catch {
    return NextResponse.json({ error: 'preview_pos010_generation_failed' }, { status: 503, headers: noStore });
  }

  return new NextResponse(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      ...noStore,
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="OwnerPilot-POS-010-photo-evidence-preview.pdf"',
      'X-OwnerPilot-Preview-Only': 'true',
      'X-OwnerPilot-POS010-Form-Version': POS010_FORM_VERSION,
      'X-OwnerPilot-POS010-Package-SHA256': result.packageSha256,
      'X-OwnerPilot-POS010-Attachment-Binding': result.attachmentBindingSha256,
      'X-OwnerPilot-POS010-Source-SHA256': result.sourceSha256,
      'X-OwnerPilot-POS010-Photo-Count': String(result.attachmentCount),
    },
  });
}
