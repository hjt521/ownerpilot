import type {
  CreatedNoticeArtifactEnvelope,
  NoticeFlowData,
} from './noticeFlowState';
import {
  freezeReviewCreateInput,
  hasCurrentReviewApproval,
  reviewApprovalGeneration,
} from './reviewApproval';

export const CREATED_NOTICE_SEMANTIC_SCHEMA = 1 as const;
export const CREATED_NOTICE_ARTIFACT_TYPE = 'CA_THREE_DAY_NOTICE_TO_PAY_RENT_OR_QUIT' as const;
export const CREATED_NOTICE_SEMANTIC_ID = 'ca-3day-pay-rent-or-quit-created-notice-v1' as const;
export const CREATED_NOTICE_SEMANTIC_BINDING_VERSION = 'created-notice-semantic-binding-v1' as const;

/**
 * Build-owned semantic identity for the current bounded Notice renderer.
 * Customer/browser input never selects these values. The renderer imports this
 * exact object so capture and rendering cannot independently drift.
 */
export const CREATED_NOTICE_SEMANTIC_CONTRACT = Object.freeze({
  schema: CREATED_NOTICE_SEMANTIC_SCHEMA,
  semanticId: CREATED_NOTICE_SEMANTIC_ID,
  artifactType: CREATED_NOTICE_ARTIFACT_TYPE,
  forfeitureElectionContentIncluded: true as const,
});

export type CreatedNoticeArtifactSemantics = typeof CREATED_NOTICE_SEMANTIC_CONTRACT;

export type CreatedNoticeArtifactWithSemanticProvenance = CreatedNoticeArtifactEnvelope & {
  artifactSemantics: CreatedNoticeArtifactSemantics;
  artifactSemanticBindingId: string;
};

export type RestoredCreatedNoticeArtifactEnvelope = CreatedNoticeArtifactEnvelope & {
  artifactSemantics?: CreatedNoticeArtifactSemantics;
  artifactSemanticBindingId?: string;
};

export type CreatedNoticeSemanticProvenance =
  | {
      status: 'PROVEN';
      semantics: CreatedNoticeArtifactSemantics;
      semanticBindingId: string;
    }
  | { status: 'UNPROVEN_LEGACY' }
  | { status: 'INVALID'; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function semanticBindingPayload(
  generation: string,
  semantics: CreatedNoticeArtifactSemantics,
): string {
  return JSON.stringify({
    version: CREATED_NOTICE_SEMANTIC_BINDING_VERSION,
    generation,
    schema: semantics.schema,
    semanticId: semantics.semanticId,
    artifactType: semantics.artifactType,
    forfeitureElectionContentIncluded: semantics.forfeitureElectionContentIncluded,
  });
}

/**
 * Exact deterministic semantic-binding identity. The full Create generation is
 * retained rather than reduced to a lossy classifier or mutable app-version
 * token, keeping Create-input identity separate from artifact semantics.
 */
export function deriveCreatedNoticeSemanticBindingId(generation: string): string {
  return `${CREATED_NOTICE_SEMANTIC_BINDING_VERSION}:${semanticBindingPayload(
    generation,
    CREATED_NOTICE_SEMANTIC_CONTRACT,
  )}`;
}

function exactSemanticRecord(value: unknown): value is CreatedNoticeArtifactSemantics {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    'artifactType',
    'forfeitureElectionContentIncluded',
    'schema',
    'semanticId',
  ];
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return false;
  }
  return (
    value.schema === CREATED_NOTICE_SEMANTIC_CONTRACT.schema &&
    value.semanticId === CREATED_NOTICE_SEMANTIC_CONTRACT.semanticId &&
    value.artifactType === CREATED_NOTICE_SEMANTIC_CONTRACT.artifactType &&
    value.forfeitureElectionContentIncluded ===
      CREATED_NOTICE_SEMANTIC_CONTRACT.forfeitureElectionContentIncluded
  );
}

/**
 * Semantic-only provenance classification for downstream governed consumers.
 * A semantic-less historical envelope remains UNPROVEN_LEGACY; malformed or
 * partially stamped metadata is INVALID and is never upgraded to today's
 * build-owned contract.
 */
export function evaluateCreatedNoticeSemanticProvenance(
  envelope: CreatedNoticeArtifactEnvelope | null | undefined,
): CreatedNoticeSemanticProvenance {
  if (!envelope || typeof envelope !== 'object') {
    return { status: 'INVALID', reason: 'Created Notice artifact envelope is missing.' };
  }
  if (typeof envelope.generation !== 'string' || envelope.generation.trim() === '') {
    return { status: 'INVALID', reason: 'Created Notice generation is missing.' };
  }

  const candidate = envelope as RestoredCreatedNoticeArtifactEnvelope;
  const hasSemantics = candidate.artifactSemantics !== undefined;
  const hasBinding = candidate.artifactSemanticBindingId !== undefined;

  if (!hasSemantics && !hasBinding) return { status: 'UNPROVEN_LEGACY' };
  if (!hasSemantics || !hasBinding) {
    return {
      status: 'INVALID',
      reason: 'Created Notice semantic metadata and semantic binding must be present together.',
    };
  }
  if (!exactSemanticRecord(candidate.artifactSemantics)) {
    return { status: 'INVALID', reason: 'Created Notice semantic metadata is unsupported or malformed.' };
  }
  if (
    typeof candidate.artifactSemanticBindingId !== 'string' ||
    candidate.artifactSemanticBindingId.trim() === ''
  ) {
    return { status: 'INVALID', reason: 'Created Notice semantic binding identity is missing.' };
  }
  const expectedBinding = deriveCreatedNoticeSemanticBindingId(envelope.generation);
  if (candidate.artifactSemanticBindingId !== expectedBinding) {
    return {
      status: 'INVALID',
      reason: 'Created Notice semantic metadata is not bound to this exact Create generation.',
    };
  }

  return {
    status: 'PROVEN',
    semantics: candidate.artifactSemantics,
    semanticBindingId: candidate.artifactSemanticBindingId,
  };
}

/**
 * Capture the exact successful Create identity for browser-local artifact use.
 * The caller supplies the compliance dates from the same final gate that fed
 * renderNotice and the producedAt timestamp from the same ProductionSnapshot.
 * This envelope is artifact-use identity only; it grants neither Create
 * approval nor post-production staleness authority.
 */
export function captureCreatedNoticeArtifact(
  data: NoticeFlowData,
  createdAtISO: string,
  dates: CreatedNoticeArtifactEnvelope['dates'],
): CreatedNoticeArtifactWithSemanticProvenance {
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

  const artifactSemantics = Object.freeze({ ...CREATED_NOTICE_SEMANTIC_CONTRACT });

  return {
    generation,
    createdAtISO,
    createData,
    dates: { ...dates },
    artifactSemantics,
    artifactSemanticBindingId: deriveCreatedNoticeSemanticBindingId(generation),
  };
}

/**
 * Validate and re-freeze a persisted artifact envelope after ordinary remount.
 * A ProductionSnapshot without this exact envelope intentionally fails closed;
 * current mutable draft state is never used as a substitute artifact source.
 *
 * Legacy envelopes that predate semantic provenance may continue through this
 * ordinary artifact-use restore path, but remain explicitly UNPROVEN_LEGACY for
 * downstream D.1 consumers. New malformed semantic metadata fails closed.
 */
export function restoreCreatedNoticeArtifact(
  data: NoticeFlowData,
): RestoredCreatedNoticeArtifactEnvelope | null {
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

  const semanticProvenance = evaluateCreatedNoticeSemanticProvenance(envelope);
  if (semanticProvenance.status === 'INVALID') return null;

  const createData = freezeReviewCreateInput(envelope.createData);
  if (!hasCurrentReviewApproval(createData)) return null;
  if (reviewApprovalGeneration(createData) !== envelope.generation) return null;

  const restored: RestoredCreatedNoticeArtifactEnvelope = {
    generation: envelope.generation,
    createdAtISO: envelope.createdAtISO,
    createData,
    dates: { ...envelope.dates },
  };

  if (semanticProvenance.status === 'PROVEN') {
    restored.artifactSemantics = Object.freeze({ ...semanticProvenance.semantics });
    restored.artifactSemanticBindingId = semanticProvenance.semanticBindingId;
  }

  return restored;
}
