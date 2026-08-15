import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFName,
  PDFString,
  PDFTextField,
} from 'pdf-lib';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  type FilingCanonicalFactsProjection,
  type FilingCanonicalFactsSupplementalInput,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import {
  computePreparationRuntimeManifestId,
  evaluateOfficialFormGeneratedDraftCurrentness,
  generateOfficialFormGeneratedDraft,
  sha256Bytes,
  type FormPreparationAuthorization,
  type OfficialGeneratedDraftDefinition,
  type PreparationRuntimeManifest,
} from './officialFormGeneratedDraft';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import {
  evaluateUd100GenerationBinding,
  UD100_GENERATION_BINDING,
  UD100_GENERATOR_CONTRACT_VERSION,
} from './ud100GenerationBinding';
import {
  evaluateUd100GeneratedDraftCurrentness,
  generateUd100GeneratedDraft,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  UD100_PREPARATION_RUNTIME_MANIFEST,
  UD100_PREPARATION_RUNTIME_MANIFEST_ID,
  UD100_PREPARATION_RUNTIME_PATH,
} from './ud100GeneratedDraft';

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

const confirmation = (id: string) => ({
  confirmationId: id,
  confirmedAtISO: '2026-08-14T12:02:00.000Z',
});
const selectedCourt = {
  county: 'Los Angeles',
  streetAddress: '111 N Hill St',
  mailingAddress: '111 N Hill St',
  cityAndZip: 'Los Angeles, CA 90012',
  branchName: 'Stanley Mosk Courthouse',
};
const control = (
  controlId: string,
  resultId: string,
  status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED' = 'CURRENT',
) => ({
  controlId,
  controlVersion: '1.0.0',
  resultId,
  status,
});
const event = (eventType: string, eventId: string) => ({
  sourceId: 'case-lifecycle',
  eventId,
  eventType,
});
const allOptionalReliefFalse = {
  fairRentalValue: false,
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
};

function supplemental(
  overrides: Partial<FilingCanonicalFactsSupplementalInput> = {},
): FilingCanonicalFactsSupplementalInput {
  const baseSupplemental: FilingCanonicalFactsSupplementalInput = {
    propertyZip: { state: 'KNOWN', value: '91203' },
    preparation: {
      selectedFilingCourt: {
        state: 'KNOWN',
        value: selectedCourt,
        confirmation: confirmation('court-confirm-1'),
      },
      municipalClassification: {
        state: 'KNOWN',
        value: 'WITHIN_CITY_LIMITS',
        control: control('municipal-classification', 'municipal-city'),
      },
      initialComplaintLifecycle: {
        state: 'KNOWN',
        value: 'INITIAL_PREFILING',
        event: event('INITIAL_COMPLAINT_STATUS', 'prefiling-1'),
      },
      captionRouteControl: {
        state: 'KNOWN',
        value: 'SELF_REPRESENTED_SUPPORTED',
        control: control('caption-route', 'self-represented'),
      },
      jurisdictionSupportControl: {
        state: 'KNOWN',
        value: 'SUPPORTED_INITIAL_UD100',
        control: control('jurisdiction-support', 'supported'),
      },
      plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
      plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
      plaintiffStandingControl: {
        state: 'KNOWN',
        value: 'SUPPORTED',
        control: control('plaintiff-standing', 'supported'),
        dependencies: [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType],
      },
      dbaUse: { state: 'KNOWN', value: 'NO_DBA' },
      doeElection: {
        state: 'KNOWN',
        value: { include: false },
        confirmation: confirmation('doe-no'),
      },
      filerContact: {
        state: 'KNOWN',
        value: {
          name: 'Synthetic Owner',
          streetAddress: '100 Binding Ave',
          city: 'Glendale',
          state: 'CA',
          zip: '91203',
          telephone: '5555550100',
          email: 'owner@example.test',
          captionForText: 'Synthetic Owner',
        },
      },
      captionOptionalFieldsControl: {
        state: 'KNOWN',
        value: 'SELF_REP_NO_BAR_FIRM_FAX',
        control: control('caption-optional-fields', 'self-rep-optional'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
      },
      premisesAge: { state: 'KNOWN', value: '1990' },
      tpaClassificationControl: {
        state: 'KNOWN',
        value: 'SUBJECT_AT_FAULT',
        control: control('tpa-classification', 'subject-at-fault'),
      },
      localControl: {
        state: 'KNOWN',
        value: 'NOT_SUBJECT',
        control: control('local-rent-control', 'not-subject'),
      },
      civilClassificationControl: {
        state: 'KNOWN',
        value: 'LIMITED_LE_10000',
        control: control('civil-classification', 'limited-le-10000'),
        dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
      },
      leaseStatus: { state: 'KNOWN', value: 'NO_AGREEMENT' },
      leaseApplicabilityControl: {
        state: 'KNOWN',
        value: 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE',
        control: control('lease-applicability', 'not-applicable'),
        dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
      },
      noticeComplaintElection: {
        state: 'KNOWN',
        value: 'PAY_RENT_OR_QUIT_3_DAY',
        confirmation: confirmation('notice-election-pay-rent'),
      },
      noticeElectionConsistencyControl: {
        state: 'KNOWN',
        value: 'CONSISTENT',
        control: control('notice-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.noticeComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
      },
      serviceComplaintElection: {
        state: 'KNOWN',
        value: 'PERSONAL_HAND_DELIVERY',
        confirmation: confirmation('service-election-personal'),
      },
      serviceElectionConsistencyControl: {
        state: 'KNOWN',
        value: 'CONSISTENT',
        control: control('service-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
      },
      serviceFacts: {
        state: 'KNOWN',
        value: {
          defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
          serviceDate: '2026-08-14',
          noticeExpirationDate: '2026-08-19',
          serviceMethod: 'PERSONAL_HAND_DELIVERY',
          noticeIncludedForfeiture: false,
        },
        event: event('NOTICE_SERVICE_FACTS', 'service-1'),
      },
      rentDueAtService: { state: 'KNOWN', value: 2450 },
      fixedTermExpirationElection: {
        state: 'KNOWN',
        value: 'DO_NOT_SELECT',
        confirmation: confirmation('fixed-term-no'),
      },
      rentalAssistanceFacts: {
        state: 'KNOWN',
        value: {
          item11aReceived: false,
          item11bReceived: false,
          item11cHas: false,
          item11dHas: false,
        },
      },
      rentalAssistanceControl: {
        state: 'KNOWN',
        value: 'APPLICABLE',
        control: control('rental-assistance', 'applicable'),
        dependencies: [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts],
      },
      otherNoticesFact: { state: 'KNOWN', value: 'NO_OTHER_NOTICES' },
      pastDueRentRelief: {
        state: 'KNOWN',
        value: { selected: true, amount: 2400 },
        confirmation: confirmation('past-due-rent-relief'),
      },
      otherReliefSelections: {
        state: 'KNOWN',
        value: allOptionalReliefFalse,
        confirmation: confirmation('other-relief-none'),
      },
      udaDisclosureControl: {
        state: 'KNOWN',
        value: 'NO_COMPENSATED_ASSISTANT',
        control: control('uda-disclosure', 'no-compensated-assistant'),
      },
    },
  };
  return {
    ...baseSupplemental,
    ...overrides,
    preparation: {
      ...baseSupplemental.preparation,
      ...overrides.preparation,
    },
  };
}

function factsFor(input: FilingCanonicalFactsSupplementalInput = supplemental()): FilingCanonicalFactsProjection {
  return projectFilingCanonicalFacts(persisted, input);
}

function authorizationFor(
  facts: FilingCanonicalFactsProjection,
  overrides: Partial<FormPreparationAuthorization> = {},
): FormPreparationAuthorization {
  if (facts.status !== 'READY') throw new Error('authorization fixture requires READY facts');
  const current: FormPreparationAuthorization = {
    authorizationId: 'ud100-preparation-auth-1',
    resultId: 'ud100-preparation-result-1',
    controlId: 'ud100-form-preparation-relevance',
    controlVersion: '1.0.0',
    status: 'CURRENT',
    decision: 'FORM_RELEVANT_FOR_PREPARATION',
    target: {
      artifactId: UD100_OFFICIAL_SOURCE_IDENTITY.artifactId,
      authorityKey: UD100_OFFICIAL_SOURCE_IDENTITY.authorityKey,
      formId: UD100_OFFICIAL_SOURCE_IDENTITY.formId,
      revisionEffective: UD100_OFFICIAL_SOURCE_IDENTITY.revisionEffective,
      sourceSnapshotId: UD100_OFFICIAL_SOURCE_IDENTITY.sourceSnapshotId,
    },
    createdNoticeIdentity: facts.createdNoticeIdentity,
  };
  return {
    ...current,
    ...overrides,
    target: {
      ...current.target,
      ...(overrides.target ?? {}),
    },
    createdNoticeIdentity: {
      ...current.createdNoticeIdentity,
      ...(overrides.createdNoticeIdentity ?? {}),
    },
  };
}

const officialSourceBytes = new Uint8Array(readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath));
const preparationDerivativeBytes = new Uint8Array(readFileSync(UD100_PREPARATION_RUNTIME_PATH));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>;
};

function canonicalDefinition(expectedManifestId: string = UD100_PREPARATION_RUNTIME_MANIFEST_ID): OfficialGeneratedDraftDefinition {
  return {
    generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
    generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
    expectedSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    expectedPreparationManifestId: expectedManifestId,
    expectedMapSnapshotId: UD100_GENERATION_BINDING.mapSnapshotId,
    expectedGeneratorContractVersion: UD100_GENERATOR_CONTRACT_VERSION,
    expectedPageCount: 4,
    expectedFieldCount: 186,
  };
}

function manifestForDerivative(bytes: Uint8Array): PreparationRuntimeManifest {
  const clone = structuredClone(UD100_PREPARATION_RUNTIME_MANIFEST) as PreparationRuntimeManifest;
  const sha = sha256Bytes(bytes);
  clone.preparationSourceId = `prep-source:sha256:${sha}`;
  clone.preparationDerivative.sha256 = sha;
  clone.preparationDerivative.byteLength = bytes.byteLength;
  return clone;
}

async function generateWithCustomDerivative(
  bytes: Uint8Array,
  manifest: PreparationRuntimeManifest,
  facts: FilingCanonicalFactsProjection,
  authorization: FormPreparationAuthorization,
) {
  const definition = canonicalDefinition(computePreparationRuntimeManifestId(manifest));
  return generateOfficialFormGeneratedDraft({
    definition,
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationManifest: manifest,
    preparationDerivativeBytes: bytes,
    facts,
    preparedAtISO: '2026-08-15T05:00:00.000Z',
    evaluateBinding: () => evaluateUd100GenerationBinding(
      UD100_OFFICIAL_SOURCE_IDENTITY,
      'CURRENT',
      facts,
    ),
  });
}

(async () => {
  equal(packageJson.dependencies?.['pdf-lib'], '1.17.1', 'pdf-lib is pinned as the exact sole authorized new PDF direct dependency');
  ok(!('@pdf-lib/fontkit' in (packageJson.dependencies ?? {})), 'fontkit is not a direct dependency');
  equal(
    computePreparationRuntimeManifestId(UD100_PREPARATION_RUNTIME_MANIFEST),
    UD100_PREPARATION_RUNTIME_MANIFEST_ID,
    'committed preparation-runtime manifest matches its hard-pinned identity',
  );
  equal(
    sha256Bytes(preparationDerivativeBytes),
    UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.sha256,
    'committed preparation derivative bytes match manifest SHA-256',
  );
  equal(
    preparationDerivativeBytes.byteLength,
    UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.byteLength,
    'committed preparation derivative bytes match manifest length',
  );
  equal(
    UD100_PREPARATION_RUNTIME_MANIFEST.qpdfNormalization.intermediateSha256,
    '5c74c92fdc6eba9ae5d5018ce89be5c0f1f298e90e0cf83a362aa202b81c4058',
    'manifest retains exact XFA-bearing qpdf intermediate identity',
  );
  equal(
    UD100_PREPARATION_RUNTIME_MANIFEST.xfaDisconnection.xfaDigest,
    'xfa:sha256:eace8ea17d6efbf0b7064bf46eeea714670afd0dc67254870ddc06ad566441c3',
    'manifest retains exact source XFA digest',
  );
  equal(
    UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.fieldEquivalenceDigest,
    'field-equivalence:sha256:f863ba9ae890f57f7a00e25c26276a55d04f69e1e509b5a7df1916d47f52e13f',
    'manifest retains post-XFA 186-widget equivalence digest',
  );

  const facts = factsFor();
  equal(facts.status, 'READY', 'synthetic Created Notice plus governed preparation facts project');
  const binding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  equal(binding.status, 'GENERATION_BINDING_READY', 'fresh D.1 evaluation is READY');
  if (binding.status !== 'GENERATION_BINDING_READY') throw new Error('ready D.1 fixture required');
  equal(binding.fieldWritePlan.length, 186, 'fresh D.1 plan classifies all 186 governed widgets');
  const authorization = authorizationFor(facts);

  const preparedAtISO = '2026-08-15T05:00:00.000Z';
  const first = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
  });
  equal(first.status, 'GENERATED_DRAFT', 'exact CURRENT source/auth/facts/derivative generates a draft');
  if (first.status !== 'GENERATED_DRAFT') throw new Error(`generation failed: ${JSON.stringify(first)}`);
  equal(first.ownerReview, 'NOT_PERFORMED', 'Stage E.1 does not create owner review state');
  equal(first.signing, 'NOT_PERFORMED', 'Stage E.1 does not sign');
  equal(first.filing, 'NOT_PERFORMED', 'Stage E.1 does not file');
  equal(first.evidence.preparedAtISO, preparedAtISO, 'caller-supplied preparedAtISO is retained');
  equal(first.evidence.preparationSourceId, UD100_PREPARATION_RUNTIME_MANIFEST.preparationSourceId, 'generated evidence binds final XFA-free preparation source');
  equal(first.evidence.xfaPolicyId, 'acroform-fallback-xfa-disconnection-v1', 'generated evidence binds XFA policy');
  equal(first.evidence.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'generated evidence binds exact D.1 map');

  const second = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
  });
  equal(second.status, 'GENERATED_DRAFT', 'repeat generation succeeds');
  if (second.status !== 'GENERATED_DRAFT') throw new Error('repeat generation failed');
  equal(Buffer.compare(Buffer.from(first.bytes), Buffer.from(second.bytes)), 0, 'fixed exact inputs produce byte-identical PDF output');
  equal(second.evidence.generatedPdfSha256, first.evidence.generatedPdfSha256, 'fixed exact inputs produce identical byte hash');
  equal(second.evidence.generatedDocumentId, first.evidence.generatedDocumentId, 'fixed exact inputs produce identical generatedDocumentId');

  const laterPreparedAt = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    preparedAtISO: '2026-08-15T05:00:01.000Z',
  });
  equal(laterPreparedAt.status, 'GENERATED_DRAFT', 'second explicit preparation timestamp generates');
  if (laterPreparedAt.status !== 'GENERATED_DRAFT') throw new Error('later timestamp generation failed');
  equal(Buffer.compare(Buffer.from(first.bytes), Buffer.from(laterPreparedAt.bytes)), 0, 'preparedAtISO is identity metadata, not a hidden PDF clock mutation');
  notEqual(laterPreparedAt.evidence.generatedDocumentId, first.evidence.generatedDocumentId, 'preparedAtISO changes immutable generated identity');

  const derivativeDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const generatedDoc = await PDFDocument.load(first.bytes, { updateMetadata: false });
  equal(generatedDoc.getPageCount(), 4, 'generated PDF remains four pages');
  const generatedAcro = generatedDoc.catalog.getAcroForm();
  ok(!!generatedAcro, 'generated PDF retains existing AcroForm');
  ok(!generatedAcro!.dict.has(PDFName.of('XFA')), 'generated PDF remains XFA-free');
  const derivativeFields = new Map(derivativeDoc.getForm().getFields().map(field => [field.getName(), field]));
  const generatedFields = new Map(generatedDoc.getForm().getFields().map(field => [field.getName(), field]));
  equal(generatedFields.size, 186, 'generated PDF remains unflattened with exactly 186 fields');

  let textWrites = 0;
  let selectedWrites = 0;
  let nonselectedWrites = 0;
  let noWrites = 0;
  for (const entry of binding.fieldWritePlan) {
    const before = derivativeFields.get(entry.fieldId);
    const after = generatedFields.get(entry.fieldId);
    ok(!!before && !!after, `${entry.fieldId} exists before and after generation`);
    if (!before || !after) continue;
    if (entry.action === 'WRITE_TEXT') {
      textWrites += 1;
      ok(after instanceof PDFTextField, `${entry.fieldId} remains a text field`);
      if (after instanceof PDFTextField) equal(after.getText(), entry.value, `${entry.fieldId} reopens with exact D.1 text`);
    } else if (entry.action === 'SET_SELECTED') {
      selectedWrites += 1;
      ok(after instanceof PDFCheckBox, `${entry.fieldId} remains a checkbox`);
      if (after instanceof PDFCheckBox) equal(after.isChecked(), true, `${entry.fieldId} reopens selected`);
    } else if (entry.action === 'SET_EXPLICIT_NONSELECTION') {
      nonselectedWrites += 1;
      ok(after instanceof PDFCheckBox, `${entry.fieldId} remains a checkbox`);
      if (after instanceof PDFCheckBox) equal(after.isChecked(), false, `${entry.fieldId} reopens explicitly nonselected`);
    } else {
      noWrites += 1;
      if (before instanceof PDFTextField && after instanceof PDFTextField) {
        equal(after.getText() ?? null, before.getText() ?? null, `${entry.fieldId} no-write text state remains source-native`);
      } else if (before instanceof PDFCheckBox && after instanceof PDFCheckBox) {
        equal(after.isChecked(), before.isChecked(), `${entry.fieldId} no-write checkbox state remains source-native`);
      } else {
        equal(after.constructor.name, before.constructor.name, `${entry.fieldId} no-write control subtype remains unchanged`);
      }
    }
  }
  ok(textWrites > 0 && selectedWrites > 0 && nonselectedWrites > 0 && noWrites > 0, 'all four governed action classes are exercised');

  for (const fieldId of [
    'UD-100[0].#pageSet[0].MPLast[0].#area[0].Print[0]',
    'UD-100[0].#pageSet[0].MPLast[0].#area[0].Save[0]',
    'UD-100[0].#pageSet[0].MPLast[0].#area[0].Reset[0]',
  ]) {
    ok(derivativeFields.get(fieldId) instanceof PDFButton, `${fieldId} begins as a push-button control`);
    ok(generatedFields.get(fieldId) instanceof PDFButton, `${fieldId} remains a push-button control`);
  }

  equal(
    sha256Bytes(officialSourceBytes),
    UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256,
    'official source remains byte-identical after generation',
  );
  equal(
    sha256Bytes(preparationDerivativeBytes),
    UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.sha256,
    'preparation derivative input remains byte-identical after generation',
  );

  const wrongSourceBytes = Uint8Array.from(officialSourceBytes);
  wrongSourceBytes[0] ^= 1;
  const wrongSource = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes: wrongSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
  });
  equal(wrongSource.status, 'BLOCKED', 'changed official source bytes block before PDF mutation');
  if (wrongSource.status === 'BLOCKED') equal(wrongSource.bytes, null, 'wrong official source returns no bytes');

  for (const health of [undefined, 'STALE', 'UNRESOLVED', 'CHANGED'] as const) {
    const result = await generateUd100GeneratedDraft({
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: health,
      officialSourceBytes,
      preparationAuthorization: authorization,
      preparationDerivativeBytes,
      facts,
      preparedAtISO,
    });
    equal(result.status, 'BLOCKED', `${health ?? 'missing'} source health blocks`);
  }

  for (const badAuthorization of [
    undefined,
    authorizationFor(facts, { status: 'STALE' }),
    authorizationFor(facts, { target: { ...authorization.target, formId: 'OTHER' } }),
    authorizationFor(facts, { target: { ...authorization.target, sourceSnapshotId: 'sha256:' + '0'.repeat(64) } }),
    authorizationFor(facts, {
      createdNoticeIdentity: { ...authorization.createdNoticeIdentity, generation: 'other-created-notice' },
    }),
  ] as const) {
    const result = await generateUd100GeneratedDraft({
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: badAuthorization,
      preparationDerivativeBytes,
      facts,
      preparedAtISO,
    });
    equal(result.status, 'BLOCKED', 'missing/stale/wrong-form/wrong-source/wrong-matter authorization blocks');
    if (result.status === 'BLOCKED') equal(result.bytes, null, 'invalid authorization returns no bytes');
  }

  const blockedFacts = factsFor(supplemental({
    preparation: { serviceComplaintElection: { state: 'UNANSWERED' } },
  }));
  const blockedBinding = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorizationFor(blockedFacts),
    preparationDerivativeBytes,
    facts: blockedFacts,
    preparedAtISO,
  });
  equal(blockedBinding.status, 'BLOCKED', 'fresh D.1 BLOCKED state yields no generated bytes');
  if (blockedBinding.status === 'BLOCKED') equal(blockedBinding.bytes, null, 'D.1 blocker returns no partial bytes');

  const glyphFacts = factsFor(supplemental({
    preparation: {
      filerContact: {
        state: 'KNOWN',
        value: {
          name: 'Synthetic Owner 😀',
          streetAddress: '100 Binding Ave',
          city: 'Glendale',
          state: 'CA',
          zip: '91203',
          telephone: '5555550100',
          email: 'owner@example.test',
          captionForText: 'Synthetic Owner 😀',
        },
      },
    },
  }));
  const glyphResult = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorizationFor(glyphFacts),
    preparationDerivativeBytes,
    facts: glyphFacts,
    preparedAtISO,
  });
  equal(glyphResult.status, 'BLOCKED', 'unsupported Helvetica/WinAnsi glyph blocks generation');
  if (glyphResult.status === 'BLOCKED') {
    equal(glyphResult.blockReason, 'UNSUPPORTED_GLYPH', 'unsupported glyph has explicit blocker');
    equal(glyphResult.bytes, null, 'unsupported glyph produces no partial output');
  }

  const current = evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    draftBytes: first.bytes,
  });
  equal(current.status, 'CURRENT', 'unchanged exact source/auth/manifest/facts/generator remains CURRENT');

  equal(
    evaluateUd100GeneratedDraftCurrentness(
      { ...first.evidence, generatedDocumentId: 'generated-document:sha256:' + '0'.repeat(64) },
      {
        officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
        officialSourceHealth: 'CURRENT',
        officialSourceBytes,
        preparationAuthorization: authorization,
        preparationDerivativeBytes,
        facts,
        draftBytes: first.bytes,
      },
    ).status,
    'OUT_OF_DATE',
    'tampered generatedDocumentId evidence cannot remain CURRENT',
  );

  const changedZipFacts = factsFor(supplemental({ propertyZip: { state: 'KNOWN', value: '91204' } }));
  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorizationFor(changedZipFacts),
      preparationDerivativeBytes,
      facts: changedZipFacts,
      draftBytes: first.bytes,
    }).status,
    'OUT_OF_DATE',
    'referenced fact value drift makes generated draft OUT_OF_DATE',
  );

  const changedControlFacts = factsFor(supplemental({
    preparation: {
      civilClassificationControl: {
        state: 'KNOWN',
        value: 'LIMITED_LE_10000',
        control: control('civil-classification', 'new-current-evidence'),
        dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
      },
    },
  }));
  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorizationFor(changedControlFacts),
      preparationDerivativeBytes,
      facts: changedControlFacts,
      draftBytes: first.bytes,
    }).status,
    'OUT_OF_DATE',
    'referenced provenance/control identity drift makes generated draft OUT_OF_DATE',
  );

  const unrelatedFacts = factsFor(supplemental({
    defendantTelephones: [
      { state: 'KNOWN', value: '5555550198' },
      { state: 'KNOWN', value: '5555550199' },
    ],
  }));
  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorizationFor(unrelatedFacts),
      preparationDerivativeBytes,
      facts: unrelatedFacts,
      draftBytes: first.bytes,
    }).status,
    'CURRENT',
    'nonreferenced supplemental fact drift does not false-stale generated draft',
  );

  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'STALE',
      officialSourceBytes,
      preparationAuthorization: authorization,
      preparationDerivativeBytes,
      facts,
      draftBytes: first.bytes,
    }).status,
    'OUT_OF_DATE',
    'source health no longer CURRENT makes generated draft OUT_OF_DATE',
  );

  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: { ...authorization, resultId: 'new-preparation-result' },
      preparationDerivativeBytes,
      facts,
      draftBytes: first.bytes,
    }).status,
    'OUT_OF_DATE',
    'preparation-relevance authorization identity drift makes draft OUT_OF_DATE',
  );

  const changedDraftBytes = Uint8Array.from(first.bytes);
  changedDraftBytes[changedDraftBytes.length - 1] ^= 1;
  equal(
    evaluateUd100GeneratedDraftCurrentness(first.evidence, {
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorization,
      preparationDerivativeBytes,
      facts,
      draftBytes: changedDraftBytes,
    }).status,
    'OUT_OF_DATE',
    'generated byte drift makes evidence OUT_OF_DATE',
  );

  const driftedManifest = structuredClone(UD100_PREPARATION_RUNTIME_MANIFEST) as PreparationRuntimeManifest;
  driftedManifest.xfaDisconnection.xfaDigest = 'xfa:sha256:' + '0'.repeat(64);
  equal(
    evaluateOfficialFormGeneratedDraftCurrentness(first.evidence, {
      definition: canonicalDefinition(),
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorization,
      preparationManifest: driftedManifest,
      preparationDerivativeBytes,
      facts,
      draftBytes: first.bytes,
      evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
    }).status,
    'OUT_OF_DATE',
    'manifest/XFA provenance drift invalidates currentness',
  );

  equal(
    evaluateOfficialFormGeneratedDraftCurrentness(first.evidence, {
      definition: { ...canonicalDefinition(), generatorImplementationVersion: '2.0.0' },
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
      officialSourceHealth: 'CURRENT',
      officialSourceBytes,
      preparationAuthorization: authorization,
      preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
      preparationDerivativeBytes,
      facts,
      draftBytes: first.bytes,
      evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
    }).status,
    'OUT_OF_DATE',
    'generator implementation drift invalidates currentness',
  );

  const xfaDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const xfaAcro = xfaDoc.catalog.getAcroForm();
  if (!xfaAcro) throw new Error('canonical preparation derivative must have AcroForm');
  xfaAcro.dict.set(PDFName.of('XFA'), PDFString.of('synthetic-test-xfa'));
  const xfaBytes = await xfaDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  const xfaManifest = manifestForDerivative(xfaBytes);
  const xfaInput = await generateWithCustomDerivative(xfaBytes, xfaManifest, facts, authorization);
  equal(xfaInput.status, 'BLOCKED', 'generated-draft input with XFA present blocks before governed writes');
  if (xfaInput.status === 'BLOCKED') {
    equal(xfaInput.blockReason, 'PREPARATION_DERIVATIVE_INVALID', 'XFA-present input reaches explicit pre-write XFA blocker');
    equal(xfaInput.bytes, null, 'XFA-present input produces no bytes');
  }

  const missingDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const missingForm = missingDoc.getForm();
  missingForm.acroForm.removeField(missingForm.getFields()[0].acroField);
  const missingBytes = await missingDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  const missingResult = await generateWithCustomDerivative(
    missingBytes,
    manifestForDerivative(missingBytes),
    facts,
    authorization,
  );
  equal(missingResult.status, 'BLOCKED', 'missing exact field ID blocks with no fallback');
  if (missingResult.status === 'BLOCKED') equal(missingResult.bytes, null, 'missing field returns no partial bytes');

  const wrongTypeDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const wrongTypeForm = wrongTypeDoc.getForm();
  const textPlan = binding.fieldWritePlan.find(entry => entry.action === 'WRITE_TEXT');
  if (!textPlan) throw new Error('fixture requires text write');
  const textField = wrongTypeForm.getFields().find(field => field.getName() === textPlan.fieldId);
  if (!textField) throw new Error('fixture text field missing');
  textField.acroField.dict.set(PDFName.of('FT'), PDFName.of('Btn'));
  const wrongTypeBytes = await wrongTypeDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  const wrongTypeResult = await generateWithCustomDerivative(
    wrongTypeBytes,
    manifestForDerivative(wrongTypeBytes),
    facts,
    authorization,
  );
  equal(wrongTypeResult.status, 'BLOCKED', 'wrong runtime field type blocks rather than substituting');

  const pushDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const pushForm = pushDoc.getForm();
  const checkboxPlan = binding.fieldWritePlan.find(entry => entry.action === 'SET_SELECTED');
  if (!checkboxPlan) throw new Error('fixture requires selected checkbox');
  const checkboxField = pushForm.getFields().find(field => field.getName() === checkboxPlan.fieldId);
  if (!(checkboxField instanceof PDFCheckBox)) throw new Error('fixture selected field must be checkbox');
  checkboxField.acroField.setFlags(checkboxField.acroField.getFlags() | (1 << 16));
  const pushBytes = await pushDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  const pushResult = await generateWithCustomDerivative(
    pushBytes,
    manifestForDerivative(pushBytes),
    facts,
    authorization,
  );
  equal(pushResult.status, 'BLOCKED', 'unsupported button subtype blocks rather than applying checkbox semantics');

  console.log(`ud100GeneratedDraft tests passed: ${passed}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
