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
  computeGeneratedDocumentId,
  computePreparationRuntimeManifestId,
  evaluateOfficialFormGeneratedDraftCurrentness,
  generateOfficialFormGeneratedDraft,
  sha256Bytes,
  validateQpdfSourceAdmission,
  type FormPreparationAuthorization,
  type GeneratedDraftIdentity,
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
  UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
  UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
  UD100_GENERATED_TEXT_APPEARANCE,
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

const confirmation = (id: string) => ({ confirmationId: id, confirmedAtISO: '2026-08-14T12:02:00.000Z' });
const verification = (id: string) => ({ verificationId: id, verifiedAtISO: '2026-08-14T12:02:00.000Z' });
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
  controlVersion = '1.0.0',
) => ({ controlId, controlVersion, resultId, status });
const event = (eventType: string, eventId: string) => ({ sourceId: 'case-lifecycle', eventId, eventType });
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
      selectedFilingCourt: { state: 'KNOWN', value: selectedCourt, confirmation: confirmation('court-confirm-1') },
      municipalClassification: {
        state: 'KNOWN', value: 'WITHIN_CITY_LIMITS', control: control('municipal-classification', 'municipal-city'),
      },
      initialComplaintLifecycle: {
        state: 'KNOWN', value: 'INITIAL_PREFILING', event: event('INITIAL_COMPLAINT_STATUS', 'prefiling-1'),
      },
      captionRouteControl: {
        state: 'KNOWN', value: 'SELF_REPRESENTED_SUPPORTED', control: control('caption-route', 'self-represented'),
      },
      captionFormValueControl: {
        state: 'KNOWN', value: 'Self-represented', control: control('caption-form-value', 'self-represented-form-value'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
      },
      jurisdictionSupportControl: {
        state: 'KNOWN', value: 'SUPPORTED_INITIAL_UD100', control: control('jurisdiction-support', 'supported'),
      },
      plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
      plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
      plaintiffStandingControl: {
        state: 'KNOWN', value: 'SUPPORTED', control: control('plaintiff-standing', 'supported'),
        dependencies: [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType],
      },
      dbaUse: { state: 'KNOWN', value: 'NO_DBA' },
      doeElection: { state: 'KNOWN', value: { include: false }, confirmation: confirmation('doe-no') },
      filerContact: {
        state: 'KNOWN',
        value: {
          name: 'Synthetic Owner', streetAddress: '100 Binding Ave', city: 'Glendale', state: 'CA', zip: '91203',
          telephone: '5555550100', email: 'owner@example.test', representationStatus: 'SELF_REPRESENTED',
        },
      },
      captionOptionalFieldsControl: {
        state: 'KNOWN', value: 'SELF_REP_NO_BAR_FIRM_FAX', control: control('caption-optional-fields', 'self-rep-optional'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
      },
      premisesAge: { state: 'KNOWN', value: '1990' },
      tpaClassificationControl: {
        state: 'KNOWN', value: 'SUBJECT_AT_FAULT', control: control('tpa-classification', 'subject-at-fault'),
      },
      localControl: { state: 'KNOWN', value: 'NOT_SUBJECT', control: control('local-rent-control', 'not-subject') },
      civilClassificationControl: {
        state: 'KNOWN', value: 'LIMITED_LE_10000', control: control('civil-classification', 'limited-le-10000'),
        dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
      },
      leaseStatus: { state: 'KNOWN', value: 'NO_AGREEMENT', verification: verification('no-agreement') },
      leaseApplicabilityControl: {
        state: 'KNOWN', value: 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE',
        control: control('ud100.lease-applicability', 'not-applicable-v1.1', 'CURRENT', '1.1.0'),
        dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
      },
      noticeComplaintElection: {
        state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY', confirmation: confirmation('notice-election-pay-rent'),
      },
      noticeElectionConsistencyControl: {
        state: 'KNOWN', value: 'CONSISTENT', control: control('notice-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.noticeComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
      },
      serviceComplaintElection: {
        state: 'KNOWN', value: 'PERSONAL_HAND_DELIVERY', confirmation: confirmation('service-election-personal'),
      },
      serviceElectionConsistencyControl: {
        state: 'KNOWN', value: 'CONSISTENT', control: control('service-election-consistency', 'consistent'),
        dependencies: [CANONICAL_FILING_FACT_REFS.serviceComplaintElection, CANONICAL_FILING_FACT_REFS.serviceFacts],
      },
      serviceFacts: {
        state: 'KNOWN',
        value: {
          defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'], serviceDate: '2026-08-14',
          noticeExpirationDate: '2026-08-19', serviceMethod: 'PERSONAL_HAND_DELIVERY', noticeIncludedForfeiture: false,
        },
        event: event('NOTICE_SERVICE_FACTS', 'service-1'),
      },
      rentDueAtService: { state: 'KNOWN', value: 2450 },
      fixedTermExpirationElection: {
        state: 'KNOWN', value: 'DO_NOT_SELECT', confirmation: confirmation('fixed-term-no'),
      },
      rentalAssistanceFacts: {
        state: 'KNOWN', value: { item11aReceived: false, item11bReceived: false, item11cHas: false, item11dHas: false },
      },
      rentalAssistanceControl: {
        state: 'KNOWN', value: 'APPLICABLE', control: control('rental-assistance', 'applicable'),
        dependencies: [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts],
      },
      otherNoticesFact: { state: 'KNOWN', value: 'NO_OTHER_NOTICES' },
      pastDueRentRelief: {
        state: 'KNOWN', value: { selected: true, amount: 2400 }, confirmation: confirmation('past-due-rent-relief'),
      },
      otherReliefSelections: {
        state: 'KNOWN', value: allOptionalReliefFalse, confirmation: confirmation('other-relief-none'),
      },
      udaDisclosureControl: {
        state: 'KNOWN', value: 'NO_COMPENSATED_ASSISTANT', control: control('uda-disclosure', 'no-compensated-assistant'),
      },
    },
  };
  return {
    ...baseSupplemental,
    ...overrides,
    preparation: { ...baseSupplemental.preparation, ...overrides.preparation },
  };
}

function agreementSupplemental(): FilingCanonicalFactsSupplementalInput {
  return supplemental({
    preparation: {
      leaseStatus: { state: 'KNOWN', value: 'OTHER', verification: verification('lease-other') },
      agreementTermDescription: { state: 'KNOWN', value: 'ONE-YEAR CONTRACT', verification: verification('agreement-term') },
      agreementRentAmount: { state: 'KNOWN', value: 2500, verification: verification('agreement-rent') },
      agreementRentFrequency: { state: 'KNOWN', value: 'MONTHLY', verification: verification('agreement-frequency') },
      agreementRentDue: { state: 'KNOWN', value: 'FIRST_DAY_OF_MONTH', verification: verification('agreement-due') },
      agreementForm: { state: 'KNOWN', value: 'WRITTEN', verification: verification('agreement-form') },
      agreementParty: { state: 'KNOWN', value: 'PLAINTIFF', verification: verification('agreement-party') },
      agreementDate: { state: 'UNKNOWN' },
      leaseApplicabilityControl: {
        state: 'KNOWN', value: 'AGREEMENT_FIELDS_APPLICABLE',
        control: control('ud100.lease-applicability', 'agreement-applicable-v1.1', 'CURRENT', '1.1.0'),
        dependencies: [CANONICAL_FILING_FACT_REFS.leaseStatus],
      },
    },
  });
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
    authorizationId: 'ud100-preparation-auth-1', resultId: 'ud100-preparation-result-1',
    controlId: 'ud100-form-preparation-relevance', controlVersion: '1.0.0', status: 'CURRENT',
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
    ...current, ...overrides,
    target: { ...current.target, ...(overrides.target ?? {}) },
    createdNoticeIdentity: { ...current.createdNoticeIdentity, ...(overrides.createdNoticeIdentity ?? {}) },
  };
}

const officialSourceBytes = new Uint8Array(readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath));
const preparationDerivativeBytes = new Uint8Array(readFileSync(UD100_PREPARATION_RUNTIME_PATH));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> };

function canonicalDefinition(expectedManifestId: string = UD100_PREPARATION_RUNTIME_MANIFEST_ID): OfficialGeneratedDraftDefinition {
  return {
    generatorImplementationId: UD100_GENERATED_DRAFT_IMPLEMENTATION_ID,
    generatorImplementationVersion: UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION,
    expectedSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    expectedArtifactRole: UD100_GENERATED_DRAFT_ARTIFACT_ROLE,
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
    evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
  });
}

const BLUE_OPERATOR = '0 0 1 rg';
const FONT_SIZE_REGEX = /\/([^\0\t\n\f\r\ ]+)[\0\t\n\f\r\ ]+(\d*\.\d+|\d+)[\0\t\n\f\r\ ]+Tf/g;
function lastFontSize(appearance: string | undefined): number | undefined {
  if (!appearance) return undefined;
  let size: number | undefined;
  for (const match of appearance.matchAll(FONT_SIZE_REGEX)) {
    const parsed = Number(match[2]);
    if (Number.isFinite(parsed)) size = parsed;
  }
  return size;
}
function widgetFontSizes(field: PDFTextField): readonly number[] {
  const fieldSize = lastFontSize(field.acroField.getDefaultAppearance());
  return field.acroField.getWidgets().map((widget, index) => {
    const size = lastFontSize(widget.getDefaultAppearance()) ?? fieldSize;
    if (size === undefined || size <= 0) throw new Error(`${field.getName()} widget ${index} has no positive resolved font size`);
    return size;
  });
}
function hasBlueAppearance(field: PDFTextField | PDFCheckBox): boolean {
  return (field.acroField.getDefaultAppearance() ?? '').includes(BLUE_OPERATOR)
    && field.acroField.getWidgets().every(widget => (widget.getDefaultAppearance() ?? '').includes(BLUE_OPERATOR));
}
function pageContentsIdentity(document: PDFDocument): readonly (string | null)[] {
  return document.getPages().map(page => page.node.get(PDFName.of('Contents'))?.toString() ?? null);
}
function fieldForObjectReference(
  binding: Extract<ReturnType<typeof evaluateUd100GenerationBinding>, { status: 'GENERATION_BINDING_READY' }>,
  fields: Map<string, ReturnType<PDFDocument['getForm']>['getFields'] extends () => infer _R ? never : never>,
  _objectReference: string,
): never {
  throw new Error('unreachable helper declaration');
}

(async () => {
  equal(packageJson.dependencies?.['pdf-lib'], '1.17.1', 'pdf-lib remains pinned to exact 1.17.1');
  ok(!('@pdf-lib/fontkit' in (packageJson.dependencies ?? {})), 'fontkit is not a direct dependency');
  equal(UD100_GENERATED_DRAFT_IMPLEMENTATION_VERSION, '1.3.0', 'UD-100 generated-draft implementation version is 1.3.0');
  equal(UD100_GENERATED_TEXT_APPEARANCE.colorSpace, 'DeviceRGB', 'UD-100 generated text uses DeviceRGB');
  equal(UD100_GENERATED_TEXT_APPEARANCE.rgb[0], 0, 'UD-100 generated red component is 0');
  equal(UD100_GENERATED_TEXT_APPEARANCE.rgb[1], 0, 'UD-100 generated green component is 0');
  equal(UD100_GENERATED_TEXT_APPEARANCE.rgb[2], 1, 'UD-100 generated blue component is 1');
  equal(UD100_GENERATED_TEXT_APPEARANCE.sizing, 'SHRINK_ONLY', 'UD-100 generated text sizing is shrink-only');
  equal(UD100_GENERATED_TEXT_APPEARANCE.maxFontSize, 9, 'UD-100 generated text is capped at exactly 9pt');
  equal(computePreparationRuntimeManifestId(UD100_PREPARATION_RUNTIME_MANIFEST), UD100_PREPARATION_RUNTIME_MANIFEST_ID, 'committed preparation-runtime manifest identity is exact');
  equal(sha256Bytes(preparationDerivativeBytes), UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.sha256, 'preparation derivative matches manifest SHA-256');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.schemaVersion, 2, 'manifest uses dual-pass evidence schema');
  equal(validateQpdfSourceAdmission(UD100_PREPARATION_RUNTIME_MANIFEST.sourceAdmission).status, 'VALID', 'source admission remains valid');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.sourceAdmission.passA.exitCode, 3, 'Pass A remains warning exit 3');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.sourceAdmission.passB.exitCode, 3, 'Pass B remains warning exit 3');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.sourceAdmission.passA.warningInventoryDigest, UD100_PREPARATION_RUNTIME_MANIFEST.sourceAdmission.passB.warningInventoryDigest, 'Pass A/B warning inventories remain independently equal');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.admission, 'VERIFIED_PREPARATION_FIELD_EQUIVALENT', 'preparation derivative admission is unchanged');
  equal(preparationDerivativeBytes.byteLength, UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.byteLength, 'preparation derivative byte length is unchanged');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.qpdfNormalization.intermediateSha256, '5c74c92fdc6eba9ae5d5018ce89be5c0f1f298e90e0cf83a362aa202b81c4058', 'qpdf intermediate identity is unchanged');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.xfaDisconnection.xfaDigest, 'xfa:sha256:eace8ea17d6efbf0b7064bf46eeea714670afd0dc67254870ddc06ad566441c3', 'XFA digest is unchanged');
  equal(UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.fieldEquivalenceDigest, 'field-equivalence:sha256:f863ba9ae890f57f7a00e25c26276a55d04f69e1e509b5a7df1916d47f52e13f', '186-widget field-equivalence digest is unchanged');

  const facts = factsFor();
  equal(facts.status, 'READY', 'verified NO_AGREEMENT baseline projects');
  const binding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  equal(binding.status, 'GENERATION_BINDING_READY', 'baseline D.1 evaluation is READY');
  if (binding.status !== 'GENERATION_BINDING_READY') throw new Error('ready D.1 fixture required');
  equal(binding.fieldWritePlan.length, 186, 'D.1 plan still classifies all 186 governed widgets');
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
  equal(first.evidence.artifactClass, 'GENERATED_DRAFT', 'generated evidence remains GENERATED_DRAFT');
  equal(first.evidence.artifactRole, 'OWNER_GENERATED_PREPARATION', 'artifact role remains OWNER_GENERATED_PREPARATION');
  equal(first.ownerReview, 'NOT_PERFORMED', 'generation does not create owner review state');
  equal(first.signing, 'NOT_PERFORMED', 'generation does not sign');
  equal(first.filing, 'NOT_PERFORMED', 'generation does not file');
  equal(first.evidence.preparedAtISO, preparedAtISO, 'preparedAtISO is retained');
  equal(first.evidence.preparationSourceId, UD100_PREPARATION_RUNTIME_MANIFEST.preparationSourceId, 'evidence binds XFA-free preparation source');
  equal(first.evidence.xfaPolicyId, 'acroform-fallback-xfa-disconnection-v1', 'evidence binds XFA policy');
  equal(first.evidence.mapSnapshotId, UD100_GENERATION_BINDING.mapSnapshotId, 'evidence binds exact D.1 map');

  const postGenerationBinding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts);
  equal(postGenerationBinding.status, 'GENERATION_BINDING_READY', 'presentation generation does not alter semantic binding readiness');
  if (postGenerationBinding.status !== 'GENERATION_BINDING_READY') throw new Error('post-generation D.1 binding must remain READY');
  equal(JSON.stringify(postGenerationBinding.fieldWritePlan), JSON.stringify(binding.fieldWritePlan), 'presentation generation leaves semantic field/election write plan byte-for-byte JSON identical');

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
  equal(JSON.stringify(pageContentsIdentity(generatedDoc)), JSON.stringify(pageContentsIdentity(derivativeDoc)), 'static page content references remain unchanged while generated appearances change');

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
      if (after instanceof PDFTextField) {
        equal(after.getText(), entry.value, `${entry.fieldId} reopens with exact D.1 text`);
        ok(hasBlueAppearance(after), `${entry.fieldId} reopens with exact DeviceRGB 0 0 1 generated-text appearance`);
        for (const size of widgetFontSizes(after)) ok(size <= 9, `${entry.fieldId} generated text never exceeds 9pt`);
      }
    } else if (entry.action === 'SET_SELECTED') {
      selectedWrites += 1;
      ok(after instanceof PDFCheckBox, `${entry.fieldId} remains a checkbox`);
      if (after instanceof PDFCheckBox) {
        equal(after.isChecked(), true, `${entry.fieldId} reopens selected`);
        ok(hasBlueAppearance(after), `${entry.fieldId} selected mark is driven by exact DeviceRGB 0 0 1 appearance`);
      }
    } else if (entry.action === 'SET_EXPLICIT_NONSELECTION') {
      nonselectedWrites += 1;
      ok(after instanceof PDFCheckBox, `${entry.fieldId} remains a checkbox`);
      if (after instanceof PDFCheckBox) {
        equal(after.isChecked(), false, `${entry.fieldId} reopens explicitly nonselected`);
        ok(hasBlueAppearance(after), `${entry.fieldId} generated checkbox appearance policy remains exact DeviceRGB 0 0 1`);
      }
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
  equal(sha256Bytes(officialSourceBytes), UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256, 'official source remains byte-identical after generation');
  equal(sha256Bytes(preparationDerivativeBytes), UD100_PREPARATION_RUNTIME_MANIFEST.preparationDerivative.sha256, 'preparation derivative input remains byte-identical after generation');

  const genericNoColor = await generateOfficialFormGeneratedDraft({
    definition: canonicalDefinition(),
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
    evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
  });
  equal(genericNoColor.status, 'GENERATED_DRAFT', 'generic definition without appearance policy retains prior generation behavior');
  if (genericNoColor.status !== 'GENERATED_DRAFT') throw new Error('no-color generic fixture must generate');
  const genericDoc = await PDFDocument.load(genericNoColor.bytes, { updateMetadata: false });
  const genericFields = new Map(genericDoc.getForm().getFields().map(field => [field.getName(), field]));
  const firstTextEntry = binding.fieldWritePlan.find(entry => entry.action === 'WRITE_TEXT');
  if (!firstTextEntry) throw new Error('baseline requires at least one text write');
  const genericText = genericFields.get(firstTextEntry.fieldId);
  ok(genericText instanceof PDFTextField, 'generic no-policy output retains text field');
  if (genericText instanceof PDFTextField) ok(!hasBlueAppearance(genericText), 'generic definition without appearance policy is not silently recolored blue');

  const uncappedAutoFit = await generateOfficialFormGeneratedDraft({
    definition: {
      ...canonicalDefinition(),
      generatedTextAppearance: { ...UD100_GENERATED_TEXT_APPEARANCE, maxFontSize: 500 },
    },
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
    evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
  });
  equal(uncappedAutoFit.status, 'GENERATED_DRAFT', 'same semantic write plan generates an uncapped native auto-fit diagnostic');
  if (uncappedAutoFit.status !== 'GENERATED_DRAFT') throw new Error('uncapped auto-fit diagnostic must generate');
  const uncappedDoc = await PDFDocument.load(uncappedAutoFit.bytes, { updateMetadata: false });
  const uncappedFields = new Map(uncappedDoc.getForm().getFields().map(field => [field.getName(), field]));
  let exactNineCount = 0;
  let shrinkCount = 0;
  for (const entry of binding.fieldWritePlan) {
    if (entry.action !== 'WRITE_TEXT') continue;
    const capped = generatedFields.get(entry.fieldId);
    const native = uncappedFields.get(entry.fieldId);
    ok(capped instanceof PDFTextField && native instanceof PDFTextField, `${entry.fieldId} exists as text in capped and uncapped presentation diagnostics`);
    if (!(capped instanceof PDFTextField) || !(native instanceof PDFTextField)) continue;
    equal(capped.getText(), entry.value, `${entry.fieldId} capped presentation retains complete exact governed value`);
    equal(native.getText(), entry.value, `${entry.fieldId} uncapped diagnostic retains same complete governed value`);
    const cappedSizes = widgetFontSizes(capped);
    const nativeSizes = widgetFontSizes(native);
    equal(cappedSizes.length, nativeSizes.length, `${entry.fieldId} widget count is presentation-invariant`);
    for (let index = 0; index < cappedSizes.length; index += 1) {
      const expected = Math.min(nativeSizes[index], 9);
      equal(cappedSizes[index], expected, `${entry.fieldId} widget ${index} is exactly min(native-fit, 9pt)`);
      if (nativeSizes[index] >= 9) {
        equal(cappedSizes[index], 9, `${entry.fieldId} widget ${index} uses the 9pt base size when shrink is unnecessary`);
        exactNineCount += 1;
      } else {
        equal(cappedSizes[index], nativeSizes[index], `${entry.fieldId} widget ${index} shrinks only to the native necessary fit`);
        shrinkCount += 1;
      }
    }
  }
  ok(exactNineCount > 0, 'fixture exercises normal populated values at exactly 9pt');
  ok(shrinkCount > 0, 'fixture exercises deterministic shrink below 9pt only where native fit requires it');

  const agreementFacts = factsFor(agreementSupplemental());
  equal(agreementFacts.status, 'READY', 'verified one-year agreement projects canonical facts');
  const agreementBinding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', agreementFacts);
  equal(agreementBinding.status, 'GENERATION_BINDING_READY', 'verified agreement enters agreement-applicable binding');
  if (agreementBinding.status !== 'GENERATION_BINDING_READY') throw new Error(`agreement binding failed: ${JSON.stringify(agreementBinding)}`);
  equal(agreementBinding.fieldWritePlan.length, 186, 'agreement binding still classifies exact 186 widgets');
  const agreementAuthorization = authorizationFor(agreementFacts);
  const agreementDraft = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: agreementAuthorization,
    preparationDerivativeBytes,
    facts: agreementFacts,
    preparedAtISO,
  });
  equal(agreementDraft.status, 'GENERATED_DRAFT', 'verified agreement generates reviewable UD-100 bytes');
  if (agreementDraft.status !== 'GENERATED_DRAFT') throw new Error(`agreement draft failed: ${JSON.stringify(agreementDraft)}`);
  notEqual(agreementDraft.evidence.generatedDocumentId, first.evidence.generatedDocumentId, 'agreement material changes generated identity from NO_AGREEMENT baseline');

  const agreementRepeat = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: agreementAuthorization,
    preparationDerivativeBytes,
    facts: agreementFacts,
    preparedAtISO,
  });
  equal(agreementRepeat.status, 'GENERATED_DRAFT', 'repeat agreement generation succeeds');
  if (agreementRepeat.status !== 'GENERATED_DRAFT') throw new Error('repeat agreement generation failed');
  equal(Buffer.compare(Buffer.from(agreementDraft.bytes), Buffer.from(agreementRepeat.bytes)), 0, 'identical verified agreement inputs produce byte-identical output');
  equal(agreementRepeat.evidence.generatedDocumentId, agreementDraft.evidence.generatedDocumentId, 'identical verified agreement inputs preserve generatedDocumentId');

  const agreementDoc = await PDFDocument.load(agreementDraft.bytes, { updateMetadata: false });
  const agreementFields = new Map(agreementDoc.getForm().getFields().map(field => [field.getName(), field]));
  equal(JSON.stringify(pageContentsIdentity(agreementDoc)), JSON.stringify(pageContentsIdentity(derivativeDoc)), 'agreement generation leaves static official page content references unchanged');
  const planAt = (objectReference: string) => agreementBinding.fieldWritePlan.find(entry => entry.objectReference === objectReference);
  const textAt = (objectReference: string) => {
    const plan = planAt(objectReference);
    if (!plan) throw new Error(`missing plan ${objectReference}`);
    const field = agreementFields.get(plan.fieldId);
    if (!(field instanceof PDFTextField)) throw new Error(`${objectReference} must be a PDFTextField`);
    return { plan, field };
  };
  const checkAt = (objectReference: string) => {
    const plan = planAt(objectReference);
    if (!plan) throw new Error(`missing plan ${objectReference}`);
    const field = agreementFields.get(plan.fieldId);
    if (!(field instanceof PDFCheckBox)) throw new Error(`${objectReference} must be a PDFCheckBox`);
    return { plan, field };
  };

  equal(planAt('771 0 R')?.action, 'SET_SELECTED', 'Item 6 OTHER tenancy is selected');
  equal(checkAt('771 0 R').field.isChecked(), true, 'Item 6 OTHER tenancy reopens selected');
  ok(hasBlueAppearance(checkAt('771 0 R').field), 'Item 6 selected tenancy mark uses exact DeviceRGB 0 0 1 appearance');
  equal(planAt('772 0 R')?.action, 'WRITE_TEXT', 'Item 6 tenancy term is written');
  equal(textAt('772 0 R').field.getText(), 'ONE-YEAR CONTRACT', 'Item 6 term reopens as ONE-YEAR CONTRACT');
  equal(textAt('758 0 R').field.getText(), 'Synthetic Tenant One; Synthetic Tenant Two', 'Item 6 defendant identities preserve canonical order');
  const rentEntry = planAt('766 0 R');
  equal(rentEntry?.action, 'WRITE_TEXT', 'Item 6 agreed rent is written');
  if (rentEntry?.action === 'WRITE_TEXT') {
    equal(rentEntry.value, '2500', 'Item 6 agreed rent is exact verified agreement rent');
    ok(rentEntry.dependencies.includes(CANONICAL_FILING_FACT_REFS.agreementRentAmount), 'Item 6 agreed-rent write depends on canonical agreementRentAmount');
    ok(!rentEntry.dependencies.includes(CANONICAL_FILING_FACT_REFS.rentDemandTotal), 'Item 6 agreed-rent write excludes numerically-equal Notice demand');
    ok(!rentEntry.dependencies.includes(CANONICAL_FILING_FACT_REFS.rentDueAtService), 'Item 6 agreed-rent write excludes rentDueAtService');
  }
  equal(textAt('766 0 R').field.getText(), '2500', 'Item 6 agreed rent reopens as 2500');
  for (const ref of ['767 0 R', '763 0 R', '745 0 R', '756 0 R']) {
    equal(planAt(ref)?.action, 'SET_SELECTED', `${ref} exact agreement checkbox is selected`);
    equal(checkAt(ref).field.isChecked(), true, `${ref} exact agreement checkbox reopens selected`);
    ok(hasBlueAppearance(checkAt(ref).field), `${ref} selected agreement mark uses exact DeviceRGB 0 0 1 appearance`);
  }
  equal(planAt('757 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'unresolved agreement date remains no-write');
  const dateField = textAt('757 0 R').field;
  const sourceDateField = derivativeFields.get(planAt('757 0 R')!.fieldId);
  ok(sourceDateField instanceof PDFTextField, 'source agreement date is a text field');
  if (sourceDateField instanceof PDFTextField) equal(dateField.getText() ?? null, sourceDateField.getText() ?? null, 'agreement date is not fabricated or derived');
  equal(planAt('603 0 R')?.action, 'SET_EXPLICIT_NONSELECTION', 'Item 14 fair-rental-value remains explicitly unselected');
  equal(checkAt('603 0 R').field.isChecked(), false, 'Item 14 fair-rental-value reopens unselected');
  equal(planAt('604 0 R')?.action, 'PRESERVE_OFFICIAL_BLANK_NO_WRITE', 'Item 14 daily value remains no-write');
  const item14Field = textAt('604 0 R').field;
  const sourceItem14 = derivativeFields.get(planAt('604 0 R')!.fieldId);
  ok(sourceItem14 instanceof PDFTextField, 'source Item 14 amount is a text field');
  if (sourceItem14 instanceof PDFTextField) equal(item14Field.getText() ?? null, sourceItem14.getText() ?? null, 'Item 14 daily value is not derived from monthly rent or Notice/relief amounts');

  for (const entry of agreementBinding.fieldWritePlan) {
    if (entry.action !== 'WRITE_TEXT') continue;
    const field = agreementFields.get(entry.fieldId);
    ok(field instanceof PDFTextField, `${entry.fieldId} agreement WRITE_TEXT remains a text field`);
    if (field instanceof PDFTextField) {
      ok(hasBlueAppearance(field), `${entry.fieldId} agreement WRITE_TEXT reopens with DeviceRGB 0 0 1`);
      for (const size of widgetFontSizes(field)) ok(size <= 9, `${entry.fieldId} agreement text never exceeds 9pt`);
    }
  }

  const changedAgreementInput = agreementSupplemental();
  changedAgreementInput.preparation = {
    ...changedAgreementInput.preparation,
    agreementRentAmount: { state: 'KNOWN', value: 2600, verification: verification('agreement-rent-2600') },
  };
  const changedAgreementFacts = factsFor(changedAgreementInput);
  const changedAgreementDraft = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorizationFor(changedAgreementFacts),
    preparationDerivativeBytes,
    facts: changedAgreementFacts,
    preparedAtISO,
  });
  equal(changedAgreementDraft.status, 'GENERATED_DRAFT', 'changed verified agreement rent regenerates');
  if (changedAgreementDraft.status !== 'GENERATED_DRAFT') throw new Error('changed agreement rent must generate');
  notEqual(changedAgreementDraft.evidence.generatedDocumentId, agreementDraft.evidence.generatedDocumentId, 'material agreement-rent change changes generated identity');
  notEqual(changedAgreementDraft.evidence.generatedPdfSha256, agreementDraft.evidence.generatedPdfSha256, 'material agreement-rent change changes generated bytes');
  equal(evaluateUd100GeneratedDraftCurrentness(agreementDraft.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorizationFor(changedAgreementFacts),
    preparationDerivativeBytes,
    facts: changedAgreementFacts,
    draftBytes: agreementDraft.bytes,
  }).status, 'OUT_OF_DATE', 'material agreement-rent change invalidates prior agreement draft currentness');

  const wrongSourceBytes = Uint8Array.from(officialSourceBytes);
  wrongSourceBytes[0] ^= 1;
  const wrongSource = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes: wrongSourceBytes,
    preparationAuthorization: authorization, preparationDerivativeBytes, facts, preparedAtISO,
  });
  equal(wrongSource.status, 'BLOCKED', 'changed official source bytes block before PDF mutation');
  if (wrongSource.status === 'BLOCKED') equal(wrongSource.bytes, null, 'wrong official source returns no bytes');

  for (const health of [undefined, 'STALE', 'UNRESOLVED', 'CHANGED'] as const) {
    const result = await generateUd100GeneratedDraft({
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: health, officialSourceBytes,
      preparationAuthorization: authorization, preparationDerivativeBytes, facts, preparedAtISO,
    });
    equal(result.status, 'BLOCKED', `${health ?? 'missing'} source health blocks`);
  }

  for (const badAuthorization of [
    undefined,
    authorizationFor(facts, { status: 'STALE' }),
    authorizationFor(facts, { target: { ...authorization.target, formId: 'OTHER' } }),
    authorizationFor(facts, { target: { ...authorization.target, sourceSnapshotId: 'sha256:' + '0'.repeat(64) } }),
    authorizationFor(facts, { createdNoticeIdentity: { ...authorization.createdNoticeIdentity, generation: 'other-created-notice' } }),
  ] as const) {
    const result = await generateUd100GeneratedDraft({
      officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
      preparationAuthorization: badAuthorization, preparationDerivativeBytes, facts, preparedAtISO,
    });
    equal(result.status, 'BLOCKED', 'missing/stale/wrong-form/wrong-source/wrong-matter authorization blocks');
    if (result.status === 'BLOCKED') equal(result.bytes, null, 'invalid authorization returns no bytes');
  }

  const blockedFacts = factsFor(supplemental({ preparation: { serviceComplaintElection: { state: 'UNANSWERED' } } }));
  const blockedBinding = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorizationFor(blockedFacts), preparationDerivativeBytes, facts: blockedFacts, preparedAtISO,
  });
  equal(blockedBinding.status, 'BLOCKED', 'fresh D.1 BLOCKED state yields no generated bytes');
  if (blockedBinding.status === 'BLOCKED') equal(blockedBinding.bytes, null, 'D.1 blocker returns no partial bytes');

  const glyphFacts = factsFor(supplemental({
    preparation: {
      filerContact: {
        state: 'KNOWN',
        value: {
          name: 'Synthetic Owner 😀', streetAddress: '100 Binding Ave', city: 'Glendale', state: 'CA', zip: '91203',
          telephone: '5555550100', email: 'owner@example.test', representationStatus: 'SELF_REPRESENTED',
        },
      },
    },
  }));
  const glyphResult = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorizationFor(glyphFacts), preparationDerivativeBytes, facts: glyphFacts, preparedAtISO,
  });
  equal(glyphResult.status, 'BLOCKED', 'unsupported Helvetica/WinAnsi glyph blocks generation');
  if (glyphResult.status === 'BLOCKED') {
    equal(glyphResult.blockReason, 'UNSUPPORTED_GLYPH', 'unsupported glyph has explicit blocker');
    equal(glyphResult.bytes, null, 'unsupported glyph produces no partial output');
  }

  const current = evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorization, preparationDerivativeBytes, facts, draftBytes: first.bytes,
  });
  equal(current.status, 'CURRENT', 'unchanged exact source/auth/manifest/facts/generator remains CURRENT');

  const wrongRoleSeed = { ...first.evidence, artifactRole: 'FILING_PACKET' } as unknown as typeof first.evidence;
  const { generatedDocumentId: _discardedRoleId, ...wrongRoleIdentity } = wrongRoleSeed;
  void _discardedRoleId;
  const wrongRoleEvidence = {
    ...wrongRoleSeed,
    generatedDocumentId: computeGeneratedDocumentId(wrongRoleIdentity as unknown as GeneratedDraftIdentity),
  };
  const wrongRoleCurrentness = evaluateUd100GeneratedDraftCurrentness(wrongRoleEvidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorization, preparationDerivativeBytes, facts, draftBytes: first.bytes,
  });
  equal(wrongRoleCurrentness.status, 'OUT_OF_DATE', 'artifact-role drift is OUT_OF_DATE even with recomputed identity');
  ok(wrongRoleCurrentness.status === 'OUT_OF_DATE' && wrongRoleCurrentness.reasons.includes('ARTIFACT_ROLE_CHANGED'), 'currentness reports artifact-role drift');

  equal(evaluateUd100GeneratedDraftCurrentness(
    { ...first.evidence, generatedDocumentId: 'generated-document:sha256:' + '0'.repeat(64) },
    { officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes, preparationAuthorization: authorization, preparationDerivativeBytes, facts, draftBytes: first.bytes },
  ).status, 'OUT_OF_DATE', 'tampered generatedDocumentId cannot remain CURRENT');

  const changedZipFacts = factsFor(supplemental({ propertyZip: { state: 'KNOWN', value: '91204' } }));
  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorizationFor(changedZipFacts), preparationDerivativeBytes, facts: changedZipFacts, draftBytes: first.bytes,
  }).status, 'OUT_OF_DATE', 'referenced fact value drift makes draft OUT_OF_DATE');

  const changedControlFacts = factsFor(supplemental({
    preparation: {
      civilClassificationControl: {
        state: 'KNOWN', value: 'LIMITED_LE_10000', control: control('civil-classification', 'new-current-evidence'),
        dependencies: [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
      },
    },
  }));
  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorizationFor(changedControlFacts), preparationDerivativeBytes, facts: changedControlFacts, draftBytes: first.bytes,
  }).status, 'OUT_OF_DATE', 'referenced provenance/control identity drift makes draft OUT_OF_DATE');

  const unrelatedFacts = factsFor(supplemental({
    defendantTelephones: [{ state: 'KNOWN', value: '5555550198' }, { state: 'KNOWN', value: '5555550199' }],
  }));
  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorizationFor(unrelatedFacts), preparationDerivativeBytes, facts: unrelatedFacts, draftBytes: first.bytes,
  }).status, 'CURRENT', 'nonreferenced supplemental fact drift does not false-stale generated draft');

  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'STALE', officialSourceBytes,
    preparationAuthorization: authorization, preparationDerivativeBytes, facts, draftBytes: first.bytes,
  }).status, 'OUT_OF_DATE', 'source health drift makes draft OUT_OF_DATE');

  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: { ...authorization, resultId: 'new-preparation-result' }, preparationDerivativeBytes, facts, draftBytes: first.bytes,
  }).status, 'OUT_OF_DATE', 'preparation authorization identity drift makes draft OUT_OF_DATE');

  const changedDraftBytes = Uint8Array.from(first.bytes);
  changedDraftBytes[changedDraftBytes.length - 1] ^= 1;
  equal(evaluateUd100GeneratedDraftCurrentness(first.evidence, {
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorization, preparationDerivativeBytes, facts, draftBytes: changedDraftBytes,
  }).status, 'OUT_OF_DATE', 'generated byte drift makes evidence OUT_OF_DATE');

  const driftedManifest = structuredClone(UD100_PREPARATION_RUNTIME_MANIFEST) as PreparationRuntimeManifest;
  driftedManifest.xfaDisconnection.xfaDigest = 'xfa:sha256:' + '0'.repeat(64);
  equal(evaluateOfficialFormGeneratedDraftCurrentness(first.evidence, {
    definition: canonicalDefinition(), officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT', officialSourceBytes, preparationAuthorization: authorization,
    preparationManifest: driftedManifest, preparationDerivativeBytes, facts, draftBytes: first.bytes,
    evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
  }).status, 'OUT_OF_DATE', 'manifest/XFA provenance drift invalidates currentness');

  equal(evaluateOfficialFormGeneratedDraftCurrentness(first.evidence, {
    definition: { ...canonicalDefinition(), generatorImplementationVersion: '2.0.0' },
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY, officialSourceHealth: 'CURRENT', officialSourceBytes,
    preparationAuthorization: authorization, preparationManifest: UD100_PREPARATION_RUNTIME_MANIFEST,
    preparationDerivativeBytes, facts, draftBytes: first.bytes,
    evaluateBinding: () => evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', facts),
  }).status, 'OUT_OF_DATE', 'generator implementation drift invalidates currentness');

  const xfaDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const xfaAcro = xfaDoc.catalog.getAcroForm();
  if (!xfaAcro) throw new Error('canonical preparation derivative must have AcroForm');
  xfaAcro.dict.set(PDFName.of('XFA'), PDFString.of('synthetic-test-xfa'));
  const xfaBytes = await xfaDoc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  const xfaInput = await generateWithCustomDerivative(xfaBytes, manifestForDerivative(xfaBytes), facts, authorization);
  equal(xfaInput.status, 'BLOCKED', 'generated-draft input with XFA present blocks before governed writes');
  if (xfaInput.status === 'BLOCKED') {
    equal(xfaInput.blockReason, 'PREPARATION_DERIVATIVE_INVALID', 'XFA-present input reaches explicit pre-write blocker');
    equal(xfaInput.bytes, null, 'XFA-present input produces no bytes');
  }

  const missingDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const missingForm = missingDoc.getForm();
  missingForm.acroForm.removeField(missingForm.getFields()[0].acroField);
  const missingBytes = await missingDoc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  const missingResult = await generateWithCustomDerivative(missingBytes, manifestForDerivative(missingBytes), facts, authorization);
  equal(missingResult.status, 'BLOCKED', 'missing exact field ID blocks with no fallback');
  if (missingResult.status === 'BLOCKED') equal(missingResult.bytes, null, 'missing field returns no partial bytes');

  const wrongTypeDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const wrongTypeForm = wrongTypeDoc.getForm();
  const textPlan = binding.fieldWritePlan.find(entry => entry.action === 'WRITE_TEXT');
  if (!textPlan) throw new Error('fixture requires text write');
  const textField = wrongTypeForm.getFields().find(field => field.getName() === textPlan.fieldId);
  if (!textField) throw new Error('fixture text field missing');
  textField.acroField.dict.set(PDFName.of('FT'), PDFName.of('Btn'));
  const wrongTypeBytes = await wrongTypeDoc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  const wrongTypeResult = await generateWithCustomDerivative(wrongTypeBytes, manifestForDerivative(wrongTypeBytes), facts, authorization);
  equal(wrongTypeResult.status, 'BLOCKED', 'wrong runtime field type blocks rather than substituting');

  const pushDoc = await PDFDocument.load(preparationDerivativeBytes, { updateMetadata: false });
  const pushForm = pushDoc.getForm();
  const checkboxPlan = binding.fieldWritePlan.find(entry => entry.action === 'SET_SELECTED');
  if (!checkboxPlan) throw new Error('fixture requires selected checkbox');
  const checkboxField = pushForm.getFields().find(field => field.getName() === checkboxPlan.fieldId);
  if (!(checkboxField instanceof PDFCheckBox)) throw new Error('fixture selected field must be checkbox');
  checkboxField.acroField.setFlags(checkboxField.acroField.getFlags() | (1 << 16));
  const pushBytes = await pushDoc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  const pushResult = await generateWithCustomDerivative(pushBytes, manifestForDerivative(pushBytes), facts, authorization);
  equal(pushResult.status, 'BLOCKED', 'unsupported button subtype blocks rather than applying checkbox semantics');

  console.log(`ud100GeneratedDraft tests passed: ${passed}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});