import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  readCanonicalFilingFact,
  type FilingCanonicalFactsSupplementalInput,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { validateGenerationBindingDefinition } from './officialFormGenerationBinding';
import { UD100_FIELD_MAP_FOUNDATION, UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
  UD100_GENERATION_BINDING_MAP_ID,
  UD100_GENERATION_BINDING_MAP_VERSION,
  UD100_GENERATION_PROFILE_ID,
  UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS,
} from './ud100GenerationBinding';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Binding Ave',
  propertyUnit: 'Unit 4',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = { ...base, ...bindReviewApproval(base, '2026-08-14T12:00:00.000Z') };
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-14T12:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-14T12:01:00.000Z',
    propertyAddress: '100 Binding Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Binding Ave',
    signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};

const confirmation = { confirmationId: 'court-confirm-1', confirmedAtISO: '2026-08-14T12:02:00.000Z' };
const selectedCourt = {
  county: 'Los Angeles',
  streetAddress: '111 N Hill St',
  mailingAddress: '111 N Hill St',
  cityAndZip: 'Los Angeles, CA 90012',
  branchName: 'Stanley Mosk Courthouse',
};
const control = (controlId: string, resultId: string, status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED' = 'CURRENT') => ({
  controlId,
  controlVersion: '1.0.0',
  resultId,
  status,
});
const event = { sourceId: 'case-lifecycle', eventId: 'prefiling-1', eventType: 'INITIAL_COMPLAINT_STATUS' };

function supplemental(overrides: Partial<FilingCanonicalFactsSupplementalInput> = {}): FilingCanonicalFactsSupplementalInput {
  const baseSupplemental: FilingCanonicalFactsSupplementalInput = {
    propertyZip: { state: 'KNOWN', value: '91203' },
    preparation: {
      selectedFilingCourt: { state: 'KNOWN', value: selectedCourt, confirmation },
      municipalClassification: { state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', control: control('municipal-classification', 'municipal-city') },
      initialComplaintLifecycle: { state: 'KNOWN', value: 'INITIAL_PREFILING', event },
      captionRouteControl: { state: 'KNOWN', value: 'SELF_REPRESENTED_SUPPORTED', control: control('caption-route', 'self-represented') },
      jurisdictionSupportControl: { state: 'KNOWN', value: 'SUPPORTED_INITIAL_UD100', control: control('jurisdiction-support', 'supported') },
    },
  };
  return {
    ...baseSupplemental,
    ...overrides,
    preparation: { ...baseSupplemental.preparation, ...overrides.preparation },
  };
}

function evaluate(input: FilingCanonicalFactsSupplementalInput = supplemental()) {
  const facts = projectFilingCanonicalFacts(persisted, input);
  return { facts, result: evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts) };
}

const ready = evaluate();
equal(ready.facts.status, 'READY', 'exact restored Created Notice plus governed supplemental inputs project');
equal(ready.result.status, 'GENERATION_BINDING_READY', 'current initial pre-filing profile produces deterministic field-write plan only');
if (ready.result.status !== 'GENERATION_BINDING_READY') throw new Error('ready fixture must resolve');
equal(ready.result.documentGeneration, 'NOT_PERFORMED', 'GENERATION_BINDING_READY does not generate a document');
equal(ready.result.pdfMutation, 'NOT_PERFORMED', 'GENERATION_BINDING_READY does not mutate PDF bytes');
equal(ready.result.formApplicability, 'NOT_EVALUATED', 'D.1 does not decide applicability');
equal(ready.result.formRequiredness, 'NOT_EVALUATED', 'D.1 does not decide requiredness');
equal(UD100_GENERATION_BINDING.mapId, UD100_GENERATION_BINDING_MAP_ID, 'map id is explicit');
equal(UD100_GENERATION_BINDING.mapVersion, UD100_GENERATION_BINDING_MAP_VERSION, 'map version is explicit');
equal(UD100_GENERATION_BINDING.profileId, UD100_GENERATION_PROFILE_ID, 'bounded initial pre-filing profile is explicit');
ok(UD100_GENERATION_BINDING.mapSnapshotId.startsWith('map:sha256:'), 'map snapshot is content-addressed');
equal(UD100_GENERATION_BINDING.matrixDomainCoverage.length, 6, 'all six Product/Legal matrix domains are carried by the profile contract');
equal(validateGenerationBindingDefinition(UD100_FIELD_MAP_FOUNDATION).status, 'BLOCKED', 'six-field Stage D foundation remains not generation-capable');

const premises = ready.result.fieldWritePlan.find(item => item.fieldId === 'UD-100[0].Page1[0].List3[0].SubList3[0].Lia[0].FillText6[0]');
equal(premises?.action, 'WRITE_TEXT', 'independently evidenced premises field is admitted as a deterministic text write');
if (premises?.action === 'WRITE_TEXT') {
  equal(premises.value, '100 Binding Ave, Unit 4, Glendale, 91203, Los Angeles', 'premises transform composes only exact governed components and punctuation');
  equal(premises.objectReference, '799 0 R', 'premises exact PDF object evidence is preserved');
}
const zip = readCanonicalFilingFact<string>(ready.facts, CANONICAL_FILING_FACT_REFS.propertyZip);
equal(zip?.state, 'KNOWN', 'explicit ZIP is canonical supplemental fact');
if (zip?.state === 'KNOWN') {
  equal(zip.value, '91203', 'ZIP value is preserved without normalization/inference');
  equal(zip.provenance.provenanceClass, 'SUPPLEMENTAL_CUSTOMER_INPUT', 'ZIP retains supplemental-customer provenance');
  equal(zip.provenance.sourcePaths[0], 'supplemental.propertyZip', 'ZIP source path is explicit');
}

const courtCounty = ready.result.fieldWritePlan.find(item => item.fieldId.endsWith('CourtInfo[0].CrtCounty_ft[0]'));
equal(courtCounty?.action, 'WRITE_TEXT', 'selected filing court supplies caption court county');
if (courtCounty?.action === 'WRITE_TEXT') equal(courtCounty.value, 'Los Angeles', 'court county comes from selectedFilingCourt, not property.county inference');
const courtBranch = ready.result.fieldWritePlan.find(item => item.fieldId.endsWith('CourtInfo[0].Branch_ft[0]'));
if (courtBranch?.action === 'WRITE_TEXT') equal(courtBranch.value, 'Stanley Mosk Courthouse', 'selected court branch is preserved exactly');

const cityCheckbox = ready.result.fieldWritePlan.find(item => item.objectReference === '797 0 R');
const unincorporatedCheckbox = ready.result.fieldWritePlan.find(item => item.objectReference === '795 0 R');
equal(cityCheckbox?.action, 'SET_SELECTED', 'resolved governed municipal control selects city-limits checkbox');
equal(unincorporatedCheckbox?.action, 'SET_EXPLICIT_NONSELECTION', 'resolved mutually exclusive control explicitly represents nonselection');
const complaint = ready.result.fieldWritePlan.find(item => item.objectReference === '833 0 R');
const amended = ready.result.fieldWritePlan.find(item => item.objectReference === '834 0 R');
equal(complaint?.action, 'SET_SELECTED', 'authoritative initial lifecycle selects original complaint');
equal(amended?.action, 'SET_EXPLICIT_NONSELECTION', 'authoritative initial lifecycle permits explicit amended nonselection');

const noWrites = ready.result.fieldWritePlan.filter(item => item.action === 'PRESERVE_OFFICIAL_BLANK_NO_WRITE');
ok(noWrites.some(item => item.objectReference === '856 0 R'), 'pre-filing case number is explicit zero-write');
ok(noWrites.some(item => item.objectReference === '865 0 R'), 'signature date is explicit zero-write');
ok(noWrites.some(item => item.objectReference === '882 0 R'), 'attachment count is explicit zero-write');
ok(noWrites.some(item => item.objectReference === '877 0 R'), 'paid UDA/LDA registration credential remains explicit zero-write');
const uniqueFields = new Set(ready.result.fieldWritePlan.map(item => item.fieldId));
equal(uniqueFields.size, ready.result.fieldWritePlan.length, 'successful whitelist contains no duplicate/conflicting field actions');

const agreedRentField = 'UD-100[0].Page2[0].List6[0].SubList6[0].Lia[0].SubLista[0].Li2[0].dollar[0]';
ok(!ready.result.fieldWritePlan.some(item => item.fieldId === agreedRentField), 'page-2 agreed-rent field is not populated from Notice demand');
ok(UD100_PROHIBITED_SEMANTIC_SUBSTITUTIONS.some(item => 'fieldId' in item && item.fieldId === agreedRentField && item.prohibitedSourceRef === CANONICAL_FILING_FACT_REFS.rentDemandTotal), 'agreed-rent prohibition is explicit and evidence-bound');
ok(!UD100_GENERATION_BINDING.fieldRules.some(rule => rule.disposition === 'WRITE' && rule.dependencies.some(dep => dep.ref === CANONICAL_FILING_FACT_REFS.rentDemandTotal)), 'Notice demand is not reused for complaint/agreement/damages semantics');

for (const propertyZip of [
  undefined,
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'confirm ZIP' } as const,
  { state: 'CONFLICT', values: ['91203', '91204'], reason: 'ZIP conflict' } as const,
]) {
  const input = supplemental({ propertyZip });
  const result = evaluate(input).result;
  equal(result.status, 'BLOCKED', `${propertyZip?.state ?? 'missing'} ZIP blocks premises write`);
}
const blankZip = evaluate(supplemental({ propertyZip: { state: 'KNOWN', value: '   ' } })).result;
equal(blankZip.status, 'BLOCKED', 'blank KNOWN ZIP cannot masquerade as a value');

const noUnitBase: NoticeFlowData = { ...base, propertyUnit: undefined };
const noUnitApproved: NoticeFlowData = { ...noUnitBase, ...bindReviewApproval(noUnitBase, '2026-08-14T12:10:00.000Z') };
const noUnitArtifact = captureCreatedNoticeArtifact(noUnitApproved, '2026-08-14T12:11:00.000Z', {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const noUnitPersisted: NoticeFlowData = {
  ...noUnitApproved,
  productionSnapshot: {
    ...persisted.productionSnapshot!,
    producedAtISO: '2026-08-14T12:11:00.000Z',
  },
  createdNoticeArtifact: noUnitArtifact,
};
const noUnitFacts = projectFilingCanonicalFacts(noUnitPersisted, supplemental());
const noUnitResult = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', noUnitFacts);
equal(noUnitResult.status, 'GENERATION_BINDING_READY', 'already-governed optional unit may be UNANSWERED without authorizing ZIP omission');
if (noUnitResult.status === 'GENERATION_BINDING_READY') {
  const noUnitPremises = noUnitResult.fieldWritePlan.find(item => item.objectReference === '799 0 R');
  if (noUnitPremises?.action === 'WRITE_TEXT') equal(noUnitPremises.value, '100 Binding Ave, Glendale, 91203, Los Angeles', 'optional unit omission changes only punctuation/composition');
}
const noUnitNoZip = projectFilingCanonicalFacts(noUnitPersisted, supplemental({ propertyZip: { state: 'UNANSWERED' } }));
equal(evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', noUnitNoZip).status, 'BLOCKED', 'optional unit semantics never authorize missing ZIP');

const zipChanged = evaluate(supplemental({ propertyZip: { state: 'KNOWN', value: '91204' } })).result;
if (zipChanged.status !== 'GENERATION_BINDING_READY') throw new Error('changed ZIP fixture must still resolve');
notEqual(zipChanged.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'ZIP value change changes referenced-fact identity');
notEqual(zipChanged.generationInputId, ready.result.generationInputId, 'ZIP value change changes generation-input identity');

const confirmationChanged = evaluate(supplemental({
  preparation: {
    selectedFilingCourt: { state: 'KNOWN', value: selectedCourt, confirmation: { ...confirmation, confirmationId: 'court-confirm-2' } },
  },
})).result;
if (confirmationChanged.status !== 'GENERATION_BINDING_READY') throw new Error('confirmation-change fixture must resolve');
notEqual(confirmationChanged.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'legal-election confirmation provenance changes identity even with same visible court values');

const controlProvenanceChanged = evaluate(supplemental({
  preparation: {
    municipalClassification: { state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', control: control('municipal-classification', 'municipal-city-second-evidence') },
  },
})).result;
if (controlProvenanceChanged.status !== 'GENERATION_BINDING_READY') throw new Error('control provenance fixture must resolve');
notEqual(controlProvenanceChanged.referencedFactSnapshotId, ready.result.referencedFactSnapshotId, 'governed-control result provenance changes identity even when selected checkbox output is unchanged');

const unconfirmedCourt = evaluate(supplemental({
  preparation: { selectedFilingCourt: { state: 'KNOWN', value: selectedCourt } },
})).result;
equal(unconfirmedCourt.status, 'BLOCKED', 'KNOWN legal election without affirmative confirmation provenance blocks');
const missingCourt = evaluate(supplemental({ preparation: { selectedFilingCourt: { state: 'UNANSWERED' } } })).result;
equal(missingCourt.status, 'BLOCKED', 'property county cannot substitute for missing selected filing court');

const staleMunicipal = evaluate(supplemental({
  preparation: {
    municipalClassification: { state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', control: control('municipal-classification', 'stale', 'STALE') },
  },
})).result;
equal(staleMunicipal.status, 'BLOCKED', 'stale governed municipal control cannot authorize checkboxes');
const bareLifecycle = evaluate(supplemental({
  preparation: { initialComplaintLifecycle: { state: 'KNOWN', value: 'INITIAL_PREFILING' } },
})).result;
equal(bareLifecycle.status, 'BLOCKED', 'lifecycle fact without authoritative source/event identity blocks');

const outsideAttorney = evaluate(supplemental({
  preparation: {
    captionRouteControl: { state: 'KNOWN', value: 'OUTSIDE_ATTORNEY_UNSUPPORTED', control: control('caption-route', 'outside-attorney') },
  },
})).result;
equal(outsideAttorney.status, 'BLOCKED', 'outside-attorney caption route hard-blocks current profile');
const priorComplaint = evaluate(supplemental({
  preparation: {
    initialComplaintLifecycle: { state: 'KNOWN', value: 'PRIOR_COMPLAINT_EXISTS', event: { ...event, eventId: 'prior-complaint' } },
  },
})).result;
equal(priorComplaint.status, 'BLOCKED', 'amended/prior-complaint path hard-blocks current initial profile');
const unsupportedJurisdiction = evaluate(supplemental({
  preparation: {
    jurisdictionSupportControl: { state: 'KNOWN', value: 'UNSUPPORTED', control: control('jurisdiction-support', 'unsupported') },
  },
})).result;
equal(unsupportedJurisdiction.status, 'BLOCKED', 'unsupported jurisdiction/control state hard-blocks');

for (const scenario of ['MODEL_DRAFTED_OPEN_ENDED_ALLEGATION', 'PAID_COMPLIANCE_PATH_BEFORE_ACTIVATION']) {
  const facts = projectFilingCanonicalFacts(persisted, supplemental());
  equal(
    evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts, { unsupportedScenarios: [scenario] }).status,
    'BLOCKED',
    `${scenario} hard-blocks with no fallback/default`,
  );
}

for (const health of [undefined, 'STALE', 'CHANGED', 'UNAVAILABLE', 'UNRESOLVED'] as const) {
  equal(evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, health, ready.facts).status, 'BLOCKED', `${health ?? 'missing'} exact-source health blocks`);
}
const wrongBytes = {
  ...UD100_OFFICIAL_SOURCE_IDENTITY,
  repositorySha256: '0'.repeat(64),
  sourceSnapshotId: `sha256:${'0'.repeat(64)}`,
  artifactId: `ca_judicial_council:UD-100:2026-07-01:sha256:${'0'.repeat(64)}`,
};
equal(evaluateUd100GenerationBinding(wrongBytes, 'CURRENT', ready.facts).status, 'BLOCKED', 'same revision with different exact bytes blocks');

const sourceText = readFileSync(new URL('./ud100GenerationBinding.ts', import.meta.url), 'utf8');
ok(!/pdf-lib|writeFile|appendFile|fetch\(|XMLHttpRequest|supabase|database|localStorage|sessionStorage|FormData|model\.generate|signDocument|fileDocument|serveDocument/.test(sourceText), 'D.1 profile has no PDF mutation, network, persistence, provider/model, signing, filing, or service path');

console.log(`ud100GenerationBinding: ${passed} assertions passed`);
