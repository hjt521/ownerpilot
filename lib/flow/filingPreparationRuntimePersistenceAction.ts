import { readFileSync } from 'node:fs';
import {
  createFilingPreparationCurrentEvidenceCurrentStateSource,
  type FilingPreparationCurrentnessMaterial,
  type FilingPreparationCurrentnessMaterialLoader,
  type FilingPreparationCurrentnessMaterialRequest,
} from './filingPreparationCurrentEvidenceCurrentStateSource';
import { resolveFilingPreparationCurrentEvidence } from './filingPreparationCurrentEvidenceResolver';
import {
  validateFilingPreparationCurrentState,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import {
  createFilingPreparationCurrentStateSupabaseStore,
  type FilingPreparationCurrentStateSupabaseClient,
} from './filingPreparationCurrentStateSupabaseStore';
import {
  persistFilingPreparationRecord,
  type FilingPreparationPersistenceResult,
  type FilingPreparationPersistenceStore,
} from './filingPreparationPersistence';
import {
  createFilingPreparationSupabaseStore,
  type FilingPreparationSupabaseClient,
} from './filingPreparationSupabaseStore';
import type { OfficialGeneratedDraftDefinition } from './officialFormGeneratedDraft';
import {
  UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  UD100_PREPARATION_RUNTIME_MANIFEST,
  UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  UD100_PREPARATION_RUNTIME_PATH,
} from './ud100GeneratedDraft';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
  UD100_GENERATOR_CONTRACT_VERSION,
} from './ud100GenerationBinding';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_KEYS = ['record'] as const;

const UD100_CURRENTNESS_DEFINITION: OfficialGeneratedDraftDefinition = Object.freeze({
  generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  expectedSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  expectedArtifactRole: UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  expectedPreparationManifestId: UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  expectedMapSnapshotId: UD100_GENERATION_BINDING.mapSnapshotId,
  expectedGeneratorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
  expectedPageCount: 4,
  expectedFieldCount: 186,
});

export interface FilingPreparationRuntimeSupabaseClient {
  auth: {
    getUser(): PromiseLike<unknown>;
  };
  from(table: string): any;
}

export type FilingPreparationRuntimeBlockReason =
  | 'INVALID_REQUEST_BODY'
  | 'INVALID_RISKPATH_RECORD_ID'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATION_FAILED'
  | 'CURRENT_STATE_UNAVAILABLE'
  | 'CURRENT_STATE_LOOKUP_FAILED'
  | 'CURRENT_STATE_IDENTITY_MISMATCH'
  | 'CURRENT_STATE_MATERIAL_UNAVAILABLE'
  | 'CURRENT_EVIDENCE_BLOCKED';

export type FilingPreparationRuntimePersistenceResult =
  | FilingPreparationPersistenceResult
  | {
      status: 'BLOCKED';
      blockReason: FilingPreparationRuntimeBlockReason;
      detail: string;
      durability: 'NOT_VERIFIED';
      stageF: 'HELD';
    };

export interface InvokeFilingPreparationRuntimePersistenceInput {
  client: FilingPreparationRuntimeSupabaseClient;
  riskpathRecordId: unknown;
  requestBody: unknown;
}

export type FilingPreparationRuntimeCurrentnessMaterialLoadResult =
  | { status: 'UNAVAILABLE' }
  | { status: 'AVAILABLE'; material: FilingPreparationCurrentnessMaterial };

export interface FilingPreparationRuntimeCurrentnessMaterialLoader
  extends FilingPreparationCurrentnessMaterialLoader {
  loadCurrentnessMaterial(
    request: Readonly<FilingPreparationCurrentnessMaterialRequest>,
  ): Promise<FilingPreparationRuntimeCurrentnessMaterialLoadResult>;
}

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

function runtimeBlocked(
  blockReason: FilingPreparationRuntimeBlockReason,
  detail: string,
): FilingPreparationRuntimePersistenceResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    durability: 'NOT_VERIFIED',
    stageF: 'HELD',
  };
}

function exactMaterialRequestMatchesState(
  currentState: FilingPreparationCurrentState,
  request: Readonly<FilingPreparationCurrentnessMaterialRequest>,
): boolean {
  return currentState.schemaVersion === 2
    && currentState.generatedDraftBinding !== null
    && currentState.currentnessMaterialBinding !== null
    && request.authenticatedUserId === currentState.authenticatedUserId
    && request.riskpathRecordId === currentState.riskpathRecordId
    && request.revision === currentState.revision
    && request.filingPreparationCurrentStateId === currentState.filingPreparationCurrentStateId
    && request.generatedDraft.generatedDocumentId
      === currentState.generatedDraftBinding.generatedDraft.generatedDocumentId
    && request.preparationSnapshot.officialSourceArtifactId
      === currentState.preparationSnapshot.officialSourceArtifactId
    && request.preparationSnapshot.officialSourceSnapshotId
      === currentState.preparationSnapshot.officialSourceSnapshotId
    && request.preparationSnapshot.preparationManifestId
      === currentState.preparationSnapshot.preparationManifestId
    && request.preparationSnapshot.referencedFactSnapshotId
      === currentState.preparationSnapshot.referencedFactSnapshotId
    && request.preparationSnapshot.generationInputId
      === currentState.preparationSnapshot.generationInputId;
}

export function createFilingPreparationRuntimeCurrentnessMaterialLoader(
  authoritativeCurrentState: FilingPreparationCurrentState,
): FilingPreparationRuntimeCurrentnessMaterialLoader {
  const validated = validateFilingPreparationCurrentState(authoritativeCurrentState);
  if (validated.status !== 'VALID') {
    throw new Error(`Runtime current-state capture is invalid: ${validated.blockReason}.`);
  }
  const captured = structuredClone(validated.currentState);

  return {
    async loadCurrentnessMaterial(
      request: Readonly<FilingPreparationCurrentnessMaterialRequest>,
    ): Promise<FilingPreparationRuntimeCurrentnessMaterialLoadResult> {
      if (!exactMaterialRequestMatchesState(captured, request)
        || captured.schemaVersion !== 2
        || captured.currentnessMaterialBinding === null) {
        return { status: 'UNAVAILABLE' };
      }

      let officialSourceBytes: Uint8Array;
      let preparationDerivativeBytes: Uint8Array;
      try {
        officialSourceBytes = new Uint8Array(
          readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath),
        );
        preparationDerivativeBytes = new Uint8Array(
          readFileSync(UD100_PREPARATION_RUNTIME_PATH),
        );
      } catch {
        return { status: 'UNAVAILABLE' };
      }

      const binding = structuredClone(captured.currentnessMaterialBinding);
      const officialSourceIdentity = structuredClone(UD100_OFFICIAL_SOURCE_IDENTITY);
      const facts = structuredClone(binding.facts);
      const preparationAuthorization = structuredClone(binding.preparationAuthorization);
      const officialSourceHealth = binding.officialSourceHealth;

      return {
        status: 'AVAILABLE',
        material: {
          definition: structuredClone(UD100_CURRENTNESS_DEFINITION),
          officialSourceIdentity,
          officialSourceHealth,
          officialSourceBytes,
          preparationAuthorization,
          preparationManifest: structuredClone(UD100_PREPARATION_RUNTIME_MANIFEST),
          preparationDerivativeBytes,
          facts,
          evaluateBinding: () => evaluateUd100GenerationBinding(
            officialSourceIdentity,
            officialSourceHealth,
            facts,
          ),
        },
      };
    },
  };
}

export async function invokeFilingPreparationRuntimePersistence(
  input: InvokeFilingPreparationRuntimePersistenceInput,
): Promise<FilingPreparationRuntimePersistenceResult> {
  if (typeof input.riskpathRecordId !== 'string' || !UUID_RE.test(input.riskpathRecordId)) {
    return runtimeBlocked(
      'INVALID_RISKPATH_RECORD_ID',
      'RiskPath record identity must be an exact UUID.',
    );
  }
  if (!isPlainObject(input.requestBody) || !hasExactKeys(input.requestBody, REQUEST_KEYS)) {
    return runtimeBlocked(
      'INVALID_REQUEST_BODY',
      'Persistence action accepts only the candidate FilingPreparationRecord.',
    );
  }

  const persistenceStore = createFilingPreparationSupabaseStore(
    input.client as unknown as FilingPreparationSupabaseClient,
  );
  let authenticatedUserId: string | null;
  try {
    authenticatedUserId = await persistenceStore.getAuthenticatedUserId();
  } catch {
    return runtimeBlocked(
      'AUTHENTICATION_FAILED',
      'Authenticated user identity could not be established.',
    );
  }
  if (authenticatedUserId === null) {
    return runtimeBlocked('UNAUTHENTICATED', 'Authenticated owner session is required.');
  }

  const currentStateStore = createFilingPreparationCurrentStateSupabaseStore(
    input.client as unknown as FilingPreparationCurrentStateSupabaseClient,
  );

  let latest: FilingPreparationCurrentState | null;
  try {
    latest = await currentStateStore.readLatest(input.riskpathRecordId);
  } catch {
    return runtimeBlocked(
      'CURRENT_STATE_LOOKUP_FAILED',
      'Authoritative owner/RiskPath current-state lookup failed closed.',
    );
  }
  if (latest === null) {
    return runtimeBlocked(
      'CURRENT_STATE_UNAVAILABLE',
      'No authoritative current filing-preparation revision is available to this owner and RiskPath.',
    );
  }
  if (latest.authenticatedUserId !== authenticatedUserId
    || latest.riskpathRecordId !== input.riskpathRecordId) {
    return runtimeBlocked(
      'CURRENT_STATE_IDENTITY_MISMATCH',
      'Authoritative current-state evidence does not bind the exact authenticated owner and route RiskPath.',
    );
  }
  if (latest.schemaVersion !== 2 || latest.currentnessMaterialBinding === null) {
    return runtimeBlocked(
      'CURRENT_STATE_MATERIAL_UNAVAILABLE',
      'Latest authoritative current state does not contain trusted schema-v2 R1 currentness material.',
    );
  }

  const captured = structuredClone(latest);
  const materialLoader = createFilingPreparationRuntimeCurrentnessMaterialLoader(captured);
  const source = createFilingPreparationCurrentEvidenceCurrentStateSource(
    {
      readLatest: async riskpathRecordId => (
        riskpathRecordId === captured.riskpathRecordId ? structuredClone(captured) : null
      ),
    },
    materialLoader,
  );

  const currentEvidence = await resolveFilingPreparationCurrentEvidence({
    authenticatedUserId,
    riskpathRecordId: input.riskpathRecordId,
    source,
  });
  if (currentEvidence.status !== 'CURRENT_EVIDENCE') {
    return runtimeBlocked(
      'CURRENT_EVIDENCE_BLOCKED',
      `Canonical D0A current-evidence resolution blocked persistence: ${currentEvidence.blockReason}.`,
    );
  }
  if (currentEvidence.authenticatedUserId !== authenticatedUserId
    || currentEvidence.riskpathRecordId !== input.riskpathRecordId) {
    return runtimeBlocked(
      'CURRENT_STATE_IDENTITY_MISMATCH',
      'Canonical current evidence does not bind the exact authenticated owner and route RiskPath.',
    );
  }

  const authenticatedStore: FilingPreparationPersistenceStore = {
    getAuthenticatedUserId: async () => authenticatedUserId,
    insert: row => persistenceStore.insert(row),
    readByRecordId: filingPreparationRecordId => persistenceStore.readByRecordId(
      filingPreparationRecordId,
    ),
  };

  return persistFilingPreparationRecord({
    record: input.requestBody.record,
    currentGeneratedDraft: currentEvidence.generatedDraft,
    generatedDraftCurrentness: currentEvidence.canonicalCurrentness,
    userId: authenticatedUserId,
    riskpathRecordId: input.riskpathRecordId,
    store: authenticatedStore,
  });
}
