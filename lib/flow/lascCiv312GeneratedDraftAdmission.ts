import { createHash } from 'node:crypto';
import {
  LASC_CIV_312_FIELD_MAP_ID,
  LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  LASC_CIV_312_FIELD_MAP_VERSION,
  LASC_CIV_312_FORM_ID,
  LASC_CIV_312_FORM_REVISION,
  LASC_CIV_312_SOURCE_SHA256,
  LASC_CIV_312_TERMINAL_FIELDS,
  LASC_CIV_312_TERMINAL_INPUT_COUNT,
} from './lascCiv312FieldMapFoundation';
import {
  LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
  LASC_CIV_312_GOVERNANCE_POSTURE,
  type LascCiv312GenerationBindingResult,
} from './lascCiv312GenerationBinding';
import {
  OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
  computeOfficialFormCompleteTerminalPlanSnapshot,
  evaluateOfficialFormGeneratedDraftAdmission,
  type OfficialFormGeneratedDraftMatterContextIdentity,
  type OfficialFormGeneratedDraftPlanDestination,
  type OfficialFormGeneratedDraftTargetIdentity,
  type OfficialFormPreparationRelevanceAuthorization,
} from './officialFormGeneratedDraftAdmission';

export const LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID = 'lasc-civ312-generated-draft-admission-v1' as const;
export const LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION = '2026-09-01.r1' as const;
export const LASC_CIV_312_EXPECTED_PAGE_COUNT = 1 as const;
export const LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT = 22 as const;

export const LASC_CIV_312_GENERATED_DRAFT_TARGET: OfficialFormGeneratedDraftTargetIdentity = Object.freeze({
  formId: LASC_CIV_312_FORM_ID,
  formRevision: LASC_CIV_312_FORM_REVISION,
  sourceSha256: LASC_CIV_312_SOURCE_SHA256,
  fieldMapId: LASC_CIV_312_FIELD_MAP_ID,
  fieldMapVersion: LASC_CIV_312_FIELD_MAP_VERSION,
  fieldMapSnapshot: LASC_CIV_312_FIELD_MAP_SNAPSHOT,
  generationBindingProfileId: LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
  generationBindingProfileVersion: LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
  generationBindingProfileSnapshot: LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
});

const CIV312_PROTECTED_FIELD_IDS: readonly string[] = LASC_CIV_312_TERMINAL_FIELDS
  .filter(field => field.classification === 'PROTECTED_NO_WRITE')
  .map(field => field.fieldId);

const CIV312_PROFILE_POLICY = LASC_CIV_312_TERMINAL_FIELDS.map(field => ({
  fieldId: field.fieldId,
  fieldType: field.fieldType,
  objectReference: field.objectReference,
  classification: field.classification,
  writableSource: 'writableSource' in field ? field.writableSource : null,
  noWriteReason: 'noWriteReason' in field ? field.noWriteReason : null,
}));

function canonicalStaticProfileSnapshotInput() {
  return {
    admissionProfileId: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID,
    admissionProfileVersion: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION,
    admissionSchemaVersion: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
    target: LASC_CIV_312_GENERATED_DRAFT_TARGET,
    expectedPageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
    expectedTerminalFieldCount: LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
    terminalPolicy: CIV312_PROFILE_POLICY,
    authorizationRequirements: {
      status: 'CURRENT',
      decision: 'FORM_RELEVANT_FOR_PREPARATION',
      exactTargetBinding: true,
      exactMatterContextBinding: true,
      authorizationSnapshotRequired: true,
    },
    instanceIdentityBinds: [
      'completeTerminalPlanSnapshot',
      'preparationAuthorizationSnapshot',
      'matterContextIdentity',
    ],
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  };
}

export function computeLascCiv312GeneratedDraftAdmissionProfileSnapshot(): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalStaticProfileSnapshotInput())).digest('hex')}`;
}

export const LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT = 'sha256:0b00717ee09b9ada93a327fdaf3f354f67f9acf95d91bad4052aa717fc7a2576' as const;

export type LascCiv312GeneratedDraftAdmissionBlockerCode =
  | 'ADMISSION_PROFILE_SNAPSHOT_MISMATCH'
  | 'D1_BINDING_BLOCKED'
  | 'D1_IDENTITY_MISMATCH'
  | 'D1_GOVERNANCE_MISMATCH'
  | 'D1_WRITE_PLAN_INVALID'
  | 'D1_PROTECTED_DESTINATIONS_INVALID'
  | 'D1_MATTER_CONTEXT_MISMATCH'
  | 'PDF_BYTES_NOT_ALLOWED'
  | 'D1_WRITE_VALUE_CHANGED'
  | 'GENERIC_ADMISSION_BLOCKED';

export type LascCiv312GeneratedDraftAdmissionResult =
  | {
      status: 'ADMISSION_READY';
      admissionProfileId: typeof LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID;
      admissionProfileVersion: typeof LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION;
      admissionProfileSnapshot: string;
      target: typeof LASC_CIV_312_GENERATED_DRAFT_TARGET;
      expectedPageCount: typeof LASC_CIV_312_EXPECTED_PAGE_COUNT;
      expectedTerminalFieldCount: typeof LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT;
      preparationAuthorizationSnapshot: string;
      matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity;
      completeTerminalPlan: readonly OfficialFormGeneratedDraftPlanDestination[];
      completeTerminalPlanSnapshot: string;
      admissionSnapshot: string;
      governance: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE;
    }
  | {
      status: 'BLOCKED';
      blockerCode: LascCiv312GeneratedDraftAdmissionBlockerCode;
      reason: string;
      completeTerminalPlan: readonly [];
      governance: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE;
    };

function block(
  blockerCode: LascCiv312GeneratedDraftAdmissionBlockerCode,
  reason: string,
): LascCiv312GeneratedDraftAdmissionResult {
  return {
    status: 'BLOCKED',
    blockerCode,
    reason,
    completeTerminalPlan: [],
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  };
}

function d1ReadyIdentityMatches(result: Extract<LascCiv312GenerationBindingResult, { status: 'GENERATION_BINDING_READY' }>): boolean {
  return result.formId === LASC_CIV_312_FORM_ID
    && result.formRevision === LASC_CIV_312_FORM_REVISION
    && result.sourceSha256 === LASC_CIV_312_SOURCE_SHA256
    && result.fieldMapId === LASC_CIV_312_FIELD_MAP_ID
    && result.fieldMapVersion === LASC_CIV_312_FIELD_MAP_VERSION
    && result.fieldMapSnapshot === LASC_CIV_312_FIELD_MAP_SNAPSHOT
    && result.generationBindingProfileId === LASC_CIV_312_GENERATION_BINDING_PROFILE_ID
    && result.generationBindingProfileVersion === LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION
    && result.generationBindingProfileSnapshot === LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT;
}

function sameD1Governance(result: Extract<LascCiv312GenerationBindingResult, { status: 'GENERATION_BINDING_READY' }>): boolean {
  return JSON.stringify(result.governance) === JSON.stringify(LASC_CIV_312_GOVERNANCE_POSTURE)
    && result.governance.documentGeneration === 'NOT_PERFORMED'
    && result.governance.pdfMutation === 'NOT_PERFORMED';
}

function protectedDestinationsMatch(result: Extract<LascCiv312GenerationBindingResult, { status: 'GENERATION_BINDING_READY' }>): boolean {
  if (result.protectedDestinations.length !== CIV312_PROTECTED_FIELD_IDS.length) return false;
  const seen = new Set<string>();
  for (const item of result.protectedDestinations) {
    if (seen.has(item.fieldId)) return false;
    seen.add(item.fieldId);
    if (!CIV312_PROTECTED_FIELD_IDS.includes(item.fieldId) || typeof item.reason !== 'string' || item.reason.trim().length === 0) return false;
  }
  return CIV312_PROTECTED_FIELD_IDS.every(fieldId => seen.has(fieldId));
}

function containsForbiddenBytes(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return true;
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => containsForbiddenBytes(item, seen));
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (/^(?:pdfBytes|documentBytes|generatedBytes|bytes|buffer|arrayBuffer)$/i.test(key)) return true;
    return containsForbiddenBytes(nested, seen);
  });
}

function d1MatterContextMatches(
  result: Extract<LascCiv312GenerationBindingResult, { status: 'GENERATION_BINDING_READY' }>,
  matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity,
): boolean {
  return result.fieldWritePlan.every(write => {
    const provenance = write.provenance as { createdNotice?: { generation?: unknown; createdAtISO?: unknown } };
    return provenance?.createdNotice?.generation === matterContextIdentity.generation
      && provenance?.createdNotice?.createdAtISO === matterContextIdentity.createdAtISO;
  });
}

function normalizeCompletePlan(
  result: Extract<LascCiv312GenerationBindingResult, { status: 'GENERATION_BINDING_READY' }>,
): readonly OfficialFormGeneratedDraftPlanDestination[] | null {
  if (result.fieldWritePlan.length === 0) return null;
  const writes = new Map<string, (typeof result.fieldWritePlan)[number]>();
  for (const write of result.fieldWritePlan) {
    if (writes.has(write.fieldId)) return null;
    const field = LASC_CIV_312_TERMINAL_FIELDS.find(item => item.fieldId === write.fieldId);
    if (!field || field.classification !== 'WRITABLE') return null;
    if (write.action !== 'WRITE_TEXT' || typeof write.value !== 'string' || !write.canonicalFactRef || write.provenance === undefined) return null;
    writes.set(write.fieldId, write);
  }
  const protectedReasons = new Map(result.protectedDestinations.map(item => [item.fieldId, item.reason]));
  return LASC_CIV_312_TERMINAL_FIELDS.map(field => {
    const write = writes.get(field.fieldId);
    if (write) {
      return {
        action: 'WRITE_TEXT' as const,
        fieldId: write.fieldId,
        value: write.value,
        canonicalFactRef: write.canonicalFactRef,
        provenance: write.provenance,
      };
    }
    const reason = field.classification === 'PROTECTED_NO_WRITE'
      ? protectedReasons.get(field.fieldId) ?? ('noWriteReason' in field ? field.noWriteReason : undefined) ?? 'PROTECTED_NO_WRITE'
      : 'UNUSED_INDEXED_WRITABLE_SLOT_PRESERVE_OFFICIAL_BLANK';
    return {
      action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE' as const,
      fieldId: field.fieldId,
      reason,
    };
  });
}

function computeCiv312AdmissionInstanceSnapshot(
  admissionProfileSnapshot: string,
  completeTerminalPlanSnapshot: string,
  authorizationSnapshot: string,
  matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity,
  genericAdmissionSnapshot: string,
): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    admissionProfileSnapshot,
    completeTerminalPlanSnapshot,
    authorizationSnapshot,
    matterContextIdentity,
    genericAdmissionSnapshot,
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  })).digest('hex')}`;
}

export function evaluateLascCiv312GeneratedDraftAdmission(
  d1Result: LascCiv312GenerationBindingResult,
  preparationAuthorization: OfficialFormPreparationRelevanceAuthorization,
  matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity,
): LascCiv312GeneratedDraftAdmissionResult {
  if (containsForbiddenBytes(d1Result) || containsForbiddenBytes(preparationAuthorization) || containsForbiddenBytes(matterContextIdentity)) {
    return block('PDF_BYTES_NOT_ALLOWED', 'PDF_OR_DOCUMENT_BYTES_ARE_NOT_ACCEPTED_BY_CIV312_ADMISSION');
  }
  if (computeLascCiv312GeneratedDraftAdmissionProfileSnapshot() !== LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT) {
    return block('ADMISSION_PROFILE_SNAPSHOT_MISMATCH', 'CIV312_ADMISSION_PROFILE_SNAPSHOT_DOES_NOT_MATCH_FROZEN_PROFILE');
  }
  if (d1Result.status !== 'GENERATION_BINDING_READY') {
    return block('D1_BINDING_BLOCKED', `D1_BINDING_BLOCKED:${d1Result.blockerCode}:${d1Result.reason}`);
  }
  if (!d1ReadyIdentityMatches(d1Result)) return block('D1_IDENTITY_MISMATCH', 'D1_RESULT_IDENTITY_DOES_NOT_MATCH_FROZEN_CIV312_PROFILE');
  if (!sameD1Governance(d1Result)) return block('D1_GOVERNANCE_MISMATCH', 'D1_RESULT_GOVERNANCE_WAS_CHANGED');
  if (!protectedDestinationsMatch(d1Result)) return block('D1_PROTECTED_DESTINATIONS_INVALID', 'D1_PROTECTED_DESTINATION_SET_INVALID');
  if (!d1MatterContextMatches(d1Result, matterContextIdentity)) return block('D1_MATTER_CONTEXT_MISMATCH', 'D1_WRITE_PROVENANCE_CREATED_NOTICE_CONTEXT_MISMATCH');
  const completeTerminalPlan = normalizeCompletePlan(d1Result);
  if (!completeTerminalPlan) return block('D1_WRITE_PLAN_INVALID', 'D1_WRITE_PLAN_CANNOT_BE_NORMALIZED_WITHOUT_CHANGING_AUTHORITY');
  if (completeTerminalPlan.length !== LASC_CIV_312_TERMINAL_INPUT_COUNT
    || completeTerminalPlan.length !== LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT) {
    return block('D1_WRITE_PLAN_INVALID', 'NORMALIZED_CIV312_PLAN_MUST_HAVE_EXACTLY_22_DESTINATIONS');
  }
  for (const write of d1Result.fieldWritePlan) {
    const normalized = completeTerminalPlan.find(item => item.fieldId === write.fieldId);
    if (!normalized || normalized.action !== 'WRITE_TEXT'
      || normalized.value !== write.value
      || normalized.canonicalFactRef !== write.canonicalFactRef
      || JSON.stringify(normalized.provenance) !== JSON.stringify(write.provenance)) {
      return block('D1_WRITE_VALUE_CHANGED', `D1_WRITE_WAS_NOT_PRESERVED:${write.fieldId}`);
    }
  }
  const generic = evaluateOfficialFormGeneratedDraftAdmission({
    schemaVersion: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
    target: LASC_CIV_312_GENERATED_DRAFT_TARGET,
    expectedPageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
    expectedTerminalFieldCount: LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
    expectedTerminalFieldIds: LASC_CIV_312_TERMINAL_FIELDS.map(field => field.fieldId),
    protectedTerminalFieldIds: CIV312_PROTECTED_FIELD_IDS,
    preparationAuthorization,
    matterContextIdentity,
    completeTerminalPlan,
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  });
  if (generic.status !== 'ADMISSION_READY') {
    return block('GENERIC_ADMISSION_BLOCKED', `${generic.blockerCode}:${generic.reason}`);
  }
  const completeTerminalPlanSnapshot = computeOfficialFormCompleteTerminalPlanSnapshot(completeTerminalPlan);
  return {
    status: 'ADMISSION_READY',
    admissionProfileId: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_ID,
    admissionProfileVersion: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_VERSION,
    admissionProfileSnapshot: LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT,
    target: LASC_CIV_312_GENERATED_DRAFT_TARGET,
    expectedPageCount: LASC_CIV_312_EXPECTED_PAGE_COUNT,
    expectedTerminalFieldCount: LASC_CIV_312_EXPECTED_TERMINAL_FIELD_COUNT,
    preparationAuthorizationSnapshot: generic.preparationAuthorizationSnapshot,
    matterContextIdentity,
    completeTerminalPlan,
    completeTerminalPlanSnapshot,
    admissionSnapshot: computeCiv312AdmissionInstanceSnapshot(
      LASC_CIV_312_GENERATED_DRAFT_ADMISSION_PROFILE_SNAPSHOT,
      completeTerminalPlanSnapshot,
      generic.preparationAuthorizationSnapshot,
      matterContextIdentity,
      generic.admissionSnapshot,
    ),
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  };
}
