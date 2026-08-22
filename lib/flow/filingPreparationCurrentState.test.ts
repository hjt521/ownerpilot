import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { computeGeneratedDocumentId, sha256Bytes, type GeneratedDraftEvidence, type GeneratedDraftIdentity } from './officialFormGeneratedDraft';
import { createOfficialFormOwnerReview, OWNER_REVIEW_STATEMENT_ID, OWNER_REVIEW_STATEMENT_VERSION, type OwnerReviewedDocumentEvidence } from './officialFormOwnerReview';
import { computeFilingPreparationCurrentStateId, createFilingPreparationCurrentState, validateFilingPreparationCurrentState, type CreateFilingPreparationCurrentStateInput, type FilingPreparationCanonicalSnapshot, type FilingPreparationCurrentState } from './filingPreparationCurrentState';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const RISKPATH_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let assertions = 0;
function equal<T>(actual: T, expected: T, message: string): void { assert.equal(actual, expected, message); assertions += 1; }
function ok(condition: unknown, message: string): void { assert.ok(condition, message); assertions += 1; }

function draftFixture(bytes = Uint8Array.from([10, 20, 30, 40, 50])): GeneratedDraftEvidence {
  const identity: GeneratedDraftIdentity = {
    schemaVersion: 1, artifactClass: 'GENERATED_DRAFT', artifactRole: 'OWNER_GENERATED_PREPARATION',
    officialSourceArtifactId: 'synthetic-authority:TEST-1:2026-01-01:sha256:source', officialSourceSnapshotId: 'sha256:source', officialSourceSha256: '1'.repeat(64),
    sourceAdmissionPolicyId: 'qpdf-dual-pass-linearization-isolation-v2', sourceAdmissionStatus: 'SOURCE_ADMITTED_CLEAN', qpdfAssetIdentityDigest: 'qpdf-asset:sha256:fixture',
    sourcePassACommandDigest: 'qpdf-command:sha256:pass-a', sourcePassAWarningInventoryDigest: 'source-warning-inventory:sha256:pass-a', sourcePassBCommandDigest: 'qpdf-command:sha256:pass-b', sourcePassBWarningInventoryDigest: 'source-warning-inventory:sha256:pass-b', sourceWarningInventoryDigest: 'source-warning-inventory:sha256:all',
    qpdfIntermediateSha256: '2'.repeat(64), xfaPolicyId: 'acroform-fallback-xfa-disconnection-v1', xfaDigest: 'xfa:sha256:fixture', preparationManifestId: 'preparation-runtime-manifest:sha256:fixture', preparationSourceId: 'preparation-source:sha256:fixture', preparationDerivativeSha256: '3'.repeat(64), preparationFieldEquivalenceDigest: 'field-equivalence:sha256:fixture', preparationSemanticDeltaDigest: 'semantic-delta:sha256:fixture', preparationAuthorizationSnapshotId: 'preparation-authorization:sha256:fixture', mapSnapshotId: 'field-map:sha256:fixture', referencedFactSnapshotId: 'referenced-facts:sha256:fixture', generationInputId: 'generation-input:sha256:fixture', generatorContractVersion: 'e2.3-current-state-fixture-v1', generatorImplementationId: 'synthetic-current-state-generator', generatorImplementationVersion: '1.0.0', fieldWritePlanDigest: 'field-write-plan:sha256:fixture', preparedAtISO: '2026-08-22T02:10:00.000Z', generatedPdfSha256: sha256Bytes(bytes), generatedByteLength: bytes.byteLength,
  };
  return { ...identity, generatedDocumentId: computeGeneratedDocumentId(identity) };
}
function snapshotFromDraft(d: GeneratedDraftEvidence): FilingPreparationCanonicalSnapshot {
  return { officialSourceArtifactId:d.officialSourceArtifactId, officialSourceSnapshotId:d.officialSourceSnapshotId, officialSourceSha256:d.officialSourceSha256, sourceAdmissionPolicyId:d.sourceAdmissionPolicyId, sourceAdmissionStatus:d.sourceAdmissionStatus, qpdfAssetIdentityDigest:d.qpdfAssetIdentityDigest, sourcePassACommandDigest:d.sourcePassACommandDigest, sourcePassAWarningInventoryDigest:d.sourcePassAWarningInventoryDigest, sourcePassBCommandDigest:d.sourcePassBCommandDigest, sourcePassBWarningInventoryDigest:d.sourcePassBWarningInventoryDigest, sourceWarningInventoryDigest:d.sourceWarningInventoryDigest, qpdfIntermediateSha256:d.qpdfIntermediateSha256, xfaPolicyId:d.xfaPolicyId, xfaDigest:d.xfaDigest, preparationManifestId:d.preparationManifestId, preparationSourceId:d.preparationSourceId, preparationDerivativeSha256:d.preparationDerivativeSha256, preparationFieldEquivalenceDigest:d.preparationFieldEquivalenceDigest, preparationSemanticDeltaDigest:d.preparationSemanticDeltaDigest, preparationAuthorizationSnapshotId:d.preparationAuthorizationSnapshotId, mapSnapshotId:d.mapSnapshotId, referencedFactSnapshotId:d.referencedFactSnapshotId, generationInputId:d.generationInputId, generatorContractVersion:d.generatorContractVersion, generatorImplementationId:d.generatorImplementationId, generatorImplementationVersion:d.generatorImplementationVersion, fieldWritePlanDigest:d.fieldWritePlanDigest };
}
function reviewFixture(d: GeneratedDraftEvidence): OwnerReviewedDocumentEvidence {
  const r = createOfficialFormOwnerReview({ generatedDraft:d, renderedAcknowledgment:{ renderedGeneratedDocumentId:d.generatedDocumentId, renderedPdfSha256:d.generatedPdfSha256, renderedByteLength:d.generatedByteLength, renderedAtISO:'2026-08-22T02:11:00.000Z' }, ownerConfirmedExactRenderedDocument:true, reviewedAtISO:'2026-08-22T02:12:00.000Z', reviewStatement:{ statementId:OWNER_REVIEW_STATEMENT_ID, statementVersion:OWNER_REVIEW_STATEMENT_VERSION } });
  if (r.status !== 'OWNER_REVIEWED_DOCUMENT') throw new Error('synthetic owner review blocked');
  return r.evidence;
}
function baseInput(revision=1): CreateFilingPreparationCurrentStateInput { const d=draftFixture(); return { authenticatedUserId:USER_A, riskpathRecordId:RISKPATH_A, revision, preparationSnapshot:snapshotFromDraft(d), generatedDraftBinding:null, generatedDraftBytes:null, ownerReviewBinding:null }; }
function generatedInput(revision=1): CreateFilingPreparationCurrentStateInput { const bytes=Uint8Array.from([10,20,30,40,50]); const d=draftFixture(bytes); return { ...baseInput(revision), preparationSnapshot:snapshotFromDraft(d), generatedDraftBinding:{revision,generatedDraft:d}, generatedDraftBytes:bytes }; }
function reviewedInput(revision=1): CreateFilingPreparationCurrentStateInput { const input=generatedInput(revision); const g=input.generatedDraftBinding as {revision:number;generatedDraft:GeneratedDraftEvidence}; return { ...input, ownerReviewBinding:{revision,ownerReviewEvidence:reviewFixture(g.generatedDraft)} }; }
function requireBuilt(input: CreateFilingPreparationCurrentStateInput): FilingPreparationCurrentState { const r=createFilingPreparationCurrentState(input); if(r.status!=='CURRENT_STATE_REVISION') throw new Error(`fixture blocked: ${r.blockReason}`); return r.currentState; }
function databaseFixture(state: FilingPreparationCurrentState): Record<string, unknown> { const {generatedDraftBytes,...state_payload}=state; return { filing_preparation_current_state_id:state.filingPreparationCurrentStateId, user_id:state.authenticatedUserId, riskpath_record_id:state.riskpathRecordId, revision:state.revision, state_payload, generated_draft_hex:generatedDraftBytes===null?null:Buffer.from(generatedDraftBytes).toString('hex') }; }
function expectBlocked(input: CreateFilingPreparationCurrentStateInput, reason: string, message: string): void { const r=createFilingPreparationCurrentState(input); equal(r.status,'BLOCKED',message); if(r.status==='BLOCKED') equal(r.blockReason,reason as never,`${message} reason`); }

function main(): void {
  const base=requireBuilt(baseInput());
  equal(validateFilingPreparationCurrentState(base).status,'VALID','base canonical state validates');
  equal(base.revision,1,'base revision exact');
  equal(base.generatedDraftBinding,null,'draft absent is valid');
  equal(base.ownerReviewBinding,null,'review absent is valid');
  equal(base.stageF,'HELD','Stage F held');
  equal(base.filing,'NOT_PERFORMED','filing not performed');
  ok(/^filing-preparation-current-state:sha256:[0-9a-f]{64}$/.test(base.filingPreparationCurrentStateId),'current-state ID shape');
  equal(base.filingPreparationCurrentStateId,requireBuilt(baseInput()).filingPreparationCurrentStateId,'current-state ID deterministic');
  ok(base.filingPreparationCurrentStateId!==requireBuilt(baseInput(2)).filingPreparationCurrentStateId,'revision participates in ID');
  ok(base.filingPreparationCurrentStateId!==requireBuilt({...baseInput(),authenticatedUserId:USER_B}).filingPreparationCurrentStateId,'owner participates in ID');

  expectBlocked({...baseInput(),generatedDraftCurrentness:{status:'CURRENT',reasons:[]}} as unknown as CreateFilingPreparationCurrentStateInput,'INVALID_INPUT_SHAPE','caller currentness rejected');
  expectBlocked({...baseInput(),revision:0},'INVALID_REVISION','zero revision rejected');
  expectBlocked({...baseInput(),revision:-1},'INVALID_REVISION','negative revision rejected');
  expectBlocked({...baseInput(),revision:1.5},'INVALID_REVISION','fractional revision rejected');
  expectBlocked({...baseInput(),revision:Number.MAX_SAFE_INTEGER+1},'INVALID_REVISION','unsafe revision rejected');
  expectBlocked({...baseInput(),preparationSnapshot:{...(baseInput().preparationSnapshot as FilingPreparationCanonicalSnapshot),extra:'x'}},'INVALID_PREPARATION_SNAPSHOT','extra preparation key rejected');
  expectBlocked({...baseInput(),preparationSnapshot:{fixture:'sql-bypass-probe'}},'INVALID_PREPARATION_SNAPSHOT','ARB partial preparation probe rejected by pure contract');

  { const x=generatedInput(); x.generatedDraftBytes=null; expectBlocked(x,'GENERATED_DRAFT_BYTES_REQUIRED','draft without bytes rejected'); }
  { const x=baseInput(); x.generatedDraftBytes=Uint8Array.from([1]); expectBlocked(x,'UNBOUND_GENERATED_DRAFT_BYTES','bytes without draft rejected'); }
  { const x=generatedInput(); x.generatedDraftBytes=Uint8Array.from([10,20]); expectBlocked(x,'GENERATED_DRAFT_BYTE_LENGTH_MISMATCH','wrong length rejected'); }
  { const x=generatedInput(); x.generatedDraftBytes=Uint8Array.from([50,40,30,20,10]); expectBlocked(x,'GENERATED_DRAFT_SHA256_MISMATCH','same-length wrong SHA rejected'); }
  { const x=generatedInput(2); const b=x.generatedDraftBinding as {revision:number;generatedDraft:GeneratedDraftEvidence}; x.generatedDraftBinding={...b,revision:1}; expectBlocked(x,'GENERATED_DRAFT_REVISION_MISMATCH','historical generated binding rejected'); }
  { const x=generatedInput(); x.preparationSnapshot={...(x.preparationSnapshot as FilingPreparationCanonicalSnapshot),mapSnapshotId:'field-map:sha256:new'}; expectBlocked(x,'GENERATED_DRAFT_PREPARATION_MISMATCH','draft/preparation mismatch rejected'); }
  equal(validateFilingPreparationCurrentState(requireBuilt(generatedInput())).status,'VALID','canonical generated state validates');

  { const x=baseInput(); x.ownerReviewBinding={revision:1,ownerReviewEvidence:reviewFixture(draftFixture())}; expectBlocked(x,'OWNER_REVIEW_REQUIRES_GENERATED_DRAFT','review without draft rejected'); }
  { const x=reviewedInput(2); const r=x.ownerReviewBinding as {revision:number;ownerReviewEvidence:OwnerReviewedDocumentEvidence}; x.ownerReviewBinding={...r,revision:1}; expectBlocked(x,'OWNER_REVIEW_REVISION_MISMATCH','historical review rejected'); }
  { const x=generatedInput(); x.ownerReviewBinding={revision:1,ownerReviewEvidence:reviewFixture(draftFixture(Uint8Array.from([11,21,31,41,51])))}; expectBlocked(x,'OWNER_REVIEW_GENERATED_DRAFT_MISMATCH','review of different draft rejected'); }
  { const x=reviewedInput(); const r=structuredClone(x.ownerReviewBinding) as {revision:number;ownerReviewEvidence:OwnerReviewedDocumentEvidence}; r.ownerReviewEvidence.ownerReviewRecordId=`owner-review:sha256:${'f'.repeat(64)}`; x.ownerReviewBinding=r; expectBlocked(x,'OWNER_REVIEW_INVALID','corrupt review ID rejected'); }
  equal(validateFilingPreparationCurrentState(requireBuilt(reviewedInput())).status,'VALID','canonical reviewed state validates');

  { const x=structuredClone(base); x.stageF='RELEASED' as unknown as 'HELD'; const r=validateFilingPreparationCurrentState(x); equal(r.status,'BLOCKED','authority mutation rejected'); if(r.status==='BLOCKED') equal(r.blockReason,'BOUNDARY_INVARIANT_MISMATCH','authority mutation reason'); }
  { const x=structuredClone(base); x.filingPreparationCurrentStateId=`filing-preparation-current-state:sha256:${'0'.repeat(64)}`; const r=validateFilingPreparationCurrentState(x); equal(r.status,'BLOCKED','false current-state ID rejected'); if(r.status==='BLOCKED') equal(r.blockReason,'CURRENT_STATE_ID_MISMATCH','false current-state ID reason'); }
  { const {filingPreparationCurrentStateId:_,generatedDraftBytes:__,...identity}=base; void _; void __; equal(computeFilingPreparationCurrentStateId(identity),base.filingPreparationCurrentStateId,'ID helper recomputes exact identity'); }

  const sql=readFileSync('supabase/staged-migrations/059_e2_3d0b_filing_preparation_current_state.sql','utf8');
  ok(sql.includes('create table public.filing_preparation_current_state_revisions'),'migration creates relation');
  ok(sql.includes('unique (riskpath_record_id, revision)'),'unique revision enforced');
  ok(sql.includes('revision >= 1 and revision <= 9007199254740991'),'JS safe revision range enforced');
  ok(sql.includes('create or replace function public.filing_preparation_current_state_canonical_jsonb'),'canonical JSON helper present');
  ok(sql.includes('create or replace function public.filing_preparation_current_state_payload_is_valid'),'canonical durable validator present');
  ok(sql.toLowerCase().includes('security invoker')&&!sql.toLowerCase().includes('security definer'),'helpers are invoker-only');
  ok(sql.includes("p_state - top_keys <> '{}'::jsonb")&&sql.includes("prep - prep_keys <> '{}'::jsonb")&&sql.includes("gd - generated_keys <> '{}'::jsonb")&&sql.includes("ore - owner_review_keys <> '{}'::jsonb")&&sql.includes("ack - ack_keys <> '{}'::jsonb"),'exact envelope/nested shapes enforced');
  ok(sql.includes("extensions.digest(p_generated_draft_bytes, 'sha256')")&&sql.includes("gd ->> 'generatedPdfSha256' <> encode"),'generated bytes SHA enforced');
  ok(sql.includes("'filing-preparation-current-state:sha256:'")&&sql.includes("'generated-document:sha256:'")&&sql.includes("'owner-review:sha256:'"),'all deterministic IDs recomputed');
  ok(sql.includes('check (public.filing_preparation_current_state_payload_is_valid('),'table delegates to canonical admission');
  ok(sql.includes('enable row level security')&&sql.includes('force row level security'),'RLS enabled/forced');
  ok(sql.includes('revoke all on public.filing_preparation_current_state_revisions from anon, authenticated, service_role'),'default application grants revoked');
  ok(sql.includes('grant select, insert on public.filing_preparation_current_state_revisions to authenticated'),'authenticated gets SELECT/INSERT only');
  ok(!/grant[^;]*service_role/i.test(sql),'service role receives no grant');
  ok(!/grant[^;]*(update|delete)/i.test(sql),'no UPDATE/DELETE grant');
  ok(sql.includes('user_id = (select auth.uid())')&&sql.includes('rp.user_id = (select auth.uid())'),'RLS binds owner and RiskPath');
  ok(!sql.toLowerCase().includes('create trigger'),'no trigger path');
  ok(!sql.includes('filing_preparation_records '),'no circular source');

  const source=readFileSync('lib/flow/filingPreparationCurrentState.ts','utf8');
  ok(!source.includes('generatedDraftCurrentness'),'TS contract has no caller currentness authority');
  ok(!source.includes('@supabase/')&&!source.includes('fetch('),'TS contract remains source-adapter free');
  ok(!source.includes('localStorage')&&!source.includes('service_role'),'TS contract has no browser/privileged persistence');
  ok(!source.includes('filingPreparationRecord'),'TS contract not circularly sourced');

  console.log(`D0B1_CANONICAL_DB_FIXTURE_BASE=${JSON.stringify(databaseFixture(requireBuilt(baseInput(50))))}`);
  console.log(`D0B1_CANONICAL_DB_FIXTURE_GENERATED=${JSON.stringify(databaseFixture(requireBuilt(generatedInput(51))))}`);
  console.log(`D0B1_CANONICAL_DB_FIXTURE_REVIEWED=${JSON.stringify(databaseFixture(requireBuilt(reviewedInput(52))))}`);
  console.log(`filingPreparationCurrentState.test.ts: ${assertions} assertions passed`);
}
try { main(); } catch (error) { console.error(error); process.exit(1); }
