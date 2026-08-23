import {
  createFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import type { GeneratedDraftEvidence } from './officialFormGeneratedDraft';
import {
  createOfficialFormOwnerReview,
  type OwnerReviewStatementIdentity,
  type RenderedGeneratedDocumentAcknowledgment,
} from './officialFormOwnerReview';
import type {
  AppendFilingPreparationCurrentStateResult,
  ExpectedFilingPreparationCurrentState,
  FilingPreparationCurrentStateSupabaseStore,
} from './filingPreparationCurrentStateSupabaseStore';

const PREPARATION_INPUT_KEYS = [
  'ownerAction',
  'riskpathRecordId',
  'expectedCurrent',
  'preparationSnapshot',
] as const;
const GENERATED_INPUT_KEYS = [
  'ownerAction',
  'riskpathRecordId',
  'expectedCurrent',
  'generatedDraft',
  'generatedDraftBytes',
] as const;
const OWNER_REVIEW_INPUT_KEYS = [
  'ownerAction',
  'riskpathRecordId',
  'expectedCurrent',
  'renderedAcknowledgment',
  'ownerConfirmedExactRenderedDocument',
  'reviewedAtISO',
  'reviewStatement',
] as const;
const CURRENT_STATE_ID_RE = /^filing-preparation-current-state:sha256:[0-9a-f]{64}$/;
const SNAPSHOT_VALIDATION_USER = '00000000-0000-4000-8000-000000000001';
const SNAPSHOT_VALIDATION_RISKPATH = '00000000-0000-4000-8000-000000000002';

export interface PreparationCheckpointInput {
  ownerAction: 'PREPARATION_CHECKPOINT';
  riskpathRecordId: string;
  expectedCurrent: Readonly<ExpectedFilingPreparationCurrentState>;
  preparationSnapshot: Readonly<FilingPreparationCanonicalSnapshot>;
}

export interface GeneratedDraftCheckpointInput {
  ownerAction: 'GENERATED_DRAFT_CHECKPOINT';
  riskpathRecordId: string;
  expectedCurrent: Readonly<Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>>;
  generatedDraft: Readonly<GeneratedDraftEvidence>;
  generatedDraftBytes: Uint8Array;
}

export interface OwnerReviewCheckpointInput {
  ownerAction: 'OWNER_REVIEW_CHECKPOINT';
  riskpathRecordId: string;
  expectedCurrent: Readonly<Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }>>;
  renderedAcknowledgment: Readonly<RenderedGeneratedDocumentAcknowledgment>;
  ownerConfirmedExactRenderedDocument: boolean;
  reviewedAtISO: string;
  reviewStatement: Readonly<OwnerReviewStatementIdentity>;
}

export type FilingPreparationCurrentStateCheckpointResult =
  | AppendFilingPreparationCurrentStateResult
  | {
      status: 'UNCHANGED';
      currentState: FilingPreparationCurrentState;
    };

export interface FilingPreparationCurrentStateCheckpoint {
  preparationCheckpoint(input: PreparationCheckpointInput): Promise<FilingPreparationCurrentStateCheckpointResult>;
  generatedDraftCheckpoint(input: GeneratedDraftCheckpointInput): Promise<AppendFilingPreparationCurrentStateResult>;
  ownerReviewCheckpoint(input: OwnerReviewCheckpointInput): Promise<AppendFilingPreparationCurrentStateResult>;
}

type CheckpointStore = Pick<
  FilingPreparationCurrentStateSupabaseStore,
  'readLatest' | 'appendNextIfCurrent'
>;

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

function exactExpectedCurrent(value: unknown): value is ExpectedFilingPreparationCurrentState {
  if (!isPlainObject(value)) return false;
  if (value.status === 'NONE') return hasExactKeys(value, ['status']);
  if (value.status !== 'CURRENT'
    || !hasExactKeys(value, ['status', 'filingPreparationCurrentStateId', 'revision'])) return false;
  return typeof value.filingPreparationCurrentStateId === 'string'
    && CURRENT_STATE_ID_RE.test(value.filingPreparationCurrentStateId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) > 0;
}

function exactExpectedExistingCurrent(
  value: unknown,
): value is Extract<ExpectedFilingPreparationCurrentState, { status: 'CURRENT' }> {
  return exactExpectedCurrent(value) && value.status === 'CURRENT';
}

function currentMatchesExpected(
  current: FilingPreparationCurrentState | null,
  expected: ExpectedFilingPreparationCurrentState,
): boolean {
  if (expected.status === 'NONE') return current === null;
  return current !== null
    && current.filingPreparationCurrentStateId === expected.filingPreparationCurrentStateId
    && current.revision === expected.revision;
}

function conflict(): AppendFilingPreparationCurrentStateResult {
  return { status: 'CONFLICT', reloadRequired: true, currentState: null };
}

function requireCanonicalPreparationSnapshot(value: unknown): FilingPreparationCanonicalSnapshot {
  const validated = createFilingPreparationCurrentState({
    authenticatedUserId: SNAPSHOT_VALIDATION_USER,
    riskpathRecordId: SNAPSHOT_VALIDATION_RISKPATH,
    revision: 1,
    preparationSnapshot: value,
    generatedDraftBinding: null,
    generatedDraftBytes: null,
    ownerReviewBinding: null,
  });
  if (validated.status !== 'CURRENT_STATE_REVISION') {
    throw new Error(`Preparation checkpoint blocked: ${validated.blockReason}.`);
  }
  return validated.currentState.preparationSnapshot;
}

function samePreparationSnapshot(
  left: FilingPreparationCanonicalSnapshot,
  right: FilingPreparationCanonicalSnapshot,
): boolean {
  return canonicalizeGenerationIdentity(left) === canonicalizeGenerationIdentity(right);
}

function requirePreparationInput(value: unknown): PreparationCheckpointInput {
  if (!isPlainObject(value)
    || !hasExactKeys(value, PREPARATION_INPUT_KEYS)
    || value.ownerAction !== 'PREPARATION_CHECKPOINT'
    || !exactExpectedCurrent(value.expectedCurrent)) {
    throw new Error('Preparation checkpoint requires an exact explicit owner action and expected-current identity.');
  }
  return value as unknown as PreparationCheckpointInput;
}

function requireGeneratedInput(value: unknown): GeneratedDraftCheckpointInput {
  if (!isPlainObject(value)
    || !hasExactKeys(value, GENERATED_INPUT_KEYS)
    || value.ownerAction !== 'GENERATED_DRAFT_CHECKPOINT'
    || !exactExpectedExistingCurrent(value.expectedCurrent)) {
    throw new Error('Generated-draft checkpoint requires an exact explicit owner action and existing expected current state.');
  }
  return value as unknown as GeneratedDraftCheckpointInput;
}

function requireOwnerReviewInput(value: unknown): OwnerReviewCheckpointInput {
  if (!isPlainObject(value)
    || !hasExactKeys(value, OWNER_REVIEW_INPUT_KEYS)
    || value.ownerAction !== 'OWNER_REVIEW_CHECKPOINT'
    || !exactExpectedExistingCurrent(value.expectedCurrent)
    || value.ownerConfirmedExactRenderedDocument !== true) {
    throw new Error('Owner Review checkpoint requires literal affirmative owner confirmation and exact expected current state.');
  }
  return value as unknown as OwnerReviewCheckpointInput;
}

export function createFilingPreparationCurrentStateCheckpoint(
  store: CheckpointStore,
): FilingPreparationCurrentStateCheckpoint {
  return {
    async preparationCheckpoint(rawInput: PreparationCheckpointInput): Promise<FilingPreparationCurrentStateCheckpointResult> {
      const input = requirePreparationInput(rawInput);
      const preparationSnapshot = requireCanonicalPreparationSnapshot(input.preparationSnapshot);
      const latest = await store.readLatest(input.riskpathRecordId);
      if (!currentMatchesExpected(latest, input.expectedCurrent)) return conflict();
      if (latest !== null && samePreparationSnapshot(latest.preparationSnapshot, preparationSnapshot)) {
        return { status: 'UNCHANGED', currentState: latest };
      }
      return store.appendNextIfCurrent(input.expectedCurrent, {
        riskpathRecordId: input.riskpathRecordId,
        preparationSnapshot,
        generatedDraft: null,
        generatedDraftBytes: null,
        ownerReviewEvidence: null,
      });
    },

    async generatedDraftCheckpoint(rawInput: GeneratedDraftCheckpointInput): Promise<AppendFilingPreparationCurrentStateResult> {
      const input = requireGeneratedInput(rawInput);
      const latest = await store.readLatest(input.riskpathRecordId);
      if (!currentMatchesExpected(latest, input.expectedCurrent)) return conflict();
      if (latest === null) return conflict();
      return store.appendNextIfCurrent(input.expectedCurrent, {
        riskpathRecordId: input.riskpathRecordId,
        preparationSnapshot: latest.preparationSnapshot,
        generatedDraft: input.generatedDraft,
        generatedDraftBytes: input.generatedDraftBytes,
        ownerReviewEvidence: null,
      });
    },

    async ownerReviewCheckpoint(rawInput: OwnerReviewCheckpointInput): Promise<AppendFilingPreparationCurrentStateResult> {
      const input = requireOwnerReviewInput(rawInput);
      const latest = await store.readLatest(input.riskpathRecordId);
      if (!currentMatchesExpected(latest, input.expectedCurrent)) return conflict();
      if (latest === null || latest.generatedDraftBinding === null || latest.generatedDraftBytes === null) {
        throw new Error('Owner Review checkpoint requires the exact current generated draft and bytes.');
      }

      const review = createOfficialFormOwnerReview({
        generatedDraft: latest.generatedDraftBinding.generatedDraft,
        renderedAcknowledgment: input.renderedAcknowledgment,
        ownerConfirmedExactRenderedDocument: input.ownerConfirmedExactRenderedDocument,
        reviewedAtISO: input.reviewedAtISO,
        reviewStatement: input.reviewStatement,
      });
      if (review.status !== 'OWNER_REVIEWED_DOCUMENT') {
        throw new Error(`Owner Review checkpoint blocked: ${review.blockReason}.`);
      }

      return store.appendNextIfCurrent(input.expectedCurrent, {
        riskpathRecordId: input.riskpathRecordId,
        preparationSnapshot: latest.preparationSnapshot,
        generatedDraft: latest.generatedDraftBinding.generatedDraft,
        generatedDraftBytes: latest.generatedDraftBytes,
        ownerReviewEvidence: review.evidence,
      });
    },
  };
}
