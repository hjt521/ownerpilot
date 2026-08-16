import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import type { NoticeFlowData } from './noticeFlowState';
import { individualLandlord } from './landlord.fixture';
import { normalizeAddressKey } from './jurisdictionVerdict';
import { bindReviewApproval, freezeReviewCreateInput, hasCurrentReviewApproval, reviewApprovalGeneration } from './reviewApproval';
import {
  captureCreatedNoticeArtifact,
  CREATED_NOTICE_ARTIFACT_TYPE,
  CREATED_NOTICE_SEMANTIC_CONTRACT,
  CREATED_NOTICE_SEMANTIC_ID,
  CREATED_NOTICE_SEMANTIC_SCHEMA,
  deriveCreatedNoticeSemanticBindingId,
  evaluateCreatedNoticeSemanticProvenance,
  restoreCreatedNoticeArtifact,
} from './createdNoticeArtifact';
import { captureProductionSnapshot, evaluateStaleness } from './escalation';
import { evaluateCanProduceV4 } from './gates';
import {
  NOTICE_PROSE,
  RENDER_NOTICE_SEMANTIC_CONTRACT,
  renderNotice,
} from '../produce/renderNotice';
import { saveDraft, loadDraft, DRAFT_VERSION, type StorageLike } from './persistence';

let passed = 0;
function ok(condition: unknown, message: string) {
  assert.ok(condition, message);
  passed += 1;
}
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  passed += 1;
}

function validData(): NoticeFlowData {
  const data: NoticeFlowData = {
    dispute: {
      tenantFiledComplaint: 'no',
      tenantWrittenWithholding: 'no',
      tenantBankruptcy: 'no',
    },
    propertyAddress: '442 Fresno St, Fresno, CA 93701',
    propertyUnit: '2',
    propertyCity: 'Fresno',
    propertyCounty: 'Fresno',
    tenantNames: ['Jason Kim'],
    rentPeriods: [
      { periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 },
    ],
    paymentMethods: ['by_mail'],
    landlordContact: {
      phone: '(559) 555-0142',
      streetAddress: '4336 Prospect Ave, Los Angeles, CA 90028',
    },
    paymentBranch: 'mail_only',
    signerName: 'Jack Tah',
    ...individualLandlord('owner', { names: ['Jack Tah'] }),
    serviceDate: '2026-06-02',
    serviceMethod: 'personal',
    cachedCaliforniaEligibility: {
      status: 'CONFIRMED_CALIFORNIA',
      addressKey: normalizeAddressKey('442 Fresno St, Fresno, CA 93701'),
      resolvedAt: '2026-08-10T10:00:00.000Z',
      source: 'google_places',
    },
  };
  Object.assign(data, bindReviewApproval(data, '2026-08-10T10:01:00.000Z'));
  return data;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fakeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}

function successfulCreate(input: NoticeFlowData) {
  const frozen = freezeReviewCreateInput(input);
  const gate = evaluateCanProduceV4(frozen);
  ok(gate.canProduce && !!gate.computedDates, 'successful Create fixture clears the final gate');
  const dates = {
    compliancePeriodStartDate: gate.computedDates!.commencementDate,
    compliancePeriodEndDate: gate.computedDates!.expirationDate,
  };
  const rendered = renderNotice({ data: frozen, dates });
  const productionSnapshot = captureProductionSnapshot(frozen);
  const createdNoticeArtifact = captureCreatedNoticeArtifact(
    frozen,
    productionSnapshot.producedAtISO,
    dates,
  );
  return {
    state: { ...input, productionSnapshot, createdNoticeArtifact } as NoticeFlowData,
    model: rendered.model,
    noticeText: rendered.noticeText,
    envelope: createdNoticeArtifact,
  };
}

console.log('=== UX2 created artifact integrity ===');

const createdA = successfulCreate(validData());
const semanticA = evaluateCreatedNoticeSemanticProvenance(createdA.envelope);
equal(semanticA.status, 'PROVEN', 'P1-A: a newly captured Created Notice has proven semantic provenance');
equal(createdA.envelope.artifactSemantics.schema, CREATED_NOTICE_SEMANTIC_SCHEMA, 'P1-A: semantic schema is explicit');
equal(createdA.envelope.artifactSemantics.semanticId, CREATED_NOTICE_SEMANTIC_ID, 'P1-A: semantic/render-contract identity is explicit');
equal(createdA.envelope.artifactSemantics.artifactType, CREATED_NOTICE_ARTIFACT_TYPE, 'P1-A: exact CA 3-day Notice artifact type is explicit');
equal(createdA.envelope.artifactSemantics.forfeitureElectionContentIncluded, true, 'P1-A: exact created Notice records locked forfeiture-election content');
equal(
  createdA.envelope.artifactSemanticBindingId,
  deriveCreatedNoticeSemanticBindingId(createdA.envelope.generation),
  'P1-A: semantic provenance is deterministically bound to exact Create generation',
);
ok(Object.isFrozen(createdA.envelope.artifactSemantics), 'P1-A: captured build-owned semantic record is immutable in memory');
ok(
  RENDER_NOTICE_SEMANTIC_CONTRACT === CREATED_NOTICE_SEMANTIC_CONTRACT,
  'P1-A: renderNotice and artifact capture use the same build-owned semantic contract object',
);
ok(
  createdA.noticeText.includes(NOTICE_PROSE.forfeitureElection),
  'P1-A: current renderer still emits the pre-existing locked forfeiture-election content',
);

const restoredA = restoreCreatedNoticeArtifact(createdA.state);
ok(restoredA !== null, 'Scenario 1: successful Create A exposes exact artifact A');
equal(restoredA!.generation, createdA.envelope.generation, 'Scenario 1: artifact generation is A');
equal(
  evaluateCreatedNoticeSemanticProvenance(restoredA!).status,
  'PROVEN',
  'P1-A: ordinary restore preserves proven semantic provenance without rewriting it',
);
equal(
  JSON.stringify(renderNotice({ data: restoredA!.createData, dates: restoredA!.dates }).model),
  JSON.stringify(createdA.model),
  'Scenario 1: Download/Print reconstruction is byte-equivalent model A',
);

{
  const storage = fakeStorage();
  ok(DRAFT_VERSION === 4, 'artifact envelope remains backward-compatible inside draft v4');
  ok(saveDraft(4, createdA.state, storage), 'Scenario 2: created artifact saves in existing local draft envelope');
  const draft = loadDraft(storage);
  ok(draft !== null, 'Scenario 2: ordinary remount restores the draft');
  const remounted = restoreCreatedNoticeArtifact(draft!.data);
  ok(remounted !== null, 'Scenario 2: ordinary remount restores exact artifact identity');
  equal(remounted!.createData.serviceDate, '2026-06-02', 'Scenario 2: remount artifact retains A service date');
  equal(
    evaluateCreatedNoticeSemanticProvenance(remounted!).status,
    'PROVEN',
    'P1-A: persisted new semantic provenance remains proven after ordinary remount',
  );
}

{
  const currentB = clone(createdA.state);
  currentB.rentPeriods[0].amount = 3250;
  ok(!!evaluateStaleness(currentB).reason, 'Scenario 3: material face edit preserves existing staleness behavior');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 3: stored artifact A remains independently recoverable');
  equal(artifact!.createData.rentPeriods[0].amount, 3000, 'Scenario 3: artifact use cannot silently substitute mutable rent B');
  equal(
    artifact!.artifactSemanticBindingId,
    createdA.envelope.artifactSemanticBindingId,
    'P1-A: mutable draft changes cannot rewrite already captured artifact semantics',
  );
}

{
  const currentB = clone(createdA.state);
  currentB.serviceDate = '2026-06-03';
  equal(evaluateStaleness(currentB).reason, null, 'Scenario 4: serviceDate remains excluded from existing staleness');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 4: artifact A remains available when staleness intentionally stays clear');
  equal(artifact!.createData.serviceDate, '2026-06-02', 'Scenario 4: Download/Print remains A/X, never mutable Y');
}

{
  const currentB = clone(createdA.state);
  currentB.serviceMethod = 'post_and_mail';
  equal(evaluateStaleness(currentB).reason, null, 'Scenario 5: serviceMethod remains excluded from existing staleness');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 5: artifact A remains available after mutable service-method edit');
  equal(artifact!.createData.serviceMethod, 'personal', 'Scenario 5: Download/Print retains the created service method');
}

{
  const currentB = clone(createdA.state);
  currentB.rentPeriods[0].amount = 3250;
  ok(!hasCurrentReviewApproval(currentB), 'Scenario 7: stale approval A is rejected before Create B');
  Object.assign(currentB, bindReviewApproval(currentB, '2026-08-10T10:02:00.000Z'));
  ok(hasCurrentReviewApproval(currentB), 'Scenario 6: deliberate reconfirmation binds B');
  const createdB = successfulCreate(currentB);
  ok(createdB.envelope.generation !== createdA.envelope.generation, 'Scenario 6: fresh successful Create B replaces artifact generation A');
  equal(createdB.envelope.createData.rentPeriods[0].amount, 3250, 'Scenario 6: new artifact identity contains exact B');
  equal(createdB.envelope.createData.createdNoticeArtifact, undefined, 'Scenario 6: new artifact does not recursively contain old artifact A');

  const substituted = clone(createdB.state);
  const substitutedEnvelope = substituted.createdNoticeArtifact as any;
  substitutedEnvelope.artifactSemantics = clone(createdA.envelope.artifactSemantics);
  substitutedEnvelope.artifactSemanticBindingId = createdA.envelope.artifactSemanticBindingId;
  equal(
    evaluateCreatedNoticeSemanticProvenance(substitutedEnvelope).status,
    'INVALID',
    'P1-A: semantic metadata from artifact A cannot validate against Create generation B',
  );
  equal(
    restoreCreatedNoticeArtifact(substituted),
    null,
    'P1-A: exact-generation semantic substitution fails ordinary restore closed',
  );
}

{
  const injected = validData();
  (injected as any).createdNoticeArtifact = {
    ...clone(createdA.envelope),
    artifactSemantics: {
      schema: 999,
      semanticId: 'customer-supplied-semantic-id',
      artifactType: 'CUSTOMER_SELECTED_TYPE',
      forfeitureElectionContentIncluded: false,
    },
    artifactSemanticBindingId: 'customer-supplied-binding',
  };
  const created = successfulCreate(injected);
  equal(
    created.envelope.artifactSemantics.semanticId,
    CREATED_NOTICE_SEMANTIC_ID,
    'P1-A: prior/browser artifact metadata cannot choose newly captured semantic identity',
  );
  equal(
    created.envelope.artifactSemantics.artifactType,
    CREATED_NOTICE_ARTIFACT_TYPE,
    'P1-A: prior/browser artifact metadata cannot choose newly captured Notice type',
  );
  equal(
    created.envelope.artifactSemantics.forfeitureElectionContentIncluded,
    true,
    'P1-A: prior/browser artifact metadata cannot choose the created-content fact',
  );
}

{
  const legacyState = clone(createdA.state);
  const legacyEnvelope = legacyState.createdNoticeArtifact as any;
  delete legacyEnvelope.artifactSemantics;
  delete legacyEnvelope.artifactSemanticBindingId;
  equal(
    evaluateCreatedNoticeSemanticProvenance(legacyEnvelope).status,
    'UNPROVEN_LEGACY',
    'P1-A: semantic-less historical envelope is explicitly UNPROVEN_LEGACY',
  );
  const legacyRestored = restoreCreatedNoticeArtifact(legacyState);
  ok(legacyRestored !== null, 'P1-A: legacy ordinary Created Notice restoration remains intact');
  equal(
    evaluateCreatedNoticeSemanticProvenance(legacyRestored!).status,
    'UNPROVEN_LEGACY',
    'P1-A: current restore does not silently upgrade a legacy artifact',
  );
  ok(
    !Object.prototype.hasOwnProperty.call(legacyRestored!, 'artifactSemantics') &&
      !Object.prototype.hasOwnProperty.call(legacyRestored!, 'artifactSemanticBindingId'),
    'P1-A: legacy restore performs no semantic auto-backfill',
  );
}

{
  const malformed = clone(createdA.state);
  const malformedEnvelope = malformed.createdNoticeArtifact as any;
  malformedEnvelope.artifactSemantics.semanticId = 'tampered-semantic-id';
  equal(
    evaluateCreatedNoticeSemanticProvenance(malformedEnvelope).status,
    'INVALID',
    'P1-A: malformed semantic identity is INVALID',
  );
  equal(
    restoreCreatedNoticeArtifact(malformed),
    null,
    'P1-A: malformed semantic metadata fails restore closed rather than receiving current defaults',
  );
}

{
  const partial = clone(createdA.state);
  const partialEnvelope = partial.createdNoticeArtifact as any;
  delete partialEnvelope.artifactSemanticBindingId;
  equal(
    evaluateCreatedNoticeSemanticProvenance(partialEnvelope).status,
    'INVALID',
    'P1-A: partially present semantic provenance is INVALID, not legacy',
  );
  equal(restoreCreatedNoticeArtifact(partial), null, 'P1-A: partial semantic provenance fails closed');
}

{
  const legacyPrepared = clone(createdA.state);
  delete legacyPrepared.createdNoticeArtifact;
  ok(
    restoreCreatedNoticeArtifact(legacyPrepared) === null,
    'legacy/remount fallback: ProductionSnapshot without exact artifact envelope fails closed',
  );
}

ok(
  reviewApprovalGeneration(createdA.state) === createdA.envelope.generation,
  'Scenario 8: artifact envelope does not become ReviewApprovalGeneration input',
);
equal(
  (createdA.envelope.createData.serviceAttempts ?? []).length,
  0,
  'Scenario 10: artifact capture creates no service attempt',
);
equal(
  createdA.envelope.createData.successfulServiceAttemptId,
  undefined,
  'Scenario 10: artifact capture creates no successful-service state',
);

const noticeFlow = readFileSync('components/notice-flow.tsx', 'utf8');
ok(noticeFlow.includes('restoreCreatedNoticeArtifact(data)'), 'UI restores artifact identity from persisted envelope');
ok(
  noticeFlow.includes("displayData.cachedResolverVerdict?.verdict === 'confirmed_la'") &&
    noticeFlow.includes('normalizeAddressKey(displayData.propertyAddress)'),
  'LAHD/RTC artifact-use routing is selected from exact artifact data, not mutable current data',
);
ok(noticeFlow.includes('data-testid="created-artifact-unavailable"'), 'UI has explicit fail-closed remount state');
ok(
  noticeFlow.includes("<PacketPrintOptions model={artifactModel} data={artifactData} disabledKeys={['serviceLog']} />"),
  'Download/Print consumes exact artifact model + artifact data',
);
ok(
  !noticeFlow.includes('artifact?.model ?? (noticePrepared ? renderedModel : null)'),
  'mutable renderedModel fallback is absent from artifact-use path',
);
ok(noticeFlow.includes('Your 3-Day Notice is ready'), 'Scenario 9: Notice Ready heading remains');
const serviceTaskPresentation = readFileSync('lib/flow/serviceTaskPresentation.ts', 'utf8');
ok(
  noticeFlow.includes('const display = deriveServiceTaskDisplay(data);') &&
    serviceTaskPresentation.includes("statusLabel: 'PREPARED · NOT SERVED'"),
  'Scenario 9: Notice Ready still derives PREPARED · NOT SERVED before service',
);
ok(noticeFlow.includes('href="/notice/3-day/serve"'), 'Scenario 10: actual service remains separate');

console.log(`${passed} created-artifact assertions passed`);
