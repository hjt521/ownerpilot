// lib/riskpath/durableService.ts
// Durable Service Evidence V1 — exact Created Notice identity and bounded evidence metadata helpers.
// Material generation identity is deterministic; the opaque artifact UUID identifies one generation event.
// Neither identity is approval or matter authorization.

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
