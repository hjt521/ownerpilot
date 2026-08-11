import type {
  CreatedNoticeArtifactEnvelope,
  NoticeFlowData,
} from './noticeFlowState';
import {
  freezeReviewCreateInput,
  hasCurrentReviewApproval,
  reviewApprovalGeneration,
} from './reviewApproval';

/**
 * Capture the exact successful Create identity for browser-local artifact use.
 * The caller supplies the compliance dates from the same final gate that fed
 * renderNotice and the producedAt timestamp from the same ProductionSnapshot.
 */
export function captureCreatedNoticeArtifact(
  data: NoticeFlowData,
  createdAtISO: string,
  dates: CreatedNoticeArtifactEnvelope['dates'],
): CreatedNoticeArtifactEnvelope {
  // A fresh Create replaces any prior artifact identity; never nest A inside B.
  const { createdNoticeArtifact: _priorArtifact, ...createSource } = data;
  const createData = freezeReviewCreateInput(createSource as NoticeFlowData);
  const generation = reviewApprovalGeneration(createData);

  if (
    !hasCurrentReviewApproval(createData) ||
    createData.reviewApprovalGeneration !== generation
  ) {
    throw new Error('Cannot capture a created notice without current Create approval.');
  }

  return {
    generation,
    createdAtISO,
    createData,
    dates: { ...dates },
  };
}

/**
 * Validate and re-freeze a persisted artifact envelope after ordinary remount.
 * A ProductionSnapshot without this exact envelope intentionally fails closed;
 * current mutable draft state is never used as a substitute artifact source.
 */
export function restoreCreatedNoticeArtifact(
  data: NoticeFlowData,
): CreatedNoticeArtifactEnvelope | null {
  const envelope = data.createdNoticeArtifact;
  if (!envelope || typeof envelope !== 'object') return null;
  if (!data.productionSnapshot) return null;
  if (data.productionSnapshot.producedAtISO !== envelope.createdAtISO) return null;
  if (typeof envelope.generation !== 'string' || envelope.generation === '') return null;
  if (typeof envelope.createdAtISO !== 'string' || envelope.createdAtISO === '') return null;
  if (!envelope.createData || typeof envelope.createData !== 'object') return null;
  if (
    !envelope.dates ||
    typeof envelope.dates.compliancePeriodStartDate !== 'string' ||
    typeof envelope.dates.compliancePeriodEndDate !== 'string'
  ) {
    return null;
  }

  const createData = freezeReviewCreateInput(envelope.createData);
  if (!hasCurrentReviewApproval(createData)) return null;
  if (reviewApprovalGeneration(createData) !== envelope.generation) return null;

  return {
    generation: envelope.generation,
    createdAtISO: envelope.createdAtISO,
    createData,
    dates: { ...envelope.dates },
  };
}
