import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  type FilingCanonicalFactsSupplementalInput,
} from './filingCanonicalFacts';
import {
  createFilingPreparationCurrentState,
  FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION,
  getFilingPreparationCurrentnessMaterialBinding,
  LEGACY_FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION,
  validateFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentnessMaterialBinding,
} from './filingPreparationCurrentState';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import {
  computeFieldWritePlanDigest,
  computeGeneratedDocumentId,
  computePreparationAuthorizationSnapshotId,
  sha256Bytes,
  type FormPreparationAuthorization,
  type GeneratedDraftEvidence,
  type GeneratedDraftIdentity,
} from './officialFormGeneratedDraft';
import { canonicalizeGenerationIdentity } from './officialFormGenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import { evaluateUd100GenerationBinding } from './ud100GenerationBinding';

let passed = 0;
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const ok = (value: unknown, message: string) => { assert.ok(value, message); passed += 1; };

const USER = '11111111-1111-4111-8111-111111111111';
const RISKPATH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Binding Ave', propertyUnit: 'Unit 4', propertyCity: 'Glendale', propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] }, landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = { ...base, ...bindReviewApproval(base, '2026-08-14T12:00:00.000Z') };
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-14T12:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-15', compliancePeriodEndDate: '2026-08-19',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-14T12:01:00.000Z', propertyAddress: '100 Binding Ave', propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'], totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner', payeePhone: '5555550100', payeeStreetAddress: '100 Binding Ave', signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};
const confirmation = (id: string) => ({ confirmationId: id, confirmedAtISO: '2026-08-14T12:02:00.000Z' });
const control = (controlId: string, resultId: string) => ({ controlId, controlVersion: '1.0.0', resultId, status: 'CURRENT' as const });
const event = (eventType: string, eventId: string) => ({ sourceId: 'case-lifecycle', eventId, eventType });
const selectedCourt = { county: 'Los Angeles', streetAddress: '111 N Hill St', mailingAddress: '111 N Hill St', cityAndZip: 'Los Angeles, CA 90012', branchName: 'Stanley Mosk Courthouse' };

function supplemental(): FilingCanonicalFactsSupplementalInput {
  return {
    propertyZip: { state: 'KNOWN', value: '91203' },
    preparation: {
      selectedFilingCourt: { state: 'KNOWN', value: selectedCourt, confirmation: confirmation('court-confirm-1') },
      municipalClassification: { state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', control: control('municipal-classification', 'municipal-city') },
      initialComplaintLifecycle: { state: 'KNOWN', value: 'INITIAL_PREFILING', event: event('INITIAL_COMPLAINT_STATUS', 'prefiling-1') },
      captionRouteControl: { state: 'KNOWN', value: 'SELF_REPRESENTED_SUPPORTED', control: control('caption-route', 'self-represented') },
      captionFormValueControl: { state: 'KNOWN', value: 'Self-represented', control: control('caption-form-value', 'self-represented-form-value'), dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl] },
      jurisdictionSupportControl: { state: 'KNOWN', value: 'SUPPORTED_INITIAL_UD100', control: control('jurisdiction-support', 'supported') },
      plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
      plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
      plaintiffStandingControl: { state: 'KNOWN', value: 'SUPPORTED', control: control('plaintiff-standing', 'supported'), dependencies: [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType] },
      dbaUse: { state: 'KNOWN', value: 'NO_DBA' },
      doeElection: { state: 'KNOWN', value: { include: false }, confirmation: confirmation('doe-no') },
      filerContact: { state: 'KNOWN', value: { name: 'Synthetic Owner', streetAddress: '100 Binding Ave', city: 'Glendale', state: 'CA', zip: '91203', telephone: '5555550100', email: 'owner@example.test', representationStatus: 'SELF_REPRESENTED' } },
      captionOptionalFieldsControl: { state: 'KNOWN', value: 'SELF_REP_NO_BAR_FIRM_FAX', control: control('caption-optional-fields', 'self-rep-optional'), dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl] },
      premisesAge: { state: 'KNOWN', value: '1990' },
      tpaClassificationControl: { state: 'KNOWN', value: 'SUBJECT_AT_FAULT', control: control('tpa-classification', 'subject-at-fault') },
      localControl: { state: 'KNOWN', value: 'NOT_SUBJECT', control: control('local-rent-control', 'not-subject') },
      civilClassificationControl: { state: 'KNOWN', value: 'LIMITED_LE_10000', control: control('civil-classification', 'limited-le-10000'), dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections] },
      leaseStatus: { state: 'KNOWN', value: 'NO_AGREEMENT' },
      leaseApplicabilityControl: { state: 'KNOWN', value: 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE', control: control('lease-applicability', 'not-applicable'), dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus] },
      noticeComplaintElection: { state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY', confirmation: confirmation('notice-election-pay-rent') },
      noticeElectionConsistencyControl: { state: 'KNOWN', value: 'CONSISTENT', control: control('notice-election-consistency', 'consistent'), dependencies: [CANONICAL_FILING_FACT_REFS.noticeComplaintElection] },
      serviceComplaintElection: { state: 'KNOWN', value: 'PERSONAL_HAND_DELIVERY', confirmation: confirmation('service-election-personal') },
      serviceElectionConsistencyControl: { state: 'KNOWN', value: 'CONSISTENT', control: control('service-election-consistency', 'consistent'), dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts] },
      serviceFacts: { state: 'KNOWN', value: { defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'], serviceDate: '2026-08-14', noticeExpirationDate: '2026-08-19', serviceMethod: 'PERSONAL_HAND_DELIVERY', noticeIncludedForfeiture: true }, event: event('NOTICE_SERVICE_FACTS', 'service-1') },
      rentDueAtService: { state: 'KNOWN', value: 2450 },
      fixedTermExpirationElection: { state: 'KNOWN', value: 'DO_NOT_SELECT', confirmation: confirmation('fixed-term-no') },
      rentalAssistanceFacts: { state: 'KNOWN', value: { item11aReceived: false, item11bReceived: false, item11cHas: false, item11dHas: false } },
      rentalAssistanceControl: { state: 'KNOWN', value: 'APPLICABLE', control: control('rental-assistance', 'applicable'), dependencies: [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts] },
      otherNoticesFact: { state: 'KNOWN', value: 'NO_OTHER_NOTICES' },
      pastDueRentRelief: { state: 'KNOWN', value: { selected: true, amount: 2400 }, confirmation: confirmation('past-due-rent-relief') },
      otherReliefSelections: { state: 'KNOWN', value: { fairRentalValue:false, statutoryDamages:false, relocationDamages:false, forfeiture:false, attorneyFees:false, otherRelief:false, otherAllegations:false }, confirmation: confirmation('other-relief-none') },
      udaDisclosureControl: { state: 'KNOWN', value: 'NO_COMPENSATED_ASSISTANT', control: control('uda-disclosure', 'no-compensated-assistant') },
    },
  };
}

function fixture() {
  const facts = projectFilingCanonicalFacts(persisted, supplemental());
  if (facts.status !== 'READY') throw new Error('R1 facts fixture must be READY');
  const evaluation = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  if (evaluation.status !== 'GENERATION_BINDING_READY') throw new Error(`R1 binding fixture blocked: ${JSON.stringify(evaluation)}`);
  const authorization: FormPreparationAuthorization = {
    authorizationId: 'prep-auth-r1', resultId: 'prep-result-r1', controlId: 'form-preparation-relevance', controlVersion: '1.0.0',
    status: 'CURRENT', decision: 'FORM_RELEVANT_FOR_PREPARATION',
    target: {
      artifactId: UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,
      authorityKey: UD100_OFFICIAL_SOURCE_IDENTITY.authorityKey,
      formId: UD100_OFFICIAL_SOURCE_IDENTITY.formId,
      revisionEffective: UD100_OFFICIAL_SOURCE_IDENTITY.revisionEffective,
      sourceSnapshotId: UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,
    },
    createdNoticeIdentity: facts.createdNoticeIdentity,
  };
  const snapshot: FilingPreparationCanonicalSnapshot = {
    officialSourceArtifactId: UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,
    officialSourceSnapshotId: UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,
    officialSourceSha256: UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256,
    sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2', sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN',
    qpdfAssetIdentityDigest: 'qpdf-asset:sha256:r1', sourcePassACommandDigest: 'qpdf-command:sha256:a', sourcePassAWarningInventoryDigest: 'source-warning-inventory:sha256:a',
    sourcePassBCommandDigest: 'qpdf-command:sha256:b', sourcePassBWarningInventoryDigest: 'source-warning-inventory:sha256:b', sourceWarningInventoryDigest: 'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256: '2'.repeat(64), xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1', xfaDigest: 'xfa:sha256:r1',
    preparationManifestId: 'preparation-manifest:sha256:r1', preparationSourceId: 'preparation-source:sha256:r1', preparationDerivativeSha256: '3'.repeat(64),
    preparationFieldEquivalenceDigest: 'field-equivalence:sha256:r1', preparationSemanticDeltaDigest: 'semantic-delta:sha256:r1',
    preparationAuthorizationSnapshotId: computePreparationAuthorizationSnapshotId(authorization),
    mapSnapshotId: evaluation.mapSnapshotId, referencedFactSnapshotId: evaluation.referencedFactSnapshotId,
    generationInputId: evaluation.generationInputId, generatorContractVersion: evaluation.generatorContractVersion,
    generatorImplementationId: 'synthetic-r1-generator', generatorImplementationVersion: '1.0.0',
    fieldWritePlanDigest: computeFieldWritePlanDigest(evaluation.fieldWritePlan),
  };
  const bytes = Uint8Array.from([9,8,7,6,5,4]);
  const identity: GeneratedDraftIdentity = {
    schemaVersion:1, artifactClass:'GENERATED_DRAFT', artifactRole:'OWNER_GENERATED_PREPARATION',
    ...snapshot,
    preparedAtISO:'2026-08-14T12:03:00.000Z', generatedPdfSha256:sha256Bytes(bytes), generatedByteLength:bytes.byteLength,
  };
  const draft: GeneratedDraftEvidence = { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
  const material: FilingPreparationCurrentnessMaterialBinding = { schemaVersion:1, officialSourceHealth:'CURRENT', facts, preparationAuthorization:authorization };
  return { facts, evaluation, authorization, snapshot, bytes, draft, material };
}

const f = fixture();

function migrationReferencedFactSnapshot(facts: any): { id: string; directRefs: string[] } {
  const migration = readFileSync('supabase/staged-migrations/060_e2_3d0b4_currentness_material_binding.sql', 'utf8');
  const queueBlock = migration.match(/queue text\[\] := array\[(.*?)\];\n  seen text\[\]/s);
  if (!queueBlock) throw new Error('Migration 060 must expose the exact UD-100 direct fact dependency queue.');
  const directRefs = [...queueBlock[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const queue = [...directRefs];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const ref = queue.shift()!;
    if (seen.has(ref)) continue;
    seen.add(ref);
    const fact = facts.facts[ref];
    if (fact === undefined) continue;
    const dependencies = fact?.provenance?.dependencies;
    if (!Array.isArray(dependencies) || dependencies.some((dependency: unknown) => typeof dependency !== 'string' || dependency.trim() === '')) {
      throw new Error(`Migration-equivalent fact provenance is malformed at ${ref}.`);
    }
    queue.push(...dependencies);
  }
  const record = [...seen].sort().map(ref => ({ ref, fact: facts.facts[ref] ?? null }));
  const id = `facts:sha256:${createHash('sha256').update(canonicalizeGenerationIdentity(record)).digest('hex')}`;
  return { id, directRefs };
}

{
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:1, preparationSnapshot:f.snapshot, generatedDraftBinding:null, generatedDraftBytes:null, currentnessMaterialBinding:null, ownerReviewBinding:null });
  equal(result.status, 'CURRENT_STATE_REVISION', 'v2 preparation revision builds');
  if (result.status === 'CURRENT_STATE_REVISION') {
    equal(result.currentState.schemaVersion, FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION, 'new writes use current-state schema v2');
    equal(getFilingPreparationCurrentnessMaterialBinding(result.currentState), null, 'preparation-only revision carries no currentness material');
    equal(validateFilingPreparationCurrentState(result.currentState).status, 'VALID', 'v2 preparation revision validates');
  }
}

{
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:2, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:2,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, currentnessMaterialBinding:f.material, ownerReviewBinding:null });
  equal(result.status, 'CURRENT_STATE_REVISION', 'exact generated revision with trusted material builds');
  if (result.status === 'CURRENT_STATE_REVISION') {
    equal(result.currentState.schemaVersion, 2, 'generated durable candidate is v2');
    ok(getFilingPreparationCurrentnessMaterialBinding(result.currentState) !== null, 'generated revision retains trusted dynamic material');
    equal(validateFilingPreparationCurrentState(result.currentState).status, 'VALID', 'generated v2 round-trips canonical validation');
  }
}

{
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:2, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:2,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, currentnessMaterialBinding:null, ownerReviewBinding:null });
  equal(result.status, 'BLOCKED', 'new generated revision cannot omit currentness material');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENTNESS_MATERIAL_REQUIRED', 'missing material has exact blocker');
}

{
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:1, preparationSnapshot:f.snapshot, generatedDraftBinding:null, generatedDraftBytes:null, currentnessMaterialBinding:f.material, ownerReviewBinding:null });
  equal(result.status, 'BLOCKED', 'preparation revision cannot retain stale generated currentness material');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'UNBOUND_CURRENTNESS_MATERIAL', 'unbound material has exact blocker');
}

{
  const changed = structuredClone(f.material) as any;
  changed.preparationAuthorization.resultId = 'different-result';
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:2, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:2,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, currentnessMaterialBinding:changed, ownerReviewBinding:null });
  equal(result.status, 'BLOCKED', 'authorization drift blocks before durable creation');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENTNESS_MATERIAL_PREPARATION_MISMATCH', 'authorization drift has exact blocker');
}

{
  const changed = structuredClone(f.material) as any;
  changed.facts.facts[CANONICAL_FILING_FACT_REFS.rentDueAtService].value = 2449;
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:2, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:2,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, currentnessMaterialBinding:changed, ownerReviewBinding:null });
  equal(result.status, 'BLOCKED', 'fact drift that changes generation identity blocks');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'CURRENTNESS_MATERIAL_PREPARATION_MISMATCH', 'fact drift has exact blocker');
}

{
  const migration = readFileSync('supabase/staged-migrations/060_e2_3d0b4_currentness_material_binding.sql', 'utf8');
  const exact = migrationReferencedFactSnapshot(f.material.facts);
  equal(exact.directRefs.length, 39, 'migration 060 pins the exact 39 direct UD-100 generation/profile fact dependencies');
  equal(exact.id, f.snapshot.referencedFactSnapshotId, 'migration 060 fact-snapshot algorithm reproduces canonical evaluator identity for valid R1 material');

  const leafMutation = structuredClone(f.material.facts) as any;
  leafMutation.facts[CANONICAL_FILING_FACT_REFS.rentDueAtService].value = 2449;
  ok(migrationReferencedFactSnapshot(leafMutation).id !== exact.id, 'migration 060 fact-snapshot identity changes on material fact mutation');

  const provenanceMutation = structuredClone(f.material.facts) as any;
  provenanceMutation.facts[CANONICAL_FILING_FACT_REFS.plaintiffStandingControl].provenance.dependencies.push(CANONICAL_FILING_FACT_REFS.rentDemandTotal);
  ok(migrationReferencedFactSnapshot(provenanceMutation).id !== exact.id, 'migration 060 fact-snapshot identity changes on relevant provenance dependency drift');

  ok(migration.includes("expected_referenced_fact_snapshot_id <> prep ->> 'referencedFactSnapshotId'"), 'migration 060 compares recomputed facts identity to accepted preparation identity');
  ok(migration.includes("'generation-input:sha256:'"), 'migration 060 independently recomputes generation-input identity after facts binding');
}

{
  const injected = { ...f.material, currentness: { status:'CURRENT', reasons:[] } } as any;
  const result = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:2, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:2,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, currentnessMaterialBinding:injected, ownerReviewBinding:null });
  equal(result.status, 'BLOCKED', 'caller-authored currentness verdict is rejected as unknown binding data');
  if (result.status === 'BLOCKED') equal(result.blockReason, 'INVALID_CURRENTNESS_MATERIAL_BINDING', 'currentness assertion fails exact shape');
}

{
  const legacy = createFilingPreparationCurrentState({ authenticatedUserId:USER, riskpathRecordId:RISKPATH, revision:3, preparationSnapshot:f.snapshot, generatedDraftBinding:{revision:3,generatedDraft:f.draft}, generatedDraftBytes:f.bytes, ownerReviewBinding:null });
  equal(legacy.status, 'CURRENT_STATE_REVISION', 'historical constructor shape remains readable for integrated v1 evidence');
  if (legacy.status === 'CURRENT_STATE_REVISION') {
    equal(legacy.currentState.schemaVersion, LEGACY_FILING_PREPARATION_CURRENT_STATE_SCHEMA_VERSION, 'legacy exact shape produces schema v1 only');
    equal(validateFilingPreparationCurrentState(legacy.currentState).status, 'VALID', 'historical v1 remains validator-compatible without backfill');
    equal(getFilingPreparationCurrentnessMaterialBinding(legacy.currentState), null, 'historical v1 never fabricates currentness material');
  }
}

{
  const source = readFileSync('lib/flow/filingPreparationCurrentState.ts','utf8');
  ok(source.includes('evaluateUd100GenerationBinding('), 'core reuses canonical UD-100 generation evaluator');
  ok(source.includes('validateFormPreparationAuthorization('), 'core reuses canonical preparation authorization validation');
  for (const prohibited of ['generatedDraftCurrentness', 'OUT_OF_DATE', 'service_role', 'createClient(', '.from(', 'Date.now(', 'Math.random(']) {
    ok(!source.includes(prohibited), `core excludes prohibited runtime/currentness authority token: ${prohibited}`);
  }
}

console.log(`filingPreparationCurrentState R1 tests passed: ${passed}`);
