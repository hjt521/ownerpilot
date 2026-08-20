// app/api/riskpath/[id]/service/route.ts
// Durable Service Evidence V1 — exact-record authenticated service history and evidence admission.
// Route ids, artifact ids, signed upload tokens, and Storage paths are never matter authorization.

import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSession, serviceClient } from '@/lib/chat/session';
import {
  MAX_SERVICE_EVIDENCE_BYTES,
  SERVICE_EVIDENCE_BUCKET,
  buildServiceEvidenceGeoFields,
  hasFinalizedCreatedNoticeBinding,
  type CreatedNoticeBindingRecord,
  type ServiceEvidenceMimeType,
} from '@/lib/riskpath/durableService';

const COOKIE = 'op_chat_token';
const noStore = { 'Cache-Control': 'no-store' } as const;

const finiteNumber = z.number().refine(Number.isFinite, { message: 'must be finite' });
const latitudeNumber = finiteNumber.refine((v) => v >= -90 && v <= 90, { message: 'latitude out of range' });
const longitudeNumber = finiteNumber.refine((v) => v >= -180 && v <= 180, { message: 'longitude out of range' });
const nonNegativeFinite = finiteNumber.refine((v) => v >= 0, { message: 'must be non-negative' });
const headingNumber = finiteNumber.refine((v) => v >= 0 && v < 360, { message: 'heading out of range' });

const serviceEventSchema = z.object({
  action: z.literal('record_service_event'),
  attemptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(['personal', 'substituted', 'post_and_mail']),
  outcome: z.enum(['SUCCESS', 'FAILED']),
  mailingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  serverName: z.string().trim().min(1).max(200),
  serverAddress: z.string().trim().min(1).max(500),
  serverAge18Plus: z.boolean(),
  serverPartyToNotice: z.boolean(),
  clientRecordedAt: z.string().datetime({ offset: true }),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  correctionOfServiceEventId: z.string().uuid().nullable().optional(),
}).strict();

const evidenceIntentSchema = z.object({
  action: z.literal('evidence_upload_intent'),
  serviceEventId: z.string().uuid(),
  evidenceKind: z.enum(['POSTING_PHOTO', 'MAILING_ENVELOPE_PHOTO', 'PROOF_OF_MAILING', 'SERVICE_PHOTO', 'OTHER_SERVICE_DOCUMENT']),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  byteSize: z.number().int().min(1).max(MAX_SERVICE_EVIDENCE_BYTES),
  captureSource: z.enum(['CAMERA_INTENT', 'FILE_PICKER', 'DOCUMENT_UPLOAD']),
  geoStatus: z.enum(['CAPTURED', 'PERMISSION_DENIED', 'UNAVAILABLE', 'OPTED_OUT', 'NOT_REQUESTED']),
  latitude: latitudeNumber.nullable().optional(),
  longitude: longitudeNumber.nullable().optional(),
  accuracyMeters: nonNegativeFinite.nullable().optional(),
  geoAltitudeM: finiteNumber.nullable().optional(),
  geoAltitudeAccuracyM: nonNegativeFinite.nullable().optional(),
  geoHeadingDeg: headingNumber.nullable().optional(),
  geoSpeedMps: nonNegativeFinite.nullable().optional(),
  geoClientCapturedAt: z.string().datetime({ offset: true }).nullable().optional(),
  deviceClass: z.enum(['MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN']),
  platformFamily: z.string().trim().min(1).max(80),
  browserFamily: z.string().trim().min(1).max(80),
  clientRecordedAt: z.string().datetime({ offset: true }),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
  correctionOfEvidenceId: z.string().uuid().nullable().optional(),
}).strict().superRefine((value, ctx) => {
  const hasGeo =
    value.latitude != null || value.longitude != null || value.accuracyMeters != null ||
    value.geoAltitudeM != null || value.geoAltitudeAccuracyM != null || value.geoHeadingDeg != null ||
    value.geoSpeedMps != null || value.geoClientCapturedAt != null;
  if (value.geoStatus === 'CAPTURED') {
    if (value.latitude == null || value.longitude == null || value.accuracyMeters == null || !value.geoClientCapturedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'captured location requires coordinates, accuracy, and timestamp' });
    }
  } else if (hasGeo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'non-captured location cannot carry coordinates' });
  }
});
const finalizeSchema = z.object({ action: z.literal('evidence_finalize'), evidenceId: z.string().uuid() }).strict();
const readSchema = z.object({ action: z.literal('evidence_read'), evidenceId: z.string().uuid() }).strict();
const otherActionSchema = z.discriminatedUnion('action', [serviceEventSchema, finalizeSchema, readSchema]);

type AuthorizedRecord = CreatedNoticeBindingRecord & {
  id: string; user_id: string; soft_deleted_at: null;
  created_notice_artifact_id: string; created_notice_service_date: string;
  created_notice_generation: string; created_notice_semantic_binding_id: string; created_notice_finalized_at: string;
};
type Authorized = { sb: ReturnType<typeof serviceClient>; userId: string; record: AuthorizedRecord };

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

async function exactServiceEventExists(auth: Authorized, id: string): Promise<boolean> {
  const { data } = await auth.sb.from('service_events').select('id').eq('id', id)
    .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).maybeSingle();
  return !!data;
}

function detectMime(bytes: Uint8Array): ServiceEvidenceMimeType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeExactRecord(req, id);
  if (!auth) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  const [eventsResult, evidenceResult] = await Promise.all([
    auth.sb.from('service_events')
      .select('id, attempt_date, method, outcome, mailing_date, notes, server_name, server_address, server_age18_plus, server_party_to_notice, client_recorded_at, timezone_offset_minutes, correction_of_service_event_id, server_received_at, created_at')
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).order('created_at', { ascending: true }),
    auth.sb.from('service_evidence_assets')
      .select('id, service_event_id, evidence_kind, original_filename, declared_mime_type, declared_byte_size, verified_mime_type, verified_byte_size, capture_source, geo_status, geo_source, latitude, longitude, accuracy_meters, geo_altitude_m, geo_altitude_accuracy_m, geo_heading_deg, geo_speed_mps, geo_client_captured_at, device_class, platform_family, browser_family, client_recorded_at, timezone_offset_minutes, correction_of_evidence_id, server_received_at, admitted_at, created_at')
      .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).order('created_at', { ascending: true }),
  ]);
  if (eventsResult.error || evidenceResult.error) return NextResponse.json({ error: 'service_history_unavailable' }, { status: 503, headers: noStore });
  return NextResponse.json({ ok: true, serviceDate: auth.record.created_notice_service_date, events: eventsResult.data ?? [], evidence: evidenceResult.data ?? [] }, { headers: noStore });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeExactRecord(req, id);
  if (!auth) return NextResponse.json({ error: 'record_unavailable' }, { status: 404, headers: noStore });
  const body = await req.json().catch(() => ({}));

  if ((body as { action?: unknown }).action === 'evidence_upload_intent') {
    const parsed = evidenceIntentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_evidence_intent' }, { status: 400, headers: noStore });
    const value = parsed.data;
    if (!(await exactServiceEventExists(auth, value.serviceEventId))) return NextResponse.json({ error: 'service_event_unavailable' }, { status: 404, headers: noStore });
    if (value.correctionOfEvidenceId) {
      const { data: prior } = await auth.sb.from('service_evidence_assets').select('id').eq('id', value.correctionOfEvidenceId)
        .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).eq('service_event_id', value.serviceEventId).maybeSingle();
      if (!prior) return NextResponse.json({ error: 'correction_target_unavailable' }, { status: 404, headers: noStore });
    }
    let geoFields;
    try {
      geoFields = buildServiceEvidenceGeoFields(value);
    } catch {
      return NextResponse.json({ error: 'invalid_evidence_geo' }, { status: 400, headers: noStore });
    }
    const evidenceId = randomUUID();
    const objectPath = `${randomUUID()}/${randomUUID()}/${randomUUID()}`;
    const { error: insertError } = await auth.sb.from('service_evidence_assets').insert({
      id: evidenceId, riskpath_record_id: auth.record.id, created_notice_artifact_id: auth.record.created_notice_artifact_id,
      service_event_id: value.serviceEventId, evidence_kind: value.evidenceKind, storage_object_path: objectPath,
      original_filename: value.originalFilename, declared_mime_type: value.mimeType, declared_byte_size: value.byteSize,
      capture_source: value.captureSource, ...geoFields,
      device_class: value.deviceClass, platform_family: value.platformFamily, browser_family: value.browserFamily,
      client_recorded_at: value.clientRecordedAt, timezone_offset_minutes: value.timezoneOffsetMinutes,
      correction_of_evidence_id: value.correctionOfEvidenceId ?? null, created_by_user_id: auth.userId,
    });
    if (insertError) return NextResponse.json({ error: 'evidence_intent_failed' }, { status: 503, headers: noStore });
    const { data: signed, error: signError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET).createSignedUploadUrl(objectPath);
    if (signError || !signed?.token) return NextResponse.json({ error: 'evidence_upload_unavailable' }, { status: 503, headers: noStore });
    return NextResponse.json({ ok: true, evidenceId, bucket: SERVICE_EVIDENCE_BUCKET, objectPath, uploadToken: signed.token }, { headers: noStore });
  }

  const parsed = otherActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: noStore });

  if (parsed.data.action === 'record_service_event') {
    const value = parsed.data;
    if (value.correctionOfServiceEventId && !(await exactServiceEventExists(auth, value.correctionOfServiceEventId))) {
      return NextResponse.json({ error: 'correction_target_unavailable' }, { status: 404, headers: noStore });
    }
    const { data: created, error } = await auth.sb.from('service_events').insert({
      riskpath_record_id: auth.record.id, created_notice_artifact_id: auth.record.created_notice_artifact_id,
      attempt_date: value.attemptDate, method: value.method, outcome: value.outcome, mailing_date: value.mailingDate ?? null,
      notes: value.notes?.trim() || null, server_name: value.serverName, server_address: value.serverAddress,
      server_age18_plus: value.serverAge18Plus, server_party_to_notice: value.serverPartyToNotice,
      client_recorded_at: value.clientRecordedAt, timezone_offset_minutes: value.timezoneOffsetMinutes,
      correction_of_service_event_id: value.correctionOfServiceEventId ?? null, created_by_user_id: auth.userId,
    }).select('id, created_at').single();
    if (error || !created) return NextResponse.json({ error: 'service_event_write_failed' }, { status: 503, headers: noStore });
    return NextResponse.json({ ok: true, serviceEventId: created.id, createdAt: created.created_at }, { headers: noStore });
  }

  if (parsed.data.action === 'evidence_finalize') {
    const { data: evidence } = await auth.sb.from('service_evidence_assets')
      .select('id, service_event_id, storage_object_path, declared_mime_type, declared_byte_size, admitted_at')
      .eq('id', parsed.data.evidenceId).eq('riskpath_record_id', auth.record.id)
      .eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).maybeSingle();
    if (!evidence || !(await exactServiceEventExists(auth, evidence.service_event_id))) return NextResponse.json({ error: 'evidence_unavailable' }, { status: 404, headers: noStore });
    if (evidence.admitted_at) return NextResponse.json({ ok: true, evidenceId: evidence.id, admitted: true }, { headers: noStore });
    const { data: downloaded, error: downloadError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET).download(evidence.storage_object_path);
    if (downloadError || !downloaded) return NextResponse.json({ error: 'evidence_object_unavailable' }, { status: 409, headers: noStore });
    const bytes = new Uint8Array(await downloaded.arrayBuffer());
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_SERVICE_EVIDENCE_BYTES || bytes.byteLength !== Number(evidence.declared_byte_size)) return NextResponse.json({ error: 'evidence_size_mismatch' }, { status: 409, headers: noStore });
    const verifiedMime = detectMime(bytes);
    if (!verifiedMime || verifiedMime !== evidence.declared_mime_type) return NextResponse.json({ error: 'evidence_mime_mismatch' }, { status: 409, headers: noStore });
    const { data: admitted, error: updateError } = await auth.sb.from('service_evidence_assets').update({
      verified_mime_type: verifiedMime, verified_byte_size: bytes.byteLength,
      server_sha256: createHash('sha256').update(bytes).digest('hex'), admitted_at: new Date().toISOString(),
    }).eq('id', evidence.id).eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id)
      .eq('service_event_id', evidence.service_event_id).is('admitted_at', null).select('id, admitted_at').maybeSingle();
    if (updateError) return NextResponse.json({ error: 'evidence_admission_failed' }, { status: 503, headers: noStore });
    if (!admitted) {
      const { data: current } = await auth.sb.from('service_evidence_assets').select('id, admitted_at').eq('id', evidence.id)
        .eq('riskpath_record_id', auth.record.id).eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).eq('service_event_id', evidence.service_event_id).maybeSingle();
      if (!current?.admitted_at) return NextResponse.json({ error: 'evidence_admission_denied' }, { status: 409, headers: noStore });
    }
    return NextResponse.json({ ok: true, evidenceId: evidence.id, admitted: true }, { headers: noStore });
  }

  const { data: evidence } = await auth.sb.from('service_evidence_assets')
    .select('id, service_event_id, storage_object_path, original_filename, admitted_at')
    .eq('id', parsed.data.evidenceId).eq('riskpath_record_id', auth.record.id)
    .eq('created_notice_artifact_id', auth.record.created_notice_artifact_id).not('admitted_at', 'is', null).maybeSingle();
  if (!evidence || !(await exactServiceEventExists(auth, evidence.service_event_id))) return NextResponse.json({ error: 'evidence_unavailable' }, { status: 404, headers: noStore });
  const { data: signed, error: signError } = await auth.sb.storage.from(SERVICE_EVIDENCE_BUCKET).createSignedUrl(evidence.storage_object_path, 60, { download: evidence.original_filename });
  if (signError || !signed?.signedUrl) return NextResponse.json({ error: 'evidence_read_unavailable' }, { status: 503, headers: noStore });
  return NextResponse.json({ ok: true, signedUrl: signed.signedUrl }, { headers: noStore });
}
