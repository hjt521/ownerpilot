import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  captureCreatedNoticeArtifact,
  evaluateCreatedNoticeSemanticProvenance,
} from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  type CustomerConfirmedLegalElectionInput,
  type FilerContact,
  type GovernedControlInput,
} from './filingCanonicalFacts';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval } from './reviewApproval';
import {
  produceCaptionOptionalFieldsControl,
  produceCaptionRouteSupport,
  produceLeaseApplicabilityControl,
  produceNoticeElectionConsistencyControl,
  produceServiceElectionConsistency,
  UD100_GOVERNED_CONTROL_IDS,
  UD100_GOVERNED_CONTROL_VERSION,
} from './ud100GovernedControls';

let passed = 0;
const ok = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  passed += 1;
};
const equal = <T>(actual: T, expected: T, message: string) => {
  assert.equal(actual, expected, message);
  passed += 1;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const base: NoticeFlowData = {
  ...createFlowState().data,
  dispute: {
    tenantFiledComplaint: 'no',
    tenantWrittenWithholding: 'no',
    tenantBankruptcy: 'no',
  },
  propertyAddress: '100 Governed Ave',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant'],
  rentPeriods: [
    { periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 },
  ],
  paymentMethods: ['by_mail'],
  paymentBranch: 'mail_only',
  landlordContact: {
    phone: '5555550100',
    streetAddress: '100 Governed Ave',
  },
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
  signerName: 'Synthetic Owner',
  signerCapacity: 'owner',
  serviceDate: '2026-08-14',
  serviceMethod: 'personal',
};
const approved: NoticeFlowData = {
  ...base,
  ...bindReviewApproval(base, '2026-08-14T12:00:00.000Z'),
};
const createdAtISO = '2026-08-14T12:01:00.000Z';
const artifact = captureCreatedNoticeArtifact(approved, createdAtISO, {
  compliancePeriodStartDate: '2026-08-15',
  compliancePeriodEndDate: '2026-08-19',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: createdAtISO,
    propertyAddress: '100 Governed Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Governed Ave',
    paymentBranch: 'mail_only',
    signerName: 'Synthetic Owner',
    signerCapacity: 'owner',
  },
  createdNoticeArtifact: artifact,
};

const filerContact = (representationStatus: FilerContact['representationStatus']): FilerContact => ({
  name: 'Synthetic Owner',
  streetAddress: '100 Governed Ave',
  city: 'Glendale',
  state: 'CA',
  zip: '91203',
  telephone: '5555550100',
  email: 'owner@example.test',
  representationStatus,
});

const confirmation = (id: string) => ({
  confirmationId: id,
  confirmedAtISO: '2026-08-14T12:02:00.000Z',
});
const noticeElection = (
  id = 'notice-election-1',
): CustomerConfirmedLegalElectionInput<'PAY_RENT_OR_QUIT_3_DAY'> => ({
  state: 'KNOWN',
  value: 'PAY_RENT_OR_QUIT_3_DAY',
  confirmation: confirmation(id),
});
const serviceElection = (
  id = 'service-election-1',
): CustomerConfirmedLegalElectionInput<'PERSONAL_HAND_DELIVERY'> => ({
  state: 'KNOWN',
  value: 'PERSONAL_HAND_DELIVERY',
  confirmation: confirmation(id),
});

function assertCurrentControl(
  input: GovernedControlInput<unknown>,
  controlId: string,
  label: string,
) {
  equal(input.state, 'KNOWN', `${label} is a known governed result`);
  if (input.state !== 'KNOWN') return;
  ok(!!input.control, `${label} has governed-control provenance`);
  if (!input.control) return;
  equal(input.control.controlId, controlId, `${label} has stable control identity`);
  equal(input.control.controlVersion, UD100_GOVERNED_CONTROL_VERSION, `${label} has stable control version`);
  equal(input.control.status, 'CURRENT', `${label} is CURRENT`);
  ok(input.control.resultId.trim() !== '', `${label} has nonblank result identity`);
}

console.log('=== Stage D.1 P1-v2 governed-control producers ===');
equal(UD100_GOVERNED_CONTROL_VERSION, '1.1.0', 'agreement remediation advances the governed control version to 1.1.0');

const caption = produceCaptionRouteSupport({
  data: persisted,
  plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
  plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
  filerContact: { state: 'KNOWN', value: filerContact('SELF_REPRESENTED') },
});
assertCurrentControl(caption.captionRouteControl, UD100_GOVERNED_CONTROL_IDS.captionRoute, 'caption route');
if (caption.captionRouteControl.state === 'KNOWN') {
  equal(caption.captionRouteControl.value, 'SELF_REPRESENTED_SUPPORTED', 'bounded owner/individual/self-represented profile is supported');
  ok(
    (caption.captionRouteControl.dependencies ?? []).includes(CANONICAL_FILING_FACT_REFS.plaintiffNames),
    'caption route retains frozen plaintiff identity dependency',
  );
}
assertCurrentControl(caption.captionFormValueControl, UD100_GOVERNED_CONTROL_IDS.captionFormValue, 'caption form value');
if (caption.captionFormValueControl.state === 'KNOWN') {
  equal(caption.captionFormValueControl.value, 'Self-represented', 'official form-facing caption value is exact and build-owned');
  equal(
    caption.captionFormValueControl.dependencies?.[0],
    CANONICAL_FILING_FACT_REFS.captionRouteControl,
    'caption form value depends on governed caption route',
  );
}

const browserLikeContact = {
  ...filerContact('SELF_REPRESENTED'),
  captionForText: 'Customer-authored attorney role text',
} as FilerContact;
const browserLikeCaption = produceCaptionRouteSupport({
  data: persisted,
  plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
  plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
  filerContact: { state: 'KNOWN', value: browserLikeContact },
});
if (browserLikeCaption.captionFormValueControl.state === 'KNOWN') {
  equal(
    browserLikeCaption.captionFormValueControl.value,
    'Self-represented',
    'customer/browser extra text cannot change the governed ATTORNEY FOR value',
  );
}

const outsideAttorney = produceCaptionRouteSupport({
  data: persisted,
  plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
  plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
  filerContact: { state: 'KNOWN', value: filerContact('OUTSIDE_ATTORNEY') },
});
equal(outsideAttorney.captionRouteControl.state, 'KNOWN', 'outside-attorney route has explicit unsupported governed disposition');
if (outsideAttorney.captionRouteControl.state === 'KNOWN') {
  equal(outsideAttorney.captionRouteControl.value, 'OUTSIDE_ATTORNEY_UNSUPPORTED', 'outside-attorney expansion remains unsupported');
  equal(outsideAttorney.captionRouteControl.control?.status, 'UNSUPPORTED', 'outside-attorney route cannot masquerade as CURRENT');
}
ok(outsideAttorney.captionFormValueControl.state !== 'KNOWN', 'outside-attorney route cannot produce form-facing caption value');

const entityCaption = produceCaptionRouteSupport({
  data: persisted,
  plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
  plaintiffType: { state: 'KNOWN', value: 'CORPORATION' },
  filerContact: { state: 'KNOWN', value: filerContact('SELF_REPRESENTED') },
});
ok(
  entityCaption.captionRouteControl.state !== 'KNOWN'
    || entityCaption.captionRouteControl.control?.status !== 'CURRENT',
  'entity caption route cannot become a current supported caption result',
);
ok(entityCaption.captionFormValueControl.state !== 'KNOWN', 'entity route cannot produce Self-represented form value');

for (const filerInput of [
  undefined,
  { state: 'UNANSWERED' } as const,
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'representation unanswered' } as const,
  { state: 'CONFLICT', values: [filerContact('SELF_REPRESENTED'), filerContact('OUTSIDE_ATTORNEY')], reason: 'representation conflict' } as const,
]) {
  const result = produceCaptionRouteSupport({
    data: persisted,
    plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
    plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
    filerContact: filerInput,
  });
  ok(
    result.captionRouteControl.state !== 'KNOWN'
      || result.captionRouteControl.control?.status !== 'CURRENT',
    'missing/unknown/conflicting representation state fails closed',
  );
}

const mismatchedName = produceCaptionRouteSupport({
  data: persisted,
  plaintiffRelationship: { state: 'KNOWN', value: 'OWNER' },
  plaintiffType: { state: 'KNOWN', value: 'INDIVIDUAL_OVER_18' },
  filerContact: { state: 'KNOWN', value: { ...filerContact('SELF_REPRESENTED'), name: 'Different Person' } },
});
equal(mismatchedName.captionRouteControl.state, 'CONFLICT', 'filer/plaintiff identity mismatch is an explicit conflict');

const optionalFields = produceCaptionOptionalFieldsControl(caption.captionRouteControl);
assertCurrentControl(optionalFields, UD100_GOVERNED_CONTROL_IDS.captionOptionalFields, 'caption optional-fields');
if (optionalFields.state === 'KNOWN') {
  equal(optionalFields.value, 'SELF_REP_NO_BAR_FIRM_FAX', 'bounded self-represented route alone authorizes blank bar/firm/fax fields');
  equal(optionalFields.dependencies?.[0], CANONICAL_FILING_FACT_REFS.captionRouteControl, 'optional fields retain caption-route dependency');
}
for (const badRoute of [
  { state: 'UNANSWERED' } as GovernedControlInput<any>,
  {
    state: 'KNOWN',
    value: 'SELF_REPRESENTED_SUPPORTED',
    control: {
      controlId: UD100_GOVERNED_CONTROL_IDS.captionRoute,
      controlVersion: UD100_GOVERNED_CONTROL_VERSION,
      resultId: 'caption-route:v1:stale',
      status: 'STALE',
    },
  } as GovernedControlInput<any>,
  {
    state: 'KNOWN',
    value: 'SELF_REPRESENTED_SUPPORTED',
    control: {
      controlId: 'browser-spoofed-caption-route',
      controlVersion: UD100_GOVERNED_CONTROL_VERSION,
      resultId: 'caption-route:v1:spoofed',
      status: 'CURRENT',
    },
  } as GovernedControlInput<any>,
]) {
  ok(
    produceCaptionOptionalFieldsControl(badRoute).state !== 'KNOWN',
    'missing/stale/spoofed caption-route provenance cannot create optional-field control',
  );
}

const leaseVerification = { verificationId: 'lease-verification-1', verifiedAtISO: '2026-08-14T12:02:00.000Z' };
const noAgreementLease = produceLeaseApplicabilityControl({
  state: 'KNOWN',
  value: 'NO_AGREEMENT',
  verification: leaseVerification,
});
assertCurrentControl(noAgreementLease, UD100_GOVERNED_CONTROL_IDS.leaseApplicability, 'no-agreement lease applicability');
if (noAgreementLease.state === 'KNOWN') {
  equal(noAgreementLease.value, 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE', 'verified NO_AGREEMENT produces exact no-agreement applicability');
  equal(noAgreementLease.dependencies?.[0], CANONICAL_FILING_FACT_REFS.leaseStatus, 'lease result retains exact lease-status dependency');
}
const agreementLease = produceLeaseApplicabilityControl({
  state: 'KNOWN',
  value: 'OTHER',
  verification: { verificationId: 'lease-verification-2', verifiedAtISO: '2026-08-14T12:03:00.000Z' },
});
assertCurrentControl(agreementLease, UD100_GOVERNED_CONTROL_IDS.leaseApplicability, 'agreement-applicable lease control');
if (agreementLease.state === 'KNOWN') {
  equal(agreementLease.value, 'AGREEMENT_FIELDS_APPLICABLE', 'verified OTHER classification enters exact agreement-applicable state');
}
ok(
  produceLeaseApplicabilityControl({ state: 'KNOWN', value: 'NO_AGREEMENT' }).state !== 'KNOWN',
  'unverified known NO_AGREEMENT cannot become a governed positive applicability result',
);
ok(
  produceLeaseApplicabilityControl({ state: 'KNOWN', value: 'OTHER' }).state !== 'KNOWN',
  'unverified known agreement classification cannot become agreement-applicable',
);
for (const leaseInput of [
  undefined,
  { state: 'UNANSWERED' } as const,
  { state: 'UNKNOWN' } as const,
  { state: 'REQUIRES_CONFIRMATION', reason: 'agreement unknown' } as const,
  { state: 'CONFLICT', values: ['NO_AGREEMENT'] as const, reason: 'agreement conflict' } as const,
]) {
  ok(produceLeaseApplicabilityControl(leaseInput).state !== 'KNOWN', 'silence/unknown/conflict never becomes either lease applicability positive state');
}

const noticeConsistency = produceNoticeElectionConsistencyControl({
  data: persisted,
  noticeComplaintElection: noticeElection(),
});
assertCurrentControl(noticeConsistency, UD100_GOVERNED_CONTROL_IDS.noticeElectionConsistency, 'Notice-election consistency');
if (noticeConsistency.state === 'KNOWN') {
  equal(noticeConsistency.value, 'CONSISTENT', 'PROVEN Created Notice + separately confirmed matching election is consistent');
  equal(noticeConsistency.dependencies?.[0], CANONICAL_FILING_FACT_REFS.noticeComplaintElection, 'Notice consistency retains separate election dependency');
}

const artifactOnly = produceNoticeElectionConsistencyControl({ data: persisted });
ok(artifactOnly.state !== 'KNOWN', 'artifact type cannot substitute for owner complaint election');
const electionOnly = produceNoticeElectionConsistencyControl({
  data: null,
  noticeComplaintElection: noticeElection('election-only'),
});
ok(electionOnly.state !== 'KNOWN', 'owner complaint election cannot substitute for Created Notice provenance');
const unconfirmedNotice = produceNoticeElectionConsistencyControl({
  data: persisted,
  noticeComplaintElection: { state: 'KNOWN', value: 'PAY_RENT_OR_QUIT_3_DAY' },
});
ok(unconfirmedNotice.state !== 'KNOWN', 'unconfirmed election cannot create Notice consistency');

const legacyNotice = clone(persisted);
const legacyEnvelope = legacyNotice.createdNoticeArtifact as any;
delete legacyEnvelope.artifactSemantics;
delete legacyEnvelope.artifactSemanticBindingId;
equal(
  evaluateCreatedNoticeSemanticProvenance(legacyEnvelope).status,
  'UNPROVEN_LEGACY',
  'legacy fixture is explicitly semantic-less',
);
ok(
  produceNoticeElectionConsistencyControl({ data: legacyNotice, noticeComplaintElection: noticeElection('legacy') }).state !== 'KNOWN',
  'UNPROVEN_LEGACY cannot produce Notice consistency',
);

const invalidNotice: NoticeFlowData = {
  ...clone(persisted),
  createdNoticeArtifact: {
    ...clone(persisted.createdNoticeArtifact!),
    artifactSemantics: {
      ...clone((persisted.createdNoticeArtifact as any).artifactSemantics),
      semanticId: 'tampered-semantic-id',
    },
  } as any,
};
equal(
  evaluateCreatedNoticeSemanticProvenance(invalidNotice.createdNoticeArtifact).status,
  'INVALID',
  'tampered semantic fixture is INVALID',
);
ok(
  produceNoticeElectionConsistencyControl({ data: invalidNotice, noticeComplaintElection: noticeElection('invalid') }).state !== 'KNOWN',
  'INVALID semantics cannot produce Notice consistency',
);

const crossGenerationNotice: NoticeFlowData = {
  ...clone(persisted),
  createdNoticeArtifact: {
    ...clone(persisted.createdNoticeArtifact!),
    generation: 'different-create-generation',
  } as any,
};
equal(
  evaluateCreatedNoticeSemanticProvenance(crossGenerationNotice.createdNoticeArtifact).status,
  'INVALID',
  'cross-generation semantic binding is INVALID',
);
ok(
  produceNoticeElectionConsistencyControl({ data: crossGenerationNotice, noticeComplaintElection: noticeElection('cross-generation') }).state !== 'KNOWN',
  'cross-generation Notice identity cannot produce Notice consistency',
);

const served: NoticeFlowData = {
  ...persisted,
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
const serviceConsistency = produceServiceElectionConsistency({
  data: served,
  serviceComplaintElection: serviceElection(),
});
assertCurrentControl(
  serviceConsistency.serviceElectionConsistencyControl,
  UD100_GOVERNED_CONTROL_IDS.serviceElectionConsistency,
  'service-election consistency',
);
if (serviceConsistency.serviceElectionConsistencyControl.state === 'KNOWN') {
  equal(serviceConsistency.serviceElectionConsistencyControl.value, 'CONSISTENT', 'exact successful personal service + matching owner election is consistent');
  ok(
    (serviceConsistency.serviceElectionConsistencyControl.dependencies ?? []).includes(CANONICAL_FILING_FACT_REFS.serviceFacts),
    'service consistency retains exact service-facts dependency',
  );
}
equal(serviceConsistency.serviceFacts.state, 'KNOWN', 'successful exact service handoff produces lifecycle ServiceFacts');
if (serviceConsistency.serviceFacts.state === 'KNOWN') {
  equal(serviceConsistency.serviceFacts.value.serviceMethod, 'PERSONAL_HAND_DELIVERY', 'runtime personal method maps exactly to bounded service fact');
  equal(serviceConsistency.serviceFacts.value.serviceDate, '2026-08-15', 'service date comes from exact successful attempt');
  equal(serviceConsistency.serviceFacts.value.noticeExpirationDate, '2026-08-19', 'expiration comes from exact Created Notice artifact');
  equal(serviceConsistency.serviceFacts.value.noticeIncludedForfeiture, true, 'forfeiture-content fact comes only from PROVEN Created Notice semantics');
  equal(serviceConsistency.serviceFacts.event?.sourceId, 'ownerpilot.service-runtime', 'service facts retain explicit runtime source identity');
  ok(serviceConsistency.serviceFacts.event?.eventId.startsWith('service-v1:') === true, 'service facts retain deterministic service-generation event identity');
}

const failedOnly: NoticeFlowData = {
  ...persisted,
  serviceAttempts: [
    {
      id: 'failed-1',
      attemptDate: '2026-08-15',
      method: 'personal',
      outcome: 'FAILED',
      server: { name: 'Synthetic Server', address: '200 Service Ave', age18Plus: true, partyToNotice: false },
    },
  ],
  successfulServiceAttemptId: undefined,
};
ok(
  produceServiceElectionConsistency({ data: failedOnly, serviceComplaintElection: serviceElection('failed-only') }).serviceElectionConsistencyControl.state !== 'KNOWN',
  'attempted/failed service cannot produce service consistency',
);

const mismatchedSuccessId: NoticeFlowData = {
  ...served,
  successfulServiceAttemptId: 'different-success-id',
};
ok(
  produceServiceElectionConsistency({ data: mismatchedSuccessId, serviceComplaintElection: serviceElection('mismatch') }).serviceElectionConsistencyControl.state !== 'KNOWN',
  'mismatched successful-service identity fails closed',
);

const duplicateSuccess: NoticeFlowData = {
  ...served,
  serviceAttempts: [
    ...(served.serviceAttempts ?? []),
    {
      id: 'service-success-2',
      attemptDate: '2026-08-16',
      method: 'personal',
      outcome: 'SUCCESS',
      server: { name: 'Second Server', address: '201 Service Ave', age18Plus: true, partyToNotice: false },
    },
  ],
};
ok(
  produceServiceElectionConsistency({ data: duplicateSuccess, serviceComplaintElection: serviceElection('duplicate') }).serviceElectionConsistencyControl.state !== 'KNOWN',
  'duplicate successful-service residue fails closed',
);

const staleServed: NoticeFlowData = {
  ...served,
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2600 }],
};
ok(
  produceServiceElectionConsistency({ data: staleServed, serviceComplaintElection: serviceElection('stale') }).serviceElectionConsistencyControl.state !== 'KNOWN',
  'stale mutable face drift cannot produce current service consistency',
);

const legacyServed = clone(served);
delete (legacyServed.createdNoticeArtifact as any).artifactSemantics;
delete (legacyServed.createdNoticeArtifact as any).artifactSemanticBindingId;
const legacyServiceResult = produceServiceElectionConsistency({
  data: legacyServed,
  serviceComplaintElection: serviceElection('legacy-service'),
});
ok(legacyServiceResult.serviceFacts.state !== 'KNOWN', 'UNPROVEN_LEGACY cannot produce D.1 ServiceFacts');
ok(legacyServiceResult.serviceElectionConsistencyControl.state !== 'KNOWN', 'UNPROVEN_LEGACY cannot produce service consistency');

const invalidServed: NoticeFlowData = {
  ...clone(served),
  createdNoticeArtifact: {
    ...clone(served.createdNoticeArtifact!),
    artifactSemantics: {
      ...clone((served.createdNoticeArtifact as any).artifactSemantics),
      semanticId: 'invalid-service-semantic-id',
    },
  } as any,
};
const invalidServiceResult = produceServiceElectionConsistency({
  data: invalidServed,
  serviceComplaintElection: serviceElection('invalid-service'),
});
ok(invalidServiceResult.serviceFacts.state !== 'KNOWN', 'INVALID Notice provenance cannot create forfeiture-content ServiceFacts');
ok(invalidServiceResult.serviceElectionConsistencyControl.state !== 'KNOWN', 'INVALID Notice provenance cannot produce service consistency');

const noServiceElection = produceServiceElectionConsistency({ data: served });
ok(noServiceElection.serviceElectionConsistencyControl.state !== 'KNOWN', 'service facts cannot choose the owner service election');

const controlIdValues = Object.values(UD100_GOVERNED_CONTROL_IDS).join('|');
for (const outOfScope of [
  'municipal',
  'plaintiff-standing',
  'jurisdiction-support',
  'tpa',
  'local-rent',
  'civil-classification',
  'rental-assistance',
  'uda-disclosure',
]) {
  ok(!controlIdValues.includes(outOfScope), `${outOfScope} substantive producer is absent from P1-v2 control IDs`);
}

const sourceText = readFileSync(new URL('./ud100GovernedControls.ts', import.meta.url), 'utf8');
ok(
  !/writeFile|appendFile|fetch\(|XMLHttpRequest|supabase|database|localStorage|sessionStorage|FormData|model\.generate|signDocument|fileDocument|serveDocument/.test(sourceText),
  'P1-v2 producer module has no network, persistence, model, signing, filing, or service-execution authority',
);
ok(!sourceText.includes('captionForText'), 'producer source contains no customer caption free-text seam');

console.log(`ud100GovernedControls: ${passed} assertions passed`);
