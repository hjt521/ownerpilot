import type { NoticeFlowData } from './noticeFlowState';

/**
 * UX2 review/create approval binding.
 *
 * The generation is an exact canonical serialization of the material create
 * state, not a lossy field subset or UI-session token. Inclusion is the
 * default: every NoticeFlowData field participates unless it is explicitly
 * classified below as approval metadata, UI-only state, post-create state, or
 * current backward-compatibility residue that cannot affect the gate/renderer.
 *
 * This identity authorizes Create only. Post-production readiness and staleness
 * remain exclusively governed by ProductionSnapshot + evaluateStaleness.
 *
 * No wall-clock value participates in the generation.
 */

export const REVIEW_APPROVAL_GENERATION_VERSION = 'review-create-v1';

const NON_CREATE_TOP_LEVEL = new Set<string>([
  // Retired duplicate testimony / approval self-reference.
  'baseRentOnlyConfirmed',
  'produceAttestationConfirmed',
  'produceAttestationAcceptedAt',
  'reviewApprovalGeneration',

  // UI/profile behavior that is not read by evaluateCanProduceV4/renderNotice.
  'bankInterstitialDismissed',
  'payeeStreetUserEdited',
  'payeeUnitUserEdited',
  'saveLandlordPaymentDefaults',
  'mailingAddress',
  'mailingUnit',

  // B1-superseded compatibility/audit values. The face and gate use serviceDate.
  'signingDate',
  'signingAddress',

  // Post-create / separate actual-service task state.
  'serviceAttempts',
  'successfulServiceAttemptId',
  'productionSnapshot',
  'stalenessReason',
  'createdNoticeArtifact',

  // Separate audit/conditional acknowledgment contracts, not C6 create facts.
  'safetyCheckAnswers',
  'laProduceAudit',
]);

function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => clonePlain(entry)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = clonePlain(entry);
    }
    return out as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}

function stripVolatileMetadata(data: NoticeFlowData): Record<string, unknown> {
  const source = clonePlain(data) as unknown as Record<string, unknown>;
  for (const key of NON_CREATE_TOP_LEVEL) delete source[key];

  const override = source.safetyCheckOverride;
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    const copy = { ...(override as Record<string, unknown>) };
    delete copy.acceptedAt;
    delete copy.userAgent;
    delete copy.ipHash;
    source.safetyCheckOverride = copy;
  }

  const resolver = source.cachedResolverVerdict;
  if (resolver && typeof resolver === 'object' && !Array.isArray(resolver)) {
    const copy = { ...(resolver as Record<string, unknown>) };
    delete copy.resolvedAt;
    source.cachedResolverVerdict = copy;
  }

  const california = source.cachedCaliforniaEligibility;
  if (california && typeof california === 'object' && !Array.isArray(california)) {
    const copy = { ...(california as Record<string, unknown>) };
    delete copy.resolvedAt;
    source.cachedCaliforniaEligibility = copy;
  }

  const contact = source.landlordContact;
  if (contact && typeof contact === 'object' && !Array.isArray(contact)) {
    const copy = { ...(contact as Record<string, unknown>) };
    // Deprecated typed payee name is not used by the current gate or renderer.
    delete copy.name;
    source.landlordContact = copy;
  }

  return source;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => canonicalValue(entry));
  if (value !== null && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      if (input[key] === undefined) continue;
      out[key] = canonicalValue(input[key]);
    }
    return out;
  }
  return value;
}

/** Exact deterministic canonical representation of the material create state. */
export function canonicalReviewCreateInput(data: NoticeFlowData): string {
  return JSON.stringify(canonicalValue(stripVolatileMetadata(data)));
}

/**
 * Exact generation identity. The canonical representation itself is retained
 * after the version prefix, avoiding hash-collision authority ambiguity.
 */
export function reviewApprovalGeneration(data: NoticeFlowData): string {
  return `${REVIEW_APPROVAL_GENERATION_VERSION}:${canonicalReviewCreateInput(data)}`;
}

export function hasCurrentReviewApproval(data: NoticeFlowData): boolean {
  return (
    data.produceAttestationConfirmed === true &&
    typeof data.reviewApprovalGeneration === 'string' &&
    data.reviewApprovalGeneration === reviewApprovalGeneration(data)
  );
}

export function bindReviewApproval(
  data: NoticeFlowData,
  acceptedAt: string,
): Pick<
  NoticeFlowData,
  'produceAttestationConfirmed' | 'produceAttestationAcceptedAt' | 'reviewApprovalGeneration'
> {
  return {
    produceAttestationConfirmed: true,
    produceAttestationAcceptedAt: acceptedAt,
    reviewApprovalGeneration: reviewApprovalGeneration(data),
  };
}

export function clearReviewApproval(): Pick<
  NoticeFlowData,
  'produceAttestationConfirmed' | 'produceAttestationAcceptedAt' | 'reviewApprovalGeneration'
> {
  return {
    produceAttestationConfirmed: undefined,
    produceAttestationAcceptedAt: undefined,
    reviewApprovalGeneration: undefined,
  };
}

/** Clone + freeze the exact React-state input consumed by final Create. */
export function freezeReviewCreateInput(data: NoticeFlowData): NoticeFlowData {
  return deepFreeze(clonePlain(data));
}
