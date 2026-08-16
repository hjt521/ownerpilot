import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  type GovernedControlInput,
  type OtherReliefSelections,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import { evaluateUd100GenerationBinding } from './ud100GenerationBinding';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';
import { UD100_PREPARATION_RUNTIME_PATH } from './ud100GeneratedDraft';
import {
  E2_2_AUTHORITY_BOUNDARY,
  UD100_FILING_PREPARATION_COPY,
  evaluateUd100FilingCompletion,
  evaluateUd100FilingSupport,
  prepareUd100Filing,
  reviewUd100Filing,
  type Ud100AuthoritativePreparationInputs,
  type Ud100PhaseASupportAnswers,
  type Ud100PhaseBCompletionInput,
  type Ud100PreparationContext,
} from './ud100FilingPreparation';

let passed = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); passed += 1; };
const equal = <T>(actual: T, expected: T, message: string) => { assert.equal(actual, expected, message); passed += 1; };
const notEqual = <T>(actual: T, expected: T, message: string) => { assert.notEqual(actual, expected, message); passed += 1; };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const createdAtISO = '2026-08-16T17:00:00.000Z';
const base: NoticeFlowData = {
  ...createFlowState().data,
  dispute: {
    tenantFiledComplaint: 'no',
    tenantWrittenWithholding: 'no',
    tenantBankruptcy: 'no',
  },
  propertyAddress: '100 E22 Ave',
  propertyUnit: 'Unit 4',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  landlordContact: { phone: '5555550100', streetAddress: '100 E22 Ave' },
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
  signerName: 'Synthetic Owner',
  signerCapacity: 'owner',
  serviceDate: '2026-08-15',
  serviceMethod: 'personal',
};
const approved: NoticeFlowData = {
  ...base,
  ...bindReviewApproval(base, '2026-08-16T16:59:00.000Z'),
};
const artifact = captureCreatedNoticeArtifact(approved, createdAtISO, {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: createdAtISO,
    propertyAddress: '100 E22 Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 E22 Ave',
    paymentBranch: 'mail_only',
    signerName: 'Synthetic Owner',
    signerCapacity: 'owner',
  },
  createdNoticeArtifact: artifact,
  serviceAttempts: [
    {
      id: 'service-success-1',
      attemptDate: '2026-08-15',
      method: 'personal',
      outcome: 'SUCCESS',
      server: {
        name: 'Synthetic Server',
        address: '200 Service Ave',
        age18Plus: true,
        partyToNotice: false,
      },
    },
  ],
  successfulServiceAttemptId: 'service-success-1',
};

const noUnitBase: NoticeFlowData = {
  ...base,
  propertyUnit: undefined,
};
const noUnitApproved: NoticeFlowData = {
  ...noUnitBase,
  ...bindReviewApproval(noUnitBase, '2026-08-16T16:59:00.000Z'),
};
const noUnitArtifact = captureCreatedNoticeArtifact(noUnitApproved, createdAtISO, {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const persistedNoUnit: NoticeFlowData = {
  ...noUnitApproved,
  productionSnapshot: persisted.productionSnapshot,
  createdNoticeArtifact: noUnitArtifact,
  serviceAttempts: clone(persisted.serviceAttempts),
  successfulServiceAttemptId: persisted.successfulServiceAttemptId,
};

const confirmation = (id: string, at = '2026-08-16T17:01:00.000Z') => ({
  confirmationId: id,
  confirmedAtISO: at,
});

function governed<T>(
  controlId: string,
  resultId: string,
  value: T,
  dependencies: readonly any[] = [],
  status: 'CURRENT' | 'STALE' | 'UNRESOLVED' | 'UNSUPPORTED' = 'CURRENT',
): GovernedControlInput<T> {
  return {
    state: 'KNOWN',
    value,
    control: { controlId, controlVersion: '1.0.0', resultId, status },
    dependencies,
  };
}

function phaseA(overrides: Partial<Ud100PhaseASupportAnswers> = {}): Ud100PhaseASupportAnswers {
  return {
    plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
    plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
    representationStatus: { state: 'KNOWN', value: 'SELF_REPRESENTED' },
    dbaUse: { state: 'KNOWN', value: 'NO_DBA' },
    doePosture: { state: 'KNOWN', value: 'NO_DOES' },
    initialComplaintLifecycle: { state: 'KNOWN', value: 'INITIAL_PREFILING' },
    leasePosture: { state: 'KNOWN', value: 'NO_AGREEMENT' },
    noticePosture: { state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY' },
    servicePosture: { state: 'KNOWN', value: 'PERSONAL_HAND_DELIVERY' },
    otherNoticesPosture: { state: 'KNOWN', value: 'NO_OTHER_NOTICES' },
    fixedTermPosture: { state: 'KNOWN', value: 'DO_NOT_SELECT' },
    optionalReliefPosture: { state: 'KNOWN', value: 'PAST_DUE_RENT_ONLY' },
    ...overrides,
  };
}

function authoritative(overrides: Partial<Ud100AuthoritativePreparationInputs> = {}): Ud100AuthoritativePreparationInputs {
  return {
    initialComplaintLifecycle: {
      state: 'KNOWN',
      value: 'INITIAL_PREFILING',
      event: { sourceId: 'ownerpilot.lifecycle', eventId: 'initial-prefiling-1', eventType: 'INITIAL_COMPLAINT_STATUS' },
    },
    municipalClassification: governed('municipal-classification', 'within-city', 'WITHIN_CITY_LIMITS'),
    plaintiffStandingControl: governed(
      'plaintiff-standing',
      'supported-owner-individual',
      'SUPPORTED',
      [CANONICAL_FILING_FACT_REFS.plaintiffRelationship, CANONICAL_FILING_FACT_REFS.plaintiffType],
    ),
    jurisdictionSupportControl: governed('jurisdiction-support', 'supported-initial', 'SUPPORTED_INITIAL_UD100'),
    tpaClassificationControl: governed('tpa-classification', 'subject-at-fault', 'SUBJECT_AT_FAULT'),
    localControl: governed('local-rent-control', 'not-subject', 'NOT_SUBJECT'),
    civilClassificationControl: governed(
      'civil-classification',
      'limited-le-10000',
      'LIMITED_LE_10000',
      [CANONICAL_FILING_FACT_REFS.pastDueRentRelief, CANONICAL_FILING_FACT_REFS.otherReliefSelections],
    ),
    rentalAssistanceControl: governed(
      'rental-assistance',
      'applicable',
      'APPLICABLE',
      [CANONICAL_FILING_FACT_REFS.rentalAssistanceFacts],
    ),
    udaDisclosureControl: governed('uda-disclosure', 'no-compensated-assistant', 'NO_COMPENSATED_ASSISTANT'),
    ...overrides,
  };
}

const otherReliefNone: OtherReliefSelections = {
  fairRentalValue: false,
  statutoryDamages: false,
  relocationDamages: false,
  forfeiture: false,
  attorneyFees: false,
  otherRelief: false,
  otherAllegations: false,
};

function phaseB(overrides: Partial<Ud100PhaseBCompletionInput> = {}): Ud100PhaseBCompletionInput {
  return {
    propertyZip: { state: 'KNOWN', value: '91203' },
    selectedFilingCourt: {
      state: 'KNOWN',
      value: {
        county: 'Los Angeles',
        streetAddress: '111 N Hill St',
        mailingAddress: '111 N Hill St',
        cityAndZip: 'Los Angeles, CA 90012',
        branchName: 'Stanley Mosk Courthouse',
      },
      confirmation: confirmation('court-confirmation'),
    },
    filerContact: {
      state: 'KNOWN',
      value: {
        name: 'Synthetic Owner',
        streetAddress: '100 E22 Ave',
        city: 'Glendale',
        state: 'CA',
        zip: '91203',
        telephone: '5555550100',
        email: 'owner@example.test',
        representationStatus: 'SELF_REPRESENTED',
      },
    },
    premisesAge: { state: 'KNOWN', value: '1990' },
    rentDueAtService: { state: 'KNOWN', value: 2450 },
    rentalAssistanceFacts: {
      state: 'KNOWN',
      value: {
        item11aReceived: false,
        item11bReceived: false,
        item11cHas: false,
        item11dHas: false,
      },
    },
    doeElection: {
      state: 'KNOWN',
      value: { include: false },
      confirmation: confirmation('no-does'),
    },
    noticeComplaintElection: {
      state: 'KNOWN',
      value: 'PAY_RENT_OR_QUIT_3_DAY',
      confirmation: confirmation('notice-election'),
    },
    serviceComplaintElection: {
      state: 'KNOWN',
      value: 'PERSONAL_HAND_DELIVERY',
      confirmation: confirmation('service-election'),
    },
    fixedTermExpirationElection: {
      state: 'KNOWN',
      value: 'DO_NOT_SELECT',
      confirmation: confirmation('fixed-term-no'),
    },
    pastDueRentRelief: {
      state: 'KNOWN',
      value: { selected: true, amount: 2400 },
      confirmation: confirmation('past-due-rent'),
    },
    otherReliefSelections: {
      state: 'KNOWN',
      value: otherReliefNone,
      confirmation: confirmation('other-relief-none'),
    },
    ...overrides,
  };
}

function context(overrides: Partial<Ud100PreparationContext> = {}): Ud100PreparationContext {
  return {
    data: persisted,
    phaseA: phaseA(),
    phaseB: phaseB(),
    authoritative: authoritative(),
    ...overrides,
  };
}

const officialSourceBytes = new Uint8Array(readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath));
const preparationDerivativeBytes = new Uint8Array(readFileSync(UD100_PREPARATION_RUNTIME_PATH));
const filingReadinessSource = readFileSync('components/filing-readiness.tsx', 'utf8');
const runtime = {
  officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
  officialSourceHealth: 'CURRENT' as const,
  officialSourceBytes,
  preparationDerivativeBytes,
};

(async () => {
  console.log('=== Stage E.2.2 bounded UD-100 filing preparation ===');

  equal(
    UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath,
    'docs/legal/official-forms/california/judicial-council/UD-100/2026-07-01/UD-100.pdf',
    'Item 11 remediation remains bound to the registered July 1, 2026 canonical UD-100 source path',
  );
  equal(
    UD100_OFFICIAL_SOURCE_IDENTITY.repositorySha256,
    '1dbc18fb4639fb2939a2df60a6401941b058296a7f521bd56b62cc0d08610496',
    'Item 11 remediation retains the registered canonical UD-100 SHA-256 identity',
  );

  const editableSupportStart = filingReadinessSource.indexOf('const EDITABLE_SUPPORT_KEYS');
  const editableSupportEnd = filingReadinessSource.indexOf('const SUPPORT_LABELS');
  const editableSupportBlock = filingReadinessSource.slice(editableSupportStart, editableSupportEnd);
  ok(editableSupportStart >= 0 && editableSupportEnd > editableSupportStart, 'bounded UI exposes an explicit editable-support key ceiling');
  ok(!editableSupportBlock.includes("'noticePosture'"), 'Created Notice posture is not customer-reentered in editable support controls');
  ok(!editableSupportBlock.includes("'servicePosture'"), 'recorded service posture is not customer-reentered in editable support controls');
  ok(filingReadinessSource.includes('const createdNotice = resolveContext?.artifact ?? null;'), 'UI consumes exact restored Created Notice artifact facts');
  ok(filingReadinessSource.includes('const successfulService = resolveContext?.successfulAttempt ?? null;'), 'UI consumes the safely bound successful service record');
  ok(filingReadinessSource.includes('This property has no unit/suite number.'), 'absent frozen unit has the required explicit NO_UNIT owner confirmation copy');
  ok(filingReadinessSource.includes('propertyUnitConfirmation: frozenUnitPresent'), 'UI only supplies NO_UNIT when the frozen Created Notice lacks a unit');
  ok(filingReadinessSource.includes('Use this 3-Day Notice to Pay Rent or Quit as the notice allegation for this complaint?'), 'Notice artifact fact and complaint Notice election are presented separately');
  ok(filingReadinessSource.includes('Use this recorded personal hand delivery as the service statement for this complaint?'), 'service record fact and complaint service election are presented separately');
  ok(filingReadinessSource.includes('otherReliefSelections: fields.optionalReliefNoneConfirmed'), 'all-false optional-relief election requires explicit owner nonselection');
  for (const item of [
    'Fair rental value',
    'Statutory damages',
    'Relocation damages',
    'Forfeiture',
    'Attorney fees',
    'Other relief',
    'Other allegations',
  ]) {
    ok(filingReadinessSource.includes(item), `optional-relief nonselection visibly includes ${item}`);
  }
  ok(
    filingReadinessSource.includes('I am not asking OwnerPilot to include any of these additional relief items in this complaint.'),
    'complete optional-relief list precedes explicit aggregate nonselection',
  );
  for (const heading of [
    'From your Notice',
    'From your service record',
    'You confirmed for this filing',
    'Checked by OwnerPilot',
  ]) {
    ok(filingReadinessSource.includes(heading), `pre-generation provenance summary contains ${heading}`);
  }

  const item11Text = [
    'Has plaintiff received rental assistance or other financial compensation from any other source corresponding to the amount demanded in the notice underlying the complaint?',
    'Has plaintiff received rental assistance or other financial compensation from any other source for rent accruing after the date of the notice underlying the complaint?',
    'Does plaintiff have any pending application for rental assistance or other financial compensation from any other source corresponding to the amount demanded in the notice underlying the complaint?',
    'Does plaintiff have any pending application for rental assistance or other financial compensation from any other source for rent accruing after the date on the notice underlying the complaint?',
  ] as const;
  for (const question of item11Text) {
    ok(filingReadinessSource.includes(question), 'each Item 11(a)-(d) prompt uses the complete controlled factual proposition');
  }
  ok(!filingReadinessSource.includes('Item 11a — received?'), 'old Item 11 shorthand is removed');
  ok(!filingReadinessSource.includes('Item 11b — received?'), 'old Item 11 shorthand is removed');
  ok(!filingReadinessSource.includes('Item 11c — has?'), 'old Item 11 shorthand is removed');
  ok(!filingReadinessSource.includes('Item 11d — has?'), 'old Item 11 shorthand is removed');

  ok(
    /const setSupport = [\s\S]*?setSupportResult\(null\);[\s\S]*?setFilingChoiceConfirmed\(false\);/.test(filingReadinessSource),
    'every editable Phase-A support change invalidates aggregate filing-choice confirmation',
  );
  ok(
    /const setField = [\s\S]*?courtConfirmed: false[\s\S]*?setFilingChoiceConfirmed\(false\);/.test(filingReadinessSource),
    'material Phase-B edits invalidate aggregate confirmation and court-detail edits invalidate court confirmation',
  );
  ok(
    filingReadinessSource.includes('disabled={!filingPrerequisitesComplete}'),
    'stale or incomplete underlying choices cannot keep the aggregate filing-choice checkbox actionable',
  );
  ok(
    filingReadinessSource.includes("if (!filingChoiceConfirmed || !filingPrerequisitesComplete)"),
    'Prepare rechecks current prerequisites rather than minting provenance from stale checked state',
  );

  const supported = evaluateUd100FilingSupport(context());
  equal(supported.status, 'SUPPORTED', 'bounded profile passes Phase A when required current governed evidence is supplied');

  const noAuthoritative = evaluateUd100FilingSupport({ data: persisted, phaseA: phaseA(), phaseB: phaseB() });
  equal(noAuthoritative.status, 'CANNOT_CONTINUE', 'missing substantive governed evidence fails closed rather than becoming customer negatives');
  ok(noAuthoritative.blockers.some(item => item.includes('uncompensated document-assistant')), 'missing UDA control remains an explicit governed blocker');

  const unanswered = evaluateUd100FilingSupport({
    ...context(),
    phaseA: phaseA({ representationStatus: { state: 'UNANSWERED' } }),
  });
  equal(unanswered.status, 'NEEDS_INFORMATION', 'unanswered support fact remains Needs information');

  for (const [label, overrides] of [
    ['other plaintiff relationship', { plaintiffRelationship: { state: 'KNOWN', value: 'OTHER' } }],
    ['entity plaintiff', { plaintiffType: { state: 'KNOWN', value: 'CORPORATION' } }],
    ['outside attorney', { representationStatus: { state: 'KNOWN', value: 'OUTSIDE_ATTORNEY' } }],
    ['DBA', { dbaUse: { state: 'KNOWN', value: 'USES_DBA' } }],
    ['Does', { doePosture: { state: 'KNOWN', value: 'USES_DOES' } }],
    ['prior complaint', { initialComplaintLifecycle: { state: 'KNOWN', value: 'PRIOR_COMPLAINT_EXISTS' } }],
    ['agreement path', { leasePosture: { state: 'KNOWN', value: 'AGREEMENT_OR_OTHER' } }],
    ['other notice allegation', { noticePosture: { state: 'KNOWN', value: 'OTHER' } }],
    ['other service', { servicePosture: { state: 'KNOWN', value: 'OTHER' } }],
    ['other notices', { otherNoticesPosture: { state: 'KNOWN', value: 'OTHER_NOTICES' } }],
    ['fixed-term theory', { fixedTermPosture: { state: 'KNOWN', value: 'SELECT' } }],
    ['other relief', { optionalReliefPosture: { state: 'KNOWN', value: 'OTHER_RELIEF' } }],
  ] as const) {
    const result = evaluateUd100FilingSupport({ ...context(), phaseA: phaseA(overrides as any) });
    equal(result.status, 'UNSUPPORTED_CONFIGURATION', `${label} fails closed as Product capability boundary`);
    equal(result.detail, UD100_FILING_PREPARATION_COPY.unsupported, `${label} does not become a legal conclusion`);
  }

  const staleControl = evaluateUd100FilingSupport({
    ...context(),
    authoritative: authoritative({
      jurisdictionSupportControl: governed('jurisdiction-support', 'stale', 'SUPPORTED_INITIAL_UD100', [], 'STALE'),
    }),
  });
  equal(staleControl.status, 'CANNOT_CONTINUE', 'stale governed control cannot satisfy support check');

  const completion = evaluateUd100FilingCompletion(context(), runtime);
  equal(completion.status, 'READY_FOR_PREPARATION', 'supported Phase B projects into exact D.1 generation-ready facts');
  if (completion.status !== 'READY_FOR_PREPARATION') throw new Error(`completion failed: ${JSON.stringify(completion)}`);
  const binding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', completion.facts);
  equal(binding.status, 'GENERATION_BINDING_READY', 'E.2.2 completion consumes the existing governed D.1 binding');
  if (binding.status !== 'GENERATION_BINDING_READY') throw new Error('generation binding must be ready');
  const attorneyFor = binding.fieldWritePlan.find(item => item.objectReference === '855 0 R');
  equal(attorneyFor?.action, 'WRITE_TEXT', 'ATTORNEY FOR remains an exact controlled write');
  if (attorneyFor?.action === 'WRITE_TEXT') {
    equal(attorneyFor.value, 'Self-represented', 'ATTORNEY FOR remains governed exact Self-represented');
  }

  const captionSpoof = phaseB({
    filerContact: {
      state: 'KNOWN',
      value: {
        ...(phaseB().filerContact as any).value,
        captionForText: 'Customer-authored attorney role',
      },
    } as any,
  });
  const spoofCompletion = evaluateUd100FilingCompletion({ ...context(), phaseB: captionSpoof }, runtime);
  equal(spoofCompletion.status, 'READY_FOR_PREPARATION', 'legacy/browser extra caption text cannot break the governed route');
  if (spoofCompletion.status === 'READY_FOR_PREPARATION') {
    const spoofBinding = evaluateUd100GenerationBinding(UD100_OFFICIAL_SOURCE_IDENTITY, 'CURRENT', spoofCompletion.facts);
    if (spoofBinding.status === 'GENERATION_BINDING_READY') {
      const spoofedAttorneyFor = spoofBinding.fieldWritePlan.find(item => item.objectReference === '855 0 R');
      if (spoofedAttorneyFor?.action === 'WRITE_TEXT') {
        equal(spoofedAttorneyFor.value, 'Self-represented', 'customer captionForText cannot author the official field');
        notEqual(spoofedAttorneyFor.value, 'Customer-authored attorney role', 'customer free text has no form authority');
      }
    }
  }

  const missingCourtConfirmation = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({
      selectedFilingCourt: {
        state: 'KNOWN',
        value: (phaseB().selectedFilingCourt as any).value,
      },
    }),
  }, runtime);
  equal(missingCourtConfirmation.status, 'BLOCKED', 'missing court confirmation blocks preparation');

  const unknownZip = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ propertyZip: { state: 'UNKNOWN' } }),
  }, runtime);
  equal(unknownZip.status, 'BLOCKED', 'UNKNOWN required customer fact never becomes blank');

  const noPhaseB = evaluateUd100FilingCompletion({ data: persisted, phaseA: phaseA(), authoritative: authoritative() }, runtime);
  equal(noPhaseB.status, 'BLOCKED', 'Phase B cannot become preparation-ready before completion inputs exist');

  const noUnitUnconfirmed = evaluateUd100FilingCompletion({
    ...context(),
    data: persistedNoUnit,
  }, runtime);
  equal(noUnitUnconfirmed.status, 'BLOCKED', 'absent frozen unit plus no explicit NO_UNIT confirmation remains unresolved');

  const noUnitConfirmed = evaluateUd100FilingCompletion({
    ...context(),
    data: persistedNoUnit,
    phaseB: phaseB({ propertyUnitConfirmation: { state: 'KNOWN', value: 'NO_UNIT' } }),
  }, runtime);
  equal(noUnitConfirmed.status, 'READY_FOR_PREPARATION', 'absent frozen unit plus explicit NO_UNIT can satisfy the existing bounded projection');

  const frozenUnitWins = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ propertyUnitConfirmation: { state: 'KNOWN', value: 'NO_UNIT' } }),
  }, runtime);
  equal(frozenUnitWins.status, 'READY_FOR_PREPARATION', 'exact frozen Created Notice unit remains authoritative and cannot be overridden by supplemental NO_UNIT');

  const unansweredRentalAssistance = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ rentalAssistanceFacts: { state: 'UNANSWERED' } }),
  }, runtime);
  equal(unansweredRentalAssistance.status, 'BLOCKED', 'rental-assistance silence remains unanswered and never becomes No');

  const noOptionalReliefConfirmation = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ otherReliefSelections: { state: 'UNANSWERED' } }),
  }, runtime);
  equal(noOptionalReliefConfirmation.status, 'BLOCKED', 'optional-relief all-false omission semantics require an explicit owner election');

  const failedServiceData: NoticeFlowData = {
    ...persisted,
    serviceAttempts: [{
      id: 'failed-only',
      attemptDate: '2026-08-15',
      method: 'personal',
      outcome: 'FAILED',
      server: { name: 'Synthetic Server', address: '200 Service Ave', age18Plus: true, partyToNotice: false },
    }],
    successfulServiceAttemptId: undefined,
  };
  const failedServiceCompletion = evaluateUd100FilingCompletion({ ...context(), data: failedServiceData }, runtime);
  equal(failedServiceCompletion.status, 'BLOCKED', 'attempted/failed service cannot support generation');

  const unconfirmedNoticeElection = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ noticeComplaintElection: { state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY' } }),
  }, runtime);
  equal(unconfirmedNoticeElection.status, 'BLOCKED', 'Notice artifact provenance cannot substitute for a separate confirmed owner Notice election');

  const unconfirmedServiceElection = evaluateUd100FilingCompletion({
    ...context(),
    phaseB: phaseB({ serviceComplaintElection: { state: 'KNOWN', value: 'PERSONAL_HAND_DELIVERY' } }),
  }, runtime);
  equal(unconfirmedServiceElection.status, 'BLOCKED', 'successful service cannot substitute for a separate confirmed owner service election');

  const legacyNotice = clone(persisted);
  delete (legacyNotice.createdNoticeArtifact as any).artifactSemantics;
  delete (legacyNotice.createdNoticeArtifact as any).artifactSemanticBindingId;
  equal(evaluateUd100FilingSupport({ ...context(), data: legacyNotice }).status, 'CANNOT_CONTINUE', 'legacy Created Notice semantics fail support closed');

  const noChoice = await prepareUd100Filing({
    context: context(),
    preparedAtISO: '2026-08-16T17:03:00.000Z',
    runtime,
  });
  equal(noChoice.status, 'BLOCKED', 'missing filing-choice affirmation blocks generation');

  const prepared = await prepareUd100Filing({
    context: context(),
    filingChoiceConfirmation: {
      confirmed: true,
      confirmationId: 'filing-choice-1',
      confirmedAtISO: '2026-08-16T17:02:00.000Z',
    },
    preparedAtISO: '2026-08-16T17:03:00.000Z',
    runtime,
  });
  equal(prepared.status, 'GENERATED_DRAFT', 'exact supported/current input generates one governed draft');
  if (prepared.status !== 'GENERATED_DRAFT') throw new Error(`prepare failed: ${JSON.stringify(prepared)}`);
  equal(prepared.generation.ownerReview, 'NOT_PERFORMED', 'generation does not create owner review');
  equal(prepared.generation.signing, 'NOT_PERFORMED', 'generation does not sign');
  equal(prepared.generation.filing, 'NOT_PERFORMED', 'generation does not file');
  equal(prepared.generation.evidence.generatedByteLength, prepared.generation.bytes.byteLength, 'retained exact byte length matches generated identity');

  const renderedAcknowledgment = {
    renderedGeneratedDocumentId: prepared.generation.evidence.generatedDocumentId,
    renderedPdfSha256: prepared.generation.evidence.generatedPdfSha256,
    renderedByteLength: prepared.generation.evidence.generatedByteLength,
    renderedAtISO: '2026-08-16T17:04:00.000Z',
  };
  const reviewed = reviewUd100Filing({
    ...context(),
    ...runtime,
    generatedDraft: prepared.generation.evidence,
    generatedBytes: prepared.generation.bytes,
    renderedAcknowledgment,
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-16T17:05:00.000Z',
  });
  equal(reviewed.status, 'OWNER_REVIEWED_DOCUMENT', 'same generated bytes + exact render acknowledgment + positive owner affirmation creates E.2.1 review');
  if (reviewed.status === 'OWNER_REVIEWED_DOCUMENT') {
    equal(reviewed.review.evidence.generatedDraft.generatedDocumentId, prepared.generation.evidence.generatedDocumentId, 'review binds exact generated document identity');
    equal(reviewed.review.evidence.renderedAcknowledgment.renderedPdfSha256, prepared.generation.evidence.generatedPdfSha256, 'review binds exact rendered byte hash');
    equal(reviewed.review.signing, 'NOT_PERFORMED', 'review does not sign');
    equal(reviewed.review.filing, 'NOT_PERFORMED', 'review does not file');
  }

  const tamperedBytes = new Uint8Array(prepared.generation.bytes);
  tamperedBytes[tamperedBytes.length - 1] ^= 1;
  const tamperedReview = reviewUd100Filing({
    ...context(),
    ...runtime,
    generatedDraft: prepared.generation.evidence,
    generatedBytes: tamperedBytes,
    renderedAcknowledgment,
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-16T17:05:00.000Z',
  });
  equal(tamperedReview.status, 'BLOCKED', 'changed generated bytes cannot be reviewed under old identity');

  const changedCourt = phaseB({
    selectedFilingCourt: {
      state: 'KNOWN',
      value: {
        ...(phaseB().selectedFilingCourt as any).value,
        branchName: 'Different Owner-Selected Branch',
      },
      confirmation: confirmation('court-confirmation-changed', '2026-08-16T17:06:00.000Z'),
    },
  });
  const staleReview = reviewUd100Filing({
    ...context({ phaseB: changedCourt }),
    ...runtime,
    generatedDraft: prepared.generation.evidence,
    generatedBytes: prepared.generation.bytes,
    renderedAcknowledgment,
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-16T17:07:00.000Z',
  });
  equal(staleReview.status, 'BLOCKED', 'material owner-selected court drift invalidates old generated/review state');
  equal(staleReview.detail, UD100_FILING_PREPARATION_COPY.stale, 'material drift uses the settled stale-document copy');

  const wrongSource = await prepareUd100Filing({
    context: context(),
    filingChoiceConfirmation: { confirmed: true, confirmationId: 'choice-wrong-source', confirmedAtISO: '2026-08-16T17:02:00.000Z' },
    preparedAtISO: '2026-08-16T17:03:00.000Z',
    runtime: { ...runtime, officialSourceHealth: 'STALE' },
  });
  equal(wrongSource.status, 'BLOCKED', 'stale official source health cannot be promoted to CURRENT by E.2.2');

  equal(E2_2_AUTHORITY_BOUNDARY.durablePersistence, 'NOT_AUTHORIZED', 'E.2.2 creates no durable persistence authority');
  equal(E2_2_AUTHORITY_BOUNDARY.signing, 'NOT_AUTHORIZED', 'E.2.2 creates no signing authority');
  equal(E2_2_AUTHORITY_BOUNDARY.filing, 'NOT_AUTHORIZED', 'E.2.2 creates no filing authority');
  equal(E2_2_AUTHORITY_BOUNDARY.courtFeePayment, 'NOT_AUTHORIZED', 'E.2.2 creates no payment authority');
  equal(E2_2_AUTHORITY_BOUNDARY.externalCommunication, 'NOT_AUTHORIZED', 'E.2.2 creates no send/dispatch authority');
  equal(E2_2_AUTHORITY_BOUNDARY.productionAction, 'NOT_AUTHORIZED', 'E.2.2 creates no Production authority');

  console.log(`ud100FilingPreparation: ${passed} assertions passed`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});