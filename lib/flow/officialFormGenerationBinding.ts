import { createHash } from 'node:crypto';
import type {
  CanonicalFilingFactRef,
  FilingCanonicalFactsProjection,
  FilingFactProvenance,
  FilingFactState,
} from './filingCanonicalFacts';
import {
  type OfficialArtifactRole,
  type OfficialSourceHealth,
  type OfficialSourceIdentity,
  validateOfficialSourceHealth,
  validateOfficialSourceIdentity,
} from './officialFormFieldMap';

export const OFFICIAL_FORM_GENERATION_BINDING_SCHEMA_VERSION = 1 as const;

export type GenerationInputAuthorityClass =
  | 'CUSTOMER_CONFIRMED_FACT'
  | 'CUSTOMER_CONFIRMED_LEGAL_ELECTION'
  | 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED'
  | 'LIFECYCLE_OR_EXTERNAL_EVENT_SUPPLIED';

export type DeferredGenerationAuthorityClass = 'DEFERRED_TO_LATER_STAGE_NOT_WRITABLE_BY_D1';

export interface GenerationFieldEvidence {
  fieldId: string;
  sourcePage: number;
  fieldType: '/Tx' | '/Btn';
  objectReference: string;
  visibleLabelEvidence: string;
}

export interface GenerationFactDependency {
  ref: CanonicalFilingFactRef;
  requirement: 'REQUIRED' | 'OPTIONAL_UNANSWERED_OMITS';
}

export interface GenerationTransformIdentity {
  id:
    | 'TEXT_EXACT_V1'
    | 'TEXT_ARRAY_SEMICOLON_V1'
    | 'PREMISES_COMPOSE_V1'
    | 'OBJECT_PROPERTY_TEXT_V1'
    | 'ENUM_CHECKBOX_V1';
  version: string;
  args?: Readonly<Record<string, string>>;
}

export interface GenerationWriteRule {
  disposition: 'WRITE';
  evidence: GenerationFieldEvidence;
  writeKind: 'TEXT' | 'CHECKBOX';
  inputAuthorityClass: GenerationInputAuthorityClass;
  dependencies: readonly GenerationFactDependency[];
  transform: GenerationTransformIdentity;
  unresolvedPolicy: 'BLOCK';
}

export interface GenerationNoWriteRule {
  disposition: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE';
  evidence: GenerationFieldEvidence;
  authorityClass: DeferredGenerationAuthorityClass;
  reason: string;
}

export type GenerationFieldRule = GenerationWriteRule | GenerationNoWriteRule;

export interface GenerationProfileRequirement {
  ref: CanonicalFilingFactRef;
  inputAuthorityClass: GenerationInputAuthorityClass;
  allowedValues: readonly unknown[];
  blockerCode: string;
}

export interface OfficialFormGenerationBindingSemantics {
  generationSchemaVersion: typeof OFFICIAL_FORM_GENERATION_BINDING_SCHEMA_VERSION;
  mapId: string;
  mapVersion: string;
  profileId: string;
  generatorContractVersion: string;
  sourceIdentity: OfficialSourceIdentity;
  artifactRole: OfficialArtifactRole;
  fieldRules: readonly GenerationFieldRule[];
  profileRequirements: readonly GenerationProfileRequirement[];
  matrixDomainCoverage: readonly string[];
}

export interface OfficialFormGenerationBindingDefinition extends OfficialFormGenerationBindingSemantics {
  mapSnapshotId: string;
}

export type GenerationWritePlanEntry =
  | {
      action: 'WRITE_TEXT';
      fieldId: string;
      value: string;
      sourcePage: number;
      fieldType: '/Tx';
      objectReference: string;
      transform: GenerationTransformIdentity;
      dependencies: readonly CanonicalFilingFactRef[];
    }
  | {
      action: 'SET_SELECTED';
      fieldId: string;
      selected: true;
      sourcePage: number;
      fieldType: '/Btn';
      objectReference: string;
      transform: GenerationTransformIdentity;
      dependencies: readonly CanonicalFilingFactRef[];
    }
  | {
      action: 'SET_EXPLICIT_NONSELECTION';
      fieldId: string;
      selected: false;
      sourcePage: number;
      fieldType: '/Btn';
      objectReference: string;
      transform: GenerationTransformIdentity;
      dependencies: readonly CanonicalFilingFactRef[];
    }
  | {
      action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE';
      fieldId: string;
      sourcePage: number;
      fieldType: '/Tx' | '/Btn';
      objectReference: string;
      reason: string;
    };

export type GenerationBindingBlockReason =
  | 'NOT_GENERATION_CAPABLE'
  | 'MAP_SNAPSHOT_MISMATCH'
  | 'DUPLICATE_OR_CONFLICTING_FIELD_RULE'
  | 'SOURCE_VALIDATION_FAILED'
  | 'ARTIFACT_ROLE_MISMATCH'
  | 'CANONICAL_FACTS_UNAVAILABLE'
  | 'UNRESOLVED_PREPARATION_INPUT'
  | 'PROVENANCE_AUTHORITY_MISMATCH'
  | 'PROFILE_REQUIREMENT_BLOCKED'
  | 'INVALID_WRITE_VALUE'
  | 'UNSUPPORTED_SCENARIO';

export type OfficialFormGenerationBindingEvaluation =
  | {
      status: 'BLOCKED';
      blockReason: GenerationBindingBlockReason;
      detail: string;
      formApplicability: 'NOT_EVALUATED';
      formRequiredness: 'NOT_EVALUATED';
      documentGeneration: 'NOT_PERFORMED';
      pdfMutation: 'NOT_PERFORMED';
      fieldWritePlan: readonly [];
    }
  | {
      status: 'GENERATION_BINDING_READY';
      mapSnapshotId: string;
      referencedFactSnapshotId: string;
      generationInputId: string;
      generatorContractVersion: string;
      formApplicability: 'NOT_EVALUATED';
      formRequiredness: 'NOT_EVALUATED';
      documentGeneration: 'NOT_PERFORMED';
      pdfMutation: 'NOT_PERFORMED';
      fieldWritePlan: readonly GenerationWritePlanEntry[];
    };

export interface GenerationEvaluationOptions {
  unsupportedScenarios?: readonly string[];
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function canonicalizeGenerationIdentity(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers are not canonical generation identity values.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeGenerationIdentity).join(',')}]`;
  if (plainObject(value)) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeGenerationIdentity(item)}`).join(',')}}`;
  }
  throw new Error(`Unsupported canonical generation identity type: ${typeof value}`);
}

function digest(prefix: string, value: unknown): string {
  return `${prefix}:sha256:${createHash('sha256').update(canonicalizeGenerationIdentity(value)).digest('hex')}`;
}

export function computeGenerationMapSnapshotId(
  semantics: OfficialFormGenerationBindingSemantics,
): string {
  return digest('map', semantics);
}

function looksGenerationCapable(value: unknown): value is OfficialFormGenerationBindingDefinition {
  if (!plainObject(value)) return false;
  return value.generationSchemaVersion === OFFICIAL_FORM_GENERATION_BINDING_SCHEMA_VERSION
    && typeof value.mapId === 'string'
    && typeof value.mapVersion === 'string'
    && typeof value.profileId === 'string'
    && typeof value.generatorContractVersion === 'string'
    && typeof value.mapSnapshotId === 'string'
    && Array.isArray(value.fieldRules)
    && Array.isArray(value.profileRequirements)
    && plainObject(value.sourceIdentity);
}

export function validateGenerationBindingDefinition(value: unknown):
  | { status: 'VALID'; definition: OfficialFormGenerationBindingDefinition }
  | { status: 'BLOCKED'; reason: GenerationBindingBlockReason; detail: string } {
  if (!looksGenerationCapable(value)) {
    return {
      status: 'BLOCKED',
      reason: 'NOT_GENERATION_CAPABLE',
      detail: 'Definition lacks the explicit D.1 generation-binding schema and snapshot identity.',
    };
  }
  const semantics: OfficialFormGenerationBindingSemantics = {
    generationSchemaVersion: value.generationSchemaVersion,
    mapId: value.mapId,
    mapVersion: value.mapVersion,
    profileId: value.profileId,
    generatorContractVersion: value.generatorContractVersion,
    sourceIdentity: value.sourceIdentity,
    artifactRole: value.artifactRole,
    fieldRules: value.fieldRules,
    profileRequirements: value.profileRequirements,
    matrixDomainCoverage: value.matrixDomainCoverage,
  };
  const recomputed = computeGenerationMapSnapshotId(semantics);
  if (recomputed !== value.mapSnapshotId) {
    return {
      status: 'BLOCKED',
      reason: 'MAP_SNAPSHOT_MISMATCH',
      detail: `mapSnapshotId mismatch: expected ${recomputed}, supplied ${value.mapSnapshotId}.`,
    };
  }
  const fieldIds = new Set<string>();
  for (const rule of value.fieldRules) {
    if (!rule?.evidence?.fieldId || fieldIds.has(rule.evidence.fieldId)) {
      return {
        status: 'BLOCKED',
        reason: 'DUPLICATE_OR_CONFLICTING_FIELD_RULE',
        detail: `Field ${rule?.evidence?.fieldId ?? 'MISSING'} is missing or appears more than once.`,
      };
    }
    fieldIds.add(rule.evidence.fieldId);
    if (!Number.isInteger(rule.evidence.sourcePage) || rule.evidence.sourcePage < 1
      || rule.evidence.visibleLabelEvidence.trim() === '' || rule.evidence.objectReference.trim() === '') {
      return {
        status: 'BLOCKED',
        reason: 'DUPLICATE_OR_CONFLICTING_FIELD_RULE',
        detail: `Field ${rule.evidence.fieldId} lacks exact bounded AcroForm evidence.`,
      };
    }
    if (rule.disposition === 'WRITE' && rule.dependencies.length === 0) {
      return {
        status: 'BLOCKED',
        reason: 'DUPLICATE_OR_CONFLICTING_FIELD_RULE',
        detail: `Writable field ${rule.evidence.fieldId} must declare its exact preparation dependencies.`,
      };
    }
  }
  return { status: 'VALID', definition: value };
}

function blocked(
  blockReason: GenerationBindingBlockReason,
  detail: string,
): OfficialFormGenerationBindingEvaluation {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    formApplicability: 'NOT_EVALUATED',
    formRequiredness: 'NOT_EVALUATED',
    documentGeneration: 'NOT_PERFORMED',
    pdfMutation: 'NOT_PERFORMED',
    fieldWritePlan: [],
  };
}

function authorityMatches(
  provenance: FilingFactProvenance,
  authority: GenerationInputAuthorityClass,
): boolean {
  if (authority === 'CUSTOMER_CONFIRMED_FACT') {
    return provenance.provenanceClass === 'FROZEN_CUSTOMER_CONFIRMED'
      || provenance.provenanceClass === 'DETERMINISTIC_DERIVATION'
      || provenance.provenanceClass === 'SUPPLEMENTAL_CUSTOMER_INPUT';
  }
  if (authority === 'CUSTOMER_CONFIRMED_LEGAL_ELECTION') {
    return provenance.provenanceClass === 'CUSTOMER_CONFIRMED_LEGAL_ELECTION'
      && !!provenance.legalElectionConfirmation
      && provenance.legalElectionConfirmation.confirmationId.trim() !== ''
      && provenance.legalElectionConfirmation.confirmedAtISO.trim() !== '';
  }
  if (authority === 'DETERMINISTIC_GOVERNED_CONTROL_REQUIRED') {
    const control = provenance.governedControl;
    return provenance.provenanceClass === 'GOVERNED_CONTROL_RESULT'
      && !!control
      && control.status === 'CURRENT'
      && control.controlId.trim() !== ''
      && control.controlVersion.trim() !== ''
      && control.resultId.trim() !== '';
  }
  const event = provenance.lifecycleEvent;
  return provenance.provenanceClass === 'LIFECYCLE_EXTERNAL_EVENT'
    && !!event
    && event.sourceId.trim() !== ''
    && event.eventId.trim() !== ''
    && event.eventType.trim() !== '';
}

function resolveKnownFact(
  facts: FilingCanonicalFactsProjection,
  dependency: GenerationFactDependency,
  authority: GenerationInputAuthorityClass,
):
  | { status: 'KNOWN'; value: unknown; provenance: FilingFactProvenance }
  | { status: 'OMITTED_OPTIONAL' }
  | { status: 'BLOCKED'; reason: GenerationBindingBlockReason; detail: string } {
  if (facts.status !== 'READY') {
    return { status: 'BLOCKED', reason: 'CANONICAL_FACTS_UNAVAILABLE', detail: 'Exact canonical facts are unavailable.' };
  }
  const fact = facts.facts[dependency.ref] as FilingFactState<unknown> | undefined;
  if (!fact) {
    return { status: 'BLOCKED', reason: 'UNRESOLVED_PREPARATION_INPUT', detail: `${dependency.ref} is missing.` };
  }
  if (fact.state === 'UNANSWERED' && dependency.requirement === 'OPTIONAL_UNANSWERED_OMITS') {
    return { status: 'OMITTED_OPTIONAL' };
  }
  if (fact.state !== 'KNOWN') {
    return {
      status: 'BLOCKED',
      reason: 'UNRESOLVED_PREPARATION_INPUT',
      detail: `${dependency.ref} is ${fact.state}; unresolved states never mean blank/unchecked/No.`,
    };
  }
  if (!authorityMatches(fact.provenance, authority)) {
    return {
      status: 'BLOCKED',
      reason: 'PROVENANCE_AUTHORITY_MISMATCH',
      detail: `${dependency.ref} does not carry the required ${authority} provenance/confirmation identity.`,
    };
  }
  return { status: 'KNOWN', value: fact.value, provenance: fact.provenance };
}

function factSnapshotRecord(
  facts: FilingCanonicalFactsProjection,
  refs: readonly CanonicalFilingFactRef[],
): unknown {
  if (facts.status !== 'READY') return { status: facts.status, reason: facts.reason };
  const queue = [...refs];
  const seen = new Set<CanonicalFilingFactRef>();
  while (queue.length > 0) {
    const ref = queue.shift()!;
    if (seen.has(ref)) continue;
    seen.add(ref);
    const fact = facts.facts[ref] as FilingFactState<unknown> | undefined;
    if (fact) {
      for (const dependency of fact.provenance.dependencies) queue.push(dependency);
    }
  }
  return [...seen]
    .sort()
    .map(ref => ({ ref, fact: facts.facts[ref] ?? null }));
}

export function computeReferencedFactSnapshotId(
  facts: FilingCanonicalFactsProjection,
  refs: readonly CanonicalFilingFactRef[],
): string {
  return digest('facts', factSnapshotRecord(facts, refs));
}

export function computeGenerationInputId(input: {
  sourceSnapshotId: string;
  mapSnapshotId: string;
  referencedFactSnapshotId: string;
  generatorContractVersion: string;
}): string {
  return digest('generation-input', input);
}

function stringValue(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value;
}

function transformWrite(
  rule: GenerationWriteRule,
  resolved: readonly ({ status: 'KNOWN'; value: unknown } | { status: 'OMITTED_OPTIONAL' })[],
): GenerationWritePlanEntry | null {
  const dependencyRefs = rule.dependencies.map(item => item.ref);
  const evidence = rule.evidence;
  const transform = rule.transform;

  if (transform.id === 'TEXT_EXACT_V1') {
    const value = resolved[0]?.status === 'KNOWN' ? stringValue(resolved[0].value) : null;
    if (!value || rule.writeKind !== 'TEXT' || evidence.fieldType !== '/Tx') return null;
    return { action: 'WRITE_TEXT', fieldId: evidence.fieldId, value, sourcePage: evidence.sourcePage, fieldType: '/Tx', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs };
  }

  if (transform.id === 'TEXT_ARRAY_SEMICOLON_V1') {
    const raw = resolved[0]?.status === 'KNOWN' ? resolved[0].value : null;
    if (!Array.isArray(raw) || raw.length === 0 || raw.some(item => typeof item !== 'string' || item.trim() === '')
      || rule.writeKind !== 'TEXT' || evidence.fieldType !== '/Tx') return null;
    const value = raw.join('; ');
    return { action: 'WRITE_TEXT', fieldId: evidence.fieldId, value, sourcePage: evidence.sourcePage, fieldType: '/Tx', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs };
  }

  if (transform.id === 'PREMISES_COMPOSE_V1') {
    if (rule.writeKind !== 'TEXT' || evidence.fieldType !== '/Tx' || resolved.length !== 5) return null;
    const street = resolved[0]?.status === 'KNOWN' ? stringValue(resolved[0].value) : null;
    const unit = resolved[1]?.status === 'KNOWN' ? stringValue(resolved[1].value) : resolved[1]?.status === 'OMITTED_OPTIONAL' ? '' : null;
    const city = resolved[2]?.status === 'KNOWN' ? stringValue(resolved[2].value) : null;
    const zip = resolved[3]?.status === 'KNOWN' ? stringValue(resolved[3].value) : null;
    const county = resolved[4]?.status === 'KNOWN' ? stringValue(resolved[4].value) : null;
    if (!street || unit === null || !city || !zip || !county) return null;
    const first = unit ? `${street}, ${unit}` : street;
    const value = `${first}, ${city}, ${zip}, ${county}`;
    return { action: 'WRITE_TEXT', fieldId: evidence.fieldId, value, sourcePage: evidence.sourcePage, fieldType: '/Tx', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs };
  }

  if (transform.id === 'OBJECT_PROPERTY_TEXT_V1') {
    if (rule.writeKind !== 'TEXT' || evidence.fieldType !== '/Tx') return null;
    const raw = resolved[0]?.status === 'KNOWN' ? resolved[0].value : null;
    const property = transform.args?.property;
    if (!plainObject(raw) || !property) return null;
    const value = stringValue(raw[property]);
    if (!value) return null;
    return { action: 'WRITE_TEXT', fieldId: evidence.fieldId, value, sourcePage: evidence.sourcePage, fieldType: '/Tx', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs };
  }

  if (transform.id === 'ENUM_CHECKBOX_V1') {
    if (rule.writeKind !== 'CHECKBOX' || evidence.fieldType !== '/Btn') return null;
    const raw = resolved[0]?.status === 'KNOWN' ? resolved[0].value : null;
    const selectedValue = transform.args?.selectedValue;
    if (typeof raw !== 'string' || !selectedValue) return null;
    const selected = raw === selectedValue;
    return selected
      ? { action: 'SET_SELECTED', fieldId: evidence.fieldId, selected: true, sourcePage: evidence.sourcePage, fieldType: '/Btn', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs }
      : { action: 'SET_EXPLICIT_NONSELECTION', fieldId: evidence.fieldId, selected: false, sourcePage: evidence.sourcePage, fieldType: '/Btn', objectReference: evidence.objectReference, transform, dependencies: dependencyRefs };
  }

  return null;
}

export function evaluateOfficialFormGenerationBinding(
  definitionValue: unknown,
  suppliedSourceIdentity: OfficialSourceIdentity,
  suppliedSourceHealth: OfficialSourceHealth | null | undefined,
  facts: FilingCanonicalFactsProjection,
  artifactRole: OfficialArtifactRole,
  options: GenerationEvaluationOptions = {},
): OfficialFormGenerationBindingEvaluation {
  const definitionValidation = validateGenerationBindingDefinition(definitionValue);
  if (definitionValidation.status === 'BLOCKED') {
    return blocked(definitionValidation.reason, definitionValidation.detail);
  }
  const definition = definitionValidation.definition;

  const identityValidation = validateOfficialSourceIdentity(definition.sourceIdentity, suppliedSourceIdentity);
  const healthValidation = validateOfficialSourceHealth(suppliedSourceHealth);
  const sourceValidation = identityValidation.status === 'VALID' ? healthValidation : identityValidation;
  if (sourceValidation.status !== 'VALID') {
    return blocked('SOURCE_VALIDATION_FAILED', `${sourceValidation.reason}: ${sourceValidation.detail}`);
  }
  if (artifactRole !== definition.artifactRole) {
    return blocked('ARTIFACT_ROLE_MISMATCH', `Expected ${definition.artifactRole}; got ${artifactRole}.`);
  }
  if (facts.status !== 'READY') {
    return blocked('CANONICAL_FACTS_UNAVAILABLE', `Canonical facts are ${facts.status}.`);
  }
  if ((options.unsupportedScenarios?.length ?? 0) > 0) {
    return blocked('UNSUPPORTED_SCENARIO', `Unsupported current-profile scenario: ${options.unsupportedScenarios!.join(', ')}.`);
  }

  for (const requirement of definition.profileRequirements) {
    const dependency: GenerationFactDependency = { ref: requirement.ref, requirement: 'REQUIRED' };
    const resolved = resolveKnownFact(facts, dependency, requirement.inputAuthorityClass);
    if (resolved.status === 'BLOCKED') return blocked(resolved.reason, resolved.detail);
    if (resolved.status !== 'KNOWN' || !requirement.allowedValues.some(value => canonicalizeGenerationIdentity(value) === canonicalizeGenerationIdentity(resolved.value))) {
      return blocked('PROFILE_REQUIREMENT_BLOCKED', `${requirement.blockerCode}: ${requirement.ref} is outside the supported initial profile.`);
    }
  }

  const plan: GenerationWritePlanEntry[] = [];
  const referenced = new Set<CanonicalFilingFactRef>(definition.profileRequirements.map(item => item.ref));

  for (const rule of definition.fieldRules) {
    if (rule.disposition === 'PRESERVE_OFFICIAL_BLANK_NO_WRITE') {
      plan.push({
        action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE',
        fieldId: rule.evidence.fieldId,
        sourcePage: rule.evidence.sourcePage,
        fieldType: rule.evidence.fieldType,
        objectReference: rule.evidence.objectReference,
        reason: rule.reason,
      });
      continue;
    }

    const resolvedValues: ({ status: 'KNOWN'; value: unknown } | { status: 'OMITTED_OPTIONAL' })[] = [];
    for (const dependency of rule.dependencies) {
      referenced.add(dependency.ref);
      const resolved = resolveKnownFact(facts, dependency, rule.inputAuthorityClass);
      if (resolved.status === 'BLOCKED') return blocked(resolved.reason, `${rule.evidence.fieldId}: ${resolved.detail}`);
      resolvedValues.push(resolved.status === 'KNOWN' ? { status: 'KNOWN', value: resolved.value } : resolved);
    }
    const entry = transformWrite(rule, resolvedValues);
    if (!entry) {
      return blocked('INVALID_WRITE_VALUE', `${rule.evidence.fieldId} could not resolve a nonblank deterministic field representation.`);
    }
    plan.push(entry);
  }

  const referencedRefs = [...referenced].sort();
  const referencedFactSnapshotId = computeReferencedFactSnapshotId(facts, referencedRefs);
  const generationInputId = computeGenerationInputId({
    sourceSnapshotId: definition.sourceIdentity.sourceSnapshotId,
    mapSnapshotId: definition.mapSnapshotId,
    referencedFactSnapshotId,
    generatorContractVersion: definition.generatorContractVersion,
  });

  return {
    status: 'GENERATION_BINDING_READY',
    mapSnapshotId: definition.mapSnapshotId,
    referencedFactSnapshotId,
    generationInputId,
    generatorContractVersion: definition.generatorContractVersion,
    formApplicability: 'NOT_EVALUATED',
    formRequiredness: 'NOT_EVALUATED',
    documentGeneration: 'NOT_PERFORMED',
    pdfMutation: 'NOT_PERFORMED',
    fieldWritePlan: plan,
  };
}
