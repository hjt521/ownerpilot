from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)

# 1. Flow-state contract: browser-local exact created-artifact envelope.
path = 'lib/flow/noticeFlowState.ts'
text = read(path)
text = replace_once(
    text,
    "  stalenessReason?: StalenessReason | null;\n// --- Jurisdiction resolver verdict (Slice 4d) -----------------------------",
    "  stalenessReason?: StalenessReason | null;\n  /**\n   * UX2 artifact-use identity. Written only after a successful Create Notice.\n   * Browser-local draft persistence round-trips this envelope automatically;\n   * Download/Print must consume createData + dates from this envelope rather\n   * than rebuilding from later mutable draft state. This is NOT approval or\n   * post-production staleness authority.\n   */\n  createdNoticeArtifact?: CreatedNoticeArtifactEnvelope;\n// --- Jurisdiction resolver verdict (Slice 4d) -----------------------------",
    'noticeFlowState field',
)
text = replace_once(
    text,
    "  laProduceAudit?: LaProduceAuditFields;\n}\n\n/** Outcome of a single service attempt (attorney B1 enum). */",
    "  laProduceAudit?: LaProduceAuditFields;\n}\n\n/**\n * Exact successful-Create artifact identity for browser-local reuse.\n * `createData` is the frozen Create input with any prior artifact envelope\n * removed to prevent recursive persistence. The exact compliance dates are\n * stored so remount reconstruction never re-runs the gate against mutable or\n * time-shifted state.\n */\nexport interface CreatedNoticeArtifactEnvelope {\n  generation: string;\n  createdAtISO: string;\n  createData: NoticeFlowData;\n  dates: {\n    compliancePeriodStartDate: string;\n    compliancePeriodEndDate: string;\n  };\n}\n\n/** Outcome of a single service attempt (attorney B1 enum). */",
    'artifact envelope interface',
)
write(path, text)

# 2. Approval generation must ignore the post-Create artifact envelope.
path = 'lib/flow/reviewApproval.ts'
text = read(path)
text = replace_once(
    text,
    "  'productionSnapshot',\n  'stalenessReason',",
    "  'productionSnapshot',\n  'stalenessReason',\n  'createdNoticeArtifact',",
    'reviewApproval exclusion',
)
write(path, text)

# 3. Pure artifact capture/restore helper.
Path('lib/flow/createdNoticeArtifact.ts').write_text("""import type {
  CreatedNoticeArtifactEnvelope,
  NoticeFlowData,
} from './noticeFlowState';
import {
  freezeReviewCreateInput,
  hasCurrentReviewApproval,
  reviewApprovalGeneration,
} from './reviewApproval';

/**
 * Capture the exact successful Create identity for browser-local artifact use.
 * The caller supplies the compliance dates from the same final gate that fed
 * renderNotice and the producedAt timestamp from the same ProductionSnapshot.
 */
export function captureCreatedNoticeArtifact(
  data: NoticeFlowData,
  createdAtISO: string,
  dates: CreatedNoticeArtifactEnvelope['dates'],
): CreatedNoticeArtifactEnvelope {
  // A fresh Create replaces any prior artifact identity; never nest A inside B.
  const { createdNoticeArtifact: _priorArtifact, ...createSource } = data;
  const createData = freezeReviewCreateInput(createSource as NoticeFlowData);
  const generation = reviewApprovalGeneration(createData);

  if (
    !hasCurrentReviewApproval(createData) ||
    createData.reviewApprovalGeneration !== generation
  ) {
    throw new Error('Cannot capture a created notice without current Create approval.');
  }

  return {
    generation,
    createdAtISO,
    createData,
    dates: { ...dates },
  };
}

/**
 * Validate and re-freeze a persisted artifact envelope after ordinary remount.
 * A ProductionSnapshot without this exact envelope intentionally fails closed;
 * current mutable draft state is never used as a substitute artifact source.
 */
export function restoreCreatedNoticeArtifact(
  data: NoticeFlowData,
): CreatedNoticeArtifactEnvelope | null {
  const envelope = data.createdNoticeArtifact;
  if (!envelope || typeof envelope !== 'object') return null;
  if (!data.productionSnapshot) return null;
  if (data.productionSnapshot.producedAtISO !== envelope.createdAtISO) return null;
  if (typeof envelope.generation !== 'string' || envelope.generation === '') return null;
  if (typeof envelope.createdAtISO !== 'string' || envelope.createdAtISO === '') return null;
  if (!envelope.createData || typeof envelope.createData !== 'object') return null;
  if (
    !envelope.dates ||
    typeof envelope.dates.compliancePeriodStartDate !== 'string' ||
    typeof envelope.dates.compliancePeriodEndDate !== 'string'
  ) {
    return null;
  }

  const createData = freezeReviewCreateInput(envelope.createData);
  if (!hasCurrentReviewApproval(createData)) return null;
  if (reviewApprovalGeneration(createData) !== envelope.generation) return null;

  return {
    generation: envelope.generation,
    createdAtISO: envelope.createdAtISO,
    createData,
    dates: { ...envelope.dates },
  };
}
""")

# 4. Review/Create UI: persist exact artifact identity and never fall back to mutable state.
path = 'components/notice-flow.tsx'
text = read(path)
text = replace_once(
    text,
    "} from '@/lib/flow/reviewApproval';\nimport { renderNotice, NoticeRenderError, formatNoticeDate, derivePayeeName, formatPropertyLine } from '@/lib/produce/renderNotice';",
    "} from '@/lib/flow/reviewApproval';\nimport {\n  captureCreatedNoticeArtifact,\n  restoreCreatedNoticeArtifact,\n} from '@/lib/flow/createdNoticeArtifact';\nimport { renderNotice, NoticeRenderError, formatNoticeDate, derivePayeeName, formatPropertyLine } from '@/lib/produce/renderNotice';",
    'notice-flow artifact import',
)
text = replace_once(
    text,
    "  const [createError, setCreateError] = useState<string | null>(null);\n  const [createdArtifact, setCreatedArtifact] = useState<{\n    generation: string;\n    data: NoticeFlowData;\n    model: NoticeModel;\n    html: string;\n  } | null>(null);\n",
    "  const [createError, setCreateError] = useState<string | null>(null);\n",
    'remove in-memory artifact state',
)
marker = "\n  // UX2 consequential boundary: approved input = gate input = render input =\n"
insert = """
  // Artifact use is a third, separate UX2 identity contract. If a successful
  // Create envelope survived the browser-local draft remount, reconstruct only
  // from its exact frozen Create input + exact Create-time compliance dates.
  // Never fall back to current mutable data merely because ProductionSnapshot
  // says a notice was prepared.
  const restoredArtifact = noticePrepared ? restoreCreatedNoticeArtifact(data) : null;
  let artifactModel: NoticeModel | null = null;
  let artifactData: NoticeFlowData | null = null;
  if (restoredArtifact) {
    try {
      artifactModel = renderNotice({
        data: restoredArtifact.createData,
        dates: restoredArtifact.dates,
      }).model;
      artifactData = restoredArtifact.createData;
    } catch {
      // Fail closed below: no exact reconstructable artifact => no Download/Print.
      artifactModel = null;
      artifactData = null;
    }
  }
  const artifactReady = noticePrepared && artifactModel !== null && artifactData !== null;
"""
if marker not in text:
    raise SystemExit('artifact reconstruction marker missing')
text = text.replace(marker, insert + marker, 1)
text = replace_once(
    text,
    "      const finalizedHtml = buildNoticeDocumentHtml(rendered.model);\n\n      setCreatedArtifact({\n        generation,\n        data: frozen,\n        model: rendered.model,\n        html: finalizedHtml,\n      });\n      update({ productionSnapshot: captureProductionSnapshot(frozen) });",
    "      // HTML construction remains part of successful Create validation, but\n      // HTML itself is not persisted; the exact model is deterministically\n      // reconstructed later from the frozen Create input + these exact dates.\n      buildNoticeDocumentHtml(rendered.model);\n      const productionSnapshot = captureProductionSnapshot(frozen);\n      const createdNoticeArtifact = captureCreatedNoticeArtifact(\n        frozen,\n        productionSnapshot.producedAtISO,\n        {\n          compliancePeriodStartDate: finalResult.computedDates.commencementDate,\n          compliancePeriodEndDate: finalResult.computedDates.expirationDate,\n        },\n      );\n      update({ productionSnapshot, createdNoticeArtifact });",
    'create persistence block',
)
old_artifact = """  // Slice E: always-visible calm readiness/status presentation. Deterministic
  // checks appear as product status; only C6 remains the final general testimony.
  const artifact =
    noticePrepared &&
    createdArtifact &&
    createdArtifact.generation === data.reviewApprovalGeneration
      ? createdArtifact
      : null;
  const artifactModel = artifact?.model ?? (noticePrepared ? renderedModel : null);
  const artifactData = artifact?.data ?? data;
"""
new_artifact = """  // Slice E: always-visible calm readiness/status presentation. Deterministic
  // checks appear as product status; only C6 remains the final general testimony.
  const displayModel = artifactReady ? artifactModel : renderedModel;
  const displayData = artifactReady && artifactData ? artifactData : data;
"""
text = replace_once(text, old_artifact, new_artifact, 'remove mutable artifact fallback')
text = replace_once(
    text,
    "      {noticePrepared ? (\n        <NoticeReadyState />",
    "      {artifactReady ? (\n        <NoticeReadyState />",
    'Notice Ready exact artifact gate',
)
text = replace_once(
    text,
    "      {renderError && (<div className=\"rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900\">{renderError}</div>)}",
    "      {noticePrepared && !artifactReady && (\n        <div\n          data-testid=\"created-artifact-unavailable\"\n          role=\"alert\"\n          className=\"rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900\"\n        >\n          The exact notice created earlier is not available in this browser draft. Review &amp;\n          Confirm and Create Notice again before downloading or printing.\n        </div>\n      )}\n      {renderError && (<div className=\"rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900\">{renderError}</div>)}",
    'artifact unavailable fail-closed UI',
)
text = replace_once(
    text,
    "      {docHtml && !noticePrepared && (",
    "      {docHtml && !artifactReady && (",
    'preview exact artifact gate',
)
start = text.index("      {renderedModel && docHtml && laProduceRequired ? (")
end = text.index("\n\n      {/* C6:", start)
replacement = """      {laProduceRequired && displayModel ? (
        <LaProducePanel
          model={displayModel}
          data={displayData}
          baseName={buildNoticePdfFilename({ tenantNames: displayData.tenantNames, streetAddress: displayData.propertyAddress, unit: displayData.propertyUnit })}
          verdictSource={displayData.cachedResolverVerdict?.source ?? 'live_resolver'}
          noticePrepared={artifactReady}
          canCreate={approvalCurrent && result.canProduce}
          onCreateNotice={createNotice}
          onAudit={(f) => update({ laProduceAudit: f })}
        />
      ) : !laProduceRequired && artifactReady && artifactModel && artifactData ? (
        <>
          <div className="rounded-lg border border-rule bg-white px-5 py-4">
            <h3 className="font-semibold text-gray-900">Download / Print Notice</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">Use the existing notice documents below whenever you need another copy.</p>
          </div>
          <PacketPrintOptions model={artifactModel} data={artifactData} disabledKeys={['serviceLog']} />
        </>
      ) : !laProduceRequired && renderedModel && docHtml ? (
        <section className="rounded-lg border border-rule bg-white px-5 py-4">
          <h3 className="font-semibold text-gray-900">Create Notice</h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">Create the notice after the final confirmation is current. Download and print become available after creation.</p>
          <button
            type="button"
            data-testid="create-notice-button"
            onClick={createNotice}
            disabled={!approvalCurrent || !result.canProduce}
            className="mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Notice
          </button>
        </section>
      ) : null}"""
text = text[:start] + replacement + text[end:]
write(path, text)

# 5. Focused artifact-integrity regression suite.
Path('lib/flow/createdNoticeArtifact.test.ts').write_text("""import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import type { NoticeFlowData } from './noticeFlowState';
import { individualLandlord } from './landlord.fixture';
import { normalizeAddressKey } from './jurisdictionVerdict';
import { bindReviewApproval, freezeReviewCreateInput, hasCurrentReviewApproval, reviewApprovalGeneration } from './reviewApproval';
import { captureCreatedNoticeArtifact, restoreCreatedNoticeArtifact } from './createdNoticeArtifact';
import { captureProductionSnapshot, evaluateStaleness } from './escalation';
import { evaluateCanProduceV4 } from './gates';
import { renderNotice } from '../produce/renderNotice';
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
  const model = renderNotice({ data: frozen, dates }).model;
  const productionSnapshot = captureProductionSnapshot(frozen);
  const createdNoticeArtifact = captureCreatedNoticeArtifact(
    frozen,
    productionSnapshot.producedAtISO,
    dates,
  );
  return {
    state: { ...input, productionSnapshot, createdNoticeArtifact } as NoticeFlowData,
    model,
    envelope: createdNoticeArtifact,
  };
}

console.log('=== UX2 created artifact integrity ===');

const createdA = successfulCreate(validData());
const restoredA = restoreCreatedNoticeArtifact(createdA.state);
ok(restoredA !== null, 'Scenario 1: successful Create A exposes exact artifact A');
equal(restoredA!.generation, createdA.envelope.generation, 'Scenario 1: artifact generation is A');
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
}

{
  const currentB = clone(createdA.state);
  currentB.rentPeriods[0].amount = 3250;
  ok(!!evaluateStaleness(currentB).reason, 'Scenario 3: material face edit preserves existing staleness behavior');
  const artifact = restoreCreatedNoticeArtifact(currentB);
  ok(artifact !== null, 'Scenario 3: stored artifact A remains independently recoverable');
  equal(artifact!.createData.rentPeriods[0].amount, 3000, 'Scenario 3: artifact use cannot silently substitute mutable rent B');
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
ok(noticeFlow.includes('PREPARED · NOT SERVED'), 'Scenario 9: PREPARED · NOT SERVED remains');
ok(noticeFlow.includes('href="/notice/3-day/serve"'), 'Scenario 10: actual service remains separate');

console.log(`${passed} created-artifact assertions passed`);
""")

# Normalize only touched permanent files.
for p in [
    'lib/flow/noticeFlowState.ts',
    'lib/flow/reviewApproval.ts',
    'lib/flow/createdNoticeArtifact.ts',
    'components/notice-flow.tsx',
    'lib/flow/createdNoticeArtifact.test.ts',
]:
    path_obj = Path(p)
    lines = path_obj.read_text().splitlines()
    while lines and lines[-1] == '':
        lines.pop()
    path_obj.write_text('\n'.join(line.rstrip() for line in lines) + '\n')
