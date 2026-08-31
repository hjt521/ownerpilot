import { createHash } from 'node:crypto';
import type {
  CanonicalFilingFactRef,
  FilingCanonicalFactsProjection,
  FilingFactState,
} from './filingCanonicalFacts';
import {
  canonicalizeGenerationIdentity,
  type OfficialFormGenerationBindingEvaluation,
} from './officialFormGenerationBinding';
import type { OfficialSourceIdentity } from './officialFormFieldMap';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
} from './ud100GenerationBinding';

export const FILING_CHOICE_SUMMARY_SCHEMA_VERSION = 1 as const;
export const FILING_CHOICE_AUTHORIZATION_STATEMENT_ID = 'owner-filing-choice-preparation-authorization' as const;
export const FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION = '1.0.0' as const;

export const FILING_CHOICE_AUTHORIZATION_EFFECTS = Object.freeze({
  generatedArtifact: 'NO' as const,
  item14PdfGeneration: 'NO' as const,
  authenticatedGeneration: 'NO' as const,
  checkpoint1: 'HELD' as const,
  checkpoint1Effect: 'NO' as const,
  preparationCheckpointWrite: 'NO' as const,
  ownerReviewCheckpointWrite: 'NO' as const,
  databaseWrite: 'NO' as const,
  persistence: 'NOT_PERFORMED' as const,
  finalPersistence: 'HELD' as const,
  realCustomerPersistence: 'HELD' as const,
  ownerReview: 'NOT_PERFORMED' as const,
  signing: 'NO' as const,
  filing: 'NO' as const,
  serviceExecution: 'NO' as const,
  courtSubmission: 'NO' as const,
  courtAcceptance: 'NOT_EVALUATED' as const,
  legalSufficiency: 'NOT_EVALUATED' as const,
  stageF: 'HELD' as const,
  newProductionAuthority: 'NO' as const,
  autonomousExecution: 'NOT_AUTHORIZED' as const,
});

export interface FilingChoiceSummaryFactEntry {
  ref: CanonicalFilingFactRef;
  fact: Readonly<FilingFactState<unknown>>;
}

export interface FilingChoiceSummaryIdentity {
  schemaVersion: typeof FILING_CHOICE_SUMMARY_SCHEMA_VERSION;
  createdNoticeIdentity: Readonly<{
    generation: string;
    createdAtISO: string;
  }>;
  officialSourceArtifactId: string;
  officialSourceSnapshotId: string;
  officialSourceIdentity: Readonly<OfficialSourceIdentity>;
  mapSnapshotId: string;
  referencedFactSnapshotId: string;
  generationInputId: string;
  generatorContractVersion: string;
  fieldWritePlanDigest: string;
  ownerChoices: readonly FilingChoiceSummaryFactEntry[];
  governedControls: readonly FilingChoiceSummaryFactEntry[];
  packetFacts: readonly FilingChoiceSummaryFactEntry[];
  contextFacts: readonly FilingChoiceSummaryFactEntry[];
}

export interface FilingChoiceSummary extends FilingChoiceSummaryIdentity {
  filingChoiceSummaryId: string;
}

export interface FilingChoiceAuthorizationInput {
  confirmationId: string;
  confirmedAtISO: string;
  filingChoiceSummaryId: string;
}

export interface FilingChoiceAuthorizationIdentity {
  filingChoiceSummaryId: string;
  confirmationId: string;
  confirmedAtISO: string;
  statementId: typeof FILING_CHOICE_AUTHORIZATION_STATEMENT_ID;
  statementVersion: typeof FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION;
}

export type FilingChoiceSummaryBlockReason =
  | 'CANONICAL_FACTS_NOT_READY'
  | 'INVALID_CREATED_NOTICE_IDENTITY'
  | 'LIVE_D1_BINDING_NOT_READY'
  | 'WRONG_LIVE_D1_FAMILY'
  | 'FACTS_BINDING_IDENTITY_MISMATCH'
  | 'CREATED_NOTICE_PROVENANCE_MISMATCH'
  | 'INVALID_CANONICAL_SUMMARY';

export type FilingChoiceSummaryResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingChoiceSummaryBlockReason;
      detail: string;
      summary: null;
      effects: typeof FILING_CHOICE_AUTHORIZATION_EFFECTS;
    }
  | {
      status: 'FILING_CHOICE_SUMMARY_READY';
      summary: Readonly<FilingChoiceSummary>;
      effects: typeof FILING_CHOICE_AUTHORIZATION_EFFECTS;
    };

export type FilingChoiceAuthorizationBlockReason =
  | 'CURRENT_SUMMARY_UNAVAILABLE'
  | 'INVALID_SUMMARY_SHAPE'
  | 'SUMMARY_IDENTITY_MISMATCH'
  | 'SUMMARY_NOT_CURRENT'
  | 'INVALID_AUTHORIZATION_SHAPE'
  | 'BLANK_CONFIRMATION_ID'
  | 'MALFORMED_CONFIRMATION_TIMESTAMP'
  | 'CONFIRMATION_PRECEDES_CREATED_NOTICE'
  | 'WRONG_FILING_CHOICE_SUMMARY_ID';

export type FilingChoiceAuthorizationResult =
  | {
      status: 'BLOCKED';
      blockReason: FilingChoiceAuthorizationBlockReason;
      detail: string;
      authorizationId: null;
      effects: typeof FILING_CHOICE_AUTHORIZATION_EFFECTS;
    }
  | {
      status: 'OWNER_CHOICES_AUTHORIZED_FOR_PREPARATION';
      authorizationId: string;
      filingChoiceSummaryId: string;
      confirmationId: string;
      confirmedAtISO: string;
      statementId: typeof FILING_CHOICE_AUTHORIZATION_STATEMENT_ID;
      statementVersion: typeof FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION;
      effects: typeof FILING_CHOICE_AUTHORIZATION_EFFECTS;
    };

const READY_BINDING_KEYS = [
  'status',
  'mapSnapshotId',
  'referencedFactSnapshotId',
  'generationInputId',
  'generatorContractVersion',
  'formApplicability',
  'formRequiredness',
  'documentGeneration',
  'pdfMutation',
  'fieldWritePlan',
] as const;

const SUMMARY_KEYS = [
  'schemaVersion',
  'createdNoticeIdentity',
  'officialSourceArtifactId',
  'officialSourceSnapshotId',
  'officialSourceIdentity',
  'mapSnapshotId',
  'referencedFactSnapshotId',
  'generationInputId',
  'generatorContractVersion',
  'fieldWritePlanDigest',
  'ownerChoices',
  'governedControls',
  'packetFacts',
  'contextFacts',
  'filingChoiceSummaryId',
] as const;

const AUTHORIZATION_KEYS = [
  'confirmationId',
  'confirmedAtISO',
  'filingChoiceSummaryId',
] as const;

const CREATED_NOTICE_KEYS = ['generation', 'createdAtISO'] as const;
const OFFICIAL_SOURCE_KEYS = [
  'registryVersion',
  'artifactId',
  'authorityKey',
  'formId',
  'revisionEffective',
  'sourceSnapshotId',
  'repositoryPath',
  'repositorySha256',
  'artifactClass',
  'repositoryStatus',
] as const;

function plainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function validExactTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function digest(prefix: string, value: unknown): string {
  return `${prefix}:sha256:${createHash('sha256').update(canonicalizeGenerationIdentity(value)).digest('hex')}`;
}

function safeDigest(prefix: string, value: unknown): string | null {
  try {
    return digest(prefix, value);
  } catch {
    return null;
  }
}

function computeFieldWritePlanDigest(plan: unknown): string {
  return digest('write-plan', plan);
}

export function computeFilingChoiceSummaryId(identity: FilingChoiceSummaryIdentity): string {
  return digest('filing-choice-summary', identity);
}

export function computeFilingChoiceAuthorizationId(identity: FilingChoiceAuthorizationIdentity): string {
  return digest('filing-choice-authorization', identity);
}

function summaryBlocked(
  blockReason: FilingChoiceSummaryBlockReason,
  detail: string,
): FilingChoiceSummaryResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    summary: null,
    effects: FILING_CHOICE_AUTHORIZATION_EFFECTS,
  };
}

function authorizationBlocked(
  blockReason: FilingChoiceAuthorizationBlockReason,
  detail: string,
): FilingChoiceAuthorizationResult {
  return {
    status: 'BLOCKED',
    blockReason,
    detail,
    authorizationId: null,
    effects: FILING_CHOICE_AUTHORIZATION_EFFECTS,
  };
}

function readyBinding(
  value: unknown,
): value is Extract<OfficialFormGenerationBindingEvaluation, { status: 'GENERATION_BINDING_READY' }> {
  if (!isExactObject(value, READY_BINDING_KEYS)) return false;
  return value.status === 'GENERATION_BINDING_READY'
    && typeof value.mapSnapshotId === 'string'
    && typeof value.referencedFactSnapshotId === 'string'
    && typeof value.generationInputId === 'string'
    && typeof value.generatorContractVersion === 'string'
    && value.formApplicability === 'NOT_EVALUATED'
    && value.formRequiredness === 'NOT_EVALUATED'
    && value.documentGeneration === 'NOT_PERFORMED'
    && value.pdfMutation === 'NOT_PERFORMED'
    && Array.isArray(value.fieldWritePlan);
}

function collectLiveD1ReferencedRefs(
  facts: Extract<FilingCanonicalFactsProjection, { status: 'READY' }>,
): readonly CanonicalFilingFactRef[] {
  const refs = new Set<CanonicalFilingFactRef>();
  for (const requirement of UD100_GENERATION_BINDING.profileRequirements) {
    refs.add(requirement.dependency.ref);
  }
  for (const rule of UD100_GENERATION_BINDING.fieldRules) {
    if (rule.disposition === 'WRITE') {
      for (const dependency of rule.dependencies) refs.add(dependency.ref);
      if (rule.condition) refs.add(rule.condition.dependency.ref);
    } else if (rule.disposition === 'GOVERNED_PRESERVE_OFFICIAL_BLANK_NO_WRITE') {
      refs.add(rule.dependency.ref);
    }
  }

  const queue = [...refs];
  while (queue.length > 0) {
    const ref = queue.shift()!;
    const fact = facts.facts[ref] as FilingFactState<unknown> | undefined;
    if (!fact) continue;
    for (const dependency of fact.provenance.dependencies) {
      if (!refs.has(dependency)) {
        refs.add(dependency);
        queue.push(dependency);
      }
    }
  }
  return [...refs].sort();
}

function sameCreatedNotice(
  a: { generation: string; createdAtISO: string },
  b: { generation: string; createdAtISO: string },
): boolean {
  return a.generation === b.generation && a.createdAtISO === b.createdAtISO;
}

function exactCanonicalEqual(a: unknown, b: unknown): boolean {
  try {
    return canonicalizeGenerationIdentity(a) === canonicalizeGenerationIdentity(b);
  } catch {
    return false;
  }
}

function exactOfficialSourceIdentity(value: unknown): value is OfficialSourceIdentity {
  if (!isExactObject(value, OFFICIAL_SOURCE_KEYS)) return false;
  return Number.isInteger(value.registryVersion)
    && typeof value.artifactId === 'string'
    && typeof value.authorityKey === 'string'
    && typeof value.formId === 'string'
    && typeof value.revisionEffective === 'string'
    && typeof value.sourceSnapshotId === 'string'
    && typeof value.repositoryPath === 'string'
    && typeof value.repositorySha256 === 'string'
    && typeof value.artifactClass === 'string'
    && typeof value.repositoryStatus === 'string';
}

export function createFilingChoiceSummary(
  facts: FilingCanonicalFactsProjection,
  suppliedBinding: unknown,
): FilingChoiceSummaryResult {
  if (facts.status !== 'READY') {
    return summaryBlocked('CANONICAL_FACTS_NOT_READY', `Canonical filing facts are ${facts.status}.`);
  }
  if (!isExactObject(facts.createdNoticeIdentity, CREATED_NOTICE_KEYS)
    || typeof facts.createdNoticeIdentity.generation !== 'string'
    || facts.createdNoticeIdentity.generation.trim() === ''
    || !validExactTimestamp(facts.createdNoticeIdentity.createdAtISO)) {
    return summaryBlocked('INVALID_CREATED_NOTICE_IDENTITY', 'Created Notice identity must be exact and timestamp-valid.');
  }
  if (!readyBinding(suppliedBinding)) {
    return summaryBlocked('LIVE_D1_BINDING_NOT_READY', 'Supplied live D.1 binding must be exact-shaped and GENERATION_BINDING_READY.');
  }
  if (suppliedBinding.mapSnapshotId !== UD100_GENERATION_BINDING.mapSnapshotId
    || suppliedBinding.generatorContractVersion !== UD100_GENERATION_BINDING.generatorContractVersion) {
    return summaryBlocked('WRONG_LIVE_D1_FAMILY', 'Only the current live R2-D D.1 map and generator-contract family is admissible.');
  }

  const recomputed = evaluateUd100GenerationBinding(
    UD100_GENERATION_BINDING.sourceIdentity,
    'CURRENT',
    facts,
  );
  if (recomputed.status !== 'GENERATION_BINDING_READY') {
    return summaryBlocked('LIVE_D1_BINDING_NOT_READY', `Current live D.1 binding recomputation blocked: ${recomputed.blockReason}.`);
  }
  if (!exactCanonicalEqual(recomputed, suppliedBinding)) {
    return summaryBlocked('FACTS_BINDING_IDENTITY_MISMATCH', 'Supplied live D.1 evaluation does not exactly match current canonical facts.');
  }

  const ownerChoices: FilingChoiceSummaryFactEntry[] = [];
  const governedControls: FilingChoiceSummaryFactEntry[] = [];
  const packetFacts: FilingChoiceSummaryFactEntry[] = [];
  const contextFacts: FilingChoiceSummaryFactEntry[] = [];

  for (const ref of collectLiveD1ReferencedRefs(facts)) {
    const fact = facts.facts[ref] as FilingFactState<unknown> | undefined;
    if (!fact) {
      return summaryBlocked('INVALID_CANONICAL_SUMMARY', `Current live D.1 referenced fact ${ref} is missing.`);
    }
    if (!sameCreatedNotice(fact.provenance.createdNotice, facts.createdNoticeIdentity)) {
      return summaryBlocked('CREATED_NOTICE_PROVENANCE_MISMATCH', `${ref} is not bound to the exact current Created Notice identity.`);
    }
    const entry: FilingChoiceSummaryFactEntry = { ref, fact };
    if (String(ref).startsWith('ud100.packet.')) {
      packetFacts.push(entry);
    } else if (fact.provenance.provenanceClass === 'GOVERNED_CONTROL_RESULT') {
      governedControls.push(entry);
    } else if (
      fact.provenance.provenanceClass === 'FROZEN_CUSTOMER_CONFIRMED'
      || fact.provenance.provenanceClass === 'SUPPLEMENTAL_CUSTOMER_INPUT'
      || fact.provenance.provenanceClass === 'CUSTOMER_CONFIRMED_LEGAL_ELECTION'
    ) {
      ownerChoices.push(entry);
    } else {
      contextFacts.push(entry);
    }
  }

  const identity: FilingChoiceSummaryIdentity = {
    schemaVersion: FILING_CHOICE_SUMMARY_SCHEMA_VERSION,
    createdNoticeIdentity: facts.createdNoticeIdentity,
    officialSourceArtifactId: UD100_GENERATION_BINDING.sourceIdentity.artifactId,
    officialSourceSnapshotId: UD100_GENERATION_BINDING.sourceIdentity.sourceSnapshotId,
    officialSourceIdentity: UD100_GENERATION_BINDING.sourceIdentity,
    mapSnapshotId: suppliedBinding.mapSnapshotId,
    referencedFactSnapshotId: suppliedBinding.referencedFactSnapshotId,
    generationInputId: suppliedBinding.generationInputId,
    generatorContractVersion: suppliedBinding.generatorContractVersion,
    fieldWritePlanDigest: computeFieldWritePlanDigest(suppliedBinding.fieldWritePlan),
    ownerChoices,
    governedControls,
    packetFacts,
    contextFacts,
  };
  const summary: FilingChoiceSummary = {
    ...identity,
    filingChoiceSummaryId: computeFilingChoiceSummaryId(identity),
  };
  return {
    status: 'FILING_CHOICE_SUMMARY_READY',
    summary: Object.freeze(summary),
    effects: FILING_CHOICE_AUTHORIZATION_EFFECTS,
  };
}

function summaryIdentityFromUnknown(value: unknown): FilingChoiceSummaryIdentity | null {
  if (!isExactObject(value, SUMMARY_KEYS)
    || value.schemaVersion !== FILING_CHOICE_SUMMARY_SCHEMA_VERSION
    || typeof value.filingChoiceSummaryId !== 'string'
    || typeof value.officialSourceArtifactId !== 'string'
    || typeof value.officialSourceSnapshotId !== 'string'
    || typeof value.mapSnapshotId !== 'string'
    || typeof value.referencedFactSnapshotId !== 'string'
    || typeof value.generationInputId !== 'string'
    || typeof value.generatorContractVersion !== 'string'
    || typeof value.fieldWritePlanDigest !== 'string'
    || !isExactObject(value.createdNoticeIdentity, CREATED_NOTICE_KEYS)
    || typeof value.createdNoticeIdentity.generation !== 'string'
    || !validExactTimestamp(value.createdNoticeIdentity.createdAtISO)
    || !exactOfficialSourceIdentity(value.officialSourceIdentity)
    || !Array.isArray(value.ownerChoices)
    || !Array.isArray(value.governedControls)
    || !Array.isArray(value.packetFacts)
    || !Array.isArray(value.contextFacts)) {
    return null;
  }
  return {
    schemaVersion: FILING_CHOICE_SUMMARY_SCHEMA_VERSION,
    createdNoticeIdentity: {
      generation: value.createdNoticeIdentity.generation,
      createdAtISO: value.createdNoticeIdentity.createdAtISO,
    },
    officialSourceArtifactId: value.officialSourceArtifactId,
    officialSourceSnapshotId: value.officialSourceSnapshotId,
    officialSourceIdentity: value.officialSourceIdentity,
    mapSnapshotId: value.mapSnapshotId,
    referencedFactSnapshotId: value.referencedFactSnapshotId,
    generationInputId: value.generationInputId,
    generatorContractVersion: value.generatorContractVersion,
    fieldWritePlanDigest: value.fieldWritePlanDigest,
    ownerChoices: value.ownerChoices as readonly FilingChoiceSummaryFactEntry[],
    governedControls: value.governedControls as readonly FilingChoiceSummaryFactEntry[],
    packetFacts: value.packetFacts as readonly FilingChoiceSummaryFactEntry[],
    contextFacts: value.contextFacts as readonly FilingChoiceSummaryFactEntry[],
  };
}

export function authorizeFilingChoicesForPreparation(
  facts: FilingCanonicalFactsProjection,
  suppliedBinding: unknown,
  suppliedSummary: unknown,
  authorizationInput: unknown,
): FilingChoiceAuthorizationResult {
  const current = createFilingChoiceSummary(facts, suppliedBinding);
  if (current.status === 'BLOCKED') {
    return authorizationBlocked('CURRENT_SUMMARY_UNAVAILABLE', `${current.blockReason}: ${current.detail}`);
  }

  const suppliedIdentity = summaryIdentityFromUnknown(suppliedSummary);
  if (!suppliedIdentity || !plainObject(suppliedSummary) || typeof suppliedSummary.filingChoiceSummaryId !== 'string') {
    return authorizationBlocked('INVALID_SUMMARY_SHAPE', 'Filing-choice summary must have the exact canonical summary shape.');
  }
  const recomputedSuppliedId = safeDigest('filing-choice-summary', suppliedIdentity);
  if (!recomputedSuppliedId || suppliedSummary.filingChoiceSummaryId !== recomputedSuppliedId) {
    return authorizationBlocked('SUMMARY_IDENTITY_MISMATCH', 'Supplied filing-choice summary digest does not match its canonical payload.');
  }
  if (!exactCanonicalEqual(suppliedSummary, current.summary)) {
    return authorizationBlocked('SUMMARY_NOT_CURRENT', 'Supplied filing-choice summary is not the exact current live D.1 summary.');
  }

  if (!isExactObject(authorizationInput, AUTHORIZATION_KEYS)
    || typeof authorizationInput.confirmationId !== 'string'
    || typeof authorizationInput.confirmedAtISO !== 'string'
    || typeof authorizationInput.filingChoiceSummaryId !== 'string') {
    return authorizationBlocked('INVALID_AUTHORIZATION_SHAPE', 'Owner authorization must contain only confirmationId, confirmedAtISO, and filingChoiceSummaryId.');
  }
  if (authorizationInput.confirmationId.trim() === '') {
    return authorizationBlocked('BLANK_CONFIRMATION_ID', 'confirmationId must be a nonempty exact string.');
  }
  if (!validExactTimestamp(authorizationInput.confirmedAtISO)) {
    return authorizationBlocked('MALFORMED_CONFIRMATION_TIMESTAMP', 'confirmedAtISO must be an exact valid timestamp.');
  }
  if (Date.parse(authorizationInput.confirmedAtISO) < Date.parse(current.summary.createdNoticeIdentity.createdAtISO)) {
    return authorizationBlocked('CONFIRMATION_PRECEDES_CREATED_NOTICE', 'Owner preparation-choice confirmation cannot precede the exact Created Notice.');
  }
  if (authorizationInput.filingChoiceSummaryId !== current.summary.filingChoiceSummaryId) {
    return authorizationBlocked('WRONG_FILING_CHOICE_SUMMARY_ID', 'Owner confirmation must bind the exact current filingChoiceSummaryId.');
  }

  const identity: FilingChoiceAuthorizationIdentity = {
    filingChoiceSummaryId: current.summary.filingChoiceSummaryId,
    confirmationId: authorizationInput.confirmationId,
    confirmedAtISO: authorizationInput.confirmedAtISO,
    statementId: FILING_CHOICE_AUTHORIZATION_STATEMENT_ID,
    statementVersion: FILING_CHOICE_AUTHORIZATION_STATEMENT_VERSION,
  };
  return {
    status: 'OWNER_CHOICES_AUTHORIZED_FOR_PREPARATION',
    authorizationId: computeFilingChoiceAuthorizationId(identity),
    filingChoiceSummaryId: identity.filingChoiceSummaryId,
    confirmationId: identity.confirmationId,
    confirmedAtISO: identity.confirmedAtISO,
    statementId: identity.statementId,
    statementVersion: identity.statementVersion,
    effects: FILING_CHOICE_AUTHORIZATION_EFFECTS,
  };
}
