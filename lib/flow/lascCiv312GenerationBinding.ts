import { createHash } from 'node:crypto';
import {
  LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  LASC_CIV_312_FIELD_MAP_ID,
  LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  LASC_CIV_312_FIELD_MAP_VERSION,
  LASC_CIV_312_FORM_ID,
  LASC_CIV_312_FORM_REVISION,
  LASC_CIV_312_SOURCE_SHA256,
  LASC_CIV_312_TERMINAL_FIELDS,
  type LascCiv312SourceTopology,
  validateLascCiv312SourceTopology,
} from './lascCiv312FieldMapFoundation';

export const LASC_CIV_312_GENERATION_BINDING_PROFILE_ID = 'lasc-civ312-generation-binding-v1' as const;
export const LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION = '2026-08-31.r1' as const;

export interface LascCiv312CreatedNoticeIdentity {
  generation: string;
  createdAtISO: string;
}

export interface LascCiv312FactProvenance {
  createdNotice: LascCiv312CreatedNoticeIdentity;
  sourcePaths: readonly string[];
  provenanceClass: string;
  dependencies: readonly string[];
  governedControl?: {
    controlId: string;
    controlVersion: string;
    resultId: string;
    status: string;
  };
}

export type LascCiv312FactState =
  | { state: 'KNOWN'; value: unknown; provenance: LascCiv312FactProvenance }
  | { state: 'UNANSWERED'; provenance: LascCiv312FactProvenance }
  | { state: 'UNKNOWN'; provenance: LascCiv312FactProvenance }
  | { state: 'REQUIRES_CONFIRMATION'; reason: string; provenance: LascCiv312FactProvenance }
  | { state: 'CONFLICT'; values: readonly unknown[]; reason: string; provenance: LascCiv312FactProvenance };

export type LascCiv312CanonicalFactsProjection =
  | {
      status: 'READY';
      createdNoticeIdentity: LascCiv312CreatedNoticeIdentity;
      facts: Record<string, LascCiv312FactState>;
    }
  | { status: 'BLOCKED'; reason: string; facts: null };

export const LASC_CIV_312_GOVERNANCE_POSTURE = Object.freeze({
  formApplicability: 'NOT_EVALUATED',
  formRequiredness: 'NOT_EVALUATED',
  legalSufficiency: 'NOT_DETERMINED',
  documentGeneration: 'NOT_PERFORMED',
  pdfMutation: 'NOT_PERFORMED',
  databaseWrite: 'NO',
  persistence: 'NO',
  preparationCheckpointWrite: 'NO',
  ownerReviewCheckpointWrite: 'NO',
  checkpoint1: 'HELD',
  filing: 'NO',
  signing: 'NO',
  serviceExecution: 'NO',
  courtSubmission: 'NO',
  stageF: 'HELD',
  newProductionAuthority: 'NO',
} as const);

export interface LascCiv312WritePlanItem {
  action: 'WRITE_TEXT';
  fieldId: string;
  value: string;
  canonicalFactRef: string;
  provenance: LascCiv312FactProvenance;
}

export interface LascCiv312ProtectedDestination {
  fieldId: string;
  reason: string;
}

export type LascCiv312BindingBlockerCode =
  | 'SOURCE_TOPOLOGY_BLOCKED'
  | 'MAP_SNAPSHOT_MISMATCH'
  | 'GENERATION_BINDING_PROFILE_SNAPSHOT_MISMATCH'
  | 'FACTS_NOT_READY'
  | 'MALFORMED_CREATED_NOTICE_IDENTITY'
  | 'MISSING_DEFENDANT_NAMES'
  | 'MALFORMED_DEFENDANT_NAMES'
  | 'UNPROVENANCED_DEFENDANT_NAMES'
  | 'STALE_DEFENDANT_NAMES'
  | 'DEFENDANT_COUNT_UNSUPPORTED'
  | 'MISSING_PLAINTIFF_NAMES'
  | 'MALFORMED_PLAINTIFF_NAMES'
  | 'UNPROVENANCED_PLAINTIFF_NAMES'
  | 'STALE_PLAINTIFF_NAMES'
  | 'PLAINTIFF_COUNT_UNSUPPORTED'
  | 'MISSING_DEFENDANT_PHONE_FACT'
  | 'UNANSWERED_DEFENDANT_PHONE'
  | 'UNKNOWN_NUMBER_CHECKBOX_SEMANTICS_UNGOVERNED'
  | 'REQUIRES_CONFIRMATION_DEFENDANT_PHONE'
  | 'CONFLICT_DEFENDANT_PHONE'
  | 'STALE_DEFENDANT_PHONE'
  | 'MALFORMED_DEFENDANT_PHONE'
  | 'UNPROVENANCED_DEFENDANT_PHONE'
  | 'ORPHAN_DEFENDANT_PHONE_FACT';

export type LascCiv312GenerationBindingResult =
  | {
      status: 'GENERATION_BINDING_READY';
      formId: typeof LASC_CIV_312_FORM_ID;
      formRevision: typeof LASC_CIV_312_FORM_REVISION;
      sourceSha256: typeof LASC_CIV_312_SOURCE_SHA256;
      fieldMapId: typeof LASC_CIV_312_FIELD_MAP_ID;
      fieldMapVersion: typeof LASC_CIV_312_FIELD_MAP_VERSION;
      fieldMapSnapshot: string;
      generationBindingProfileId: typeof LASC_CIV_312_GENERATION_BINDING_PROFILE_ID;
      generationBindingProfileVersion: typeof LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION;
      generationBindingProfileSnapshot: string;
      fieldWritePlan: readonly LascCiv312WritePlanItem[];
      protectedDestinations: readonly LascCiv312ProtectedDestination[];
      governance: typeof LASC_CIV_312_GOVERNANCE_POSTURE;
    }
  | {
      status: 'BLOCKED';
      blockerCode: LascCiv312BindingBlockerCode;
      reason: string;
      fieldWritePlan: readonly [];
      protectedDestinations: readonly LascCiv312ProtectedDestination[];
      governance: typeof LASC_CIV_312_GOVERNANCE_POSTURE;
    };

const protectedDestinations = (): readonly LascCiv312ProtectedDestination[] =>
  LASC_CIV_312_TERMINAL_FIELDS
    .filter(field => field.classification === 'PROTECTED_NO_WRITE')
    .map(field => ({ fieldId: field.fieldId, reason: field.noWriteReason ?? 'PROTECTED_NO_WRITE' }));

function canonicalProfileSnapshotInput() {
  return {
    profileId: LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
    profileVersion: LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
    formId: LASC_CIV_312_FORM_ID,
    formRevision: LASC_CIV_312_FORM_REVISION,
    sourceSha256: LASC_CIV_312_SOURCE_SHA256,
    fieldMapId: LASC_CIV_312_FIELD_MAP_ID,
    fieldMapVersion: LASC_CIV_312_FIELD_MAP_VERSION,
    fieldMapSnapshot: LASC_CIV_312_FIELD_MAP_SNAPSHOT,
    writableRules: LASC_CIV_312_TERMINAL_FIELDS
      .filter(field => field.classification === 'WRITABLE')
      .map(field => ({ fieldId: field.fieldId, writableSource: field.writableSource })),
    protectedFieldIds: protectedDestinations().map(field => field.fieldId),
    governance: LASC_CIV_312_GOVERNANCE_POSTURE,
  };
}

export function computeLascCiv312GenerationBindingProfileSnapshot(): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalProfileSnapshotInput())).digest('hex')}`;
}

export const LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT =
  'sha256:01e8f4f9cd4d6baf804c8752ab5e1a11c89e4fccf4debdc6ab917abd1f890824' as const;

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIdentity(value: unknown): value is LascCiv312CreatedNoticeIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isNonBlankString(candidate.generation)
    && isNonBlankString(candidate.createdAtISO)
    && Number.isFinite(Date.parse(candidate.createdAtISO));
}

function sameIdentity(a: LascCiv312CreatedNoticeIdentity, b: LascCiv312CreatedNoticeIdentity): boolean {
  return a.generation === b.generation && a.createdAtISO === b.createdAtISO;
}

function isProvenance(value: unknown): value is LascCiv312FactProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isIdentity(candidate.createdNotice)
    && Array.isArray(candidate.sourcePaths)
    && candidate.sourcePaths.every(isNonBlankString)
    && isNonBlankString(candidate.provenanceClass)
    && Array.isArray(candidate.dependencies)
    && candidate.dependencies.every(item => typeof item === 'string');
}

function block(
  blockerCode: LascCiv312BindingBlockerCode,
  reason: string,
): LascCiv312GenerationBindingResult {
  return {
    status: 'BLOCKED',
    blockerCode,
    reason,
    fieldWritePlan: [],
    protectedDestinations: protectedDestinations(),
    governance: LASC_CIV_312_GOVERNANCE_POSTURE,
  };
}

function classifyIndexedNames(
  fact: LascCiv312FactState | undefined,
  expectedIdentity: LascCiv312CreatedNoticeIdentity,
  kind: 'DEFENDANT' | 'PLAINTIFF',
):
  | { status: 'VALID'; names: readonly string[]; provenance: LascCiv312FactProvenance }
  | { status: 'BLOCKED'; code: LascCiv312BindingBlockerCode; reason: string } {
  const prefix = kind === 'DEFENDANT' ? 'DEFENDANT' : 'PLAINTIFF';
  if (!fact) return { status: 'BLOCKED', code: `MISSING_${prefix}_NAMES`, reason: `${prefix}_NAMES_FACT_MISSING` };
  if (!('provenance' in fact) || !isProvenance(fact.provenance)) {
    return { status: 'BLOCKED', code: `UNPROVENANCED_${prefix}_NAMES`, reason: `${prefix}_NAMES_PROVENANCE_INVALID` };
  }
  if (!sameIdentity(fact.provenance.createdNotice, expectedIdentity)) {
    return { status: 'BLOCKED', code: `STALE_${prefix}_NAMES`, reason: `${prefix}_NAMES_CREATED_NOTICE_MISMATCH` };
  }
  if (fact.state !== 'KNOWN') {
    return { status: 'BLOCKED', code: `MALFORMED_${prefix}_NAMES`, reason: `${prefix}_NAMES_NOT_KNOWN` };
  }
  if (!Array.isArray(fact.value) || fact.value.length === 0 || !fact.value.every(isNonBlankString)) {
    return { status: 'BLOCKED', code: `MALFORMED_${prefix}_NAMES`, reason: `${prefix}_NAMES_VALUE_MALFORMED` };
  }
  const expectedClass = kind === 'DEFENDANT' ? 'FROZEN_CUSTOMER_CONFIRMED' : 'DETERMINISTIC_DERIVATION';
  const expectedPath = kind === 'DEFENDANT' ? 'createData.tenantNames' : 'createData.landlordIdentity';
  if (fact.provenance.provenanceClass !== expectedClass
    || fact.provenance.sourcePaths.length !== 1
    || fact.provenance.sourcePaths[0] !== expectedPath) {
    return { status: 'BLOCKED', code: `UNPROVENANCED_${prefix}_NAMES`, reason: `${prefix}_NAMES_SOURCE_PROVENANCE_MISMATCH` };
  }
  return { status: 'VALID', names: fact.value as readonly string[], provenance: fact.provenance };
}

function validatePhoneFact(
  fact: LascCiv312FactState | undefined,
  expectedIdentity: LascCiv312CreatedNoticeIdentity,
  index: number,
):
  | { status: 'VALID'; value: string; provenance: LascCiv312FactProvenance }
  | { status: 'BLOCKED'; code: LascCiv312BindingBlockerCode; reason: string } {
  if (!fact) return { status: 'BLOCKED', code: 'MISSING_DEFENDANT_PHONE_FACT', reason: `DEFENDANT_PHONE_${index}_FACT_MISSING` };
  if (!('provenance' in fact) || !isProvenance(fact.provenance)) {
    return { status: 'BLOCKED', code: 'UNPROVENANCED_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_PROVENANCE_INVALID` };
  }
  if (!sameIdentity(fact.provenance.createdNotice, expectedIdentity)) {
    return { status: 'BLOCKED', code: 'STALE_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_CREATED_NOTICE_MISMATCH` };
  }
  if (fact.provenance.provenanceClass !== 'SUPPLEMENTAL_CUSTOMER_INPUT'
    || fact.provenance.sourcePaths.length !== 1
    || fact.provenance.sourcePaths[0] !== `supplemental.defendantTelephones[${index}]`) {
    return { status: 'BLOCKED', code: 'UNPROVENANCED_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_SOURCE_PROVENANCE_MISMATCH` };
  }
  if (fact.state === 'UNANSWERED') {
    return { status: 'BLOCKED', code: 'UNANSWERED_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_UNANSWERED` };
  }
  if (fact.state === 'UNKNOWN') {
    return {
      status: 'BLOCKED',
      code: 'UNKNOWN_NUMBER_CHECKBOX_SEMANTICS_UNGOVERNED',
      reason: `DEFENDANT_PHONE_${index}_UNKNOWN_REQUIRES_UNGOVERNED_AGGREGATE_CHECKBOX_RULE`,
    };
  }
  if (fact.state === 'REQUIRES_CONFIRMATION') {
    return { status: 'BLOCKED', code: 'REQUIRES_CONFIRMATION_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_REQUIRES_CONFIRMATION` };
  }
  if (fact.state === 'CONFLICT') {
    return { status: 'BLOCKED', code: 'CONFLICT_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_CONFLICT` };
  }
  if (fact.state !== 'KNOWN' || !isNonBlankString(fact.value)) {
    return { status: 'BLOCKED', code: 'MALFORMED_DEFENDANT_PHONE', reason: `DEFENDANT_PHONE_${index}_VALUE_MALFORMED` };
  }
  return { status: 'VALID', value: fact.value, provenance: fact.provenance };
}

function writableFieldId(kind: 'DEFENDANT_NAME_INDEX' | 'DEFENDANT_PHONE_INDEX' | 'PLAINTIFF_NAME_INDEX', index: number): string {
  const field = LASC_CIV_312_TERMINAL_FIELDS.find(item =>
    item.classification === 'WRITABLE'
      && item.writableSource?.kind === kind
      && item.writableSource.index === index
  );
  if (!field) throw new Error(`Missing frozen CIV 312 writable destination for ${kind}:${index}`);
  return field.fieldId;
}

export function evaluateLascCiv312GenerationBinding(
  sourceTopology: LascCiv312SourceTopology,
  projection: LascCiv312CanonicalFactsProjection,
  suppliedFieldMapSnapshot: string = LASC_CIV_312_FIELD_MAP_SNAPSHOT,
): LascCiv312GenerationBindingResult {
  if (computeLascCiv312GenerationBindingProfileSnapshot() !== LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT) {
    return block('GENERATION_BINDING_PROFILE_SNAPSHOT_MISMATCH', 'GENERATION_BINDING_PROFILE_SNAPSHOT_DOES_NOT_MATCH_FROZEN_PROFILE');
  }
  const topology = validateLascCiv312SourceTopology(sourceTopology);
  if (topology.status !== 'VALID') return block('SOURCE_TOPOLOGY_BLOCKED', topology.reason);
  if (suppliedFieldMapSnapshot !== LASC_CIV_312_FIELD_MAP_SNAPSHOT
    || topology.fieldMapSnapshot !== LASC_CIV_312_FIELD_MAP_SNAPSHOT) {
    return block('MAP_SNAPSHOT_MISMATCH', 'FIELD_MAP_SNAPSHOT_DOES_NOT_MATCH_FROZEN_PROFILE');
  }
  if (projection.status !== 'READY') return block('FACTS_NOT_READY', projection.reason);
  if (!isIdentity(projection.createdNoticeIdentity)) {
    return block('MALFORMED_CREATED_NOTICE_IDENTITY', 'CREATED_NOTICE_IDENTITY_INVALID');
  }

  const defendants = classifyIndexedNames(projection.facts['defendant.names'], projection.createdNoticeIdentity, 'DEFENDANT');
  if (defendants.status !== 'VALID') return block(defendants.code, defendants.reason);
  if (defendants.names.length > 5) {
    return block('DEFENDANT_COUNT_UNSUPPORTED', `DEFENDANT_COUNT_${defendants.names.length}_EXCEEDS_FIVE_SUPPORTED_SLOTS`);
  }

  const plaintiffs = classifyIndexedNames(projection.facts['plaintiff.names'], projection.createdNoticeIdentity, 'PLAINTIFF');
  if (plaintiffs.status !== 'VALID') return block(plaintiffs.code, plaintiffs.reason);
  if (plaintiffs.names.length > 2) {
    return block('PLAINTIFF_COUNT_UNSUPPORTED', `PLAINTIFF_COUNT_${plaintiffs.names.length}_EXCEEDS_TWO_SUPPORTED_SLOTS`);
  }

  const phoneFactIndexes = Object.keys(projection.facts)
    .map(key => /^defendant\.(\d+)\.telephone$/.exec(key))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(match => Number(match[1]));
  if (phoneFactIndexes.some(index => !Number.isInteger(index) || index < 0 || index >= defendants.names.length)) {
    return block('ORPHAN_DEFENDANT_PHONE_FACT', 'DEFENDANT_PHONE_FACT_HAS_NO_MATCHING_CANONICAL_DEFENDANT');
  }

  const validatedPhones: { value: string; provenance: LascCiv312FactProvenance }[] = [];
  for (let index = 0; index < defendants.names.length; index += 1) {
    const phone = validatePhoneFact(projection.facts[`defendant.${index}.telephone`], projection.createdNoticeIdentity, index);
    if (phone.status !== 'VALID') return block(phone.code, phone.reason);
    validatedPhones.push(phone);
  }

  const plan: LascCiv312WritePlanItem[] = [];
  defendants.names.forEach((name, index) => {
    plan.push({
      action: 'WRITE_TEXT',
      fieldId: writableFieldId('DEFENDANT_NAME_INDEX', index),
      value: name,
      canonicalFactRef: 'defendant.names',
      provenance: defendants.provenance,
    });
    plan.push({
      action: 'WRITE_TEXT',
      fieldId: writableFieldId('DEFENDANT_PHONE_INDEX', index),
      value: validatedPhones[index].value,
      canonicalFactRef: `defendant.${index}.telephone`,
      provenance: validatedPhones[index].provenance,
    });
  });
  plaintiffs.names.forEach((name, index) => {
    plan.push({
      action: 'WRITE_TEXT',
      fieldId: writableFieldId('PLAINTIFF_NAME_INDEX', index),
      value: name,
      canonicalFactRef: 'plaintiff.names',
      provenance: plaintiffs.provenance,
    });
  });

  if (new Set(plan.map(item => item.fieldId)).size !== plan.length) {
    return block('SOURCE_TOPOLOGY_BLOCKED', 'DUPLICATE_DESTINATION_IN_GENERATED_WRITE_PLAN');
  }

  return {
    status: 'GENERATION_BINDING_READY',
    formId: LASC_CIV_312_FORM_ID,
    formRevision: LASC_CIV_312_FORM_REVISION,
    sourceSha256: LASC_CIV_312_SOURCE_SHA256,
    fieldMapId: LASC_CIV_312_FIELD_MAP_ID,
    fieldMapVersion: LASC_CIV_312_FIELD_MAP_VERSION,
    fieldMapSnapshot: LASC_CIV_312_FIELD_MAP_SNAPSHOT,
    generationBindingProfileId: LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
    generationBindingProfileVersion: LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
    generationBindingProfileSnapshot: LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
    fieldWritePlan: plan,
    protectedDestinations: protectedDestinations(),
    governance: LASC_CIV_312_GOVERNANCE_POSTURE,
  };
}

export const LASC_CIV_312_REFERENCE_SOURCE_TOPOLOGY = LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY;
