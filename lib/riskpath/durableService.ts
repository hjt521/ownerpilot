// lib/riskpath/durableService.ts
// Durable Service Evidence V1 — exact Created Notice identity and bounded evidence metadata helpers.
// Material generation identity is deterministic; the opaque artifact UUID identifies one generation event.
// Neither identity nor GPS provenance is approval, authorization, proof of service, or legal sufficiency.

import type { IntakeState } from '@/lib/chat/intakeSchema';
import { toNoticeFlowData } from '@/lib/chat/toNoticeFlowData';
import { reviewApprovalGeneration } from '@/lib/flow/reviewApproval';
import { deriveCreatedNoticeSemanticBindingId } from '@/lib/flow/createdNoticeArtifact';

export const SERVICE_EVIDENCE_BUCKET = 'ownerpilot-service-evidence-v1' as const;
export const MAX_SERVICE_EVIDENCE_BYTES = 6 * 1024 * 1024;
export const SERVICE_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type ServiceEvidenceMimeType = (typeof SERVICE_EVIDENCE_MIME_TYPES)[number];
export type ServiceEvidenceKind =
  | 'POSTING_PHOTO'
  | 'MAILING_ENVELOPE_PHOTO'
  | 'PROOF_OF_MAILING'
  | 'SERVICE_PHOTO'
  | 'OTHER_SERVICE_DOCUMENT';
export type ServiceEvidenceCaptureSource = 'CAMERA_INTENT' | 'FILE_PICKER' | 'DOCUMENT_UPLOAD';
export type ServiceEvidenceGeoStatus =
  | 'CAPTURED'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'OPTED_OUT'
  | 'NOT_REQUESTED';
export type ServiceEvidenceGeoSource = 'DEVICE_BROWSER_GEOLOCATION' | 'FILE_EMBEDDED_EXIF';
export type ServiceEvidenceDeviceClass = 'MOBILE' | 'TABLET' | 'DESKTOP' | 'UNKNOWN';

export interface ServiceEvidenceGeoInput {
  geoStatus: ServiceEvidenceGeoStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  geoAltitudeM?: number | null;
  geoAltitudeAccuracyM?: number | null;
  geoHeadingDeg?: number | null;
  geoSpeedMps?: number | null;
  geoClientCapturedAt?: string | null;
}

export interface ServiceEvidenceGeoDbFields {
  geo_status: ServiceEvidenceGeoStatus;
  geo_source: ServiceEvidenceGeoSource | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  geo_altitude_m: number | null;
  geo_altitude_accuracy_m: number | null;
  geo_heading_deg: number | null;
  geo_speed_mps: number | null;
  geo_client_captured_at: string | null;
}

export interface CreatedNoticeBindingRecord {
  created_notice_artifact_id: string | null;
  created_notice_service_date: string | null;
  created_notice_generation: string | null;
  created_notice_semantic_binding_id: string | null;
  created_notice_finalized_at: string | null;
}

export interface PendingCreatedNoticeBinding {
  created_notice_artifact_id: string;
  created_notice_service_date: string;
  created_notice_generation: string;
  created_notice_semantic_binding_id: string;
  created_notice_finalized_at: null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isIsoDay(value: string): boolean {
  return ISO_DAY_RE.test(value);
}

export function isAllowedServiceEvidenceMimeType(value: string): value is ServiceEvidenceMimeType {
  return (SERVICE_EVIDENCE_MIME_TYPES as readonly string[]).includes(value);
}

function finite(value: number | null | undefined, label: string): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) throw new Error(`durableService: ${label} must be finite`);
  return value;
}

/**
 * Convert factual browser geolocation provenance into the exact durable DB field shape.
 * FILE_PICKER + browser GPS means device location WHEN EVIDENCE WAS ADDED; it is never represented
 * as the historical photo capture location. Non-captured statuses may not carry coordinate values.
 */
export function buildServiceEvidenceGeoFields(input: ServiceEvidenceGeoInput): ServiceEvidenceGeoDbFields {
  const latitude = finite(input.latitude, 'latitude');
  const longitude = finite(input.longitude, 'longitude');
  const accuracy = finite(input.accuracyMeters, 'accuracyMeters');
  const altitude = finite(input.geoAltitudeM, 'geoAltitudeM');
  const altitudeAccuracy = finite(input.geoAltitudeAccuracyM, 'geoAltitudeAccuracyM');
  const heading = finite(input.geoHeadingDeg, 'geoHeadingDeg');
  const speed = finite(input.geoSpeedMps, 'geoSpeedMps');
  const capturedAt = input.geoClientCapturedAt ?? null;

  if (input.geoStatus !== 'CAPTURED') {
    if (
      latitude != null || longitude != null || accuracy != null || altitude != null ||
      altitudeAccuracy != null || heading != null || speed != null || capturedAt != null
    ) {
      throw new Error('durableService: non-captured geo status cannot carry coordinate provenance');
    }
    return {
      geo_status: input.geoStatus,
      geo_source: null,
      latitude: null,
      longitude: null,
      accuracy_meters: null,
      geo_altitude_m: null,
      geo_altitude_accuracy_m: null,
      geo_heading_deg: null,
      geo_speed_mps: null,
      geo_client_captured_at: null,
    };
  }

  if (latitude == null || latitude < -90 || latitude > 90) {
    throw new Error('durableService: latitude must be finite and between -90 and 90');
  }
  if (longitude == null || longitude < -180 || longitude > 180) {
    throw new Error('durableService: longitude must be finite and between -180 and 180');
  }
  if (accuracy == null || accuracy < 0) {
    throw new Error('durableService: accuracyMeters must be finite and non-negative');
  }
  if (!capturedAt) throw new Error('durableService: captured geolocation requires a client timestamp');
  if (altitudeAccuracy != null && altitudeAccuracy < 0) {
    throw new Error('durableService: geoAltitudeAccuracyM must be finite and non-negative');
  }
  if (heading != null && (heading < 0 || heading >= 360)) {
    throw new Error('durableService: geoHeadingDeg must be finite and in [0, 360)');
  }
  if (speed != null && speed < 0) {
    throw new Error('durableService: geoSpeedMps must be finite and non-negative');
  }

  return {
    geo_status: 'CAPTURED',
    geo_source: 'DEVICE_BROWSER_GEOLOCATION',
    latitude,
    longitude,
    accuracy_meters: accuracy,
    geo_altitude_m: altitude,
    geo_altitude_accuracy_m: altitudeAccuracy,
    geo_heading_deg: heading,
    geo_speed_mps: speed,
    geo_client_captured_at: capturedAt,
  };
}

export function hasCompleteCreatedNoticeBinding(
  record: CreatedNoticeBindingRecord | null | undefined,
): record is CreatedNoticeBindingRecord & {
  created_notice_artifact_id: string;
  created_notice_service_date: string;
  created_notice_generation: string;
  created_notice_semantic_binding_id: string;
} {
  return !!record &&
    typeof record.created_notice_artifact_id === 'string' && isUuid(record.created_notice_artifact_id) &&
    typeof record.created_notice_service_date === 'string' && isIsoDay(record.created_notice_service_date) &&
    typeof record.created_notice_generation === 'string' && record.created_notice_generation.length > 0 &&
    typeof record.created_notice_semantic_binding_id === 'string' && record.created_notice_semantic_binding_id.length > 0;
}

export function hasFinalizedCreatedNoticeBinding(
  record: CreatedNoticeBindingRecord | null | undefined,
): record is CreatedNoticeBindingRecord & {
  created_notice_artifact_id: string;
  created_notice_service_date: string;
  created_notice_generation: string;
  created_notice_semantic_binding_id: string;
  created_notice_finalized_at: string;
} {
  return hasCompleteCreatedNoticeBinding(record) &&
    typeof record.created_notice_finalized_at === 'string' && record.created_notice_finalized_at.length > 0;
}

/**
 * Reuse the existing canonical material Create-state algorithm. This deliberately does not call
 * hasCurrentReviewApproval(): identity is not approval and the chat path has its own produce gate.
 */
export function buildPendingCreatedNoticeBinding(input: {
  intakeState: IntakeState;
  intendedServiceDate: string;
  artifactId: string;
}): PendingCreatedNoticeBinding {
  if (!isUuid(input.artifactId)) throw new Error('durableService: artifactId must be a UUID');
  if (!isIsoDay(input.intendedServiceDate)) throw new Error('durableService: intendedServiceDate must be YYYY-MM-DD');
  const noticeData = toNoticeFlowData(input.intakeState, input.intendedServiceDate);
  const generation = reviewApprovalGeneration(noticeData);
  return {
    created_notice_artifact_id: input.artifactId,
    created_notice_service_date: input.intendedServiceDate,
    created_notice_generation: generation,
    created_notice_semantic_binding_id: deriveCreatedNoticeSemanticBindingId(generation),
    created_notice_finalized_at: null,
  };
}

/** Server-side exact recomputation used by finalization. */
export function recomputeCreatedNoticeBinding(input: {
  intakeState: IntakeState;
  intendedServiceDate: string;
}): Pick<PendingCreatedNoticeBinding, 'created_notice_generation' | 'created_notice_semantic_binding_id'> {
  if (!isIsoDay(input.intendedServiceDate)) throw new Error('durableService: stored service date is invalid');
  const noticeData = toNoticeFlowData(input.intakeState, input.intendedServiceDate);
  const generation = reviewApprovalGeneration(noticeData);
  return {
    created_notice_generation: generation,
    created_notice_semantic_binding_id: deriveCreatedNoticeSemanticBindingId(generation),
  };
}
