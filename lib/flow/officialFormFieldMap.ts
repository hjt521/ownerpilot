import type {
  CanonicalFilingFactRef,
  FilingCanonicalFactsProjection,
  FilingFactProvenance,
  FilingFactState,
} from './filingCanonicalFacts';

export const SUPPORTED_OFFICIAL_FORM_REGISTRY_VERSION = 1 as const;
export type OfficialSourceHealth = 'CURRENT' | 'STALE' | 'CHANGED' | 'UNAVAILABLE' | 'UNRESOLVED';
export type OfficialArtifactRole = 'OWNER_GENERATED_PREPARATION' | 'COURT_ISSUED_OR_RETURNED_INTAKE';

export interface OfficialSourceIdentity {
  registryVersion: number;
  artifactId: string;
  authorityKey: string;
  formId: string;
  revisionEffective: string;
  sourceSnapshotId: string;
  repositoryPath: string;
  repositorySha256: string;
  artifactClass: string;
  repositoryStatus: string;
}

export interface OfficialFieldBinding {
  fieldId: string;
  visibleLabelEvidence: string;
  sourcePage: number | null;
  canonicalFactRef: CanonicalFilingFactRef;
  mappingClass: 'DIRECT_FROZEN_FACT' | 'DETERMINISTIC_DERIVATION' | 'SUPPLEMENTAL_FACT';
}

export interface OfficialFormFieldMapDefinition {
  mapId: string;
  status: string;
  sourceIdentity: OfficialSourceIdentity;
  artifactRole: OfficialArtifactRole;
  bindings: readonly OfficialFieldBinding[];
}

export type OfficialSourceValidationFailure =
  | 'UNSUPPORTED_REGISTRY_VERSION'
  | 'MALFORMED_SOURCE_IDENTITY'
  | 'SOURCE_IDENTITY_MISMATCH'
  | 'SOURCE_HEALTH_NOT_CURRENT'
  | 'UNSUPPORTED_ARTIFACT_CLASS'
  | 'UNSUPPORTED_REPOSITORY_STATUS'
  | 'CONFLICTING_FIELD_BINDING';
export type OfficialSourceValidation =
  | { status: 'VALID' }
  | { status: 'BLOCKED'; reason: OfficialSourceValidationFailure; detail: string };

export type FieldMappingEvaluation =
  | {
      fieldId: string;
      canonicalFactRef: CanonicalFilingFactRef;
      mappingClass: OfficialFieldBinding['mappingClass'];
      visibleLabelEvidence: string;
      sourcePage: number | null;
      state: 'CANDIDATE_VALUE';
      candidateValue: unknown;
      factState: 'KNOWN';
      provenance: FilingFactProvenance;
    }
  | {
      fieldId: string;
      canonicalFactRef: CanonicalFilingFactRef;
      mappingClass: OfficialFieldBinding['mappingClass'];
      visibleLabelEvidence: string;
      sourcePage: number | null;
      state: 'UNRESOLVED_FACT';
      candidateValue: null;
      factState: Exclude<FilingFactState<unknown>['state'], 'KNOWN'> | 'MISSING';
      provenance: FilingFactProvenance | null;
    };

export type OfficialFormFieldMapBlockReason =
  | 'ARTIFACT_ROLE_MISMATCH'
  | 'SOURCE_VALIDATION_FAILED'
  | 'CANONICAL_FACTS_UNAVAILABLE'
  | 'MAPPING_PROVENANCE_CONFLICT';
export type OfficialFormFieldMapEvaluation =
  | {
      status: 'BLOCKED';
      blockReason: OfficialFormFieldMapBlockReason;
      sourceValidation: OfficialSourceValidation;
      formApplicability: 'NOT_EVALUATED';
      formRequiredness: 'NOT_EVALUATED';
      fieldPopulation: 'NOT_PERFORMED';
      documentGeneration: 'NOT_PERFORMED';
      mappings: readonly [];
    }
  | {
      status: 'RESOLVED_MAPPING' | 'UNRESOLVED_MAPPING';
      sourceValidation: { status: 'VALID' };
      formApplicability: 'NOT_EVALUATED';
      formRequiredness: 'NOT_EVALUATED';
      fieldPopulation: 'NOT_PERFORMED';
      documentGeneration: 'NOT_PERFORMED';
      mappings: readonly FieldMappingEvaluation[];
    };

const REQUIRED_STRING_KEYS: readonly (keyof Pick<OfficialSourceIdentity,
  'artifactId' | 'authorityKey' | 'formId' | 'revisionEffective' | 'sourceSnapshotId' |
  'repositoryPath' | 'repositorySha256' | 'artifactClass' | 'repositoryStatus'>)[] = [
  'artifactId', 'authorityKey', 'formId', 'revisionEffective', 'sourceSnapshotId',
  'repositoryPath', 'repositorySha256', 'artifactClass', 'repositoryStatus',
];

function validSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function malformed(identity: OfficialSourceIdentity): string | null {
  if (identity.registryVersion !== SUPPORTED_OFFICIAL_FORM_REGISTRY_VERSION) return null;
  for (const key of REQUIRED_STRING_KEYS) {
    if (typeof identity[key] !== 'string' || identity[key].trim() === '') return `missing or blank ${key}`;
  }
  if (!validSha256(identity.repositorySha256)) return 'repositorySha256 is not a lowercase SHA-256';
  if (identity.sourceSnapshotId !== `sha256:${identity.repositorySha256}`) return 'sourceSnapshotId does not bind repositorySha256';
  const expectedArtifactId = [identity.authorityKey, identity.formId, identity.revisionEffective, `sha256:${identity.repositorySha256}`].join(':');
  if (identity.artifactId !== expectedArtifactId) return 'artifactId does not bind authority, form, revision, and exact SHA-256 identity';
  return null;
}

export function validateOfficialSourceIdentity(
  expected: OfficialSourceIdentity,
  supplied: OfficialSourceIdentity,
  bindings: readonly OfficialFieldBinding[] = [],
): OfficialSourceValidation {
  if (expected.registryVersion !== SUPPORTED_OFFICIAL_FORM_REGISTRY_VERSION || supplied.registryVersion !== SUPPORTED_OFFICIAL_FORM_REGISTRY_VERSION) {
    return { status: 'BLOCKED', reason: 'UNSUPPORTED_REGISTRY_VERSION', detail: `Only registry version ${SUPPORTED_OFFICIAL_FORM_REGISTRY_VERSION} is supported.` };
  }
  const expectedMalformed = malformed(expected);
  const suppliedMalformed = malformed(supplied);
  if (expectedMalformed || suppliedMalformed) {
    return { status: 'BLOCKED', reason: 'MALFORMED_SOURCE_IDENTITY', detail: expectedMalformed ?? suppliedMalformed ?? 'malformed source identity' };
  }
  if (expected.artifactClass !== 'official_blank' || supplied.artifactClass !== 'official_blank') {
    return { status: 'BLOCKED', reason: 'UNSUPPORTED_ARTIFACT_CLASS', detail: 'Stage D v1 accepts only the registered official_blank artifact class.' };
  }
  if (expected.repositoryStatus !== 'present_hash_and_blankness_verified' || supplied.repositoryStatus !== 'present_hash_and_blankness_verified') {
    return { status: 'BLOCKED', reason: 'UNSUPPORTED_REPOSITORY_STATUS', detail: 'The exact registered binary must have verified repository hash and blankness status.' };
  }
  const identityKeys: readonly (keyof OfficialSourceIdentity)[] = [
    'registryVersion', 'artifactId', 'authorityKey', 'formId', 'revisionEffective', 'sourceSnapshotId',
    'repositoryPath', 'repositorySha256', 'artifactClass', 'repositoryStatus',
  ];
  for (const key of identityKeys) {
    if (expected[key] !== supplied[key]) return { status: 'BLOCKED', reason: 'SOURCE_IDENTITY_MISMATCH', detail: `Exact source identity mismatch at ${key}.` };
  }
  const fieldIds = new Set<string>();
  for (const binding of bindings) {
    if (fieldIds.has(binding.fieldId)) return { status: 'BLOCKED', reason: 'CONFLICTING_FIELD_BINDING', detail: `Field ${binding.fieldId} is bound more than once.` };
    fieldIds.add(binding.fieldId);
    if (binding.fieldId.trim() === '' || binding.visibleLabelEvidence.trim() === '' ||
        (binding.sourcePage !== null && (!Number.isInteger(binding.sourcePage) || binding.sourcePage < 1))) {
      return { status: 'BLOCKED', reason: 'CONFLICTING_FIELD_BINDING', detail: 'Each binding requires an exact field id, bounded label evidence, and a valid page when known.' };
    }
  }
  return { status: 'VALID' };
}

export function validateOfficialSourceHealth(
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
): OfficialSourceValidation {
  if (suppliedSourceHealth !== 'CURRENT') {
    return {
      status: 'BLOCKED',
      reason: 'SOURCE_HEALTH_NOT_CURRENT',
      detail: `Source health must be explicitly supplied as CURRENT; got ${suppliedSourceHealth ?? 'MISSING'}.`,
    };
  }
  return { status: 'VALID' };
}

export function evaluateOfficialFormFieldMap(
  definition: OfficialFormFieldMapDefinition,
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
  artifactRole: OfficialArtifactRole,
): OfficialFormFieldMapEvaluation {
  const sourceIdentityValidation = validateOfficialSourceIdentity(
    definition.sourceIdentity,
    suppliedSourceIdentity,
    definition.bindings,
  );
  const sourceHealthValidation = validateOfficialSourceHealth(suppliedSourceHealth);
  const sourceValidation =
    sourceIdentityValidation.status === 'VALID'
      ? sourceHealthValidation
      : sourceIdentityValidation;
  if (artifactRole !== definition.artifactRole) {
    return { status: 'BLOCKED', blockReason: 'ARTIFACT_ROLE_MISMATCH', sourceValidation, formApplicability: 'NOT_EVALUATED', formRequiredness: 'NOT_EVALUATED', fieldPopulation: 'NOT_PERFORMED', documentGeneration: 'NOT_PERFORMED', mappings: [] };
  }
  if (sourceValidation.status !== 'VALID') {
    return { status: 'BLOCKED', blockReason: 'SOURCE_VALIDATION_FAILED', sourceValidation, formApplicability: 'NOT_EVALUATED', formRequiredness: 'NOT_EVALUATED', fieldPopulation: 'NOT_PERFORMED', documentGeneration: 'NOT_PERFORMED', mappings: [] };
  }
  if (facts.status !== 'READY') {
    return { status: 'BLOCKED', blockReason: 'CANONICAL_FACTS_UNAVAILABLE', sourceValidation, formApplicability: 'NOT_EVALUATED', formRequiredness: 'NOT_EVALUATED', fieldPopulation: 'NOT_PERFORMED', documentGeneration: 'NOT_PERFORMED', mappings: [] };
  }
  const expectedProvenanceClass = {
    DIRECT_FROZEN_FACT: 'FROZEN_CUSTOMER_CONFIRMED',
    DETERMINISTIC_DERIVATION: 'DETERMINISTIC_DERIVATION',
    SUPPLEMENTAL_FACT: 'SUPPLEMENTAL_CUSTOMER_INPUT',
  } as const;
  for (const binding of definition.bindings) {
    const fact = facts.facts[binding.canonicalFactRef];
    if (fact?.state === 'KNOWN' && fact.provenance.provenanceClass !== expectedProvenanceClass[binding.mappingClass]) {
      return { status: 'BLOCKED', blockReason: 'MAPPING_PROVENANCE_CONFLICT', sourceValidation, formApplicability: 'NOT_EVALUATED', formRequiredness: 'NOT_EVALUATED', fieldPopulation: 'NOT_PERFORMED', documentGeneration: 'NOT_PERFORMED', mappings: [] };
    }
  }
  const mappings: FieldMappingEvaluation[] = definition.bindings.map(binding => {
    const fact = facts.facts[binding.canonicalFactRef];
    if (fact?.state === 'KNOWN') {
      return { fieldId: binding.fieldId, canonicalFactRef: binding.canonicalFactRef, mappingClass: binding.mappingClass, visibleLabelEvidence: binding.visibleLabelEvidence, sourcePage: binding.sourcePage, state: 'CANDIDATE_VALUE', candidateValue: fact.value, factState: 'KNOWN', provenance: fact.provenance };
    }
    return { fieldId: binding.fieldId, canonicalFactRef: binding.canonicalFactRef, mappingClass: binding.mappingClass, visibleLabelEvidence: binding.visibleLabelEvidence, sourcePage: binding.sourcePage, state: 'UNRESOLVED_FACT', candidateValue: null, factState: fact?.state ?? 'MISSING', provenance: fact?.provenance ?? null };
  });
  return {
    status: mappings.every(mapping => mapping.state === 'CANDIDATE_VALUE') ? 'RESOLVED_MAPPING' : 'UNRESOLVED_MAPPING',
    sourceValidation: { status: 'VALID' }, formApplicability: 'NOT_EVALUATED', formRequiredness: 'NOT_EVALUATED',
    fieldPopulation: 'NOT_PERFORMED', documentGeneration: 'NOT_PERFORMED', mappings,
  };
}
