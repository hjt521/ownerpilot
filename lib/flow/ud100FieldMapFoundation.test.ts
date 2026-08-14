import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { projectFilingCanonicalFacts } from './filingCanonicalFacts';
import {
  evaluateUd100FieldMapFoundation,
  UD100_ACROFORM_EVIDENCE,
  UD100_FIELD_MAP_FOUNDATION,
  UD100_FIELD_MAP_FOUNDATION_STATUS,
  UD100_OFFICIAL_SOURCE_IDENTITY,
  UD100_SOURCE_SHA256,
} from './ud100FieldMapFoundation';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const deepEqual = (actual: unknown, expected: unknown, message: string) => { assert.deepEqual(actual, expected, message); passed += 1; };

const registeredPdfPath = 'docs/legal/official-forms/california/judicial-council/UD-100/2026-07-01/UD-100.pdf';
const recomputedSha = createHash('sha256').update(readFileSync(registeredPdfPath)).digest('hex');
equal(recomputedSha, UD100_SOURCE_SHA256, 'registered UD-100 bytes match pinned SHA-256');
equal(UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256, recomputedSha, 'map pins recomputed exact binary');
equal(UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId, `sha256:${recomputedSha}`, 'snapshot is content addressed');
equal(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath, registeredPdfPath, 'map pins registered path');
equal(UD100_FIELD_MAP_FOUNDATION_STATUS, 'PARTIAL FOUNDATION ONLY / NOT GENERATION READY', 'exemplar is not generation ready');
ok(UD100_ACROFORM_EVIDENCE.length >= 3 && UD100_ACROFORM_EVIDENCE.length <= 8, 'partial field count is bounded');
equal(UD100_FIELD_MAP_FOUNDATION.bindings.length, UD100_ACROFORM_EVIDENCE.length, 'each selected field has one binding');
equal(new Set(UD100_ACROFORM_EVIDENCE.map(item => item.fieldId)).size, UD100_ACROFORM_EVIDENCE.length, 'selected ids are unique');

deepEqual(
  UD100_ACROFORM_EVIDENCE.map(item => [item.fieldId, item.alternateName, item.sourcePage, item.objectReference]),
  [
    ['UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party1_ft[0]', 'PLAINTIFF:', 1, '836 0 R'],
    ['UD-100[0].Page1[0].P1Caption[0].TitlePartyName[0].Party2_ft[0]', 'DEFENDANT:', 1, '837 0 R'],
    ['UD-100[0].Page1[0].List1[0].FillText1[0]', 'PLAINTIFF (name each):', 1, '817 0 R'],
    ['UD-100[0].Page1[0].List1[0].FillText2[0]', 'alleges causes of action against DEFENDANT (name each):', 1, '818 0 R'],
    ['UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party1_ft[0]', 'PLAINTIFF:', 2, '776 0 R'],
    ['UD-100[0].Page2[0].Header[0].TitlePartyName[0].Party2_ft[0]', 'DEFENDANT:', 2, '777 0 R'],
  ],
  'field ids, labels, pages, and object references remain locked',
);

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Foundation Ave',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  rentPeriods: [{ periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 1000 }],
  landlordIdentity: { type: 'entity', entityLegalName: 'Synthetic Owner LLC', entityType: 'llc', managementType: 'member-managed' },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = { ...base, ...bindReviewApproval(base, '2026-08-13T20:00:00.000Z') };
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-13T20:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-14', compliancePeriodEndDate: '2026-08-18',
});
const facts = projectFilingCanonicalFacts(artifact);
const evaluation = evaluateUd100FieldMapFoundation(UD100_OFFICIAL_SOURCE_IDENTITY, facts);
equal(evaluation.status, 'RESOLVED_MAPPING', 'exact identity plus exact facts resolves inert candidates');
if (evaluation.status === 'RESOLVED_MAPPING') {
  equal(evaluation.formApplicability, 'NOT_EVALUATED', 'map does not decide applicability');
  equal(evaluation.formRequiredness, 'NOT_EVALUATED', 'map does not decide requiredness');
  equal(evaluation.fieldPopulation, 'NOT_PERFORMED', 'map does not populate fields');
  equal(evaluation.documentGeneration, 'NOT_PERFORMED', 'map does not generate documents');
  ok(evaluation.mappings.some(mapping => mapping.mappingClass === 'DETERMINISTIC_DERIVATION'), 'derived provenance is represented');
  ok(evaluation.mappings.some(mapping => mapping.mappingClass === 'DIRECT_FROZEN_FACT'), 'direct frozen provenance is represented');
  for (const mapping of evaluation.mappings) {
    equal(mapping.state, 'CANDIDATE_VALUE', `${mapping.fieldId} remains a candidate only`);
    if (mapping.state === 'CANDIDATE_VALUE') {
      equal(mapping.provenance.createdNotice.generation, artifact.generation, 'candidate preserves exact Created Notice generation');
      equal(mapping.provenance.createdNotice.createdAtISO, artifact.createdAtISO, 'candidate preserves exact Created Notice time');
    }
  }
}

const wrongBytes = {
  ...UD100_OFFICIAL_SOURCE_IDENTITY,
  repositorySha256: '0'.repeat(64), sourceSnapshotId: `sha256:${'0'.repeat(64)}`,
  artifactId: `ca_judicial_council:UD-100:2026-07-01:sha256:${'0'.repeat(64)}`,
};
equal(evaluateUd100FieldMapFoundation(wrongBytes, facts).status, 'BLOCKED', 'same revision different bytes fails closed');
const sourceText = readFileSync(new URL('./ud100FieldMapFoundation.ts', import.meta.url), 'utf8');
ok(!/UD-101|SUM-130|CM-010|LACIV109|CIV312|POS-010|CP10\.5/.test(sourceText), 'exemplar maps no other form');
ok(!/fetch\(|writeFile|appendFile|pdf-lib|supabase|database|localStorage|sessionStorage|XMLHttpRequest|FormData/.test(sourceText), 'foundation has no network, persistence, database, or PDF-write path');

console.log(`ud100FieldMapFoundation: ${passed} assertions passed`);
