import { createHash } from 'node:crypto';

export const OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION = '2026-09-01.r1' as const;

export const OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE = Object.freeze({
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

export interface OfficialFormGeneratedDraftMatterContextIdentity {
  generation: string;
  createdAtISO: string;
}

export interface OfficialFormGeneratedDraftTargetIdentity {
  formId: string;
  formRevision: string;
  sourceSha256: string;
  fieldMapId: string;
  fieldMapVersion: string;
  fieldMapSnapshot: string;
  generationBindingProfileId: string;
  generationBindingProfileVersion: string;
  generationBindingProfileSnapshot: string;
}

export interface OfficialFormPreparationRelevanceAuthorization {
  authorizationId: string;
  resultId: string;
  controlId: string;
  controlVersion: string;
  status: string;
  decision: string;
  target: OfficialFormGeneratedDraftTargetIdentity;
  matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity;
  authorizationSnapshot: string;
}

export type OfficialFormGeneratedDraftPlanDestination =
  | {
      action: 'WRITE_TEXT';
      fieldId: string;
      value: string;
      canonicalFactRef: string;
      provenance: unknown;
    }
  | {
      action: 'PRESERVE_OFFICIAL_BLANK_NO_WRITE';
      fieldId: string;
      reason: string;
    };

export interface OfficialFormGeneratedDraftAdmissionEnvelope {
  schemaVersion: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION;
  target: OfficialFormGeneratedDraftTargetIdentity;
  expectedPageCount: number;
  expectedTerminalFieldCount: number;
  expectedTerminalFieldIds: readonly string[];
  protectedTerminalFieldIds: readonly string[];
  preparationAuthorization: OfficialFormPreparationRelevanceAuthorization;
  matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity;
  completeTerminalPlan: readonly OfficialFormGeneratedDraftPlanDestination[];
  governance: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE;
}

export type OfficialFormGeneratedDraftAdmissionBlockerCode =
  | 'MALFORMED_ADMISSION_ENVELOPE'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'SOURCE_IDENTITY_INVALID'
  | 'EXPECTED_PAGE_COUNT_INVALID'
  | 'EXPECTED_TERMINAL_COUNT_INVALID'
  | 'PREPARATION_AUTHORIZATION_MISSING_OR_INVALID'
  | 'PREPARATION_AUTHORIZATION_NOT_CURRENT'
  | 'PREPARATION_AUTHORIZATION_NOT_RELEVANT'
  | 'PREPARATION_AUTHORIZATION_TARGET_MISMATCH'
  | 'PREPARATION_AUTHORIZATION_CONTEXT_MISMATCH'
  | 'PREPARATION_AUTHORIZATION_SNAPSHOT_MISMATCH'
  | 'MATTER_CONTEXT_INVALID'
  | 'TERMINAL_PLAN_INCOMPLETE'
  | 'DUPLICATE_TERMINAL_DESTINATION'
  | 'UNEXPECTED_TERMINAL_DESTINATION'
  | 'PROTECTED_DESTINATION_WRITE'
  | 'MALFORMED_WRITE_DESTINATION'
  | 'MALFORMED_NO_WRITE_DESTINATION'
  | 'PDF_BYTES_NOT_ALLOWED'
  | 'GOVERNANCE_POSTURE_MISMATCH';

export type OfficialFormGeneratedDraftAdmissionResult =
  | {
      status: 'ADMISSION_READY';
      schemaVersion: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION;
      target: OfficialFormGeneratedDraftTargetIdentity;
      expectedPageCount: number;
      expectedTerminalFieldCount: number;
      preparationAuthorizationSnapshot: string;
      matterContextIdentity: OfficialFormGeneratedDraftMatterContextIdentity;
      completeTerminalPlan: readonly OfficialFormGeneratedDraftPlanDestination[];
      completeTerminalPlanSnapshot: string;
      admissionSnapshot: string;
      governance: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE;
    }
  | {
      status: 'BLOCKED';
      blockerCode: OfficialFormGeneratedDraftAdmissionBlockerCode;
      reason: string;
      completeTerminalPlan: readonly [];
      governance: typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE;
    };

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^(?:sha256:)?[0-9a-f]{64}$/.test(value);
}

function isContextIdentity(value: unknown): value is OfficialFormGeneratedDraftMatterContextIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isNonBlankString(candidate.generation)
    && isNonBlankString(candidate.createdAtISO)
    && Number.isFinite(Date.parse(candidate.createdAtISO));
}

function sameContext(
  a: OfficialFormGeneratedDraftMatterContextIdentity,
  b: OfficialFormGeneratedDraftMatterContextIdentity,
): boolean {
  return a.generation === b.generation && a.createdAtISO === b.createdAtISO;
}

function isTargetIdentity(value: unknown): value is OfficialFormGeneratedDraftTargetIdentity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isNonBlankString(candidate.formId)
    && isNonBlankString(candidate.formRevision)
    && isSha256(candidate.sourceSha256)
    && isNonBlankString(candidate.fieldMapId)
    && isNonBlankString(candidate.fieldMapVersion)
    && isSha256(candidate.fieldMapSnapshot)
    && isNonBlankString(candidate.generationBindingProfileId)
    && isNonBlankString(candidate.generationBindingProfileVersion)
    && isSha256(candidate.generationBindingProfileSnapshot);
}

export function sameGeneratedDraftTargetIdentity(
  a: OfficialFormGeneratedDraftTargetIdentity,
  b: OfficialFormGeneratedDraftTargetIdentity,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function canonicalPreparationAuthorizationSnapshotInput(
  authorization: Omit<OfficialFormPreparationRelevanceAuthorization, 'authorizationSnapshot'>,
) {
  return {
    authorizationId: authorization.authorizationId,
    resultId: authorization.resultId,
    controlId: authorization.controlId,
    controlVersion: authorization.controlVersion,
    status: authorization.status,
    decision: authorization.decision,
    target: authorization.target,
    matterContextIdentity: authorization.matterContextIdentity,
  };
}

export function computeOfficialFormPreparationAuthorizationSnapshot(
  authorization: Omit<OfficialFormPreparationRelevanceAuthorization, 'authorizationSnapshot'>,
): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalPreparationAuthorizationSnapshotInput(authorization)))
    .digest('hex')}`;
}

function isPreparationAuthorization(value: unknown): value is OfficialFormPreparationRelevanceAuthorization {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isNonBlankString(candidate.authorizationId)
    && isNonBlankString(candidate.resultId)
    && isNonBlankString(candidate.controlId)
    && isNonBlankString(candidate.controlVersion)
    && isNonBlankString(candidate.status)
    && isNonBlankString(candidate.decision)
    && isTargetIdentity(candidate.target)
    && isContextIdentity(candidate.matterContextIdentity)
    && isSha256(candidate.authorizationSnapshot);
}

function governanceMatches(value: unknown): value is typeof OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && JSON.stringify(value) === JSON.stringify(OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE);
}

function hasForbiddenBytes(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return true;
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some(item => hasForbiddenBytes(item, seen));
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (/^(?:pdfBytes|documentBytes|generatedBytes|bytes|buffer|arrayBuffer)$/i.test(key)) return true;
    return hasForbiddenBytes(nested, seen);
  });
}

export function computeOfficialFormCompleteTerminalPlanSnapshot(
  plan: readonly OfficialFormGeneratedDraftPlanDestination[],
): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(plan)).digest('hex')}`;
}

function canonicalAdmissionSnapshotInput(
  envelope: OfficialFormGeneratedDraftAdmissionEnvelope,
  completeTerminalPlanSnapshot: string,
) {
  return {
    schemaVersion: envelope.schemaVersion,
    target: envelope.target,
    expectedPageCount: envelope.expectedPageCount,
    expectedTerminalFieldCount: envelope.expectedTerminalFieldCount,
    expectedTerminalFieldIds: envelope.expectedTerminalFieldIds,
    protectedTerminalFieldIds: envelope.protectedTerminalFieldIds,
    preparationAuthorizationSnapshot: envelope.preparationAuthorization.authorizationSnapshot,
    matterContextIdentity: envelope.matterContextIdentity,
    completeTerminalPlanSnapshot,
    governance: envelope.governance,
  };
}

export function computeOfficialFormGeneratedDraftAdmissionSnapshot(
  envelope: OfficialFormGeneratedDraftAdmissionEnvelope,
  completeTerminalPlanSnapshot = computeOfficialFormCompleteTerminalPlanSnapshot(envelope.completeTerminalPlan),
): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalAdmissionSnapshotInput(envelope, completeTerminalPlanSnapshot)))
    .digest('hex')}`;
}

function block(
  blockerCode: OfficialFormGeneratedDraftAdmissionBlockerCode,
  reason: string,
): OfficialFormGeneratedDraftAdmissionResult {
  return {
    status: 'BLOCKED',
    blockerCode,
    reason,
    completeTerminalPlan: [],
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  };
}

export function evaluateOfficialFormGeneratedDraftAdmission(
  rawEnvelope: unknown,
): OfficialFormGeneratedDraftAdmissionResult {
  if (hasForbiddenBytes(rawEnvelope)) return block('PDF_BYTES_NOT_ALLOWED', 'PDF_OR_DOCUMENT_BYTES_ARE_NOT_ACCEPTED');
  if (!rawEnvelope || typeof rawEnvelope !== 'object' || Array.isArray(rawEnvelope)) {
    return block('MALFORMED_ADMISSION_ENVELOPE', 'ADMISSION_ENVELOPE_MUST_BE_AN_OBJECT');
  }
  const envelope = rawEnvelope as OfficialFormGeneratedDraftAdmissionEnvelope;
  if (envelope.schemaVersion !== OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION) {
    return block('SCHEMA_VERSION_MISMATCH', 'ADMISSION_SCHEMA_VERSION_MISMATCH');
  }
  if (!isTargetIdentity(envelope.target)) return block('SOURCE_IDENTITY_INVALID', 'TARGET_SOURCE_IDENTITY_INVALID');
  if (!Number.isInteger(envelope.expectedPageCount) || envelope.expectedPageCount <= 0) {
    return block('EXPECTED_PAGE_COUNT_INVALID', 'EXPECTED_PAGE_COUNT_MUST_BE_A_POSITIVE_INTEGER');
  }
  if (!Number.isInteger(envelope.expectedTerminalFieldCount) || envelope.expectedTerminalFieldCount <= 0) {
    return block('EXPECTED_TERMINAL_COUNT_INVALID', 'EXPECTED_TERMINAL_FIELD_COUNT_MUST_BE_A_POSITIVE_INTEGER');
  }
  if (!Array.isArray(envelope.expectedTerminalFieldIds)
    || envelope.expectedTerminalFieldIds.length !== envelope.expectedTerminalFieldCount
    || !envelope.expectedTerminalFieldIds.every(isNonBlankString)) {
    return block('EXPECTED_TERMINAL_COUNT_INVALID', 'EXPECTED_TERMINAL_FIELD_IDENTITIES_DO_NOT_MATCH_EXPECTED_COUNT');
  }
  if (new Set(envelope.expectedTerminalFieldIds).size !== envelope.expectedTerminalFieldIds.length) {
    return block('DUPLICATE_TERMINAL_DESTINATION', 'EXPECTED_TERMINAL_FIELD_IDENTITIES_CONTAIN_DUPLICATES');
  }
  if (!Array.isArray(envelope.protectedTerminalFieldIds)
    || !envelope.protectedTerminalFieldIds.every(isNonBlankString)
    || envelope.protectedTerminalFieldIds.some(fieldId => !envelope.expectedTerminalFieldIds.includes(fieldId))) {
    return block('MALFORMED_ADMISSION_ENVELOPE', 'PROTECTED_TERMINAL_FIELD_IDENTITIES_INVALID');
  }
  if (!isContextIdentity(envelope.matterContextIdentity)) return block('MATTER_CONTEXT_INVALID', 'MATTER_CONTEXT_IDENTITY_INVALID');
  if (!isPreparationAuthorization(envelope.preparationAuthorization)) {
    return block('PREPARATION_AUTHORIZATION_MISSING_OR_INVALID', 'PREPARATION_AUTHORIZATION_INVALID');
  }
  if (envelope.preparationAuthorization.status !== 'CURRENT') {
    return block('PREPARATION_AUTHORIZATION_NOT_CURRENT', 'PREPARATION_AUTHORIZATION_MUST_BE_CURRENT');
  }
  if (envelope.preparationAuthorization.decision !== 'FORM_RELEVANT_FOR_PREPARATION') {
    return block('PREPARATION_AUTHORIZATION_NOT_RELEVANT', 'PREPARATION_AUTHORIZATION_DOES_NOT_AUTHORIZE_PREPARATION_RELEVANCE');
  }
  if (!sameGeneratedDraftTargetIdentity(envelope.preparationAuthorization.target, envelope.target)) {
    return block('PREPARATION_AUTHORIZATION_TARGET_MISMATCH', 'PREPARATION_AUTHORIZATION_TARGET_DOES_NOT_MATCH_ADMISSION_TARGET');
  }
  if (!sameContext(envelope.preparationAuthorization.matterContextIdentity, envelope.matterContextIdentity)) {
    return block('PREPARATION_AUTHORIZATION_CONTEXT_MISMATCH', 'PREPARATION_AUTHORIZATION_CONTEXT_DOES_NOT_MATCH_CURRENT_CONTEXT');
  }
  const expectedAuthorizationSnapshot = computeOfficialFormPreparationAuthorizationSnapshot({
    authorizationId: envelope.preparationAuthorization.authorizationId,
    resultId: envelope.preparationAuthorization.resultId,
    controlId: envelope.preparationAuthorization.controlId,
    controlVersion: envelope.preparationAuthorization.controlVersion,
    status: envelope.preparationAuthorization.status,
    decision: envelope.preparationAuthorization.decision,
    target: envelope.preparationAuthorization.target,
    matterContextIdentity: envelope.preparationAuthorization.matterContextIdentity,
  });
  if (envelope.preparationAuthorization.authorizationSnapshot !== expectedAuthorizationSnapshot) {
    return block('PREPARATION_AUTHORIZATION_SNAPSHOT_MISMATCH', 'PREPARATION_AUTHORIZATION_SNAPSHOT_INVALID');
  }
  if (!governanceMatches(envelope.governance)) return block('GOVERNANCE_POSTURE_MISMATCH', 'ADMISSION_GOVERNANCE_MUST_REMAIN_NON_EXECUTING');
  if (!Array.isArray(envelope.completeTerminalPlan)
    || envelope.completeTerminalPlan.length !== envelope.expectedTerminalFieldCount) {
    return block('TERMINAL_PLAN_INCOMPLETE', 'COMPLETE_TERMINAL_PLAN_COUNT_MISMATCH');
  }
  const terminalIds = envelope.completeTerminalPlan.map(item => item?.fieldId);
  if (terminalIds.some(fieldId => !isNonBlankString(fieldId))) {
    return block('MALFORMED_ADMISSION_ENVELOPE', 'TERMINAL_PLAN_FIELD_ID_INVALID');
  }
  if (new Set(terminalIds).size !== terminalIds.length) {
    return block('DUPLICATE_TERMINAL_DESTINATION', 'TERMINAL_PLAN_CONTAINS_DUPLICATE_DESTINATION');
  }
  if (terminalIds.some(fieldId => !envelope.expectedTerminalFieldIds.includes(fieldId as string))) {
    return block('UNEXPECTED_TERMINAL_DESTINATION', 'TERMINAL_PLAN_CONTAINS_UNEXPECTED_DESTINATION');
  }
  if (envelope.expectedTerminalFieldIds.some(fieldId => !terminalIds.includes(fieldId))) {
    return block('TERMINAL_PLAN_INCOMPLETE', 'TERMINAL_PLAN_OMITS_EXPECTED_DESTINATION');
  }
  for (const item of envelope.completeTerminalPlan) {
    if (item.action === 'WRITE_TEXT') {
      if (envelope.protectedTerminalFieldIds.includes(item.fieldId)) {
        return block('PROTECTED_DESTINATION_WRITE', `PROTECTED_DESTINATION_WRITE:${item.fieldId}`);
      }
      if (!isNonBlankString(item.fieldId)
        || typeof item.value !== 'string'
        || !isNonBlankString(item.canonicalFactRef)
        || item.provenance === undefined) {
        return block('MALFORMED_WRITE_DESTINATION', `MALFORMED_WRITE_DESTINATION:${item.fieldId}`);
      }
      continue;
    }
    if (item.action === 'PRESERVE_OFFICIAL_BLANK_NO_WRITE') {
      if (!isNonBlankString(item.fieldId) || !isNonBlankString(item.reason)) {
        return block('MALFORMED_NO_WRITE_DESTINATION', `MALFORMED_NO_WRITE_DESTINATION:${item.fieldId}`);
      }
      continue;
    }
    return block('MALFORMED_ADMISSION_ENVELOPE', 'UNKNOWN_TERMINAL_PLAN_ACTION');
  }
  const completeTerminalPlanSnapshot = computeOfficialFormCompleteTerminalPlanSnapshot(envelope.completeTerminalPlan);
  return {
    status: 'ADMISSION_READY',
    schemaVersion: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_SCHEMA_VERSION,
    target: envelope.target,
    expectedPageCount: envelope.expectedPageCount,
    expectedTerminalFieldCount: envelope.expectedTerminalFieldCount,
    preparationAuthorizationSnapshot: envelope.preparationAuthorization.authorizationSnapshot,
    matterContextIdentity: envelope.matterContextIdentity,
    completeTerminalPlan: envelope.completeTerminalPlan,
    completeTerminalPlanSnapshot,
    admissionSnapshot: computeOfficialFormGeneratedDraftAdmissionSnapshot(envelope, completeTerminalPlanSnapshot),
    governance: OFFICIAL_FORM_GENERATED_DRAFT_ADMISSION_GOVERNANCE,
  };
}
