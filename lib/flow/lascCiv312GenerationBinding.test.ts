import { strict as assert } from 'node:assert';
import {
  LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  LASC_CIV_312_FIELD_MAP_SNAPSHOT,
} from './lascCiv312FieldMapFoundation';
import {
  LASC_CIV_312_GENERATION_BINDING_PROFILE_ID,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT,
  LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION,
  LASC_CIV_312_GOVERNANCE_POSTURE,
  computeLascCiv312GenerationBindingProfileSnapshot,
  evaluateLascCiv312GenerationBinding,
  type LascCiv312CanonicalFactsProjection,
  type LascCiv312FactProvenance,
  type LascCiv312FactState,
} from './lascCiv312GenerationBinding';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const deepEqual = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); passed += 1; };

const identity = { generation: 'synthetic-generation-1', createdAtISO: '2026-08-31T20:00:00.000Z' };
const defendantProvenance: LascCiv312FactProvenance = {
  createdNotice: identity,
  sourcePaths: ['createData.tenantNames'],
  provenanceClass: 'FROZEN_CUSTOMER_CONFIRMED',
  dependencies: [],
};
const plaintiffProvenance: LascCiv312FactProvenance = {
  createdNotice: identity,
  sourcePaths: ['createData.landlordIdentity'],
  provenanceClass: 'DETERMINISTIC_DERIVATION',
  dependencies: ['landlord.identity'],
};
const phoneProvenance = (index: number): LascCiv312FactProvenance => ({
  createdNotice: identity,
  sourcePaths: [`supplemental.defendantTelephones[${index}]`],
  provenanceClass: 'SUPPLEMENTAL_CUSTOMER_INPUT',
  dependencies: [],
});
const genericContactProvenance: LascCiv312FactProvenance = {
  createdNotice: identity,
  sourcePaths: ['supplemental.preparation.filerContact'],
  provenanceClass: 'SUPPLEMENTAL_CUSTOMER_INPUT',
  dependencies: [],
};

function known(value: unknown, provenance: LascCiv312FactProvenance): LascCiv312FactState {
  return { state: 'KNOWN', value, provenance };
}

function makeProjection(
  defendantNames: readonly string[] = ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  phones: readonly LascCiv312FactState[] = [
    known('555-0101', phoneProvenance(0)),
    known('555-0102', phoneProvenance(1)),
  ],
  plaintiffNames: readonly string[] = ['Synthetic Owner LLC'],
): LascCiv312CanonicalFactsProjection {
  const facts: Record<string, LascCiv312FactState> = {
    'defendant.names': known(defendantNames, defendantProvenance),
    'plaintiff.names': known(plaintiffNames, plaintiffProvenance),
    'ud100.fact.filerContact': known({ telephone: '555-0199' }, genericContactProvenance),
  };
  phones.forEach((phone, index) => { facts[`defendant.${index}.telephone`] = phone; });
  return { status: 'READY', createdNoticeIdentity: identity, facts };
}

const baseline = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, makeProjection());
equal(baseline.status, 'GENERATION_BINDING_READY', 'exact governed synthetic facts produce a bounded write plan');
if (baseline.status !== 'GENERATION_BINDING_READY') throw new Error('baseline fixture must be binding-ready');

equal(LASC_CIV_312_GENERATION_BINDING_PROFILE_ID, 'lasc-civ312-generation-binding-v1', 'generation-binding profile id is deterministic');
equal(LASC_CIV_312_GENERATION_BINDING_PROFILE_VERSION, '2026-08-31.r1', 'generation-binding profile version is deterministic');
equal(LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT, 'sha256:01e8f4f9cd4d6baf804c8752ab5e1a11c89e4fccf4debdc6ab917abd1f890824', 'generation-binding profile snapshot is frozen');
equal(computeLascCiv312GenerationBindingProfileSnapshot(), LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT, 'generation-binding profile snapshot is deterministic');
ok(/^sha256:[0-9a-f]{64}$/.test(LASC_CIV_312_GENERATION_BINDING_PROFILE_SNAPSHOT), 'generation-binding profile snapshot is content-addressed');

equal(baseline.fieldWritePlan.find(item => item.fieldId === 'Cellular Telephone 1')?.value, '555-0101', 'first known defendant phone maps only to first indexed destination');
equal(baseline.fieldWritePlan.find(item => item.fieldId === 'Cellular Telephone 2')?.value, '555-0102', 'second known defendant phone maps only to second indexed destination');
equal(baseline.fieldWritePlan.find(item => item.fieldId === 'Defendant Name 1')?.value, 'Synthetic Tenant One', 'first defendant identity stays index-stable');
equal(baseline.fieldWritePlan.find(item => item.fieldId === 'Defendant Name 2')?.value, 'Synthetic Tenant Two', 'second defendant identity stays index-stable');
equal(new Set(baseline.fieldWritePlan.map(item => item.fieldId)).size, baseline.fieldWritePlan.length, 'all emitted writable destinations are unique');

const forbiddenTargets = ['check box', 'CASE NUMBER', 'Date', 'Print Name', 'Signature', 'COURTHOUSE ADDRESS', 'PLAINTIFFS', 'DEFENDANTS', 'Cellular Telephone 6', 'Cellular Telephone 7'];
for (const fieldId of forbiddenTargets) {
  ok(!baseline.fieldWritePlan.some(item => item.fieldId === fieldId), `${fieldId} is never written by the generation binding`);
}
ok(!baseline.fieldWritePlan.some(item => item.value === '555-0199'), 'generic filer/contact telephone is never borrowed into plaintiff-cell fields');
equal(baseline.protectedDestinations.length, 10, 'all ten protected/no-write destinations are preserved');

const unanswered = makeProjection(['Synthetic Tenant One'], [{ state: 'UNANSWERED', provenance: phoneProvenance(0) }]);
const unansweredResult = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, unanswered);
equal(unansweredResult.status, 'BLOCKED', 'UNANSWERED defendant phone fails closed');
equal(unansweredResult.status === 'BLOCKED' ? unansweredResult.blockerCode : '', 'UNANSWERED_DEFENDANT_PHONE', 'UNANSWERED stays distinct from UNKNOWN');
equal(unansweredResult.fieldWritePlan.length, 0, 'UNANSWERED produces zero writes');
ok(!unansweredResult.fieldWritePlan.some(item => item.fieldId === 'check box'), 'UNANSWERED never selects the unknown-number checkbox');

const unknown = makeProjection(['Synthetic Tenant One'], [{ state: 'UNKNOWN', provenance: phoneProvenance(0) }]);
const unknownResult = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, unknown);
equal(unknownResult.status, 'BLOCKED', 'UNKNOWN fails closed while aggregate checkbox semantics are ungoverned');
equal(unknownResult.status === 'BLOCKED' ? unknownResult.blockerCode : '', 'UNKNOWN_NUMBER_CHECKBOX_SEMANTICS_UNGOVERNED', 'UNKNOWN returns the exact aggregate-semantic blocker');
equal(unknownResult.fieldWritePlan.length, 0, 'UNKNOWN produces zero writes and never fabricates a phone');
ok(!unknownResult.fieldWritePlan.some(item => item.fieldId === 'check box'), 'UNKNOWN never invents aggregate checkbox selection');

const requiresConfirmation = makeProjection(['Synthetic Tenant One'], [{ state: 'REQUIRES_CONFIRMATION', reason: 'synthetic confirmation required', provenance: phoneProvenance(0) }]);
equal(evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, requiresConfirmation).status, 'BLOCKED', 'REQUIRES_CONFIRMATION fails closed');
const conflict = makeProjection(['Synthetic Tenant One'], [{ state: 'CONFLICT', values: ['555-0101', '555-0109'], reason: 'synthetic conflict', provenance: phoneProvenance(0) }]);
equal(evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, conflict).status, 'BLOCKED', 'CONFLICT fails closed');

const stalePhoneProjection = makeProjection(['Synthetic Tenant One'], [known('555-0101', { ...phoneProvenance(0), createdNotice: { ...identity, generation: 'stale-generation' } })]);
const stalePhone = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, stalePhoneProjection);
equal(stalePhone.status === 'BLOCKED' ? stalePhone.blockerCode : '', 'STALE_DEFENDANT_PHONE', 'stale phone provenance fails closed');
equal(stalePhone.fieldWritePlan.length, 0, 'stale phone produces zero writes');

const malformedPhoneProjection = makeProjection(['Synthetic Tenant One'], [known('', phoneProvenance(0))]);
const malformedPhone = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, malformedPhoneProjection);
equal(malformedPhone.status === 'BLOCKED' ? malformedPhone.blockerCode : '', 'MALFORMED_DEFENDANT_PHONE', 'blank/malformed phone fails closed');
equal(malformedPhone.fieldWritePlan.length, 0, 'malformed phone produces zero writes');

const unprovenancedPhoneProjection = makeProjection(['Synthetic Tenant One'], [known('555-0101', { ...phoneProvenance(0), sourcePaths: ['wrong.synthetic.path'] })]);
const unprovenancedPhone = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, unprovenancedPhoneProjection);
equal(unprovenancedPhone.status === 'BLOCKED' ? unprovenancedPhone.blockerCode : '', 'UNPROVENANCED_DEFENDANT_PHONE', 'wrong phone source provenance fails closed');
equal(unprovenancedPhone.fieldWritePlan.length, 0, 'unprovenanced phone produces zero writes');

const sixDefendants = ['Synthetic Tenant 1', 'Synthetic Tenant 2', 'Synthetic Tenant 3', 'Synthetic Tenant 4', 'Synthetic Tenant 5', 'Synthetic Tenant 6'];
const sixPhones = sixDefendants.map((_, index) => known(`555-01${String(index).padStart(2, '0')}`, phoneProvenance(index)));
const tooMany = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, makeProjection(sixDefendants, sixPhones));
equal(tooMany.status === 'BLOCKED' ? tooMany.blockerCode : '', 'DEFENDANT_COUNT_UNSUPPORTED', 'more than five defendants blocks rather than truncates');
equal(tooMany.fieldWritePlan.length, 0, 'over-cardinality returns zero writes, not partial/truncated writes');

const orphanFacts = makeProjection(['Synthetic Tenant One'], [known('555-0101', phoneProvenance(0)), known('555-0102', phoneProvenance(1))]);
const orphanResult = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, orphanFacts);
equal(orphanResult.status === 'BLOCKED' ? orphanResult.blockerCode : '', 'ORPHAN_DEFENDANT_PHONE_FACT', 'orphan indexed phone facts fail closed');

const threePlaintiffs = evaluateLascCiv312GenerationBinding(
  LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY,
  makeProjection(['Synthetic Tenant One'], [known('555-0101', phoneProvenance(0))], ['Synthetic Owner One', 'Synthetic Owner Two', 'Synthetic Owner Three']),
);
equal(threePlaintiffs.status === 'BLOCKED' ? threePlaintiffs.blockerCode : '', 'PLAINTIFF_COUNT_UNSUPPORTED', 'plaintiff names are never silently truncated');

const staleNamesProjection = makeProjection(['Synthetic Tenant One'], [known('555-0101', phoneProvenance(0))]);
if (staleNamesProjection.status !== 'READY') throw new Error('fixture must be ready');
staleNamesProjection.facts['defendant.names'] = known(['Synthetic Tenant One'], { ...defendantProvenance, createdNotice: { ...identity, createdAtISO: '2026-08-31T19:00:00.000Z' } });
const staleNames = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, staleNamesProjection);
equal(staleNames.status === 'BLOCKED' ? staleNames.blockerCode : '', 'STALE_DEFENDANT_NAMES', 'stale defendant identity provenance fails closed');

const wrongMap = evaluateLascCiv312GenerationBinding(LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, makeProjection(), `sha256:${'0'.repeat(64)}`);
equal(wrongMap.status === 'BLOCKED' ? wrongMap.blockerCode : '', 'MAP_SNAPSHOT_MISMATCH', 'map snapshot mismatch fails closed');
equal(wrongMap.fieldWritePlan.length, 0, 'map mismatch produces zero writes');

const wrongHashTopology = { ...LASC_CIV_312_AUTHENTICATED_SOURCE_TOPOLOGY, sourceSha256: '0'.repeat(64) };
const wrongHash = evaluateLascCiv312GenerationBinding(wrongHashTopology, makeProjection());
equal(wrongHash.status === 'BLOCKED' ? wrongHash.blockerCode : '', 'SOURCE_TOPOLOGY_BLOCKED', 'source hash mismatch fails closed before facts are used');
equal(wrongHash.fieldWritePlan.length, 0, 'source mismatch produces zero writes');

deepEqual(LASC_CIV_312_GOVERNANCE_POSTURE, {
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
}, 'all non-generation and downstream authority states remain held/no');

equal(baseline.governance.documentGeneration, 'NOT_PERFORMED', 'document generation remains not performed');
equal(baseline.governance.pdfMutation, 'NOT_PERFORMED', 'PDF mutation remains not performed');
equal(baseline.governance.databaseWrite, 'NO', 'database writes remain prohibited');
equal(baseline.governance.persistence, 'NO', 'persistence remains prohibited');
equal(baseline.governance.preparationCheckpointWrite, 'NO', 'preparation checkpoint writes remain prohibited');
equal(baseline.governance.ownerReviewCheckpointWrite, 'NO', 'owner-review checkpoint writes remain prohibited');
equal(baseline.governance.checkpoint1, 'HELD', 'Checkpoint 1 remains held');
equal(baseline.governance.filing, 'NO', 'filing remains prohibited');
equal(baseline.governance.signing, 'NO', 'signing remains prohibited');
equal(baseline.governance.serviceExecution, 'NO', 'service execution remains prohibited');
equal(baseline.governance.courtSubmission, 'NO', 'court submission remains prohibited');
equal(baseline.governance.stageF, 'HELD', 'Stage F remains held');
equal(baseline.governance.newProductionAuthority, 'NO', 'new Production authority remains prohibited');

const syntheticFixtureValues = baseline.fieldWritePlan.map(item => item.value);
ok(syntheticFixtureValues.filter(value => value.includes('Tenant') || value.includes('Owner')).every(value => value.startsWith('Synthetic ')), 'identity fixtures are synthetic-only');
ok(syntheticFixtureValues.filter(value => /^\d/.test(value)).every(value => value.startsWith('555-')), 'telephone fixtures are synthetic-only');
ok(!Object.keys((makeProjection() as { facts: Record<string, unknown> }).facts).some(key => key.includes('rent') || key.includes('election')), 'fixtures contain no case-specific amounts or elections');

console.log(`lascCiv312GenerationBinding: ${passed} assertions passed`);
