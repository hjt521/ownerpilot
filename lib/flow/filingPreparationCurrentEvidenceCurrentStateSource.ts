import {
  type FilingPreparationCurrentEvidenceSource,
  type FilingPreparationCurrentEvidenceSourceRequest,
  type FilingPreparationCurrentEvidenceSourceResult,
} from './filingPreparationCurrentEvidenceResolver';
import {
  validateFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import type {
  GeneratedDraftEvidence,
  OfficialFormGeneratedDraftCurrentnessInputs,
} from './officialFormGeneratedDraft';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_REQUEST_KEYS = ['authenticatedUserId', 'riskpathRecordId'] as const;
const MATERIAL_RESULT_UNAVAILABLE_KEYS = ['status'] as const;
const MATERIAL_RESULT_AVAILABLE_KEYS = ['status', 'material'] as const;
const MATERIAL_KEYS = [
  'definition',
  'officialSourceIdentity',
  'officialSourceHealth',
  'officialSourceBytes',
  'preparationAuthorization',
  'preparationManifest',
  'preparationDerivativeBytes',
  'facts',
  'evaluateBinding',
] as const;

export interface FilingPreparationCurrentStateLatestReader {
  readLatest(riskpathRecordId: string): Promise<unknown>;
}

export interface FilingPreparationCurrentnessMaterialRequest {
  authenticatedUserId: string;
  riskpathRecordId: string;
  revision: number;
  filingPreparationCurrentStateId: string;
  preparationSnapshot: Readonly<FilingPreparationCanonicalSnapshot>;
  generatedDraft: Readonly<GeneratedDraftEvidence>;
}

export type FilingPreparationCurrentnessMaterial = Omit<
  OfficialFormGeneratedDraftCurrentnessInputs,
  'draftBytes'
>;

export type FilingPreparationCurrentnessMaterialResult =
  | { status: 'UNAVAILABLE' }
  | {
      status: 'AVAILABLE';
      material: FilingPreparationCurrentnessMaterial;
    };

export interface FilingPreparationCurrentnessMaterialLoader {
  loadCurrentnessMaterial(
    request: Readonly<FilingPreparationCurrentnessMaterialRequest>,
  ): Promise<unknown>;
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

function requireSourceRequest(
  value: unknown,
): FilingPreparationCurrentEvidenceSourceRequest {
  if (!isPlainObject(value) || !hasExactKeys(value, SOURCE_REQUEST_KEYS)) {
    throw new Error('Current-evidence source request has an invalid shape or caller-authored authority fields.');
  }
  if (typeof value.authenticatedUserId !== 'string' || !UUID_RE.test(value.authenticatedUserId)) {
    throw new Error('Current-evidence source authenticated user identity must be an exact UUID.');
  }
  if (typeof value.riskpathRecordId !== 'string' || !UUID_RE.test(value.riskpathRecordId)) {
    throw new Error('Current-evidence source RiskPath identity must be an exact UUID.');
  }
  return {
    authenticatedUserId: value.authenticatedUserId,
    riskpathRecordId: value.riskpathRecordId,
  };
}

function materialShape(value: unknown): value is FilingPreparationCurrentnessMaterial {
  if (!isPlainObject(value) || !hasExactKeys(value, MATERIAL_KEYS)) return false;
  if (!isPlainObject(value.definition)
    || !isPlainObject(value.officialSourceIdentity)
    || !(value.officialSourceHealth === undefined
      || value.officialSourceHealth === null
      || value.officialSourceHealth === 'CURRENT'
      || value.officialSourceHealth === 'STALE'
      || value.officialSourceHealth === 'CHANGED'
      || value.officialSourceHealth === 'UNAVAILABLE'
      || value.officialSourceHealth === 'UNRESOLVED')
    || !(value.officialSourceBytes instanceof Uint8Array)
    || !(value.preparationAuthorization === undefined
      || value.preparationAuthorization === null
      || isPlainObject(value.preparationAuthorization))
    || !isPlainObject(value.preparationManifest)
    || !(value.preparationDerivativeBytes instanceof Uint8Array)
    || !isPlainObject(value.facts)
    || typeof value.evaluateBinding !== 'function') {
    return false;
  }
  return true;
}

function requireMaterialResult(value: unknown): FilingPreparationCurrentnessMaterialResult {
  if (!isPlainObject(value) || typeof value.status !== 'string') {
    throw new Error('Currentness material loader returned a malformed result.');
  }
  if (value.status === 'UNAVAILABLE') {
    if (!hasExactKeys(value, MATERIAL_RESULT_UNAVAILABLE_KEYS)) {
      throw new Error('Unavailable currentness material result has an invalid shape.');
    }
    return { status: 'UNAVAILABLE' };
  }
  if (value.status !== 'AVAILABLE'
    || !hasExactKeys(value, MATERIAL_RESULT_AVAILABLE_KEYS)
    || !materialShape(value.material)) {
    throw new Error('Available currentness material result has an invalid shape.');
  }
  return {
    status: 'AVAILABLE',
    material: value.material,
  };
}

function materialRequestFromCurrentState(
  currentState: FilingPreparationCurrentState,
  generatedDraft: GeneratedDraftEvidence,
): FilingPreparationCurrentnessMaterialRequest {
  return {
    authenticatedUserId: currentState.authenticatedUserId,
    riskpathRecordId: currentState.riskpathRecordId,
    revision: currentState.revision,
    filingPreparationCurrentStateId: currentState.filingPreparationCurrentStateId,
    preparationSnapshot: structuredClone(currentState.preparationSnapshot),
    generatedDraft: structuredClone(generatedDraft),
  };
}

export function createFilingPreparationCurrentEvidenceCurrentStateSource(
  currentStateReader: FilingPreparationCurrentStateLatestReader,
  materialLoader: FilingPreparationCurrentnessMaterialLoader,
): FilingPreparationCurrentEvidenceSource {
  return {
    async loadCurrentEvidence(
      request: Readonly<FilingPreparationCurrentEvidenceSourceRequest>,
    ): Promise<FilingPreparationCurrentEvidenceSourceResult> {
      const exactRequest = requireSourceRequest(request);
      const latest = await currentStateReader.readLatest(exactRequest.riskpathRecordId);
      if (latest === null) return { status: 'UNAVAILABLE' };

      const missingExactGeneratedBytes = isPlainObject(latest)
        && latest.generatedDraftBinding !== null
        && latest.generatedDraftBytes === null;
      const validated = validateFilingPreparationCurrentState(latest);
      if (validated.status !== 'VALID') {
        if (missingExactGeneratedBytes && validated.blockReason === 'GENERATED_DRAFT_BYTES_REQUIRED') {
          return { status: 'UNAVAILABLE' };
        }
        throw new Error(`Authoritative current-state validation failed closed: ${validated.blockReason}.`);
      }
      const currentState = validated.currentState;
      if (currentState.authenticatedUserId !== exactRequest.authenticatedUserId
        || currentState.riskpathRecordId !== exactRequest.riskpathRecordId) {
        throw new Error('Authoritative current-state identity does not match the requested owner and RiskPath.');
      }
      if (currentState.generatedDraftBinding === null || currentState.generatedDraftBytes === null) {
        return { status: 'UNAVAILABLE' };
      }

      const generatedDraft = structuredClone(currentState.generatedDraftBinding.generatedDraft);
      const draftBytes = new Uint8Array(currentState.generatedDraftBytes);
      const rawMaterial = await materialLoader.loadCurrentnessMaterial(Object.freeze(
        materialRequestFromCurrentState(currentState, generatedDraft),
      ));
      const materialResult = requireMaterialResult(rawMaterial);
      if (materialResult.status === 'UNAVAILABLE') return { status: 'UNAVAILABLE' };

      const material = materialResult.material;
      const currentnessInputs: OfficialFormGeneratedDraftCurrentnessInputs = {
        ...material,
        officialSourceBytes: new Uint8Array(material.officialSourceBytes),
        preparationDerivativeBytes: new Uint8Array(material.preparationDerivativeBytes),
        draftBytes,
      };

      return {
        status: 'AVAILABLE',
        authenticatedUserId: currentState.authenticatedUserId,
        riskpathRecordId: currentState.riskpathRecordId,
        generatedDraft,
        currentnessInputs,
      };
    },
  };
}
