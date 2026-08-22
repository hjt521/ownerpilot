import {
  evaluateOfficialFormGeneratedDraftCurrentness,
  type GeneratedDraftCurrentness,
  type GeneratedDraftEvidence,
  type OfficialFormGeneratedDraftCurrentnessInputs,
} from './officialFormGeneratedDraft';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOLVER_INPUT_KEYS = ['authenticatedUserId', 'riskpathRecordId', 'source'] as const;
const AVAILABLE_SOURCE_KEYS = [
  'status',
  'authenticatedUserId',
  'riskpathRecordId',
  'generatedDraft',
  'currentnessInputs',
] as const;
const UNAVAILABLE_SOURCE_KEYS = ['status'] as const;

export interface FilingPreparationCurrentEvidenceSourceRequest {
  authenticatedUserId: string;
  riskpathRecordId: string;
}

export type FilingPreparationCurrentEvidenceSourceResult =
  | { status: 'UNAVAILABLE' }
  | {
      status: 'AVAILABLE';
      authenticatedUserId: string;
      riskpathRecordId: string;
      generatedDraft: GeneratedDraftEvidence;
      currentnessInputs: OfficialFormGeneratedDraftCurrentnessInputs;
    };

export interface FilingPreparationCurrentEvidenceSource {
  loadCurrentEvidence(
    request: Readonly<FilingPreparationCurrentEvidenceSourceRequest>,
  ): Promise<FilingPreparationCurrentEvidenceSourceResult>;
}

export interface FilingPreparationCurrentEvidenceResolverInput {
  authenticatedUserId: string;
  riskpathRecordId: string;
  source: FilingPreparationCurrentEvidenceSource;
}

export type FilingPreparationCurrentEvidenceBlockReason =
  | 'INVALID_RESOLVER_INPUT'
  | 'INVALID_AUTHENTICATED_USER_ID'
  | 'INVALID_RISKPATH_RECORD_ID'
  | 'SOURCE_ERROR'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_RESULT_INVALID'
  | 'SOURCE_IDENTITY_MISMATCH'
  | 'CURRENTNESS_EVALUATION_FAILED'
  | 'CURRENT_EVIDENCE_OUT_OF_DATE';

interface HeldAuthorityBoundary {
  stageF: 'HELD';
  packetComposition: 'NOT_PERFORMED';
  signing: 'NOT_PERFORMED';
  filing: 'NOT_PERFORMED';
  courtSubmission: 'NOT_PERFORMED';
  service: 'NOT_PERFORMED';
  legalSufficiency: 'NOT_EVALUATED';
  autonomousExecution: 'NOT_AUTHORIZED';
}

type CurrentEvaluation = Extract<GeneratedDraftCurrentness, { status: 'CURRENT' }>;

export type FilingPreparationCurrentEvidenceResolverResult =
  | (HeldAuthorityBoundary & {
      status: 'BLOCKED';
      blockReason: FilingPreparationCurrentEvidenceBlockReason;
      detail: string;
      canonicalCurrentness: GeneratedDraftCurrentness | 'NOT_EVALUATED';
    })
  | (HeldAuthorityBoundary & {
      status: 'CURRENT_EVIDENCE';
      authenticatedUserId: string;
      riskpathRecordId: string;
      generatedDraft: GeneratedDraftEvidence;
      canonicalCurrentness: CurrentEvaluation;
    });

const HELD_AUTHORITY_BOUNDARY: HeldAuthorityBoundary = Object.freeze({
  stageF: 'HELD',
  packetComposition: 'NOT_PERFORMED',
  signing: 'NOT_PERFORMED',
  filing: 'NOT_PERFORMED',
  courtSubmission: 'NOT_PERFORMED',
  service: 'NOT_PERFORMED',
  legalSufficiency: 'NOT_EVALUATED',
  autonomousExecution: 'NOT_AUTHORIZED',
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isSource(value: unknown): value is FilingPreparationCurrentEvidenceSource {
  return (typeof value === 'object' && value !== null)
    && typeof (value as { loadCurrentEvidence?: unknown }).loadCurrentEvidence === 'function';
}

function blocked(
  blockReason: FilingPreparationCurrentEvidenceBlockReason,
  detail: string,
  canonicalCurrentness: GeneratedDraftCurrentness | 'NOT_EVALUATED' = 'NOT_EVALUATED',
): FilingPreparationCurrentEvidenceResolverResult {
  return {
    ...HELD_AUTHORITY_BOUNDARY,
    status: 'BLOCKED',
    blockReason,
    detail,
    canonicalCurrentness,
  };
}

export async function resolveFilingPreparationCurrentEvidence(
  input: FilingPreparationCurrentEvidenceResolverInput,
): Promise<FilingPreparationCurrentEvidenceResolverResult> {
  if (!isPlainObject(input) || !hasExactKeys(input, RESOLVER_INPUT_KEYS) || !isSource(input.source)) {
    return blocked(
      'INVALID_RESOLVER_INPUT',
      'Resolver input accepts only authenticated owner identity, RiskPath identity, and the injected authoritative source.',
    );
  }
  if (typeof input.authenticatedUserId !== 'string' || !UUID_RE.test(input.authenticatedUserId)) {
    return blocked('INVALID_AUTHENTICATED_USER_ID', 'Authenticated owner identity must be an exact UUID.');
  }
  if (typeof input.riskpathRecordId !== 'string' || !UUID_RE.test(input.riskpathRecordId)) {
    return blocked('INVALID_RISKPATH_RECORD_ID', 'RiskPath identity must be an exact UUID.');
  }

  let sourceResult: unknown;
  try {
    sourceResult = await input.source.loadCurrentEvidence(Object.freeze({
      authenticatedUserId: input.authenticatedUserId,
      riskpathRecordId: input.riskpathRecordId,
    }));
  } catch {
    return blocked('SOURCE_ERROR', 'Authoritative current-evidence source failed closed.');
  }

  if (!isPlainObject(sourceResult) || typeof sourceResult.status !== 'string') {
    return blocked('SOURCE_RESULT_INVALID', 'Authoritative current-evidence source returned an invalid result.');
  }
  if (sourceResult.status === 'UNAVAILABLE') {
    if (!hasExactKeys(sourceResult, UNAVAILABLE_SOURCE_KEYS)) {
      return blocked('SOURCE_RESULT_INVALID', 'Unavailable source result has an invalid shape.');
    }
    return blocked('SOURCE_UNAVAILABLE', 'Authoritative current evidence is unavailable.');
  }
  if (sourceResult.status !== 'AVAILABLE'
    || !hasExactKeys(sourceResult, AVAILABLE_SOURCE_KEYS)
    || typeof sourceResult.authenticatedUserId !== 'string'
    || typeof sourceResult.riskpathRecordId !== 'string'
    || !isPlainObject(sourceResult.generatedDraft)
    || !isPlainObject(sourceResult.currentnessInputs)) {
    return blocked('SOURCE_RESULT_INVALID', 'Available source result has an invalid shape.');
  }
  if (sourceResult.authenticatedUserId !== input.authenticatedUserId
    || sourceResult.riskpathRecordId !== input.riskpathRecordId) {
    return blocked(
      'SOURCE_IDENTITY_MISMATCH',
      'Authoritative current evidence is bound to a different authenticated owner or RiskPath.',
    );
  }

  let canonicalCurrentness: GeneratedDraftCurrentness;
  try {
    canonicalCurrentness = evaluateOfficialFormGeneratedDraftCurrentness(
      sourceResult.generatedDraft as unknown as GeneratedDraftEvidence,
      sourceResult.currentnessInputs as unknown as OfficialFormGeneratedDraftCurrentnessInputs,
    );
  } catch {
    return blocked('CURRENTNESS_EVALUATION_FAILED', 'Canonical generated-draft currentness evaluation failed closed.');
  }

  if (canonicalCurrentness.status !== 'CURRENT' || canonicalCurrentness.reasons.length !== 0) {
    return blocked(
      'CURRENT_EVIDENCE_OUT_OF_DATE',
      'Canonical generated-draft currentness is not exact CURRENT.',
      canonicalCurrentness,
    );
  }

  return {
    ...HELD_AUTHORITY_BOUNDARY,
    status: 'CURRENT_EVIDENCE',
    authenticatedUserId: input.authenticatedUserId,
    riskpathRecordId: input.riskpathRecordId,
    generatedDraft: sourceResult.generatedDraft as unknown as GeneratedDraftEvidence,
    canonicalCurrentness,
  };
}
