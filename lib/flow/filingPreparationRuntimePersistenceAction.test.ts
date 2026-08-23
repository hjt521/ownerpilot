import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { captureCreatedNoticeArtifact } from './createdNoticeArtifact';
import {
  CANONICAL_FILING_FACT_REFS,
  projectFilingCanonicalFacts,
  type FilingCanonicalFactsProjection,
  type FilingCanonicalFactsSupplementalInput,
} from './filingCanonicalFacts';
import {
  createFilingPreparationCurrentEvidenceCurrentStateSource,
} from './filingPreparationCurrentEvidenceCurrentStateSource';
import {
  resolveFilingPreparationCurrentEvidence,
} from './filingPreparationCurrentEvidenceResolver';
import {
  createFilingPreparationCurrentState,
  type FilingPreparationCanonicalSnapshot,
  type FilingPreparationCurrentState,
} from './filingPreparationCurrentState';
import {
  createFilingPreparationRecord,
  type FilingPreparationRecord,
} from './filingPreparationRecord';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import {
  createOfficialFormOwnerReview,
  OWNER_REVIEW_STATEMENT_ID,
  OWNER_REVIEW_STATEMENT_VERSION,
  type OwnerReviewedDocumentEvidence,
} from './officialFormOwnerReview';
import type {
  FormPreparationAuthorization,
  GeneratedDraftEvidence,
} from './officialFormGeneratedDraft';
import { bindReviewApproval } from './reviewApproval';
import {
  createFilingPreparationRuntimeCurrentnessMaterialLoader,
  invokeFilingPreparationRuntimePersistence,
  type FilingPreparationRuntimeSupabaseClient,
} from './filingPreparationRuntimePersistenceAction';
import {
  generateUd100GeneratedDraft,
  UD100_PREPARATION_RUNTIME_PATH,
} from './ud100GeneratedDraft';
import { UD100_OFFICIAL_SOURCE_IDENTITY } from './ud100FieldMapFoundation';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RISKPATH_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

let passed = 0;
const equal = <T>(actual: T, expected: T, message: string): void => {
  assert.deepEqual(actual, expected, message);
  passed += 1;
};
const ok = (condition: unknown, message: string): void => {
  assert.ok(condition, message);
  passed += 1;
};

const base: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '100 Runtime Ave',
  propertyUnit: 'Unit 4',
  propertyCity: 'Glendale',
  propertyCounty: 'Los Angeles',
  tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
  rentPeriods: [{ periodStartDate: '2026-08-01', periodEndDate: '2026-08-31', amount: 2500 }],
  landlordIdentity: { type: 'individual', names: ['Synthetic Owner'] },
  landlordIdentityConfirmed: true,
};
const approved: NoticeFlowData = {
  ...base,
  ...bindReviewApproval(base, '2026-08-23T10:00:00.000Z'),
};
const artifact = captureCreatedNoticeArtifact(approved, '2026-08-23T10:01:00.000Z', {
  compliancePeriodStartDate: '2026-08-24',
  compliancePeriodEndDate: '2026-08-28',
});
const persisted: NoticeFlowData = {
  ...approved,
  productionSnapshot: {
    producedAtISO: '2026-08-23T10:01:00.000Z',
    propertyAddress: '100 Runtime Ave',
    propertyCounty: 'Los Angeles',
    tenantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
    totalAmount: 2500,
    rentPeriods: [{ start: '2026-08-01', end: '2026-08-31', amount: 2500 }],
    payeeName: 'Synthetic Owner',
    payeePhone: '5555550100',
    payeeStreetAddress: '100 Runtime Ave',
    signerName: 'Synthetic Owner',
  },
  createdNoticeArtifact: artifact,
};

const confirmation = (id: string) => ({
  confirmationId: id,
  confirmedAtISO: '2026-08-23T10:02:00.000Z',
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
) => ({ controlId, controlVersion: '1.0.0', resultId, status });
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
  const current: FilingCanonicalFactsSupplementalInput = {
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
      captionFormValueControl: {
        state: 'KNOWN',
        value: 'Self-represented',
        control: control('caption-form-value', 'self-represented-form-value'),
        dependencies: [CANONICAL_FILING_FACT_REFS.captionRouteControl],
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
        dependencies: [
          CANONICAL_FILING_FACT_REFS.plaintiffRelationship,
          CANONICAL_FILING_FACT_REFS.plaintiffType,
        ],
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
          streetAddress: '100 Runtime Ave',
          city: 'Glendale',
          state: 'CA',
          zip: '91203',
          telephone: '5555550100',
          email: 'owner@example.test',
          representationStatus: 'SELF_REPRESENTED',
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
        dependencies: [
          CANONICAL_FILING_FACT_REFS.pastDueRentRelief,
          CANONICAL_FILING_FACT_REFS.otherReliefSelections,
        ],
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
        dependencies: [
          CANONICAL_FILING_FACT_REFS.noticeComplaintElection,
          CANONICAL_FILING_FACT_REFS.serviceFacts,
        ],
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
        dependencies: [
          CANONICAL_FILING_FACT_REFS.serviceComplaintElection,
          CANONICAL_FILING_FACT_REFS.serviceFacts,
        ],
      },
      serviceFacts: {
        state: 'KNOWN',
        value: {
          defendantNames: ['Synthetic Tenant One', 'Synthetic Tenant Two'],
          serviceDate: '2026-08-23',
          noticeExpirationDate: '2026-08-28',
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
    ...current,
    ...overrides,
    preparation: {
      ...current.preparation,
      ...overrides.preparation,
    },
  };
}

function factsFor(
  input: FilingCanonicalFactsSupplementalInput = supplemental(),
): FilingCanonicalFactsProjection {
  return projectFilingCanonicalFacts(persisted, input);
}

function authorizationFor(facts: FilingCanonicalFactsProjection): FormPreparationAuthorization {
  if (facts.status !== 'READY') throw new Error('runtime fixture requires READY facts');
  return {
    authorizationId: 'ud100-runtime-preparation-auth-1',
    resultId: 'ud100-runtime-preparation-result-1',
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
}

function snapshotFromDraft(draft: GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return {
    officialSourceArtifactId: draft.officialSourceArtifactId,
    officialSourceSnapshotId: draft.officialSourceSnapshotId,
    officialSourceSha256: draft.officialSourceSha256,
    sourceAdmissionPolicyId: draft.sourceAdmissionPolicyId,
    sourceAdmissionStatus: draft.sourceAdmissionStatus,
    qpdfAssetIdentityDigest: draft.qpdfAssetIdentityDigest,
    sourcePassACommandDigest: draft.sourcePassACommandDigest,
    sourcePassAWarningInventoryDigest: draft.sourcePassAWarningInventoryDigest,
    sourcePassBCommandDigest: draft.sourcePassBCommandDigest,
    sourcePassBWarningInventoryDigest: draft.sourcePassBWarningInventoryDigest,
    sourceWarningInventoryDigest: draft.sourceWarningInventoryDigest,
    qpdfIntermediateSha256: draft.qpdfIntermediateSha256,
    xfaPolicyId: draft.xfaPolicyId,
    xfaDigest: draft.xfaDigest,
    preparationManifestId: draft.preparationManifestId,
    preparationSourceId: draft.preparationSourceId,
    preparationDerivativeSha256: draft.preparationDerivativeSha256,
    preparationFieldEquivalenceDigest: draft.preparationFieldEquivalenceDigest,
    preparationSemanticDeltaDigest: draft.preparationSemanticDeltaDigest,
    preparationAuthorizationSnapshotId: draft.preparationAuthorizationSnapshotId,
    mapSnapshotId: draft.mapSnapshotId,
    referencedFactSnapshotId: draft.referencedFactSnapshotId,
    generationInputId: draft.generationInputId,
    generatorContractVersion: draft.generatorContractVersion,
    generatorImplementationId: draft.generatorImplementationId,
    generatorImplementationVersion: draft.generatorImplementationVersion,
    fieldWritePlanDigest: draft.fieldWritePlanDigest,
  };
}

function reviewFor(draft: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const review = createOfficialFormOwnerReview({
    generatedDraft: draft,
    renderedAcknowledgment: {
      renderedGeneratedDocumentId: draft.generatedDocumentId,
      renderedPdfSha256: draft.generatedPdfSha256,
      renderedByteLength: draft.generatedByteLength,
      renderedAtISO: '2026-08-23T10:04:00.000Z',
    },
    ownerConfirmedExactRenderedDocument: true,
    reviewedAtISO: '2026-08-23T10:05:00.000Z',
    reviewStatement: {
      statementId: OWNER_REVIEW_STATEMENT_ID,
      statementVersion: OWNER_REVIEW_STATEMENT_VERSION,
    },
  });
  if (review.status !== 'OWNER_REVIEWED_DOCUMENT') {
    throw new Error(`owner review fixture blocked: ${review.blockReason}`);
  }
  return review.evidence;
}

function recordFor(
  draft: GeneratedDraftEvidence,
  review: OwnerReviewedDocumentEvidence,
): FilingPreparationRecord {
  const record = createFilingPreparationRecord({
    ownerReviewEvidence: review,
    currentGeneratedDraft: draft,
    generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
  });
  if (record.status !== 'FILING_PREPARATION_RECORD') {
    throw new Error(`record fixture blocked: ${record.blockReason}`);
  }
  return record.record;
}

interface CanonicalFixture {
  facts: FilingCanonicalFactsProjection;
  authorization: FormPreparationAuthorization;
  draft: GeneratedDraftEvidence;
  draftBytes: Uint8Array;
  review: OwnerReviewedDocumentEvidence;
  record: FilingPreparationRecord;
  state: FilingPreparationCurrentState;
}

const officialSourceBytes = new Uint8Array(
  readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath),
);
const preparationDerivativeBytes = new Uint8Array(readFileSync(UD100_PREPARATION_RUNTIME_PATH));

async function fixture(
  preparedAtISO = '2026-08-23T10:03:00.000Z',
  revision = 5,
): Promise<CanonicalFixture> {
  const facts = factsFor();
  const authorization = authorizationFor(facts);
  const generated = await generateUd100GeneratedDraft({
    officialSourceIdentity: UD100_OFFICIAL_SOURCE_IDENTITY,
    officialSourceHealth: 'CURRENT',
    officialSourceBytes,
    preparationAuthorization: authorization,
    preparationDerivativeBytes,
    facts,
    preparedAtISO,
  });
  if (generated.status !== 'GENERATED_DRAFT') {
    throw new Error(`generated fixture blocked: ${generated.blockReason}`);
  }
  const review = reviewFor(generated.evidence);
  const record = recordFor(generated.evidence, review);
  const built = createFilingPreparationCurrentState({
    authenticatedUserId: USER_A,
    riskpathRecordId: RISKPATH_A,
    revision,
    preparationSnapshot: snapshotFromDraft(generated.evidence),
    generatedDraftBinding: { revision, generatedDraft: generated.evidence },
    generatedDraftBytes: generated.bytes,
    currentnessMaterialBinding: {
      schemaVersion: 1,
      officialSourceHealth: 'CURRENT',
      facts,
      preparationAuthorization: authorization,
    },
    ownerReviewBinding: { revision, ownerReviewEvidence: review },
  });
  if (built.status !== 'CURRENT_STATE_REVISION') {
    throw new Error(`current-state fixture blocked: ${built.blockReason}`);
  }
  return {
    facts,
    authorization,
    draft: generated.evidence,
    draftBytes: generated.bytes,
    review,
    record,
    state: built.currentState,
  };
}

function bytea(bytes: Uint8Array | null): string | null {
  return bytes === null ? null : `\\x${Buffer.from(bytes).toString('hex')}`;
}

function currentStateRow(state: FilingPreparationCurrentState): Record<string, unknown> {
  const { generatedDraftBytes, ...statePayload } = state;
  return {
    filing_preparation_current_state_id: state.filingPreparationCurrentStateId,
    user_id: state.authenticatedUserId,
    riskpath_record_id: state.riskpathRecordId,
    revision: state.revision,
    state_payload: statePayload,
    generated_draft_bytes: bytea(generatedDraftBytes),
  };
}

type PersistenceRow = {
  filing_preparation_record_id: string;
  user_id: string;
  riskpath_record_id: string;
  record_payload: unknown;
};

class FakeClient implements FilingPreparationRuntimeSupabaseClient {
  authUserId: string | null = USER_A;
  authError: unknown | null = null;
  authMalformed = false;
  currentStateRows: Record<string, unknown>[] = [];
  currentStateReadError: unknown | null = null;
  currentStateReads = 0;
  persistenceInsertCalls = 0;
  persistenceRows = new Map<string, PersistenceRow>();
  persistenceReadTransform: ((row: PersistenceRow) => unknown) | null = null;

  readonly auth = {
    getUser: async (): Promise<any> => {
      if (this.authMalformed) return { nope: true };
      return {
        data: { user: this.authUserId === null ? null : { id: this.authUserId } },
        error: this.authError,
      };
    },
  };

  from(table: string): any {
    if (table === 'filing_preparation_current_state_revisions') {
      return {
        select: (_columns: string) => {
          const filters = new Map<string, string | number>();
          let order: { column: string; ascending: boolean } | null = null;
          let limit = 1;
          const query: any = {
            eq: (column: string, value: string | number) => {
              filters.set(column, value);
              return query;
            },
            order: (column: string, options: { ascending: boolean }) => {
              order = { column, ascending: options.ascending };
              return query;
            },
            limit: (count: number) => {
              limit = count;
              return query;
            },
            maybeSingle: async () => {
              this.currentStateReads += 1;
              if (this.currentStateReadError !== null) {
                return { data: null, error: this.currentStateReadError };
              }
              let rows = this.currentStateRows.filter(row => (
                [...filters].every(([column, value]) => row[column] === value)
              ));
              if (order !== null) {
                const exactOrder = order as { column: string; ascending: boolean };
                rows = [...rows].sort((a, b) => (
                  exactOrder.ascending
                    ? Number(a[exactOrder.column]) - Number(b[exactOrder.column])
                    : Number(b[exactOrder.column]) - Number(a[exactOrder.column])
                ));
              }
              return { data: rows.slice(0, limit)[0] ?? null, error: null };
            },
          };
          return query;
        },
        insert: async () => {
          throw new Error('runtime action must never append current-state revisions');
        },
      };
    }

    if (table !== 'filing_preparation_records') {
      throw new Error(`unexpected runtime table: ${table}`);
    }

    return {
      insert: async (values: PersistenceRow) => {
        this.persistenceInsertCalls += 1;
        if (this.persistenceRows.has(values.filing_preparation_record_id)) {
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        }
        this.persistenceRows.set(
          values.filing_preparation_record_id,
          structuredClone(values),
        );
        return { data: null, error: null };
      },
      select: (_columns: string) => {
        let recordId = '';
        return {
          eq: (_column: string, value: string) => {
            recordId = value;
            return {
              maybeSingle: async () => {
                const row = this.persistenceRows.get(recordId);
                if (!row) return { data: null, error: null };
                const clone = structuredClone(row);
                return {
                  data: this.persistenceReadTransform
                    ? this.persistenceReadTransform(clone)
                    : clone,
                  error: null,
                };
              },
            };
          },
        };
      },
    };
  }

  setCurrentState(state: FilingPreparationCurrentState): void {
    this.currentStateRows = [currentStateRow(state)];
  }

  seedPersistence(record: FilingPreparationRecord): void {
    this.persistenceRows.set(record.filingPreparationRecordId, {
      filing_preparation_record_id: record.filingPreparationRecordId,
      user_id: USER_A,
      riskpath_record_id: RISKPATH_A,
      record_payload: structuredClone(record),
    });
  }
}

async function invoke(
  client: FakeClient,
  record: FilingPreparationRecord,
  requestBody: unknown = { record },
  riskpathRecordId: unknown = RISKPATH_A,
) {
  return invokeFilingPreparationRuntimePersistence({
    client,
    riskpathRecordId,
    requestBody,
  });
}

function materialRequestFor(state: FilingPreparationCurrentState) {
  if (state.generatedDraftBinding === null) throw new Error('material request fixture needs draft');
  return {
    authenticatedUserId: state.authenticatedUserId,
    riskpathRecordId: state.riskpathRecordId,
    revision: state.revision,
    filingPreparationCurrentStateId: state.filingPreparationCurrentStateId,
    preparationSnapshot: structuredClone(state.preparationSnapshot),
    generatedDraft: structuredClone(state.generatedDraftBinding.generatedDraft),
  };
}

async function main(): Promise<void> {
  const current = await fixture();

  {
    const client = new FakeClient();
    client.setCurrentState(current.state);
    const result = await invoke(client, current.record);
    equal(result.status, 'PERSISTED', 'exact current server-authoritative evidence persists');
    if (result.status !== 'PERSISTED') throw new Error(`expected persistence: ${JSON.stringify(result)}`);
    equal(result.disposition, 'INSERTED', 'first exact current persistence is INSERTED');
    equal(result.durability, 'ROUND_TRIP_VERIFIED', 'success requires exact readback');
    equal(result.userId, USER_A, 'receipt binds authenticated owner');
    equal(result.riskpathRecordId, RISKPATH_A, 'receipt binds route RiskPath');
    equal(client.currentStateReads, 1, 'one runtime invocation performs one authoritative latest-state database read');
    equal(client.persistenceInsertCalls, 1, 'exact current evidence reaches one insert attempt');
  }

  {
    const client = new FakeClient();
    client.setCurrentState(current.state);
    const result = await invoke(client, current.record, {
      record: current.record,
      currentGeneratedDraft: current.draft,
      generatedDraftCurrentness: { status: 'CURRENT', reasons: [] },
    });
    equal(result.status, 'BLOCKED', 'caller draft/currentness authority is rejected');
    if (result.status !== 'BLOCKED') throw new Error('expected caller authority block');
    equal(result.blockReason, 'INVALID_REQUEST_BODY', 'serialized request is exactly record-only');
    equal(client.currentStateReads, 0, 'invalid body is rejected before current-state access');
    equal(client.persistenceInsertCalls, 0, 'caller claimed CURRENT cannot reach insert');
  }

  {
    const later = await fixture('2026-08-23T10:03:01.000Z', 6);
    const client = new FakeClient();
    client.setCurrentState(later.state);
    const mismatch = await invoke(client, current.record);
    equal(mismatch.status, 'BLOCKED', 'historical Owner Review cannot persist against newer current draft');
    if (mismatch.status !== 'BLOCKED') throw new Error('expected Owner Review mismatch');
    equal(mismatch.blockReason, 'E2_3_ADMISSION_BLOCKED', 'existing canonical E2.3 admission owns review/current-draft mismatch');
    equal(client.persistenceInsertCalls, 0, 'Owner Review mismatch performs zero insert');
  }

  {
    const canonicalLoader = createFilingPreparationRuntimeCurrentnessMaterialLoader(current.state);
    const request = materialRequestFor(current.state);
    const mismatch = await canonicalLoader.loadCurrentnessMaterial({
      ...request,
      revision: request.revision + 1,
    });
    equal(mismatch.status, 'UNAVAILABLE', 'captured-revision mismatch cannot load currentness material');

    const source = createFilingPreparationCurrentEvidenceCurrentStateSource(
      { readLatest: async () => structuredClone(current.state) },
      {
        loadCurrentnessMaterial: requestFromSource => canonicalLoader.loadCurrentnessMaterial({
          ...requestFromSource,
          filingPreparationCurrentStateId: `${requestFromSource.filingPreparationCurrentStateId}-mismatch`,
        }),
      },
    );
    const evidence = await resolveFilingPreparationCurrentEvidence({
      authenticatedUserId: USER_A,
      riskpathRecordId: RISKPATH_A,
      source,
    });
    equal(evidence.status, 'BLOCKED', 'state-ID mismatch inside material seam fails D0A source closed');
    if (evidence.status !== 'BLOCKED') throw new Error('expected material identity mismatch block');
    equal(evidence.blockReason, 'SOURCE_UNAVAILABLE', 'state-ID mismatch becomes unavailable evidence, never fallback');
  }

  {
    const client = new FakeClient();
    const legacy = createFilingPreparationCurrentState({
      authenticatedUserId: USER_A,
      riskpathRecordId: RISKPATH_A,
      revision: 4,
      preparationSnapshot: snapshotFromDraft(current.draft),
      generatedDraftBinding: { revision: 4, generatedDraft: current.draft },
      generatedDraftBytes: current.draftBytes,
      ownerReviewBinding: { revision: 4, ownerReviewEvidence: current.review },
    });
    if (legacy.status !== 'CURRENT_STATE_REVISION') throw new Error(`legacy fixture blocked: ${legacy.blockReason}`);
    client.setCurrentState(legacy.currentState);
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'legacy-v1 latest state cannot satisfy runtime currentness material');
    if (result.status !== 'BLOCKED') throw new Error('expected legacy block');
    equal(result.blockReason, 'CURRENT_STATE_MATERIAL_UNAVAILABLE', 'legacy rows have no R1 material authority');
    equal(client.persistenceInsertCalls, 0, 'legacy state performs zero insert');
  }

  {
    const client = new FakeClient();
    const preparationOnly = createFilingPreparationCurrentState({
      authenticatedUserId: USER_A,
      riskpathRecordId: RISKPATH_A,
      revision: 7,
      preparationSnapshot: snapshotFromDraft(current.draft),
      generatedDraftBinding: null,
      generatedDraftBytes: null,
      currentnessMaterialBinding: null,
      ownerReviewBinding: null,
    });
    if (preparationOnly.status !== 'CURRENT_STATE_REVISION') {
      throw new Error(`preparation-only fixture blocked: ${preparationOnly.blockReason}`);
    }
    client.setCurrentState(preparationOnly.currentState);
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'schema-v2 state without trusted R1 binding fails closed');
    if (result.status !== 'BLOCKED') throw new Error('expected missing R1 binding block');
    equal(result.blockReason, 'CURRENT_STATE_MATERIAL_UNAVAILABLE', 'missing R1 material has deterministic runtime block');
    equal(client.persistenceInsertCalls, 0, 'missing R1 material performs zero insert');
  }

  {
    const client = new FakeClient();
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'no owner/RiskPath current revision is unavailable');
    if (result.status !== 'BLOCKED') throw new Error('expected current-state unavailable');
    equal(result.blockReason, 'CURRENT_STATE_UNAVAILABLE', 'no hidden historical fallback occurs');
    equal(client.persistenceInsertCalls, 0, 'unavailable current evidence performs zero insert');
  }

  {
    const client = new FakeClient();
    client.setCurrentState(current.state);
    client.currentStateReadError = { code: '08006' };
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'current-state source error fails closed');
    if (result.status !== 'BLOCKED') throw new Error('expected current-state source failure');
    equal(result.blockReason, 'CURRENT_STATE_LOOKUP_FAILED', 'source failure has deterministic runtime block');
    equal(client.persistenceInsertCalls, 0, 'source failure performs zero insert');
  }

  {
    const client = new FakeClient();
    const crossUserRow = currentStateRow(current.state);
    crossUserRow.user_id = USER_B;
    client.currentStateRows = [crossUserRow];
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'cross-user durable evidence is invisible/fails closed');
    if (result.status !== 'BLOCKED') throw new Error('expected cross-user block');
    equal(result.blockReason, 'CURRENT_STATE_UNAVAILABLE', 'user-scoped latest read does not widen cross-user access');
    equal(client.persistenceInsertCalls, 0, 'cross-user evidence performs zero insert');

    const crossRiskPath = new FakeClient();
    const crossRiskRow = currentStateRow(current.state);
    crossRiskRow.riskpath_record_id = RISKPATH_B;
    crossRiskPath.currentStateRows = [crossRiskRow];
    const crossRiskResult = await invoke(crossRiskPath, current.record);
    equal(crossRiskResult.status, 'BLOCKED', 'cross-RiskPath durable evidence is invisible/fails closed');
    if (crossRiskResult.status !== 'BLOCKED') throw new Error('expected cross-RiskPath block');
    equal(crossRiskResult.blockReason, 'CURRENT_STATE_UNAVAILABLE', 'route RiskPath scopes latest read');
    equal(crossRiskPath.persistenceInsertCalls, 0, 'cross-RiskPath evidence performs zero insert');
  }

  {
    const client = new FakeClient();
    client.setCurrentState(current.state);
    const keys = [
      'userId',
      'authenticatedUserId',
      'currentStateId',
      'filingPreparationCurrentStateId',
      'revision',
      'source',
      'currentness',
      'currentnessMaterialBinding',
      'facts',
      'riskpathRecordId',
      'serviceRoleKey',
    ];
    for (const key of keys) {
      const result = await invoke(client, current.record, {
        record: current.record,
        [key]: key === 'revision' ? 5 : 'caller-authored',
      });
      equal(result.status, 'BLOCKED', `caller authority key ${key} fails closed`);
      if (result.status !== 'BLOCKED') throw new Error(`expected caller authority key block: ${key}`);
      equal(result.blockReason, 'INVALID_REQUEST_BODY', `caller authority key ${key} is outside exact body`);
    }
    equal(client.persistenceInsertCalls, 0, 'caller authority-key matrix performs zero insert');
  }

  {
    const unauthenticated = new FakeClient();
    unauthenticated.authUserId = null;
    unauthenticated.setCurrentState(current.state);
    const result = await invoke(unauthenticated, current.record);
    equal(result.status, 'BLOCKED', 'missing authenticated owner fails closed');
    if (result.status !== 'BLOCKED') throw new Error('expected unauthenticated block');
    equal(result.blockReason, 'UNAUTHENTICATED', 'missing session has deterministic reason');
    equal(unauthenticated.currentStateReads, 0, 'missing session cannot reach owner/RiskPath state');

    const malformed = new FakeClient();
    malformed.authMalformed = true;
    malformed.setCurrentState(current.state);
    const malformedResult = await invoke(malformed, current.record);
    equal(malformedResult.status, 'BLOCKED', 'malformed authentication response fails closed');
    if (malformedResult.status !== 'BLOCKED') throw new Error('expected malformed auth block');
    equal(malformedResult.blockReason, 'AUTHENTICATION_FAILED', 'malformed auth has deterministic reason');
    equal(malformed.persistenceInsertCalls, 0, 'malformed auth performs zero insert');
  }

  {
    const duplicate = new FakeClient();
    duplicate.setCurrentState(current.state);
    duplicate.seedPersistence(current.record);
    const result = await invoke(duplicate, current.record);
    equal(result.status, 'PERSISTED', 'exact existing immutable record stays idempotent');
    if (result.status !== 'PERSISTED') throw new Error('expected idempotent duplicate');
    equal(result.disposition, 'IDEMPOTENT_DUPLICATE', 'duplicate exact content does not overwrite');
    equal(duplicate.persistenceRows.size, 1, 'idempotent duplicate preserves one row');

    const conflict = new FakeClient();
    conflict.setCurrentState(current.state);
    conflict.seedPersistence(current.record);
    const stored = conflict.persistenceRows.get(current.record.filingPreparationRecordId);
    if (!stored) throw new Error('conflict fixture missing row');
    stored.record_payload = { ...current.record, stageF: 'READY' };
    const conflictResult = await invoke(conflict, current.record);
    equal(conflictResult.status, 'BLOCKED', 'conflicting existing content remains blocked');
    if (conflictResult.status !== 'BLOCKED') throw new Error('expected duplicate conflict block');
    equal(conflictResult.blockReason, 'DUPLICATE_RECORD_CONFLICT', 'conflict preserves canonical no-overwrite disposition');
    equal(conflict.persistenceRows.size, 1, 'conflict never overwrites existing row');
  }

  {
    const client = new FakeClient();
    client.setCurrentState(current.state);
    client.persistenceReadTransform = row => ({ ...row, user_id: USER_B });
    const result = await invoke(client, current.record);
    equal(result.status, 'BLOCKED', 'non-exact round-trip identity is rejected');
    if (result.status !== 'BLOCKED') throw new Error('expected round-trip mismatch');
    equal(result.blockReason, 'ROUND_TRIP_IDENTITY_MISMATCH', 'round-trip identity mismatch remains canonical');
  }

  {
    const race = new FakeClient();
    const later = await fixture('2026-08-23T10:03:02.000Z', 8);
    race.currentStateRows = [
      currentStateRow(current.state),
      currentStateRow(later.state),
    ];
    const result = await invoke(race, later.record);
    equal(result.status, 'PERSISTED', 'latest selected revision can persist its matching record');
    equal(race.currentStateReads, 1, 'runtime never performs an unconstrained second latest database read');
    equal(race.persistenceInsertCalls, 1, 'same-revision captured evidence reaches exactly one insert');
  }

  {
    const badRiskPath = new FakeClient();
    badRiskPath.setCurrentState(current.state);
    const result = await invoke(badRiskPath, current.record, { record: current.record }, 'not-a-uuid');
    equal(result.status, 'BLOCKED', 'malformed route RiskPath fails closed');
    if (result.status !== 'BLOCKED') throw new Error('expected invalid RiskPath');
    equal(result.blockReason, 'INVALID_RISKPATH_RECORD_ID', 'malformed route RiskPath has deterministic reason');
    equal(badRiskPath.currentStateReads, 0, 'invalid RiskPath does not reach state store');
  }

  {
    const runtimeSource = readFileSync('lib/flow/filingPreparationRuntimePersistenceAction.ts', 'utf8');
    const routeSource = readFileSync(
      'app/api/riskpath/[id]/filing-preparation/persist/route.ts',
      'utf8',
    );
    ok(runtimeSource.includes("const REQUEST_KEYS = ['record'] as const"), 'runtime source pins record-only body');
    ok(runtimeSource.includes('createFilingPreparationCurrentStateSupabaseStore'), 'runtime uses accepted D0B2 store');
    ok(runtimeSource.includes('createFilingPreparationCurrentEvidenceCurrentStateSource'), 'runtime composes accepted D0B4 source');
    ok(runtimeSource.includes('resolveFilingPreparationCurrentEvidence'), 'runtime delegates currentness to D0A');
    ok(runtimeSource.includes("currentEvidence.status !== 'CURRENT_EVIDENCE'"), 'only CURRENT_EVIDENCE can reach canonical persistence');
    ok(runtimeSource.includes('readFileSync(UD100_OFFICIAL_SOURCE_IDENTITY.repositoryPath)'), 'official source bytes come from canonical server-owned path');
    ok(runtimeSource.includes('readFileSync(UD100_PREPARATION_RUNTIME_PATH)'), 'preparation derivative bytes come from canonical server-owned path');
    ok(runtimeSource.indexOf('resolveFilingPreparationCurrentEvidence') < runtimeSource.lastIndexOf('persistFilingPreparationRecord({'), 'canonical currentness gate precedes persistence call');
    for (const prohibited of [
      '.update(',
      '.delete(',
      '.upsert(',
      'service_role',
      'process.env',
      'generatedDraftCurrentness: input.requestBody',
      'currentGeneratedDraft: input.requestBody',
    ]) {
      ok(!runtimeSource.includes(prohibited), `runtime excludes prohibited authority token: ${prohibited}`);
    }
    ok(routeSource.includes("export const runtime = 'nodejs'"), 'route explicitly uses server Node runtime for canonical repository bytes');
    ok(!routeSource.includes('GET('), 'route introduces no read/page-load persistence trigger');
  }

  console.log(`filingPreparationRuntimePersistenceAction re-anchor tests passed: ${passed}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
